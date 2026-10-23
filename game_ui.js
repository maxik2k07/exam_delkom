// ===== ДелКрафт: интерфейс (HUD как в Minecraft, инвентарь, верстак, печь, сундук, меню) =====
const SPR = {};
function sprite(rows, pal) { // пиксельный спрайт → data URL (масштаб 2×)
  const h = rows.length, w = rows[0].length, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
}
function buildSprites() {
  const heart = ['..KK.KK..', '.KRRKRRK.', 'KRWRRRRRK', 'KRRRRRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....'];
  const half = heart.map(r => [...r].map((ch, x) => x > 4 && (ch === 'R' || ch === 'W') ? 'E' : ch).join(''));
  const empty = heart.map(r => r.replace(/[RW]/g, 'E'));
  const P1 = { K: '#000000', R: '#e01e1e', W: '#ffffff', E: '#3a0b0b' }, P2 = { K: '#ffffff', R: '#e01e1e', W: '#ffffff', E: '#6a2b2b' };
  SPR.hFull = sprite(heart, P1); SPR.hHalf = sprite(half, P1); SPR.hEmpty = sprite(empty, P1);
  SPR.hFullF = sprite(heart, P2); SPR.hHalfF = sprite(half, P2); SPR.hEmptyF = sprite(empty, P2);
  const food = ['....KKK..', '...KBBbK.', '..KBBbBK.', '..KBBBBK.', '.KKBBBK..', 'KWWKKK...', 'KWK......', '.K.......', '.........'];
  const fhalf = food.map(r => [...r].map((ch, x) => x < 5 && (ch === 'B' || ch === 'b') ? 'E' : ch).join(''));
  const fempty = food.map(r => r.replace(/[Bb]/g, 'E').replace(/W/g, 'e'));
  const FP = { K: '#000000', B: '#b5651d', b: '#e09a4a', W: '#f2f2f2', E: '#3a2a1a', e: '#5a5a5a' };
  SPR.fFull = sprite(food, FP); SPR.fHalf = sprite(fhalf, FP); SPR.fEmpty = sprite(fempty, FP);
  const arm = ['.KKK.KKK.', 'KAAAKAAAK', 'KALAAAAAK', 'KAAAAAAAK', '.KAAAAAK.', '.KAAAAAK.', '.KAAAAAK.', '.KKKKKKK.', '.........'];
  const ahalf = arm.map(r => [...r].map((ch, x) => x > 4 && (ch === 'A' || ch === 'L') ? 'E' : ch).join(''));
  const AP = { K: '#000000', A: '#c8c8c8', L: '#ffffff', E: '#3a3a3a' };
  SPR.aFull = sprite(arm, AP); SPR.aHalf = sprite(ahalf, AP); SPR.aEmpty = sprite(arm.map(r => r.replace(/[AL]/g, 'E')), AP);
  const bub = ['..KKKK...', '.KBBBBK..', 'KBWBBBBK.', 'KBWBBBBK.', 'KBBBBBBK.', 'KBBBBBBK.', '.KBBBBK..', '..KKKK...', '.........'];
  SPR.bub = sprite(bub, { K: '#1a4a8a', B: '#7ab8ff', W: '#ffffff' });
}

const UI = {
  init(shell) {
    buildSprites();
    this.shell = shell; this.cursor = null; this.hover = null; this.vx = 200; this.vy = 200; this.book = false; this.creativeTab = 0;
    const q = s => shell.querySelector(s);
    this.el = { hud: q('.mc-hud'), hearts: q('.mc-hearts'), food: q('.mc-food'), armor: q('.mc-armor'), air: q('.mc-air'), xp: q('.mc-xp'), hot: q('.mc-hotbar'), name: q('.mc-name'), top: q('.g-top'), msg: q('.g-msg'),
      cross: q('.mc-cross'), atk: q('.mc-atk'), overlay: q('.g-overlay'), cur: q('.mc-cursor'), tip: q('.mc-tip'), water: q('.g-water'), hurt: q('.g-hurt'), fire: q('.g-fire'), fade: q('.g-fade') };
    this.heartEls = Array.from({ length: 10 }, () => { const i = document.createElement('img'); this.el.hearts.appendChild(i); return i; });
    this.foodEls = Array.from({ length: 10 }, () => { const i = document.createElement('img'); this.el.food.appendChild(i); return i; });
    this.armorEls = Array.from({ length: 10 }, () => { const i = document.createElement('img'); this.el.armor.appendChild(i); return i; });
    this.airEls = Array.from({ length: 10 }, () => { const i = document.createElement('img'); i.src = SPR.bub; this.el.air.appendChild(i); return i; });
    this.prev = {};
  },
  // ---------- HUD ----------
  hud(g, dt, now) {
    const P = G.P, surv = g.mode === 'survival', E = this.el;
    E.hud.style.display = g.hideHud ? 'none' : '';
    E.hearts.style.visibility = E.food.style.visibility = surv ? 'visible' : 'hidden';
    if (surv) {
      const flash = P.hurtFlash > 0 && Math.floor(P.hurtFlash * 8) % 2 === 0, low = P.hp <= 4, regen = P.regenWave;
      this.heartEls.forEach((el, i) => {
        const v = P.hp - i * 2, s = v >= 2 ? (flash ? SPR.hFullF : SPR.hFull) : v === 1 ? (flash ? SPR.hHalfF : SPR.hHalf) : (flash ? SPR.hEmptyF : SPR.hEmpty);
        if (el._s !== s) { el.src = s; el._s = s; }
        let dy = low ? (Math.random() * 3 - 1.5) : 0; if (regen >= 0 && Math.floor(regen) === i) dy -= 3;
        el.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : '';
      });
      this.foodEls.forEach((el, i) => { const v = P.food - i * 2, s = v >= 2 ? SPR.fFull : v === 1 ? SPR.fHalf : SPR.fEmpty; if (el._s !== s) { el.src = s; el._s = s; } el.style.transform = P.food <= 0 || (P.sat <= 0 && Math.random() < dt * 2) ? `translateY(${(Math.random() * 2 - 1).toFixed(1)}px)` : ''; });
      const ar = g.armorPoints(); E.armor.style.visibility = ar > 0 ? 'visible' : 'hidden';
      this.armorEls.forEach((el, i) => { const v = ar - i * 2, s = v >= 2 ? SPR.aFull : v === 1 ? SPR.aHalf : SPR.aEmpty; if (el._s !== s) { el.src = s; el._s = s; } });
      const air = Math.ceil(P.air / 1.5); E.air.style.visibility = P.headWater || P.air < 15 ? 'visible' : 'hidden';
      this.airEls.forEach((el, i) => { el.style.opacity = 9 - i < air ? 1 : 0; });
    } else { E.armor.style.visibility = 'hidden'; E.air.style.visibility = 'hidden'; }
    // полоска опыта = уровень из тренировок
    const A = window.App, lv = A ? A.levelOf() : 1;
    if (A && this.prev.xp !== A.state.xp) { this.prev.xp = A.state.xp; const t = n => 25 * (n - 1) * (n + 2), p = (A.state.xp - t(lv)) / (t(lv + 1) - t(lv)); E.xp.querySelector('i').style.width = (p * 100).toFixed(1) + '%'; E.xp.querySelector('span').textContent = lv; }
    // хотбар
    const key = g.inv.main.slice(0, 9).map(s => s ? s.id + ':' + s.n + ':' + s.d : '-').join(',') + '|' + g.inv.sel + g.mode;
    if (key !== this.prev.hot) { this.prev.hot = key; E.hot.innerHTML = g.inv.main.slice(0, 9).map((s, i) => `<div class="mc-hslot ${i === g.inv.sel ? 'on' : ''}">${this.stackHTML(s, g.mode !== 'creative')}</div>`).join(''); }
    // прицел и индикатор атаки
    E.atk.style.width = P.atk < 1 ? (P.atk * 18).toFixed(0) + 'px' : '0px'; E.atk.style.opacity = P.atk < 1 ? 1 : 0;
    // эффекты
    E.water.style.opacity = P.headWater ? 1 : 0; E.hurt.style.opacity = P.hurtT > 0 ? Math.min(1, P.hurtT * 3) : 0; E.fire.style.opacity = P.fire > 0 && surv ? 1 : 0;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) E.msg.style.opacity = 0; }
    if (this.nameT > 0) { this.nameT -= dt; E.name.style.opacity = Math.min(1, this.nameT); }
    if (now - (this.prev.topT || 0) > 200) { this.prev.topT = now; E.top.innerHTML = g.topInfo(); }
  },
  stackHTML(s, counts = true) {
    if (!s) return '';
    const it = IT[s.id], dur = it && it.dur && s.d ? 1 - s.d / it.dur : null;
    return `<img src="${iconURL(s.id)}" alt="">${counts && s.n > 1 ? `<b class="n">${s.n}</b>` : ''}${dur != null ? `<span class="dur"><i style="width:${(dur * 100).toFixed(0)}%;background:hsl(${(dur * 120) | 0} 90% 45%)"></i></span>` : ''}`;
  },
  msg(t, sec = 2.6) { this.el.msg.textContent = t; this.el.msg.style.opacity = 1; this.msgT = sec; },
  itemName(s) { if (!s) { this.el.name.style.opacity = 0; return; } this.el.name.textContent = iname(s.id); this.nameT = 2.2; },
  // ---------- экраны ----------
  get g() { return G.game; },
  open(kind, data = {}) {
    const g = this.g; this.kind = kind; this.data = data; g.ui = kind; this.hover = null;
    if (kind === 'inv' || kind === 'craft') { this.gw = kind === 'craft' ? 3 : 2; this.grid = Array(this.gw * this.gw).fill(null); }
    this.el.overlay.style.display = 'grid'; this.el.overlay.classList.add('mc-dim');
    if (!document.pointerLockElement) this.el.cur.classList.add('native');
    this.render(); Snd.play(kind === 'chest' ? 'chest' : 'click');
  },
  close(silent) {
    const g = this.g;
    if (this.grid) { this.grid.forEach(s => s && g.giveOrDrop(s)); this.grid = null; }
    if (this.cursor) { g.giveOrDrop(this.cursor); this.cursor = null; }
    if (this.kind === 'chest' && this.data.lid) this.data.lid(false);
    this.kind = null; g.ui = null; this.el.overlay.style.display = 'none'; this.el.overlay.classList.remove('mc-dim'); this.el.overlay.innerHTML = ''; this.el.tip.style.display = 'none';
    this.drawCursor(); g.dirtyInv = true;
    if (!silent) Snd.play('click');
  },
  isInvUI() { return ['inv', 'craft', 'furnace', 'chest', 'creative'].includes(this.kind); },
  // ---------- доступ к слотам ----------
  getSlot(ref) {
    const g = this.g, [k, i] = ref.split(':'), n = +i;
    if (k === 'm') return g.inv.main[n]; if (k === 'a') return g.inv.armor[n]; if (k === 'c') return this.grid[n]; if (k === 'k') return this.data.cont.slots[n];
    if (k === 'f') return this.data.cont[['in', 'fuel', 'out'][n]];
    return null;
  },
  setSlot(ref, s) {
    const g = this.g, [k, i] = ref.split(':'), n = +i;
    if (s && s.n <= 0) s = null;
    if (k === 'm') g.inv.main[n] = s; else if (k === 'a') g.inv.armor[n] = s; else if (k === 'c') this.grid[n] = s; else if (k === 'k') this.data.cont.slots[n] = s; else if (k === 'f') this.data.cont[['in', 'fuel', 'out'][n]] = s;
    g.dirtyInv = true;
  },
  accepts(ref, s) {
    const [k, i] = ref.split(':');
    if (k === 'a') { const a = IT[s.id] && IT[s.id].armor; return !!a && a.slot === +i; }
    if (ref === 'f:2') return false;
    if (ref === 'f:1') return fuelOf(s.id) > 0;
    return true;
  },
  click(ref, btn, shift) {
    const g = this.g;
    if (ref === 'res') return this.clickResult(shift);
    if (ref.startsWith('cr:')) { const id = +ref.slice(3); if (shift) { const left = invAdd(g.inv.main, id, stackMax(id), 0, 0, 9); if (left) invAdd(g.inv.main, id, left, 0, 9, 36); } else if (this.cursor && this.cursor.id === id) this.cursor.n = Math.min(stackMax(id), this.cursor.n + (btn === 2 ? 1 : stackMax(id))); else this.cursor = mk(id, btn === 2 ? 1 : stackMax(id)); g.dirtyInv = true; return; }
    if (ref === 'trash') { this.cursor = null; return; }
    const s = this.getSlot(ref);
    if (shift && s) return this.quickMove(ref, s);
    if (ref === 'f:2') { if (!s) return; if (!this.cursor) { this.cursor = s; this.setSlot(ref, null); } else if (this.cursor.id === s.id && this.cursor.n + s.n <= stackMax(s.id)) { this.cursor.n += s.n; this.setSlot(ref, null); } this.furnaceXP(s); return; }
    const max = c => stackMax(c.id);
    if (btn === 0) {
      if (!this.cursor) { if (s) { this.cursor = s; this.setSlot(ref, null); } }
      else if (!s) { if (this.accepts(ref, this.cursor)) { this.setSlot(ref, this.cursor); this.cursor = null; } }
      else if (s.id === this.cursor.id && max(s) > 1) { const k = Math.min(this.cursor.n, max(s) - s.n); s.n += k; this.cursor.n -= k; if (!this.cursor.n) this.cursor = null; g.dirtyInv = true; }
      else if (this.accepts(ref, this.cursor)) { this.setSlot(ref, this.cursor); this.cursor = s; }
    } else {
      if (!this.cursor) { if (s) { const h = Math.ceil(s.n / 2); this.cursor = mk(s.id, h, s.d); s.n -= h; if (!s.n) this.setSlot(ref, null); g.dirtyInv = true; } }
      else if (!s) { if (this.accepts(ref, this.cursor)) { this.setSlot(ref, mk(this.cursor.id, 1, this.cursor.d)); if (!--this.cursor.n) this.cursor = null; } }
      else if (s.id === this.cursor.id && s.n < max(s)) { s.n++; if (!--this.cursor.n) this.cursor = null; g.dirtyInv = true; }
    }
  },
  furnaceXP() { },
  quickMove(ref, s) {
    const g = this.g, M = g.inv.main, [k, i] = ref.split(':'), n = +i;
    const into = (slot) => { const C = this.data.cont; if (!C[slot]) { C[slot] = s; return 0; } if (C[slot].id !== s.id) return s.n; const kk = Math.min(s.n, stackMax(s.id) - C[slot].n); C[slot].n += kk; return s.n - kk; };
    let left = s.n;
    if (k === 'm') {
      const a = IT[s.id] && IT[s.id].armor;
      if (a && !g.inv.armor[a.slot] && this.kind === 'inv') { g.inv.armor[a.slot] = s; this.setSlot(ref, null); return; }
      if (this.kind === 'chest') left = invAdd(this.data.cont.slots, s.id, s.n, s.d);
      else if (this.kind === 'furnace' && SMELT[s.id]) left = into('in');
      else if (this.kind === 'furnace' && fuelOf(s.id)) left = into('fuel');
      else left = n < 9 ? invAdd(M, s.id, s.n, s.d, 9, 36) : invAdd(M, s.id, s.n, s.d, 0, 9);
    } else { left = invAdd(M, s.id, s.n, s.d, 9, 36); left = invAdd(M, s.id, left, s.d, 0, 9); }
    if (left <= 0) this.setSlot(ref, null); else { s.n = left; this.setSlot(ref, s); }
  },
  result() { if (!this.grid) return null; return matchRecipe(this.grid, this.gw); },
  clickResult(shift) {
    const g = this.g; let rec = this.result(); if (!rec) return;
    let times = 0; const first = rec.out;
    do {
      const out = mk(rec.out, rec.n);
      if (shift) { if (!g.canFit(out)) break; g.giveStack(out); }
      else { if (this.cursor && (this.cursor.id !== rec.out || this.cursor.n + rec.n > stackMax(rec.out))) break; if (this.cursor) this.cursor.n += rec.n; else this.cursor = out; }
      this.grid.forEach((s, i) => { if (s) { s.n--; if (!s.n) this.grid[i] = null; } });
      times++; Snd.play('click');
      if (window.App && times === 1) G.game.onCraft(rec.out);
      rec = shift ? this.result() : null;
    } while (shift && rec && rec.out === first && times < 64);
    g.dirtyInv = true;
  },
  fillRecipe(rec) {
    const g = this.g, M = g.inv.main;
    if (rec.w > this.gw || rec.h > this.gw || (rec.sl && rec.items.length > this.gw * this.gw)) { this.g.ui && UI.msg('Нужен верстак (3×3)'); return; }
    this.grid.forEach((s, i) => { if (s) { invAdd(M, s.id, s.n, s.d); this.grid[i] = null; } });
    const need = recipeNeeds(rec); for (const [id, n] of need) if (invCount(M, id) < n) { UI.msg('Не хватает: ' + iname(id)); return; }
    if (rec.sl) rec.items.forEach((id, k) => { invRemove(M, id, 1); this.grid[k] = mk(id, 1); });
    else for (let r = 0; r < rec.h; r++) for (let c = 0; c < rec.w; c++) { const id = rec.ids[r * rec.w + c]; if (id) { invRemove(M, id, 1); this.grid[r * this.gw + c] = mk(id, 1); } }
    g.dirtyInv = true;
  },
  // ---------- отрисовка экранов ----------
  slot(ref, s, cls = '') { return `<div class="mc-slot ${cls} ${this.hover === ref ? 'hov' : ''}" data-s="${ref}">${this.stackHTML(s)}</div>`; },
  invRows() {
    const M = this.g.inv.main; let h = '<div class="mc-grid9">';
    for (let i = 9; i < 36; i++) h += this.slot('m:' + i, M[i]);
    h += '</div><div class="mc-grid9" style="margin-top:8px">'; for (let i = 0; i < 9; i++) h += this.slot('m:' + i, M[i]); return h + '</div>';
  },
  craftBlock() {
    const res = this.result();
    let h = `<div class="mc-craft"><div class="mc-gridN" style="grid-template-columns:repeat(${this.gw},40px)">`;
    for (let i = 0; i < this.gw * this.gw; i++) h += this.slot('c:' + i, this.grid[i]);
    h += `</div><div class="mc-arrow">➜</div>${this.slot('res', res ? mk(res.out, res.n) : null, 'big')}</div>`;
    return h;
  },
  bookHTML() {
    const g = this.g, M = g.inv.main, pool = M.concat(this.grid || []), have = id => pool.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
    const cats = ['Основы', 'Инструменты', 'Оружие', 'Броня', 'Еда', 'Строительство', 'Разное'];
    let h = '<div class="mc-panel mc-book"><div class="mc-title">📗 Рецепты</div><div class="mc-book-list">';
    for (const cat of cats) {
      const list = RECIPES.map((r, i) => ({ r, i })).filter(x => x.r.cat === cat); if (!list.length) continue;
      h += `<div class="mc-cat">${cat}</div><div class="mc-book-grid">`;
      for (const { r, i } of list) {
        const fits = !(r.w > this.gw || r.h > this.gw || (r.sl && r.items.length > this.gw * this.gw));
        const can = fits && [...recipeNeeds(r)].every(([id, n]) => have(id) >= n);
        h += `<div class="mc-slot sm ${can ? 'can' : 'cant'} ${this.hover === 'rb:' + i ? 'hov' : ''}" data-s="rb:${i}" title="${iname(r.out)}"><img src="${iconURL(r.out)}" alt="">${r.n > 1 ? `<b class="n">${r.n}</b>` : ''}</div>`;
      }
      h += '</div>';
    }
    return h + '</div></div>';
  },
  render() {
    const g = this.g, k = this.kind; if (!k) return;
    let body = '';
    if (k === 'inv') {
      const A = g.inv.armor, names = ['Шлем', 'Нагрудник', 'Поножи', 'Ботинки'];
      body = `<div class="mc-panel"><div class="mc-row"><div class="mc-col">${[0, 1, 2, 3].map(i => this.slot('a:' + i, A[i], A[i] ? '' : 'armor a' + i)).join('')}</div>
        <div class="mc-portrait"><img src="${g.portrait()}" alt=""></div>
        <div class="mc-col" style="justify-content:center"><div class="mc-title">Создание</div>${this.craftBlock()}</div></div>
        <div class="mc-title" style="margin-top:8px">Инвентарь</div>${this.invRows()}
        <div class="mc-foot"><span class="mc-btn" data-b="book">📗 ${this.book ? 'Скрыть рецепты' : 'Рецепты'}</span><span class="mc-hint">ЛКМ — взять/положить · ПКМ — половина/по одному · Shift+клик — быстро переложить · E — закрыть</span></div></div>`;
    } else if (k === 'craft') {
      body = `<div class="mc-panel"><div class="mc-title">Верстак</div>${this.craftBlock()}<div class="mc-title" style="margin-top:8px">Инвентарь</div>${this.invRows()}<div class="mc-foot"><span class="mc-btn" data-b="book">📗 ${this.book ? 'Скрыть рецепты' : 'Рецепты'}</span><span class="mc-hint">Нажми рецепт в книге — ингредиенты разложатся сами</span></div></div>`;
    } else if (k === 'furnace') {
      const C = this.data.cont, burn = C.burnMax ? C.burn / C.burnMax : 0, cook = C.cook / 6;
      body = `<div class="mc-panel"><div class="mc-title">Печь</div><div class="mc-furnace"><div class="mc-col">${this.slot('f:0', C.in)}<div class="mc-flame"><i style="height:${(burn * 100).toFixed(0)}%"></i></div>${this.slot('f:1', C.fuel)}</div>
        <div class="mc-progress"><i style="width:${(cook * 100).toFixed(0)}%"></i></div>${this.slot('f:2', C.out, 'big')}</div>
        <div class="mc-hint" style="margin:6px 0">Сверху — что плавить (руда, песок, сырое мясо, булыжник), снизу — топливо (уголь, доски, брёвна, палки)</div>
        <div class="mc-title">Инвентарь</div>${this.invRows()}</div>`;
    } else if (k === 'chest') {
      const S = this.data.cont.slots; let h = '<div class="mc-grid9">'; for (let i = 0; i < 27; i++) h += this.slot('k:' + i, S[i]); h += '</div>';
      body = `<div class="mc-panel"><div class="mc-title">Сундук</div>${h}<div class="mc-title" style="margin-top:8px">Инвентарь</div>${this.invRows()}</div>`;
    } else if (k === 'creative') {
      const tabs = [['Блоки', PLACEABLE_ALL()], ['Инструменты и оружие', IT.filter(t => t && (t.tool || t.bow || t.id === I.ARROW || t.id === I.FLINT_STEEL)).map(t => t.id)], ['Броня', IT.filter(t => t && t.armor).map(t => t.id)], ['Еда', IT.filter(t => t && t.food).map(t => t.id)], ['Материалы', IT.filter(t => t && !t.tool && !t.armor && !t.food && !t.bow && t.id !== I.FLINT_STEEL).map(t => t.id)]];
      const list = tabs[this.creativeTab][1];
      body = `<div class="mc-panel"><div class="mc-tabs">${tabs.map((t, i) => `<span class="mc-btn ${i === this.creativeTab ? 'on' : ''}" data-b="tab:${i}">${t[0]}</span>`).join('')}</div>
        <div class="mc-grid9 mc-scroll">${list.map(id => this.slot('cr:' + id, mk(id, 1))).join('')}</div>
        <div class="mc-title" style="margin-top:8px">Хотбар</div><div class="mc-row" style="align-items:center"><div class="mc-grid9">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => this.slot('m:' + i, g.inv.main[i])).join('')}</div><div class="mc-slot trash" data-s="trash" title="Удалить">🗑</div></div>
        <div class="mc-hint" style="margin-top:6px">Клик по предмету — взять стопку, Shift+клик — сразу в хотбар, корзина — удалить</div></div>`;
    }
    const book = (k === 'inv' || k === 'craft') && this.book ? this.bookHTML() : '';
    this.el.overlay.innerHTML = `<div class="mc-wrap">${book}${body}</div>`;
    this.drawCursor();
  },
  drawCursor() {
    const c = this.el.cur;
    c.querySelector('.stk').innerHTML = this.cursor ? this.stackHTML(this.cursor) : '';
    c.style.display = this.isInvUI() || this.cursor ? 'block' : 'none';
    c.style.transform = `translate(${this.vx}px, ${this.vy}px)`;
  },
  // события указателя (настоящая мышь или виртуальный курсор)
  pointer(type, x, y, btn, shift) {
    this.vx = x; this.vy = y;
    const el = document.elementFromPoint(x, y), sl = el && el.closest && el.closest('[data-s]'), bt = el && el.closest && el.closest('[data-b]');
    if (type === 'move') {
      const ref = sl ? sl.dataset.s : null;
      if (ref !== this.hover) { this.hover = ref; this.shell.querySelectorAll('.mc-slot.hov').forEach(e => e.classList.remove('hov')); if (sl) sl.classList.add('hov'); }
      const tip = this.el.tip;
      let s = null; if (ref) { if (ref === 'res') { const r = this.result(); s = r && mk(r.out, r.n); } else if (ref.startsWith('cr:')) s = mk(+ref.slice(3), 1); else if (ref.startsWith('rb:')) s = mk(RECIPES[+ref.slice(3)].out, 1); else if (ref !== 'trash') s = this.getSlot(ref); }
      if (s && !this.cursor) { const it = IT[s.id]; let t = iname(s.id); if (it && it.food) t += ` · еда +${it.food[0] / 2} 🍗`; if (it && it.dmg && it.tool) t += ` · урон ${it.dmg}`; if (it && it.armor) t += ` · броня +${it.armor.pts}`; if (it && it.dur) t += ` · прочность ${it.dur - (s.d || 0)}/${it.dur}`; if (ref.startsWith('rb:')) { const r = RECIPES[+ref.slice(3)]; t += ' — ' + [...recipeNeeds(r)].map(([id, n]) => iname(id) + ' ×' + n).join(', '); } tip.textContent = t; tip.style.display = 'block'; const r = this.shell.getBoundingClientRect(); tip.style.left = (x - r.left + 16) + 'px'; tip.style.top = (y - r.top - 8) + 'px'; }
      else tip.style.display = 'none';
      this.drawCursor(); return;
    }
    if (type === 'down') {
      if (bt) { const b = bt.dataset.b; if (b === 'book') { this.book = !this.book; this.render(); } else if (b.startsWith('tab:')) { this.creativeTab = +b.slice(4); this.render(); } else if (this.onButton) this.onButton(b); return; }
      if (sl) { const ref = sl.dataset.s; if (ref.startsWith('rb:')) { this.fillRecipe(RECIPES[+ref.slice(3)]); this.render(); return; } this.click(ref, btn, shift); this.render(); return; }
      // клик мимо окна — выбросить предмет из курсора
      if (this.cursor && el && !el.closest('.mc-panel')) { const c = this.cursor; this.cursor = null; G.game.dropFromPlayer(btn === 2 ? mk(c.id, 1, c.d) : c); if (btn === 2 && c.n > 1) { c.n--; this.cursor = c; } this.render(); }
    }
  }
};
const PLACEABLE_ALL = () => [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.MOSSY, B.STONEBRICK, B.SAND, B.GRAVEL, B.CLAY, B.LOG, B.BIRCH, B.PLANKS, B.LEAVES, B.BLEAVES, B.GLASS, B.BRICK, B.BOOKS, B.SNOWB, B.SNOW,
  B.WOOL_W, B.WOOL_R, B.WOOL_Y, B.WOOL_G, B.WOOL_B, B.WOOL_P, B.CRAFT, B.FURNACE, B.STORAGE, B.TORCH, B.GLOW, B.JACKO, B.PUMPKIN, B.TNT, B.BED, B.COAL, B.IRON, B.GOLD_ORE, B.DIAMOND_ORE, B.EMERALD_ORE,
  B.IRON_BLOCK, B.GOLD, B.DIAMOND, B.EMERALD, B.ROSE, B.DANDE, B.TGRASS, B.SAPLING, B.BSAPLING, B.FARMLAND, B.BEDROCK];
