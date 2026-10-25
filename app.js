(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const TOP = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const LV_XP = { A: 10, B: 15, C: 25 };

// ======================= STATE =======================
const KEY = 'delkom.v1';
const defState = () => ({
  xp: 0, q: {}, cards: {}, read: {}, ach: {}, days: {}, traps: {},
  best: { combo: 0 },
  stats: { correct: 0, wrong: 0, correctC: 0, cardsKnown: 0, cleared: 0, perfect: 0, chests: 0, broken: 0, placed: 0, kills: 0, nights: 0 },
  settings: { theme: 'auto', sound: true },
  skin: null, game: null
});
function load() {
  const d = defState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return Object.assign(d, s, { stats: Object.assign(d.stats, s.stats), settings: Object.assign(d.settings, s.settings), best: Object.assign(d.best, s.best) });
    }
  } catch (e) { /* хранилище недоступно — работаем в памяти */ }
  return d;
}
let S = load();
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 120); }
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
window.addEventListener('beforeunload', saveNow);

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function bumpDay(n = 1) { const k = dayKey(); S.days[k] = (S.days[k] || 0) + n; const h = new Date().getHours(); if (h >= 23 || h < 4) unlock('owl'); if (h >= 4 && h < 8) unlock('lark'); }
function streak() {
  let n = 0; const d = new Date();
  if (!S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ======================= LEVELS / XP =======================
const lvThr = n => 25 * (n - 1) * (n + 2);
const levelOf = xp => { let n = 1; while (xp >= lvThr(n + 1)) n++; return n; };
const TITLES = [[1, 'Стажёр'], [3, 'Младший специалист'], [5, 'Специалист'], [8, 'Старший специалист'], [11, 'Тимлид'], [14, 'Руководитель направления'], [17, 'Директор по коммуникациям'], [20, 'Легенда делкома']];
const titleOf = l => TITLES.filter(t => l >= t[0]).pop()[1];
function lvProgress() { const l = levelOf(S.xp), a = lvThr(l), b = lvThr(l + 1); return { l, cur: S.xp - a, need: b - a, p: Math.round((S.xp - a) / (b - a) * 100) }; }

function addXP(n, at) {
  if (!n) return;
  const before = levelOf(S.xp);
  S.xp += n; save();
  if (at) flyText('+' + n + ' XP', at);
  renderHud();
  const after = levelOf(S.xp);
  if (after > before) setTimeout(() => levelUp(after), 450);
}
function flyText(txt, at) {
  const r = at.getBoundingClientRect ? at.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
  const el = document.createElement('div');
  el.className = 'xp-fly'; el.textContent = txt;
  el.style.left = (r.left + r.width / 2 - 30) + 'px'; el.style.top = (r.top - 10) + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
}
function levelUp(l) {
  sfx('level'); confetti(160);
  const items = (window.SKIN_ITEMS || []).filter(it => it.req && it.req.lv === l);
  modal(`<div class="levelup"><div class="muted" style="font-weight:800;letter-spacing:.08em">НОВЫЙ УРОВЕНЬ</div><div class="big">${l}</div>
    <h2 style="margin:8px 0 4px">${esc(titleOf(l))}</h2><p class="muted">Так держать! Знания копятся — опыт растёт.</p>
    ${items.length ? `<p><b>Открыто в гардеробе:</b> ${items.map(i => esc(i.name)).join(', ')}</p>` : ''}
    <button class="btn big" data-close>Продолжить</button></div>`);
}

// ======================= ACHIEVEMENTS =======================
const ACH = [
  { id: 'first', i: '👣', n: 'Первый шаг', d: 'Ответить на первый вопрос' },
  { id: 'warm', i: '🔥', n: 'Разогрев', d: '10 верных ответов' },
  { id: 'hundred', i: '💯', n: 'Сотня', d: '100 верных ответов' },
  { id: 'k300', i: '🏛️', n: 'Энциклопедист', d: '300 верных ответов' },
  { id: 'combo10', i: '⚡', n: 'Комбо ×10', d: '10 верных подряд' },
  { id: 'combo25', i: '🌪️', n: 'Комбо ×25', d: '25 верных подряд' },
  { id: 'sniper', i: '🎯', n: 'Снайпер', d: 'Сессия из 10+ вопросов без единой ошибки' },
  { id: 'allc', i: '🧠', n: 'Мыслитель', d: '20 верных ответов уровня C' },
  { id: 'reader', i: '📚', n: 'Книжный червь', d: 'Отметить прочитанными все 10 конспектов' },
  { id: 'cards100', i: '🃏', n: 'Карточный мастер', d: '100 раз «знал» в карточках' },
  { id: 'clean', i: '🧹', n: 'Чистильщик', d: 'Исправить 10 ошибок (2 верных подряд)' },
  { id: 'topic', i: '🏅', n: 'Мастер темы', d: 'Освоить любую тему на 100%' },
  { id: 'traps', i: '🪤', n: 'Сапёр', d: 'Открыть все ловушки экзамена' },
  { id: 'streak3', i: '📅', n: 'Три дня подряд', d: 'Заниматься 3 дня подряд' },
  { id: 'streak7', i: '🗓️', n: 'Неделя подряд', d: 'Заниматься 7 дней подряд' },
  { id: 'owl', i: '🦉', n: 'Ночная сова', d: 'Заниматься после 23:00' },
  { id: 'lark', i: '🐦', n: 'Ранняя пташка', d: 'Заниматься до 8 утра (совет профи для 1:1!)' },
  { id: 'miner', i: '⛏️', n: 'Шахтёр', d: 'Сломать 100 блоков в игре' },
  { id: 'builder', i: '🧱', n: 'Строитель', d: 'Поставить 100 блоков в игре' },
  { id: 'chest', i: '🎁', n: 'Кладоискатель', d: 'Открыть 5 сундуков-викторин' },
  { id: 'hunter', i: '🗡️', n: 'Охотник', d: 'Победить 10 мобов' },
  { id: 'night', i: '🌙', n: 'Выживший', d: 'Пережить ночь в режиме выживания' }
];
function unlock(id) {
  if (S.ach[id]) return;
  S.ach[id] = Date.now(); save();
  const a = ACH.find(x => x.id === id); if (!a) return;
  sfx('ach'); toast(a.i, 'Достижение: ' + a.n, a.d);
  addXP(50);
}
function checkAch() {
  const st = S.stats;
  if (st.correct + st.wrong >= 1) unlock('first');
  if (st.correct >= 10) unlock('warm');
  if (st.correct >= 100) unlock('hundred');
  if (st.correct >= 300) unlock('k300');
  if (S.best.combo >= 10) unlock('combo10');
  if (S.best.combo >= 25) unlock('combo25');
  if (st.perfect >= 1) unlock('sniper');
  if (st.correctC >= 20) unlock('allc');
  if (TOPICS.every(t => S.read[t.id])) unlock('reader');
  if (st.cardsKnown >= 100) unlock('cards100');
  if (st.cleared >= 10) unlock('clean');
  if (TOPICS.some(t => topicStats(t.id).mastery === 100)) unlock('topic');
  if (TRAPS.every((_, i) => S.traps[i])) unlock('traps');
  const s = streak(); if (s >= 3) unlock('streak3'); if (s >= 7) unlock('streak7');
  if (st.broken >= 100) unlock('miner');
  if (st.placed >= 100) unlock('builder');
  if (st.chests >= 5) unlock('chest');
  if (st.kills >= 10) unlock('hunter');
  if (st.nights >= 1) unlock('night');
}
function isUnlocked(req) {
  if (!req) return true;
  if (req.lv && levelOf(S.xp) < req.lv) return false;
  if (req.ach && !S.ach[req.ach]) return false;
  return true;
}
const reqText = req => !req ? '' : req.lv ? `ур. ${req.lv}` : req.ach ? (ACH.find(a => a.id === req.ach) || {}).n || '' : '';

// ======================= QUESTION STATS =======================
const qState = id => S.q[id];
const isMastered = id => { const s = S.q[id]; return !!s && s.s >= 1 && !s.m; };
const mistakes = () => Q.filter(q => S.q[q.id] && S.q[q.id].m);
function record(q, ok) {
  const st = S.q[q.id] || (S.q[q.id] = { c: 0, w: 0, s: 0, m: 0 });
  if (ok) {
    st.c++; st.s++;
    if (st.m && st.s >= 2) { st.m = 0; S.stats.cleared++; }
    S.stats.correct++; if (q.lv === 'C') S.stats.correctC++;
  } else { st.w++; st.s = 0; st.m = 1; S.stats.wrong++; }
  st.l = Date.now();
  bumpDay(); save();
}
function topicStats(t) {
  const qs = Q.filter(q => q.t === t);
  let c = 0, w = 0, m = 0, mist = 0;
  const lv = { A: [0, 0], B: [0, 0], C: [0, 0] };
  for (const q of qs) { const s = S.q[q.id]; if (!s) continue; c += s.c; w += s.w; lv[q.lv][0] += s.c; lv[q.lv][1] += s.w; if (isMastered(q.id)) m++; if (s.m) mist++; }
  return { n: qs.length, c, w, acc: c + w ? Math.round(c / (c + w) * 100) : null, mastery: qs.length ? Math.round(m / qs.length * 100) : 0, mastered: m, mist, lv };
}

// ======================= SOUND =======================
let AC = null;
function sfx(kind) {
  if (!S.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { ok: [[660, .07], [990, .12]], bad: [[220, .16], [180, .18]], level: [[523, .1], [659, .1], [784, .1], [1047, .25]], ach: [[784, .08], [1175, .18]], flip: [[440, .04]], tick: [[880, .03]] }[kind] || [];
    let t = AC.currentTime;
    for (const [f, d] of seq) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? .06 : .12, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02); t += d * .9;
    }
  } catch (e) { /* без звука */ }
}

// ======================= UI HELPERS =======================
function toast(icon, title, text) {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; }
  const host = document.fullscreenElement || document.body; if (box.parentNode !== host) host.appendChild(box);
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<div class="i">${icon}</div><div><b>${esc(title)}</b><span class="muted small">${esc(text || '')}</span></div>`;
  box.appendChild(el); setTimeout(() => { el.style.transition = 'opacity .4s, transform .4s'; el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; setTimeout(() => el.remove(), 420); }, 3600);
}
let modalStack = [];
function modal(html, onClose) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); modalStack = modalStack.filter(m => m !== api); onClose && onClose(); };
  const api = { el: bg, box: $('.modal', bg), close };
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  (document.fullscreenElement || document.body).appendChild(bg); modalStack.push(api); // в полноэкранной игре окно показывается поверх неё
  return api;
}
function confetti(n = 120) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let c = $('#confetti'); if (!c) { c = document.createElement('canvas'); c.id = 'confetti'; }
  const host = document.fullscreenElement || document.body; if (c.parentNode !== host) host.appendChild(c);
  const ctx = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#7c4dff', '#ff4fa3', '#ffc21a', '#1fc16b', '#2ec5ff', '#ff4d5e'];
  const P = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.random() * cols.length | 0] }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of P) { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (++f < 150) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
  })();
}
const lvTag = lv => `<span class="tag lv${lv}" title="Уровень ${lv}: ${{ A: 'воспроизведение определений', B: 'понимание и сравнение', C: 'практическое применение' }[lv]}">Уровень ${lv}</span>`;
const topicTag = t => `<span class="tag" style="border-color:${TOP[t].color}">${TOP[t].icon} ${esc(TOP[t].n)}</span>`;
const isReal = q => /^Тест /.test(q.src);
const srcTag = q => `<span class="tag ${isReal(q) ? 'y25' : ''}">${isReal(q) ? '📝 ' : ''}${esc(q.src)}</span>`;

// ======================= HUD / THEME =======================
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  const b = $('#themeBtn'); if (b) b.textContent = t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '🌗';
}
function renderHud() {
  const p = lvProgress();
  const lb = $('#lvlBadge'); if (lb) { lb.dataset.l = p.l; lb.style.setProperty('--p', p.p); lb.title = `${titleOf(p.l)} · ${p.cur}/${p.need} XP до следующего уровня`; }
  const xp = $('#xpPill'); if (xp) xp.innerHTML = `⭐ ${S.xp}`;
  const st = $('#streakPill'); if (st) st.innerHTML = `🔥 ${streak()}`;
  const mb = $('#mistBadge'); const mc = mistakes().length; if (mb) { mb.textContent = mc; mb.classList.toggle('hidden', !mc); }
  const sb = $('#soundBtn'); if (sb) sb.textContent = S.settings.sound ? '🔊' : '🔇';
}

// ======================= ROUTER =======================
let keyHandler = null;
let leaveHook = null;
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function render() {
  if (leaveHook) { try { leaveHook(); } catch (e) { console.error(e); } leaveHook = null; }
  keyHandler = null; clearInterval(exTimer); exTimer = 0;
  const [route, arg] = (location.hash.slice(1) || 'home').split('/');
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  const main = $('#main'); main.innerHTML = '';
  window.scrollTo(0, 0);
  const views = { home: viewHome, theory: viewTheory, train: viewTrain, cards: viewCards, mistakes: viewMistakes, traps: viewTraps, stats: viewStats, search: viewSearch, game: viewGame, exam: viewExam };
  (views[route] || viewHome)(main, arg ? decodeURIComponent(arg) : '');
  renderHud(); checkAch();
}
window.addEventListener('hashchange', render);
document.addEventListener('keydown', e => {
  if (modalStack.length) {
    const m = modalStack[modalStack.length - 1];
    if (m.keys && m.keys(e)) return;
    if (e.key === 'Escape') { m.close(); e.preventDefault(); }
    return;
  }
  if (e.target.matches('input, textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
  if (e.key === '/' && !keyHandler?.grabSlash) { e.preventDefault(); $('#searchIn').focus(); return; }
  if (keyHandler) keyHandler(e);
});

// ======================= HOME =======================
function viewHome(main) {
  const p = lvProgress(), mc = mistakes().length;
  const answered = Object.keys(S.q).length;
  const totalMast = Q.filter(q => isMastered(q.id)).length;
  const ts = TOPICS.map(t => ({ t, s: topicStats(t.id) }));
  const weakest = ts.slice().sort((a, b) => a.s.mastery - b.s.mastery || (a.s.acc ?? 101) - (b.s.acc ?? 101))[0];
  const trap = TRAPS[(new Date().getDate() * 7) % TRAPS.length];
  main.innerHTML = `
  <section class="hero">
    <div class="card hero-main">
      <div class="row"><span class="tag" style="background:rgba(255,255,255,.2);color:#fff;border-color:transparent">Уровень ${p.l} · ${esc(titleOf(p.l))}</span></div>
      <h1 style="margin-top:12px">Деловые коммуникации — тренажёр</h1>
      <p class="sub">${Q.length} вопросов в стиле экзамена, ${TOPICS.length} конспектов, ${CARDS.length} карточек и ${TRAPS.length} ловушек. Экзамен <b>26.10 в 11:10</b>${(() => { const l = EXAM_AT - Date.now(); return l > 0 ? ` — осталось <b>${Math.floor(l / 3600000)} ч ${Math.floor(l % 3600000 / 60000)} мин</b>` : ''; })()}: 40 вопросов за 80 минут, A 50% · B 40% · C 10%, максимум 64 балла.</p>
      <div class="xpbar"><i style="width:${p.p}%"></i></div>
      <div class="row small" style="font-weight:800"><span>${p.cur} / ${p.need} XP до уровня ${p.l + 1}</span><span class="spacer"></span><span>⭐ ${S.xp} XP всего</span></div>
      <div class="row" style="margin-top:16px">
        <a class="btn warn big" href="#train">▶ Тренировка</a>
        <a class="btn big" href="#exam" style="background:#fff;color:var(--brand)">🎓 Пробный экзамен</a>
        ${mc ? `<a class="btn bad big" href="#mistakes">🩹 Ошибки (${mc})</a>` : ''}
        <a class="btn ghost big" href="#game" style="background:rgba(255,255,255,.18);color:#fff;border-color:transparent;box-shadow:0 4px 0 rgba(0,0,0,.18)">⛏️ Игра</a>
      </div>
    </div>
    <div class="card">
      <div class="kpis">
        <div class="kpi"><b>${totalMast}<span class="muted" style="font-size:15px"> / ${Q.length}</span></b><span>вопросов освоено</span></div>
        <div class="kpi"><b>${S.stats.correct + S.stats.wrong ? Math.round(S.stats.correct / (S.stats.correct + S.stats.wrong) * 100) + '%' : '—'}</b><span>точность ответов</span></div>
        <div class="kpi"><b>🔥 ${streak()}</b><span>дней подряд</span></div>
        <div class="kpi"><b>${mc}</b><span>в работе над ошибками</span></div>
      </div>
      <h3 style="margin:16px 0 8px">Что повторить сейчас</h3>
      <div class="small" style="display:flex;flex-direction:column;gap:8px">
        ${answered === 0 ? `<div>👋 Начни с <a href="#theory/l1">конспекта лекции 1</a> или сразу <a href="#train">тренировки</a> — система сама подберёт новые и слабые вопросы.</div>` : ''}
        ${mc ? `<div>🩹 <a href="#mistakes">${mc} вопрос(ов)</a> ждут исправления — каждый уходит после 2 верных ответов подряд.</div>` : ''}
        <div>📉 Слабее всего: <a href="#theory/${weakest.t.id}">${weakest.t.icon} ${esc(weakest.t.title)}</a> — освоено ${weakest.s.mastery}%.</div>
        <div class="trap closed" id="homeTrap" style="margin:4px 0 0"><div class="b">${esc(trap.bad)}</div><div class="g"><span>${esc(trap.good)}</span></div></div>
      </div>
    </div>
  </section>
  <h2>Темы курса</h2>
  <div class="grid g3">${ts.map(({ t, s }) => `
    <div class="card topic-card" style="--tc:${t.color}">
      <div class="top-row"><div class="t-ico">${t.icon}</div><div><div class="row" style="gap:6px"><span class="tag">${esc(t.n)}</span>${(() => { const r = Q.filter(q => q.t === t.id && isReal(q)).length; return r ? `<span class="tag y25">📝 ${r} из тестов 2026</span>` : ''; })()}</div><h3>${esc(t.title)}</h3></div>
        <div class="ring" style="--p:${s.mastery}"><span>${s.mastery}%</span></div></div>
      <div class="small muted">${s.n} вопросов · точность ${s.acc ?? '—'}${s.acc != null ? '%' : ''}${s.mist ? ` · <span style="color:var(--bad)">${s.mist} ошибок</span>` : ''}${S.read[t.id] ? ' · 📖 прочитано' : ''}</div>
      <div class="row"><a class="btn ghost sm" href="#theory/${t.id}">📖 Конспект</a><a class="btn sm" href="#train/${t.id}">🎯 Тренировать</a><a class="btn pink sm" href="#cards/${t.id}">🃏</a></div>
    </div>`).join('')}</div>
  <h2>Достижения <span class="muted small">${Object.keys(S.ach).length} / ${ACH.length}</span></h2>
  <div class="ach-shelf">${ACH.map(a => `<div class="ach ${S.ach[a.id] ? 'got' : 'lock'}" title="${esc(a.n)} — ${esc(a.d)}">${a.i}</div>`).join('')}</div>
  <p class="muted small" style="margin-top:22px">Горячие клавиши: <kbd>/</kbd> поиск · в тренировке <kbd>1</kbd>–<kbd>8</kbd> выбор, <kbd>Enter</kbd> проверить/дальше, <kbd>D</kbd> подробнее · в карточках <kbd>Пробел</kbd> перевернуть, <kbd>←</kbd>/<kbd>→</kbd> не знал/знал.</p>`;
  $('#homeTrap').addEventListener('click', e => e.currentTarget.classList.remove('closed'));
}

// ======================= THEORY =======================
function viewTheory(main, id) {
  const t = TOP[id] || TOPICS[0];
  const th = THEORY[t.id];
  const traps = TRAPS.map((x, i) => ({ ...x, i })).filter(x => x.t === t.id);
  const s = topicStats(t.id);
  main.innerHTML = `
  <div class="th-layout">
    <nav class="th-side">${TOPICS.map(x => `<a href="#theory/${x.id}" class="${x.id === t.id ? 'on' : ''}" style="--tc:${x.color}"><span class="n">${esc(x.n)}</span>${x.icon} ${esc(x.title)}${S.read[x.id] ? ' ✓' : ''}</a>`).join('')}</nav>
    <article class="card" style="--tc:${t.color}">
      <div class="row"><div class="t-ico">${t.icon}</div><div><div class="row" style="gap:6px"><span class="tag">${esc(t.n)}</span>${t.src === '2025' ? '<span class="tag y25">тема из тестов 2025</span>' : '<span class="tag">курс 2026</span>'}</div><h1 style="font-size:26px;margin:4px 0 0">${esc(t.title)}</h1></div>
        <span class="spacer"></span><div class="ring" style="--p:${s.mastery}"><span>${s.mastery}%</span></div></div>
      <div class="row" style="margin:14px 0 4px"><a class="btn sm" href="#train/${t.id}">🎯 Тренировать тему (${s.n})</a><a class="btn pink sm" href="#cards/${t.id}">🃏 Карточки (${CARDS.filter(c => c.t === t.id).length})</a></div>
      <div class="prose">${th.short}</div>
      <details class="full-toggle"><summary>📜 Развернуть полностью: детали, примеры и кейсы</summary><div class="prose">${th.full}</div></details>
      ${traps.length ? `<h2>🪤 Ловушки этой темы</h2><div class="small muted">Нажми на карточку, чтобы проверить себя.</div>${traps.map(x => `<div class="trap ${S.traps[x.i] ? '' : 'closed'}" data-i="${x.i}"><div class="b">${esc(x.bad)}</div><div class="g"><span>${esc(x.good)}</span></div></div>`).join('')}` : ''}
      <div class="row" style="margin-top:20px">
        ${S.read[t.id] ? '<span class="tag" style="font-size:14px">✓ Прочитано</span>' : `<button class="btn ok" id="markRead">✓ Отметить прочитанным (+20 XP)</button>`}
        <span class="spacer"></span>
        ${nextTopicLink(t.id)}
      </div>
    </article>
  </div>`;
  $$('.trap', main).forEach(el => el.addEventListener('click', () => { el.classList.remove('closed'); S.traps[el.dataset.i] = 1; save(); checkAch(); }));
  const side = $('.th-side', main), on = $('.th-side a.on', main);
  if (side && on && side.scrollWidth > side.clientWidth) side.scrollLeft = on.offsetLeft - 16;
  const mr = $('#markRead');
  if (mr) mr.addEventListener('click', () => { S.read[t.id] = 1; save(); addXP(20, mr); sfx('ok'); render(); });
}
function nextTopicLink(id) {
  const i = TOPICS.findIndex(t => t.id === id); const n = TOPICS[i + 1];
  return n ? `<a class="btn ghost" href="#theory/${n.id}">Дальше: ${n.icon} ${esc(n.n)} →</a>` : '';
}

// ======================= TRAINING =======================
const trainPrefs = { topics: new Set(TOPICS.map(t => t.id)), lv: new Set(['A', 'B', 'C']), src: 'all', order: 'smart', count: 20 };
function pickQuestions(pool, order, count) {
  if (order === 'random') return shuffle(pool).slice(0, count);
  if (order === 'seq') return pool.slice(0, count);
  const rank = q => { const s = S.q[q.id]; if (s && s.m) return 0; if (!s) return 1; if (!isMastered(q.id)) return 2; return 3; };
  const groups = [[], [], [], []];
  pool.forEach(q => groups[rank(q)].push(q));
  groups[3].sort((a, b) => (S.q[a.id].l || 0) - (S.q[b.id].l || 0));
  return [...shuffle(groups[0]), ...shuffle(groups[1]), ...shuffle(groups[2]), ...groups[3]].slice(0, count);
}
function viewTrain(main, arg) {
  if (arg && TOP[arg]) { trainPrefs.topics = new Set([arg]); }
  const draw = () => {
    const pool = Q.filter(q => trainPrefs.topics.has(q.t) && trainPrefs.lv.has(q.lv) && (trainPrefs.src === 'all' || (trainPrefs.src === 'real' ? isReal(q) : !isReal(q))));
    const chip = (on, label, attr) => `<span class="chip ${on ? 'on' : ''}" ${attr}>${label}</span>`;
    main.innerHTML = `
    <div class="quiz-wrap">
      <h1>🎯 Тренировка по темам</h1>
      <p class="sub">Сразу видишь разбор. Неверные ответы попадают в «Работу над ошибками» и уходят оттуда после 2 верных ответов подряд.</p>
      <div class="card setup">
        <div class="grp"><b>Темы</b><div class="chips">${chip(trainPrefs.topics.size === TOPICS.length, 'Все темы', 'data-all')}${TOPICS.map(t => chip(trainPrefs.topics.has(t.id), `${t.icon} ${esc(t.n)} ${esc(t.title)}`, `data-t="${t.id}"`)).join('')}</div></div>
        <div class="grp"><b>Уровни</b><div class="chips">${['A', 'B', 'C'].map(l => chip(trainPrefs.lv.has(l), { A: 'A · определения', B: 'B · понимание', C: 'C · кейсы' }[l], `data-lv="${l}"`)).join('')}</div></div>
        <div class="grp"><b>Источник</b><div class="chips">${[['all', 'Все'], ['real', '📝 Реальные тесты 2026'], ['new', 'Новые в формате тестов']].map(([v, l]) => chip(trainPrefs.src === v, l, `data-src="${v}"`)).join('')}</div></div>
        <div class="grp"><b>Порядок</b><div class="chips">${[['smart', '🧠 Умный: ошибки → новые → слабые'], ['random', '🎲 Случайно'], ['seq', '📋 По порядку']].map(([v, l]) => chip(trainPrefs.order === v, l, `data-ord="${v}"`)).join('')}</div></div>
        <div class="grp"><b>Сколько вопросов</b><div class="chips">${[10, 20, 40, 9999].map(n => chip(trainPrefs.count === n, n === 9999 ? 'Все' : n, `data-cnt="${n}"`)).join('')}</div></div>
        <div class="row" style="margin-top:18px"><button class="btn big" id="startBtn" ${pool.length ? '' : 'disabled'}>▶ Начать (${Math.min(pool.length, trainPrefs.count)} из ${pool.length})</button></div>
      </div>
    </div>`;
    $$('[data-t]', main).forEach(el => el.onclick = () => { const id = el.dataset.t; if (trainPrefs.topics.size === TOPICS.length) trainPrefs.topics = new Set([id]); else trainPrefs.topics.has(id) ? trainPrefs.topics.delete(id) : trainPrefs.topics.add(id); if (!trainPrefs.topics.size) trainPrefs.topics = new Set(TOPICS.map(t => t.id)); draw(); });
    $('[data-all]', main).onclick = () => { trainPrefs.topics = new Set(TOPICS.map(t => t.id)); draw(); };
    $$('[data-lv]', main).forEach(el => el.onclick = () => { const l = el.dataset.lv; trainPrefs.lv.has(l) && trainPrefs.lv.size > 1 ? trainPrefs.lv.delete(l) : trainPrefs.lv.add(l); draw(); });
    $$('[data-src]', main).forEach(el => el.onclick = () => { trainPrefs.src = el.dataset.src; draw(); });
    $$('[data-ord]', main).forEach(el => el.onclick = () => { trainPrefs.order = el.dataset.ord; draw(); });
    $$('[data-cnt]', main).forEach(el => el.onclick = () => { trainPrefs.count = +el.dataset.cnt; draw(); });
    $('#startBtn').onclick = () => runSession(main, pickQuestions(pool, trainPrefs.order, trainPrefs.count), { title: 'Тренировка' });
    keyHandler = e => { if (e.key === 'Enter' && pool.length) $('#startBtn').click(); };
  };
  draw();
}

// Рендер одного вопроса. onDone(ok) вызывается после проверки.
function renderQuestion(host, q, onChecked) {
  const order = q.fix ? q.o.map((_, i) => i) : shuffle(q.o.map((_, i) => i));
  const multi = !!q.m;
  const sel = new Set();
  let done = false;
  host.innerHTML = `
    <div class="qhead">${lvTag(q.lv)}${topicTag(q.t)}${srcTag(q)}${q.disp ? `<span class="tag disp" title="${esc(q.disp)}">⚠️ спорный</span>` : ''}</div>
    <p class="qtext">${esc(q.q)}</p>
    <div class="qhint">${multi ? '☑️ Выберите ВСЕ верные варианты, затем «Проверить» (Enter)' : '🔘 Один верный ответ — нажми вариант или клавишу 1–' + q.o.length}</div>
    <div class="opts">${order.map((oi, k) => `<button class="opt ${multi ? 'multi' : ''}" data-oi="${oi}"><span class="k">${k + 1}</span><span class="lab">${esc(q.o[oi])}</span></button>`).join('')}</div>
    <div class="qfoot">${multi ? '<button class="btn" id="checkBtn" disabled>Проверить <kbd>Enter</kbd></button>' : ''}</div>
    <div class="fb"></div>
    <div class="qfoot qnext"></div>`;
  const btns = $$('.opt', host);
  const check = () => {
    if (done) return; done = true;
    const right = new Set(q.a);
    const ok = right.size === sel.size && [...right].every(i => sel.has(i));
    btns.forEach(b => {
      const oi = +b.dataset.oi; b.disabled = true; b.classList.remove('sel');
      if (right.has(oi) && sel.has(oi)) { b.classList.add('right'); }
      else if (right.has(oi)) { b.classList.add(multi ? 'missed' : 'right'); if (multi) b.querySelector('.lab').insertAdjacentHTML('beforeend', '<span class="mark">← пропущен</span>'); }
      else if (sel.has(oi)) { b.classList.add('wrong'); }
    });
    const cb = $('#checkBtn', host); if (cb) cb.remove();
    const fb = $('.fb', host);
    fb.innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}">
      <h3>${ok ? pick(['✅ Верно!', '✅ Точно!', '✅ В яблочко!', '✅ Отлично!']) : '❌ ' + (multi ? 'Не совсем — нужен точный набор' : 'Неверно')}</h3>
      <div>${esc(q.why)}</div>
      ${q.disp ? `<div class="disp-note">⚠️ <b>Спорный вопрос:</b> ${esc(q.disp)}</div>` : ''}
      <div class="more hidden">${esc(q.more || '')}<div style="margin-top:8px"><a href="#theory/${q.t}">📖 Открыть конспект темы «${esc(TOP[q.t].title)}»</a></div></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" data-more>🔍 Подробнее <kbd>D</kbd></button></div>
    </div>`;
    $('[data-more]', fb).onclick = () => toggleMore();
    sfx(ok ? 'ok' : 'bad');
    onChecked(ok, fb);
  };
  const toggleMore = () => { const m = $('.more', host); if (m) { m.classList.toggle('hidden'); const b = $('[data-more]', host); if (b) b.remove(); } };
  btns.forEach(b => b.addEventListener('click', () => {
    if (done) return;
    const oi = +b.dataset.oi;
    if (multi) { sel.has(oi) ? sel.delete(oi) : sel.add(oi); b.classList.toggle('sel'); sfx('tick'); const cb = $('#checkBtn', host); if (cb) cb.disabled = !sel.size; }
    else { sel.add(oi); check(); }
  }));
  const cb = $('#checkBtn', host); if (cb) cb.onclick = check;
  return {
    key(e) {
      if (/^[1-9]$/.test(e.key)) { const b = btns[+e.key - 1]; if (b && !done) { b.click(); e.preventDefault(); return true; } }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') && done) { toggleMore(); return true; }
      if (e.key === 'Enter' && !done && multi && sel.size) { check(); e.preventDefault(); return true; }
      return false;
    },
    get done() { return done; }
  };
}
const pick = a => a[Math.random() * a.length | 0];

function runSession(main, list, opts = {}) {
  if (!list.length) { go('#train'); return; }
  let i = 0, combo = 0, xpGot = 0;
  const res = [];
  main.innerHTML = `<div class="quiz-wrap">
    <div class="qbar"><button class="icon-btn" id="quitBtn" title="Завершить">✕</button><div class="progress"><i style="width:0%"></i></div><div class="combo" id="combo"></div></div>
    <div class="card qcard" id="qhost"></div></div>`;
  const host = $('#qhost'), bar = $('.progress > i', main), comboEl = $('#combo');
  let cur = null;
  const next = () => {
    if (i >= list.length) return finish();
    const q = list[i];
    bar.style.width = (i / list.length * 100) + '%';
    cur = renderQuestion(host, q, (ok, fb) => {
      record(q, ok); res.push({ q, ok });
      if (ok) {
        combo++; S.best.combo = Math.max(S.best.combo, combo);
        let gain = LV_XP[q.lv]; if (combo > 0 && combo % 5 === 0) { gain += 10; toast('⚡', `Комбо ×${combo}!`, '+10 XP бонус'); }
        xpGot += gain; addXP(gain, fb);
      } else { combo = 0; xpGot += 2; addXP(2); }
      comboEl.textContent = combo >= 2 ? `🔥 ×${combo}` : '';
      comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop');
      bar.style.width = ((i + 1) / list.length * 100) + '%';
      $('.qnext', host).innerHTML = `<span class="muted small">${i + 1} / ${list.length}</span><span class="spacer"></span><button class="btn ${ok ? 'ok' : ''}" id="nextBtn">${i + 1 < list.length ? 'Дальше →' : 'Итоги 🏁'}</button>`;
      $('#nextBtn').onclick = () => { i++; next(); };
      $('#nextBtn').focus({ preventScroll: true });
      renderHud(); checkAch();
    });
  };
  const finish = () => {
    const okN = res.filter(r => r.ok).length, pct = res.length ? Math.round(okN / res.length * 100) : 0;
    if (res.length >= 10 && okN === res.length) { S.stats.perfect++; save(); }
    if (pct >= 80 && res.length >= 5) confetti(); sfx(pct >= 60 ? 'level' : 'flip');
    const wrong = res.filter(r => !r.ok);
    const byLv = ['A', 'B', 'C'].map(l => { const r = res.filter(x => x.q.lv === l); return r.length ? `${l}: ${r.filter(x => x.ok).length}/${r.length}` : ''; }).filter(Boolean).join(' · ');
    main.innerHTML = `<div class="quiz-wrap">
      <div class="card result-hero">
        <div class="score">${pct}%</div>
        <h2 style="margin:10px 0 4px">${pct >= 90 ? '🏆 Блестяще!' : pct >= 75 ? '🎉 Отличный результат!' : pct >= 50 ? '💪 Неплохо — есть что подтянуть' : '📚 Время повторить конспект'}</h2>
        <p class="muted">${okN} из ${res.length} верно · ${byLv} · +${xpGot} XP</p>
        <div class="row" style="justify-content:center;margin-top:12px">
          ${wrong.length ? `<button class="btn bad" id="redoWrong">🩹 Повторить ошибки (${wrong.length})</button>` : ''}
          <button class="btn" id="again">🔁 Ещё сессия</button><a class="btn ghost" href="#home">На главную</a>
        </div>
      </div>
      ${wrong.length ? `<h2>Разбор ошибок</h2><div class="card mist-list">${wrong.map(({ q }) => `<div class="mi"><div class="row" style="gap:6px;margin-bottom:4px">${lvTag(q.lv)}${topicTag(q.t)}</div><b>${esc(q.q)}</b><div class="ans">✔ ${q.a.map(i => esc(q.o[i])).join('<br>✔ ')}</div><div class="muted small">${esc(q.why)}</div></div>`).join('')}</div>` : ''}
    </div>`;
    const rw = $('#redoWrong'); if (rw) rw.onclick = () => runSession(main, shuffle(wrong.map(r => r.q)), opts);
    $('#again').onclick = () => opts.again ? opts.again() : go('#train');
    keyHandler = e => { if (e.key === 'Enter') $('#again').click(); };
    renderHud(); checkAch();
  };
  $('#quitBtn').onclick = () => { if (res.length) finish(); else go('#train'); };
  keyHandler = e => {
    if (cur && cur.key(e)) return;
    if ((e.key === 'Enter' || e.key === 'ArrowRight') && cur && cur.done) { const nb = $('#nextBtn'); if (nb) { e.preventDefault(); nb.click(); } }
    if (e.key === 'Escape') $('#quitBtn').click();
  };
  next();
}

// Один вопрос в модальном окне (для сундуков в игре).
function askOne(filter, cb) {
  const pool = Q.filter(filter || (() => true));
  const q = pickQuestions(pool, 'smart', 12)[Math.random() * Math.min(12, pool.length) | 0] || pool[0];
  const m = modal(`<div class="row" style="margin-bottom:8px"><b style="font-size:18px">🎁 Сундук-викторина</b><span class="spacer"></span><span class="muted small">Ответь верно — получишь редкие блоки</span></div><div id="oneq"></div>`, () => cb && cb(result));
  let result = null;
  const r = renderQuestion($('#oneq', m.box), q, (ok, fb) => {
    record(q, ok); result = ok;
    if (ok) addXP(LV_XP[q.lv] + 15, fb); else addXP(2);
    fb.insertAdjacentHTML('beforeend', `<div class="row" style="margin-top:12px"><button class="btn ${ok ? 'ok' : ''}" data-close>${ok ? 'Забрать награду 🎉' : 'Понятно'}</button></div>`);
    renderHud(); checkAch();
  });
  m.keys = e => { if (r.key(e)) return true; if (e.key === 'Enter' && r.done) { m.close(); return true; } return false; };
}

// ======================= FLASH CARDS =======================
const cardId = c => c.t + ':' + c.f;
function viewCards(main, arg) {
  const deckT = arg && TOP[arg] ? arg : null;
  if (!deckT && arg !== 'all' && arg !== 'weak') {
    main.innerHTML = `<h1>🃏 Карточки</h1><p class="sub">Определения и списки уровня A. Переверни карточку, честно отметь «знал» или «не знал» — незнакомые вернутся в конец колоды.</p>
    <div class="grid g3">
      <a class="card topic-card" href="#cards/weak" style="--tc:var(--pink);text-decoration:none;color:inherit"><div class="top-row"><div class="t-ico">🎯</div><div><h3>Слабые карточки</h3><div class="muted small">те, что ещё не отмечены «знал»</div></div></div></a>
      <a class="card topic-card" href="#cards/all" style="--tc:var(--brand);text-decoration:none;color:inherit"><div class="top-row"><div class="t-ico">🌈</div><div><h3>Все карточки вперемешку</h3><div class="muted small">${CARDS.length} шт.</div></div></div></a>
      ${TOPICS.map(t => { const cs = CARDS.filter(c => c.t === t.id); const k = cs.filter(c => (S.cards[cardId(c)] || {}).k > 0).length; return `<a class="card topic-card" href="#cards/${t.id}" style="--tc:${t.color};text-decoration:none;color:inherit"><div class="top-row"><div class="t-ico">${t.icon}</div><div><h3>${esc(t.n)} · ${esc(t.title)}</h3><div class="muted small">${k} / ${cs.length} знаю</div></div></div><div class="bar"><i style="width:${cs.length ? k / cs.length * 100 : 0}%"></i></div></a>`; }).join('')}
    </div>`;
    return;
  }
  let deck = deckT ? CARDS.filter(c => c.t === deckT) : arg === 'weak' ? CARDS.filter(c => !((S.cards[cardId(c)] || {}).k > 0)) : CARDS.slice();
  deck = shuffle(deck);
  if (!deck.length) { main.innerHTML = `<div class="card result-hero"><div class="score">🎉</div><h2>Все карточки отмечены «знал»!</h2><a class="btn" href="#cards">К колодам</a></div>`; return; }
  const total = deck.length; let known = 0, flipped = false;
  main.innerHTML = `<div class="quiz-wrap">
    <div class="qbar"><a class="icon-btn" href="#cards" title="К колодам" style="text-decoration:none">✕</a><div class="progress"><i style="width:0%"></i></div><div class="combo" id="fcCount"></div></div>
    <div class="fc-stage"><div class="fc" id="fc"><div class="face front"></div><div class="face back"></div></div>
    <div class="fc-actions"><button class="btn bad big" id="noBtn">← Не знал</button><button class="btn ok big" id="yesBtn">Знал →</button></div>
    <p class="muted small" style="text-align:center;margin-top:16px"><kbd>Пробел</kbd> перевернуть · <kbd>←</kbd> не знал · <kbd>→</kbd> знал</p></div></div>`;
  const fc = $('#fc'), bar = $('.progress > i', main);
  const show = () => {
    if (!deck.length) {
      addXP(0); confetti(80); sfx('level');
      main.innerHTML = `<div class="quiz-wrap"><div class="card result-hero"><div class="score">${total}/${total}</div><h2>Колода пройдена! 🎉</h2><p class="muted">С первого раза знал: ${known} из ${total}</p><div class="row" style="justify-content:center"><a class="btn" href="#cards/${arg}">🔁 Ещё раз</a><a class="btn ghost" href="#cards">К колодам</a>${deckT ? `<a class="btn pink" href="#train/${deckT}">🎯 Тренировать тему</a>` : ''}</div></div></div>`;
      keyHandler = null; return;
    }
    const c = deck[0], wasFlipped = flipped;
    fc.classList.remove('flip'); flipped = false;
    fc.style.setProperty('--tc', TOP[c.t].color);
    $('.front', fc).innerHTML = `<span class="t">${topicTag(c.t)}</span>${esc(c.f)}`;
    // оборот меняем после того, как карточка повернётся лицом, чтобы не подсмотреть ответ
    setTimeout(() => { $('.back', fc).innerHTML = `<span class="t">${topicTag(c.t)}</span>${esc(c.b)}`; }, wasFlipped ? 280 : 0);
    $('#fcCount').textContent = `${total - deck.length}/${total}`;
    bar.style.width = ((total - deck.length) / total * 100) + '%';
  };
  const flip = () => { fc.classList.toggle('flip'); flipped = !flipped; sfx('flip'); };
  const answer = ok => {
    const c = deck.shift(); const st = S.cards[cardId(c)] || (S.cards[cardId(c)] = { k: 0, u: 0 });
    if (ok) { st.k++; S.stats.cardsKnown++; if (!c._again) known++; addXP(2, $('#yesBtn')); }
    else { st.u++; st.k = 0; c._again = true; deck.splice(Math.min(deck.length, 3 + (Math.random() * 3 | 0)), 0, c); addXP(1); }
    bumpDay(); save(); renderHud(); checkAch(); show();
  };
  fc.onclick = flip;
  $('#noBtn').onclick = () => answer(false);
  $('#yesBtn').onclick = () => answer(true);
  keyHandler = e => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flip(); }
    else if (e.key === 'ArrowLeft' || e.key === '1') answer(false);
    else if (e.key === 'ArrowRight' || e.key === '2') answer(true);
  };
  show();
}

// ======================= MISTAKES =======================
function viewMistakes(main) {
  const ms = mistakes();
  if (!ms.length) {
    main.innerHTML = `<div class="quiz-wrap"><div class="card result-hero"><div class="score">✨</div><h2>Ошибок нет!</h2><p class="muted">Сюда попадают вопросы, на которые ты ответил неверно. Каждый уходит после 2 верных ответов подряд.${S.stats.cleared ? ` Уже исправлено: ${S.stats.cleared}.` : ''}</p><a class="btn big" href="#train">▶ К тренировке</a></div></div>`;
    return;
  }
  const by = TOPICS.map(t => ({ t, n: ms.filter(q => q.t === t.id).length })).filter(x => x.n);
  main.innerHTML = `<div class="quiz-wrap">
    <h1>🩹 Работа над ошибками</h1>
    <p class="sub">${ms.length} вопрос(ов). Вопрос уходит отсюда после <b>2 верных ответов подряд</b>; новая ошибка сбрасывает счётчик.</p>
    <div class="card"><div class="row">${by.map(x => `<span class="tag" style="font-size:13.5px;border-color:${x.t.color}">${x.t.icon} ${esc(x.t.n)}: ${x.n}</span>`).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn bad big" id="goMist">▶ Исправлять все (${ms.length})</button><span class="muted small">Исправлено за всё время: ${S.stats.cleared}</span></div></div>
    <h2>Список</h2>
    <div class="card mist-list">${ms.map(q => { const s = S.q[q.id]; return `<div class="mi"><div class="row" style="gap:6px;margin-bottom:4px">${lvTag(q.lv)}${topicTag(q.t)}<span class="tag">прогресс ${Math.min(s.s, 2)}/2</span><span class="tag">ошибок: ${s.w}</span></div><b>${esc(q.q)}</b></div>`; }).join('')}</div></div>`;
  $('#goMist').onclick = () => runSession(main, shuffle(ms), { again: () => go('#mistakes') });
  keyHandler = e => { if (e.key === 'Enter') $('#goMist').click(); };
}

// ======================= TRAPS =======================
function viewTraps(main) {
  const opened = TRAPS.filter((_, i) => S.traps[i]).length;
  main.innerHTML = `<h1>🪤 Ловушки экзамена</h1>
  <p class="sub">Типичные путаницы, на которых строятся дистракторы. Сначала вспомни, как правильно, потом нажми на карточку. Открыто: ${opened} / ${TRAPS.length}.</p>
  <div class="row" style="margin-bottom:12px"><button class="btn ghost sm" id="openAll">Открыть все</button><button class="btn ghost sm" id="closeAll">Закрыть все (проверить себя)</button></div>
  ${TOPICS.map(t => { const xs = TRAPS.map((x, i) => ({ ...x, i })).filter(x => x.t === t.id); return xs.length ? `<h2>${t.icon} ${esc(t.n)} · ${esc(t.title)}</h2>${xs.map(x => `<div class="trap ${S.traps[x.i] ? '' : 'closed'}" data-i="${x.i}"><div class="b">${esc(x.bad)}</div><div class="g"><span>${esc(x.good)}</span></div></div>`).join('')}` : ''; }).join('')}`;
  $$('.trap', main).forEach(el => el.addEventListener('click', () => { el.classList.remove('closed'); S.traps[el.dataset.i] = 1; save(); checkAch(); }));
  $('#openAll').onclick = () => { $$('.trap', main).forEach(el => { el.classList.remove('closed'); S.traps[el.dataset.i] = 1; }); save(); checkAch(); };
  $('#closeAll').onclick = () => $$('.trap', main).forEach(el => el.classList.add('closed'));
}

// ======================= STATS =======================
function heatColor(p) { if (p == null) return null; const h = Math.round(p * 1.25); return `hsl(${h} 72% ${p > 60 ? 42 : 48}%)`; }
function viewStats(main) {
  const all = S.stats.correct + S.stats.wrong;
  const days = []; const d = new Date(); d.setDate(d.getDate() - 29);
  for (let i = 0; i < 30; i++) { days.push({ k: dayKey(d), n: S.days[dayKey(d)] || 0 }); d.setDate(d.getDate() + 1); }
  const maxD = Math.max(1, ...days.map(x => x.n));
  const lvTot = { A: [0, 0], B: [0, 0], C: [0, 0] };
  TOPICS.forEach(t => { const s = topicStats(t.id); ['A', 'B', 'C'].forEach(l => { lvTot[l][0] += s.lv[l][0]; lvTot[l][1] += s.lv[l][1]; }); });
  const cell = (c, w) => { const n = c + w; if (!n) return `<div class="cell na">—</div>`; const p = Math.round(c / n * 100); return `<div class="cell" style="background:${heatColor(p)}" title="${c} верно / ${w} ошибок">${p}%</div>`; };
  main.innerHTML = `<h1>📊 Статистика</h1><p class="sub">Тепловая карта показывает точность ответов по темам и уровням. Цель — всё зелёное.</p>
  <div class="grid g4">
    <div class="kpi card"><b>${all}</b><span>ответов всего</span></div>
    <div class="kpi card"><b>${all ? Math.round(S.stats.correct / all * 100) + '%' : '—'}</b><span>точность</span></div>
    <div class="kpi card"><b>${Q.filter(q => isMastered(q.id)).length}/${Q.length}</b><span>освоено вопросов</span></div>
    <div class="kpi card"><b>${S.best.combo}</b><span>лучшее комбо</span></div>
  </div>
  <h2>Тепловая карта</h2>
  <div class="card" style="overflow-x:auto"><div class="heat">
    <div class="h">Тема</div><div class="h">A</div><div class="h">B</div><div class="h">C</div><div class="h">Освоено</div><div class="h">Ошибки</div>
    ${TOPICS.map(t => { const s = topicStats(t.id); return `<a class="name" href="#train/${t.id}" style="color:inherit;text-decoration:none">${t.icon} ${esc(t.n)} <span class="muted small">${esc(t.title)}</span></a>${cell(...s.lv.A)}${cell(...s.lv.B)}${cell(...s.lv.C)}${s.c + s.w ? `<div class="cell" style="background:${heatColor(s.mastery)}">${s.mastery}%</div>` : '<div class="cell na">—</div>'}<div class="cell ${s.mist ? '' : 'na'}" style="${s.mist ? 'background:var(--bad)' : ''}">${s.mist || '0'}</div>`; }).join('')}
    <div class="name"><b>Итого по уровням</b></div>${cell(...lvTot.A)}${cell(...lvTot.B)}${cell(...lvTot.C)}<div></div><div></div>
  </div></div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3 style="margin-top:0">Активность за 30 дней · 🔥 серия ${streak()}</h3><div class="cal">${days.map(x => `<i title="${x.k}: ${x.n}" style="background:${x.n ? `color-mix(in srgb, var(--ok) ${30 + Math.round(x.n / maxD * 70)}%, var(--line))` : ''}"></i>`).join('')}</div></div>
    <div class="card"><h3 style="margin-top:0">Прогресс</h3>
      <div class="small" style="display:grid;grid-template-columns:1fr auto;gap:6px">
        <span>Карточек «знал»</span><b>${S.stats.cardsKnown}</b><span>Ошибок исправлено</span><b>${S.stats.cleared}</b>
        <span>Конспектов прочитано</span><b>${Object.keys(S.read).length}/${TOPICS.length}</b><span>Ловушек открыто</span><b>${Object.keys(S.traps).length}/${TRAPS.length}</b>
        <span>Сундуков открыто в игре</span><b>${S.stats.chests}</b><span>Достижений</span><b>${Object.keys(S.ach).length}/${ACH.length}</b>
      </div></div>
  </div>
  <h2>Данные</h2>
  <div class="card"><p class="small muted" style="margin-top:0">Прогресс хранится в этом браузере. Локальный файл и версия на GitHub хранят его раздельно — переноси через экспорт/импорт.</p>
    <div class="row"><button class="btn ghost sm" id="exp">⬇ Экспорт прогресса</button><label class="btn ghost sm">⬆ Импорт<input type="file" id="imp" accept="application/json" hidden></label><span class="spacer"></span><button class="btn bad sm" id="reset">Сбросить всё</button></div></div>`;
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = `delkom-progress-${dayKey()}.json`; a.click(); };
  $('#imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (typeof d.xp !== 'number') throw 0; localStorage.setItem(KEY, t); S = load(); toast('✅', 'Прогресс импортирован', ''); render(); } catch (er) { toast('⚠️', 'Не получилось', 'Файл не похож на экспорт тренажёра'); } }); };
  $('#reset').onclick = () => { const m = modal(`<h2 style="margin-top:0">Сбросить весь прогресс?</h2><p class="muted">XP, ответы, достижения, карточки, мир в игре и гардероб будут удалены.</p><div class="row"><button class="btn bad" id="yesReset">Да, сбросить</button><button class="btn ghost" data-close>Отмена</button></div>`); $('#yesReset', m.box).onclick = () => { S = defState(); saveNow(); try { localStorage.removeItem('delkom.world'); } catch (e) {} m.close(); render(); }; };
}

// ======================= SEARCH =======================
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
let SIDX = null;
function buildIndex() {
  SIDX = [];
  for (const t of TOPICS) for (const part of ['short', 'full']) {
    const blocks = THEORY[t.id][part].split(/<(?:h4|p|li|tr|div class="mn")[^>]*>/);
    for (const b of blocks) { const txt = strip(b); if (txt.length > 12) SIDX.push({ kind: 'theory', t: t.id, txt }); }
  }
  Q.forEach(q => SIDX.push({ kind: 'q', t: q.t, q, txt: q.q + ' ' + q.o.join(' ') + ' ' + q.why }));
  CARDS.forEach(c => SIDX.push({ kind: 'card', t: c.t, txt: c.f + ' — ' + c.b }));
  TRAPS.forEach(c => SIDX.push({ kind: 'trap', t: c.t, txt: c.bad + ' → ' + c.good }));
}
function hl(txt, words) {
  let s = esc(txt);
  for (const w of words) { if (w.length < 2) continue; s = s.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); }
  return s;
}
function viewSearch(main, query) {
  if (!SIDX) buildIndex();
  const words = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const inp = $('#searchIn'); if (inp && inp.value !== query) inp.value = query || '';
  if (!words.length) { main.innerHTML = `<h1>🔎 Поиск</h1><p class="sub">Введи слово в поле поиска сверху: «Берло», «BATNA», «рекламация», «SCQA»…</p>`; return; }
  const hits = SIDX.filter(x => { const l = x.txt.toLowerCase(); return words.every(w => l.includes(w)); });
  const lab = { theory: '📖 Конспект', q: '❓ Вопрос', card: '🃏 Карточка', trap: '🪤 Ловушка' };
  const cut = (txt) => { const l = txt.toLowerCase(); const i = Math.max(0, l.indexOf(words[0]) - 80); return (i > 0 ? '…' : '') + txt.slice(i, i + 320) + (txt.length > i + 320 ? '…' : ''); };
  main.innerHTML = `<h1>🔎 «${esc(query)}»</h1><p class="sub">Найдено: ${hits.length}${hits.length > 80 ? ' (показаны первые 80)' : ''}</p>
  <div class="card">${hits.slice(0, 80).map(x => `<div class="sr"><div class="row" style="gap:6px;margin-bottom:4px"><span class="tag">${lab[x.kind]}</span>${topicTag(x.t)}${x.kind === 'theory' ? `<a class="small" href="#theory/${x.t}">открыть конспект →</a>` : ''}</div>
    ${x.kind === 'q' ? `<b>${hl(x.q.q, words)}</b><div class="small" style="color:var(--ok-d);font-weight:700;margin-top:4px">✔ ${x.q.a.map(i => hl(x.q.o[i], words)).join(' · ✔ ')}</div><div class="small muted">${hl(x.q.why, words)}</div>` : `<div>${hl(cut(x.txt), words)}</div>`}
  </div>`).join('') || '<p class="muted">Ничего не найдено. Попробуй другое слово или часть слова.</p>'}</div>`;
}

// ======================= ПРОБНЫЙ ЭКЗАМЕН =======================
// Как StartExam: 40 вопросов (20 A · 16 B · 4 C), 80 минут, баллы 1/2/3 (максимум 64), «выберите все» — только полный набор.
const EXAM_AT = new Date('2026-10-26T11:10:00+03:00').getTime();
const PTS = { A: 1, B: 2, C: 3 };
const GRADES = [[63, 10], [61, 9], [60, 8], [57, 7], [54, 6], [50, 5], [44, 4], [36, 3], [28, 2], [0, 1]];
const gradeOf = raw => GRADES.find(([min]) => raw >= min)[1];
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
let exTimer = 0;
function examState() { return S.exam || (S.exam = { run: null, hist: [], last: null }); }
function buildMock() {
  const pickLv = (lv, n) => {
    const pool = shuffle(Q.filter(q => q.lv === lv)), out = [], cnt = {}, cap = t => t === 'lit' ? 1 : Math.ceil(n / 8) + 1;
    for (const t of TOPICS.map(x => x.id).filter(t => t !== 'lit')) { const q = pool.find(x => x.t === t); if (q && out.length < n) { out.push(q); cnt[t] = 1; } }
    for (const q of pool) { if (out.length >= n) break; if (out.includes(q) || (cnt[q.t] || 0) >= cap(q.t)) continue; cnt[q.t] = (cnt[q.t] || 0) + 1; out.push(q); }
    for (const q of pool) { if (out.length >= n) break; if (!out.includes(q)) out.push(q); }
    return shuffle(out);
  };
  const qs = [...pickLv('A', 20), ...pickLv('B', 16), ...pickLv('C', 4)];
  return { at: Date.now(), ids: qs.map(q => q.id), ord: Object.fromEntries(qs.map(q => [q.id, q.fix ? q.o.map((_, i) => i) : shuffle(q.o.map((_, i) => i))])), ans: {}, flags: {}, i: 0, confirm: false };
}
const QBY = id => Q.find(q => q.id === id);
const isRight = (q, a) => !!a && a.length === q.a.length && q.a.every(i => a.includes(i));
function finishExam() {
  const E = examState(), run = E.run; if (!run) return;
  let raw = 0, ok = 0; const byT = {};
  run.ids.forEach(id => { const q = QBY(id); if (!q) return; const a = run.ans[id], r = isRight(q, a); if (r) { raw += PTS[q.lv]; ok++; } const t = byT[q.t] = byT[q.t] || { ok: 0, n: 0 }; t.n++; if (r) t.ok++; if (a && a.length) record(q, r); });
  E.hist.push({ at: run.at, raw, ok, grade: gradeOf(raw) });
  E.last = { ids: run.ids, ord: run.ord, ans: run.ans, raw, ok, byT, i: 0 };
  E.run = null; E.review = true; clearInterval(exTimer); exTimer = 0; save(); go('#exam'); window.scrollTo(0, 0);
}
function viewExam(main) {
  const E = examState();
  if (E.run && Date.now() - E.run.at >= 80 * 60000) { finishExam(); return; }
  if (E.run) return examRun(main, E);
  if (E.review && E.last) return examReview(main, E);
  const best = E.hist.length ? Math.max(...E.hist.map(h => h.raw)) : null, left = EXAM_AT - Date.now();
  main.innerHTML = `<h1>🎓 Пробный экзамен</h1>
    <p class="sub">Как настоящий в StartExam: 40 вопросов (20 уровня A, 16 — B, 4 — C), 80 минут, баллы 1 / 2 / 3, вопрос «выберите все» засчитывается только при полностью верном наборе. Ответы и разбор — после завершения. Таймер идёт, даже если закрыть вкладку.</p>
    <div class="grid g3">
      <div class="card"><div class="small muted">Попыток</div><div class="big-num">${E.hist.length}</div></div>
      <div class="card"><div class="small muted">Лучший результат</div><div class="big-num">${best == null ? '—' : best + ' / 64'}</div>${best != null ? `<div class="small">оценка ${gradeOf(best)}</div>` : ''}</div>
      <div class="card"><div class="small muted">До экзамена 26.10 в 11:10</div><div class="big-num">${left > 0 ? `${Math.floor(left / 3600000)} ч ${Math.floor(left % 3600000 / 60000)} мин` : 'уже идёт'}</div></div>
    </div>
    <div class="row" style="margin:18px 0"><button class="btn big" id="exStart">▶ Начать экзамен · 80 минут</button></div>
    <div class="grid g2">
      <div class="card"><h3>Перевод баллов в оценку</h3><table class="tbl">${[['63–64', 10], ['61–62', 9], ['60', 8], ['57–59', 7], ['54–56', 6], ['50–53', 5], ['44–49', 4], ['36–43', 3], ['28–35', 2], ['меньше 28', 1]].map(([r, g]) => `<tr><td>${r}</td><td><b>${g}</b>${g === 6 ? ' — хорошая цель' : g === 4 ? ' — минимум' : ''}</td></tr>`).join('')}</table></div>
      <div class="card"><h3>Тактика на экзамене</h3><ul class="small">
        <li>Ищи варианты «Нет верного ответа», «Ни один из вариантов не верен», «Всё перечисленное верно» — в тестах этого года они бывали правильными.</li>
        <li>Следи за отрицаниями: «НЕ является», «верно или нет».</li>
        <li>«Только», «всегда», «никогда», «исключительно» — почти всегда ловушка.</li>
        <li>В «выберите все» сначала мысленно отметь всё верное, потом кликай.</li>
        <li>Сначала пройди лёгкие вопросы, сложные отметь «вернуться позже»; на C-кейсы оставь 15 минут.</li>
        <li>Экзамен — 40% итоговой оценки и блокирующий: уровень A — по слайдам и основной литературе.</li></ul></div>
    </div>
    ${E.hist.length ? `<div class="card" style="margin-top:16px"><h3>История попыток</h3><table class="tbl">${E.hist.slice().reverse().map(h => `<tr><td>${new Date(h.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td><b>${h.raw} / 64</b></td><td>${h.ok} / 40 верных</td><td>оценка ${h.grade}</td></tr>`).join('')}</table>${E.last ? '<button class="btn ghost sm" id="exLast" style="margin-top:10px">🔍 Разбор последней попытки</button>' : ''}</div>` : ''}`;
  $('#exStart').onclick = () => { E.run = buildMock(); E.review = false; save(); viewExam(main); };
  const l = $('#exLast'); if (l) l.onclick = () => { E.review = true; E.last.i = 0; viewExam(main); };
  keyHandler = e => { if (e.key === 'Enter') $('#exStart').click(); };
}
function examRun(main, E) {
  const run = E.run, i = Math.min(run.i, run.ids.length - 1), id = run.ids[i], q = QBY(id), multi = !!q.m, a = run.ans[id] || [];
  const answered = run.ids.filter(x => (run.ans[x] || []).length).length;
  main.innerHTML = `<div class="quiz-wrap">
    <div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="ex-timer" id="exTime">80:00</span><span class="small muted">отвечено ${answered} / ${run.ids.length}</span></div>
    <div class="card ex-grid">${run.ids.map((x, k) => `<button class="${(run.ans[x] || []).length ? 'ans' : ''} ${k === i ? 'cur' : ''} ${run.flags[x] ? 'flag' : ''}" data-k="${k}">${k + 1}</button>`).join('')}</div>
    <div class="card qcard">
      <div class="row" style="justify-content:space-between"><span class="small muted">Вопрос ${i + 1} · уровень ${q.lv} · ${PTS[q.lv]} ${plural(PTS[q.lv], 'балл', 'балла', 'баллов')}</span><label class="small" style="cursor:pointer"><input type="checkbox" id="exFlag" ${run.flags[id] ? 'checked' : ''}> вернуться позже</label></div>
      <p class="qtext" style="margin-top:8px">${esc(q.q)}</p>
      <div class="qhint">${multi ? '☑️ Выберите все верные варианты' : '🔘 Выберите один ответ'}</div>
      <div class="opts">${run.ord[id].map((oi, k) => `<button class="opt ${multi ? 'multi' : ''} ${a.includes(oi) ? 'sel' : ''}" data-oi="${oi}"><span class="k">${k + 1}</span><span class="lab">${esc(q.o[oi])}</span></button>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" id="exPrev" ${i ? '' : 'disabled'}>← Назад</button><button class="btn ghost" id="exNext" ${i < run.ids.length - 1 ? '' : 'disabled'}>Дальше →</button><span class="spacer"></span><button class="btn pink" id="exEnd">Завершить</button></div>
      ${run.confirm ? `<div class="feedback no" style="margin-top:12px">Завершить экзамен? Без ответа: <b>${run.ids.length - answered}</b>.<div class="row" style="margin-top:8px"><button class="btn sm" id="exYes">Да, завершить</button><button class="btn ghost sm" id="exNo">Продолжить</button></div></div>` : ''}
    </div></div>`;
  const setI = k => { run.i = k; run.confirm = false; save(); examRun(main, E); };
  $$('.ex-grid button', main).forEach(b => b.onclick = () => setI(+b.dataset.k));
  $$('.opt', main).forEach(b => b.onclick = () => {
    const oi = +b.dataset.oi; let cur = run.ans[id] || [];
    cur = multi ? (cur.includes(oi) ? cur.filter(x => x !== oi) : [...cur, oi]) : [oi];
    run.ans[id] = cur; save(); sfx('tick'); examRun(main, E);
  });
  $('#exPrev').onclick = () => setI(i - 1); $('#exNext').onclick = () => setI(i + 1);
  $('#exFlag').onchange = e => { run.flags[id] = e.target.checked; save(); examRun(main, E); };
  $('#exEnd').onclick = () => { run.confirm = true; examRun(main, E); };
  const y = $('#exYes'); if (y) { y.onclick = finishExam; $('#exNo').onclick = () => { run.confirm = false; examRun(main, E); }; }
  const tick = () => { const el = $('#exTime'); if (!E.run || !el) { clearInterval(exTimer); exTimer = 0; return; } const left = E.run.at + 80 * 60000 - Date.now(); if (left <= 0) { finishExam(); return; } el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left % 60000 / 1000)).padStart(2, '0')}`; el.classList.toggle('low', left < 10 * 60000); };
  clearInterval(exTimer); exTimer = setInterval(tick, 1000); tick();
  keyHandler = e => {
    if (/^[1-9]$/.test(e.key)) { const b = $$('.opt', main)[+e.key - 1]; if (b) b.click(); }
    else if (e.key === 'ArrowRight' && i < run.ids.length - 1) setI(i + 1);
    else if (e.key === 'ArrowLeft' && i) setI(i - 1);
  };
}
function examReview(main, E) {
  const L = E.last, i = L.i, id = L.ids[i], q = QBY(id), a = L.ans[id] || [], g = gradeOf(L.raw);
  const right = new Set(q.a);
  main.innerHTML = `<h1>Результат пробного экзамена</h1>
    <div class="card"><div class="row" style="gap:28px;align-items:flex-end;flex-wrap:wrap">
      <div><div class="small muted">Баллы</div><div class="big-num">${L.raw}<span class="muted" style="font-size:20px"> / 64</span></div></div>
      <div><div class="small muted">Оценка</div><div class="big-num">${g}${g >= 6 ? ' 🎯' : g >= 4 ? '' : ' 😬'}</div></div>
      <div><div class="small muted">Верных</div><div class="big-num">${L.ok} / ${L.ids.length}</div></div></div>
      <p class="small" style="margin:10px 0">${L.raw >= 54 ? 'Уровень хорошей оценки (6+). Закрепи: ошибки и карточки.' : L.raw >= 44 ? `До шестёрки ${54 - L.raw} ${plural(54 - L.raw, 'балл', 'балла', 'баллов')}. Разбери ошибки ниже и пройди ещё раз.` : `До четвёрки ${44 - L.raw} ${plural(44 - L.raw, 'балл', 'балла', 'баллов')}. Слабые темы — ниже; вернись к их конспектам.`}</p>
      ${Object.entries(L.byT).sort((x, y) => TOPICS.findIndex(t => t.id === x[0]) - TOPICS.findIndex(t => t.id === y[0])).map(([t, r]) => `<div class="row" style="gap:10px;margin:4px 0"><span style="width:44px" class="small"><b>${esc(TOP[t].n)}</b></span><div class="bar" style="flex:1"><i style="width:${Math.round(100 * r.ok / r.n)}%"></i></div><span class="small">${r.ok}/${r.n}</span></div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px"><div class="small muted">Разбор — нажми на номер (зелёный — верно, красный — ошибка)</div><div class="ex-grid" style="margin-top:8px">${L.ids.map((x, k) => { const qq = QBY(x); return `<button class="${isRight(qq, L.ans[x]) ? 'ok' : 'bad'} ${k === i ? 'cur' : ''}" data-k="${k}">${k + 1}</button>`; }).join('')}</div></div>
    <div class="card qcard" style="margin-top:14px">
      <div class="qhead">${lvTag(q.lv)}${topicTag(q.t)}${srcTag(q)}</div>
      <p class="qtext">${esc(q.q)}</p>
      <div class="opts">${L.ord[id].map((oi, k) => `<button class="opt ${q.m ? 'multi' : ''} ${right.has(oi) ? 'right' : a.includes(oi) ? 'wrong' : ''}" disabled><span class="k">${k + 1}</span><span class="lab">${esc(q.o[oi])}${right.has(oi) && !a.includes(oi) ? '<span class="mark">← верный, не выбран</span>' : ''}</span></button>`).join('')}</div>
      <div class="feedback ${isRight(q, a) ? 'ok' : 'no'}" style="margin-top:12px"><h3>${isRight(q, a) ? '✅ Верно' : a.length ? '❌ Неверно' : '⏭ Без ответа'}</h3><div>${esc(q.why)}</div><div class="small" style="margin-top:6px">${esc(q.more || '')}</div><div style="margin-top:6px"><a href="#theory/${q.t}">📖 Конспект темы</a></div></div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" id="rvPrev" ${i ? '' : 'disabled'}>←</button><button class="btn ghost" id="rvNext" ${i < L.ids.length - 1 ? '' : 'disabled'}>→</button><button class="btn ghost" id="rvBad">Следующая ошибка</button><span class="spacer"></span><button class="btn" id="rvClose">Готово</button></div>
    </div>`;
  const setI = k => { L.i = k; examReview(main, E); window.scrollTo(0, 0); };
  $$('.ex-grid button', main).forEach(b => b.onclick = () => setI(+b.dataset.k));
  $('#rvPrev').onclick = () => setI(i - 1); $('#rvNext').onclick = () => setI(i + 1);
  $('#rvBad').onclick = () => { for (let k = 1; k <= L.ids.length; k++) { const j = (i + k) % L.ids.length; if (!isRight(QBY(L.ids[j]), L.ans[L.ids[j]])) return setI(j); } };
  $('#rvClose').onclick = () => { E.review = false; save(); viewExam(main); };
  keyHandler = e => { if (e.key === 'ArrowRight' && i < L.ids.length - 1) setI(i + 1); else if (e.key === 'ArrowLeft' && i) setI(i - 1); };
}

// ======================= GAME =======================
function viewGame(main) {
  if (!window.Game) { main.innerHTML = '<div class="card">Игра не загрузилась.</div>'; return; }
  main.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 style="margin:0">⛏️ ДелКрафт</h1><span class="tag">воксельный мир</span><span class="spacer"></span><span class="muted small">XP из тренировок открывает одежду в гардеробе · сундуки 🎁 в мире — это вопросы</span></div>
  <div class="game-shell" id="gameShell"></div>`;
  window.Game.mount($('#gameShell'));
  keyHandler = Object.assign(() => {}, { grabSlash: true });
  leaveHook = () => window.Game.unmount();
}

// ======================= PUBLIC API для игры =======================
window.App = {
  get state() { return S; }, save, addXP, toast, sfx, confetti, unlock, checkAch, isUnlocked, reqText, levelOf: () => levelOf(S.xp), titleOf,
  askOne, modal,
  gameEvent(kind, n = 1) {
    const map = { break: 'broken', place: 'placed', kill: 'kills', chest: 'chests', night: 'nights' };
    if (map[kind]) S.stats[map[kind]] += n;
    save(); checkAch();
  }
};

// ======================= INIT =======================
function initChrome() {
  $('#themeBtn').onclick = () => { const order = ['auto', 'light', 'dark']; S.settings.theme = order[(order.indexOf(S.settings.theme) + 1) % 3]; save(); applyTheme(); };
  $('#soundBtn').onclick = () => { S.settings.sound = !S.settings.sound; save(); renderHud(); sfx('tick'); };
  const si = $('#searchIn'); let st = 0;
  si.addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => { const v = si.value.trim(); if (v) { location.hash = '#search/' + encodeURIComponent(v); } }, 220); });
  si.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = si.value.trim(); if (v) go('#search/' + encodeURIComponent(v)); } });
  applyTheme();
}
initChrome();
render();
})();
