// ===== ДелКрафт: скины, модель персонажа, гардероб =====
const PX = 1.8 / 32;
const CLOTH = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#546e7a', '#212121', '#f5f5f5', '#ff80ab', '#80deea', '#c6ff00', '#2e7d32', '#ffd180'];
const TONES = ['#f6d2b5', '#efc4a3', '#e0ac85', '#c98d63', '#ad7046', '#8d5636', '#6b3f26', '#4a2b1a', '#8fd16f', '#8fb3ff', '#c9c9c9', '#b48cff'];
const EYE_C = ['#3b6fd8', '#2f8a3a', '#6b4423', '#2b2b2b', '#7a52d8', '#3aa7b8', '#d8344f', '#f2c53d'];
const HAIR_C = ['#1c120c', '#3b2416', '#5e3a22', '#8a5a32', '#c08a4a', '#e3c27a', '#f3e2a6', '#a3381f', '#d9d9d9', '#ff5fa8', '#4dc3ff', '#8b5cff', '#3ad16a', '#ff8a1f'];
const COLOR_REQ = { tone: { 8: { lv: 6 }, 9: { lv: 9 }, 10: { lv: 12 }, 11: { lv: 15 } }, eyesC: { 6: { lv: 4 }, 7: { lv: 8 } }, hairC: { 9: { lv: 5 }, 10: { lv: 5 }, 11: { lv: 7 }, 12: { lv: 7 }, 13: { lv: 9 } } };
const it = (id, name, icon, req) => ({ id, name, icon, req });
const SLOTS = [
  { id: 'tone', name: 'Кожа', colorKey: 'tone', colors: TONES },
  { id: 'eyes', name: 'Глаза', key: 'eyes', colorKey: 'eyesC', colors: EYE_C, items: [it('normal', 'Обычные', '👀'), it('wide', 'Большие', '😳'), it('happy', 'Довольные', '😊'), it('sleepy', 'Сонные', '😪'), it('wink', 'Подмигивание', '😉', { lv: 2 }), it('angry', 'Сердитые', '😠', { lv: 3 }), it('star', 'Звёздные', '🤩', { ach: 'combo10' }), it('laser', 'Лазерные', '🔴', { ach: 'k300' })] },
  { id: 'hair', name: 'Причёска', key: 'hair', colorKey: 'hairC', colors: HAIR_C, items: [it('none', 'Лысый', '🥚'), it('buzz', 'Ёжик', '🦔'), it('short', 'Короткая', '💇'), it('side', 'На пробор', '💁'), it('curly', 'Кудри', '🌀'), it('bob', 'Каре', '👩'), it('long', 'Длинные', '👱‍♀️'), it('ponytail', 'Хвост', '🎀'), it('bun', 'Пучок', '🧅'), it('spiky', 'Шипы', '⚡', { lv: 2 }), it('pigtails', 'Хвостики', '🎎', { lv: 3 }), it('mohawk', 'Ирокез', '🤘', { lv: 4 }), it('afro', 'Афро', '☁️', { lv: 5 })] },
  { id: 'hat', name: 'Головной убор', key: 'hat', colorKey: 'hatC', colors: CLOTH, items: [it('none', 'Без шапки', '🚫'), it('cap', 'Кепка', '🧢'), it('beanie', 'Шапка', '🧶'), it('bandana', 'Бандана', '🏴‍☠️'), it('headphones', 'Наушники', '🎧', { lv: 2 }), it('flowers', 'Венок', '🌸', { lv: 3 }), it('tophat', 'Цилиндр', '🎩', { lv: 5 }), it('helmet', 'Шлем', '⛑️', { lv: 6 }), it('bunny', 'Ушки', '🐰', { lv: 7 }), it('viking', 'Викинг', '🛡️', { lv: 9 }), it('crown', 'Корона', '👑', { lv: 12 }), it('party', 'Колпак', '🥳', { ach: 'first' }), it('wizard', 'Шляпа мага', '🧙', { ach: 'reader' }), it('halo', 'Нимб', '😇', { ach: 'sniper' }), it('astro', 'Шлем космонавта', '👩‍🚀', { ach: 'k300' })] },
  { id: 'top', name: 'Верх', key: 'top', colorKey: 'topC', colors: CLOTH, color2Key: 'top2C', items: [it('tee', 'Футболка', '👕'), it('long', 'Лонгслив', '🥼'), it('polo', 'Поло', '🎽'), it('hoodie', 'Худи', '🧥'), it('shirt', 'Рубашка', '👔'), it('sweater', 'Свитер', '🧶'), it('tank', 'Майка', '🎽'), it('jersey', 'Джерси', '🏀', { lv: 2 }), it('dress', 'Платье', '👗', { lv: 2 }), it('suit', 'Костюм', '🤵', { lv: 3 }), it('labcoat', 'Халат', '🥼', { lv: 4 }), it('armor_iron', 'Железная броня', '🛡️', { lv: 6 }), it('robe', 'Мантия', '🪄', { lv: 8 }), it('armor_gold', 'Золотая броня', '🟨', { lv: 10 }), it('armor_diamond', 'Алмазная броня', '💎', { lv: 14 }), it('astro', 'Скафандр', '🚀', { ach: 'k300' })] },
  { id: 'bottom', name: 'Низ', key: 'bottom', colorKey: 'bottomC', colors: CLOTH, items: [it('jeans', 'Джинсы', '👖'), it('trousers', 'Брюки', '🩳'), it('shorts', 'Шорты', '🩳'), it('skirt', 'Юбка', '👗'), it('track', 'Спортивки', '🏃'), it('cargo', 'Карго', '🎒', { lv: 3 }), it('armor_iron', 'Железные поножи', '🛡️', { lv: 6 }), it('armor_gold', 'Золотые поножи', '🟨', { lv: 10 }), it('armor_diamond', 'Алмазные поножи', '💎', { lv: 14 }), it('astro', 'Штаны скафандра', '🚀', { ach: 'k300' })] },
  { id: 'shoes', name: 'Обувь', key: 'shoes', colorKey: 'shoesC', colors: CLOTH, items: [it('sneakers', 'Кеды', '👟'), it('boots', 'Ботинки', '🥾'), it('formal', 'Туфли', '👞'), it('sandals', 'Сандалии', '🩴'), it('barefoot', 'Босиком', '🦶'), it('rainbow', 'Радужные', '🌈', { lv: 8 }), it('gold', 'Золотые', '✨', { lv: 12 })] },
  { id: 'face', name: 'Лицо', key: 'face', colorKey: 'faceC', colors: CLOTH, items: [it('none', 'Ничего', '🚫'), it('glasses', 'Очки', '👓'), it('blush', 'Румянец', '☺️'), it('freckles', 'Веснушки', '🌰'), it('mustache', 'Усы', '👨'), it('beard', 'Борода', '🧔'), it('mask', 'Маска', '😷'), it('sunglasses', 'Тёмные очки', '🕶️', { lv: 2 }), it('monocle', 'Монокль', '🧐', { lv: 5 }), it('anaglyph', '3D-очки', '🎬', { lv: 7 })] },
  { id: 'body', name: 'Аксессуар', key: 'body', colorKey: 'bodyC', colors: CLOTH, items: [it('none', 'Ничего', '🚫'), it('scarf', 'Шарф', '🧣'), it('tie', 'Галстук', '👔'), it('bowtie', 'Бабочка', '🎀'), it('badge', 'Бейдж', '🪪'), it('backpack', 'Рюкзак', '🎒', { lv: 3 }), it('cape', 'Плащ', '🦸', { lv: 8 }), it('jetpack', 'Реактивный ранец', '🚀', { lv: 11 }), it('wings', 'Крылья', '🪽', { lv: 16 }), it('medal', 'Медаль', '🏅', { ach: 'hundred' })] }
];
const DEFAULT_SKIN = { tone: 1, eyes: 'normal', eyesC: 0, hair: 'short', hairC: 2, hat: 'none', hatC: 5, top: 'hoodie', topC: 7, top2C: 0, bottom: 'jeans', bottomC: 5, shoes: 'sneakers', shoesC: 12, face: 'none', faceC: 11, body: 'none', bodyC: 0 };
window.SKIN_ITEMS = [];
SLOTS.forEach(s => { (s.items || []).forEach(i => i.req && SKIN_ITEMS.push({ name: `${s.name}: ${i.name}`, req: i.req })); Object.entries(COLOR_REQ[s.colorKey] || {}).forEach(([k, r]) => SKIN_ITEMS.push({ name: `${s.name}: новый цвет`, req: r })); });

const PARTS = { head: [0, 0, 8, 8, 8], hat: [32, 0, 8, 8, 8], body: [16, 16, 8, 12, 4], jacket: [16, 32, 8, 12, 4], armR: [40, 16, 4, 12, 4], sleeveR: [40, 32, 4, 12, 4], armL: [32, 48, 4, 12, 4], sleeveL: [48, 48, 4, 12, 4], legR: [0, 16, 4, 12, 4], pantsR: [0, 32, 4, 12, 4], legL: [16, 48, 4, 12, 4], pantsL: [0, 48, 4, 12, 4] };
const rectsOf = ([u, v, w, h, d]) => ({ top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + 2 * d + w, v + d, w, h] });
const SIDES = ['right', 'front', 'left', 'back'], ALLF = ['top', 'bottom', ...SIDES];
const METAL = { armor_iron: '#cfd2d6', armor_gold: '#f2c53d', armor_diamond: '#55e0dc' };

function paintSkin(cfg) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const P = (x, y, col) => { if (!col) return; g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const tx = (col, x, y, a = 0.1) => vary(col, (hash(x, y) - 0.5) * a);
  const F = (part, faces, fn) => { const R = rectsOf(PARTS[part]); for (const f of faces) { const [rx, ry, rw, rh] = R[f]; for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const col = fn(x, y, f, rw, rh); if (col) P(rx + x, ry + y, col === true ? null : col); } } };
  const C = (arr, i) => arr[i] || arr[0];
  const tone = C(TONES, cfg.tone), toneD = vary(tone, -0.22), hairC = C(HAIR_C, cfg.hairC), eye = C(EYE_C, cfg.eyesC);
  const topC = C(CLOTH, cfg.topC), top2 = C(CLOTH, cfg.top2C), botC = C(CLOTH, cfg.bottomC), shoeC = C(CLOTH, cfg.shoesC), hatC = C(CLOTH, cfg.hatC), faceC = C(CLOTH, cfg.faceC), bodyC = C(CLOTH, cfg.bodyC);
  // 1. кожа
  for (const p of ['head', 'body', 'armR', 'armL', 'legR', 'legL']) F(p, ALLF, (x, y, f) => tx(tone, x + p.length * 7, y + (f === 'front' ? 3 : 0), 0.06));
  // 2. лицо
  F('head', ['front'], (x, y) => {
    const brow = cfg.hair === 'none' ? vary(tone, -0.35) : vary(hairC, -0.1);
    if (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) { if (cfg.eyes === 'angry') return (x === 2 || x === 5) ? brow : null; return x === 1 || x === 6 ? null : brow; }
    if (cfg.eyes === 'angry' && y === 2 && (x === 1 || x === 6)) return brow;
    const E = cfg.eyes;
    if (y === 4 || (E === 'wide' && y === 5)) {
      if (E === 'happy') return (x === 1 || x === 2 || x === 5 || x === 6) && y === 4 ? vary(eye, -0.45) : null;
      if (E === 'sleepy') return x === 1 || x === 6 ? toneD : x === 2 || x === 5 ? vary(eye, -0.2) : null;
      if (E === 'laser') return x >= 1 && x <= 2 || x >= 5 && x <= 6 ? (x === 2 || x === 5 ? '#ff1a1a' : '#ff8a8a') : null;
      if (E === 'wink' && (x === 5 || x === 6)) return vary(eye, -0.45);
      if (x === 1 || x === 6) return E === 'star' ? '#fff8c4' : '#ffffff';
      if (x === 2 || x === 5) return E === 'star' ? '#ffcf1a' : eye;
    }
    if (y === 5 && (x === 3 || x === 4)) return vary(tone, -0.12);
    if (y === 6 && (x === 3 || x === 4)) return '#8a3a2e';
    if (y === 6 && (x === 2 || x === 5) && (E === 'happy' || E === 'star')) return '#8a3a2e';
    return null;
  });
  // 3. низ
  const legs = ['legR', 'legL'], pants = ['pantsR', 'pantsL'];
  const belt = (col) => F('body', SIDES, (x, y) => y >= 10 ? (y === 10 ? (x >= 3 && x <= 4 ? '#d9b44a' : '#4a3020') : tx(col, x, y)) : null);
  const bot = cfg.bottom;
  if (cfg.top !== 'dress' && cfg.top !== 'robe') {
    if (bot === 'jeans') { legs.forEach(l => F(l, ALLF, (x, y, f) => f === 'bottom' ? null : (f === 'front' || f === 'back') && x === (l === 'legR' ? 0 : 3) ? vary(botC, -0.18) : y === 6 ? vary(botC, 0.12) : tx(botC, x, y, 0.16))); belt(botC); }
    else if (bot === 'trousers') { legs.forEach(l => F(l, SIDES, (x, y, f) => f === 'front' && x === 1 ? vary(botC, -0.15) : tx(botC, x, y, 0.06))); belt(botC); }
    else if (bot === 'shorts') { legs.forEach(l => F(l, SIDES, (x, y) => y < 5 ? tx(botC, x, y) : y === 5 ? vary(botC, -0.2) : null)); belt(botC); }
    else if (bot === 'skirt') { pants.forEach(l => F(l, SIDES, (x, y) => y < 6 ? (y === 5 ? vary(botC, -0.2) : tx(botC, x, y)) : null)); F('body', SIDES, (x, y) => y >= 10 ? tx(botC, x, y) : null); }
    else if (bot === 'track') { legs.forEach(l => F(l, SIDES, (x, y, f) => (f === (l === 'legR' ? 'right' : 'left') && (x === 1 || x === 2)) ? '#f5f5f5' : y === 9 ? vary(botC, -0.2) : tx(botC, x, y))); belt(botC); }
    else if (bot === 'cargo') { legs.forEach(l => F(l, SIDES, (x, y, f) => { const outer = f === (l === 'legR' ? 'right' : 'left'); if (outer && y >= 4 && y <= 7) return y === 4 ? vary(botC, -0.3) : vary(botC, -0.15); return tx(botC, x, y, 0.14); })); belt(botC); }
    else if (METAL[bot]) { const m = METAL[bot]; legs.forEach(l => F(l, SIDES, (x, y) => y < 10 ? (x === 0 || x === 3 || y === 0 || y === 5 ? vary(m, -0.3) : tx(m, x, y, 0.18)) : null)); pants.forEach(l => F(l, SIDES, (x, y) => y === 5 || y === 6 ? vary(m, 0.15) : null)); F('body', SIDES, (x, y) => y >= 10 ? tx(m, x, y, 0.2) : null); }
    else if (bot === 'astro') { legs.forEach(l => F(l, SIDES, (x, y) => y === 6 ? '#ff7a1a' : tx('#f2f2f2', x, y, 0.08))); F('body', SIDES, (x, y) => y >= 10 ? '#e2e2e2' : null); }
  }
  // 4. обувь
  const sh = cfg.shoes;
  legs.forEach((l, li) => F(l, [...SIDES, 'bottom'], (x, y, f) => {
    if (f === 'bottom') return sh === 'barefoot' ? null : sh === 'sneakers' ? '#f5f5f5' : sh === 'gold' ? '#d9a520' : vary(sh === 'formal' ? '#1a1a1a' : shoeC, -0.35);
    if (sh === 'sneakers') return y === 10 ? (f === 'front' && x === 1 ? '#ffffff' : tx(shoeC, x, y)) : y === 11 ? '#f2f2f2' : null;
    if (sh === 'boots') return y >= 8 ? (y === 11 ? vary(shoeC, -0.4) : y === 8 ? vary(shoeC, -0.15) : tx(shoeC, x, y, 0.15)) : null;
    if (sh === 'formal') return y >= 10 ? (f === 'front' && y === 10 && x === 2 ? '#5a5a5a' : '#161616') : null;
    if (sh === 'sandals') return y === 11 ? '#7a4a22' : y === 10 && (x + li) % 2 === 0 ? '#9a6a3a' : null;
    if (sh === 'rainbow') return y >= 10 ? ['#ff4d4d', '#ffb020', '#ffe14d', '#4dd96b', '#4db8ff', '#9a5cff'][(x + y + (f === 'front' ? 1 : f === 'left' ? 2 : 0)) % 6] : null;
    if (sh === 'gold') return y >= 9 ? (y === 9 ? '#ffe680' : tx('#f2c53d', x, y, 0.2)) : null;
    return null;
  }));
  // 5. верх
  const top = cfg.top, arms = ['armR', 'armL'], sleeves = ['sleeveR', 'sleeveL'];
  const bodyFill = (fn) => F('body', ALLF, (x, y, f) => f === 'bottom' ? null : fn(x, y, f));
  const neck = (x, y, f) => f === 'front' && y === 0 && (x === 3 || x === 4);
  if (top === 'tee' || top === 'polo' || top === 'jersey') {
    bodyFill((x, y, f) => neck(x, y, f) && top === 'tee' ? null : (top === 'polo' && f === 'front' && y === 0 && x >= 2 && x <= 5) ? vary(topC, 0.25) : (top === 'polo' && f === 'front' && x === 4 && (y === 1 || y === 2)) ? '#f5f5f5' : y >= 10 && cfg.bottom !== 'skirt' ? null : tx(topC, x, y));
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y < 4 ? (top === 'jersey' && y === 3 ? '#f5f5f5' : tx(topC, x, y)) : null));
    if (top === 'jersey') { const D = ['111', '001', '010', '010', '010']; F('body', ['back'], (x, y) => y >= 2 && y < 7 && x >= 2 && x < 5 && D[y - 2][x - 2] === '1' ? '#f5f5f5' : null); F('body', ['front'], (x, y) => y === 2 && x === 5 ? '#f5f5f5' : null); }
  } else if (top === 'long' || top === 'sweater' || top === 'shirt' || top === 'hoodie') {
    const col = (x, y) => top === 'sweater' && y % 3 === 1 ? vary(top2, 0.05) : tx(topC, x, y);
    bodyFill((x, y, f) => {
      if (top === 'shirt' && f === 'front') { if (y === 0 && x >= 1 && x <= 6) return '#f5f5f5'; if (x === 4 && y % 2 === 1 && y < 10) return vary(topC, -0.25); }
      if (top === 'hoodie' && f === 'front' && (x === 3 || x === 4) && y >= 1 && y <= 3) return '#f5f5f5';
      if (neck(x, y, f) && top !== 'hoodie') return null;
      return col(x, y);
    });
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y === 11 ? (top === 'shirt' ? '#f5f5f5' : vary(topC, -0.2)) : col(x, y)));
    if (top === 'hoodie') {
      F('jacket', ['front'], (x, y) => y >= 7 && y <= 9 && x >= 1 && x <= 6 ? vary(topC, y === 7 ? -0.3 : -0.12) : null);
      F('hat', ['back'], (x, y) => y >= 5 ? tx(topC, x, y) : null); F('hat', ['right', 'left'], (x, y) => y >= 6 && x < 5 ? tx(topC, x, y) : null);
    }
  } else if (top === 'tank') {
    bodyFill((x, y, f) => f === 'top' ? null : (f === 'front' || f === 'back') && y === 0 && x >= 2 && x <= 5 ? null : tx(topC, x, y));
  } else if (top === 'dress') {
    bodyFill((x, y, f) => y === 7 ? vary(topC, -0.3) : tx(topC, x, y));
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y < 2 ? tx(topC, x, y) : null));
    pants.forEach(l => F(l, SIDES, (x, y) => y < 7 ? (y === 6 ? vary(topC, -0.25) : tx(topC, x, y)) : null));
  } else if (top === 'suit') {
    bodyFill((x, y, f) => { if (f === 'front' && x >= 3 && x <= 4 && y < 11) { if (y >= 1 && y <= 8) return vary(top2, (x === 3 ? 0 : -0.15)); return '#f5f5f5'; } if (f === 'front' && (x === 2 || x === 5) && y < 5) return vary(topC, 0.2); if (f === 'front' && x === 2 && y === 8) return '#d0d0d0'; return tx(topC, x, y, 0.06); });
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y === 11 ? '#f5f5f5' : tx(topC, x, y, 0.06)));
  } else if (top === 'labcoat') {
    bodyFill((x, y, f) => f === 'front' && (x === 3 || x === 4) ? tx(topC, x, y) : tx('#f4f4f4', x, y, 0.04));
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => tx('#f4f4f4', x, y, 0.04)));
    F('jacket', ['front'], (x, y) => (x === 6 && y >= 3 && y <= 4) ? '#2b6fd8' : (y === 5 && x >= 5) ? '#dcdcdc' : null);
    pants.forEach(l => F(l, SIDES, (x, y) => y < 5 ? tx('#f4f4f4', x, y, 0.04) : null));
  } else if (top === 'robe') {
    bodyFill((x, y, f) => f === 'front' && (x === 3 || x === 4) ? '#e8c34a' : (hash(x, y, 5) < 0.06 ? '#ffe680' : tx(topC, x, y, 0.08)));
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y >= 10 ? '#e8c34a' : tx(topC, x, y, 0.08)));
    pants.forEach(l => F(l, SIDES, (x, y) => y === 11 ? '#e8c34a' : hash(x, y, 9) < 0.06 ? '#ffe680' : tx(topC, x, y, 0.08)));
    legs.forEach(l => F(l, SIDES, (x, y) => y < 10 ? tx(topC, x, y, 0.08) : null));
  } else if (METAL[top]) {
    const m = METAL[top];
    bodyFill((x, y, f) => (x === 0 || x === 7 || y === 0 || y === 11 || (f === 'front' && (y === 5 || x === 3 && y > 5))) ? vary(m, -0.28) : tx(m, x, y, 0.2));
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y < 9 ? (y === 4 ? vary(m, -0.3) : tx(m, x, y, 0.2)) : null));
    sleeves.forEach(a => F(a, ['top', ...SIDES], (x, y) => y < 4 ? (y === 3 ? vary(m, -0.35) : tx(m, x, y, 0.25)) : null));
    F('jacket', ['front'], (x, y) => y >= 1 && y <= 3 && x >= 2 && x <= 5 ? vary(m, 0.25) : null);
  } else if (top === 'astro') {
    bodyFill((x, y, f) => y === 5 ? '#ff7a1a' : f === 'front' && y >= 1 && y <= 3 && x >= 2 && x <= 5 ? (x === 2 ? '#e53935' : x === 3 ? '#43a047' : x === 4 ? '#1e88e5' : '#9e9e9e') : tx('#f2f2f2', x, y, 0.06));
    arms.forEach(a => F(a, ['top', ...SIDES], (x, y) => y >= 10 ? '#ff7a1a' : tx('#f2f2f2', x, y, 0.06)));
  }
  // 6. волосы
  const hc = (x, y) => tx(hairC, x, y, 0.22), H = cfg.hair;
  const hairRows = { short: [1, 3, 5], side: [1, 3, 5], buzz: [1, 2, 3], spiky: [1, 3, 5], curly: [1, 4, 6], bob: [2, 6, 7], long: [2, 8, 8], ponytail: [1, 3, 6], bun: [1, 3, 5], pigtails: [2, 6, 7], mohawk: [0, 0, 0], afro: [2, 6, 8] }[H];
  if (hairRows) {
    const [fr, sr, br] = hairRows;
    const col = H === 'buzz' ? (x, y) => vary(hairC, (hash(x, y) - 0.5) * 0.3 - 0.05) : hc;
    if (H === 'mohawk') { F('head', ['top'], (x, y) => x === 3 || x === 4 ? hc(x, y) : vary(tone, -0.08)); F('hat', ['top'], (x, y) => x === 3 || x === 4 ? hc(x, y) : null); F('hat', ['front'], (x, y) => y === 0 && (x === 3 || x === 4) ? hc(x, y) : null); F('hat', ['back'], (x, y) => y < 4 && (x === 3 || x === 4) ? hc(x, y) : null); }
    else {
      F('head', ['top'], col);
      F('head', ['front'], (x, y) => y < fr && !(H === 'side' && y === 1 && x > 4) ? col(x, y) : (H === 'long' && (x === 0 || x === 7) && y < 8) ? col(x, y) : null);
      F('head', ['right', 'left'], (x, y) => y < sr || (H === 'long' && y < 8) ? col(x, y) : null);
      F('head', ['back'], (x, y) => y < br ? col(x, y) : null);
    }
    if (H === 'spiky') { F('hat', ['top'], (x, y) => (x + y) % 2 === 0 ? hc(x, y) : null); F('hat', ['front', 'right', 'left', 'back'], (x, y) => y === 0 && x % 2 === 0 ? hc(x, y) : null); }
    if (H === 'curly' || H === 'afro') { const p = H === 'afro' ? 0.85 : 0.45, rows = H === 'afro' ? 6 : 4; F('hat', ['top'], (x, y) => hash(x, y, 3) < p ? hc(x, y) : null); F('hat', ['right', 'left', 'back'], (x, y) => y < rows && hash(x, y, 4) < p ? hc(x, y) : null); F('hat', ['front'], (x, y) => y < (H === 'afro' ? 2 : 1) && hash(x, y, 6) < p ? hc(x, y) : null); }
    if (H === 'bob') F('hat', ['right', 'left'], (x, y) => y >= 3 && y < 7 && x < 6 ? hc(x, y) : null);
    if (H === 'long') { F('hat', ['back'], (x, y) => y >= 4 ? hc(x, y) : null); F('jacket', ['back'], (x, y) => y < 5 ? hc(x, y) : null); }
    if (H === 'ponytail') { F('hat', ['back'], (x, y) => (x === 3 || x === 4) && y >= 2 && y <= 5 ? (y === 2 ? '#e53935' : hc(x, y)) : null); F('jacket', ['back'], (x, y) => (x === 3 || x === 4) && y < 6 ? hc(x, y) : null); }
    if (H === 'bun') { F('hat', ['top'], (x, y) => x >= 2 && x <= 5 && y < 3 ? hc(x, y) : null); F('hat', ['back'], (x, y) => x >= 2 && x <= 5 && y < 3 ? hc(x, y) : null); }
    if (H === 'pigtails') F('hat', ['right', 'left'], (x, y) => x >= 1 && x <= 3 && y >= 4 ? (y === 4 ? '#ff5fa8' : hc(x, y)) : null);
  }
  // 7. головные уборы (пиксельный слой)
  const HT = cfg.hat;
  if (HT === 'cap') { F('hat', ['top'], (x, y) => tx(hatC, x, y)); F('hat', SIDES, (x, y, f) => y < 2 ? (f === 'front' && y === 1 && (x === 3 || x === 4) ? '#ffffff' : tx(hatC, x, y)) : null); }
  if (HT === 'beanie') { F('hat', ['top'], (x, y) => tx(hatC, x, y, 0.2)); F('hat', SIDES, (x, y, f) => { const n = f === 'front' ? 3 : 4; return y < n ? (y === n - 1 ? vary(hatC, -0.25) : tx(hatC, x, y, 0.2)) : null; }); }
  if (HT === 'bandana') { const dots = (x, y) => (x + y * 3) % 5 === 0 ? '#f5f5f5' : tx(hatC, x, y); F('hat', ['top'], dots); F('hat', SIDES, (x, y, f) => y < (f === 'back' ? 3 : 2) || (f === 'back' && (x === 3 || x === 4) && y < 5) ? dots(x, y) : null); }
  if (HT === 'flowers') { const fl = ['#ff4d6d', '#ffd84d', '#ffffff', '#ff9ad5', '#b388ff']; F('hat', SIDES, (x, y) => y === 1 ? ((x + 1) % 2 ? fl[(x * 3 + y) % 5] : '#3f9a3a') : null); }
  if (HT === 'helmet' || HT === 'viking') { const m = HT === 'viking' ? '#9e9e9e' : hatC; F('hat', ['top'], (x, y) => tx(m, x, y, 0.2)); F('hat', SIDES, (x, y, f) => f === 'front' ? (y < 2 || (x === 3 || x === 4) && y < 5 ? (y === 1 ? vary(m, -0.3) : tx(m, x, y, 0.2)) : null) : y < 6 ? tx(m, x, y, 0.2) : null); }
  if (HT === 'astro') { F('hat', ['top', 'bottom', 'right', 'left', 'back'], (x, y) => tx('#f4f4f4', x, y, 0.05)); F('hat', ['front'], (x, y) => x >= 1 && x <= 6 && y >= 2 && y <= 6 ? (x === 2 && y === 3 ? '#e0f7ff' : '#3a6fa8') : tx('#f4f4f4', x, y, 0.05)); }
  // 8. лицо — аксессуары
  const FC = cfg.face;
  if (FC === 'glasses') { const fr = vary(faceC, -0.2); F('hat', ['front'], (x, y) => ((y === 3 || y === 5) && (x === 1 || x === 2 || x === 5 || x === 6)) || (y === 4 && (x === 0 || x === 3 || x === 4 || x === 7)) ? fr : null); F('hat', ['right', 'left'], (x, y, f) => y === 4 && (f === 'right' ? x >= 4 : x <= 3) ? fr : null); }
  if (FC === 'sunglasses') { F('hat', ['front'], (x, y) => (y === 3 || y === 4) && x >= 1 && x <= 6 && !(y === 3 && (x === 3 || x === 4)) ? (y === 3 && (x === 1 || x === 5) ? '#4a4a6a' : '#101018') : null); F('hat', ['right', 'left'], (x, y, f) => y === 3 && (f === 'right' ? x >= 4 : x <= 3) ? '#101018' : null); }
  if (FC === 'anaglyph') { F('hat', ['front'], (x, y) => y === 4 ? (x === 1 || x === 2 ? '#ff2e4a' : x === 5 || x === 6 ? '#2ee6ff' : x === 0 || x === 7 || x === 3 || x === 4 ? '#f5f5f5' : null) : y === 3 && x >= 1 && x <= 6 ? '#f5f5f5' : null); }
  if (FC === 'monocle') F('hat', ['front'], (x, y) => ((y === 3 || y === 5) && (x === 1 || x === 2)) || (y === 4 && (x === 0 || x === 3)) ? '#e0b64a' : (x === 0 && y >= 5) ? '#c9a03a' : null);
  if (FC === 'beard') { F('head', ['front'], (x, y) => y >= 6 && !(y === 6 && (x === 3 || x === 4)) ? hc(x, y) : null); F('head', ['right', 'left'], (x, y, f) => y >= 5 && (f === 'right' ? x >= 4 : x <= 3) ? hc(x, y) : null); F('hat', ['front'], (x, y) => y === 7 && x >= 1 && x <= 6 ? hc(x, y) : null); }
  if (FC === 'mustache') F('head', ['front'], (x, y) => y === 5 && x >= 2 && x <= 5 ? hc(x, y) : (y === 6 && (x === 2 || x === 5)) ? hc(x, y) : null);
  if (FC === 'mask') { F('head', ['front'], (x, y) => y >= 5 && y <= 7 ? (y === 5 ? vary(faceC, -0.1) : tx(faceC, x, y, 0.05)) : null); F('head', ['right', 'left'], (x, y) => y === 5 ? '#e8e8e8' : null); }
  if (FC === 'blush') F('head', ['front'], (x, y) => y === 5 && (x === 1 || x === 6) ? '#f58aa0' : null);
  if (FC === 'freckles') F('head', ['front'], (x, y) => (y === 5 && (x === 1 || x === 6)) || (y === 6 && (x === 1 || x === 6)) && (x + y) % 2 ? vary(tone, -0.3) : null);
  // 9. аксессуары на теле
  const BD = cfg.body;
  if (BD === 'scarf') { F('jacket', SIDES, (x, y, f) => y < 2 ? (x % 3 === 0 ? vary(bodyC, -0.25) : tx(bodyC, x, y)) : (f === 'front' && (x === 5 || x === 6) && y < 7) ? (y === 6 ? vary(bodyC, -0.25) : tx(bodyC, x, y)) : null); }
  if (BD === 'tie') F('body', ['front'], (x, y) => (y === 1 && (x === 3 || x === 4)) ? vary(bodyC, -0.15) : (y >= 2 && y <= 7 && (x === 3 || x === 4)) ? tx(bodyC, x, y) : (y === 8 && x === 3) ? vary(bodyC, -0.2) : null);
  if (BD === 'bowtie') F('body', ['front'], (x, y) => (y === 0 || y === 1) && x >= 2 && x <= 5 ? (x === 3 || x === 4 ? (y === 0 ? vary(bodyC, -0.3) : vary(bodyC, -0.15)) : tx(bodyC, x, y)) : null);
  if (BD === 'medal') F('jacket', ['front'], (x, y) => ((y === 0 && (x === 2 || x === 5)) || (y === 1 && (x === 3 || x === 4))) ? tx(bodyC, x, y) : (y >= 2 && y <= 3 && (x === 3 || x === 4)) ? (x === 3 && y === 2 ? '#fff3a0' : '#e8b830') : null);
  if (BD === 'badge') F('jacket', ['front'], (x, y) => x >= 5 && x <= 6 && y >= 2 && y <= 4 ? (y === 2 ? tx(bodyC, x, y) : '#fafafa') : null);
  if (BD === 'backpack') F('body', ['front'], (x, y) => (x === 1 || x === 6) && y < 8 ? vary(bodyC, -0.35) : null);
  return c;
}

function mapUV(geo, box) {
  const R = rectsOf(box), order = ['left', 'right', 'top', 'bottom', 'front', 'back'], uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) { const [rx, ry, rw, rh] = R[order[f]]; for (let k = 0; k < 4; k++) { const i = f * 4 + k, u0 = uv.getX(i), v0 = uv.getY(i); uv.setXY(i, (rx + u0 * rw) / 64, 1 - (ry + (1 - v0) * rh) / 64); } }
  uv.needsUpdate = true;
}
const lam = (color, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color }, o));
function bx(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mat); m.position.set(x * PX, y * PX, z * PX); return m; }

function buildModel(cfg, opts = {}) {
  cfg = Object.assign({}, DEFAULT_SKIN, cfg);
  const canvas = opts.canvas || paintSkin(cfg);
  const tex = new THREE.CanvasTexture(canvas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const base = new THREE.MeshLambertMaterial({ map: tex });
  const over = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const mats = [base, over];
  const part = (name, w, h, d, inflate) => { const g = new THREE.BoxGeometry((w + inflate) * PX, (h + inflate) * PX, (d + inflate) * PX); mapUV(g, PARTS[name]); return new THREE.Mesh(g, inflate ? over : base); };
  const root = new THREE.Group(), M = { root, mats, tex, extras: [] };
  const joint = (x, y, z) => { const j = new THREE.Group(); j.position.set(x * PX, y * PX, z * PX); root.add(j); return j; };
  M.legR = joint(-2, 12, 0); M.legL = joint(2, 12, 0);
  M.body = joint(0, 12, 0); M.head = joint(0, 24, 0);
  M.armR = joint(-6, 22, 0); M.armL = joint(6, 22, 0);
  const add = (j, name, oname, w, h, d, y, ov = 0.5) => { const a = part(name, w, h, d, 0); a.position.y = y * PX; j.add(a); const b = part(oname, w, h, d, ov); b.position.y = y * PX; j.add(b); };
  add(M.legR, 'legR', 'pantsR', 4, 12, 4, -6); add(M.legL, 'legL', 'pantsL', 4, 12, 4, -6);
  add(M.body, 'body', 'jacket', 8, 12, 4, 6); add(M.head, 'head', 'hat', 8, 8, 8, 4, 1);
  add(M.armR, 'armR', 'sleeveR', 4, 12, 4, -4); add(M.armL, 'armL', 'sleeveL', 4, 12, 4, -4);
  if (!opts.noExtras) addExtras(M, cfg);
  M.dispose = () => { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); M.mats.forEach(m => m.dispose()); M.extras.forEach(m => m.dispose && m.dispose()); Object.values(M.armorMat || {}).forEach(m => m.dispose()); tex.dispose(); };
  return M;
}
function addExtras(M, cfg) {
  const C = (arr, i) => arr[i] || arr[0];
  const hatC = C(CLOTH, cfg.hatC), bodyC = C(CLOTH, cfg.bodyC);
  const mat = (c, o) => { const m = lam(c, o); M.extras.push(m); return m; };
  const H = M.head, hm = mat(hatC), gold = mat('#f2c53d'), white = mat('#f5f5f5');
  switch (cfg.hat) {
    case 'cap': H.add(bx(8.6, 0.8, 5, hm, 0, 6.6, 5.6)); break;
    case 'beanie': H.add(bx(2, 2, 2, white, 0, 10, 0)); break;
    case 'headphones': H.add(bx(9.4, 1, 1.6, mat('#2b2b2b'), 0, 9, 0)); H.add(bx(1.6, 3.2, 3.2, hm, -4.9, 4, 0)); H.add(bx(1.6, 3.2, 3.2, hm, 4.9, 4, 0)); H.add(bx(0.6, 7, 0.8, mat('#2b2b2b'), -4.6, 6.4, 0)); H.add(bx(0.6, 7, 0.8, mat('#2b2b2b'), 4.6, 6.4, 0)); break;
    case 'tophat': { const k = mat('#1a1a1a'); H.add(bx(10.5, 0.8, 10.5, k, 0, 8.7, 0)); H.add(bx(7, 6, 7, k, 0, 12, 0)); H.add(bx(7.3, 1.3, 7.3, hm, 0, 9.8, 0)); break; }
    case 'crown': { for (const [w, d, x, z] of [[8.8, .7, 0, 4.1], [8.8, .7, 0, -4.1], [.7, 8.8, 4.1, 0], [.7, 8.8, -4.1, 0]]) H.add(bx(w, 2.2, d, gold, x, 9.1, z)); for (const [x, z] of [[-4, 4], [0, 4], [4, 4], [-4, -4], [0, -4], [4, -4], [4, 0], [-4, 0]]) H.add(bx(1, 1.6, 1, gold, x, 10.8, z)); H.add(bx(1.2, 1.2, .6, mat('#e53935'), 0, 9.1, 4.5)); H.add(bx(.6, 1.2, 1.2, mat('#1e88e5'), 4.5, 9.1, 0)); H.add(bx(.6, 1.2, 1.2, mat('#43a047'), -4.5, 9.1, 0)); break; }
    case 'party': [[6, 9.2], [4.4, 11.2], [2.8, 13.2], [1.4, 14.8]].forEach(([s, y], i) => H.add(bx(s, 2, s, i % 2 ? white : hm, 0, y, 0))); break;
    case 'wizard': { const g = new THREE.Group(); [[10, 1, 8.6], [7, 2, 10], [5.4, 2, 12], [3.8, 2, 14], [2.4, 2, 16], [1.2, 1.6, 17.6]].forEach(([s, h, y]) => g.add(bx(s, h, s, hm, 0, y, 0))); g.add(bx(1, 1, .4, gold, 0, 11.5, 3.6)); g.rotation.x = -0.12; H.add(g); break; }
    case 'viking': { const horn = mat('#eee6cf'); for (const sx of [-1, 1]) { H.add(bx(1.8, 1.8, 1.8, horn, sx * 5, 7, 0)); H.add(bx(1.5, 1.8, 1.5, horn, sx * 6.2, 8.6, 0)); H.add(bx(1.2, 1.8, 1.2, horn, sx * 6.6, 10.3, 0)); } break; }
    case 'halo': { const m = new THREE.MeshBasicMaterial({ color: '#ffe066' }); M.extras.push(m); const t = new THREE.Mesh(new THREE.TorusGeometry(3.6 * PX, 0.5 * PX, 6, 18), m); t.rotation.x = Math.PI / 2; t.position.y = 11.5 * PX; H.add(t); M.halo = t; break; }
    case 'bunny': { const pink = mat('#ff9ac2'); for (const sx of [-1, 1]) { H.add(bx(1.8, 6, 1, white, sx * 2.2, 11, 0)); H.add(bx(1, 4.5, .4, pink, sx * 2.2, 11, .6)); } break; }
    case 'astro': H.add(bx(.6, 3, .6, mat('#bdbdbd'), 3, 10, 0)); H.add(bx(1.2, 1.2, 1.2, mat('#e53935'), 3, 12, 0)); break;
  }
  const Bd = M.body;
  switch (cfg.body) {
    case 'backpack': { const bm = mat(bodyC); Bd.add(bx(7, 9, 3, bm, 0, 6, -3.6)); Bd.add(bx(5, 3.5, 1, mat(vary(bodyC, -0.25)), 0, 3.8, -5.4)); break; }
    case 'cape': {
      const cc = document.createElement('canvas'); cc.width = 10; cc.height = 16; const g = cc.getContext('2d');
      g.fillStyle = bodyC; g.fillRect(0, 0, 10, 16); g.fillStyle = vary(bodyC, -0.25); g.fillRect(0, 0, 10, 1); g.fillRect(0, 15, 10, 1);
      g.fillStyle = '#ffe066'; [[4, 5], [5, 5], [3, 6], [4, 6], [5, 6], [6, 6], [4, 7], [5, 7], [4, 8], [5, 8], [3, 9], [6, 9]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
      const t = new THREE.CanvasTexture(cc); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; M.extras.push(t);
      const m = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }); M.extras.push(m);
      const pivot = new THREE.Group(); pivot.position.set(0, 12 * PX, -2.4 * PX);
      const cape = new THREE.Mesh(new THREE.BoxGeometry(10 * PX, 16 * PX, 0.6 * PX), m); cape.position.y = -8 * PX; pivot.add(cape); Bd.add(pivot); M.cape = pivot; break;
    }
    case 'wings': { const wm = mat('#f5f5f5'), wm2 = mat('#d9e8ff'); M.wings = []; for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * 1.5 * PX, 10 * PX, -2.4 * PX); const w = bx(0.6, 11, 7, wm, 0, -3, -3.5); p.add(w); p.add(bx(0.7, 6, 4, wm2, 0, -5, -5)); p.rotation.y = sx * 0.6; p.rotation.z = sx * 0.25; Bd.add(p); M.wings.push(p); } break; }
    case 'jetpack': { const jm = mat('#9e9e9e'), fl = new THREE.MeshBasicMaterial({ color: '#ffb020' }); M.extras.push(fl); for (const sx of [-1, 1]) { Bd.add(bx(2.6, 6.5, 2.6, jm, sx * 1.8, 7, -3.4)); const f = bx(1.4, 2.2, 1.4, fl, sx * 1.8, 2.6, -3.4); f.visible = false; Bd.add(f); (M.flames = M.flames || []).push(f); } Bd.add(bx(1.2, 4, 1.2, mat('#e53935'), 0, 8, -3.4)); break; }
  }
}
// Анимация модели: walk 0..1, phase — фаза шага, swing 0..1 — взмах рукой
function animateModel(M, t, o = {}) {
  const walk = o.walk || 0, a = Math.sin(o.phase || 0) * 0.85 * walk, swing = o.swing || 0;
  M.legR.rotation.x = a; M.legL.rotation.x = -a;
  if (o.zombie) { M.armR.rotation.x = -1.45 + Math.sin(t * 2) * 0.06; M.armL.rotation.x = -1.45 - Math.sin(t * 2) * 0.06; }
  else {
    M.armR.rotation.x = -a * 0.8 - Math.sin(swing * Math.PI) * 1.4 - (o.fly ? 0.15 : 0);
    M.armL.rotation.x = a * 0.8 - (o.fly ? 0.15 : 0);
  }
  M.armR.rotation.z = -0.06 - Math.sin(t * 1.3) * 0.035 - (o.fly ? 0.25 : 0); M.armL.rotation.z = 0.06 + Math.sin(t * 1.3) * 0.035 + (o.fly ? 0.25 : 0);
  M.head.rotation.x = clamp(o.pitch || 0, -1.2, 1.2);
  M.head.rotation.y = o.headYaw || 0;
  const sneak = o.sneak ? 1 : 0;
  M.body.rotation.x = sneak * 0.4; M.head.position.z = sneak * 3 * PX; M.head.position.y = (24 - sneak * 1.5) * PX;
  M.armR.position.z = M.armL.position.z = sneak * 2.6 * PX; M.armR.position.y = M.armL.position.y = (22 - sneak * 1.5) * PX;
  M.legR.position.z = M.legL.position.z = -sneak * 2 * PX;
  if (M.cape) M.cape.rotation.x = 0.12 + walk * 0.7 + Math.sin(t * 4) * 0.05 * (walk + 0.2) + (o.fly ? 0.9 : 0) + sneak * 0.3;
  if (M.wings) M.wings.forEach((w, i) => { const s = i ? 1 : -1; w.rotation.y = s * (0.55 + Math.sin(t * (o.fly ? 9 : 1.6)) * (o.fly ? 0.45 : 0.08)); });
  if (M.flames) M.flames.forEach(f => { f.visible = !!o.fly; f.scale.y = 0.8 + Math.random() * 0.6; });
  if (M.halo) M.halo.position.y = (11.5 + Math.sin(t * 2) * 0.4) * PX;
}

// ---------- Гардероб ----------
function openWardrobe(host, cur, onSave, onClose) {
  host.innerHTML = ''; const W = document.createElement('div'); W.style.display = 'contents'; host.appendChild(W);
  let cfg = Object.assign({}, DEFAULT_SKIN, cur || {});
  let tab = SLOTS[0].id;
  W.innerHTML = `<div class="g-panel"><div class="row" style="margin-bottom:12px"><h2 style="margin:0">👕 Гардероб</h2><span class="muted small">Новые вещи открываются за уровни и достижения в тренировке</span><span class="spacer"></span><button class="btn ghost sm" data-rand>🎲 Случайно</button></div>
    <div class="wardrobe"><div class="wd-prev"><canvas></canvas></div><div><div class="wd-tabs"></div><div class="wd-items"></div><div class="wd-colors"></div><div class="wd-colors2"></div></div></div>
    <div class="row" style="margin-top:14px"><span class="muted small">Перетаскивай персонажа, чтобы повернуть</span><span class="spacer"></span><button class="btn ghost" data-cancel>Отмена</button><button class="btn ok" data-save>Сохранить</button></div></div>`;
  const cv = W.querySelector('.wd-prev canvas');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75)); const dl = new THREE.DirectionalLight(0xffffff, 0.55); dl.position.set(2, 3, 4); scene.add(dl);
  cam.position.set(0, 1.05, 4.3); cam.lookAt(0, 0.95, 0);
  let M = null, rotY = 0.5, drag = null, raf = 0, t0 = performance.now();
  const rebuild = () => { if (M) { scene.remove(M.root); M.dispose(); } M = buildModel(cfg); M.root.position.y = 0.05; scene.add(M.root); };
  const resize = () => { const r = cv.parentElement.getBoundingClientRect(); R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); };
  const loop = () => { raf = requestAnimationFrame(loop); const t = (performance.now() - t0) / 1000; if (!drag) rotY += 0.006; M.root.rotation.y = rotY; animateModel(M, t, { walk: 0.55, phase: t * 5, pitch: Math.sin(t * 0.7) * 0.15 }); R.render(scene, cam); };
  cv.addEventListener('pointerdown', e => { drag = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (drag != null) { rotY += (e.clientX - drag) * 0.012; drag = e.clientX; } });
  cv.addEventListener('pointerup', () => { drag = null; });
  const locked = req => !(window.App ? App.isUnlocked(req) : true);
  const reqT = req => window.App ? App.reqText(req) : '';
  const draw = () => {
    const S = SLOTS.find(s => s.id === tab);
    W.querySelector('.wd-tabs').innerHTML = SLOTS.map(s => `<span class="chip ${s.id === tab ? 'on' : ''}" data-tab="${s.id}">${s.name}</span>`).join('');
    W.querySelector('.wd-items').innerHTML = S.items ? S.items.map(i => `<div class="wd-item ${cfg[S.key] === i.id ? 'on' : ''} ${locked(i.req) ? 'lock' : ''}" data-item="${i.id}"><div class="sw">${i.icon}</div>${i.name}${i.req ? `<span class="req">${locked(i.req) ? '🔒 ' : '✓ '}${reqT(i.req)}</span>` : ''}</div>`).join('') : '';
    const colorRow = (key, colors, label) => `<div class="small muted" style="width:100%;font-weight:800">${label}</div>` + colors.map((c, i) => { const rq = (COLOR_REQ[key] || {})[i]; return `<span class="wd-color ${cfg[key] === i ? 'on' : ''}" data-ck="${key}" data-ci="${i}" style="background:${c};${locked(rq) ? 'opacity:.25' : ''}" title="${rq ? (locked(rq) ? '🔒 ' : '') + reqT(rq) : ''}"></span>`; }).join('');
    W.querySelector('.wd-colors').innerHTML = S.colorKey ? colorRow(S.colorKey, S.colors, S.id === 'tone' ? 'Оттенок' : 'Цвет') : '';
    W.querySelector('.wd-colors2').innerHTML = S.color2Key && ['sweater', 'suit'].includes(cfg.top) ? `<div class="wd-colors">${colorRow(S.color2Key, CLOTH, cfg.top === 'suit' ? 'Цвет галстука' : 'Цвет полосок')}</div>` : '';
  };
  W.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
    const im = e.target.closest('[data-item]');
    if (im) { const S = SLOTS.find(s => s.id === tab), item = S.items.find(i => i.id === im.dataset.item); if (locked(item.req)) { window.App && App.toast('🔒', item.name, 'Откроется: ' + reqT(item.req)); return; } cfg[S.key] = item.id; rebuild(); draw(); return; }
    const cl = e.target.closest('[data-ck]');
    if (cl) { const key = cl.dataset.ck, i = +cl.dataset.ci, rq = (COLOR_REQ[key] || {})[i]; if (locked(rq)) { window.App && App.toast('🔒', 'Цвет закрыт', 'Откроется: ' + reqT(rq)); return; } cfg[key] = i; rebuild(); draw(); return; }
    if (e.target.closest('[data-rand]')) {
      for (const S of SLOTS) {
        if (S.items) { const ok = S.items.filter(i => !locked(i.req)); cfg[S.key] = ok[Math.random() * ok.length | 0].id; }
        if (S.colorKey) { const ok = S.colors.map((_, i) => i).filter(i => !locked((COLOR_REQ[S.colorKey] || {})[i])); cfg[S.colorKey] = ok[Math.random() * ok.length | 0]; }
      }
      cfg.top2C = Math.random() * CLOTH.length | 0; if (Math.random() < 0.5) cfg.hat = 'none'; if (Math.random() < 0.5) cfg.face = 'none'; if (Math.random() < 0.5) cfg.body = 'none';
      rebuild(); draw(); return;
    }
    if (e.target.closest('[data-save]')) { close(); onSave(cfg); return; }
    if (e.target.closest('[data-cancel]')) { close(); onClose && onClose(); }
  });
  const close = () => { cancelAnimationFrame(raf); if (M) M.dispose(); R.dispose(); R.forceContextLoss && R.forceContextLoss(); W.remove(); };
  rebuild(); draw(); requestAnimationFrame(() => { resize(); loop(); });
}

// ---------- броня и предмет в руке на модели игрока ----------
function setArmorModel(M, armor) {
  if (M.armorMeshes) M.armorMeshes.forEach(m => { m.parent && m.parent.remove(m); m.geometry.dispose(); });
  M.armorMeshes = []; M.armorMat = M.armorMat || {};
  const add = (parent, s, w, h, d, x, y, z) => {
    const col = AMATS[IT[s.id].armor.mi].col; const mat = M.armorMat[col] || (M.armorMat[col] = lam(col)); mat.userData.base = mat.userData.base || new THREE.Color(col);
    const m = bx(w, h, d, mat, x, y, z); m.layers.enable(2); parent.add(m); M.armorMeshes.push(m);
  };
  const [hl, ch, lg, bt] = armor;
  if (hl) { add(M.head, hl, 9.4, 3.4, 9.4, 0, 6.9, 0); add(M.head, hl, 9.4, 5.4, 0.9, 0, 3.4, -4.4); add(M.head, hl, 0.9, 5.4, 9.4, -4.4, 3.4, 0); add(M.head, hl, 0.9, 5.4, 9.4, 4.4, 3.4, 0); }
  if (ch) { add(M.body, ch, 9, 12.4, 5, 0, 6, 0); add(M.armR, ch, 5, 5, 5, 0, -0.6, 0); add(M.armL, ch, 5, 5, 5, 0, -0.6, 0); }
  if (lg) { add(M.body, lg, 8.8, 2.6, 4.8, 0, 1.3, 0); add(M.legR, lg, 4.6, 8.6, 4.6, 0, -4.3, 0); add(M.legL, lg, 4.6, 8.6, 4.6, 0, -4.3, 0); }
  if (bt) { add(M.legR, bt, 4.9, 3.6, 4.9, 0, -10.2, 0); add(M.legL, bt, 4.9, 3.6, 4.9, 0, -10.2, 0); }
}
function setHeldModel(M, id) {
  if (M.held) { M.armR.remove(M.held); M.held.material.dispose(); M.mats = M.mats.filter(m => m !== M.held.material); M.held = null; }
  if (!id) return;
  const geo = itemGeometry(id), mat = Render.itemMat.clone(), mesh = new THREE.Mesh(geo, mat); M.mats.push(mat);
  if (geo.userData.flat) { mesh.scale.setScalar(0.55); mesh.position.set(0, -11 * PX, 3.5 * PX); mesh.rotation.set(-Math.PI / 2 + 0.3, Math.PI / 2, 0); }
  else { mesh.scale.setScalar(0.3); mesh.position.set(0, -11 * PX, 2 * PX); mesh.rotation.set(0.3, 0.6, 0); }
  mesh.layers.enable(2); M.armR.add(mesh); M.held = mesh;
}
