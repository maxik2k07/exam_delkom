// ===== ДелКрафт: звук, мобы, предметы на земле, стрелы, динамит, взрывы =====
const Snd = {
  ac: null, nb: null, muted: () => !!(window.App && !App.state.settings.sound),
  ctx() { if (!this.ac) { this.ac = new (window.AudioContext || window.webkitAudioContext)(); const b = this.ac.createBuffer(1, this.ac.sampleRate * 0.6, this.ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.nb = b; } return this.ac; },
  noise(freq, dur, vol, type = 'bandpass', q = 1.2, at = 0) {
    if (this.muted()) return; try { const A = this.ctx(), t = A.currentTime + at, s = A.createBufferSource(), f = A.createBiquadFilter(), g = A.createGain();
      s.buffer = this.nb; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f).connect(g).connect(A.destination); s.start(t); s.stop(t + dur + 0.02); } catch (e) { /* */ }
  },
  tone(f0, f1, dur, vol, type = 'square', at = 0) {
    if (this.muted()) return; try { const A = this.ctx(), t = A.currentTime + at, o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g).connect(A.destination); o.start(t); o.stop(t + dur + 0.02); } catch (e) { /* */ }
  },
  fart(pitch = 90, dur = 0.6) {
    if (this.muted()) return;
    try {
      const A = this.ctx(), t = A.currentTime;
      const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(pitch * 1.2, t); o.frequency.exponentialRampToValueAtTime(pitch * 0.62, t + dur);
      const lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 16 + Math.random() * 16; lg.gain.value = pitch * 0.4; lfo.connect(lg).connect(o.frequency);
      const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480 + Math.random() * 160; f.Q.value = 7;
      const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.38, t + 0.03);
      for (let k = 0.05; k < dur - 0.05; k += 0.035 + Math.random() * 0.05) g.gain.setValueAtTime(0.14 + Math.random() * 0.26, t + k);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const ns = A.createBufferSource(), nf = A.createBiquadFilter(), ng = A.createGain(); ns.buffer = this.nb; nf.type = 'bandpass'; nf.frequency.value = pitch * 2.2; nf.Q.value = 1.4; ng.gain.value = 0.3;
      ns.connect(nf).connect(ng).connect(g); o.connect(f).connect(g).connect(A.destination);
      [o, lfo, ns].forEach(n => { n.start(t); n.stop(t + dur + 0.05); });
    } catch (e) { /* */ }
  },
  play(k, v = 1) {
    switch (k) {
      case 'dig': this.noise(700 + Math.random() * 500, 0.09, 0.16 * v); break;
      case 'hit': this.noise(1200, 0.05, 0.12 * v, 'highpass', 0.7); break;
      case 'place': this.noise(380, 0.08, 0.22 * v); break;
      case 'step': this.noise(500 + Math.random() * 300, 0.05, 0.05 * v); break;
      case 'hurt': this.tone(320, 140, 0.18, 0.12); this.noise(900, 0.08, 0.1); break;
      case 'mobhurt': this.tone(240 + Math.random() * 120, 120, 0.15, 0.08); break;
      case 'pop': this.tone(900 + Math.random() * 300, 1600, 0.06, 0.06, 'sine'); break;
      case 'eat': this.noise(1800, 0.06, 0.12, 'bandpass', 2); break;
      case 'burp': this.tone(160, 90, 0.25, 0.1, 'sawtooth'); break;
      case 'bow': this.noise(2400, 0.12, 0.14, 'highpass', 0.5); this.tone(600, 200, 0.12, 0.05); break;
      case 'thunk': this.noise(300, 0.07, 0.18); break;
      case 'boom': this.noise(90, 1.1, 0.8, 'lowpass', 0.4); this.noise(400, 0.5, 0.4, 'bandpass', 0.5); break;
      case 'splash': this.noise(1900, 0.2, 0.12); break;
      case 'swim': this.noise(700 + Math.random() * 500, 0.35, 0.035, 'bandpass', 0.7); this.noise(2400, 0.12, 0.015, 'highpass', 0.5, 0.12); break;
      case 'fizz': this.noise(3200, 0.5, 0.06, 'highpass', 0.5); break;
      case 'click': this.tone(1200, 900, 0.03, 0.04, 'square'); break;
      case 'chest': this.tone(220, 330, 0.15, 0.06, 'triangle'); this.tone(330, 440, 0.15, 0.05, 'triangle', 0.08); break;
      case 'splat': this.noise(250, 0.25, 0.4, 'lowpass', 2); this.noise(900, 0.12, 0.15); break;
      case 'level': window.App && App.sfx('ach'); break;
    }
  }
};

// ---------- модели мобов ----------
function pixTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }
// шерсть/кожа мобов 16×16: мелкий шум + пятна + лёгкое затенение книзу; детали морды рисуются в сетке 8×8
function noiseMat(base, amt = 0.12, extra) {
  return new THREE.MeshLambertMaterial({ map: pixTex(16, 16, (g) => {
    const blot = Array.from({ length: 16 }, () => Math.random() - .5);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = vary(base, (Math.random() - .5) * amt + blot[(x >> 2) + (y >> 2) * 4] * amt * 0.6 - y / 16 * 0.08); g.fillRect(x, y, 1, 1); }
    if (extra) { g.save(); g.scale(2, 2); extra(g); g.restore(); }
  }) });
}
function mobModel(kind) {
  const root = new THREE.Group(), mats = [], legs = [], wings = [];
  const M = m => { mats.push(m); return m; };
  let head;
  const quad = (bodyC, headC, legC, d, faceFn, bodyMat) => {
    const bm = M(bodyMat || noiseMat(bodyC)); root.add(bx(d.bw, d.bh, d.bd, bm, 0, d.lh + d.bh / 2, 0));
    const hm = M(noiseMat(headC)), fm = M(noiseMat(headC, 0.12, faceFn));
    head = new THREE.Group(); head.position.set(0, d.hy * PX, d.hz * PX); head.add(new THREE.Mesh(new THREE.BoxGeometry(d.hs[0] * PX, d.hs[1] * PX, d.hs[2] * PX), [hm, hm, hm, hm, fm, hm])); root.add(head);
    const lm = M(noiseMat(legC));
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = new THREE.Group(); p.position.set(sx * d.lx * PX, d.lh * PX, sz * d.lz * PX); p.add(bx(d.lw || 4, d.lh, d.lw || 4, lm, 0, -d.lh / 2, 0)); root.add(p); legs.push(p); }
    return { bm, hm };
  };
  const eyes = (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 3, 1, 1); g.fillRect(7, 3, 1, 1); g.fillStyle = '#1a1a1a'; g.fillRect(1, 3, 1, 1); g.fillRect(6, 3, 1, 1); };
  if (kind === 'pig') quad('#f2a7a4', '#f2a7a4', '#e8928f', { bw: 10, bh: 8, bd: 15, lh: 6, hs: [8, 8, 8], hz: 10, hy: 12, lx: 3, lz: 5 }, g => { eyes(g); g.fillStyle = '#e07f7c'; g.fillRect(2, 5, 4, 2); g.fillStyle = '#7a3a3a'; g.fillRect(2, 5, 1, 1); g.fillRect(5, 5, 1, 1); });
  if (kind === 'cow') { const spots = new THREE.MeshLambertMaterial({ map: pixTex(8, 8, g => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = Math.random() < .35 ? '#f2f2f2' : vary('#4a3428', (Math.random() - .5) * .2); g.fillRect(x, y, 1, 1); } }) });
    quad('#4a3428', '#4a3428', '#3a281c', { bw: 12, bh: 10, bd: 18, lh: 12, hs: [8, 8, 6], hz: 12, hy: 20, lx: 4, lz: 6 }, g => { eyes(g); g.fillStyle = '#cfc6bb'; g.fillRect(2, 5, 4, 3); }, spots);
    const horn = M(new THREE.MeshLambertMaterial({ color: '#e8e0cc' })); head.add(bx(1, 2.5, 1, horn, -4.5, 4, 0)); head.add(bx(1, 2.5, 1, horn, 4.5, 4, 0)); }
  if (kind === 'sheep') { const r = quad('#f0f0ea', '#d8cfc4', '#cfc6bb', { bw: 11, bh: 10, bd: 16, lh: 12, hs: [6, 6, 8], hz: 10, hy: 19, lx: 3, lz: 5 }, eyes, noiseMat('#f2f2ec', 0.08)); head.add(bx(7, 3, 6, r.bm, 0, 3.6, -1)); }
  if (kind === 'chicken') {
    const wm = M(noiseMat('#f5f5f5', 0.06)); root.add(bx(6, 6, 8, wm, 0, 8, 0));
    head = new THREE.Group(); head.position.set(0, 11 * PX, 4 * PX); const hm = M(noiseMat('#f5f5f5', .06)), fm = M(noiseMat('#f5f5f5', .06, g => { g.fillStyle = '#111'; g.fillRect(1, 2, 1, 1); g.fillRect(6, 2, 1, 1); }));
    head.add(new THREE.Mesh(new THREE.BoxGeometry(4 * PX, 6 * PX, 3 * PX), [hm, hm, hm, hm, fm, hm])); head.children[0].position.y = 2 * PX;
    head.add(bx(4, 2, 2, M(new THREE.MeshLambertMaterial({ color: '#f2a020' })), 0, 2, 2.4)); head.add(bx(2, 2, 2, M(new THREE.MeshLambertMaterial({ color: '#d6302c' })), 0, 0.2, 2)); root.add(head);
    const lm = M(new THREE.MeshLambertMaterial({ color: '#f2a020' }));
    for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * 1.5 * PX, 5 * PX, 0); p.add(bx(1, 5, 1, lm, 0, -2.5, 0)); p.add(bx(3, .5, 3, lm, 0, -5, .8)); root.add(p); legs.push(p); }
    for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * 3.4 * PX, 10 * PX, 0); p.add(bx(1, 4, 6, wm, 0, -2, 0)); root.add(p); wings.push(p); }
  }
  if (kind === 'spider') {
    const bm = M(noiseMat('#2e2520', 0.25, g => { g.fillStyle = '#4a3a30'; g.fillRect(2, 2, 4, 3); })), hm = M(noiseMat('#2a221c', .2)), fm = M(noiseMat('#2a221c', .2, g => { g.fillStyle = '#ff1a1a'; [[1, 2], [6, 2], [2, 3], [5, 3], [3, 2], [4, 2]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); }));
    root.add(bx(10, 8, 12, bm, 0, 7, -6)); root.add(bx(6, 6, 6, bm, 0, 6, 1));
    head = new THREE.Group(); head.position.set(0, 7 * PX, 7 * PX); head.add(new THREE.Mesh(new THREE.BoxGeometry(8 * PX, 8 * PX, 8 * PX), [hm, hm, hm, hm, fm, hm])); root.add(head);
    const lm = M(noiseMat('#2a221c', .2));
    for (let i = 0; i < 8; i++) { const sx = i < 4 ? -1 : 1, k = i % 4; const p = new THREE.Group(); p.position.set(sx * 3 * PX, 7 * PX, (2.5 - k * 1.6) * PX); const leg = bx(16, 2, 2, lm, sx * 8, 0, 0); p.add(leg); p.rotation.z = sx * -0.55; p.rotation.y = sx * (0.6 - k * 0.4); root.add(p); legs.push(p); }
  }
  if (kind === 'creeper') {
    const camo = g => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = ['#5bb04a', '#4c9a3c', '#7ccc6a', '#3f8a32'][Math.random() * 4 | 0]; g.fillRect(x, y, 1, 1); } };
    const bm = M(new THREE.MeshLambertMaterial({ map: pixTex(8, 8, camo) })), fm = M(new THREE.MeshLambertMaterial({ map: pixTex(8, 8, g => { camo(g); g.fillStyle = '#101010'; [[1, 2], [2, 2], [1, 3], [2, 3], [5, 2], [6, 2], [5, 3], [6, 3], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [5, 6]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); }) }));
    root.add(bx(8, 12, 4, bm, 0, 12, 0));
    head = new THREE.Group(); head.position.set(0, 18 * PX, 0); const hb = new THREE.Mesh(new THREE.BoxGeometry(8 * PX, 8 * PX, 8 * PX), [bm, bm, bm, bm, fm, bm]); hb.position.y = 4 * PX; head.add(hb); root.add(head);
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = new THREE.Group(); p.position.set(sx * 2 * PX, 6 * PX, sz * 4 * PX); p.add(bx(4, 6, 4, bm, 0, -3, 0)); root.add(p); legs.push(p); }
  }
  if (kind === 'skeleton') {
    const bone = '#d4d4d4', bmat = M(noiseMat(bone, 0.1)), rib = M(noiseMat(bone, 0.1, g => { g.fillStyle = '#5a5a5a'; for (let y = 1; y < 8; y += 2) g.fillRect(1, y, 6, 1); }));
    const fm = M(noiseMat(bone, 0.1, g => { g.fillStyle = '#2a2a2a'; g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2); g.fillRect(3, 5, 2, 1); g.fillRect(2, 6, 4, 1); }));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(8 * PX, 12 * PX, 4 * PX), [rib, rib, bmat, bmat, rib, rib])); root.children[0].position.y = 18 * PX;
    head = new THREE.Group(); head.position.set(0, 24 * PX, 0); const hb = new THREE.Mesh(new THREE.BoxGeometry(8 * PX, 8 * PX, 8 * PX), [bmat, bmat, bmat, bmat, fm, bmat]); hb.position.y = 4 * PX; head.add(hb); root.add(head);
    const lr = new THREE.Group(); lr.position.set(-2 * PX, 12 * PX, 0); lr.add(bx(2, 12, 2, bmat, 0, -6, 0)); const ll = new THREE.Group(); ll.position.set(2 * PX, 12 * PX, 0); ll.add(bx(2, 12, 2, bmat, 0, -6, 0)); root.add(lr, ll); legs.push(lr, ll);
    const ar = new THREE.Group(); ar.position.set(-5 * PX, 22 * PX, 0); ar.add(bx(2, 12, 2, bmat, 0, -5, 0)); const al = new THREE.Group(); al.position.set(5 * PX, 22 * PX, 0); al.add(bx(2, 12, 2, bmat, 0, -5, 0)); root.add(ar, al);
    const bow = new THREE.Mesh(itemGeometry(I.BOW), Render.itemMat.clone()); mats.push(bow.material); bow.scale.setScalar(0.6); bow.position.set(0, -10 * PX, 2 * PX); bow.rotation.set(0, Math.PI / 2, Math.PI / 4); ar.add(bow);
    return { root, mats, legs, wings, head, arms: [ar, al] };
  }
  if (kind === 'zombie') { const Z = buildModel(ZOMBIE_SKIN, { noExtras: true }); return { root: Z.root, mats: Z.mats, Z, head: Z.head, legs: [], wings: [] }; }
  return { root, mats, legs, wings, head };
}
const ZOMBIE_SKIN = { tone: 8, eyes: 'sleepy', eyesC: 3, hair: 'none', hat: 'none', top: 'tee', topC: 4, bottom: 'trousers', bottomC: 6, shoes: 'barefoot', face: 'none', body: 'none' };
const MOBS = {
  pig: { hp: 10, w: 0.45, h: 0.9, speed: 1.25, fart: [95, 0.6], name: 'Свинья' }, cow: { hp: 10, w: 0.45, h: 1.4, speed: 1.05, fart: [70, 0.85], name: 'Корова' },
  sheep: { hp: 8, w: 0.45, h: 1.3, speed: 1.15, fart: [115, 0.6], name: 'Овца' }, chicken: { hp: 4, w: 0.25, h: 0.7, speed: 1.1, fart: [280, 0.35], name: 'Курица' },
  zombie: { hp: 20, w: 0.3, h: 1.9, speed: 2.3, hostile: 1, dmg: 3, burn: 1, fart: [80, 0.75], name: 'Зомби' }, skeleton: { hp: 20, w: 0.3, h: 1.95, speed: 2.1, hostile: 1, ranged: 1, burn: 1, fart: [150, 0.5], name: 'Скелет' },
  spider: { hp: 16, w: 0.6, h: 0.9, speed: 3.0, hostile: 1, dmg: 2, climb: 1, fart: [125, 0.5], name: 'Паук' }, creeper: { hp: 20, w: 0.3, h: 1.6, speed: 2.0, hostile: 1, fart: [60, 0.95], name: 'Крипер' }
};
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function lightLevel(x, y, z) { // яркость для сущностей с учётом дня
  const w = G.world, s = w.skyAt(Math.floor(x), Math.floor(y), Math.floor(z)) / 15, b = w.blkAt(Math.floor(x), Math.floor(y), Math.floor(z)) / 15;
  const lm = v => v / (3 - 2 * v), day = G.env ? 0.16 + 0.84 * G.env.dF : 1;
  return clamp(Math.max(lm(s) * day, lm(b) * 0.95) + 0.04, 0.06, 1);
}
class Mob {
  constructor(kind, x, y, z) {
    this.kind = kind; this.def = MOBS[kind]; this.pos = v3(x, y, z); this.vel = v3(); this.w = this.def.w; this.h = this.def.h; this.hp = this.def.hp;
    this.yaw = Math.random() * 6.28; this.yawT = this.yaw; this.ai = 0; this.walking = false; this.flee = 0; this.hurt = 0; this.cd = 1; this.fuse = 0; this.phase = 0; this.t = Math.random() * 10; this.onGround = false; this.fire = 0;
    this.m = mobModel(kind); this.root = this.m.root; this.root.traverse(o => { if (o.isMesh) o.layers.enable(2); }); G.scene.add(this.root);
  }
  dispose() { G.scene.remove(this.root); this.root.traverse(o => { if (o.geometry && o.geometry !== ITEM_GEO[I.BOW]) o.geometry.dispose(); }); this.m.mats.forEach(m => { m.map && m.map !== Render.atlasT && m.map.dispose(); m.dispose(); }); }
}
const Ents = {
  mobs: [], items: [], arrows: [], tnts: [],
  clear() { this.mobs.forEach(m => m.dispose()); this.items.forEach(e => this.rmItem(e)); this.arrows.forEach(a => G.scene.remove(a.mesh)); this.tnts.forEach(t => G.scene.remove(t.mesh)); this.mobs = []; this.items = []; this.arrows = []; this.tnts = []; },
  spawnMob(kind, x, y, z) { const m = new Mob(kind, x, y, z); this.mobs.push(m); return m; },
  // ---------- урон и смерть ----------
  hurtMob(m, dmg, src, opts = {}) {
    if (m.dead) return;
    m.hp -= dmg; m.hurt = 0.35; Snd.play('mobhurt');
    if (src) { const dx = m.pos.x - src.x, dz = m.pos.z - src.z, d = Math.hypot(dx, dz) || 1, k = opts.kb || 6.5; m.vel.x += dx / d * k; m.vel.z += dz / d * k; m.vel.y = Math.max(m.vel.y, 5); }
    if (!m.def.hostile) m.flee = 5; else m.angry = 1;
    Render.burst(m.pos.x, m.pos.y + m.h * 0.6, m.pos.z, '#b01010', 6, 2.5, { size: 0.1, life: 0.5 });
    if (m.hp <= 0) this.killMob(m, opts.byPlayer);
  },
  killMob(m, byPlayer) {
    m.dead = true;
    const cx = m.pos.x, cy = m.pos.y + m.h * 0.5, cz = m.pos.z, big = m.h * m.w;
    const reds = ['#b80d0d', '#8a0606', '#d42020', '#5e0303', '#e83a3a'];
    for (let i = 0; i < 55 + big * 60; i++) Render.emit({ x: cx + rnd(-m.w, m.w), y: cy + rnd(-m.h / 3, m.h / 3), z: cz + rnd(-m.w, m.w), vx: rnd(-5.5, 5.5), vy: rnd(1, 7.5), vz: rnd(-5.5, 5.5), life: rnd(0.8, 1.8), c: new THREE.Color(reds[i % 5]), g: 16, s: rnd(0.08, 0.2), lit: true, collide: true, decal: Math.random() < 0.18 });
    for (let i = 0; i < 6; i++) Render.addDecal(cx + rnd(-0.8, 0.8), Math.floor(m.pos.y) + (solidVox(Math.floor(cx), Math.floor(m.pos.y - 0.1), Math.floor(cz)) ? 0 : 0), cz + rnd(-0.8, 0.8), new THREE.Color(reds[i % 5]));
    Snd.play('splat'); Snd.fart(m.def.fart[0] * rnd(0.85, 1.15), m.def.fart[1]);
    for (const [id, a, b] of MOB_DROPS[m.kind] || []) { const n = rint(a, b); if (n > 0) this.dropItem(id, n, cx, cy, cz); }
    m.dispose(); this.mobs = this.mobs.filter(x => x !== m);
    if (m.def.hostile && byPlayer && window.App) App.gameEvent('kill');
  },
  // ---------- взрыв (крипер, динамит) ----------
  explode(x, y, z, power) {
    const w = G.world, dirty = new Set(), r = power;
    for (let bx2 = Math.floor(x - r); bx2 <= x + r; bx2++) for (let by = Math.floor(y - r); by <= y + r; by++) for (let bz = Math.floor(z - r); bz <= z + r; bz++) {
      const d = Math.hypot(bx2 + .5 - x, by + .5 - y, bz + .5 - z); if (d > r * (0.75 + Math.random() * 0.3)) continue;
      const b = w.get(bx2, by, bz); if (!b || b === B.BEDROCK || b === B.CHEST || BL[b].liquid) continue;
      if (b === B.TNT) { const ds = w.set(bx2, by, bz, B.AIR); ds && ds.forEach(c => dirty.add(c)); this.primeTnt(bx2 + .5, by, bz + .5, rnd(0.4, 1.3)); continue; }
      if (b === B.STORAGE || b === B.FURNACE || b === B.FURNACE_ON) G.game.dropContainer(bx2, by, bz);
      const ds = w.set(bx2, by, bz, B.AIR); ds && ds.forEach(c => dirty.add(c));
      if (Math.random() < 0.28) for (const [id, n] of blockDrops(b, { id: I.PICK_DIAMOND })) this.dropItem(id, n, bx2 + .5, by + .5, bz + .5);
    }
    G.game.remeshSet(dirty);
    for (let i = 0; i < 4; i++) Render.burst(x, y, z, ['#555555', '#8a8a8a', '#ffb020', '#eeeeee'][i], 35, 8, { size: 0.35, life: 0.9, g: -1, grow: 0.6, lit: false, collide: false });
    Snd.play('boom'); G.game.shake(0.6);
    const hit = (e, isPlayer) => { const d = Math.hypot(e.pos.x - x, e.pos.y + e.h / 2 - y, e.pos.z - z); if (d > r * 2) return; const k = 1 - d / (r * 2), dmg = Math.round(k * r * 3.8);
      const dx = (e.pos.x - x) / (d || 1), dz = (e.pos.z - z) / (d || 1); e.vel.x += dx * k * 14; e.vel.z += dz * k * 14; e.vel.y += k * 8;
      if (isPlayer) G.game.damage(dmg, 'Взрыв', 'explosion'); else this.hurtMob(e, dmg, null, { byPlayer: true }); };
    hit(G.P, true); this.mobs.slice().forEach(m => hit(m, false));
    this.items.forEach(it => { const d = it.pos.distanceTo(v3(x, y, z)); if (d < r * 2) { it.vel.add(it.pos.clone().sub(v3(x, y, z)).normalize().multiplyScalar(6 * (1 - d / (r * 2)))); it.vel.y += 3; } });
  },
  primeTnt(x, y, z, fuse = 4) {
    const mesh = new THREE.Mesh(itemGeometry(B.TNT), new THREE.MeshLambertMaterial({ map: Render.atlasT })); mesh.scale.setScalar(0.98); mesh.layers.enable(2); G.scene.add(mesh);
    this.tnts.push({ pos: v3(x, y, z), vel: v3(rnd(-1, 1), 4, rnd(-1, 1)), w: 0.49, h: 0.98, fuse, mesh, onGround: false }); Snd.play('fizz');
  },
  // ---------- предметы на земле ----------
  dropItem(id, n, x, y, z, vel, d = 0) {
    const flat = itemGeometry(id).userData.flat, mat = Render.itemMat.clone();
    const mesh = new THREE.Mesh(itemGeometry(id), mat); mesh.scale.setScalar(flat ? 0.42 : 0.26); mesh.layers.enable(2); G.scene.add(mesh);
    const e = { stack: mk(id, n, d), pos: v3(x, y, z), vel: vel || v3(rnd(-2, 2), rnd(2.5, 4.5), rnd(-2, 2)), w: 0.13, h: 0.25, onGround: false, age: 0, pick: 0.5, mesh, flat, spin: Math.random() * 6 };
    this.items.push(e); return e;
  },
  rmItem(e) { G.scene.remove(e.mesh); e.mesh.material.dispose(); },
  // ---------- стрелы ----------
  shootArrow(from, dir, speed, owner, dmg) {
    const g = new THREE.Group(), shaft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55), new THREE.MeshLambertMaterial({ color: '#8a6438' })), tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), new THREE.MeshLambertMaterial({ color: '#9a9a9a' }));
    tip.position.z = 0.29; g.add(shaft, tip); const fl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), new THREE.MeshLambertMaterial({ color: '#f2f2f2' })); fl.position.z = -0.25; g.add(fl);
    G.scene.add(g); this.arrows.push({ pos: from.clone(), vel: dir.clone().multiplyScalar(speed), owner, dmg, mesh: g, stuck: 0, life: 60 }); Snd.play('bow');
  },
  update(dt) {
    const P = G.P, w = G.world;
    // мобы
    for (const m of this.mobs.slice()) { if (!m.dead) this.updateMob(m, dt); }
    // предметы
    for (const e of this.items.slice()) {
      e.age += dt; e.pick -= dt; e.spin += dt * 1.6;
      const inW = BL[w.get(Math.floor(e.pos.x), Math.floor(e.pos.y), Math.floor(e.pos.z))].liquid;
      if (inW) { e.vel.y += (1.5 - e.vel.y) * Math.min(1, 3 * dt); } else e.vel.y -= 18 * dt;
      const fr = e.onGround ? 8 : 0.5; e.vel.x -= e.vel.x * Math.min(1, fr * dt); e.vel.z -= e.vel.z * Math.min(1, fr * dt);
      const d = Math.hypot(P.pos.x - e.pos.x, P.pos.y + 0.8 - e.pos.y, P.pos.z - e.pos.z);
      if (e.pick <= 0 && !P.dead && d < 1.9 && G.game.canFit(e.stack)) {
        const dir = v3(P.pos.x - e.pos.x, P.pos.y + 0.6 - e.pos.y, P.pos.z - e.pos.z).normalize(); e.pos.addScaledVector(dir, Math.min(d, dt * 9));
        if (d < 0.7) { const left = G.game.giveStack(e.stack); Snd.play('pop'); if (left <= 0) { this.rmItem(e); this.items = this.items.filter(x => x !== e); continue; } e.stack.n = left; }
      } else moveEntity(e, dt, false);
      if (e.age > 300 || e.pos.y < -10) { this.rmItem(e); this.items = this.items.filter(x => x !== e); continue; }
      // слияние одинаковых предметов
      if (((e.age * 4) | 0) !== (((e.age - dt) * 4) | 0)) for (const o of this.items) { if (o !== e && o.stack.id === e.stack.id && !e.stack.d && !o.stack.d && o.stack.n + e.stack.n <= stackMax(e.stack.id) && o.pos.distanceTo(e.pos) < 0.8) { o.stack.n += e.stack.n; this.rmItem(e); this.items = this.items.filter(x => x !== e); break; } }
      e.mesh.position.set(e.pos.x, e.pos.y + 0.18 + Math.sin(e.age * 2.5) * 0.06, e.pos.z); e.mesh.rotation.y = e.spin;
      e.mesh.material.color.setScalar(lightLevel(e.pos.x, e.pos.y + 0.3, e.pos.z));
    }
    // стрелы
    for (const a of this.arrows.slice()) {
      if (a.stuck) { a.life -= dt; if (a.owner === 'player' && P.pos.distanceTo(a.pos) < 1.4 && G.game.canFit(mk(I.ARROW, 1))) { G.game.giveStack(mk(I.ARROW, 1)); Snd.play('pop'); a.life = 0; } if (a.life <= 0) { G.scene.remove(a.mesh); this.arrows = this.arrows.filter(x => x !== a); } continue; }
      a.vel.y -= 18 * dt; a.life -= dt;
      const step = a.vel.clone().multiplyScalar(dt), len = step.length(), dir = step.clone().normalize();
      const hb = raycastBlocks(a.pos, dir, len);
      let hitEnt = null, ht = len;
      const tgts = a.owner === 'player' ? this.mobs : [P];
      for (const t of tgts) { const tt = rayAABB(a.pos, dir, t.pos.x - t.w, t.pos.y, t.pos.z - t.w, t.pos.x + t.w, t.pos.y + t.h, t.pos.z + t.w, ht); if (tt != null) { ht = tt; hitEnt = t; } }
      if (hitEnt && (!hb || ht < hb.t)) {
        const dmg = Math.ceil(a.dmg * Math.min(1.5, a.vel.length() / 40));
        if (hitEnt === P) G.game.damage(dmg, 'Стрела скелета', 'arrow', a.pos); else this.hurtMob(hitEnt, dmg, a.pos.clone().addScaledVector(dir, -1), { byPlayer: true, kb: 4 });
        G.scene.remove(a.mesh); this.arrows = this.arrows.filter(x => x !== a); Snd.play('thunk'); continue;
      }
      if (hb) { a.pos.addScaledVector(dir, hb.t - 0.05); a.stuck = 1; a.life = a.owner === 'player' ? 60 : 10; Snd.play('thunk'); if (hb.b === B.TNT) { G.game.igniteTnt(hb.x, hb.y, hb.z); } }
      else a.pos.add(step);
      a.mesh.position.copy(a.pos); a.mesh.lookAt(a.pos.clone().add(a.vel));
      if (a.life <= 0 || a.pos.y < -10) { G.scene.remove(a.mesh); this.arrows = this.arrows.filter(x => x !== a); }
    }
    // динамит
    for (const t of this.tnts.slice()) {
      t.vel.y -= 20 * dt; t.vel.x *= 0.96; t.vel.z *= 0.96; moveEntity(t, dt, false); t.fuse -= dt;
      t.mesh.position.set(t.pos.x, t.pos.y + 0.49, t.pos.z); const fl = Math.sin(t.fuse * (t.fuse < 1 ? 30 : 12)) > 0;
      t.mesh.material.emissive.setHex(fl ? 0x777777 : 0); t.mesh.scale.setScalar(0.98 + (t.fuse < 0.5 ? (0.5 - t.fuse) * 0.3 : 0));
      if (Math.random() < dt * 20) Render.emit({ x: t.pos.x, y: t.pos.y + 1.05, z: t.pos.z, vx: rnd(-.3, .3), vy: 1.2, vz: rnd(-.3, .3), life: 0.6, c: new THREE.Color('#bbbbbb'), g: -0.5, s: 0.12, lit: false, grow: 0.2, collide: false });
      if (t.fuse <= 0) { G.scene.remove(t.mesh); t.mesh.material.dispose(); this.tnts = this.tnts.filter(x => x !== t); this.explode(t.pos.x, t.pos.y + 0.5, t.pos.z, 4); }
    }
  },
  updateMob(m, dt) {
    const d = m.def, P = G.P, w = G.world;
    m.t += dt; m.cd -= dt; m.hurt = Math.max(0, m.hurt - dt);
    const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, dist = Math.hypot(dx, dz) || 0.01, dy = P.pos.y - m.pos.y;
    const dark = G.env.dF < 0.35 || lightLevel(m.pos.x, m.pos.y + 1, m.pos.z) < 0.35;
    let wx = 0, wz = 0, speed = d.speed;
    const peaceful = G.game.difficulty === 0, survival = G.game.mode === 'survival';
    let chase = d.hostile && survival && !P.dead && !peaceful && dist < 28 && Math.abs(dy) < 12 && (m.kind !== 'spider' || dark || m.angry);
    const see = chase && G.game.lineOfSight(m.pos.clone().setY(m.pos.y + m.h * 0.85), P.pos.clone().setY(P.pos.y + 1.6));
    if (chase && (see || dist < 12)) {
      m.yawT = Math.atan2(dx, dz);
      if (d.ranged && see && dist < 9) { wx = -dx / dist * 0.4; wz = -dz / dist * 0.4; if (dist > 6) { wx = wz = 0; } }
      else if (dist > m.w + P.w + 0.3) { wx = dx / dist; wz = dz / dist; }
    } else {
      m.ai -= dt; if (m.ai <= 0) { m.ai = 2 + Math.random() * 4; m.walking = Math.random() < 0.55; m.yawT = Math.random() * Math.PI * 2; }
      if (m.walking) { wx = Math.sin(m.yawT); wz = Math.cos(m.yawT); }
      if (m.flee > 0) { m.flee -= dt; wx = -dx / dist; wz = -dz / dist; speed *= 2.2; m.yawT = Math.atan2(wx, wz); }
      chase = false;
    }
    if (m.kind === 'creeper' && chase) {
      if (dist < 2.7 && Math.abs(dy) < 2.5) { m.fuse += dt; wx = wz = 0; if (m.fuse < dt * 1.5) Snd.play('fizz'); } else m.fuse = Math.max(0, m.fuse - dt);
      if (m.fuse > 1.5) { const p = m.pos.clone(); m.dead = true; m.dispose(); this.mobs = this.mobs.filter(x => x !== m); this.explode(p.x, p.y + 0.8, p.z, 3); return; }
      m.root.scale.setScalar(1 + (m.fuse > 0 ? Math.sin(m.fuse * 20) * 0.05 * m.fuse : 0));
    }
    if ((m.kind === 'zombie' || m.kind === 'spider') && chase && dist < 1.3 + m.w && Math.abs(dy) < 1.7 && m.cd <= 0) { m.cd = 1; G.game.damage(d.dmg * G.game.dmgMul(), d.name, 'mob', m.pos); }
    if (m.kind === 'spider' && chase && dist < 4 && dist > 2 && m.onGround && m.cd <= 0.2 && Math.random() < dt * 2) { m.vel.y = 7; m.vel.x += dx / dist * 5; m.vel.z += dz / dist * 5; }
    if (d.ranged && chase && see && dist < 16 && m.cd <= 0) {
      m.cd = 2 + Math.random(); const from = m.pos.clone().setY(m.pos.y + 1.5), to = P.pos.clone().setY(P.pos.y + 1.2), dir = to.sub(from); const hd = Math.hypot(dir.x, dir.z); dir.y += hd * 0.12; dir.normalize();
      dir.x += rnd(-0.05, 0.05); dir.z += rnd(-0.05, 0.05); this.shootArrow(from.addScaledVector(dir, 0.6), dir.normalize(), 26, 'mob', 2 + G.game.difficulty);
    }
    // горение днём
    if (d.burn && G.env.dF > 0.6 && !G.env.rain) {
      let exposed = true; for (let y = Math.floor(m.pos.y + 2); y < WY; y++) if (OPQ[w.get(Math.floor(m.pos.x), y, Math.floor(m.pos.z))]) { exposed = false; break; }
      if (exposed) m.fire = 1;
    }
    const inW = BL[w.get(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.4), Math.floor(m.pos.z))].liquid;
    if (inW) m.fire = 0;
    if (m.fire > 0) { m.fire -= dt * 0.25; if (Math.random() < dt * 14) Render.emit({ x: m.pos.x + rnd(-m.w, m.w), y: m.pos.y + rnd(0, m.h), z: m.pos.z + rnd(-m.w, m.w), vx: 0, vy: 1.4, vz: 0, life: 0.5, c: new THREE.Color(Math.random() < .5 ? '#ff8c1a' : '#ffd23f'), g: -0.5, s: 0.13, lit: false, collide: false }); m.burnT = (m.burnT || 0) - dt; if (m.burnT <= 0) { m.burnT = 1; this.hurtMob(m, 1, null); if (m.dead) return; } }
    if (d.hostile && (dist > 72 || !survival || peaceful)) { m.dispose(); this.mobs = this.mobs.filter(x => x !== m); return; }
    const acc = m.onGround ? 10 : 2;
    m.vel.x += (wx * speed - m.vel.x) * Math.min(1, acc * dt); m.vel.z += (wz * speed - m.vel.z) * Math.min(1, acc * dt);
    if (inW) m.vel.y += (2.6 - m.vel.y) * Math.min(1, 3 * dt); else if (m.kind === 'chicken' && m.vel.y < -2) m.vel.y = -2; else m.vel.y -= 28 * dt;
    // мобы не проходят сквозь игрока и друг друга — расталкиваются
    const push = (o, k) => { const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z, od = Math.hypot(ox, oz), minD = m.w + o.w; if (od >= minD || m.pos.y >= o.pos.y + o.h || m.pos.y + m.h <= o.pos.y) return; const nx = od > 1e-3 ? ox / od : Math.random() - .5, nz = od > 1e-3 ? oz / od : Math.random() - .5, f = (minD - od) * k; m.vel.x += nx * f; m.vel.z += nz * f; };
    if (!P.dead) push(P, 40);
    for (const o of this.mobs) if (o !== m && Math.abs(o.pos.x - m.pos.x) < 1.5 && Math.abs(o.pos.z - m.pos.z) < 1.5) push(o, 20);
    const h = moveEntity(m, dt, false);
    if ((h.hx || h.hz) && (wx || wz)) { if (d.climb) m.vel.y = 3.5; else if (m.onGround) m.vel.y = 8.3; else if (inW) m.vel.y = Math.max(m.vel.y, 7.5); }
    if (m.pos.y < -10) { m.dispose(); this.mobs = this.mobs.filter(x => x !== m); return; }
    m.yaw += angDiff(m.yawT, m.yaw) * Math.min(1, 6 * dt);
    const hs = Math.hypot(m.vel.x, m.vel.z); m.phase += hs * dt * 3.2;
    m.root.position.copy(m.pos); m.root.rotation.y = m.yaw;
    const sw = Math.sin(m.phase) * Math.min(1, hs / 1.5) * 0.7, M = m.m;
    if (M.Z) { animateModel(M.Z, m.t, { walk: Math.min(1, hs / 2), phase: m.phase, zombie: true }); M.Z.head.rotation.x = chase ? -Math.atan2(dy, dist) : 0; }
    else if (m.kind === 'spider') M.legs.forEach((l, i) => { l.rotation.x = Math.sin(m.phase * 1.6 + i * 1.3) * 0.3 * Math.min(1, hs); });
    else if (m.kind === 'skeleton') { M.legs[0].rotation.x = sw; M.legs[1].rotation.x = -sw; M.arms[0].rotation.x = chase ? -1.4 : -sw * 0.8; M.arms[1].rotation.x = chase ? -1.2 : sw * 0.8; M.head.rotation.x = chase ? -Math.atan2(dy, dist) : 0; }
    else { const L = M.legs; if (L.length === 4) { L[0].rotation.x = sw; L[3].rotation.x = sw; L[1].rotation.x = -sw; L[2].rotation.x = -sw; } else if (L.length === 2) { L[0].rotation.x = sw * 1.3; L[1].rotation.x = -sw * 1.3; } if (M.head) M.head.rotation.x = Math.sin(m.t * 0.7) * 0.15; }
    if (M.wings && M.wings.length) { const f = m.onGround ? 0.05 : 0.9; M.wings[0].rotation.z = Math.sin(m.t * 22) * f; M.wings[1].rotation.z = -Math.sin(m.t * 22) * f; }
    const lt = lightLevel(m.pos.x, m.pos.y + m.h * 0.6, m.pos.z), em = m.hurt > 0 ? 0x990000 : (m.kind === 'creeper' && m.fuse > 0 && Math.sin(m.fuse * 18) > 0) ? 0x777777 : 0;
    M.mats.forEach(mt => { if (mt.color) mt.color.setScalar(lt); if (mt.emissive) mt.emissive.setHex(em); });
  },
  spawnTick(dt) {
    const P = G.P, w = G.world, game = G.game;
    this._ht = (this._ht || 0) - dt; this._pt = (this._pt || 0) - dt;
    if (this._ht <= 0 && game.mode === 'survival' && game.difficulty > 0) {
      this._ht = 1.6;
      if (this.mobs.filter(m => m.def.hostile).length < 10) for (let a = 0; a < 6; a++) {
        const ang = Math.random() * 6.28, r = rnd(18, 34), x = Math.floor(P.pos.x + Math.cos(ang) * r), z = Math.floor(P.pos.z + Math.sin(ang) * r);
        if (x < 2 || z < 2 || x >= WX - 2 || z >= WZ - 2) continue;
        const y0 = clamp(Math.floor(P.pos.y) + rint(-14, 10), 2, WY - 3);
        for (let y = y0; y > y0 - 10 && y > 1; y--) {
          if (!SOLID[w.get(x, y - 1, z)] || SOLID[w.get(x, y, z)] || SOLID[w.get(x, y + 1, z)] || BL[w.get(x, y, z)].liquid) continue;
          const sky = w.skyAt(x, y, z), bl = w.blkAt(x, y, z), eff = sky * (G.env.dF > 0.35 ? 1 : 0.2);
          if (bl > 7 || eff > 7) break;
          const r2 = Math.random(); this.spawnMob(r2 < 0.38 ? 'zombie' : r2 < 0.62 ? 'skeleton' : r2 < 0.82 ? 'spider' : 'creeper', x + .5, y, z + .5); break;
        }
        break;
      }
    }
    if (this._pt <= 0) { this._pt = 12; if (this.mobs.filter(m => !m.def.hostile).length < 14) this.spawnPassive(2); }
  },
  spawnPassive(n) {
    const w = G.world;
    for (let i = 0, tries = 0; i < n && tries < 300; tries++) {
      const x = 2 + Math.random() * (WX - 4) | 0, z = 2 + Math.random() * (WZ - 4) | 0, y = w.surface(x, z);
      if (w.get(x, y, z) !== B.GRASS || SOLID[w.get(x, y + 1, z)]) continue;
      if (G.P && Math.hypot(x - G.P.pos.x, z - G.P.pos.z) < 12) continue;
      this.spawnMob(['pig', 'cow', 'sheep', 'chicken'][Math.random() * 4 | 0], x + .5, y + 1, z + .5); i++;
    }
  }
};
function rayAABB(o, d, x0, y0, z0, x1, y1, z1, max) {
  let t0 = 0, t1 = max; const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z], mn = [x0, y0, z0], mx = [x1, y1, z1];
  for (let k = 0; k < 3; k++) { if (Math.abs(dd[k]) < 1e-9) { if (oo[k] < mn[k] || oo[k] > mx[k]) return null; continue; } let a = (mn[k] - oo[k]) / dd[k], b = (mx[k] - oo[k]) / dd[k]; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
  return t0;
}
