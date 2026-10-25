// Сборка в один файл index.html.
// Работает и из site/tools (исходники в src/ и vendor/), и из плоской папки site/github (всё лежит рядом).
// Из site/tools дополнительно обновляет плоскую папку site/github для загрузки на GitHub.
const fs = require('fs'), path = require('path');
const here = __dirname, flat = path.basename(here) !== 'tools';
const root = flat ? here : path.join(here, '..');
const find = f => [path.join(root, 'src', f), path.join(root, 'vendor', f), path.join(here, f)].find(p => fs.existsSync(p));
const rd = f => { const p = find(f); if (!p) throw new Error('нет файла ' + f); return fs.readFileSync(p, 'utf8'); };

const DATA = ['data_topics.js', 'theory_1.js', 'theory_2.js', 'theory_3.js', 'theory_4.js', 'theory_5.js', 'data_traps_cards.js', 'q_tests_2026.js', 'q_l1_l2.js', 'q_l3_l4.js', 'q_l5_l6.js', 'q_l7_l8.js', 'q_sem.js'];
const GAME = ['game_core.js', 'game_world.js', 'game_items.js', 'game_tex.js', 'game_render.js', 'game_skin.js', 'game_entities.js', 'game_ui.js', 'game_main.js'];
const OTHER = ['template.html', 'styles.css', 'app.js', 'three.min.js'];

// </script> внутри строк сломал бы разметку
const safe = s => s.replace(/<\/script/gi, '<\\/script');
let html = rd('template.html');
const put = (mark, s) => { const i = html.indexOf(mark); if (i < 0) throw new Error('no ' + mark); html = html.slice(0, i) + s + html.slice(i + mark.length); };
put('/*__CSS__*/', rd('styles.css'));
put('/*__THREE__*/', safe(rd('three.min.js')));
put('/*__DATA__*/', safe(DATA.map(rd).join('\n;\n')));
put('/*__GAME__*/', safe("(() => {\n'use strict';\n" + GAME.map(rd).join('\n') + '\n})();'));
put('/*__APP__*/', safe(rd('app.js')));
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + ' KB');

if (!flat) {
  const out = path.join(root, 'github');
  fs.mkdirSync(out, { recursive: true });
  for (const f of [...DATA, ...GAME, ...OTHER]) fs.copyFileSync(find(f), path.join(out, f));
  for (const f of ['build.js', 'validate.js']) fs.copyFileSync(path.join(here, f), path.join(out, f));
  fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
  console.log('github/ обновлена:', fs.readdirSync(out).length, 'файлов');
}
