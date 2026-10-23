// ===== ДелКрафт: ядро (шум, блоки, текстуры, мир, свет, меши, физика) =====
const G = {}; // общий контекст игры (мир, сцена, игрок, интерфейс)
const WX = 176, WZ = 176, WY = 72, CS = 16, SEA = 24;
const NCX = WX / CS, NCZ = WZ / CS, WXZ = WX * WZ, NVOX = WX * WY * WZ;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const IDX = (x, y, z) => (y * WZ + z) * WX + x;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// ---------- Simplex noise (Gustavson) ----------
function makeNoise(seed) {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = rand() * (i + 1) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
  const g = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6, F3 = 1 / 3, G3 = 1 / 6;
  function n2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255; let n = 0, tt, gi;
    tt = 0.5 - x0 * x0 - y0 * y0; if (tt > 0) { gi = pm12[ii + perm[jj]] * 3; tt *= tt; n += tt * tt * (g[gi] * x0 + g[gi + 1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1; if (tt > 0) { gi = pm12[ii + i1 + perm[jj + j1]] * 3; tt *= tt; n += tt * tt * (g[gi] * x1 + g[gi + 1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2; if (tt > 0) { gi = pm12[ii + 1 + perm[jj + 1]] * 3; tt *= tt; n += tt * tt * (g[gi] * x2 + g[gi + 1] * y2); }
    return 70 * n;
  }
  function n3(xin, yin, zin) {
    const s = (xin + yin + zin) * F3, i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s), t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
    else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3, x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3, x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const c = (tt, gi, x, y, z) => { if (tt < 0) return 0; tt *= tt; return tt * tt * (g[gi] * x + g[gi + 1] * y + g[gi + 2] * z); };
    return 32 * (c(0.6 - x0 * x0 - y0 * y0 - z0 * z0, pm12[ii + perm[jj + perm[kk]]] * 3, x0, y0, z0) + c(0.6 - x1 * x1 - y1 * y1 - z1 * z1, pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3, x1, y1, z1)
      + c(0.6 - x2 * x2 - y2 * y2 - z2 * z2, pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3, x2, y2, z2) + c(0.6 - x3 * x3 - y3 * y3 - z3 * z3, pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3, x3, y3, z3));
  }
  const fbm2 = (x, y, oct) => { let s = 0, a = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * n2(x * f, y * f); n += a; a *= 0.5; f *= 2; } return s / n; };
  return { n2, n3, fbm2 };
}

// ---------- Блоки ----------
const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, WATER: 6, LOG: 7, LEAVES: 8, PLANKS: 9, GLASS: 10, BRICK: 11, SNOW: 12, GOLD: 13, DIAMOND: 14, EMERALD: 15, BOOKS: 16, CHEST: 17, BIRCH: 18, BLEAVES: 19, GLOW: 20,
  WOOL_R: 21, WOOL_B: 22, WOOL_Y: 23, WOOL_W: 24, TGRASS: 25, ROSE: 26, DANDE: 27, BEDROCK: 28, COAL: 29, IRON: 30, GRAVEL: 31, SNOWB: 32, WOOL_G: 33, WOOL_P: 34, PUMPKIN: 35, MOSSY: 36,
  GOLD_ORE: 37, DIAMOND_ORE: 38, EMERALD_ORE: 39, CRAFT: 40, FURNACE: 41, FURNACE_ON: 42, STORAGE: 43, TORCH: 44, FARMLAND: 45, WHEAT0: 46, WHEAT7: 53, SAPLING: 54, BSAPLING: 55, CLAY: 56, LAVA: 57, TNT: 58, BED: 59, JACKO: 60, IRON_BLOCK: 61, STONEBRICK: 62 };
const BLOCK_TILES = ['grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand', 'water', 'log_side', 'log_top', 'leaves', 'planks', 'glass', 'brick', 'snow', 'snow_side', 'gold', 'diamond', 'emerald', 'books', 'qchest_top', 'qchest_side',
  'birch_side', 'birch_top', 'bleaves', 'glow', 'wool_r', 'wool_b', 'wool_y', 'wool_w', 'tgrass', 'rose', 'dande', 'bedrock', 'coal', 'iron', 'gravel', 'wool_g', 'wool_p', 'pumpkin_side', 'pumpkin_top', 'pumpkin_face', 'mossy',
  'gold_ore', 'diamond_ore', 'emerald_ore', 'craft_top', 'craft_side', 'craft_front', 'furnace_top', 'furnace_side', 'furnace_front', 'furnace_front_on', 'schest_top', 'schest_side', 'schest_front', 'torch', 'farmland',
  'wheat0', 'wheat1', 'wheat2', 'wheat3', 'wheat4', 'wheat5', 'wheat6', 'wheat7', 'sapling', 'bsapling', 'clay', 'lava', 'tnt_top', 'tnt_bottom', 'tnt_side', 'bed_top', 'bed_side', 'jacko_face', 'iron_block', 'stonebrick'];
const CRACK_TILES = Array.from({ length: 10 }, (_, i) => 'crack' + i);
const BL = [];
// t: [верх, низ, бок, перед]; op — непрозрачный; hard — твёрдость (как в Minecraft); tool — нужный инструмент; tier — уровень кирки для добычи
// light — свечение 0..15; shape: cube | cross | torch | slab; hgt — высота коллизии
const defB = (id, n, tiles, o = {}) => { const t = tiles.map(s => s); while (t.length < 4) t.push(t[t.length === 3 ? 2 : t.length - 1]); BL[id] = Object.assign({ id, n, tn: t, solid: 1, op: 1, cross: 0, liquid: 0, hard: 1, tool: null, tier: -1, light: 0, atten: 0, sway: 0, shape: 'cube', hgt: 1, col: '#888', orient: 0 }, o); };
defB(B.AIR, 'Воздух', ['dirt'], { solid: 0, op: 0, hard: 0 });
defB(B.GRASS, 'Трава', ['grass_top', 'dirt', 'grass_side'], { hard: 0.6, tool: 'shovel', col: '#5fae3a' });
defB(B.DIRT, 'Земля', ['dirt'], { hard: 0.5, tool: 'shovel', col: '#8b5a2b' });
defB(B.STONE, 'Камень', ['stone'], { hard: 1.5, tool: 'pick', tier: 0, col: '#8a8a8a' });
defB(B.COBBLE, 'Булыжник', ['cobble'], { hard: 2, tool: 'pick', tier: 0, col: '#7a7a7a' });
defB(B.SAND, 'Песок', ['sand'], { hard: 0.5, tool: 'shovel', col: '#e2d39a' });
defB(B.WATER, 'Вода', ['water'], { solid: 0, op: 0, liquid: 1, hard: 100, atten: 2, col: '#3f76e4' });
defB(B.LOG, 'Дубовое бревно', ['log_top', 'log_top', 'log_side'], { hard: 2, tool: 'axe', col: '#6b4a2b' });
defB(B.LEAVES, 'Листва', ['leaves'], { op: 0, hard: 0.2, sway: 1, atten: 1, col: '#3c8a2a', leaf: 1 });
defB(B.PLANKS, 'Доски', ['planks'], { hard: 2, tool: 'axe', col: '#b4874f' });
defB(B.GLASS, 'Стекло', ['glass'], { op: 0, hard: 0.3, col: '#cfe9f5' });
defB(B.BRICK, 'Кирпичи', ['brick'], { hard: 2, tool: 'pick', tier: 0, col: '#9c4a3a' });
defB(B.SNOW, 'Снежная трава', ['snow', 'dirt', 'snow_side'], { hard: 0.6, tool: 'shovel', col: '#f4f8fb' });
defB(B.GOLD, 'Золотой блок', ['gold'], { hard: 3, tool: 'pick', tier: 2, col: '#f2c53d' });
defB(B.DIAMOND, 'Алмазный блок', ['diamond'], { hard: 5, tool: 'pick', tier: 2, col: '#5fe0d6' });
defB(B.EMERALD, 'Изумрудный блок', ['emerald'], { hard: 5, tool: 'pick', tier: 2, col: '#3ddc6a' });
defB(B.BOOKS, 'Книжная полка', ['planks', 'planks', 'books'], { hard: 1.5, tool: 'axe', col: '#9a6a3a' });
defB(B.CHEST, 'Сундук-викторина', ['qchest_top', 'qchest_top', 'qchest_side'], { hard: -1, light: 9, col: '#c48a3a' });
defB(B.BIRCH, 'Берёзовое бревно', ['birch_top', 'birch_top', 'birch_side'], { hard: 2, tool: 'axe', col: '#e8e4d8' });
defB(B.BLEAVES, 'Листва берёзы', ['bleaves'], { op: 0, hard: 0.2, sway: 1, atten: 1, col: '#6bab3c', leaf: 1 });
defB(B.GLOW, 'Светокамень', ['glow'], { hard: 0.3, light: 15, col: '#f7d36b' });
defB(B.WOOL_R, 'Красная шерсть', ['wool_r'], { hard: 0.8, col: '#c8322c' });
defB(B.WOOL_B, 'Синяя шерсть', ['wool_b'], { hard: 0.8, col: '#3348c8' });
defB(B.WOOL_Y, 'Жёлтая шерсть', ['wool_y'], { hard: 0.8, col: '#f0c419' });
defB(B.WOOL_W, 'Белая шерсть', ['wool_w'], { hard: 0.8, col: '#ececec' });
defB(B.TGRASS, 'Высокая трава', ['tgrass'], { solid: 0, op: 0, cross: 1, hard: 0, sway: 1, shape: 'cross', col: '#5fae3a', replace: 1 });
defB(B.ROSE, 'Роза', ['rose'], { solid: 0, op: 0, cross: 1, hard: 0, sway: 0.7, shape: 'cross', col: '#d6302c' });
defB(B.DANDE, 'Одуванчик', ['dande'], { solid: 0, op: 0, cross: 1, hard: 0, sway: 0.7, shape: 'cross', col: '#f5d02a' });
defB(B.BEDROCK, 'Бедрок', ['bedrock'], { hard: -1, col: '#3a3a3a' });
defB(B.COAL, 'Угольная руда', ['coal'], { hard: 3, tool: 'pick', tier: 0, col: '#555' });
defB(B.IRON, 'Железная руда', ['iron'], { hard: 3, tool: 'pick', tier: 1, col: '#c9a184' });
defB(B.GRAVEL, 'Гравий', ['gravel'], { hard: 0.6, tool: 'shovel', col: '#857f7a' });
defB(B.SNOWB, 'Снег', ['snow'], { hard: 0.2, tool: 'shovel', col: '#f4f8fb' });
defB(B.WOOL_G, 'Зелёная шерсть', ['wool_g'], { hard: 0.8, col: '#4caf3a' });
defB(B.WOOL_P, 'Фиолетовая шерсть', ['wool_p'], { hard: 0.8, col: '#8e3ad0' });
defB(B.PUMPKIN, 'Тыква', ['pumpkin_top', 'pumpkin_top', 'pumpkin_side', 'pumpkin_face'], { hard: 1, tool: 'axe', col: '#e38a1d', orient: 1 });
defB(B.MOSSY, 'Замшелый булыжник', ['mossy'], { hard: 2, tool: 'pick', tier: 0, col: '#6f8a5a' });
defB(B.GOLD_ORE, 'Золотая руда', ['gold_ore'], { hard: 3, tool: 'pick', tier: 2, col: '#e8c65a' });
defB(B.DIAMOND_ORE, 'Алмазная руда', ['diamond_ore'], { hard: 3, tool: 'pick', tier: 2, col: '#6fe4dc' });
defB(B.EMERALD_ORE, 'Изумрудная руда', ['emerald_ore'], { hard: 3, tool: 'pick', tier: 2, col: '#3ddc6a' });
defB(B.CRAFT, 'Верстак', ['craft_top', 'planks', 'craft_side', 'craft_front'], { hard: 2.5, tool: 'axe', col: '#a8743f', orient: 1 });
defB(B.FURNACE, 'Печь', ['furnace_top', 'furnace_top', 'furnace_side', 'furnace_front'], { hard: 3.5, tool: 'pick', tier: 0, col: '#6f6f6f', orient: 1 });
defB(B.FURNACE_ON, 'Горящая печь', ['furnace_top', 'furnace_top', 'furnace_side', 'furnace_front_on'], { hard: 3.5, tool: 'pick', tier: 0, light: 13, col: '#6f6f6f', orient: 1 });
defB(B.STORAGE, 'Сундук', ['schest_top', 'schest_top', 'schest_side', 'schest_front'], { hard: 2.5, tool: 'axe', col: '#a5702f', orient: 1 });
defB(B.TORCH, 'Факел', ['torch'], { solid: 0, op: 0, hard: 0, light: 14, shape: 'torch', col: '#ffcc55' });
defB(B.FARMLAND, 'Пашня', ['farmland', 'dirt', 'dirt'], { hard: 0.6, tool: 'shovel', hgt: 15 / 16, shape: 'slab', col: '#5a3a1e' });
for (let s = 0; s < 8; s++) defB(B.WHEAT0 + s, 'Пшеница', ['wheat' + s], { solid: 0, op: 0, cross: 1, hard: 0, sway: 0.6, shape: 'cross', col: s < 7 ? '#5fae3a' : '#d9b84a', crop: s });
defB(B.SAPLING, 'Саженец дуба', ['sapling'], { solid: 0, op: 0, cross: 1, hard: 0, sway: 0.5, shape: 'cross', col: '#4c8a2a' });
defB(B.BSAPLING, 'Саженец берёзы', ['bsapling'], { solid: 0, op: 0, cross: 1, hard: 0, sway: 0.5, shape: 'cross', col: '#7ab04a' });
defB(B.CLAY, 'Глина', ['clay'], { hard: 0.6, tool: 'shovel', col: '#9aa3b4' });
defB(B.LAVA, 'Лава', ['lava'], { solid: 0, op: 0, liquid: 1, hard: 100, light: 15, atten: 2, col: '#ff7a1a' });
defB(B.TNT, 'Динамит', ['tnt_top', 'tnt_bottom', 'tnt_side'], { hard: 0, col: '#d8402c' });
defB(B.BED, 'Кровать', ['bed_top', 'planks', 'bed_side'], { hard: 0.2, hgt: 9 / 16, shape: 'slab', op: 0, col: '#c8322c', orient: 1 });
defB(B.JACKO, 'Светильник Джека', ['pumpkin_top', 'pumpkin_top', 'pumpkin_side', 'jacko_face'], { hard: 1, tool: 'axe', light: 15, col: '#ffb020', orient: 1 });
defB(B.IRON_BLOCK, 'Железный блок', ['iron_block'], { hard: 5, tool: 'pick', tier: 1, col: '#d8d8d8' });
defB(B.STONEBRICK, 'Каменные кирпичи', ['stonebrick'], { hard: 1.5, tool: 'pick', tier: 0, col: '#7d7d7d' });
// таблицы для быстрого доступа в горячих циклах
const OPQ = new Uint8Array(256), ATT = new Uint8Array(256), EMIT = new Uint8Array(256), SOLID = new Uint8Array(256);
BL.forEach((b, i) => { if (!b) return; OPQ[i] = b.op; ATT[i] = b.atten; EMIT[i] = b.light; SOLID[i] = b.solid; });

// ---------- Пиксель-арт 16×16 для иконок предметов (блоки рисуются в game_tex) ----------
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function vary(hex, f) { const [r, g, b] = hexToRgb(hex); const k = 1 + f; return `rgb(${clamp(r * k | 0, 0, 255)},${clamp(g * k | 0, 0, 255)},${clamp(b * k | 0, 0, 255)})`; }
function painter(g, ox, oy, R) {
  const P = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x > 15 || y > 15 || !c) return; g.globalAlpha = a; g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); g.globalAlpha = 1; };
  const clear = () => g.clearRect(ox, oy, 16, 16);
  const noise = (base, amp) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(x, y, vary(base, (R() - 0.5) * amp)); };
  const specks = (col, n) => { for (let i = 0; i < n; i++) P(R() * 16, R() * 16, col); };
  const rect = (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) P(xx, yy, typeof c === 'function' ? c(xx, yy) : c); };
  const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) P(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), typeof c === 'function' ? c(i, n) : c); };
  const voronoi = (cols, n, edge) => {
    const pts = Array.from({ length: n }, () => [R() * 16, R() * 16, cols[R() * cols.length | 0]]);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let d1 = 1e9, d2 = 1e9, c = cols[0];
      for (const [px, py, pc] of pts) for (let a = -16; a <= 16; a += 16) for (let b = -16; b <= 16; b += 16) { const d = Math.hypot(x + .5 - px - a, y + .5 - py - b); if (d < d1) { d2 = d1; d1 = d; c = pc; } else if (d < d2) d2 = d; }
      P(x, y, d2 - d1 < edge ? vary(c, -0.38) : vary(c, (R() - .5) * .14 + (d1 < 2 ? .1 : 0)));
    }
  };
  // автоматический контур для иконок предметов
  const outline = (dark = 0.55) => {
    const img = g.getImageData(ox, oy, 16, 16), d = img.data, out = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (d[(y * 16 + x) * 4 + 3] > 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx > 15 || yy > 15) continue; const j = (yy * 16 + xx) * 4; if (d[j + 3] > 200) { out.push([x, y, `rgb(${d[j] * (1 - dark) | 0},${d[j + 1] * (1 - dark) | 0},${d[j + 2] * (1 - dark) | 0})`]); break; } }
    }
    out.forEach(([x, y, c]) => P(x, y, c));
  };
  return { P, clear, noise, specks, rect, line, voronoi, outline };
}
