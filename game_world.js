// ===== ДелКрафт: мир, генерация, освещение, меши, физика =====
class World {
  constructor(seed) {
    this.seed = seed;
    this.data = new Uint8Array(NVOX); this.sky = new Uint8Array(NVOX); this.blk = new Uint8Array(NVOX);
    this.edits = new Map(); this.meta = new Map(); this.containers = new Map(); this.chests = [];
    this.height = new Int16Array(WXZ); this.ticking = new Map(); // растения: индекс → время следующего роста
  }
  get(x, y, z) { if (y < 0) return B.BEDROCK; if (y >= WY || x < 0 || z < 0 || x >= WX || z >= WZ) return B.AIR; return this.data[(y * WZ + z) * WX + x]; }
  skyAt(x, y, z) { if (y >= WY) return 15; if (y < 0 || x < 0 || z < 0 || x >= WX || z >= WZ) return y < 0 ? 0 : 15; return this.sky[(y * WZ + z) * WX + x]; }
  blkAt(x, y, z) { if (y < 0 || y >= WY || x < 0 || z < 0 || x >= WX || z >= WZ) return 0; return this.blk[(y * WZ + z) * WX + x]; }
  inside(x, y, z) { return x >= 0 && z >= 0 && y >= 0 && x < WX && z < WZ && y < WY; }
  // set с пересчётом света; возвращает множество затронутых чанков
  set(x, y, z, id, opts = {}) {
    if (!this.inside(x, y, z)) return null;
    const i = IDX(x, y, z), old = this.data[i]; if (old === id && !opts.force) return null;
    this.data[i] = id; if (opts.edit !== false) this.edits.set(i, id);
    if (!BL[id].orient) this.meta.delete(i);
    if (BL[id].crop != null && BL[id].crop < 7 || id === B.SAPLING || id === B.BSAPLING) this.ticking.set(i, 0); else this.ticking.delete(i);
    const dirty = new Set(); this.markDirty(dirty, x, z);
    if (opts.light !== false) this.relight(i, old, id, dirty);
    return dirty;
  }
  markDirty(set, x, z) {
    const cx = x >> 4, cz = z >> 4, lx = x & 15, lz = z & 15;
    set.add(cx + cz * NCX);
    if (lx === 0 && cx > 0) set.add(cx - 1 + cz * NCX); if (lx === 15 && cx < NCX - 1) set.add(cx + 1 + cz * NCX);
    if (lz === 0 && cz > 0) set.add(cx + (cz - 1) * NCX); if (lz === 15 && cz < NCZ - 1) set.add(cx + (cz + 1) * NCX);
    if (lx === 0 && lz === 0 && cx > 0 && cz > 0) set.add(cx - 1 + (cz - 1) * NCX); if (lx === 15 && lz === 15 && cx < NCX - 1 && cz < NCZ - 1) set.add(cx + 1 + (cz + 1) * NCX);
    if (lx === 0 && lz === 15 && cx > 0 && cz < NCZ - 1) set.add(cx - 1 + (cz + 1) * NCX); if (lx === 15 && lz === 0 && cx < NCX - 1 && cz > 0) set.add(cx + 1 + (cz - 1) * NCX);
  }
  surface(x, z) { for (let y = WY - 1; y > 0; y--) { const b = this.get(x, y, z); if (SOLID[b] || BL[b].liquid) return y; } return 0; }
  topOpaque(x, z) { for (let y = WY - 1; y > 0; y--) { const b = this.get(x, y, z); if (OPQ[b] || BL[b].liquid || BL[b].leaf) return y; } return 0; }

  // ---------- генерация ----------
  generate() {
    const N = makeNoise(this.seed), N2 = makeNoise(this.seed + 101), N3 = makeNoise(this.seed + 202), N4 = makeNoise(this.seed + 303);
    const R = mulberry32(this.seed ^ 0x9e3779b9), D = this.data, H = this.height;
    const biome = new Uint8Array(WXZ); // 0 равнина 1 лес 2 пустыня 3 горы 4 пляж/дно
    for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
      const cont = N.fbm2(x / 95, z / 95, 4), hills = N2.fbm2(x / 38, z / 38, 3), ridge = 1 - Math.abs(N3.n2(x / 70, z / 70));
      let h = SEA + 3 + cont * 11 + hills * 4 + Math.pow(Math.max(0, ridge - 0.5), 2) * 120 * (cont > -0.1 ? 1 : 0.25);
      const ex = Math.min(x, WX - 1 - x, z, WZ - 1 - z); if (ex < 16) h = lerp(SEA - 6, h, ex / 16);
      h = clamp(Math.round(h), 5, WY - 8); H[z * WX + x] = h;
      const temp = N4.n2(x / 140 + 40, z / 140 - 30);
      biome[z * WX + x] = h <= SEA + 1 ? 4 : h > SEA + 22 ? 3 : temp > 0.38 ? 2 : N4.n2(x / 55 + 9, z / 55) > 0.05 ? 1 : 0;
    }
    for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
      const h = H[z * WX + x], bi = biome[z * WX + x];
      let steep = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = clamp(x + dx, 0, WX - 1), zz = clamp(z + dz, 0, WZ - 1); steep = Math.max(steep, Math.abs(H[zz * WX + xx] - h)); }
      for (let y = 0; y <= h; y++) {
        let b;
        if (y === 0 || (y === 1 && R() < .5)) b = B.BEDROCK; else if (y < h - 3) b = B.STONE;
        else if (bi === 2 || bi === 4) b = y < h - 2 ? B.STONE : B.SAND;
        else if (y < h) b = B.DIRT;
        else b = bi === 3 ? (steep > 3 ? B.STONE : B.SNOW) : steep > 4 && h > SEA + 12 ? B.STONE : B.GRASS;
        if (h < SEA && y === h) b = h >= SEA - 3 ? B.SAND : (N2.n2(x / 9, z / 9) > 0.35 ? B.CLAY : R() < .5 ? B.GRAVEL : B.DIRT);
        D[IDX(x, y, z)] = b;
      }
      for (let y = h + 1; y <= SEA; y++) D[IDX(x, y, z)] = B.WATER;
      if (bi === 3 && h > SEA + 26) D[IDX(x, h + 1, z)] = B.SNOWB;
    }
    // пещеры: 3D-шум низкого разрешения с интерполяцией
    const gs = 4, gx = WX / gs + 1, gy = WY / gs + 1, gz = WZ / gs + 1, cav = new Float32Array(gx * gy * gz);
    for (let k = 0; k < gz; k++) for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) cav[(k * gy + j) * gx + i] = N3.n3(i * gs / 18, j * gs / 11, k * gs / 18);
    const cv = (x, y, z) => { const fx = x / gs, fy = y / gs, fz = z / gs, i = fx | 0, j = fy | 0, k = fz | 0, tx = fx - i, ty = fy - j, tz = fz - k; const a = (ii, jj, kk) => cav[((k + kk) * gy + j + jj) * gx + i + ii]; return lerp(lerp(lerp(a(0, 0, 0), a(1, 0, 0), tx), lerp(a(0, 1, 0), a(1, 1, 0), tx), ty), lerp(lerp(a(0, 0, 1), a(1, 0, 1), tx), lerp(a(0, 1, 1), a(1, 1, 1), tx), ty), tz); };
    for (let z = 1; z < WZ - 1; z++) for (let x = 1; x < WX - 1; x++) {
      const h = H[z * WX + x]; if (h <= SEA + 1) continue;
      for (let y = 3; y < h - 3; y++) if (cv(x, y, z) > 0.52) D[IDX(x, y, z)] = y <= 8 ? B.LAVA : B.AIR;
    }
    const vein = (id, n, minY, maxY, size) => { for (let i = 0; i < n; i++) { let x = R() * WX | 0, y = minY + R() * (maxY - minY) | 0, z = R() * WZ | 0; for (let k = 0; k < size; k++) { if (this.get(x, y, z) === B.STONE) D[IDX(x, y, z)] = id; x += (R() * 3 | 0) - 1; y += (R() * 3 | 0) - 1; z += (R() * 3 | 0) - 1; } } };
    vein(B.COAL, 300, 4, 62, 9); vein(B.IRON, 190, 3, 46, 6); vein(B.GOLD_ORE, 55, 3, 28, 5); vein(B.DIAMOND_ORE, 36, 2, 16, 4); vein(B.EMERALD_ORE, 22, 20, 60, 2); vein(B.GRAVEL, 90, 5, 60, 10);
    const tree = (x, z, birch) => {
      const y0 = H[z * WX + x] + 1, th = 4 + (R() * 3 | 0), log = birch ? B.BIRCH : B.LOG, lv = birch ? B.BLEAVES : B.LEAVES;
      for (let y = y0 + th - 3; y <= y0 + th; y++) { const r = y >= y0 + th - 1 ? 1 : 2; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && R() < .6) continue; if (this.get(x + dx, y, z + dz) === B.AIR) D[IDX(x + dx, y, z + dz)] = lv; } }
      if (y0 + th + 1 < WY) D[IDX(x, y0 + th + 1, z)] = lv;
      for (let y = y0; y < y0 + th; y++) D[IDX(x, y, z)] = log;
    };
    for (let z = 3; z < WZ - 3; z++) for (let x = 3; x < WX - 3; x++) {
      const h = H[z * WX + x], bi = biome[z * WX + x];
      if (this.get(x, h, z) !== B.GRASS || this.get(x, h + 1, z) !== B.AIR) continue;
      const r = R();
      if ((bi === 1 && r < .045) || (bi === 0 && r < .007)) { tree(x, z, bi === 1 && R() < .35); continue; }
      const r2 = R(), i = IDX(x, h + 1, z);
      if (r2 < .14) D[i] = B.TGRASS; else if (r2 < .158) D[i] = R() < .5 ? B.ROSE : B.DANDE; else if (r2 < .1595 && bi === 0) D[i] = B.PUMPKIN;
    }
    for (let i = 0; i < 14; i++) this.spawnChest(R, false);
  }
  spawnChest(R = Math.random, light = true) {
    for (let tries = 0; tries < 200; tries++) {
      const x = 6 + R() * (WX - 12) | 0, z = 6 + R() * (WZ - 12) | 0, y = this.surface(x, z), top = this.get(x, y, z);
      if (!(top === B.GRASS || top === B.SAND || top === B.SNOW || top === B.STONE || top === B.DIRT)) continue;
      if (this.chests.some(c => Math.abs(c[0] - x) + Math.abs(c[2] - z) < 14)) continue;
      const above = this.get(x, y + 1, z); if (above !== B.AIR && !BL[above].cross) continue;
      const d = this.set(x, y + 1, z, B.CHEST, { light }); this.chests.push([x, y + 1, z]); return d || true;
    }
    return null;
  }
  spawnPoint() {
    const cx = WX / 2, cz = WZ / 2;
    const open = (x, z, y) => { for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(this.surface(x + dx, z + dz) - y) > 1) return false; return true; };
    for (const strict of [true, false]) for (let r = 0; r < 70; r += 2) for (let a = 0; a < 24; a++) {
      const x = Math.round(cx + Math.cos(a / 24 * Math.PI * 2) * r), z = Math.round(cz + Math.sin(a / 24 * Math.PI * 2) * r);
      const y = this.surface(x, z), b = this.get(x, y, z);
      if (y <= SEA || !SOLID[b] || BL[b].leaf || this.get(x, y + 1, z) === B.LOG) continue;
      if (strict && (b !== B.GRASS || y > SEA + 14 || !open(x, z, y))) continue;
      return [x + .5, y + 1, z + .5];
    }
    return [cx + .5, WY - 10, cz + .5];
  }

  // ---------- освещение (небо + блоки, BFS как в Minecraft) ----------
  computeLight() {
    const D = this.data, S = this.sky, L = this.blk; S.fill(0); L.fill(0);
    const q = [];
    for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
      let lv = 15;
      for (let y = WY - 1; y >= 0; y--) { const i = IDX(x, y, z), id = D[i]; if (OPQ[id]) break; lv -= ATT[id]; if (lv <= 0) break; S[i] = lv; }
    }
    // точки распространения: освещённые воксели рядом с тёмными соседями
    for (let y = 0; y < WY; y++) for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
      const i = IDX(x, y, z), v = S[i]; if (v < 2) continue;
      if ((x > 0 && S[i - 1] < v - 1 && !OPQ[D[i - 1]]) || (x < WX - 1 && S[i + 1] < v - 1 && !OPQ[D[i + 1]]) || (z > 0 && S[i - WX] < v - 1 && !OPQ[D[i - WX]]) || (z < WZ - 1 && S[i + WX] < v - 1 && !OPQ[D[i + WX]]) || (y > 0 && S[i - WXZ] < v - 1 && !OPQ[D[i - WXZ]])) q.push(i);
    }
    this.spread(S, q, true);
    const q2 = []; for (let i = 0; i < NVOX; i++) { const e = EMIT[D[i]]; if (e) { L[i] = e; q2.push(i); } }
    this.spread(L, q2, false);
  }
  spread(A, q, isSky, dirty) {
    const D = this.data;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], v = A[i]; if (v <= 1) continue;
      const x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / WXZ) | 0;
      for (let k = 0; k < 6; k++) {
        let j;
        if (k === 0) { if (x === WX - 1) continue; j = i + 1; } else if (k === 1) { if (x === 0) continue; j = i - 1; }
        else if (k === 2) { if (z === WZ - 1) continue; j = i + WX; } else if (k === 3) { if (z === 0) continue; j = i - WX; }
        else if (k === 4) { if (y === WY - 1) continue; j = i + WXZ; } else { if (y === 0) continue; j = i - WXZ; }
        const id = D[j]; if (OPQ[id]) continue;
        const nv = (isSky && k === 5 && v === 15 && !ATT[id]) ? 15 : v - 1 - ATT[id];
        if (nv > A[j]) { A[j] = nv; q.push(j); if (dirty) this.markDirty(dirty, j % WX, ((j / WX) | 0) % WZ); }
      }
    }
  }
  unspread(A, i, isSky, dirty) {
    const D = this.data, rq = [i, A[i]], aq = []; A[i] = 0;
    for (let h = 0; h < rq.length; h += 2) {
      const c = rq[h], v = rq[h + 1], x = c % WX, z = ((c / WX) | 0) % WZ, y = (c / WXZ) | 0;
      for (let k = 0; k < 6; k++) {
        let j;
        if (k === 0) { if (x === WX - 1) continue; j = c + 1; } else if (k === 1) { if (x === 0) continue; j = c - 1; }
        else if (k === 2) { if (z === WZ - 1) continue; j = c + WX; } else if (k === 3) { if (z === 0) continue; j = c - WX; }
        else if (k === 4) { if (y === WY - 1) continue; j = c + WXZ; } else { if (y === 0) continue; j = c - WXZ; }
        const nv = A[j]; if (!nv) continue;
        if (nv < v || (isSky && k === 5 && v === 15 && nv === 15)) {
          A[j] = 0; this.markDirty(dirty, j % WX, ((j / WX) | 0) % WZ);
          if (!isSky && EMIT[D[j]]) { A[j] = EMIT[D[j]]; aq.push(j); } else rq.push(j, nv);
        } else aq.push(j);
      }
    }
    return aq;
  }
  relight(i, oldId, newId, dirty) {
    const x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / WXZ) | 0;
    const neighborsLit = (A) => { const q = []; for (const j of [i + 1, i - 1, i + WX, i - WX, i + WXZ, i - WXZ]) if (j >= 0 && j < NVOX && A[j]) q.push(j); return q; };
    // небо
    if (OPQ[newId] || ATT[newId] > ATT[oldId]) { const aq = this.unspread(this.sky, i, true, dirty); this.spread(this.sky, aq, true, dirty); }
    if (!OPQ[newId]) {
      let q = neighborsLit(this.sky);
      if (y === WY - 1) { this.sky[i] = 15 - ATT[newId]; q.push(i); }
      this.spread(this.sky, q, true, dirty);
    }
    // свет блоков
    if (EMIT[oldId] || OPQ[newId] || ATT[newId] > ATT[oldId]) { const aq = this.unspread(this.blk, i, false, dirty); this.spread(this.blk, aq, false, dirty); }
    if (EMIT[newId]) { this.blk[i] = Math.max(this.blk[i], EMIT[newId]); this.spread(this.blk, [i], false, dirty); }
    if (!OPQ[newId]) this.spread(this.blk, neighborsLit(this.blk), false, dirty);
    this.markDirty(dirty, x, z);
  }
  lightAt(x, y, z) { // яркость 0..1 для сущностей (с учётом времени суток задаёт шейдер/логика)
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z); return [this.skyAt(x, y, z) / 15, this.blkAt(x, y, z) / 15];
  }
}

// ---------- Меширование чанка ----------
// Грани: нормаль + 4 угла (против часовой стрелки снаружи)
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], t: 2 },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], t: 2 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], t: 0 },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], t: 1 },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], t: 2 },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], t: 2 }
];
const FRONT_FACE = [4, 0, 5, 1]; // ориентация 0:+z 1:+x 2:-z 3:-x
const UVC = [[0, 0], [1, 0], [1, 1], [0, 1]];
const AO_L = [0.42, 0.62, 0.82, 1.0];
let TILE = {}; // имя плитки → индекс в атласе (заполняется в game_items)
const tileUV = (i) => { const u = (i % 16) / 16, v = 1 - ((i >> 4) + 1) / 16, e = 0.25 / (16 * TS); return [u + e, v + e, u + 1 / 16 - e, v + 1 / 16 - e]; };
function blockTile(id, face, meta) { // face: индекс в FACES
  const b = BL[id], F = FACES[face];
  if (b.orient && face === FRONT_FACE[meta || 0]) return TILE[b.tn[3]];
  return TILE[b.tn[F.t]];
}
class MeshBuf {
  constructor() { this.p = []; this.u = []; this.l = []; this.m = []; this.i = []; }
  vert(x, y, z, u, v, ao, sky, blk, emis, nIdx, sway) { this.p.push(x, y, z); this.u.push(u, v); this.l.push(ao * 255 | 0, sky * 255 | 0, blk * 255 | 0, emis ? 255 : 0); this.m.push(nIdx, sway); return this.p.length / 3 - 1; }
  geometry() {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry(), n = this.p.length / 3;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.u), 2));
    g.setAttribute('aL', new THREE.BufferAttribute(new Uint8Array(this.l), 4, true));
    g.setAttribute('aM', new THREE.BufferAttribute(new Uint8Array(this.m), 2, false));
    g.setIndex(n > 65535 ? new THREE.BufferAttribute(new Uint32Array(this.i), 1) : new THREE.BufferAttribute(new Uint16Array(this.i), 1));
    g.computeBoundingSphere(); return g;
  }
}
function meshChunk(world, cx, cz) {
  const S = new MeshBuf(), W = new MeshBuf(), Lv = new MeshBuf();
  const D = world.data, SK = world.sky, BK = world.blk, x0 = cx * CS, z0 = cz * CS;
  const get = (x, y, z) => (y < 0 ? B.BEDROCK : (y >= WY || x < 0 || z < 0 || x >= WX || z >= WZ) ? 0 : D[(y * WZ + z) * WX + x]);
  const lsky = (x, y, z) => (y >= WY ? 15 : (y < 0 || x < 0 || z < 0 || x >= WX || z >= WZ) ? (y < 0 ? 0 : 15) : SK[(y * WZ + z) * WX + x]);
  const lblk = (x, y, z) => ((y < 0 || y >= WY || x < 0 || z < 0 || x >= WX || z >= WZ) ? 0 : BK[(y * WZ + z) * WX + x]);
  let maxY = 0;
  for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) for (let y = WY - 1; y > maxY; y--) if (D[(y * WZ + z) * WX + x]) { maxY = y; break; }
  maxY = Math.min(WY, maxY + 1);
  const o1 = [0, 0, 0], o2 = [0, 0, 0];
  for (let y = 0; y < maxY; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) {
    const id = D[(y * WZ + z) * WX + x]; if (!id) continue;
    const b = BL[id];
    if (b.shape === 'cross') {
      const [u0, v0, u1, v1] = tileUV(TILE[b.tn[0]]), sl = lsky(x, y, z) / 15, bl = lblk(x, y, z) / 15;
      for (const [[ax, az], [bx2, bz]] of [[[0.15, 0.15], [0.85, 0.85]], [[0.85, 0.15], [0.15, 0.85]]]) for (const flip of [0, 1]) {
        const pts = [[ax, 0, az], [bx2, 0, bz], [bx2, 1, bz], [ax, 1, az]], order = flip ? [1, 0, 3, 2] : [0, 1, 2, 3], base = S.p.length / 3;
        for (const k of order) { const p = pts[k]; S.vert(x + p[0], y + p[1] * 0.95, z + p[2], k === 0 || k === 3 ? u0 : u1, k < 2 ? v0 : v1, 0.92, sl, bl, 0, 2, p[1] * b.sway * 100); }
        S.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      continue;
    }
    if (b.shape === 'torch') {
      const [u0, v0, u1, v1] = tileUV(TILE.torch), du = (u1 - u0) / 16, dv = (v1 - v0) / 16, sl = lsky(x, y, z) / 15;
      const tx0 = x + 7 / 16, tx1 = x + 9 / 16, tz0 = z + 7 / 16, tz1 = z + 9 / 16, ty1 = y + 10 / 16;
      const quad = (pts, uvs, n) => { const base = S.p.length / 3; pts.forEach((p, k) => S.vert(p[0], p[1], p[2], uvs[k][0], uvs[k][1], 1, sl, 1, 1, n, 0)); S.i.push(base, base + 1, base + 2, base, base + 2, base + 3); };
      const su0 = u0 + 7 * du, su1 = u0 + 9 * du, sv0 = v0, sv1 = v0 + 10 * dv;
      const side = [[su0, sv0], [su1, sv0], [su1, sv1], [su0, sv1]];
      quad([[tx0, y, tz1], [tx1, y, tz1], [tx1, ty1, tz1], [tx0, ty1, tz1]], side, 4);
      quad([[tx1, y, tz0], [tx0, y, tz0], [tx0, ty1, tz0], [tx1, ty1, tz0]], side, 5);
      quad([[tx1, y, tz1], [tx1, y, tz0], [tx1, ty1, tz0], [tx1, ty1, tz1]], side, 0);
      quad([[tx0, y, tz0], [tx0, y, tz1], [tx0, ty1, tz1], [tx0, ty1, tz0]], side, 1);
      const fu0 = u0 + 7 * du, fu1 = u0 + 9 * du, fv0 = v0 + 10 * dv, fv1 = v0 + 12 * dv;
      quad([[tx0, ty1, tz1], [tx1, ty1, tz1], [tx1, ty1, tz0], [tx0, ty1, tz0]], [[fu0, fv0], [fu1, fv0], [fu1, fv1], [fu0, fv1]], 2);
      continue;
    }
    const liquid = b.liquid, buf = id === B.WATER ? W : id === B.LAVA ? Lv : S;
    const top = b.hgt < 1 ? b.hgt : 1;
    const meta = b.orient ? (world.meta.get((y * WZ + z) * WX + x) || 0) : 0;
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2], nb = get(nx, ny, nz);
      if (liquid) { if (nb === id || OPQ[nb]) continue; if (f === 3 && nb !== B.AIR) continue; }
      else { if (OPQ[nb] && !(f === 2 && top < 1)) continue; if (nb === id && !b.leaf && b.shape !== 'slab') continue; }
      const liqTop = liquid && get(x, y + 1, z) !== id;
      const ti = liquid ? 0 : blockTile(id, f, meta);
      const [u0, v0, u1, v1] = liquid ? [0, 0, 1, 1] : tileUV(ti);
      const ax = F.n[0] ? 0 : F.n[1] ? 1 : 2, t1 = (ax + 1) % 3, t2 = (ax + 2) % 3;
      const ao = [3, 3, 3, 3], sk = [0, 0, 0, 0], bk = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const v = F.v[k], d1 = v[t1] ? 1 : -1, d2 = v[t2] ? 1 : -1;
        o1[0] = o1[1] = o1[2] = 0; o2[0] = o2[1] = o2[2] = 0; o1[t1] = d1; o2[t2] = d2;
        const ax1 = nx + o1[0], ay1 = ny + o1[1], az1 = nz + o1[2], ax2 = nx + o2[0], ay2 = ny + o2[1], az2 = nz + o2[2], cx3 = nx + o1[0] + o2[0], cy3 = ny + o1[1] + o2[1], cz3 = nz + o1[2] + o2[2];
        const s1 = OPQ[get(ax1, ay1, az1)], s2 = OPQ[get(ax2, ay2, az2)], c = OPQ[get(cx3, cy3, cz3)];
        if (!liquid) ao[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
        // плавное освещение: среднее по прозрачным соседям
        let ss = lsky(nx, ny, nz), bb = lblk(nx, ny, nz), cnt = 1;
        if (OPQ[get(nx, ny, nz)]) { ss = lsky(x, y, z); bb = lblk(x, y, z); }
        if (!s1) { ss += lsky(ax1, ay1, az1); bb += lblk(ax1, ay1, az1); cnt++; }
        if (!s2) { ss += lsky(ax2, ay2, az2); bb += lblk(ax2, ay2, az2); cnt++; }
        if (!c && !(s1 && s2)) { ss += lsky(cx3, cy3, cz3); bb += lblk(cx3, cy3, cz3); cnt++; }
        sk[k] = ss / cnt / 15; bk[k] = bb / cnt / 15;
      }
      const base = buf.p.length / 3, em = b.light >= 13 && !liquid ? 1 : 0;
      for (let k = 0; k < 4; k++) {
        const v = F.v[k]; let vy = v[1] ? top : 0; if (liquid && v[1] && liqTop) vy = 0.88;
        const uu = liquid ? (f === 2 || f === 3 ? x + v[0] : f < 2 ? z + v[2] : x + v[0]) : (UVC[k][0] ? u1 : u0);
        const vv = liquid ? (f === 2 || f === 3 ? z + v[2] : y + vy) : (f < 2 || f > 3) && top < 1 ? v0 + (v1 - v0) * (v[1] ? top : 0) : (UVC[k][1] ? v1 : v0);
        buf.vert(x + v[0], y + vy, z + v[2], uu, vv, AO_L[ao[k]], sk[k], bk[k], em || id === B.LAVA, f, b.sway ? 35 : 0);
      }
      if (ao[0] + ao[2] < ao[1] + ao[3]) buf.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      else buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return { solid: S.geometry(), water: W.geometry(), lava: Lv.geometry() };
}

// ---------- Физика: AABB против блоков (с полублоками и шагом 0.6) ----------
function boxH(id) { return SOLID[id] ? BL[id].hgt : 0; }
function solidVox(x, y, z) { if (x < 0 || z < 0 || x >= WX || z >= WZ) return 1; return boxH(G.world.get(x, y, z)); }
function moveAxis(e, ax, amt) {
  if (!amt) return false;
  e.pos[ax] += amt;
  const w = e.w, h = e.h, E = 1e-7;
  const x0 = Math.floor(e.pos.x - w), x1 = Math.floor(e.pos.x + w - E), y0 = Math.floor(e.pos.y - 0.5), y1 = Math.floor(e.pos.y + h - E), z0 = Math.floor(e.pos.z - w), z1 = Math.floor(e.pos.z + w - E);
  let hit = false, best = amt > 0 ? Infinity : -Infinity;
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const hb = solidVox(x, y, z); if (!hb) continue;
    const top = y + hb; if (e.pos.y + h <= y + E || e.pos.y >= top - E) continue;
    hit = true;
    if (ax === 'y') best = amt < 0 ? Math.max(best, top) : Math.min(best, y - h - 1e-4);
    else if (ax === 'x') best = amt > 0 ? Math.min(best, x - w - 1e-4) : Math.max(best, x + 1 + w + 1e-4);
    else best = amt > 0 ? Math.min(best, z - w - 1e-4) : Math.max(best, z + 1 + w + 1e-4);
  }
  if (!hit) return false;
  e.pos[ax] = best; e.vel[ax] = 0; if (ax === 'y' && amt < 0) e.onGround = true;
  return true;
}
function groundUnder(e) { const y = Math.floor(e.pos.y - 0.05); for (const dx of [-e.w, e.w]) for (const dz of [-e.w, e.w]) if (solidVox(Math.floor(e.pos.x + dx), y, Math.floor(e.pos.z + dz))) return true; return false; }
function moveEntity(e, dt, edgeGuard) {
  const dx = e.vel.x * dt, dy = e.vel.y * dt, dz = e.vel.z * dt;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.3));
  let hx = false, hz = false; const wasGround = e.onGround; e.onGround = false;
  for (let i = 0; i < n; i++) {
    moveAxis(e, 'y', dy / n);
    for (const ax of ['x', 'z']) {
      const o = e.pos[ax], amt = (ax === 'x' ? dx : dz) / n, oy = e.pos.y;
      if (!amt) continue;
      if (moveAxis(e, ax, amt)) {
        // шаг вверх до 0.6 блока (на пашню, кровать)
        if (wasGround || e.onGround) {
          e.pos[ax] = o; e.pos.y = oy + 0.6;
          const blocked = moveAxis(e, ax, amt);
          if (!blocked && !boxOverlap(e)) { e.pos.y = oy + 0.6; const vy = e.vel.y; moveAxis(e, 'y', -0.6); e.vel.y = vy > 0 ? vy : 0; e.onGround = true; continue; }
          e.pos[ax] = o; e.pos.y = oy; moveAxis(e, ax, amt);
        }
        if (ax === 'x') hx = true; else hz = true;
      }
      if (edgeGuard && (wasGround || e.onGround) && !groundUnder(e)) { e.pos[ax] = o; e.vel[ax] = 0; }
    }
  }
  if (!e.onGround && e.vel.y <= 0) { const y = Math.floor(e.pos.y - 0.02); for (const ddx of [-e.w + .01, e.w - .01]) for (const ddz of [-e.w + .01, e.w - .01]) { const hb = solidVox(Math.floor(e.pos.x + ddx), y, Math.floor(e.pos.z + ddz)); if (hb && Math.abs(e.pos.y - (y + hb)) < 0.02) e.onGround = true; } }
  return { hx, hz };
}
function boxOverlap(e) {
  const x0 = Math.floor(e.pos.x - e.w), x1 = Math.floor(e.pos.x + e.w - 1e-7), y0 = Math.floor(e.pos.y), y1 = Math.floor(e.pos.y + e.h - 1e-7), z0 = Math.floor(e.pos.z - e.w), z1 = Math.floor(e.pos.z + e.w - 1e-7);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const hb = solidVox(x, y, z); if (hb && e.pos.y < y + hb - 1e-6 && e.pos.y + e.h > y + 1e-6) return true; }
  return false;
}
function raycastBlocks(o, d, max, opts = {}) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
  let n = [0, 0, 0], t = 0;
  for (let i = 0; i < 256; i++) {
    const b = G.world.get(x, y, z);
    if (b && (!BL[b].liquid || opts.liquids)) return { x, y, z, b, n, t };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; n = [-sx, 0, 0]; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; n = [0, -sy, 0]; }
    else { z += sz; t = tz; tz += tdz; n = [0, 0, -sz]; }
    if (t > max) return null;
  }
  return null;
}
