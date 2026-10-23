// ===== ДелКрафт: игровой цикл, игрок, взаимодействие, меню =====
const SAVE_KEY = 'delkom.world', DAY_LEN = 600, SAVE_V = 2;
const Game = (() => {
  let shell, canvas, overlay, ro, mounted = false, running = false, raf = 0, lastT = 0;
  let chunks = [], meshQ = [];
  let model = null, handM = null, handGroup = null, handItem = null, handItemId = -1, heldModelId = -1, armorKey = '';
  const keys = {}, mouse = { l: false, r: false };
  let locked = false, breakT = 0, breakKey = '', actCd = 0, useCd = 0, eatT = 0, bowT = 0, lastW = 0, lastSpace = 0, sprintLatch = false, saveTimer = 0, sleepT = 0;
  let gtime = 0.06, weather = { rain: 0, target: 0, timer: 300 }, spawn = [0, 0, 0], tickT = 0, nightClean = false, wasNight = false, confirmNew = false;
  let sens = 0.0022, fovBase = 75, view = 0, quality = 2, scale = 1.5, f3 = false;
  const P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), w: 0.3, h: 1.8, yaw: 0, pitch: 0, bodyYaw: 0, onGround: false, inWater: false, inLava: false, headWater: false, fly: false, sneak: false, sprint: false,
    hp: 20, food: 20, sat: 5, exh: 0, air: 15, fire: 0, invuln: 0, hurtT: 0, hurtFlash: 0, regenT: 0, starveT: 0, drownT: 0, lavaT: 0, fireT: 0, regenWave: -1, golden: 0, goldT: 0, fall: 0, phase: 0, walk: 0, swing: 0, atk: 1, fov: 75, dead: false, shake: 0, swim: false, swimT: 0, swimPh: 0, swimSnd: 0, eyeH: 1.62 };
  G.P = P;
  const game = G.game = {
    mode: 'survival', difficulty: 2, ui: null, inv: { main: Array(36).fill(null), armor: Array(4).fill(null), sel: 0 }, dirtyInv: true, hideHud: false, quizCd: {},
    held() { return this.inv.main[this.inv.sel]; },
    armorPoints() { return this.inv.armor.reduce((a, s) => a + (s ? IT[s.id].armor.pts : 0), 0); },
    canFit(s) { const max = stackMax(s.id); return this.inv.main.some(x => !x || (x.id === s.id && max > 1 && x.n < max)); },
    giveStack(s) { let left = invAdd(this.inv.main, s.id, s.n, s.d, 0, 9); if (left) left = invAdd(this.inv.main, s.id, left, s.d, 9, 36); this.dirtyInv = true; return left; },
    giveOrDrop(s) { const left = this.giveStack(s); if (left > 0) this.dropFromPlayer(mk(s.id, left, s.d)); },
    dropFromPlayer(s) { const d = forward(); Ents.dropItem(s.id, s.n, P.pos.x + d.x * 0.6, P.pos.y + 1.35, P.pos.z + d.z * 0.6, new THREE.Vector3(d.x * 4.5, d.y * 4 + 2, d.z * 4.5), s.d).pick = 1.5; },
    dropContainer(x, y, z) { const k = x + ',' + y + ',' + z, C = G.world.containers.get(k); if (!C) return; (C.type === 'chest' ? C.slots : [C.in, C.fuel, C.out]).forEach(s => s && Ents.dropItem(s.id, s.n, x + .5, y + .5, z + .5, null, s.d)); G.world.containers.delete(k); },
    remeshSet(set) { remeshSet(set); }, shake(a) { P.shake = Math.max(P.shake, a); },
    damage, dmgMul() { return [0, 0.5, 1, 1.5][this.difficulty]; },
    lineOfSight(a, b) { const d = b.clone().sub(a), len = d.length(); if (len < 0.01) return true; d.divideScalar(len); const h = raycastBlocks(a, d, len); return !h || h.t >= len - 0.3 || !OPQ[h.b]; },
    igniteTnt(x, y, z) { remeshSet(G.world.set(x, y, z, B.AIR)); Ents.primeTnt(x + .5, y, z + .5, 4); },
    onCraft(id) { UI.msg('Создано: ' + iname(id), 1.6); },
    portrait, topInfo
  };

  // ---------- сохранение ----------
  function loadSave() { try { const r = localStorage.getItem(SAVE_KEY); const s = r && JSON.parse(r); return s ? (s.v === SAVE_V ? s : { old: 1 }) : null; } catch (e) { return null; } }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 2000); }
  function saveNow() {
    const w = G.world; if (!w || !mounted) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_V, seed: w.seed, edits: [...w.edits], meta: [...w.meta], containers: [...w.containers], chests: w.chests, p: [P.pos.x, P.pos.y, P.pos.z], yaw: P.yaw, pitch: P.pitch,
        hp: P.hp, food: P.food, sat: P.sat, mode: game.mode, difficulty: game.difficulty, time: gtime, weather, inv: game.inv, spawn, settings: { view, sens, quality, scale, fovBase, tex: TS } }));
    } catch (e) { /* переполнено хранилище */ }
  }

  // ---------- запуск ----------
  function mount(el) {
    shell = el; mounted = true;
    shell.innerHTML = `<canvas class="g3d"></canvas>
      <div class="g-ui"><div class="g-water"></div><div class="g-fire"></div><div class="g-hurt"></div><div class="g-fade"></div>
        <div class="mc-cross"><i class="mc-atk"></i></div><div class="g-top"></div><div class="g-msg"></div><div class="mc-name"></div>
        <div class="mc-hud"><div class="mc-bars"><div class="mc-side"><div class="mc-row9 mc-armor"></div><div class="mc-row9 mc-hearts"></div></div><div class="mc-side right"><div class="mc-row9 mc-air"></div><div class="mc-row9 mc-food"></div></div></div>
          <div class="mc-xp"><span></span><i></i></div><div class="mc-hotbar"></div></div></div>
      <div class="g-overlay"><div class="g-panel" style="max-width:420px;text-align:center"><h2>⛏️ ДелКрафт</h2><p class="muted">Генерация мира и расчёт освещения… ⏳</p></div></div>
      <div class="mc-cursor"><div class="arrow"></div><div class="stk"></div></div><div class="mc-tip"></div>`;
    canvas = shell.querySelector('canvas'); overlay = shell.querySelector('.g-overlay');
    setTimeout(() => { try { init(); } catch (e) { console.error(e); overlay.innerHTML = `<div class="g-panel"><h2>Не удалось запустить игру</h2><p class="muted">${String(e && e.message || e)}</p><p class="small muted">Нужен браузер с поддержкой WebGL.</p></div>`; } }, 40);
  }
  function init() {
    const sv = loadSave();
    G.atlasCanvas = buildAtlas((sv && sv.settings && sv.settings.tex) || 64);
    newWorld(sv && !sv.old ? sv : null);
    Render.init(canvas, shell); Render.setQuality(quality, scale); G.scene = Render.scene;
    G.env = Render.updateEnv({ time: gtime, rain: weather.rain, now: 0, dt: 0, center: P.pos, underwater: false, inLava: false });
    UI.init(shell);
    chunks = Array.from({ length: NCX * NCZ }, () => ({}));
    rebuildPlayerModel(); queueAll(); Ents.spawnPassive(18);
    ro = new ResizeObserver(() => Render.resize()); ro.observe(shell);
    bindEvents(); running = true; lastT = performance.now(); raf = requestAnimationFrame(loop);
    showMenu(sv && sv.old ? '🌍 Игра обновилась — создан новый мир: теперь всё нужно добывать и крафтить.' : sv ? 'С возвращением! Мир сохранён.' : 'Новый мир. Инвентарь пуст: зажми ЛКМ на дереве, чтобы добыть брёвна, затем E → доски → верстак (книга рецептов 📗 подскажет).');
  }
  function newWorld(sv) {
    const w = G.world = new World(sv ? sv.seed : (Math.random() * 1e9) | 0);
    w.generate(); spawn = w.spawnPoint();
    if (sv) {
      for (const [i, id] of sv.edits || []) { w.data[i] = id; w.edits.set(i, id); if (BL[id] && ((BL[id].crop != null && BL[id].crop < 7) || id === B.SAPLING || id === B.BSAPLING)) w.ticking.set(i, 0); }
      (sv.meta || []).forEach(([i, m]) => w.meta.set(i, m)); (sv.containers || []).forEach(([k, c]) => w.containers.set(k, c));
      w.chests = (sv.chests || []).filter(c => w.get(c[0], c[1], c[2]) === B.CHEST);
      P.pos.set(...sv.p); P.yaw = sv.yaw || 0; P.pitch = sv.pitch || 0; P.hp = sv.hp ?? 20; P.food = sv.food ?? 20; P.sat = sv.sat ?? 5;
      game.mode = sv.mode || 'survival'; game.difficulty = sv.difficulty ?? 2; gtime = sv.time ?? 0.06; weather = sv.weather || weather; game.inv = sv.inv || game.inv; spawn = sv.spawn || spawn;
      const st = sv.settings || {}; view = st.view || 0; sens = st.sens || 0.0022; quality = st.quality ?? 2; scale = st.scale || 1.5; fovBase = st.fovBase || 75;
    } else {
      P.pos.set(...spawn); P.yaw = Math.PI * 0.25; P.pitch = -0.1; P.hp = 20; P.food = 20; P.sat = 5; gtime = 0.06; weather = { rain: 0, target: 0, timer: 360 };
      game.inv = { main: Array(36).fill(null), armor: Array(4).fill(null), sel: 0 };
      if (game.mode === 'creative') creativeHotbar();
    }
    w.computeLight();
    P.vel.set(0, 0, 0); P.dead = false; P.fly = false; P.fire = 0; P.air = 15; P.exh = 0; game.ui = null; game.dirtyInv = true;
    Ents.clear();
  }
  function creativeHotbar() { [B.GRASS, B.COBBLE, B.PLANKS, B.LOG, B.GLASS, B.TORCH, B.GLOW, B.STONEBRICK, I.SWORD_DIAMOND].forEach((id, i) => { game.inv.main[i] = mk(id, stackMax(id)); }); }
  function rebuildPlayerModel() {
    const cfg = (window.App && App.state.skin) || DEFAULT_SKIN;
    if (model) { Render.scene.remove(model.root); model.dispose(); }
    model = buildModel(cfg); model.root.rotation.order = 'YXZ'; model.root.traverse(o => { if (o.isMesh) o.layers.enable(2); }); Render.scene.add(model.root);
    model.extras.forEach(m => { if (m.color) m.userData.base = m.color.clone(); });
    heldModelId = -1; armorKey = '';
    if (!handGroup) { handGroup = new THREE.Group(); Render.hScene.add(handGroup); }
    if (handM) { handGroup.remove(handM.armR); handM.dispose(); }
    handM = buildModel(cfg, { noExtras: true }); handM.root.remove(handM.armR);
    handM.armR.position.set(0.56, -0.62, -0.2); handM.armR.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-0.22, 0.42, -0.55).normalize()); handM.armR.rotateY(-0.6);
    handGroup.add(handM.armR); handItemId = -1; window.SKIN_PORTRAIT = null;
  }
  function portrait() {
    if (window.SKIN_PORTRAIT) return window.SKIN_PORTRAIT;
    const skin = paintSkin(Object.assign({}, DEFAULT_SKIN, (window.App && App.state.skin) || {})), c = document.createElement('canvas'); c.width = 16; c.height = 32; const g = c.getContext('2d');
    g.drawImage(skin, 8, 8, 8, 8, 4, 0, 8, 8); g.drawImage(skin, 40, 8, 8, 8, 4, 0, 8, 8); g.drawImage(skin, 20, 20, 8, 12, 4, 8, 8, 12); g.drawImage(skin, 20, 36, 8, 12, 4, 8, 8, 12);
    g.drawImage(skin, 44, 20, 4, 12, 0, 8, 4, 12); g.drawImage(skin, 36, 52, 4, 12, 12, 8, 4, 12); g.drawImage(skin, 4, 20, 4, 12, 4, 20, 4, 12); g.drawImage(skin, 20, 52, 4, 12, 8, 20, 4, 12);
    return (window.SKIN_PORTRAIT = c.toDataURL());
  }

  // ---------- чанки ----------
  function remesh(ci) {
    const cx = ci % NCX, cz = (ci / NCX) | 0, c = chunks[ci]; if (!c) return;
    const r = meshChunk(G.world, cx, cz), mats = { solid: Render.matS, water: Render.matW, lava: Render.matL };
    for (const k of ['solid', 'water', 'lava']) {
      if (c[k]) { Render.scene.remove(c[k]); c[k].geometry.dispose(); c[k] = null; }
      if (r[k]) { const m = new THREE.Mesh(r[k], mats[k]); m.matrixAutoUpdate = false; m.updateMatrix(); if (k === 'solid') m.layers.enable(1); if (k === 'water') m.renderOrder = 3; Render.scene.add(m); c[k] = m; }
    }
  }
  function queueAll() {
    meshQ = []; for (let i = 0; i < NCX * NCZ; i++) meshQ.push(i);
    const pcx = P.pos.x / CS, pcz = P.pos.z / CS, d = i => Math.hypot(i % NCX + .5 - pcx, ((i / NCX) | 0) + .5 - pcz);
    meshQ.sort((a, b) => d(b) - d(a));
  }
  function remeshSet(set) { if (!set || set === true) return; set.forEach(ci => { const j = meshQ.indexOf(ci); if (j >= 0) meshQ.splice(j, 1); meshQ.push(ci); }); }
  function processQueue() { const t0 = performance.now(); while (meshQ.length && performance.now() - t0 < 9) remesh(meshQ.pop()); }
  function setBlock(x, y, z, id, meta) {
    const w = G.world; if (meta != null && BL[id].orient) w.meta.set(IDX(x, y, z), meta);
    const d = w.set(x, y, z, id); if (d) { const ci = (x >> 4) + (z >> 4) * NCX; remesh(ci); d.delete(ci); remeshSet(d); }
    scheduleSave(); return d;
  }

  // ---------- игрок ----------
  const forward = (o = new THREE.Vector3()) => { const cp = Math.cos(P.pitch); return o.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp); };
  const eyePos = (o = new THREE.Vector3()) => o.set(P.pos.x, P.pos.y + P.eyeH, P.pos.z);
  const blockAt = (x, y, z) => G.world.get(Math.floor(x), Math.floor(y), Math.floor(z));
  function exhaust(v) { if (game.mode !== 'survival' || game.difficulty === 0) return; P.exh += v; while (P.exh >= 4) { P.exh -= 4; if (P.sat > 0) P.sat = Math.max(0, P.sat - 1); else P.food = Math.max(0, P.food - 1); } }
  function updatePlayer(dt) {
    if (P.dead) return;
    const surv = game.mode === 'survival', f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const sprintKey = keys.ControlLeft || keys.ControlRight || sprintLatch;
    if (f <= 0) sprintLatch = false;
    const feet = blockAt(P.pos.x, P.pos.y + 0.1, P.pos.z), mid = blockAt(P.pos.x, P.pos.y + 0.3, P.pos.z), body = blockAt(P.pos.x, P.pos.y + 0.8, P.pos.z);
    P.inWater = feet === B.WATER || mid === B.WATER || body === B.WATER; P.inLava = feet === B.LAVA || body === B.LAVA || blockAt(P.pos.x, P.pos.y + 1.2, P.pos.z) === B.LAVA;
    // плавание лёжа, как в Minecraft: под водой (или с бегом) при движении вперёд
    if (P.inWater && !P.fly && f > 0 && (P.headWater || sprintKey)) P.swim = true;
    else if (P.swim && ((!P.inWater && blockAt(P.pos.x, P.pos.y - 0.3, P.pos.z) !== B.WATER) || f <= 0 || P.fly)) standUp(); // у самой поверхности ещё плывём
    P.sneak = !!keys.ShiftLeft && !P.fly && !P.swim;
    P.sprint = sprintKey && f > 0 && !P.sneak && (!surv || P.food > 6) && eatT <= 0 && bowT <= 0;
    P.h = P.swim ? 0.6 : P.sneak ? 1.5 : 1.8;
    P.eyeH += ((P.swim ? 0.4 : P.sneak ? 1.32 : 1.62) - P.eyeH) * Math.min(1, 12 * dt);
    const wasHead = P.headWater; P.headWater = blockAt(P.pos.x, P.pos.y + P.eyeH, P.pos.z) === B.WATER; if (P.headWater && !wasHead) Snd.play('splash');
    let speed = P.fly ? (P.sprint ? 22 : 11) : P.inLava ? 1.2 : P.swim ? (P.inWater ? (P.sprint ? 5.6 : 4.2) : 1.3) : P.inWater ? (P.sprint ? 3.2 : 2.3) : P.sneak ? 1.3 : P.sprint ? 5.6 : 4.3;
    if (eatT > 0 || bowT > 0) speed *= 0.35;
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw); let wx = -sy * f + cy * s, wz = -cy * f - sy * s; const L = Math.hypot(wx, wz); if (L) { wx /= L; wz /= L; }
    const swimming = P.swim && (P.inWater || blockAt(P.pos.x, P.pos.y - 0.3, P.pos.z) === B.WATER);
    if (swimming) {
      // плывём туда, куда смотрим: вниз — нырнуть, вверх — всплыть; пробел/Shift — вверх/вниз
      const d = forward(), k = Math.min(1, 5 * dt);
      let ty = d.y * f * speed + (keys.Space ? 3 : 0) - (keys.ShiftLeft ? 3 : 0);
      const atSurf = blockAt(P.pos.x, P.pos.y + 0.25, P.pos.z) !== B.WATER;
      if (atSurf && ty > -0.4) { ty = -0.4; P.vel.y = Math.min(P.vel.y, 0.3); } // у поверхности не выпрыгиваем — держимся у кромки воды
      P.vel.x += (d.x * f * speed + cy * s * speed * 0.5 - P.vel.x) * k; P.vel.z += (d.z * f * speed - sy * s * speed * 0.5 - P.vel.z) * k; P.vel.y += (ty - P.vel.y) * k; P.fall = 0;
      P.swimPh += dt * (3 + Math.hypot(P.vel.x, P.vel.y, P.vel.z) * 0.9);
      if ((P.swimSnd -= dt) <= 0) { P.swimSnd = 0.75; Snd.play('swim'); }
      if (P.headWater && Math.random() < dt * 4) Render.emit({ x: P.pos.x + rnd(-.2, .2), y: P.pos.y + P.eyeH, z: P.pos.z + rnd(-.2, .2), vx: rnd(-.2, .2), vy: rnd(0.8, 1.6), vz: rnd(-.2, .2), life: 0.9, c: new THREE.Color('#d8ecff'), g: -1.5, s: 0.06, lit: true, collide: false });
    } else {
      const acc = P.onGround || P.fly ? 16 : P.inWater ? 6 : 4;
      P.vel.x += (wx * speed - P.vel.x) * Math.min(1, acc * dt); P.vel.z += (wz * speed - P.vel.z) * Math.min(1, acc * dt);
    }
    if (swimming) { /* вертикаль уже задана */ }
    else if (P.fly) { const up = (keys.Space ? 1 : 0) - (keys.ShiftLeft ? 1 : 0); P.vel.y += (up * (P.sprint ? 12 : 8) - P.vel.y) * Math.min(1, 10 * dt); P.fall = 0; }
    else if (P.inWater || P.inLava) { P.vel.y -= (P.inLava ? 6 : 9) * dt; P.vel.y *= 1 - Math.min(1, 3 * dt); if (keys.Space) P.vel.y = Math.max(P.vel.y, Math.min(P.vel.y + 26 * dt, P.inLava ? 2 : 3.4)); P.fall = 0; }
    else { P.vel.y -= 28 * dt; if (P.vel.y < -55) P.vel.y = -55; if (keys.Space && P.onGround) { P.vel.y = 8.7; P.onGround = false; exhaust(P.sprint ? 0.2 : 0.05); if (P.sprint) { P.vel.x += wx * 1.5; P.vel.z += wz * 1.5; } } }
    const wasGround = P.onGround, ox = P.pos.x, oz = P.pos.z;
    const hit = moveEntity(P, dt, P.sneak);
    // упёрся в берег в воде — выпрыгиваем на него, как в Minecraft (пловец у поверхности сначала встаёт)
    if ((P.inWater || P.inLava) && !P.fly && (hit.hx || hit.hz) && (keys.Space || f > 0)) {
      if (P.swim && blockAt(P.pos.x, P.pos.y + 0.9, P.pos.z) !== B.WATER) standUp();
      if (!P.swim) P.vel.y = Math.max(P.vel.y, P.inLava ? 5.5 : 8);
    }
    P.pos.x = clamp(P.pos.x, 0.31, WX - 0.31); P.pos.z = clamp(P.pos.z, 0.31, WZ - 0.31);
    const moved = Math.hypot(P.pos.x - ox, P.pos.z - oz); if (P.sprint) exhaust(moved * 0.1); if (P.inWater) exhaust(moved * 0.01);
    if (P.pos.y < -20) damage(100, 'Выпал из мира', 'void');
    if (!P.onGround && P.vel.y < 0 && !P.fly && !P.inWater) P.fall += -P.vel.y * dt;
    if (P.onGround && !wasGround) {
      const under = blockAt(P.pos.x, P.pos.y - 0.2, P.pos.z);
      if (P.fall > 3.3 && surv && under !== B.BED) damage(Math.ceil(P.fall - 3), 'Разбился при падении', 'fall');
      if (P.fall > 1.2) { Snd.play('step', 2); if (under) Render.blockBurst(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.5), Math.floor(P.pos.z), under, 10); }
      P.fall = 0; if (P.fly) P.fly = false;
    }
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && hs > 0.5 && !P.fly) { const b = P.phase; P.phase += hs * dt * 1.85; if (Math.floor(b / Math.PI) !== Math.floor(P.phase / Math.PI)) Snd.play('step'); } else if (P.fly || P.inWater) P.phase += hs * dt * 0.8;
    P.walk += (Math.min(1, hs / 4.3) * (P.onGround || P.inWater ? 1 : 0.3) - P.walk) * Math.min(1, 10 * dt);
    if (P.swing > 0) P.swing = Math.max(0, P.swing - dt * 3.6);
    const held = game.held(), cd = held && IT[held.id] && IT[held.id].cd ? IT[held.id].cd : 0.25; P.atk = Math.min(1, P.atk + dt / cd);
    P.hurtT = Math.max(0, P.hurtT - dt); P.hurtFlash = Math.max(0, P.hurtFlash - dt); P.invuln = Math.max(0, P.invuln - dt); P.shake = Math.max(0, P.shake - dt * 2);
    if (P.regenWave >= 0) { P.regenWave += dt * 25; if (P.regenWave > 10) P.regenWave = -1; }
    // выживание: голод, регенерация, воздух, огонь, лава
    if (surv) {
      if (game.difficulty === 0) { P.food = 20; P.regenT += dt; if (P.regenT > 1 && P.hp < 20) { P.regenT = 0; heal(1); } }
      else if (P.food >= 18 && P.hp < 20) { P.regenT += dt; const per = P.food >= 20 && P.sat > 0 ? 0.6 : 4; if (P.regenT > per) { P.regenT = 0; heal(1); exhaust(6); } }
      else if (P.food <= 0) { P.starveT += dt; if (P.starveT > 4) { P.starveT = 0; const lim = [20, 10, 1, 0][game.difficulty]; if (P.hp > lim) damage(1, 'Умер от голода', 'starve'); } }
      if (P.golden > 0) { P.golden -= dt; P.goldT += dt; if (P.goldT > 1.2) { P.goldT = 0; heal(1); } }
      if (P.headWater) {
        P.air -= dt;
        if (P.air <= 0) { P.air = 0; P.drownT += dt; if (P.drownT > 1) { P.drownT = 0; damage(2, 'Утонул', 'drown'); for (let i = 0; i < 6; i++) Render.emit({ x: P.pos.x, y: P.pos.y + 1.6, z: P.pos.z, vx: rnd(-.4, .4), vy: rnd(1, 2), vz: rnd(-.4, .4), life: 0.8, c: new THREE.Color('#bfe0ff'), g: -2, s: 0.08, lit: true, collide: false }); } }
      } else P.air = Math.min(15, P.air + dt * 5);
      if (P.inLava) { P.fire = 8; P.lavaT += dt; if (P.lavaT > 0.5) { P.lavaT = 0; damage(4, 'Сгорел в лаве', 'lava'); } }
      if (P.fire > 0) { P.fire -= dt; if (P.inWater || weather.rain > 0.5) P.fire = 0; P.fireT += dt; if (P.fireT > 1) { P.fireT = 0; damage(1, 'Сгорел', 'fire'); } }
    } else { P.hp = 20; P.food = 20; P.air = 15; P.fire = 0; }
    const diff = angDiff(P.yaw, P.bodyYaw);
    if (hs > 0.3) P.bodyYaw += diff * Math.min(1, 8 * dt); else if (Math.abs(diff) > 0.85) P.bodyYaw += diff - Math.sign(diff) * 0.85;
  }
  // встать из положения лёжа можно, только если над головой есть место
  function standUp() { const h = P.h; P.h = 1.8; if (boxOverlap(P)) P.h = h; else P.swim = false; }
  function heal(n) { if (P.hp >= 20) return; P.hp = Math.min(20, P.hp + n); P.regenWave = 0; }
  function damage(n, cause, type, src) {
    if (game.mode !== 'survival' || P.dead || n <= 0) return;
    if (P.invuln > 0 && type !== 'starve' && type !== 'drown' && type !== 'void') return;
    if (type === 'mob' || type === 'arrow' || type === 'explosion') {
      n *= 1 - Math.min(20, game.armorPoints()) / 25;
      game.inv.armor.forEach((s, i) => { if (!s) return; s.d = (s.d || 0) + 1; if (s.d >= IT[s.id].dur) { game.inv.armor[i] = null; Snd.play('thunk'); UI.msg('Сломалось: ' + iname(s.id)); } });
      game.dirtyInv = true;
    }
    n = Math.max(1, Math.round(n));
    P.hp = Math.max(0, P.hp - n); P.hurtT = 0.4; P.hurtFlash = 0.6; P.invuln = 0.5; P.regenT = 0; Snd.play('hurt'); exhaust(0.1);
    if (src) { const dx = P.pos.x - src.x, dz = P.pos.z - src.z, d = Math.hypot(dx, dz) || 1; P.vel.x += dx / d * 6; P.vel.z += dz / d * 6; P.vel.y = Math.max(P.vel.y, 4.5); }
    if (P.hp <= 0) die(cause);
  }
  function die(cause) {
    P.dead = true; nightClean = false; P.hp = 0; eatT = bowT = 0;
    if (UI.isInvUI()) UI.close(true);
    game.inv.main.concat(game.inv.armor).forEach(s => s && Ents.dropItem(s.id, s.n, P.pos.x, P.pos.y + 1, P.pos.z, new THREE.Vector3(rnd(-3, 3), rnd(2, 5), rnd(-3, 3)), s.d));
    game.inv.main.fill(null); game.inv.armor.fill(null); game.dirtyInv = true;
    for (let i = 0; i < 40; i++) Render.emit({ x: P.pos.x, y: P.pos.y + 1, z: P.pos.z, vx: rnd(-3, 3), vy: rnd(1, 5), vz: rnd(-3, 3), life: rnd(0.6, 1.2), c: new THREE.Color('#9a0a0a'), g: 14, s: 0.15, lit: true, collide: true });
    game.ui = 'dead'; if (document.pointerLockElement) document.exitPointerLock();
    overlay.style.display = 'grid'; overlay.classList.remove('mc-dim');
    overlay.innerHTML = `<div class="mc-death"><h1>Вы погибли!</h1><p>${cause || ''}</p><button class="mc-btn big" data-a="respawn">Возродиться</button><button class="mc-btn big" data-a="tomenu">Меню</button><p class="small">Вещи выпали на месте гибели — успей подобрать их за 5 минут</p></div>`;
    saveNow();
  }
  function respawn() { P.pos.set(...spawn); P.vel.set(0, 0, 0); P.hp = 20; P.food = 20; P.sat = 5; P.air = 15; P.fire = 0; P.exh = 0; P.dead = false; P.fall = 0; game.ui = null; overlay.style.display = 'none'; overlay.innerHTML = ''; }

  // ---------- действия ----------
  function useDurability(n = 1) {
    if (game.mode !== 'survival' || !n) return; const s = game.held(); if (!s || !IT[s.id] || !IT[s.id].dur) return;
    s.d = (s.d || 0) + n;
    if (s.d >= IT[s.id].dur) { game.inv.main[game.inv.sel] = null; Snd.play('thunk'); UI.msg('💥 Сломалось: ' + iname(s.id)); Render.burst(P.pos.x, P.pos.y + 1.3, P.pos.z, IT[s.id].col, 14, 2); }
    game.dirtyInv = true;
  }
  function attack() {
    const o = eyePos(), d = forward(), hb = raycastBlocks(o, d, 5);
    let best = null, bt = 3.6;
    for (const m of Ents.mobs) { const t = rayAABB(o, d, m.pos.x - m.w - .05, m.pos.y, m.pos.z - m.w - .05, m.pos.x + m.w + .05, m.pos.y + m.h, m.pos.z + m.w + .05, bt); if (t != null) { bt = t; best = m; } }
    P.swing = 1;
    if (!best || (hb && hb.t < bt)) return false;
    const held = game.held(), it = held && IT[held.id], base = it && it.dmg ? it.dmg : 1, k = 0.2 + 0.8 * P.atk * P.atk;
    const crit = !P.onGround && P.vel.y < -0.5 && P.atk > 0.9 && !P.inWater;
    let dmg = base * k * (crit ? 1.5 : 1); if (game.mode === 'creative') dmg = Math.max(dmg, 6);
    Ents.hurtMob(best, Math.max(1, Math.round(dmg)), P.pos, { byPlayer: true, kb: P.sprint ? 10 : 6.5 });
    if (crit) for (let i = 0; i < 12; i++) Render.emit({ x: best.pos.x + rnd(-.4, .4), y: best.pos.y + best.h * rnd(.4, 1), z: best.pos.z + rnd(-.4, .4), vx: rnd(-2, 2), vy: rnd(0, 2), vz: rnd(-2, 2), life: 0.5, c: new THREE.Color('#fff6c0'), g: 4, s: 0.09, lit: false, collide: false });
    Snd.play('hit'); exhaust(0.1);
    const t = it && it.tool; useDurability(t ? (t.type === 'sword' ? 1 : 2) : 0);
    P.atk = 0; return true;
  }
  function breakBlock(h) {
    const w = G.world, id = h.b, held = game.held(), surv = game.mode === 'survival';
    if (id === B.CHEST || (id === B.BEDROCK && surv)) return;
    if (id === B.STORAGE || id === B.FURNACE || id === B.FURNACE_ON) game.dropContainer(h.x, h.y, h.z);
    setBlock(h.x, h.y, h.z, B.AIR);
    const above = w.get(h.x, h.y + 1, h.z);
    if (BL[above].cross || above === B.TORCH) { setBlock(h.x, h.y + 1, h.z, B.AIR); if (surv) blockDrops(above, held).forEach(([d, n]) => Ents.dropItem(d, n, h.x + .5, h.y + 1.3, h.z + .5)); }
    if (h.y <= SEA) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) if (w.get(h.x + dx, h.y + dy, h.z + dz) === B.WATER) { setBlock(h.x, h.y, h.z, B.WATER); break; }
    Render.blockBurst(h.x, h.y, h.z, id); Snd.play('dig');
    if (surv) {
      blockDrops(id, held).forEach(([d, n]) => Ents.dropItem(d, n, h.x + .5, h.y + .4, h.z + .5, new THREE.Vector3(rnd(-1.5, 1.5), rnd(2, 3.5), rnd(-1.5, 1.5))));
      if (BL[id].hard > 0) useDurability(1);
      exhaust(0.005);
      if (!canHarvest(id, held)) UI.msg(`Нужна кирка получше, чтобы добыть «${BL[id].n}»`, 2.2);
    }
    window.App && App.gameEvent('break');
  }
  function placeFace(h) { return BL[h.b].replace ? [h.x, h.y, h.z] : [h.x + h.n[0], h.y + h.n[1], h.z + h.n[2]]; }
  function canPlaceAt(x, y, z, id) {
    const w = G.world; if (!w.inside(x, y, z)) return false;
    const cur = w.get(x, y, z); if (cur && !BL[cur].liquid && !BL[cur].replace) return false;
    const below = w.get(x, y - 1, z);
    if (BL[id].crop != null) return below === B.FARMLAND;
    if (id === B.SAPLING || id === B.BSAPLING || id === B.ROSE || id === B.DANDE || id === B.TGRASS) return below === B.GRASS || below === B.DIRT || below === B.FARMLAND;
    if (id === B.TORCH) return !!SOLID[below] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => SOLID[w.get(x + dx, y, z + dz)]);
    if (SOLID[id]) {
      const over = e => x + 1 > e.pos.x - e.w && x < e.pos.x + e.w && z + 1 > e.pos.z - e.w && z < e.pos.z + e.w && y + BL[id].hgt > e.pos.y && y < e.pos.y + e.h;
      if (over(P) || Ents.mobs.some(over)) return false;
    }
    return true;
  }
  function use(first) {
    const w = G.world, h = raycastBlocks(eyePos(), forward(), 5), held = game.held(), it = held && IT[held.id];
    if (h && first && (!P.sneak || !held)) {
      const k = h.x + ',' + h.y + ',' + h.z;
      if (h.b === B.CHEST) { openQuiz(h.x, h.y, h.z); return; }
      if (h.b === B.CRAFT) { openUI('craft'); return; }
      if (h.b === B.FURNACE || h.b === B.FURNACE_ON) { if (!w.containers.has(k)) w.containers.set(k, { type: 'furnace', in: null, fuel: null, out: null, burn: 0, burnMax: 0, cook: 0 }); openUI('furnace', { cont: w.containers.get(k), key: k }); return; }
      if (h.b === B.STORAGE) { if (!w.containers.has(k)) w.containers.set(k, { type: 'chest', slots: Array(27).fill(null) }); openUI('chest', { cont: w.containers.get(k), key: k }); return; }
      if (h.b === B.BED) { sleep(h); return; }
      if (h.b === B.TNT && held && held.id === I.FLINT_STEEL) { game.igniteTnt(h.x, h.y, h.z); useDurability(1); P.swing = 1; return; }
    }
    if (!held) return;
    if (it && it.food) { if (P.food < 20 || it.always || game.mode === 'creative') { if (eatT <= 0) eatT = 1e-4; } else if (first) UI.msg('Ты не голоден', 1.2); return; }
    if (it && it.bow) { if (game.mode === 'creative' || invCount(game.inv.main, I.ARROW) > 0) { if (bowT <= 0) bowT = 1e-4; } else if (first) UI.msg('Нет стрел — скрафти их из кремня, палки и пера'); return; }
    if (!h) return;
    if (it && it.tool && it.tool.type === 'hoe' && (h.b === B.GRASS || h.b === B.DIRT) && !SOLID[w.get(h.x, h.y + 1, h.z)]) {
      if (BL[w.get(h.x, h.y + 1, h.z)].cross) setBlock(h.x, h.y + 1, h.z, B.AIR);
      setBlock(h.x, h.y, h.z, B.FARMLAND); Snd.play('dig'); useDurability(1); P.swing = 1; return;
    }
    const pid = placesBlock(held.id); if (!pid) return;
    const [x, y, z] = placeFace(h); if (!canPlaceAt(x, y, z, pid)) return;
    // лицевая сторона (печь, верстак, тыква) смотрит на игрока: 0:+z 1:+x 2:-z 3:-x
    const meta = BL[pid].orient ? (((Math.round(P.yaw / (Math.PI / 2)) % 4) + 4) % 4) : null;
    setBlock(x, y, z, pid, meta); Snd.play('place'); P.swing = 1;
    if (game.mode === 'survival') { held.n--; if (!held.n) game.inv.main[game.inv.sel] = null; game.dirtyInv = true; }
    window.App && App.gameEvent('place');
  }
  function sleep(h) {
    spawn = [h.x + .5, h.y + 1, h.z + .5]; scheduleSave();
    if (Render.env.dF > 0.35 && weather.rain < 0.5) { UI.msg('🛏 Точка возрождения сохранена. Спать можно только ночью или в дождь', 3); return; }
    if (Ents.mobs.some(m => m.def.hostile && m.pos.distanceTo(P.pos) < 8)) { UI.msg('Нельзя спать — рядом монстры!'); return; }
    sleepT = 2.2; UI.msg('💤 Спокойной ночи…', 2);
  }
  function finishEat() {
    const s = game.held(), it = s && IT[s.id]; if (!it || !it.food) return;
    P.food = Math.min(20, P.food + it.food[0]); P.sat = Math.min(P.food, P.sat + it.food[1]);
    if (it.regen) { P.golden = 5; P.goldT = 0; }
    Snd.play('burp');
    if (game.mode === 'survival') { s.n--; if (!s.n) game.inv.main[game.inv.sel] = null; game.dirtyInv = true; }
  }
  function releaseBow() {
    const ch = Math.min(1, bowT); bowT = 0; if (ch < 0.12) return;
    if (game.mode === 'survival') { if (invRemove(game.inv.main, I.ARROW, 1) > 0) return; useDurability(1); }
    const d = forward(), o = eyePos().addScaledVector(d, 0.5);
    Ents.shootArrow(o, d, 10 + 45 * ch * ch, 'player', 2 + 7 * ch); game.dirtyInv = true; P.swing = 0.6;
  }
  function handleInput(dt) {
    actCd -= dt; useCd -= dt;
    const o = eyePos(), d = forward(), h = P.dead ? null : raycastBlocks(o, d, 5), sel = Render.selBox;
    if (h && game.ui == null) { sel.visible = true; const hg = BL[h.b].shape === 'slab' ? BL[h.b].hgt : 1; sel.scale.set(1, hg, 1); sel.position.set(h.x + .5, h.y + hg / 2, h.z + .5); } else sel.visible = false;
    if (!locked || P.dead || game.ui) { Render.crack.visible = false; breakT = 0; mouse.l = mouse.r = false; eatT = 0; bowT = 0; return; }
    // еда
    if (eatT > 0) {
      const s = game.held();
      if (!mouse.r || !s || !IT[s.id] || !IT[s.id].food) eatT = 0;
      else { eatT += dt; if (Math.floor(eatT * 4) !== Math.floor((eatT - dt) * 4)) { Snd.play('eat'); Render.burst(o.x + d.x * 0.5, o.y - 0.25, o.z + d.z * 0.5, IT[s.id].col, 4, 1.5, { size: 0.06 }); } if (eatT >= 1.6) { finishEat(); eatT = 0; } }
    }
    // лук: натяжение, пока держишь ПКМ
    if (bowT > 0) { const s = game.held(); if (!s || !IT[s.id] || !IT[s.id].bow) bowT = 0; else if (!mouse.r) releaseBow(); else bowT += dt; }
    // добыча
    if (mouse.l && h && eatT <= 0) {
      const key = h.x + ',' + h.y + ',' + h.z;
      if (key !== breakKey) { breakKey = key; breakT = 0; }
      if (h.b === B.CHEST) { if (actCd <= 0) { UI.msg('🎁 Это сундук-викторина — открой его правой кнопкой мыши'); actCd = 1.5; } }
      else if (game.mode === 'creative') { if (actCd <= 0) { breakBlock(h); actCd = 0.22; P.swing = 1; } }
      else {
        const tm = breakTime(h.b, game.held());
        if (tm === 0) { if (actCd <= 0) { breakBlock(h); actCd = 0.15; P.swing = 1; } }
        else if (isFinite(tm)) {
          breakT += dt / tm; if (P.swing <= 0) P.swing = 1;
          if (Math.random() < dt * 8) { Snd.play('dig', 0.5); Render.blockBurst(h.x, h.y, h.z, h.b, 2); }
          if (breakT >= 1) { breakBlock(h); breakT = 0; breakKey = ''; actCd = 0.15; }
        }
      }
      if (breakT > 0) { Render.crack.visible = true; Render.crack.position.set(h.x + .5, h.y + .5, h.z + .5); Render.crack.geometry = Render.crackGeos[Math.min(9, Math.floor(breakT * 10))]; } else Render.crack.visible = false;
    } else { Render.crack.visible = false; breakT = 0; breakKey = ''; }
    if (mouse.r && useCd <= 0 && eatT <= 0 && bowT <= 0) { use(useCd < -0.5); useCd = 0.22; }
  }

  // ---------- сундук-викторина (без выхода в меню) ----------
  function openQuiz(x, y, z) {
    const k = x + ',' + y + ',' + z, now = Date.now(), cdm = game.quizCd;
    if (cdm[k] > now) { UI.msg(`🔒 Сундук заперт ещё ${Math.ceil((cdm[k] - now) / 1000)} с — загляни пока в конспект`); return; }
    if (!window.App) return;
    game.ui = 'quiz'; keysReset(); if (document.pointerLockElement) document.exitPointerLock();
    Snd.play('chest');
    App.askOne(null, ok => {
      if (!mounted) return;
      if (ok === true) {
        setBlock(x, y, z, B.AIR); G.world.chests = G.world.chests.filter(c => !(c[0] === x && c[1] === y && c[2] === z));
        const loot = quizLoot();
        loot.forEach(([id, n], i) => Ents.dropItem(id, n, x + .5, y + .6, z + .5, new THREE.Vector3(rnd(-2, 2), 5 + i * 0.3, rnd(-2, 2))));
        ['#ffd23f', '#ff4fa3', '#5fe0d6', '#7c4dff'].forEach(c => Render.burst(x + .5, y + .7, z + .5, c, 20, 5, { lit: false }));
        App.gameEvent('chest'); App.confetti(90);
        UI.msg('🎁 Сундук открыт! Подбери награду: ' + loot.map(([id, n]) => iname(id) + ' ×' + n).join(', '), 5);
        while (G.world.chests.length < 6) { const dd = G.world.spawnChest(); if (!dd) break; remeshSet(dd); }
      } else if (ok === false) { cdm[k] = now + 45000; UI.msg('🔒 Неверно — сундук заперт на 45 с. Вопрос добавлен в «Работу над ошибками»', 4); }
      // если поверх всплыло ещё окно (новый уровень), ждём его закрытия и сразу возвращаемся в мир — без меню
      afterModals(() => { if (!mounted) return; game.ui = null; lock(true); });
    });
  }
  function afterModals(fn) {
    const bg = document.querySelector('.modal-bg');
    if (!bg) return fn();
    const check = () => { if (bg.isConnected) return; bg.removeEventListener('click', check); window.removeEventListener('keydown', check); afterModals(fn); };
    bg.addEventListener('click', check); window.addEventListener('keydown', check);
  }

  // ---------- мир: печи, растения, время, погода ----------
  function worldTick(dt) {
    const w = G.world;
    for (const [k, C] of w.containers) {
      if (C.type !== 'furnace') continue;
      const outId = C.in && SMELT[C.in.id], canOut = !!outId && (!C.out || (C.out.id === outId && C.out.n < stackMax(outId)));
      if (C.burn > 0) C.burn = Math.max(0, C.burn - dt);
      if (C.burn <= 0 && canOut && C.fuel) { C.burn = C.burnMax = fuelOf(C.fuel.id) * 0.6; C.fuel.n--; if (!C.fuel.n) C.fuel = null; }
      const open = UI.kind === 'furnace' && UI.data.key === k;
      if (C.burn > 0 && canOut) {
        C.cook += dt;
        if (C.cook >= 6) { C.cook = 0; C.in.n--; if (!C.in.n) C.in = null; if (C.out) C.out.n++; else C.out = mk(outId, 1); if (open) UI.render(); scheduleSave(); }
      } else C.cook = Math.max(0, C.cook - dt * 2);
      const [x, y, z] = k.split(',').map(Number), cur = w.get(x, y, z), lit = C.burn > 0;
      if ((cur === B.FURNACE && lit) || (cur === B.FURNACE_ON && !lit)) setBlock(x, y, z, lit ? B.FURNACE_ON : B.FURNACE, w.meta.get(IDX(x, y, z)) || 0);
      if (open) { const fl = overlay.querySelector('.mc-flame i'), pr = overlay.querySelector('.mc-progress i'); if (fl) fl.style.height = (C.burnMax ? C.burn / C.burnMax * 100 : 0) + '%'; if (pr) pr.style.width = (C.cook / 6 * 100) + '%'; }
    }
    tickT += dt; if (tickT < 1) return; tickT = 0;
    for (const [i] of [...w.ticking]) {
      const id = w.data[i], x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / WXZ) | 0;
      if (BL[id].crop != null) { if (Math.random() < 0.065 && Math.max(Render.env.dF > 0.35 ? w.sky[i] : 0, w.blk[i]) >= 9) setBlock(x, y, z, id + 1); }
      else if (id === B.SAPLING || id === B.BSAPLING) { if (Math.random() < 0.012) growTree(x, y, z, id === B.BSAPLING); }
      else w.ticking.delete(i);
    }
  }
  function growTree(x, y, z, birch) {
    const w = G.world, th = 4 + rint(0, 2); for (let yy = y + 1; yy <= y + th + 1; yy++) if (SOLID[w.get(x, yy, z)]) return;
    const log = birch ? B.BIRCH : B.LOG, lv = birch ? B.BLEAVES : B.LEAVES, dirty = new Set();
    const put = (a, b, c, id) => { if (!w.inside(a, b, c)) return; const cur = w.get(a, b, c); if (cur && !BL[cur].replace && !BL[cur].cross) return; const d = w.set(a, b, c, id); d && d.forEach(v => dirty.add(v)); };
    for (let yy = y + th - 3; yy <= y + th; yy++) { const r = yy >= y + th - 1 ? 1 : 2; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && Math.random() < .6) continue; put(x + dx, yy, z + dz, lv); } }
    put(x, y + th + 1, z, lv);
    for (let yy = y; yy < y + th; yy++) { const d = w.set(x, yy, z, log); d && d.forEach(v => dirty.add(v)); }
    remeshSet(dirty); scheduleSave();
  }
  function timeTick(dt) {
    if (sleepT > 0) {
      sleepT -= dt; UI.el.fade.style.opacity = Math.min(1, (2.2 - sleepT) * 1.5);
      if (sleepT <= 0) { gtime = 0.03; weather.rain = weather.target = 0; weather.timer = rnd(300, 600); UI.el.fade.style.opacity = 0; UI.msg('☀️ Доброе утро!'); nightClean = false; wasNight = false; }
      return;
    }
    gtime = (gtime + dt / DAY_LEN) % 1;
    weather.timer -= dt; if (weather.timer <= 0) { weather.target = weather.target > 0 ? 0 : 1; weather.timer = weather.target ? rnd(90, 200) : rnd(300, 600); if (weather.target) UI.msg('🌧 Начинается дождь', 2); }
    weather.rain += (weather.target - weather.rain) * Math.min(1, dt * 0.15);
    const night = Render.env.dF < 0.35;
    if (night && !wasNight) { nightClean = game.mode === 'survival' && !P.dead && game.difficulty > 0; if (nightClean) UI.msg('🌙 Наступает ночь — берегись монстров! Поставь факелы и построй укрытие', 4); }
    if (!night && wasNight) {
      if (nightClean && game.mode === 'survival') { UI.msg('🌅 Ты пережил ночь!', 4); window.App && App.gameEvent('night'); }
      nightClean = false;
      if (G.world.chests.length < 10) { const d = G.world.spawnChest(); if (d) { remeshSet(d); UI.msg('🌅 Новый день — где-то появился сундук 🎁', 4); } }
    }
    wasNight = night;
  }

  // ---------- камера, модель и рука ----------
  function updateCamera(dt, t) {
    const cam = Render.camera, eye = eyePos();
    P.swimT += ((P.swim ? 1 : 0) - P.swimT) * Math.min(1, 7 * dt);
    const bw = P.walk * (1 - P.swimT), bobY = Math.abs(Math.sin(P.phase)) * 0.075 * bw, bobX = Math.cos(P.phase) * 0.045 * bw;
    const moving = Math.hypot(P.vel.x, P.vel.z) > 1;
    let fovT = fovBase + (P.sprint && moving ? 11 : 0) + (P.fly && P.sprint ? 6 : 0) + (P.headWater ? -4 : 0);
    if (bowT > 0) fovT -= Math.min(1, bowT) * 12;
    P.fov += (fovT - P.fov) * Math.min(1, 8 * dt); if (Math.abs(cam.fov - P.fov) > 0.01) { cam.fov = P.fov; cam.updateProjectionMatrix(); }
    const tilt = P.hurtT > 0 ? Math.sin(P.hurtT * 20) * 0.03 : 0, sh = P.shake * 0.25;
    if (view === 0) {
      cam.position.set(eye.x + Math.cos(P.yaw) * bobX + rnd(-sh, sh), eye.y + bobY + rnd(-sh, sh), eye.z - Math.sin(P.yaw) * bobX);
      cam.rotation.set(P.pitch, P.yaw, Math.sin(P.phase) * 0.009 * bw + tilt + Math.sin(P.swimPh) * 0.012 * P.swimT);
    } else {
      const dir = forward(), sign = view === 1 ? -1 : 1; let dist = 0.2;
      for (; dist < 4.2; dist += 0.1) if (solidVox(Math.floor(eye.x + dir.x * dist * sign), Math.floor(eye.y + dir.y * dist * sign), Math.floor(eye.z + dir.z * dist * sign))) { dist -= 0.3; break; }
      dist = Math.max(0.3, dist); cam.position.set(eye.x + dir.x * dist * sign, eye.y + dir.y * dist * sign, eye.z + dir.z * dist * sign);
      if (view === 1) cam.rotation.set(P.pitch, P.yaw, 0); else cam.lookAt(eye);
    }
    // модель игрока: предмет в руке, броня, анимации
    const held = game.held(), hid = held ? held.id : 0;
    if (hid !== heldModelId) { setHeldModel(model, hid); heldModelId = hid; }
    const ak = game.inv.armor.map(s => s ? s.id : 0).join(','); if (ak !== armorKey) { setArmorModel(model, game.inv.armor); armorKey = ak; }
    // тело ложится вдоль взгляда; центр модели совпадает с центром низкого хитбокса пловца
    const sa = P.swimT * (Math.PI / 2 - clamp(P.pitch, -1.3, 1.3)), fy = P.bodyYaw;
    model.root.visible = view !== 0 && !P.dead; model.root.rotation.set(sa, fy + Math.PI, 0);
    model.root.position.set(P.pos.x + Math.sin(fy) * Math.sin(sa) * 0.9, P.pos.y + 0.9 - 0.6 * P.swimT - Math.cos(sa) * 0.9, P.pos.z + Math.cos(fy) * Math.sin(sa) * 0.9);
    animateModel(model, t, { walk: P.fly ? 0.15 : P.walk * (1 - P.swimT), phase: P.phase, swing: P.swing, pitch: -P.pitch, headYaw: clamp(angDiff(P.yaw, P.bodyYaw), -0.9, 0.9), sneak: P.sneak, fly: P.fly });
    if (P.swimT > 0.01) { // гребки руками и работа ногами
      const c = (Math.sin(P.swimPh) + 1) / 2, k = P.swimT, L = (a, b) => a + (b - a) * k;
      model.armR.rotation.x = L(model.armR.rotation.x, -Math.PI + c * 1.7); model.armL.rotation.x = L(model.armL.rotation.x, -Math.PI + c * 1.7);
      model.armR.rotation.z = L(model.armR.rotation.z, -0.2 - Math.sin(c * Math.PI) * 1.1); model.armL.rotation.z = L(model.armL.rotation.z, 0.2 + Math.sin(c * Math.PI) * 1.1);
      model.legR.rotation.x = L(model.legR.rotation.x, Math.sin(P.swimPh * 2.2) * 0.45); model.legL.rotation.x = L(model.legL.rotation.x, -Math.sin(P.swimPh * 2.2) * 0.45);
      model.head.rotation.x = L(model.head.rotation.x, clamp(-P.pitch - sa, -1.9, 0.6));
    }
    if (eatT > 0) model.armR.rotation.x = -1.2 + Math.sin(t * 14) * 0.15;
    if (bowT > 0) { model.armR.rotation.x = -1.5; model.armL.rotation.x = -1.4; }
    const lt = lightLevel(P.pos.x, P.pos.y + 1.6, P.pos.z);
    model.mats.forEach(m => m.color && m.color.setScalar(lt));
    model.extras.concat(Object.values(model.armorMat || {})).forEach(m => m.userData.base && m.color.copy(m.userData.base).multiplyScalar(lt));
    // рука и предмет от первого лица
    if (hid !== handItemId) {
      if (handItem) { handGroup.remove(handItem); handItem.material.dispose(); handItem = null; }
      handItemId = hid;
      if (hid) { const g = itemGeometry(hid); handItem = new THREE.Mesh(g, Render.itemMat.clone()); handItem.userData.flat = g.userData.flat; handGroup.add(handItem); }
    }
    handGroup.visible = view === 0 && !P.dead; handM.armR.visible = !handItem;
    const sw = Math.sin(P.swing * Math.PI), sw2 = Math.sin(Math.sqrt(P.swing) * Math.PI);
    handGroup.position.set(bobX * 0.6 - sw2 * 0.12, -bobY * 0.6 + Math.sin(t * 1.4) * 0.006 + sw * 0.06, -sw * 0.12);
    handGroup.rotation.set(-sw * 0.6, sw2 * 0.25, 0);
    if (handItem) {
      const it = IT[hid];
      if (handItem.userData.flat) {
        handItem.scale.setScalar(0.62); handItem.position.set(0.52, -0.36, -0.72); handItem.rotation.set(0.05, -1.25, 0.28);
        if (it && it.food && eatT > 0) { handItem.position.set(0.18, -0.22 + Math.abs(Math.sin(t * 14)) * 0.04, -0.5); handItem.rotation.set(0.2, -0.6, 0.1); }
        if (it && it.bow && bowT > 0) { const c = Math.min(1, bowT); handItem.position.set(0.12 - c * 0.05, -0.18, -0.6 + c * 0.08); handItem.rotation.set(0, -0.2, -0.7); if (c >= 1) handItem.position.x += Math.sin(t * 40) * 0.004; }
      } else { handItem.scale.setScalar(0.3); handItem.position.set(0.52, -0.46, -0.82); handItem.rotation.set(0.12, 0.78, 0); }
      handItem.material.color.setScalar(lt);
    }
    handM.mats.forEach(m => m.color && m.color.setScalar(lt));
  }
  function topInfo() {
    const hrs = (gtime * 24 + 6) % 24, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60), w = G.world;
    let near = null, nd = 1e9; for (const c of w.chests) { const d = Math.hypot(c[0] + .5 - P.pos.x, c[2] + .5 - P.pos.z); if (d < nd) { nd = d; near = c; } }
    let comp = 'нет'; if (near) { const a = Math.atan2(-(near[0] + .5 - P.pos.x), -(near[2] + .5 - P.pos.z)), rel = angDiff(a, P.yaw); comp = `${['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'][((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8]} ${Math.round(nd)} м`; }
    let s = `${Render.env.dF > 0.35 ? '☀️' : '🌙'} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${weather.rain > 0.3 ? ' 🌧' : ''} · 🎁 ${comp} (${w.chests.length})${game.mode === 'creative' ? ' · 🛠 творчество' : ''}${P.fly ? ' · ✈️' : ''}`;
    if (f3) {
      const x = Math.floor(P.pos.x), y = Math.floor(P.pos.y), z = Math.floor(P.pos.z);
      s += `<br>XYZ ${x} ${y} ${z} · свет: небо ${w.skyAt(x, y + 1, z)}, блоки ${w.blkAt(x, y + 1, z)} · FPS ${G.fps || 0}<br>мобов ${Ents.mobs.length} · предметов ${Ents.items.length} · еда ${P.food} · насыщение ${P.sat.toFixed(1)} · сложность: ${['мирная', 'лёгкая', 'нормальная', 'сложная'][game.difficulty]}`;
    }
    return s;
  }

  // ---------- меню ----------
  function showMenu(text) {
    if (UI.isInvUI()) UI.close(true);
    game.ui = 'menu'; overlay.style.display = 'grid'; overlay.classList.remove('mc-dim');
    const A = window.App, lvl = A ? A.levelOf() : 1, chip = (on, a, t) => `<span class="chip ${on ? 'on' : ''}" data-a="${a}">${t}</span>`;
    overlay.innerHTML = `<div class="g-panel" style="max-width:800px">
      <div class="row"><h2 style="margin:0">⛏️ ДелКрафт</h2><span class="tag">ур. ${lvl}${A ? ' · ' + A.titleOf(lvl) : ''}</span><span class="tag">🎁 сундуков: ${G.world.chests.length}</span><span class="spacer"></span><span class="muted small">мир сохраняется автоматически</span></div>
      <p class="small" style="margin:10px 0 14px">${text || '⏸ Пауза'}</p>
      <div class="row"><button class="btn big" data-a="play">▶ ${P.dead ? 'Возродиться' : 'Продолжить'}</button><button class="btn pink" data-a="wardrobe">👕 Гардероб</button><button class="btn ghost" data-a="fs">⛶ ${document.fullscreenElement ? 'Выйти из полного экрана' : 'Во весь экран'} <kbd>ё</kbd></button></div>
      <div class="row" style="margin-top:14px"><b class="small">Режим:</b>${chip(game.mode === 'survival', 'survival', '❤️ Выживание')}${chip(game.mode === 'creative', 'creative', '🛠 Творчество')}
        <b class="small" style="margin-left:8px">Сложность:</b>${['Мирная', 'Лёгкая', 'Нормальная', 'Сложная'].map((n, i) => chip(game.difficulty === i, 'd' + i, n)).join('')}</div>
      <div class="row" style="margin-top:10px"><b class="small">Графика:</b>${chip(quality === 0, 'q0', '⚡ Быстро')}${chip(quality === 1, 'q1', '✨ Тени + сглаживание')}${chip(quality === 2, 'q2', '🌅 Ультра: тени, лучи, свечение')}
        <b class="small" style="margin-left:8px">Чёткость:</b>${[1, 1.5, 2].map(s => chip(scale === s, 's' + s, s + '×')).join('')}
        <b class="small" style="margin-left:8px">Текстуры:</b>${[16, 32, 64].map(t => chip(TS === t, 't' + t, t + ' px' + (t === 64 ? ' (макс.)' : t === 16 ? ' (классика)' : ''))).join('')}</div>
      <div class="row" style="margin-top:10px"><b class="small">Мышь:</b><input type="range" min="8" max="50" value="${Math.round(sens * 10000)}" data-a="sens" style="width:120px"><b class="small">Обзор:</b><input type="range" min="60" max="100" value="${fovBase}" data-a="fov" style="width:120px">
        <b class="small">Камера:</b>${chip(view === 0, 'v0', '1-е лицо')}${chip(view === 1, 'v1', 'сзади')}${chip(view === 2, 'v2', 'спереди')}</div>
      ${game.mode === 'creative' ? `<div class="row" style="margin-top:10px"><b class="small">Мир:</b>${chip(false, 'day', '☀️ Утро')}${chip(false, 'night', '🌅 Закат')}${chip(false, 'rain', '🌧 Дождь вкл/выкл')}</div>` : ''}
      <div class="row" style="margin-top:12px"><span class="spacer"></span><button class="btn ${confirmNew ? 'bad' : 'ghost'} sm" data-a="new">${confirmNew ? 'Точно? Мир сотрётся' : '🔄 Новый мир'}</button></div>
      <div class="g-help small">
        <div><kbd>WASD</kbd> ходьба · <kbd>Пробел</kbd> прыжок / всплыть</div><div><kbd>Ctrl</kbd> или <kbd>W</kbd><kbd>W</kbd> бег · <kbd>Shift</kbd> присесть</div>
        <div><kbd>ЛКМ</kbd> (держать) — добывать, бить</div><div><kbd>ПКМ</kbd> — ставить, есть, стрелять, открыть верстак / печь / сундук</div>
        <div><kbd>E</kbd> инвентарь и крафт · <kbd>Q</kbd> выбросить</div><div><kbd>1–9</kbd>, колесо — хотбар · <kbd>СКМ</kbd> выбрать блок</div>
        <div><kbd>V</kbd>/<kbd>F5</kbd> камера · <kbd>F3</kbd> отладка · <kbd>F1</kbd> скрыть HUD</div><div><kbd>Esc</kbd> закрыть окно / пауза · <kbd>ё</kbd> или <kbd>&#96;</kbd> полный экран</div>
      </div>
      <p class="small muted" style="margin:6px 0 0">Путь выживания: дерево руками → доски → верстак → деревянная кирка → камень → печь, уголь и факелы → железо → алмазы. Сундуки 🎁 — вопросы из тренажёра, за верный ответ дают руду, еду и снаряжение. В полноэкранном режиме Esc закрывает окна и ставит паузу, а выход из полного экрана — клавиша <kbd>ё</kbd> (в Chrome, Edge и Яндекс Браузере).</p></div>`;
  }
  function showResume(text) { game.ui = 'resume'; overlay.style.display = 'grid'; overlay.classList.remove('mc-dim'); overlay.innerHTML = `<div class="mc-resume">${text || '🖱 Кликни, чтобы продолжить'}</div>`; }
  function onOverlayClick(e) {
    if (UI.isInvUI()) return; // окна инвентаря обрабатывают mousedown
    if (game.ui === 'resume') { lock(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return; const act = a.dataset.a;
    if (act === 'play') { if (P.dead) respawn(); lock(); }
    else if (act === 'respawn') { respawn(); lock(); }
    else if (act === 'tomenu') { respawn(); showMenu(); }
    else if (act === 'wardrobe') { game.ui = 'wardrobe'; openWardrobe(overlay, window.App && App.state.skin, cfg => { if (window.App) { App.state.skin = cfg; App.save(); } rebuildPlayerModel(); showMenu('👕 Образ сохранён! Нажми V, чтобы посмотреть на себя со стороны.'); }, () => showMenu()); }
    else if (act === 'fs') toggleFullscreen();
    else if (act === 'survival' || act === 'creative') {
      if (game.mode !== act) { game.mode = act; P.fly = false; if (act === 'creative' && !game.inv.main.some(Boolean)) creativeHotbar(); game.dirtyInv = true; scheduleSave(); }
      showMenu(act === 'creative' ? '🛠 Творчество: все предметы в инвентаре (E), полёт — F или двойной пробел, монстры не нападают.' : '❤️ Выживание: всё добывается и крафтится, есть голод, броня и монстры.');
    }
    else if (/^d\d$/.test(act)) { game.difficulty = +act[1]; scheduleSave(); showMenu(['🕊 Мирная: без монстров и голода', '🙂 Лёгкая: монстры бьют слабее', '⚔️ Нормальная — как в Minecraft', '💀 Сложная: монстры бьют больнее, голод может убить'][game.difficulty]); }
    else if (/^q\d$/.test(act)) { quality = +act[1]; Render.setQuality(quality, scale); scheduleSave(); showMenu(); }
    else if (/^t\d+$/.test(act)) { const t = +act.slice(1); if (t !== TS) { G.atlasCanvas = buildAtlas(t); Render.refreshAtlas(); for (const k in ICON) delete ICON[k]; UI.prev = {}; game.dirtyInv = true; scheduleSave(); } showMenu(`🎨 Текстуры ${t}×${t} на блок${t === 64 ? ' — максимум деталей, рельеф и блики' : ''}`); }
    else if (/^s[\d.]+$/.test(act)) { scale = +act.slice(1); Render.setQuality(quality, scale); scheduleSave(); showMenu(); }
    else if (/^v\d$/.test(act)) { view = +act[1]; showMenu(); }
    else if (act === 'day') { gtime = 0.06; nightClean = false; wasNight = false; showMenu('☀️ Утро'); }
    else if (act === 'night') { gtime = 0.46; nightClean = false; showMenu('🌅 Закат — скоро ночь'); }
    else if (act === 'rain') { weather.target = weather.target ? 0 : 1; weather.timer = 200; showMenu(weather.target ? '🌧 Дождь начинается' : '☀️ Дождь прекращается'); }
    else if (act === 'new') { if (!confirmNew) { confirmNew = true; showMenu('Нажми ещё раз, чтобы создать новый мир. Текущий будет удалён.'); return; } confirmNew = false; regenerate(); }
  }
  function onOverlayInput(e) { const a = e.target.dataset && e.target.dataset.a; if (a === 'sens') { sens = +e.target.value / 10000; scheduleSave(); } if (a === 'fov') { fovBase = +e.target.value; scheduleSave(); } }
  function regenerate() {
    for (const c of chunks) for (const k of ['solid', 'water', 'lava']) if (c[k]) { Render.scene.remove(c[k]); c[k].geometry.dispose(); c[k] = null; }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ }
    newWorld(null); Render.buildClouds(); Ents.spawnPassive(18); queueAll(); saveNow();
    showMenu('🌍 Новый мир создан! Инвентарь пуст — начни с дерева.');
  }

  // ---------- полноэкранный режим: клавиша ё / ` (Esc остаётся для окон) ----------
  function toggleFullscreen() {
    if (document.fullscreenElement) { try { navigator.keyboard && navigator.keyboard.unlock(); } catch (e) { /* */ } document.exitFullscreen().catch(() => {}); return; }
    const p = shell.requestFullscreen && shell.requestFullscreen({ navigationUI: 'hide' });
    if (p && p.then) p.then(() => { try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(() => {}); } catch (e) { /* */ } Render.resize(); }).catch(() => {});
  }

  // ---------- ввод ----------
  function keysReset() { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; }
  function lock(fromQuiz) {
    keysReset();
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* */ }
    setTimeout(() => { if (mounted && !locked && !game.ui) showResume(fromQuiz ? '✅ Готово! Кликни, чтобы вернуться в игру' : null); }, 200);
  }
  function onLock() {
    locked = document.pointerLockElement === canvas;
    UI.el.cur.classList.toggle('native', !locked);
    if (locked) {
      if (game.ui === 'menu' || game.ui === 'resume' || game.ui === 'wardrobe') { game.ui = null; overlay.style.display = 'none'; overlay.innerHTML = ''; }
      confirmNew = false;
    } else {
      keysReset();
      if (UI.isInvUI()) { UI.drawCursor(); return; } // окно остаётся открытым, дальше — обычный курсор
      if (game.ui) return;
      saveNow();
      // Esc закрыл окно, а браузер заодно отпустил мышь — не выкидываем в меню
      if (performance.now() - escCloseT < 800) showResume(); else showMenu('⏸ Пауза');
    }
  }
  function onMouseMove(e) {
    if (UI.isInvUI()) {
      if (!locked) { UI.pointer('move', e.clientX, e.clientY); return; }
      const r = shell.getBoundingClientRect(); UI.pointer('move', clamp(UI.vx + e.movementX, r.left, r.right - 4), clamp(UI.vy + e.movementY, r.top, r.bottom - 4)); return;
    }
    if (!locked || game.ui) return;
    P.yaw -= e.movementX * sens; P.pitch = clamp(P.pitch - e.movementY * sens, -1.55, 1.55);
  }
  function onDown(e) {
    if (UI.isInvUI()) { e.preventDefault(); if (locked) UI.pointer('down', UI.vx, UI.vy, e.button, e.shiftKey); else UI.pointer('down', e.clientX, e.clientY, e.button, e.shiftKey); return; }
    if (!locked || game.ui) return; e.preventDefault();
    if (e.button === 0) { mouse.l = true; if (attack()) mouse.l = false; }
    else if (e.button === 2) { mouse.r = true; useCd = -1; }
    else if (e.button === 1) {
      const h = raycastBlocks(eyePos(), forward(), 5); if (!h || !h.b || h.b === B.CHEST) return;
      const id = h.b === B.FURNACE_ON ? B.FURNACE : h.b, i = game.inv.main.slice(0, 9).findIndex(s => s && s.id === id);
      if (i >= 0) game.inv.sel = i; else if (game.mode === 'creative') game.inv.main[game.inv.sel] = mk(id, 64);
      game.dirtyInv = true; UI.itemName(game.held());
    }
  }
  function onUp(e) { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; }
  function onWheel(e) { if (!locked || game.ui) return; e.preventDefault(); game.inv.sel = (game.inv.sel + (e.deltaY > 0 ? 1 : 8)) % 9; game.dirtyInv = true; UI.itemName(game.held()); }
  function openUI(kind, data) {
    keysReset(); breakT = 0;
    const r = shell.getBoundingClientRect(); UI.vx = r.left + r.width / 2; UI.vy = r.top + r.height / 2;
    UI.open(kind, data);
  }
  let escCloseT = -1e9;
  function closeUI(viaEsc) { UI.close(); if (viaEsc) escCloseT = performance.now(); if (!locked) { if (viaEsc) showResume(); else lock(); } }
  const isFsKey = e => e.code === 'Backquote' || e.code === 'IntlBackslash' || ['ё', 'Ё', '`', '~', '§', '±'].includes(e.key);
  function onKey(e) {
    if (!mounted || (e.target && e.target.matches && e.target.matches('input, textarea'))) return;
    if (isFsKey(e) && !e.repeat && game.ui !== 'quiz') { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); return; }
    if (UI.isInvUI()) {
      e.stopPropagation();
      if (e.code === 'KeyE' || e.code === 'Escape') { e.preventDefault(); closeUI(e.code === 'Escape'); return; }
      if (/^Digit[1-9]$/.test(e.code) && UI.hover && /^(m|c|k|f|a):/.test(UI.hover)) {
        e.preventDefault(); const d = +e.code.slice(5) - 1, a = UI.getSlot(UI.hover), b = game.inv.main[d];
        if (UI.hover !== 'm:' + d && (!a || d < 9) && (!b || UI.accepts(UI.hover, b)) && UI.hover !== 'f:2') { UI.setSlot(UI.hover, b); game.inv.main[d] = a; UI.render(); }
        return;
      }
      if (e.code === 'KeyQ' && UI.hover && /^(m|c|k|f|a):/.test(UI.hover)) {
        const s = UI.getSlot(UI.hover);
        if (s) { if (e.ctrlKey || e.metaKey || s.n === 1) { UI.setSlot(UI.hover, null); game.dropFromPlayer(s); } else { s.n--; game.dropFromPlayer(mk(s.id, 1, s.d)); game.dirtyInv = true; } UI.render(); }
      }
      return;
    }
    if (!locked || game.ui) return;
    if (e.metaKey || e.altKey) return;
    if (e.code === 'Escape') { e.preventDefault(); document.exitPointerLock(); return; } // при Keyboard Lock Esc приходит сюда
    e.preventDefault(); e.stopPropagation();
    if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ControlLeft'].includes(e.code)) return;
    const now = performance.now();
    if (e.code === 'KeyW' && !e.repeat) { if (now - lastW < 280) sprintLatch = true; lastW = now; }
    if (e.code === 'Space' && !e.repeat) { if (now - lastSpace < 300 && game.mode === 'creative') { P.fly = !P.fly; P.vel.y = 0; UI.msg(P.fly ? '✈️ Полёт включён' : 'Полёт выключен', 1.2); } lastSpace = now; }
    if (e.code === 'KeyF') { if (game.mode === 'creative') { P.fly = !P.fly; P.vel.y = 0; UI.msg(P.fly ? '✈️ Полёт включён' : 'Полёт выключен', 1.2); } else UI.msg('Полёт есть только в творческом режиме', 1.6); }
    if (e.code === 'KeyV' || e.code === 'F5') view = (view + 1) % 3;
    if (e.code === 'F3') f3 = !f3;
    if (e.code === 'F1') game.hideHud = !game.hideHud;
    if (e.code === 'KeyE') { openUI(game.mode === 'creative' ? 'creative' : 'inv'); return; }
    if (e.code === 'KeyQ') { const s = game.held(); if (s) { if (e.ctrlKey || s.n === 1) { game.inv.main[game.inv.sel] = null; game.dropFromPlayer(s); } else { s.n--; game.dropFromPlayer(mk(s.id, 1, s.d)); } game.dirtyInv = true; P.swing = 0.5; } }
    if (/^Digit[1-9]$/.test(e.code)) { game.inv.sel = +e.code.slice(5) - 1; game.dirtyInv = true; UI.itemName(game.held()); }
    keys[e.code] = true;
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function onFs() { Render.resize(); if (!document.fullscreenElement) { try { navigator.keyboard && navigator.keyboard.unlock(); } catch (e) { /* */ } } if (game.ui === 'menu') showMenu(); }
  const listeners = [];
  function on(t, ev, fn, opt) { t.addEventListener(ev, fn, opt); listeners.push([t, ev, fn, opt]); }
  function bindEvents() {
    on(document, 'pointerlockchange', onLock); on(document, 'mousemove', onMouseMove); on(document, 'fullscreenchange', onFs);
    on(canvas, 'mousedown', onDown); on(overlay, 'mousedown', e => { if (UI.isInvUI() && !locked) onDown(e); }); on(window, 'mouseup', onUp);
    on(canvas, 'wheel', onWheel, { passive: false }); on(shell, 'contextmenu', e => e.preventDefault());
    on(canvas, 'click', () => { if (!locked && !game.ui) lock(); });
    on(window, 'keydown', onKey, true); on(window, 'keyup', onKeyUp, true); on(window, 'blur', keysReset); on(window, 'beforeunload', saveNow);
    on(overlay, 'click', onOverlayClick); on(overlay, 'input', onOverlayInput);
  }

  // ---------- цикл ----------
  let fpsA = 0, fpsN = 0;
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    frame(now);
  }
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    fpsA += dt; fpsN++; if (fpsA > 0.5) { G.fps = Math.round(fpsN / fpsA); fpsA = 0; fpsN = 0; }
    processQueue();
    if (game.ui == null || UI.isInvUI()) { timeTick(dt); updatePlayer(dt); handleInput(dt); Ents.update(dt); Ents.spawnTick(dt); worldTick(dt); }
    updateCamera(dt, now / 1000);
    G.env = Render.updateEnv({ time: gtime, rain: weather.rain, now: now / 1000, dt, center: P.pos, underwater: P.headWater, inLava: P.inLava });
    Render.updateParticles(dt, lightLevel); Render.updateRain(dt, Render.camera.position, weather.rain);
    if (Math.random() < dt * 3) for (const c of G.world.chests) if (Math.abs(c[0] - P.pos.x) + Math.abs(c[2] - P.pos.z) < 50) Render.emit({ x: c[0] + Math.random(), y: c[1] + 0.9, z: c[2] + Math.random(), vx: 0, vy: 1.1, vz: 0, life: 1.2, c: new THREE.Color(Math.random() < .5 ? '#ffd23f' : '#fff6c4'), g: -0.4, s: 0.1, lit: false, collide: false });
    for (const [k] of G.world.containers) {
      const [x, y, z] = k.split(',').map(Number);
      if (Math.random() < dt * 4 && Math.abs(x - P.pos.x) + Math.abs(z - P.pos.z) < 30 && G.world.get(x, y, z) === B.FURNACE_ON) Render.emit({ x: x + rnd(.2, .8), y: y + 1.05, z: z + rnd(.2, .8), vx: 0, vy: 0.8, vz: 0, life: 1, c: new THREE.Color('#777'), g: -0.3, s: 0.12, lit: true, grow: 0.15, collide: false });
    }
    if (game.dirtyInv) { game.dirtyInv = false; if (UI.isInvUI()) UI.render(); scheduleSave(); }
    UI.hud(game, dt, now);
    Render.updateShadow(P.pos.clone());
    Render.render({ hand: view === 0 && !P.dead, underwater: P.headWater });
  }
  function unmount() {
    if (!mounted) return;
    saveNow(); mounted = false; running = false; cancelAnimationFrame(raf); clearTimeout(saveTimer);
    listeners.forEach(([t, ev, fn, opt]) => t.removeEventListener(ev, fn, opt)); listeners.length = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try {
      ro && ro.disconnect(); if (UI.kind) UI.close(true); Ents.clear();
      for (const c of chunks) for (const k of ['solid', 'water', 'lava']) if (c[k]) c[k].geometry.dispose();
      chunks = []; meshQ = [];
      if (model) model.dispose(); if (handM) handM.dispose(); model = handM = null; handGroup = null; handItem = null; handItemId = -1;
      Render.dispose();
    } catch (e) { console.warn(e); }
    for (const k in ICON) delete ICON[k];
    G.world = null; game.ui = null; locked = false;
  }
  const debug = () => ({ P, game, Ents, Render, UI, keys, mouse,
    setTime: t => { gtime = t; nightClean = false; }, setView: v => { view = v; }, setYaw: (y, p) => { P.yaw = y; P.pitch = p; }, play: () => { game.ui = null; overlay.style.display = 'none'; overlay.innerHTML = ''; locked = true; },
    look: () => raycastBlocks(eyePos(), forward(), 5), breakLook: () => { const h = raycastBlocks(eyePos(), forward(), 5); if (h) breakBlock(h); return h; }, useLook: () => use(true), attack,
    step: (sec, k = {}) => { Object.assign(keys, k); for (let t = 0; t < sec; t += 1 / 60) { updatePlayer(1 / 60); handleInput(1 / 60); Ents.update(1 / 60); worldTick(1 / 60); } keysReset(); return [P.pos.x, P.pos.y, P.pos.z].map(v => +v.toFixed(2)); },
    run: (sec, fps = 30) => { let t = lastT; for (let i = 0; i < sec * fps; i++) { t += 1000 / fps; frame(t); } return [P.pos.x, P.pos.y, P.pos.z].map(v => +v.toFixed(2)); },
    give: (id, n = 1) => game.giveStack(mk(id, n)), weather: () => weather, setRain: v => { weather.rain = weather.target = v; }, tp: (x, y, z) => P.pos.set(x, y, z), quality: q => { quality = q; Render.setQuality(q, scale); },
    hand: () => handM, openUI, closeUI, setBlock, damage, time: () => gtime, spawnMob: (k, x, y, z) => Ents.spawnMob(k, x, y, z), world: () => G.world, B, I, IT, RECIPES,
    aim: (x, y, z) => { const e = eyePos(), dx = x - e.x, dy = y - e.y, dz = z - e.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); } });
  return { mount, unmount, debug };
})();
window.Game = Game;
