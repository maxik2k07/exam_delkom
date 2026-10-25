// Проверка данных: node validate.js (работает из site/tools и из плоской папки site/github)
const fs = require('fs'), vm = require('vm'), path = require('path');
const here = __dirname, root = path.basename(here) === 'tools' ? path.join(here, '..') : here;
const find = f => [path.join(root, 'src', f), path.join(here, f)].find(p => fs.existsSync(p));
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_topics.js', 'theory_1.js', 'theory_2.js', 'theory_3.js', 'theory_4.js', 'theory_5.js', 'data_focus.js', 'data_traps_cards.js', 'q_tests_2026.js', 'q_l1_l2.js', 'q_l3_l4.js', 'q_l5_l6.js', 'q_l7_l8.js', 'q_sem.js', 'q_focus.js'])
  vm.runInContext(fs.readFileSync(find(f), 'utf8'), ctx, { filename: f });
const { Q, TOPICS, THEORY, CARDS, TRAPS } = ctx;
const tids = new Set(TOPICS.map(t => t.id)); let bad = 0; const ids = new Set();
for (const q of Q) {
  const err = [];
  if (ids.has(q.id)) err.push('dup id'); ids.add(q.id);
  if (!tids.has(q.t)) err.push('bad topic');
  if (!['A', 'B', 'C'].includes(q.lv)) err.push('bad lv');
  if (!q.a.length || !q.a.every(i => Number.isInteger(i) && i >= 0 && i < q.o.length)) err.push('bad answer idx');
  if (new Set(q.o).size !== q.o.length) err.push('dup options');
  if (q.a.length > 1 && !q.m) err.push('multi answer without m');
  if (!q.why) err.push('no why');
  if (err.length) { bad++; console.log(q.id, err.join(', ')); }
}
for (const t of TOPICS) if (!THEORY[t.id] || !THEORY[t.id].short || !THEORY[t.id].full) { bad++; console.log('theory missing', t.id); }
for (const c of CARDS) if (!tids.has(c.t)) { bad++; console.log('card topic', c.f); }
for (const c of TRAPS) if (!tids.has(c.t)) { bad++; console.log('trap topic', c.bad); }
const by = {}; for (const q of Q) { by[q.t] = by[q.t] || { A: 0, B: 0, C: 0, n: 0 }; by[q.t][q.lv]++; by[q.t].n++; }
console.table(by);
const lv = { A: 0, B: 0, C: 0 }; Q.forEach(q => lv[q.lv]++);
console.log('total Q', Q.length, lv, 'multi', Q.filter(q => q.m).length, 'disputed', Q.filter(q => q.disp).length, '| cards', CARDS.length, '| traps', TRAPS.length);
process.exit(bad ? 1 : 0);
