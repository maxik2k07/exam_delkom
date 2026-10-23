// ===== ДелКрафт: процедурные текстуры высокого разрешения (цвет, рельеф для шейдера, блики) =====
// Каждая плитка рисуется в долях блока (u, v ∈ [0, 1), v вниз), поэтому одинаково выглядит при 16, 32 и 64 px.
// Кроме цвета считается карта высот: из неё — запечённый объём, нормали для попиксельного света и маска бликов.
let TS = 64; // пикселей на сторону блока
const TEX = {};
const hexc = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const palx = (...h) => h.map(hexc);
function rampc(cols, t) { t = clamp(t, 0, 0.9999) * (cols.length - 1); const i = t | 0; return mixc(cols[i], cols[i + 1], t - i); }

function texCtx(S, seed) {
  const N = S * S, col = new Float32Array(N * 3), al = new Float32Array(N).fill(1), hh = new Float32Array(N).fill(0.5), sp = new Float32Array(N), em = new Float32Array(N);
  const hash = (i, j, k) => { let x = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul((k | 0) + seed * 131, 1442695041)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t), wrap = (q, P) => ((q % P) + P) % P;
  // бесшовный value-noise: P ячеек по u, Q по v
  const vn = (u, v, P, k = 0, Q = P) => {
    const x = u * P, y = v * Q, i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j), i0 = wrap(i, P), i1 = wrap(i + 1, P), j0 = wrap(j, Q), j1 = wrap(j + 1, Q);
    return lerp(lerp(hash(i0, j0, k), hash(i1, j0, k), fx), lerp(hash(i0, j1, k), hash(i1, j1, k), fx), fy);
  };
  const fbm = (u, v, P, oct = 4, k = 0, g = 0.5, Q = P) => { let s = 0, a = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * vn(u, v, P << o, k + o * 7, Q << o); n += a; a *= g; } return s / n; };
  // бесшовный шум Ворони: камни, гравий, кристаллы
  const vor = (u, v, P, k = 0, jit = 0.9) => {
    const x = u * P, y = v * P, i = Math.floor(x), j = Math.floor(y); let d1 = 9, d2 = 9, id = 0, cx = 0, cy = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ci = i + di, cj = j + dj, wi = wrap(ci, P), wj = wrap(cj, P);
      const px = ci + 0.5 + (hash(wi, wj, k) - 0.5) * jit, py = cj + 0.5 + (hash(wi, wj, k + 1) - 0.5) * jit, d = Math.hypot(x - px, y - py);
      if (d < d1) { d2 = d1; d1 = d; id = hash(wi, wj, k + 2); cx = px / P; cy = py / P; } else if (d < d2) d2 = d;
    }
    return { d1, d2, id, cx, cy, e: d2 - d1 };
  };
  const idx = (x, y) => wrap(y, S) * S + wrap(x, S);
  const T = {
    S, R: mulberry32(seed * 7919 + 13), vn, fbm, vor, idx,
    white: (x, y, k = 0) => hash(x, y, k + 977),
    set(i, c, h, a, s, e) { if (c) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; } if (h != null) hh[i] = h; if (a != null) al[i] = a; if (s != null) sp[i] = s; if (e != null) em[i] = e; },
    get: i => [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]], getA: i => al[i],
    each(fn) { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) fn((x + .5) / S, (y + .5) / S, x, y, y * S + x); },
    clear() { al.fill(0); },
    // фигуры задаются в долях блока и переносятся через край
    disc(cu, cv, r, fn, ry = r, ang = 0) {
      const ca = Math.cos(ang), sa = Math.sin(ang), m = Math.max(r, ry), x0 = Math.floor((cu - m) * S), x1 = Math.ceil((cu + m) * S), y0 = Math.floor((cv - m) * S), y1 = Math.ceil((cv + m) * S);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const du = (x + .5) / S - cu, dv = (y + .5) / S - cv, lu = (du * ca + dv * sa) / r, lv = (-du * sa + dv * ca) / ry, d = Math.hypot(lu, lv);
        if (d <= 1) fn(idx(x, y), d, lu, lv);
      }
    },
    box(u0, v0, u1, v1, fn) {
      const xs = Math.floor(u0 * S + 1e-6), xe = Math.max(xs + 1, Math.round(u1 * S)), ys = Math.floor(v0 * S + 1e-6), ye = Math.max(ys + 1, Math.round(v1 * S));
      for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) fn(idx(x, y), (x - xs + .5) / (xe - xs), (y - ys + .5) / (ye - ys), x, y);
    },
    line(u0, v0, u1, v1, w0, fn, w1 = w0) {
      const n = Math.max(2, Math.ceil(Math.hypot(u1 - u0, v1 - v0) * S * 2));
      for (let k = 0; k <= n; k++) { const s = k / n; T.disc(u0 + (u1 - u0) * s, v0 + (v1 - v0) * s, Math.max(lerp(w0, w1, s), 0.7 / S), (i, d) => fn(i, s, d)); }
    },
    glyph(rows, u0, v0, cw, fn) { rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') T.box(u0 + i * cw, v0 + j * cw, u0 + (i + 1) * cw, v0 + (j + 1) * cw, q => fn(q)); })); },
    buf: { col, al, hh, sp, em }
  };
  return T;
}
// запекание: объём от карты высот (свет сверху-слева), затенение впадин, нормали и маска бликов
function finishTile(T, o = {}) {
  const S = T.S, { col, al, hh, sp, em } = T.buf, depth = o.depth ?? 0.03, emb = o.emboss ?? 1, aoK = o.ao ?? 1, r = Math.max(1, S >> 5);
  const H = (x, y) => hh[T.idx(x, y)], c = new Uint8ClampedArray(S * S * 4), n = new Uint8Array(S * S * 4); let ar = 0, ag = 0, ab = 0, an = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, gx = (H(x + 1, y) - H(x - 1, y)) * S / 2, gy = (H(x, y + 1) - H(x, y - 1)) * S / 2;
    let bl = 0; for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) bl += H(x + dx, y + dy);
    const shade = 1 + clamp((gx + gy) * depth * 1.5 * emb, -0.3, 0.3), ao = 1 - clamp((bl / 8 - hh[i]) * 1.4 * aoK, 0, 0.32), k = em[i] > 0 ? 1 : shade * ao;
    const R = clamp(col[i * 3] * k, 0, 1), Gc = clamp(col[i * 3 + 1] * k, 0, 1), Bc = clamp(col[i * 3 + 2] * k, 0, 1);
    c[i * 4] = R * 255; c[i * 4 + 1] = Gc * 255; c[i * 4 + 2] = Bc * 255; c[i * 4 + 3] = clamp(al[i], 0, 1) * 255;
    const nx = -gx * depth, ny = gy * depth, nl = Math.hypot(nx, ny, 1);
    n[i * 4] = (nx / nl * .5 + .5) * 255; n[i * 4 + 1] = (ny / nl * .5 + .5) * 255; n[i * 4 + 2] = (1 / nl * .5 + .5) * 255; n[i * 4 + 3] = clamp(sp[i], 0, 1) * 255;
    if (al[i] > 0.5) { ar += R; ag += Gc; ab += Bc; an++; }
  }
  return { c, n, avg: an ? [ar / an * 255, ag / an * 255, ab / an * 255] : [128, 128, 128] };
}
const texSeed = name => [...name].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) | 0, 7) & 0xffff;
function paintTile(name, S) { const T = texCtx(S, texSeed(name)); const o = (TEX[name] || TEX.missing)(T) || {}; return finishTile(T, o); }
function tileCanvas(name, S) { const r = paintTile(name, S), c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').putImageData(new ImageData(r.c, S, S), 0, 0); return c; }

// атлас 16×16 плиток: цвет (canvas), нормали+блики и средние цвета (массивы для шейдера, строки снизу вверх)
function buildAtlas(ts = TS) {
  TS = ts; const AW = 16 * TS;
  const c = document.createElement('canvas'); c.width = c.height = AW; const g = c.getContext('2d', { willReadFrequently: true });
  const names = [...BLOCK_TILES, ...CRACK_TILES, ...IT.filter(Boolean).map(it => it.tile)];
  TILE = {}; names.forEach((n, i) => { TILE[n] = i; });
  const img = g.createImageData(AW, AW), nrm = new Uint8Array(AW * AW * 4), avg = new Uint8Array(16 * 16 * 4), items = [];
  for (let i = 0; i < AW * AW; i++) { nrm[i * 4] = 128; nrm[i * 4 + 1] = 128; nrm[i * 4 + 2] = 255; }
  names.forEach((n, ti) => {
    const ox = (ti % 16) * TS, oy = (ti >> 4) * TS;
    if (n.startsWith('i_')) { items.push([n, ti, ox, oy]); return; }
    const r = paintTile(n, TS);
    for (let y = 0; y < TS; y++) { img.data.set(r.c.subarray(y * TS * 4, (y + 1) * TS * 4), ((oy + y) * AW + ox) * 4); nrm.set(r.n.subarray(y * TS * 4, (y + 1) * TS * 4), ((AW - 1 - oy - y) * AW + ox) * 4); }
    avg.set([r.avg[0], r.avg[1], r.avg[2], 255], ((15 - (ti >> 4)) * 16 + ti % 16) * 4);
  });
  g.putImageData(img, 0, 0);
  // предметы — пиксель-арт 16×16, увеличенный без сглаживания
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 16; const tg = tmp.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  for (const [n, ti, ox, oy] of items) { tg.clearRect(0, 0, 16, 16); paintItemTile(n, tg, 0, 0, mulberry32(ti * 9973 + 17)); g.drawImage(tmp, 0, 0, 16, 16, ox, oy, TS, TS); }
  G.atlasPx = null; G.atlasNorm = nrm; G.atlasAvg = avg; G.atlasSize = AW;
  return c;
}

// ---------- палитры ----------
const PAL_GRASS = palx('#2c6219', '#3b7d22', '#4b952c', '#5ea937', '#74bd47', '#8fd05e');
const PAL_DIRT = palx('#432914', '#56361b', '#6a4423', '#7f532c', '#946436', '#a97642');
const PAL_STONE = palx('#545454', '#646464', '#747474', '#858585', '#969696', '#a8a8a8');
const PAL_PLANK = palx('#7a5226', '#8f6330', '#a4753c', '#b7874a', '#c89a5b', '#d6ab6c');
const PAL_PLANK2 = palx('#6e4420', '#84542a', '#9a6634', '#ae7840', '#c08a4e', '#cf9b5e');
const PAL_BARK = palx('#2c1d0e', '#3d2914', '#50381c', '#644726', '#785730', '#8b683b');
const PAL_SNOW = palx('#c4d2e0', '#d6e1ec', '#e6eef5', '#f3f7fb', '#ffffff');
const PAL_CHEST = palx('#6e4419', '#85541f', '#9c6627', '#b17832', '#c58b40');
const PAL_CHESTRIM = palx('#2a1606', '#3a200a', '#4a2c10', '#5a3816', '#6a441e');
const PAL_QCHEST = palx('#9a6416', '#b8801f', '#d39a2c', '#e8b23e', '#f6c95a');
const PAL_PURPLE = palx('#2e1060', '#4a1f90', '#6a34c0', '#8a52e0', '#a878f0');
const PAL_GOLDL = palx('#8a6208', '#c49a1a', '#f2c53d', '#ffe680', '#fff8d0');
const PAL_STEEL = palx('#3a3a3a', '#6a6a6a', '#9a9a9a', '#c8c8c8', '#f0f0f0');
const PAL_FIRE = palx('#2a0600', '#8a1e00', '#d84800', '#ff8a10', '#ffcc40', '#fff2b0');
const PAL_TNT = palx('#7a1408', '#9e2010', '#c0301c', '#d8402c', '#ea5a44');
const PAL_BED = palx('#6a0c0c', '#8a1414', '#a81e1e', '#c8322c', '#dc4a40');
const PAL_PUMP = palx('#8a3e04', '#a8520a', '#c66a10', '#dc8018', '#ec9828', '#f6b040');

// ---------- общие узоры ----------
function txStone(T, u, v, x, y, k = 0) {
  const n = T.fbm(u, v, 4, 4, 10 + k), m = T.fbm(u, v, 2, 2, 20 + k), f = T.vn(u, v, 32, 30 + k), w = T.white(x, y, k), sp = T.vn(u, v, 16, 33 + k);
  const fleck = sp > 0.82 ? 0.12 : sp < 0.14 ? -0.1 : 0;
  return { c: rampc(PAL_STONE, 0.12 + n * 0.5 + m * 0.28 + (f - .5) * 0.16 + fleck + (w - .5) * 0.07), h: n * 0.5 + m * 0.3 + f * 0.12 + fleck };
}
// короткие тонкие трещины случайным блужданием
function txCracks(T, count, k) {
  const rr = mulberry32(k * 977 + 5);
  for (let c = 0; c < count; c++) {
    let u = rr(), v = rr(), a = rr() * 6.283;
    for (let j = 0, n = 4 + (rr() * 5 | 0); j < n; j++) { a += (rr() - .5) * 1.4; const L = 0.02 + rr() * 0.03, u1 = u + Math.cos(a) * L, v1 = v + Math.sin(a) * L; T.line(u, v, u1, v1, 0.006, i => T.set(i, mulc(T.get(i), 0.72), 0.12)); u = u1; v = v1; }
  }
}
function txOverhang(T, pal, base, k0, lenA, lenB) {
  const S = T.S;
  for (let x = 0; x < S; x++) {
    const u = (x + .5) / S, len = lenA + T.fbm(u, 0.5, 8, 2, k0) * lenB + (T.vn(u, 0.25, 24, k0 + 1) > 0.78 ? lenB * 0.7 : 0);
    for (let y = 0; y < S; y++) {
      const v = (y + .5) / S, i = y * S + x; if (v > len + 0.035) break;
      if (v <= len) T.set(i, rampc(pal, clamp(base + T.fbm(u, v, 8, 2, k0 + 2) * 0.45 + (T.white(x, y, k0) - .5) * 0.2 - (v / len) * 0.25, 0, 1)), 0.8 - v * 0.5);
      else T.set(i, mulc(T.get(i), 0.62), 0.25);
    }
  }
}
function txCobble(T, moss) {
  const MOSS = palx('#2f5a1f', '#3f7029', '#548a36', '#6ca046', '#85b85a');
  T.each((u, v, x, y, i) => {
    const c = T.vor(u, v, 4, 40, 0.85), n = T.fbm(u, v, 8, 3, 41), w = T.white(x, y), edge = clamp(c.e / 0.25, 0, 1), dome = Math.sqrt(edge);
    let col = mulc(rampc(PAL_STONE, 0.1 + c.id * 0.6 + (n - .5) * 0.35 + (w - .5) * 0.08), 0.62 + 0.38 * dome), h = dome * 0.75 + n * 0.25;
    if (edge < 0.1) { col = mulc(hexc('#3c3c3c'), 0.8 + n * 0.4); h = 0.02; }
    if (moss) { const m = T.fbm(u, v, 4, 3, 42), mk = clamp((m - 0.5) * 6, 0, 1) * (edge < 0.1 || dome > 0.3 ? 1 : 0.6); if (mk > 0) { col = mixc(col, rampc(MOSS, clamp(n + (w - .5) * .4, 0, 1)), mk); h += mk * 0.08; } }
    T.set(i, col, h);
  });
  return { depth: 0.045 };
}
function txPlanks(T, pal) {
  const rows = 4, th = Math.max(1 / T.S, 0.016), ends = [0.31, 0.78, 0.12, 0.55], tint = [0.05, -0.04, 0.02, -0.06];
  T.each((u, v, x, y, i) => {
    const row = Math.min(rows - 1, Math.floor(v * rows)), fv = v * rows - row, g = T.fbm(u, v, 3, 3, 141 + row, 0.5, 20), w = T.white(x, y);
    const streak = 0.5 + 0.5 * Math.sin((fv * 2.5 + g * 3 + u * 0.5) * Math.PI * 2);
    let col = rampc(pal, clamp(0.35 + (g - .5) * 0.5 + streak * 0.18 + tint[row] + (w - .5) * 0.06, 0, 1)), h = 0.7 + g * 0.1;
    const seam = (1 - fv) / rows < th, end = Math.abs((((u - ends[row]) % 1) + 1.5) % 1 - 0.5) < th * 0.6;
    if (seam || end) { col = mulc(col, 0.5); h = 0.1; } else if (Math.min(fv, 1 - fv) / rows < th * 2) h -= 0.15;
    T.set(i, col, h);
  });
  // гвозди у торцов
  for (let r = 0; r < rows; r++) for (const du of [-0.035, 0.035]) T.disc(((ends[r] + du) % 1 + 1) % 1, (r + 0.5) / rows, 0.012, (i, d) => T.set(i, mulc(hexc('#3a3a3a'), 1.3 - d * 0.6), 0.85, 1, 0.5));
  return { depth: 0.03 };
}
function txRings(T, bark, wood) {
  T.each((u, v, x, y, i) => {
    const du = u - .5, dv = v - .5, d = Math.max(Math.abs(du), Math.abs(dv)) * 0.6 + Math.hypot(du, dv) * 0.4, n = T.fbm(u, v, 4, 3, 120), w = T.white(x, y);
    if (d > 0.43) { const b = T.fbm(u, v, 8, 2, 121); T.set(i, rampc(bark, clamp(b + (w - .5) * .2, 0, 1)), 0.6 + b * 0.3); return; }
    const ring = 0.5 + 0.5 * Math.cos((d * 14 + n * 0.8) * Math.PI * 2);
    T.set(i, rampc(wood, clamp(0.25 + ring * 0.5 + (w - .5) * 0.12 + (d < 0.05 ? -0.2 : 0), 0, 1)), 0.5 + ring * 0.12 - (d > 0.41 ? 0.2 : 0));
  });
  return { depth: 0.02 };
}
function txLeaves(T, pal) {
  T.each((u, v, x, y, i) => T.set(i, pal[1], 0.1, 0));
  for (let k = 0; k < 260; k++) {
    const cu = T.R(), cv = T.R(), r = 0.045 + T.R() * 0.035, a = T.R() * 6.283, b = 0.25 + T.R() * 0.75;
    T.disc(cu, cv, r, (i, d, lu, lv) => { const vein = Math.abs(lv) < 0.14 && lu > -0.6; T.set(i, mulc(rampc(pal, clamp(b - d * 0.35 + lu * 0.1, 0, 1)), vein ? 0.82 : 1), 0.4 + b * 0.4 + (1 - d) * 0.2, 1); }, r * 0.5, a);
  }
  return { depth: 0.04 };
}
function txWool(T, base) {
  const c0 = hexc(base);
  T.each((u, v, x, y, i) => {
    const a = T.fbm(u, v, 8, 3, 190), b = T.fbm(u + a * 0.15, v + a * 0.15, 16, 2, 191), w = T.white(x, y), curl = 0.5 + 0.5 * Math.sin((a * 6 + b * 4) * Math.PI);
    T.set(i, mulc(c0, 0.82 + (b - .5) * 0.3 + (curl - .5) * 0.16 + (w - .5) * 0.06), b * 0.6 + curl * 0.3);
  });
  return { depth: 0.03 };
}
function txMetal(T, pal, spec, gem) {
  T.each((u, v, x, y, i) => {
    const n = T.fbm(u, v, 4, 2, 160), br = T.fbm(u, v, 1, 3, 161, 0.5, 24), w = T.white(x, y), e = Math.min(u, v, 1 - u, 1 - v), shine = Math.pow(0.5 + 0.5 * Math.sin((u - v) * Math.PI * 3), 6);
    let k = 0.42 + (n - .5) * 0.25 + (br - .5) * 0.3 + shine * 0.25 + (w - .5) * 0.04, h = 0.62 + (br - .5) * 0.1;
    if (e < 0.06) { k += 0.12; h = 0.95; } else if (e < 0.09) { k -= 0.15; h = 0.35; }
    if (gem) { const c = T.vor(u, v, 3, 162, 0.6); if (c.e < 0.05 && e > 0.09) { k -= 0.18; h -= 0.2; } else k += (c.id - .5) * 0.25; }
    T.set(i, rampc(pal, clamp(k, 0, 1)), h, 1, spec);
  });
  return { depth: 0.03 };
}
function txOre(T, pal, clusters, spec) {
  TEX.stone(T);
  for (let c = 0; c < clusters; c++) {
    const cu = T.R(), cv = T.R(), m = 2 + (T.R() * 4 | 0);
    for (let j = 0; j < m; j++) {
      const r = 0.035 + T.R() * 0.03;
      T.disc(cu + (T.R() - .5) * 0.14, cv + (T.R() - .5) * 0.14, r, (i, d, lu, lv) => {
        const rim = d > 0.78, hl = clamp(-(lu + lv) * 0.5 + 0.5, 0, 1);
        T.set(i, rim ? mulc(pal[0], 0.8) : rampc(pal, clamp(0.25 + hl * 0.7 - d * 0.2, 0, 1)), 0.85 + (1 - d) * 0.15, 1, rim ? 0 : spec);
      }, r * (0.75 + T.R() * 0.25), T.R() * 3);
    }
  }
  return { depth: 0.04 };
}
function txChest(T, wood, rim, o = {}) {
  T.each((u, v, x, y, i) => {
    const g = T.fbm(u, v, 3, 3, 170, 0.5, 18), w = T.white(x, y), e = Math.min(u, v, 1 - u, 1 - v), lid = o.lid != null && Math.abs(v - o.lid) < 0.035;
    let col = rampc(wood, clamp(0.35 + (g - .5) * 0.55 + (w - .5) * 0.06 + Math.sin(v * Math.PI * 10 + g * 4) * 0.05, 0, 1)), h = 0.65 + g * 0.1, s = 0;
    if (e < 0.07 || lid) { col = rampc(rim, clamp(0.45 + (w - .5) * 0.15 + (e < 0.025 ? -0.25 : 0.08), 0, 1)); h = 0.92; s = o.rimSpec || 0; }
    T.set(i, col, h, 1, s);
  });
  if (o.latch) T.box(0.42, o.lid - 0.06, 0.58, o.lid + 0.12, (i, fu, fv) => T.set(i, rampc(o.latch, fu < 0.18 || fv < 0.14 ? 0.95 : fu > 0.82 || fv > 0.86 ? 0.1 : 0.6), 0.97, 1, 0.8));
  return { depth: 0.035 };
}
function txFlower(T, petals, center, rose) {
  T.clear(); const stem = palx('#1f5a14', '#2f7a1e', '#43962a', '#5aac38');
  T.line(0.5, 1, 0.5, 0.36, 0.025, (i, s) => T.set(i, rampc(stem, 0.4 + s * 0.4), 0.6, 1), 0.02);
  T.disc(0.37, 0.74, 0.12, (i, d, lu, lv) => T.set(i, rampc(stem, clamp(0.8 - d * 0.5 + lv * 0.2, 0, 1)), 0.7 - d * 0.3, 1), 0.05, 0.6);
  T.disc(0.63, 0.66, 0.11, (i, d, lu, lv) => T.set(i, rampc(stem, clamp(0.8 - d * 0.5 + lv * 0.2, 0, 1)), 0.7 - d * 0.3, 1), 0.045, -0.6);
  if (rose) {
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; T.disc(0.5 + Math.cos(a) * 0.08, 0.27 + Math.sin(a) * 0.07, 0.1, (i, d, lu, lv) => T.set(i, rampc(petals, clamp(0.85 - d * 0.6 - lv * 0.15, 0, 1)), 0.8 - d * 0.3, 1), 0.07, a); }
    T.disc(0.5, 0.27, 0.065, (i, d, lu, lv) => T.set(i, rampc(petals, clamp(0.3 + (0.5 + 0.5 * Math.sin(Math.atan2(lv, lu) * 2 + d * 9)) * 0.5, 0, 1)), 0.9, 1));
  } else {
    for (let k = 0; k < 60; k++) { const a = T.R() * 6.283, r = Math.sqrt(T.R()) * 0.15; T.disc(0.5 + Math.cos(a) * r, 0.27 + Math.sin(a) * r, 0.03, (i, d) => T.set(i, rampc(petals, clamp(0.9 - d * 0.4 - r * 2, 0, 1)), 0.85 - r, 1)); }
    T.disc(0.5, 0.27, 0.045, (i, d) => T.set(i, rampc(center, 1 - d), 0.95, 1));
  }
  return { depth: 0.03 };
}
function txSapling(T, leaf, stemC) {
  T.clear(); const st = hexc(stemC);
  T.line(0.5, 1, 0.5, 0.55, 0.03, i => T.set(i, st, 0.6, 1), 0.02); T.line(0.5, 0.75, 0.33, 0.6, 0.015, i => T.set(i, st, 0.6, 1)); T.line(0.5, 0.7, 0.66, 0.56, 0.015, i => T.set(i, st, 0.6, 1));
  for (let k = 0; k < 40; k++) { const a = T.R() * 6.283, r = Math.sqrt(T.R()) * 0.27; T.disc(0.5 + Math.cos(a) * r, 0.4 + Math.sin(a) * r * 0.85, 0.04 + T.R() * 0.03, (i, d, lu, lv) => T.set(i, rampc(leaf, clamp(0.85 - d * 0.5 - lv * 0.2 + (T.R() - .5) * .2, 0, 1)), 0.8 - d * 0.3, 1), 0.025, T.R() * 3); }
  return { depth: 0.03 };
}
function txToolsPanel(T, front) {
  txPlanks(T, PAL_PLANK2);
  T.box(0, 0, 1, 0.16, (i, fu, fv, x, y) => T.set(i, rampc(PAL_BARK, 0.5 + (T.white(x, y) - .5) * 0.2 - fv * 0.2), 0.9)); T.box(0, 0.16, 1, 0.19, i => T.set(i, hexc('#2a1a0a'), 0.1));
  const wood = palx('#4a2e14', '#6b4a2b', '#8a6438', '#a07a45');
  if (!front) { // пила и молоток
    T.box(0.12, 0.36, 0.46, 0.52, (i, fu, fv) => T.set(i, rampc(PAL_STEEL, clamp(0.75 - fv * 0.4 + Math.sin(fu * 40) * 0.05, 0, 1)), 0.85, 1, 0.6));
    for (let k = 0; k < 9; k++) T.disc(0.135 + k * 0.037, 0.53, 0.017, i => T.set(i, rampc(PAL_STEEL, 0.4), 0.8, 1, 0.4));
    T.box(0.46, 0.34, 0.58, 0.56, (i, fu) => T.set(i, rampc(wood, 0.3 + Math.sin(fu * Math.PI) * 0.6), 0.9));
    T.box(0.69, 0.42, 0.75, 0.86, (i, fu) => T.set(i, rampc(wood, 0.3 + Math.sin(fu * Math.PI) * 0.6), 0.85));
    T.box(0.6, 0.34, 0.86, 0.45, (i, fu, fv) => T.set(i, rampc(PAL_STEEL, clamp(0.85 - fv * 0.5, 0, 1)), 0.95, 1, 0.6));
  } else { // кирка и ножницы
    T.line(0.2, 0.86, 0.48, 0.42, 0.025, i => T.set(i, rampc(wood, 0.6), 0.85, 1));
    T.line(0.28, 0.36, 0.62, 0.44, 0.03, (i, s) => T.set(i, rampc(PAL_STEEL, 0.85 - s * 0.3), 0.95, 1, 0.6), 0.02);
    T.line(0.62, 0.86, 0.8, 0.46, 0.022, (i, s) => T.set(i, rampc(PAL_STEEL, 0.8 - s * 0.3), 0.9, 1, 0.6), 0.012);
    T.line(0.84, 0.86, 0.66, 0.46, 0.022, (i, s) => T.set(i, rampc(PAL_STEEL, 0.7 - s * 0.3), 0.92, 1, 0.6), 0.012);
    T.disc(0.73, 0.66, 0.025, i => T.set(i, hexc('#2a2a2a'), 0.95, 1));
  }
  return { depth: 0.04 };
}
function txFurnaceBase(T) {
  T.each((u, v, x, y, i) => { const s = txStone(T, u, v, x, y, 3), e = Math.min(u, v, 1 - u, 1 - v); let c = mulc(s.c, 0.92), h = 0.55 + s.h * 0.25; if (e < 0.055) { c = mulc(s.c, 1.08); h = 0.92; } else if (e < 0.08) { c = mulc(s.c, 0.7); h = 0.3; } T.set(i, c, h); });
  return { depth: 0.035 };
}
function txFurnaceFront(T, on) {
  txFurnaceBase(T);
  T.box(0.2, 0.17, 0.8, 0.3, (i, fu, fv) => T.set(i, mulc(hexc('#1a1a1a'), 0.8 + fv * 0.5), 0.05));
  T.box(0.22, 0.48, 0.78, 0.86, (i, fu, fv) => {
    const bar = Math.abs(((fu * 5) % 1) - 0.5) > 0.4 && fv < 0.55;
    if (on && !bar) { const f = T.fbm(fu, fv, 4, 3, 300); T.set(i, rampc(PAL_FIRE, clamp(fv * 1.1 - 0.2 + (f - .5) * 0.9, 0, 1)), 0.05, 1, 0, 1); }
    else T.set(i, bar ? hexc('#3a3a3a') : mulc(hexc('#101010'), 0.8 + fv * 0.6), bar ? 0.6 : 0.02);
  });
  return { depth: 0.04 };
}
function txPumpkinFace(T, glow) {
  TEX.pumpkin_side(T);
  const tri = (ax, ay, bx, by, cx, cy, u, v) => { const s = (x1, y1, x2, y2) => (u - x2) * (y1 - y2) - (x1 - x2) * (v - y2), d1 = s(ax, ay, bx, by), d2 = s(bx, by, cx, cy), d3 = s(cx, cy, ax, ay); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  T.each((u, v, x, y, i) => {
    let cut = tri(0.15, 0.44, 0.41, 0.44, 0.28, 0.2, u, v) || tri(0.59, 0.44, 0.85, 0.44, 0.72, 0.2, u, v) || tri(0.44, 0.58, 0.56, 0.58, 0.5, 0.48, u, v);
    const q = Math.pow((u - 0.5) / 0.33, 2), mt = 0.64 + 0.07 * q, mb = 0.83 - 0.04 * q;
    if (u > 0.17 && u < 0.83 && v > mt && v < mb) { const tooth = (u > 0.33 && u < 0.41 && v < mt + 0.07) || (u > 0.59 && u < 0.67 && v < mt + 0.07) || (u > 0.46 && u < 0.54 && v > mb - 0.07); if (!tooth) cut = true; }
    if (!cut) return;
    if (glow) T.set(i, rampc(palx('#ff7a00', '#ffa820', '#ffd23f', '#fff0a0'), clamp(0.5 + (T.fbm(u, v, 6, 2, 210) - .5) * 0.8 + (v - 0.5) * 0.3, 0, 1)), 0.05, 1, 0, 1);
    else T.set(i, mulc(hexc('#2a1204'), 0.8 + T.white(x, y) * 0.4), 0.02);
  });
  return { depth: 0.06 };
}
function txTntEnds(T, fuse) {
  T.each((u, v, x, y, i) => { const cu = (Math.floor(u * 4) + .5) / 4, cv = (Math.floor(v * 4) + .5) / 4, d = Math.hypot(u - cu, v - cv) / 0.125, w = T.white(x, y); T.set(i, d > 0.92 ? mulc(PAL_TNT[0], 0.7) : rampc(PAL_TNT, clamp(0.85 - d * 0.6 + (w - .5) * 0.1, 0, 1)), d > 0.92 ? 0.1 : 0.8 - d * d * 0.4); });
  if (fuse) { T.disc(0.5, 0.5, 0.07, (i, d) => T.set(i, mulc(hexc('#3a3a3a'), 1.2 - d * 0.5), 0.95)); T.line(0.5, 0.5, 0.56, 0.4, 0.015, i => T.set(i, hexc('#2a2a2a'), 1)); }
  return { depth: 0.04 };
}

// ---------- плитки ----------
TEX.missing = T => T.each((u, v, x, y, i) => T.set(i, ((x >> 2) + (y >> 2)) % 2 ? [1, 0, 1] : [0, 0, 0], 0.5));
TEX.grass_top = T => {
  T.each((u, v, x, y, i) => { const n = T.fbm(u, v, 4, 3, 1), f = T.vn(u, v, 16, 2); T.set(i, rampc(PAL_GRASS, 0.15 + n * 0.45 + f * 0.2 + (T.white(x, y) - .5) * 0.15), 0.25 + n * 0.25); });
  for (let k = 0; k < 520; k++) {
    const u = T.R(), v = T.R(), a = T.R() * 6.283, L = 0.025 + T.R() * 0.05, c = rampc(PAL_GRASS, 0.3 + T.R() * 0.7);
    T.line(u, v, u + Math.cos(a) * L, v + Math.sin(a) * L, 0.012, (i, s) => T.set(i, mixc(mulc(c, 0.82), c, s), 0.5 + 0.45 * s), 0.006);
  }
  return { depth: 0.022 };
};
TEX.dirt = T => {
  T.each((u, v, x, y, i) => { const n = T.fbm(u, v, 4, 4, 2), m = T.fbm(u, v, 16, 2, 3), w = T.white(x, y); T.set(i, rampc(PAL_DIRT, 0.12 + n * 0.5 + m * 0.2 + (w - .5) * 0.22), n * 0.5 + m * 0.3); });
  for (let k = 0; k < 22; k++) {
    const r = 0.018 + T.R() * 0.03, c = T.R() < 0.6 ? rampc(PAL_DIRT, 0.85 + T.R() * 0.15) : rampc(PAL_STONE, 0.3 + T.R() * 0.5);
    T.disc(T.R(), T.R(), r, (i, d, lu, lv) => T.set(i, mulc(c, 1.05 - d * 0.25 - lv * 0.12), 0.85 - d * d * 0.35), r * (0.7 + T.R() * 0.3), T.R() * 3);
  }
  return { depth: 0.03 };
};
TEX.grass_side = T => { TEX.dirt(T); txOverhang(T, PAL_GRASS, 0.3, 5, 0.13, 0.12); return { depth: 0.03 }; };
TEX.snow = T => { T.each((u, v, x, y, i) => { const n = T.fbm(u, v, 4, 4, 4), w = T.white(x, y); T.set(i, rampc(PAL_SNOW, 0.35 + n * 0.5 + (w - .5) * 0.12), n * 0.7, 1, w > 0.97 ? 0.9 : 0.15); }); return { depth: 0.02 }; };
TEX.snow_side = T => { TEX.dirt(T); txOverhang(T, PAL_SNOW, 0.45, 9, 0.18, 0.12); return { depth: 0.03 }; };
TEX.stone = T => { T.each((u, v, x, y, i) => { const s = txStone(T, u, v, x, y); T.set(i, s.c, s.h); }); txCracks(T, 4, 1); return { depth: 0.03 }; };
TEX.cobble = T => txCobble(T, false);
TEX.mossy = T => txCobble(T, true);
TEX.gravel = T => {
  const GV = palx('#5c5550', '#6f6862', '#837a72', '#968c82', '#aaa094', '#7d6f63');
  T.each((u, v, x, y, i) => { const c = T.vor(u, v, 7, 50, 0.95), w = T.white(x, y), edge = clamp(c.e / 0.3, 0, 1); let col = mulc(rampc(GV, c.id), 0.6 + 0.4 * Math.sqrt(edge) + (w - .5) * 0.1); if (edge < 0.1) col = mulc(col, 0.55); T.set(i, col, Math.sqrt(edge)); });
  return { depth: 0.04 };
};
TEX.sand = T => {
  const SA = palx('#b09a5e', '#c9b57a', '#d6c48a', '#e0d09a', '#e9dba9', '#f4e9c0');
  T.each((u, v, x, y, i) => { const n = T.fbm(u, v, 4, 3, 60), w = T.white(x, y), g = T.vn(u, v, 32, 62), rip = Math.sin((v + T.fbm(u, v, 2, 3, 61) * 0.7) * Math.PI * 8) * 0.5 + 0.5, dark = g < 0.12 ? -0.25 : 0; T.set(i, rampc(SA, 0.3 + n * 0.35 + rip * 0.06 + (w - .5) * 0.3 + dark), rip * 0.12 + n * 0.3 + (w - .5) * 0.04, 1, w > 0.985 ? 0.6 : 0); });
  return { depth: 0.015 };
};
TEX.clay = T => { const CL = palx('#7f889a', '#8f98aa', '#9aa3b4', '#a8b0c0'); T.each((u, v, x, y, i) => { const n = T.fbm(u, v, 3, 3, 70), w = T.white(x, y); T.set(i, rampc(CL, 0.3 + n * 0.5 + (w - .5) * 0.08 - (w > 0.97 ? 0.4 : 0)), n * 0.4, 1, 0.12); }); return { depth: 0.012 }; };
TEX.bedrock = T => { const BR = palx('#141414', '#242424', '#363636', '#4c4c4c', '#666666'); T.each((u, v, x, y, i) => { const c = T.vor(u, v, 5, 80, 1), n = T.fbm(u, v, 8, 2, 81), k = clamp(c.id * 0.7 + n * 0.5 - 0.1, 0, 1); T.set(i, rampc(BR, k), k * 0.8 + c.e * 0.3); }); return { depth: 0.05 }; };
TEX.water = T => {
  const WA = palx('#1f4fb8', '#2a5fcf', '#3570e0', '#4a86ee', '#6aa2f5', '#9cc4fa');
  T.each((u, v, x, y, i) => { const a = T.vor(u, v, 4, 90, 1), b = T.vor(u, v, 6, 91, 1), n = T.fbm(u, v, 4, 3, 92), caus = Math.pow(1 - clamp(a.e * 2.5, 0, 1), 3) * 0.6 + Math.pow(1 - clamp(b.e * 2.5, 0, 1), 3) * 0.4; T.set(i, rampc(WA, 0.25 + n * 0.3 + caus * 0.45), caus); });
  return { depth: 0.01, emboss: 0, ao: 0 };
};
TEX.lava = T => {
  const LA = palx('#5a1200', '#a32400', '#e04a00', '#ff7a10', '#ffb030', '#ffe070');
  T.each((u, v, x, y, i) => { const c = T.vor(u, v, 4, 100, 0.9), n = T.fbm(u, v, 4, 3, 101), seam = 1 - clamp(c.e * 3, 0, 1), k = clamp(0.55 + (n - .5) * 0.5 + seam * 0.35 - (c.id < 0.3 ? 0.45 * (1 - seam) : 0), 0, 1); T.set(i, rampc(LA, k), 1 - k, 1, 0, 1); });
  return { depth: 0.02, emboss: 0.5, ao: 0 };
};
TEX.log_side = T => {
  T.each((u, v, x, y, i) => { const a = T.fbm(u, v, 6, 3, 110, 0.5, 2), b = T.fbm(u, v, 12, 2, 111, 0.5, 3), w = T.white(x, y), groove = Math.pow(1 - Math.abs(a * 2 - 1), 3); T.set(i, rampc(PAL_BARK, clamp(0.2 + b * 0.5 + (1 - groove) * 0.35 + (w - .5) * 0.1, 0, 1)), 1 - groove * 0.8 + b * 0.2); });
  return { depth: 0.05 };
};
TEX.log_top = T => txRings(T, PAL_BARK, palx('#7a5530', '#946a3c', '#ab7f4a', '#c09259', '#d1a66b'));
TEX.birch_side = T => {
  const BW = palx('#bdb6a6', '#d4cec0', '#e4dfd3', '#f0ece3', '#faf8f3');
  T.each((u, v, x, y, i) => { const n = T.fbm(u, v, 4, 3, 130, 0.5, 8), w = T.white(x, y); T.set(i, rampc(BW, 0.35 + n * 0.5 + (w - .5) * 0.1), 0.6 + n * 0.2); });
  for (let k = 0; k < 22; k++) { const L = 0.03 + T.R() * 0.1, th = 0.006 + T.R() * 0.014; T.disc(T.R(), T.R(), L, (i, d) => T.set(i, mixc(hexc('#1a1a1a'), hexc('#4a4640'), d * d), 0.2), th); }
  for (let k = 0; k < 5; k++) T.disc(T.R(), T.R(), 0.05 + T.R() * 0.05, (i, d) => T.set(i, mixc(hexc('#9a9488'), T.get(i), d), 0.45), 0.03);
  return { depth: 0.03 };
};
TEX.birch_top = T => txRings(T, palx('#cfc9bb', '#e2ddd0', '#f2efe6'), palx('#b8a47a', '#c8b48a', '#d6c49a', '#e2d2aa'));
TEX.leaves = T => txLeaves(T, palx('#1f4f14', '#2a6619', '#367d20', '#43922a', '#55a835', '#6abc45'));
TEX.bleaves = T => txLeaves(T, palx('#3a6a1c', '#4a7f25', '#5b952f', '#6dab3a', '#80bf48', '#95d058'));
TEX.planks = T => txPlanks(T, PAL_PLANK);
TEX.glass = T => {
  const fr = Math.max(1 / T.S, 1 / 16);
  T.each((u, v, x, y, i) => {
    const e = Math.min(u, v, 1 - u, 1 - v);
    if (e < fr) { T.set(i, mixc(hexc('#b8dceb'), hexc('#ffffff'), (u < 0.5 && v < 0.5 ? 0.6 : 0.2)), 0.8, 1, 0.8); return; }
    const s = u + v, streak = Math.abs(s - 0.62) < 0.035 || Math.abs(s - 0.84) < 0.018 || Math.abs(s - 1.42) < 0.025;
    T.set(i, hexc('#f4fbff'), 0.5, streak && u > 0.15 && u < 0.85 && v > 0.15 && v < 0.85 ? 1 : 0, 1);
  });
  return { depth: 0.01, ao: 0 };
};
TEX.brick = T => {
  const rows = 4, mw = Math.max(1 / T.S, 0.05), BRK = palx('#6e2a1e', '#83352a', '#994233', '#ad513e', '#bf654f'), MOR = palx('#8f8a80', '#a7a196', '#bdb7ab');
  T.each((u, v, x, y, i) => {
    const row = Math.floor(v * rows), fv = v * rows - row, uu = ((u + (row % 2 ? 0.25 : 0)) % 1 + 1) % 1, bi = Math.floor(uu * 2), fu = uu * 2 - bi;
    const md = Math.min(Math.min(fu, 1 - fu) / 2, Math.min(fv, 1 - fv) / rows), w = T.white(x, y), n = T.fbm(u, v, 8, 2, 150);
    if (md < mw / 2) { T.set(i, rampc(MOR, clamp(n + (w - .5) * .3, 0, 1)), 0.1); return; }
    const id = T.white(bi * 3 + 1, row * 5 + 2, 151), chip = T.fbm(u, v, 16, 2, 152) > 0.72 && md < mw * 1.6;
    let col = rampc(BRK, clamp(0.2 + id * 0.55 + (n - .5) * 0.4 + (w - .5) * .12, 0, 1)); if (chip) col = mulc(col, 0.8);
    T.set(i, col, 0.75 + n * 0.15 - (md < mw ? 0.2 : 0) - (chip ? 0.3 : 0));
  });
  return { depth: 0.045 };
};
TEX.stonebrick = T => {
  const rows = 2, mw = Math.max(1 / T.S, 0.035);
  T.each((u, v, x, y, i) => {
    const row = Math.floor(v * rows), fv = v * rows - row, uu = ((u + (row % 2 ? 0.5 : 0)) % 1 + 1) % 1, md = Math.min(Math.min(uu, 1 - uu), Math.min(fv, 1 - fv) / rows), s = txStone(T, u, v, x, y, row * 3);
    if (md < mw / 2) { T.set(i, mulc(hexc('#3e3e3e'), 0.85 + T.white(x, y) * 0.3), 0.05); return; }
    T.set(i, mulc(s.c, md < mw * 1.3 ? 1.1 : 1), 0.7 + s.h * 0.2 - (md < mw ? 0.15 : 0));
  });
  return { depth: 0.04 };
};
TEX.gold = T => txMetal(T, palx('#8a6208', '#b8860b', '#e0aa1c', '#f2c53d', '#fbe07a', '#fff4c0'), 0.9);
TEX.iron_block = T => txMetal(T, palx('#6a6a6a', '#8a8a8a', '#a8a8a8', '#c8c8c8', '#e2e2e2', '#ffffff'), 0.7);
TEX.diamond = T => txMetal(T, palx('#0f6e68', '#1a9c90', '#3cc8bc', '#5fe0d6', '#a8f4ee', '#e6fffd'), 1, true);
TEX.emerald = T => txMetal(T, palx('#0a5a26', '#12803a', '#1fa84c', '#36d468', '#7ae89a', '#c8ffd8'), 1, true);
TEX.books = T => {
  txPlanks(T, PAL_PLANK);
  const cols = ['#8a2a2a', '#2a468a', '#2f7a36', '#b08a2a', '#5e348a', '#2a2a2a', '#8a5a2a', '#1f6a6a', '#a8402a'];
  for (const [v0, v1] of [[0.07, 0.46], [0.54, 0.93]]) {
    T.box(0.05, v0, 0.95, v1, i => T.set(i, hexc('#24160a'), 0.05));
    let u = 0.06;
    while (u < 0.93) {
      const u1 = Math.min(0.94, u + 0.06 + T.R() * 0.06), top = v1 - (v1 - v0) * (0.7 + T.R() * 0.28), c = hexc(cols[T.R() * cols.length | 0]), tilt = T.R() < 0.12;
      T.box(u, top, u1, v1, (i, fu, fv) => { let cc = mulc(c, 0.7 + 0.4 * Math.sin(fu * Math.PI)); if (Math.abs(fv - 0.18) < 0.05 || Math.abs(fv - 0.82) < 0.05) cc = mixc(cc, hexc('#e8d48a'), 0.6); T.set(i, cc, 0.5 + 0.4 * Math.sin(fu * Math.PI) - (tilt ? fu * 0.2 : 0)); });
      u = u1 + 0.006;
    }
  }
  return { depth: 0.04 };
};
TEX.qchest_top = T => { const o = txChest(T, PAL_QCHEST, PAL_PURPLE, { rimSpec: 0.4 }); T.disc(0.5, 0.5, 0.1, (i, d, lu, lv) => T.set(i, rampc(PAL_GOLDL, clamp(0.9 - d * 0.5 - (lu + lv) * 0.15, 0, 1)), 1 - d * 0.2, 1, 0.9)); return o; };
TEX.qchest_side = T => { const o = txChest(T, PAL_QCHEST, PAL_PURPLE, { lid: 0.3, latch: PAL_GOLDL, rimSpec: 0.4 }); T.glyph(['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'], 0.5 - 2.5 * 0.062, 0.48, 0.062, i => T.set(i, hexc('#fff6c0'), 0.95, 1, 0.3)); return o; };
TEX.schest_top = T => txChest(T, PAL_CHEST, PAL_CHESTRIM);
TEX.schest_side = T => txChest(T, PAL_CHEST, PAL_CHESTRIM, { lid: 0.38 });
TEX.schest_front = T => txChest(T, PAL_CHEST, PAL_CHESTRIM, { lid: 0.38, latch: PAL_STEEL });
TEX.glow = T => { const GL = palx('#7a4410', '#b8761e', '#e0a030', '#f6c64a', '#ffe27a', '#fff6c8'); T.each((u, v, x, y, i) => { const c = T.vor(u, v, 5, 180, 0.9), n = T.fbm(u, v, 8, 2, 181), e = clamp(c.e / 0.35, 0, 1); T.set(i, rampc(GL, clamp(0.02 + e * 0.78 + (c.id - .5) * 0.3 + (n - .5) * 0.2, 0, 1)), e, 1, 0.3, 1); }); return { depth: 0.04, ao: 0.5 }; };
TEX.wool_r = T => txWool(T, '#c8322c'); TEX.wool_b = T => txWool(T, '#3348c8'); TEX.wool_y = T => txWool(T, '#f0c419');
TEX.wool_w = T => txWool(T, '#f0f0f0'); TEX.wool_g = T => txWool(T, '#4caf3a'); TEX.wool_p = T => txWool(T, '#8e3ad0');
TEX.pumpkin_side = T => { T.each((u, v, x, y, i) => { const rib = Math.pow(Math.abs(Math.sin(u * Math.PI * 4)), 0.6), n = T.fbm(u, v, 4, 3, 200, 0.5, 2), w = T.white(x, y); T.set(i, rampc(PAL_PUMP, clamp(0.12 + rib * 0.6 + (n - .5) * 0.3 + (w - .5) * 0.06, 0, 1)), rib * 0.8 + n * 0.2); }); return { depth: 0.06 }; };
TEX.pumpkin_top = T => {
  T.each((u, v, x, y, i) => { const du = u - .5, dv = v - .5, d = Math.hypot(du, dv), f = clamp(d * 4, 0, 1), rib = Math.pow(Math.abs(Math.sin(Math.atan2(dv, du) * 4)), 0.6) * f + (1 - f) * 0.7, n = T.fbm(u, v, 4, 3, 201); T.set(i, rampc(PAL_PUMP, clamp(0.15 + rib * 0.55 + (n - .5) * 0.3, 0, 1)), rib * 0.7 + n * 0.2); });
  T.disc(0.5, 0.5, 0.085, (i, d, lu, lv) => T.set(i, rampc(palx('#3a4a14', '#55661e', '#73842a', '#93a23a'), clamp(0.8 - d * 0.5 - (lu + lv) * 0.2, 0, 1)), 1, 1));
  return { depth: 0.05 };
};
TEX.pumpkin_face = T => txPumpkinFace(T, false);
TEX.jacko_face = T => txPumpkinFace(T, true);
TEX.tgrass = T => { T.clear(); for (let k = 0; k < 16; k++) { const u0 = 0.06 + T.R() * 0.88, hg = 0.35 + T.R() * 0.6, bend = (T.R() - .5) * 0.3, c = rampc(PAL_GRASS, 0.3 + T.R() * 0.7); T.line(u0, 1, u0 + bend, 1 - hg, 0.03, (i, s) => T.set(i, mixc(mulc(c, 0.65), c, s), 0.3 + s * 0.6, 1), 0.006); } return { depth: 0.02 }; };
TEX.rose = T => txFlower(T, palx('#5a0606', '#8a0c0c', '#b81818', '#d6302c', '#f05a4a'), null, true);
TEX.dande = T => txFlower(T, palx('#b88a08', '#dcae14', '#f5d02a', '#ffe85a'), palx('#c48a08', '#f0b820'), false);
TEX.coal = T => txOre(T, palx('#0e0e0e', '#1c1c1c', '#2c2c2c', '#464646'), 6, 0.15);
TEX.iron = T => txOre(T, palx('#7a5a44', '#a37a5c', '#c99a78', '#e8c0a0'), 5, 0.45);
TEX.gold_ore = T => txOre(T, palx('#9a7208', '#d4a417', '#f5d041', '#fff09a'), 5, 0.9);
TEX.diamond_ore = T => txOre(T, palx('#1a8a84', '#2fc4bc', '#5ff0e4', '#c8fffa'), 4, 1);
TEX.emerald_ore = T => txOre(T, palx('#0e6a2e', '#1fa04a', '#32e070', '#a8ffc4'), 3, 1);
TEX.craft_top = T => {
  txPlanks(T, PAL_PLANK2);
  T.each((u, v, x, y, i) => { const e = Math.min(u, v, 1 - u, 1 - v), g = Math.min(Math.abs(u - 1 / 3), Math.abs(u - 2 / 3), Math.abs(v - 1 / 3), Math.abs(v - 2 / 3)); if (e < 0.06) T.set(i, mulc(hexc('#4a2e14'), 0.9 + T.white(x, y) * 0.2), 0.95); else if (e > 0.12 && g < 0.018) T.set(i, hexc('#3a220e'), 0.15); else if (e < 0.12) T.set(i, mulc(T.get(i), 0.85), 0.3); });
  return { depth: 0.04 };
};
TEX.craft_side = T => txToolsPanel(T, false);
TEX.craft_front = T => txToolsPanel(T, true);
TEX.furnace_top = T => txFurnaceBase(T);
TEX.furnace_side = T => txFurnaceBase(T);
TEX.furnace_front = T => txFurnaceFront(T, false);
TEX.furnace_front_on = T => txFurnaceFront(T, true);
// факел: палка в середине (её грани берут столбцы 7–9 из 16), тлеющая верхушка и язык пламени для иконки
TEX.torch = T => {
  T.clear(); const W = palx('#4a3018', '#6b4a2b', '#8a6438', '#a07a45');
  T.box(0.4375, 0.375, 0.5625, 1, (i, fu, fv, x, y) => T.set(i, rampc(W, clamp(0.3 + Math.sin(fu * Math.PI) * 0.6 + (T.white(x, y) - .5) * .2 - fv * 0.1, 0, 1)), 0.5 + Math.sin(fu * Math.PI) * 0.3, 1));
  T.box(0.4375, 0.25, 0.5625, 0.47, (i, fu, fv) => T.set(i, rampc(palx('#ff6a00', '#ffb020', '#ffe680', '#fffbe0'), clamp(1 - fv * 0.8 + Math.sin(fu * Math.PI) * 0.2, 0, 1)), 0.8, 1, 0, 1));
  T.disc(0.5, 0.2, 0.07, (i, d) => { if (T.getA(i) > 0.5) return; T.set(i, rampc(palx('#ff7a10', '#ffc040', '#fff0a0'), 1 - d), 0.8, 1, 0, 1); }, 0.13);
  return { depth: 0.02, ao: 0 };
};
TEX.farmland = T => { const FA = palx('#2a170a', '#3a2210', '#4a2e17', '#5c3a1f', '#6e4828'); T.each((u, v, x, y, i) => { const f = 0.5 + 0.5 * Math.cos(v * Math.PI * 8), n = T.fbm(u, v, 8, 3, 310), w = T.white(x, y); T.set(i, rampc(FA, clamp(0.15 + f * 0.45 + (n - .5) * 0.4 + (w - .5) * 0.15, 0, 1)), f * 0.6 + n * 0.3, 1, 0.25 * (1 - f)); }); return { depth: 0.04 }; };
for (let s = 0; s < 8; s++) TEX['wheat' + s] = T => {
  T.clear(); const hgt = 0.25 + s * 0.095, cs = s < 4 ? palx('#3f7a22', '#58962f', '#72b03e') : s < 7 ? palx('#7a8a2a', '#98a438', '#b4b84a') : palx('#a8862a', '#c9a23a', '#e2c058');
  [0.06, 0.16, 0.26, 0.36, 0.46, 0.55, 0.64, 0.74, 0.84, 0.94].forEach((u0, k) => {
    const hh = hgt * (0.8 + ((k * 37) % 10) / 40), bend = ((k % 3) - 1) * 0.05;
    T.line(u0, 1, u0 + bend, 1 - hh, 0.03, (i, t) => T.set(i, rampc(cs, 0.25 + t * 0.65), 0.5 + t * 0.4, 1), 0.014);
    if (s >= 2 && k % 2 === 0) T.line(u0 + bend * 0.5, 1 - hh * 0.45, u0 + bend * 0.5 + (k % 4 ? 0.07 : -0.07), 1 - hh * 0.62, 0.016, (i, t) => T.set(i, rampc(cs, 0.4 + t * 0.4), 0.6, 1), 0.006);
    if (s >= 5) T.disc(u0 + bend, 1 - hh + 0.06, 0.035, (i, d, lu, lv) => T.set(i, rampc(palx('#9a7420', '#c49a2a', '#e8c454', '#f6dc80'), clamp(0.9 - d * 0.6 - lv * 0.2, 0, 1)), 0.9 - d * 0.3, 1), 0.09);
  });
  return { depth: 0.02 };
};
TEX.sapling = T => txSapling(T, palx('#1f4f14', '#2a6619', '#367d20', '#43922a', '#55a835'), '#6b4a2b');
TEX.bsapling = T => txSapling(T, palx('#3a6a1c', '#4a7f25', '#5b952f', '#6dab3a', '#80bf48'), '#e8e4d8');
TEX.tnt_side = T => {
  T.each((u, v, x, y, i) => {
    const stick = Math.pow(Math.abs(Math.sin(u * Math.PI * 4)), 0.5), n = T.fbm(u, v, 4, 2, 320, 0.5, 2), w = T.white(x, y);
    if (v > 0.33 && v < 0.67) T.set(i, rampc(palx('#c8c0b0', '#e0d8c8', '#f2ece0', '#fbf8f0'), clamp(0.5 + (T.fbm(u, v, 8, 2, 321) - .5) * 0.5 + (w - .5) * 0.06, 0, 1)), 0.7);
    else T.set(i, rampc(PAL_TNT, clamp(0.15 + stick * 0.65 + (n - .5) * 0.25 + (w - .5) * 0.06, 0, 1)), stick * 0.8);
  });
  const L = { T: ['###', '.#.', '.#.', '.#.', '.#.'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'] }, cw = 0.056; let u0 = 0.5 - 6 * cw;
  for (const ch of 'TNT') { T.glyph(L[ch], u0, 0.36, cw, i => T.set(i, hexc('#1a1a1a'), 0.55)); u0 += (L[ch][0].length + 1) * cw; }
  return { depth: 0.04 };
};
TEX.tnt_top = T => txTntEnds(T, true);
TEX.tnt_bottom = T => txTntEnds(T, false);
TEX.bed_top = T => {
  T.each((u, v, x, y, i) => {
    const w = T.white(x, y), n = T.fbm(u, v, 8, 2, 330);
    if (v < 0.3) { const e = Math.min(u - 0.08, 0.92 - u, v - 0.05, 0.27 - v); if (e < 0) { T.set(i, rampc(PAL_BED, 0.5), 0.3); return; } T.set(i, rampc(palx('#c8c8c8', '#e0e0e0', '#f0f0f0', '#ffffff'), clamp(0.5 + clamp(e * 12, 0, 0.5) + (n - .5) * 0.2, 0, 1)), 0.6 + clamp(e * 8, 0, 0.35)); return; }
    const fold = 0.5 + 0.5 * Math.sin(v * Math.PI * 6 + n * 2), stitch = (Math.abs(u - 0.1) < 0.01 || Math.abs(u - 0.9) < 0.01) && Math.floor(v * 30) % 2 === 0;
    T.set(i, stitch ? hexc('#f0c0b0') : rampc(PAL_BED, clamp(0.35 + fold * 0.3 + (n - .5) * 0.25 + (w - .5) * 0.05, 0, 1)), 0.5 + fold * 0.2);
  });
  return { depth: 0.035 };
};
// бок кровати: видна нижняя часть плитки (кровать ниже блока)
TEX.bed_side = T => {
  T.each((u, v, x, y, i) => {
    const w = T.white(x, y), n = T.fbm(u, v, 8, 2, 331);
    if (v < 0.44) T.set(i, rampc(PAL_BED, 0.5), 0.5);
    else if (v < 0.64) T.set(i, rampc(PAL_BED, clamp(0.45 + (n - .5) * 0.3 + (v < 0.47 ? 0.2 : 0) + (w - .5) * 0.06, 0, 1)), 0.6);
    else if (v < 0.8) T.set(i, rampc(PAL_PLANK, clamp(0.4 + (T.fbm(u, v, 2, 3, 332, 0.5, 16) - .5) * 0.6, 0, 1)), 0.7);
    else if (u < 0.17 || u > 0.83) T.set(i, rampc(PAL_PLANK, clamp(0.25 + (n - .5) * 0.3, 0, 1)), 0.7);
    else T.set(i, null, 0, 0);
  });
  return { depth: 0.03 };
};
for (let s = 0; s < 10; s++) TEX['crack' + s] = T => {
  T.clear(); const rr = mulberry32(77);
  for (let k = 0; k < (s + 1) * 3; k++) {
    let u = 0.5, v = 0.5, a = rr() * 6.283;
    for (let j = 0; j < 2 + s; j++) { a += (rr() - .5) * 0.9; const L = 0.06 + rr() * 0.05, u1 = u + Math.cos(a) * L, v1 = v + Math.sin(a) * L; if (u1 < 0.03 || u1 > 0.97 || v1 < 0.03 || v1 > 0.97) break; T.line(u, v, u1, v1, 0.012, i => T.set(i, [0, 0, 0], 0.5, 0.78)); u = u1; v = v1; }
  }
  return { depth: 0, emboss: 0, ao: 0 };
};
