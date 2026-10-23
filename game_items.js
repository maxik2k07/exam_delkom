// ===== ДелКрафт: предметы, рецепты, печь, дроп, инвентарь =====
const I = {}; const IT = [];
let _nid = 256;
const defI = (key, n, tile, o = {}) => { const id = _nid++; I[key] = id; IT[id] = Object.assign({ id, n, tile, stack: 64, col: '#888' }, o); return id; };
defI('STICK', 'Палка', 'i_stick', { fuel: 5, col: '#8a6438' });
defI('COAL', 'Уголь', 'i_coal', { fuel: 80, col: '#2a2a2a' });
defI('IRON_INGOT', 'Железный слиток', 'i_iron_ingot', { col: '#dddddd' });
defI('GOLD_INGOT', 'Золотой слиток', 'i_gold_ingot', { col: '#f2c53d' });
defI('DIAMOND', 'Алмаз', 'i_diamond', { col: '#5fe0d6' });
defI('EMERALD', 'Изумруд', 'i_emerald', { col: '#3ddc6a' });
defI('FLINT', 'Кремень', 'i_flint', { col: '#4a4a4a' });
defI('STRING', 'Нить', 'i_string', { col: '#eeeeee' });
defI('FEATHER', 'Перо', 'i_feather', { col: '#ffffff' });
defI('GUNPOWDER', 'Порох', 'i_gunpowder', { col: '#6a6a6a' });
defI('BONE', 'Кость', 'i_bone', { col: '#eeeeee' });
defI('ARROW', 'Стрела', 'i_arrow', { col: '#aaaaaa' });
defI('BOW', 'Лук', 'i_bow', { stack: 1, dur: 384, col: '#8a6438', bow: 1, fuel: 15 });
defI('LEATHER', 'Кожа', 'i_leather', { col: '#8a5a32' });
defI('CLAY_BALL', 'Комок глины', 'i_clay', { col: '#9aa3b4' });
defI('BRICK', 'Кирпич', 'i_brick', { col: '#a8503a' });
defI('WHEAT', 'Пшеница', 'i_wheat', { col: '#d9b84a' });
defI('SEEDS', 'Семена пшеницы', 'i_seeds', { col: '#5fae3a', plant: B.WHEAT0 });
defI('APPLE', 'Яблоко', 'i_apple', { food: [4, 2.4], col: '#d6302c' });
defI('GOLDEN_APPLE', 'Золотое яблоко', 'i_golden_apple', { food: [4, 9.6], regen: 1, always: 1, col: '#f2c53d' });
defI('BREAD', 'Хлеб', 'i_bread', { food: [5, 6], col: '#c4893a' });
defI('PORK_RAW', 'Сырая свинина', 'i_pork_raw', { food: [3, 1.8], col: '#f08a8a' });
defI('PORK', 'Жареная свинина', 'i_pork', { food: [8, 12.8], col: '#c47a4a' });
defI('BEEF_RAW', 'Сырая говядина', 'i_beef_raw', { food: [3, 1.8], col: '#c8322c' });
defI('STEAK', 'Стейк', 'i_steak', { food: [8, 12.8], col: '#8a4a2a' });
defI('MUTTON_RAW', 'Сырая баранина', 'i_mutton_raw', { food: [2, 1.2], col: '#d64a4a' });
defI('MUTTON', 'Жареная баранина', 'i_mutton', { food: [6, 9.6], col: '#a85a3a' });
defI('CHICKEN_RAW', 'Сырая курица', 'i_chicken_raw', { food: [2, 1.2], col: '#f2c0b0' });
defI('CHICKEN', 'Жареная курица', 'i_chicken', { food: [6, 7.2], col: '#d08a4a' });
defI('ROTTEN', 'Гнилая плоть', 'i_rotten', { food: [4, 0.8], col: '#7a6a3a' });
defI('FLINT_STEEL', 'Огниво', 'i_flint_steel', { stack: 1, dur: 64, col: '#aaaaaa' });
// инструменты: 5 материалов × 5 типов
const MATS = [
  { k: 'WOOD', names: ['Деревянный', 'Деревянная'], col: '#a07a45', dark: '#5e4126', light: '#c79a5e', tier: 0, speed: 2, dur: 60, dmg: 0, mat: B.PLANKS },
  { k: 'STONE', names: ['Каменный', 'Каменная'], col: '#8c8c8c', dark: '#555555', light: '#b0b0b0', tier: 1, speed: 4, dur: 132, dmg: 1, mat: B.COBBLE },
  { k: 'IRON', names: ['Железный', 'Железная'], col: '#e2e2e2', dark: '#8f8f8f', light: '#ffffff', tier: 2, speed: 6, dur: 251, dmg: 2, mat: null },
  { k: 'GOLD', names: ['Золотой', 'Золотая'], col: '#f7d34a', dark: '#b8860b', light: '#fff2a0', tier: 0, speed: 12, dur: 33, dmg: 0, mat: null },
  { k: 'DIAMOND', names: ['Алмазный', 'Алмазная'], col: '#6ff2e8', dark: '#1a9c90', light: '#d8fffb', tier: 3, speed: 8, dur: 1562, dmg: 3, mat: null }
];
const TOOLS = [
  { k: 'SWORD', n: 'меч', g: 0, type: 'sword', dmg: 4, cd: 0.625 }, { k: 'PICK', n: 'кирка', g: 1, type: 'pick', dmg: 2, cd: 0.85 },
  { k: 'AXE', n: 'топор', g: 0, type: 'axe', dmg: 6, cd: 1.0 }, { k: 'SHOVEL', n: 'лопата', g: 1, type: 'shovel', dmg: 2.5, cd: 1.0 }, { k: 'HOE', n: 'мотыга', g: 1, type: 'hoe', dmg: 1, cd: 0.5 }
];
MATS.forEach((m, mi) => TOOLS.forEach(t => defI(t.k + '_' + m.k, m.names[t.g] + ' ' + t.n, 'i_' + t.k.toLowerCase() + '_' + m.k.toLowerCase(),
  { stack: 1, dur: m.dur, col: m.col, tool: { type: t.type, tier: m.tier, speed: m.speed, mi }, dmg: t.type === 'hoe' ? 1 : t.dmg + m.dmg, cd: t.cd, fuel: mi === 0 ? 10 : 0 })));
MATS[2].mat = I.IRON_INGOT; MATS[3].mat = I.GOLD_INGOT; MATS[4].mat = I.DIAMOND;
const AMATS = [
  { k: 'LEATHER', names: ['Кожаный', 'Кожаные'], col: '#8a5a32', dark: '#5a3a1e', light: '#b07a4a', pts: [1, 3, 2, 1], dur: 55, mat: I.LEATHER },
  { k: 'IRON', names: ['Железный', 'Железные'], col: '#d8d8d8', dark: '#8a8a8a', light: '#ffffff', pts: [2, 6, 5, 2], dur: 165, mat: I.IRON_INGOT },
  { k: 'GOLD', names: ['Золотой', 'Золотые'], col: '#f2c53d', dark: '#b8860b', light: '#fff2a0', pts: [2, 5, 3, 1], dur: 77, mat: I.GOLD_INGOT },
  { k: 'DIAMOND', names: ['Алмазный', 'Алмазные'], col: '#5fe0d6', dark: '#1a9c90', light: '#d8fffb', pts: [3, 8, 6, 3], dur: 363, mat: I.DIAMOND }
];
const ASLOTS = [{ k: 'HELMET', n: 'шлем', g: 0 }, { k: 'CHEST', n: 'нагрудник', g: 0 }, { k: 'LEGS', n: 'поножи', g: 1 }, { k: 'BOOTS', n: 'ботинки', g: 1 }];
AMATS.forEach((m, mi) => ASLOTS.forEach((s, si) => defI(s.k + '_' + m.k, m.names[s.g] + ' ' + s.n, 'i_a' + si + '_' + m.k.toLowerCase(), { stack: 1, dur: m.dur * (si === 1 ? 1.45 : si === 2 ? 1.36 : si === 0 ? 1 : 1.18) | 0, col: m.col, armor: { slot: si, pts: m.pts[si], mi } })));
const tool = (type, mat) => I[type + '_' + mat];

// ---------- общие свойства ----------
const isBlock = id => id > 0 && id < 256;
const idef = id => isBlock(id) ? BL[id] : IT[id];
const iname = id => idef(id) ? idef(id).n : '?';
const stackMax = id => isBlock(id) ? 64 : (IT[id] ? IT[id].stack : 64);
const BLOCK_FUEL = { [B.PLANKS]: 15, [B.LOG]: 15, [B.BIRCH]: 15, [B.CRAFT]: 15, [B.STORAGE]: 15, [B.BOOKS]: 15, [B.SAPLING]: 5, [B.BSAPLING]: 5 };
const fuelOf = id => isBlock(id) ? (BLOCK_FUEL[id] || 0) : (IT[id].fuel || 0);
const SMELT = { [B.IRON]: I.IRON_INGOT, [B.GOLD_ORE]: I.GOLD_INGOT, [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE, [I.CLAY_BALL]: I.BRICK, [I.PORK_RAW]: I.PORK, [I.BEEF_RAW]: I.STEAK,
  [I.MUTTON_RAW]: I.MUTTON, [I.CHICKEN_RAW]: I.CHICKEN, [B.LOG]: I.COAL, [B.BIRCH]: I.COAL, [B.DIAMOND_ORE]: I.DIAMOND, [B.EMERALD_ORE]: I.EMERALD, [B.COAL]: I.COAL, [B.STONE]: B.STONEBRICK };
// блок, который ставит предмет (для блоков — сам блок)
const placesBlock = id => isBlock(id) ? id : (IT[id] && IT[id].plant) || 0;

// ---------- рецепты ----------
const RECIPES = [];
const shaped = (out, n, p, k, cat) => { const h = p.length, w = Math.max(...p.map(r => r.length)); const ids = []; for (const r of p) for (let c = 0; c < w; c++) { const ch = r[c] || ' '; ids.push(ch === ' ' ? 0 : k[ch]); } RECIPES.push({ out, n, w, h, ids, cat }); };
const shapeless = (out, n, items, cat) => RECIPES.push({ out, n, items: items.slice().sort((a, b) => a - b), cat, sl: 1 });
shapeless(B.PLANKS, 4, [B.LOG], 'Основы'); shapeless(B.PLANKS, 4, [B.BIRCH], 'Основы');
shaped(I.STICK, 4, ['P', 'P'], { P: B.PLANKS }, 'Основы');
shaped(B.CRAFT, 1, ['PP', 'PP'], { P: B.PLANKS }, 'Основы');
shaped(B.TORCH, 4, ['C', 'S'], { C: I.COAL, S: I.STICK }, 'Основы');
shaped(B.FURNACE, 1, ['CCC', 'C C', 'CCC'], { C: B.COBBLE }, 'Основы');
shaped(B.STORAGE, 1, ['PPP', 'P P', 'PPP'], { P: B.PLANKS }, 'Основы');
shaped(B.BED, 1, ['WWW', 'PPP'], { W: B.WOOL_W, P: B.PLANKS }, 'Основы');
MATS.forEach(m => {
  const M = m.mat, S = I.STICK;
  shaped(tool('PICK', m.k), 1, ['MMM', ' S ', ' S '], { M, S }, 'Инструменты');
  shaped(tool('AXE', m.k), 1, ['MM', 'MS', ' S'], { M, S }, 'Инструменты');
  shaped(tool('SHOVEL', m.k), 1, ['M', 'S', 'S'], { M, S }, 'Инструменты');
  shaped(tool('HOE', m.k), 1, ['MM', ' S', ' S'], { M, S }, 'Инструменты');
  shaped(tool('SWORD', m.k), 1, ['M', 'M', 'S'], { M, S }, 'Оружие');
});
shaped(I.BOW, 1, [' TS', 'T S', ' TS'], { T: I.STICK, S: I.STRING }, 'Оружие');
shaped(I.ARROW, 4, ['F', 'S', 'E'], { F: I.FLINT, S: I.STICK, E: I.FEATHER }, 'Оружие');
AMATS.forEach(m => {
  const M = m.mat;
  shaped(I['HELMET_' + m.k], 1, ['MMM', 'M M'], { M }, 'Броня');
  shaped(I['CHEST_' + m.k], 1, ['M M', 'MMM', 'MMM'], { M }, 'Броня');
  shaped(I['LEGS_' + m.k], 1, ['MMM', 'M M', 'M M'], { M }, 'Броня');
  shaped(I['BOOTS_' + m.k], 1, ['M M', 'M M'], { M }, 'Броня');
});
shaped(I.BREAD, 1, ['WWW'], { W: I.WHEAT }, 'Еда');
shaped(I.GOLDEN_APPLE, 1, ['GGG', 'GAG', 'GGG'], { G: I.GOLD_INGOT, A: I.APPLE }, 'Еда');
shaped(B.TNT, 1, ['GSG', 'SGS', 'GSG'], { G: I.GUNPOWDER, S: B.SAND }, 'Разное');
shapeless(I.FLINT_STEEL, 1, [I.IRON_INGOT, I.FLINT], 'Разное');
shaped(B.JACKO, 1, ['P', 'T'], { P: B.PUMPKIN, T: B.TORCH }, 'Разное');
shaped(B.BRICK, 1, ['BB', 'BB'], { B: I.BRICK }, 'Строительство');
shaped(B.STONEBRICK, 4, ['SS', 'SS'], { S: B.STONE }, 'Строительство');
shaped(B.SNOWB, 1, ['SS', 'SS'], { S: B.SNOWB }, 'Строительство');
shapeless(B.WOOL_R, 1, [B.WOOL_W, B.ROSE], 'Строительство'); shapeless(B.WOOL_Y, 1, [B.WOOL_W, B.DANDE], 'Строительство');
shapeless(B.WOOL_G, 1, [B.WOOL_W, B.TGRASS], 'Строительство'); shapeless(B.WOOL_B, 1, [B.WOOL_W, I.EMERALD], 'Строительство');
for (const [blk, it] of [[B.IRON_BLOCK, I.IRON_INGOT], [B.GOLD, I.GOLD_INGOT], [B.DIAMOND, I.DIAMOND], [B.EMERALD, I.EMERALD]]) { shaped(blk, 1, ['XXX', 'XXX', 'XXX'], { X: it }, 'Строительство'); shapeless(it, 9, [blk], 'Строительство'); }
function matchRecipe(grid, w) {
  let r0 = 9, r1 = -1, c0 = 9, c1 = -1; const list = [];
  for (let r = 0; r < w; r++) for (let c = 0; c < w; c++) { const s = grid[r * w + c]; if (s) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); list.push(s.id); } }
  if (!list.length) return null;
  const h = r1 - r0 + 1, ww = c1 - c0 + 1, ids = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const s = grid[r * w + c]; ids.push(s ? s.id : 0); }
  const sorted = list.slice().sort((a, b) => a - b);
  for (const rec of RECIPES) {
    if (rec.sl) { if (rec.items.length === sorted.length && rec.items.every((v, i) => v === sorted[i])) return rec; continue; }
    if (rec.w !== ww || rec.h !== h) continue;
    let ok = true; for (let i = 0; i < ids.length; i++) if (ids[i] !== rec.ids[i]) { ok = false; break; }
    if (ok) return rec;
    ok = true; for (let r = 0; r < h && ok; r++) for (let c = 0; c < ww; c++) if (ids[r * ww + c] !== rec.ids[r * ww + (ww - 1 - c)]) { ok = false; break; }
    if (ok) return rec;
  }
  return null;
}
const recipeNeeds = rec => { const m = new Map(); (rec.sl ? rec.items : rec.ids).forEach(id => { if (id) m.set(id, (m.get(id) || 0) + 1); }); return m; };

// ---------- инвентарь ----------
const mk = (id, n = 1, d = 0) => ({ id, n, d });
function invAdd(slots, id, n, d = 0, from = 0, to = slots.length) {
  const max = stackMax(id);
  if (max > 1) for (let i = from; i < to && n > 0; i++) { const s = slots[i]; if (s && s.id === id && s.n < max) { const k = Math.min(n, max - s.n); s.n += k; n -= k; } }
  for (let i = from; i < to && n > 0; i++) if (!slots[i]) { const k = Math.min(n, max); slots[i] = mk(id, k, d); n -= k; }
  return n;
}
const invCount = (slots, id) => slots.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
function invRemove(slots, id, n) { for (let i = slots.length - 1; i >= 0 && n > 0; i--) { const s = slots[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) slots[i] = null; } } return n; }

// ---------- добыча ----------
function breakTime(id, held) {
  const b = BL[id]; if (b.hard < 0) return Infinity; if (b.hard === 0) return 0;
  const t = held && IT[held.id] && IT[held.id].tool;
  let speed = 1;
  if (t && b.tool && t.type === b.tool) speed = t.speed;
  if (t && t.type === 'sword' && (b.leaf || b.cross)) speed = 1.5;
  if (t && t.type === 'hoe' && b.leaf) speed = t.speed;
  return b.hard * (canHarvest(id, held) ? 1.5 : 5) / speed;
}
function canHarvest(id, held) { const b = BL[id]; if (b.tier < 0) return true; const t = held && IT[held.id] && IT[held.id].tool; return !!(t && t.type === 'pick' && t.tier >= b.tier); }
function blockDrops(id, held) {
  if (!canHarvest(id, held)) return [];
  const R = Math.random;
  switch (id) {
    case B.GRASS: case B.SNOW: case B.FARMLAND: return [[B.DIRT, 1]];
    case B.STONE: return [[B.COBBLE, 1]];
    case B.COAL: return [[I.COAL, 1]];
    case B.DIAMOND_ORE: return [[I.DIAMOND, 1]];
    case B.EMERALD_ORE: return [[I.EMERALD, 1]];
    case B.GRAVEL: return R() < 0.12 ? [[I.FLINT, 1]] : [[B.GRAVEL, 1]];
    case B.CLAY: return [[I.CLAY_BALL, 4]];
    case B.GLASS: case B.CHEST: case B.BEDROCK: case B.WATER: case B.LAVA: return [];
    case B.LEAVES: { const d = []; if (R() < 0.06) d.push([B.SAPLING, 1]); if (R() < 0.02) d.push([I.APPLE, 1]); if (R() < 0.03) d.push([I.STICK, 1]); return d; }
    case B.BLEAVES: { const d = []; if (R() < 0.06) d.push([B.BSAPLING, 1]); if (R() < 0.03) d.push([I.STICK, 1]); return d; }
    case B.TGRASS: return R() < 0.14 ? [[I.SEEDS, 1]] : [];
    case B.FURNACE_ON: return [[B.FURNACE, 1]];
    case B.SNOWB: return [[B.SNOWB, 1]];
    default:
      if (BL[id].crop != null) return BL[id].crop === 7 ? [[I.WHEAT, 1], [I.SEEDS, rint(1, 3)]] : [[I.SEEDS, 1]];
      return [[id, 1]];
  }
}
const MOB_DROPS = { pig: [[I.PORK_RAW, 1, 3]], cow: [[I.BEEF_RAW, 1, 3], [I.LEATHER, 0, 2]], sheep: [[I.MUTTON_RAW, 1, 2], [B.WOOL_W, 1, 1]], chicken: [[I.CHICKEN_RAW, 1, 1], [I.FEATHER, 0, 2]],
  zombie: [[I.ROTTEN, 0, 2]], skeleton: [[I.BONE, 0, 2], [I.ARROW, 0, 2]], spider: [[I.STRING, 0, 2]], creeper: [[I.GUNPOWDER, 0, 2]] };
function quizLoot() {
  const T = [[I.DIAMOND, 1, 3, 0.7], [I.IRON_INGOT, 3, 6, 0.9], [I.GOLD_INGOT, 2, 4, 0.6], [I.EMERALD, 1, 2, 0.4], [I.BREAD, 2, 4, 0.8], [I.PORK, 2, 3, 0.5], [B.TORCH, 8, 16, 0.8],
    [I.APPLE, 2, 3, 0.5], [I.GOLDEN_APPLE, 1, 1, 0.22], [B.GLOW, 4, 6, 0.4], [B.BOOKS, 2, 3, 0.3], [I.SWORD_IRON, 1, 1, 0.18], [I.BOW, 1, 1, 0.15], [I.ARROW, 8, 16, 0.3], [I.PICK_DIAMOND, 1, 1, 0.06], [I.CHEST_IRON, 1, 1, 0.08], [B.MOSSY, 8, 12, 0.3]];
  let out = T.filter(t => Math.random() < t[3]).map(t => [t[0], rint(t[1], t[2])]);
  while (out.length < 3) { const t = T[Math.random() * T.length | 0]; out.push([t[0], rint(t[1], t[2])]); }
  return out;
}

// ---------- иконки предметов (пиксель-арт 16×16) ----------
function paintItemTile(name, g, ox, oy, R) {
  const { P, clear, rect, line, outline } = painter(g, ox, oy, R);
  clear();
  const ell = (cx, cy, rx, ry, c) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2; if (d <= 1) P(x, y, typeof c === 'function' ? c(x, y, d) : c); } };
  const stick = (x0, y0, x1, y1) => line(x0, y0, x1, y1, (i) => i % 3 === 1 ? '#5e4126' : '#a07a45');
  const tp = name.match(/^i_(sword|pick|axe|shovel|hoe)_(\w+)$/);
  if (tp) {
    const m = MATS.find(mm => mm.k.toLowerCase() === tp[2]), C = m.col, Dk = m.dark, L = m.light, t = tp[1];
    if (t === 'sword') { for (let k = 0; k <= 8; k++) { P(5 + k, 10 - k, k % 2 ? C : L); P(6 + k, 10 - k, Dk); P(5 + k, 9 - k, L); } P(14, 1, L); line(3, 8, 7, 12, '#4a3020'); stick(2, 13, 4, 11); P(1, 14, '#4a3020'); }
    else {
      stick(2, 14, t === 'shovel' ? 9 : 10, t === 'shovel' ? 7 : 6);
      if (t === 'pick') for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dx = x + .5 - 2.5, dy = y + .5 - 13.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI; if (r >= 10.2 && r <= 12.4 && a >= -84 && a <= -6) P(x, y, r > 11.6 ? L : (a < -78 || a > -12) ? Dk : C); }
      if (t === 'axe') { rect(8, 1, 4, 7, (x, y) => (x - 8) + (y - 1) < 1 ? null : x === 8 ? Dk : y === 1 ? L : C); rect(12, 2, 2, 5, (x, y) => y === 2 || y === 6 ? Dk : x === 13 ? L : C); }
      if (t === 'shovel') for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const u = (x + .5 - 11.5) + (y + .5 - 4.5), v = (x + .5 - 11.5) - (y + .5 - 4.5); if (Math.abs(u) <= 3.2 && Math.abs(v) <= 2.6) P(x, y, u < -1.8 ? L : u > 2 ? Dk : C); }
      if (t === 'hoe') { rect(7, 2, 5, 2, (x, y) => y === 2 ? L : C); P(11, 4, Dk); P(12, 3, Dk); P(12, 2, C); }
    }
    outline(0.6); return;
  }
  const ap = name.match(/^i_a(\d)_(\w+)$/);
  if (ap) {
    const m = AMATS.find(mm => mm.k.toLowerCase() === ap[2]), C = m.col, Dk = m.dark, L = m.light, s = +ap[1];
    const sh = (x, y, base) => (x + y) % 5 === 0 ? L : base;
    if (s === 0) rect(3, 3, 10, 8, (x, y) => (y >= 7 && x >= 5 && x <= 10) ? null : (y === 3 && (x < 5 || x > 10)) ? null : y === 3 || y === 4 ? L : x === 3 || x === 12 ? Dk : sh(x, y, C));
    if (s === 1) rect(2, 2, 12, 12, (x, y) => { if (y < 4 && x >= 6 && x <= 9) return null; if ((x < 4 || x > 11) && y > 8) return null; if ((x === 4 || x === 11) && y > 8 && y > 9) return null; return y === 2 ? L : (x === 2 || x === 13) ? Dk : sh(x, y, C); });
    if (s === 2) rect(3, 2, 10, 12, (x, y) => (y > 4 && x >= 7 && x <= 8) ? null : y <= 3 ? L : (x === 3 || x === 12) ? Dk : sh(x, y, C));
    if (s === 3) { rect(2, 8, 4, 5, (x, y) => y === 8 ? L : C); rect(1, 11, 2, 2, Dk); rect(10, 8, 4, 5, (x, y) => y === 8 ? L : C); rect(13, 11, 2, 2, Dk); }
    outline(0.6); return;
  }
  switch (name) {
    case 'i_stick': stick(3, 13, 12, 4); stick(4, 13, 13, 4); break;
    case 'i_coal': ell(8, 8.5, 5.5, 4.5, (x, y) => (x + y * 3) % 7 === 0 ? '#5a5a5a' : y < 7 ? '#3a3a3a' : '#1e1e1e'); break;
    case 'i_iron_ingot': case 'i_gold_ingot': case 'i_brick': { const [C, L, Dk] = name === 'i_iron_ingot' ? ['#d8d8d8', '#ffffff', '#8a8a8a'] : name === 'i_gold_ingot' ? ['#f2c53d', '#fff2a0', '#b8860b'] : ['#a8503a', '#d07a5a', '#6a2a1a']; rect(5, 5, 8, 2, L); rect(3, 7, 9, 4, C); rect(12, 6, 2, 4, Dk); rect(3, 11, 9, 1, Dk); break; }
    case 'i_diamond': { const rows = [[6, 9], [5, 10], [4, 11], [3, 12], [4, 11], [5, 10], [6, 9], [7, 8]]; rows.forEach(([a, b], k) => { for (let x = a; x <= b; x++) P(x, 3 + k, k < 2 ? '#d8fffb' : (x + k) % 3 === 0 ? '#9ff8f0' : k > 4 ? '#2aa89c' : '#5fe0d6'); }); break; }
    case 'i_emerald': for (let y = 2; y < 14; y++) { const w = y < 5 ? y - 1 : y > 10 ? 14 - y : 4; for (let x = 8 - w; x < 8 + w; x++) P(x, y, x < 8 ? '#7af59a' : y > 9 ? '#1f9c4a' : '#3ddc6a'); } break;
    case 'i_flint': for (let y = 3; y < 13; y++) for (let x = 4; x < 12; x++) if (x - 4 > (12 - y) / 2 - 1 && x < 12 - (y - 3) / 3) P(x, y, (x + y) % 4 === 0 ? '#7a7a7a' : '#3a3a3a'); break;
    case 'i_string': for (let i = 0; i < 12; i++) { P(2 + i, 12 - i + (i % 3 === 0 ? 1 : 0), '#f2f2f2'); } break;
    case 'i_feather': line(3, 13, 12, 2, '#9a9a9a'); for (let i = 0; i < 9; i++) { P(5 + i, 11 - i - 1, '#ffffff'); P(5 + i + 1, 11 - i, '#e8e8e8'); P(4 + i, 10 - i - 1, '#ffffff'); } break;
    case 'i_gunpowder': for (let i = 0; i < 40; i++) { const x = 3 + R() * 10 | 0, y = 7 + R() * 7 | 0; if (Math.abs(x - 8) < (y - 5) * 0.9) P(x, y, ['#5a5a5a', '#7a7a7a', '#3a3a3a'][i % 3]); } break;
    case 'i_bone': line(4, 12, 11, 5, '#eeeeee'); line(5, 12, 12, 5, '#cfcfcf'); [[3, 12], [4, 13], [3, 11], [11, 4], [12, 3], [13, 4]].forEach(([x, y]) => P(x, y, '#f5f5f5')); break;
    case 'i_arrow': line(3, 12, 12, 3, (i) => i % 2 ? '#8a6438' : '#a07a45'); [[12, 3], [13, 2], [12, 2], [13, 3], [11, 2], [13, 4]].forEach(([x, y]) => P(x, y, '#c8c8c8')); [[2, 13], [3, 13], [2, 12], [1, 14], [4, 13], [2, 11]].forEach(([x, y]) => P(x, y, '#f2f2f2')); break;
    case 'i_bow': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x + .5 - 2, y + .5 - 14), a = Math.atan2(y + .5 - 14, x + .5 - 2) * 180 / Math.PI; if (r > 10.4 && r < 12 && a > -86 && a < -4) P(x, y, (x + y) % 3 ? '#a07a45' : '#5e4126'); } line(3, 3, 13, 13, '#e8e8e8'); break;
    case 'i_leather': ell(8, 8.5, 5.5, 5, (x, y) => (x * 3 + y) % 5 === 0 ? '#a8784a' : '#8a5a32'); break;
    case 'i_clay': ell(8, 8.5, 4.5, 4, (x, y) => y < 7 ? '#b4bccb' : '#9aa3b4'); break;
    case 'i_wheat': for (const [x0, x1] of [[4, 9], [6, 10], [8, 11], [10, 12]]) { line(x0, 14, x1, 4, '#c8a23a'); P(x1, 3, '#e8c84a'); P(x1 - 1, 4, '#e8c84a'); } break;
    case 'i_seeds': [[5, 9], [8, 7], [10, 10], [6, 12], [11, 6], [9, 12]].forEach(([x, y]) => { P(x, y, '#5fae3a'); P(x + 1, y, '#3c8a2a'); P(x, y + 1, '#7a5a2a'); }); break;
    case 'i_apple': case 'i_golden_apple': { const [C, L, Dk] = name === 'i_apple' ? ['#d6302c', '#ff8a7a', '#8a1a1a'] : ['#f2c53d', '#fff2a0', '#b8860b']; ell(8, 9.5, 5, 4.6, (x, y) => (x === 5 && y === 7) || (x === 6 && y === 6) ? L : y > 11 ? Dk : C); rect(8, 3, 1, 3, '#5e4126'); P(9, 3, '#3c8a2a'); P(10, 2, '#3c8a2a'); P(10, 3, '#5fae3a'); break; }
    case 'i_bread': ell(8, 9.5, 6.5, 3.6, (x, y) => y < 8 ? '#e0a95a' : '#b8782e'); [[5, 7], [8, 7], [11, 7]].forEach(([x, y]) => { P(x, y, '#8a5a22'); P(x + 1, y + 1, '#8a5a22'); }); break;
    case 'i_pork_raw': case 'i_pork': { const raw = name === 'i_pork_raw', C = raw ? '#f08a8a' : '#c47a4a', F = raw ? '#ffe0e0' : '#e8b88a'; ell(8, 8.5, 6, 4.5, (x, y, d) => d > 0.6 ? F : (x + y) % 6 === 0 ? (raw ? '#d86a6a' : '#9a5a2a') : C); break; }
    case 'i_beef_raw': case 'i_steak': { const raw = name === 'i_beef_raw'; ell(8, 8.5, 5.8, 4.8, (x, y, d) => d > 0.7 ? (raw ? '#ffffff' : '#c49a6a') : (x * 2 + y) % 7 === 0 ? (raw ? '#ffd0d0' : '#5a2a12') : raw ? '#c8322c' : '#8a4a2a'); break; }
    case 'i_mutton_raw': case 'i_mutton': { const raw = name === 'i_mutton_raw'; ell(7, 9, 5, 4, raw ? '#d64a4a' : '#a85a3a'); rect(11, 4, 2, 4, '#f2f2f2'); P(13, 4, '#f2f2f2'); break; }
    case 'i_chicken_raw': case 'i_chicken': { const raw = name === 'i_chicken_raw'; ell(7, 9.5, 4.8, 4.2, (x, y) => y < 8 ? (raw ? '#ffd8cc' : '#e8a85a') : raw ? '#f2c0b0' : '#c47a3a'); line(11, 6, 13, 3, '#f2f2f2'); P(14, 3, '#f2f2f2'); P(13, 2, '#f2f2f2'); break; }
    case 'i_rotten': ell(8, 8.5, 5.5, 4.5, (x, y) => (x + y * 2) % 5 === 0 ? '#3a4a1a' : y > 9 ? '#5a4a2a' : '#7a6a3a'); break;
    case 'i_flint_steel': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x + .5 - 6, y + .5 - 7); if (r > 2.5 && r < 4.3 && !(x > 6 && y > 6 && y < 9)) P(x, y, '#c8c8c8'); } rect(9, 9, 4, 4, (x, y) => (x + y) % 2 ? '#3a3a3a' : '#5a5a5a'); break;
  }
  outline(0.6);
}
const atlasPixels = () => G.atlasPx || (G.atlasPx = G.atlasCanvas.getContext('2d').getImageData(0, 0, G.atlasSize, G.atlasSize).data);
// иконки для интерфейса (data URL 32×32)
const ICON = {};
function iconURL(id) {
  if (ICON[id]) return ICON[id];
  const atlas = G.atlasCanvas, S = 32, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const tile = i => [(i % 16) * TS, (i >> 4) * TS];
  if (isBlock(id) && BL[id].shape === 'cube' || isBlock(id) && BL[id].shape === 'slab') {
    const b = BL[id], h = S * 0.25, vh = S - 2 * h, top = TILE[b.tn[0]], side = TILE[b.orient ? b.tn[3] : b.tn[2]], side2 = TILE[b.tn[2]];
    const face = (ti, tf, shade) => { const [sx, sy] = tile(ti); g.save(); g.setTransform(...tf); g.imageSmoothingEnabled = TS > 32; g.imageSmoothingQuality = 'high'; g.drawImage(atlas, sx, sy, TS, TS, 0, 0, 16, 16); if (shade) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(0, 0, 16, 16); } g.restore(); };
    face(top, [S / 32, -h / 16, S / 32, h / 16, 0, h], 0); face(side, [S / 32, h / 16, 0, vh / 16, 0, h], 0.2); face(side2, [S / 32, -h / 16, 0, vh / 16, S / 2, 2 * h], 0.4);
  } else { const [sx, sy] = tile(isBlock(id) ? TILE[BL[id].tn[0]] : TILE[IT[id].tile]); g.drawImage(atlas, sx, sy, TS, TS, 0, 0, S, S); }
  return (ICON[id] = c.toDataURL());
}
// 3D-модель предмета: кубик для блоков, «выдавленный» спрайт для остального (как в Minecraft)
const ITEM_GEO = {};
function itemGeometry(id) {
  if (ITEM_GEO[id]) return ITEM_GEO[id];
  let g;
  if (isBlock(id) && (BL[id].shape === 'cube' || BL[id].shape === 'slab')) {
    g = new THREE.BoxGeometry(1, BL[id].shape === 'slab' ? BL[id].hgt : 1, 1);
    const b = BL[id], uv = g.attributes.uv, tiles = [TILE[b.tn[2]], TILE[b.tn[2]], TILE[b.tn[0]], TILE[b.tn[1]], TILE[b.orient ? b.tn[3] : b.tn[2]], TILE[b.tn[2]]];
    for (let f = 0; f < 6; f++) { const [u0, v0, u1, v1] = tileUV(tiles[f]); for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0); } }
  } else {
    const ti = isBlock(id) ? TILE[BL[id].tn[0]] : TILE[IT[id].tile], ox = (ti % 16) * TS, oy = (ti >> 4) * TS, K = TS / 16, AW = 16 * TS;
    const px = atlasPixels(), op = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && px[((oy + y * K + (K >> 1)) * AW + ox + x * K + (K >> 1)) * 4 + 3] > 128;
    const [u0, v0, u1, v1] = tileUV(ti), P = [], U = [], N = [], IX = [], t = 1 / 32;
    const quad = (pts, uvs, n) => { const b = P.length / 3; pts.forEach((p, k) => { P.push(...p); U.push(...uvs[k]); N.push(...n); }); IX.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    quad([[-.5, -.5, t], [.5, -.5, t], [.5, .5, t], [-.5, .5, t]], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], [0, 0, 1]);
    quad([[.5, -.5, -t], [-.5, -.5, -t], [-.5, .5, -t], [.5, .5, -t]], [[u1, v0], [u0, v0], [u0, v1], [u1, v1]], [0, 0, -1]);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!op(x, y)) continue;
      const X0 = x / 16 - .5, X1 = X0 + 1 / 16, Y1 = .5 - y / 16, Y0 = Y1 - 1 / 16, cu = u0 + (x + .5) / 16 * (u1 - u0), cvv = v1 - (y + .5) / 16 * (v1 - v0), c = [[cu, cvv], [cu, cvv], [cu, cvv], [cu, cvv]];
      if (!op(x - 1, y)) quad([[X0, Y0, -t], [X0, Y0, t], [X0, Y1, t], [X0, Y1, -t]], c, [-1, 0, 0]);
      if (!op(x + 1, y)) quad([[X1, Y0, t], [X1, Y0, -t], [X1, Y1, -t], [X1, Y1, t]], c, [1, 0, 0]);
      if (!op(x, y - 1)) quad([[X0, Y1, t], [X1, Y1, t], [X1, Y1, -t], [X0, Y1, -t]], c, [0, 1, 0]);
      if (!op(x, y + 1)) quad([[X0, Y0, -t], [X1, Y0, -t], [X1, Y0, t], [X0, Y0, t]], c, [0, -1, 0]);
    }
    g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(IX);
    g.userData.flat = 1;
  }
  return (ITEM_GEO[id] = g);
}
