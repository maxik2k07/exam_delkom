// ===== ДелКрафт: рендер (шейдеры, тени, постобработка, небо, облака, дождь, частицы) =====
const SH_COMMON = `
float lm(float x){ return x / (3.0 - 2.0 * x); }
vec3 nrmOf(float i){ if (i < 0.5) return vec3(1.,0.,0.); if (i < 1.5) return vec3(-1.,0.,0.); if (i < 2.5) return vec3(0.,1.,0.); if (i < 3.5) return vec3(0.,-1.,0.); if (i < 4.5) return vec3(0.,0.,1.); return vec3(0.,0.,-1.); }`;
const SH_SHADOW = `
uniform sampler2D uShadow; uniform float uShadowOn; uniform float uTexel; varying vec4 vSh;
float shadowF(){
  if (uShadowOn < 0.5) return 1.0;
  vec3 sc = vSh.xyz / vSh.w;
  if (sc.x <= 0.001 || sc.x >= 0.999 || sc.y <= 0.001 || sc.y >= 0.999 || sc.z >= 1.0) return 1.0;
  float d = sc.z - 0.0012, s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += step(d, unpackRGBAToDepth(texture2D(uShadow, sc.xy + vec2(float(i), float(j)) * uTexel)));
  float edge = smoothstep(0.0, 0.1, min(min(sc.x, 1.0 - sc.x), min(sc.y, 1.0 - sc.y)));
  return mix(1.0, s / 9.0, edge);
}`;
const VOX_VS = `
attribute vec4 aL; attribute vec2 aM; uniform float uTime; uniform float uWind; uniform mat4 uShadowMatrix;
varying vec2 vUv; varying vec4 vL; varying vec3 vN; varying float vDist; varying vec4 vSh; varying vec3 vW; varying float vF;
${SH_COMMON}
void main(){
  vec3 p = position; float sw = aM.y / 100.0; vF = aM.x;
  if (sw > 0.0) { float w = sin(uTime * 1.6 + p.x * 0.8 + p.z * 0.6) * 0.06 + sin(uTime * 2.7 + p.z * 1.3 + p.x * 0.4) * 0.025; p.x += w * sw * uWind; p.z += w * 0.6 * sw * uWind; }
  vN = nrmOf(aM.x); vL = aL; vUv = uv; vW = p;
  vSh = uShadowMatrix * vec4(p + vN * 0.08, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vDist = length(mv.xyz); gl_Position = projectionMatrix * mv;
}`;
const VOX_FS = `
#include <packing>
uniform sampler2D uMap; uniform sampler2D uNorm; uniform sampler2D uAvg; uniform float uAtlasPx; uniform float uBump; uniform float uWet;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uTime; uniform vec3 uCam; uniform vec3 uSkyTop; uniform vec3 uHor;
varying vec2 vUv; varying vec4 vL; varying vec3 vN; varying float vDist; varying vec3 vW; varying float vF;
${SH_COMMON}
${SH_SHADOW}
// направления u и v текстуры для каждой грани (как в FACES)
void tbn(float i, out vec3 T, out vec3 Bt){
  if (i < 0.5) { T = vec3(0.0, 0.0, -1.0); Bt = vec3(0.0, 1.0, 0.0); }
  else if (i < 1.5) { T = vec3(0.0, 0.0, 1.0); Bt = vec3(0.0, 1.0, 0.0); }
  else if (i < 2.5) { T = vec3(1.0, 0.0, 0.0); Bt = vec3(0.0, 0.0, -1.0); }
  else if (i < 3.5) { T = vec3(1.0, 0.0, 0.0); Bt = vec3(0.0, 0.0, 1.0); }
  else if (i < 4.5) { T = vec3(1.0, 0.0, 0.0); Bt = vec3(0.0, 1.0, 0.0); }
  else { T = vec3(-1.0, 0.0, 0.0); Bt = vec3(0.0, 1.0, 0.0); }
}
void main(){
  vec4 t = texture2D(uMap, vUv); if (t.a < 0.5) discard;
  // вдали тексели мельче пикселя — плавно переходим к среднему цвету плитки, чтобы не рябило
  vec2 tx = vUv * uAtlasPx, ddx = dFdx(tx), ddy = dFdy(tx);
  float lod = 0.5 * log2(max(max(dot(ddx, ddx), dot(ddy, ddy)), 1e-6)), far = smoothstep(0.4, 2.4, lod);
  vec3 alb = mix(t.rgb, texture2D(uAvg, vUv).rgb, far);
  // рельеф: нормаль из карты высот
  vec4 nm = texture2D(uNorm, vUv); vec3 T, Bt; tbn(vF, T, Bt);
  vec3 nt = nm.xyz * 2.0 - 1.0; nt.xy *= uBump * (1.0 - far * 0.85);
  vec3 n = normalize(T * nt.x + Bt * nt.y + vN * max(nt.z, 0.2));
  float ao = vL.x, sky = vL.y, blk = vL.z, emis = vL.w;
  float face = vN.y > 0.5 ? 1.0 : vN.y < -0.5 ? 0.55 : abs(vN.x) > 0.5 ? 0.82 : 0.7;
  float ndlG = dot(vN, uSunDir), open = smoothstep(0.55, 0.95, sky);
  float sh = (ndlG > 0.0 && open > 0.0) ? shadowF() : 0.0;
  float ndl = ndlG > 0.0 ? max(dot(n, uSunDir), 0.0) : 0.0;
  vec3 direct = uSunCol * ndl * sh * open;
  float relief = clamp(1.0 + dot(n - vN, vec3(0.32, 0.78, 0.42)) * 0.9, 0.55, 1.35);
  vec3 amb = uAmb * lm(sky) * face * relief;
  float fl = 0.92 + 0.08 * sin(uTime * 9.0 + vW.x * 1.7 + vW.z * 2.3) * sin(uTime * 5.3 + vW.y);
  vec3 torch = vec3(1.0, 0.74, 0.46) * lm(blk) * fl * (0.7 + 0.3 * face) * relief;
  // в дождь открытые поверхности намокают: темнеют и блестят
  float wet = uWet * smoothstep(0.75, 1.0, sky) * (vN.y > 0.5 ? 1.0 : 0.45);
  alb *= 1.0 - wet * 0.22;
  vec3 light = (amb + direct) * ao + torch * mix(ao, 1.0, 0.45) + vec3(0.018) * ao;
  light = mix(light, vec3(1.15), emis);
  vec3 c = alb * light;
  // блики: руды, металл, стекло, мокрый камень
  float sp = max(nm.a, wet * 0.55) * (1.0 - far * 0.6);
  if (sp > 0.01) {
    vec3 V = normalize(uCam - vW), H = normalize(uSunDir + V);
    float gl = mix(18.0, 96.0, nm.a);
    c += uSunCol * pow(max(dot(n, H), 0.0), gl) * sp * sh * open * step(0.0, ndlG) * 1.6;
    c += mix(uHor, uSkyTop, 0.5) * pow(1.0 - max(dot(V, n), 0.0), 4.0) * wet * 0.35 * lm(sky);
    c += vec3(1.0, 0.74, 0.46) * lm(blk) * pow(max(dot(n, V), 0.0), gl * 0.5) * nm.a * 0.3;
  }
  float f = smoothstep(uFogNear, uFogFar, vDist);
  gl_FragColor = vec4(mix(c, uFog, f), 1.0);
}`;
const WATER_FS = `
#include <packing>
uniform sampler2D uWater; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uTime; uniform vec3 uCam; uniform vec3 uSkyTop; uniform vec3 uHor;
varying vec2 vUv; varying vec4 vL; varying vec3 vN; varying float vDist; varying vec3 vW;
${SH_COMMON}
${SH_SHADOW}
void main(){
  vec3 a = texture2D(uWater, vUv * 0.5 + vec2(uTime * 0.03, uTime * 0.02)).rgb, b = texture2D(uWater, vUv * 0.37 - vec2(uTime * 0.025, -uTime * 0.018)).rgb;
  vec3 base = mix(a, b, 0.5);
  float top = step(0.5, vN.y);
  vec3 n = normalize(vN + vec3(dot(a, vec3(0.33)) - 0.45, 0.0, dot(b, vec3(0.33)) - 0.45) * 0.7 * top);
  vec3 V = normalize(uCam - vW);
  float fres = pow(1.0 - max(dot(V, n), 0.0), 3.0);
  float sky = vL.y, open = smoothstep(0.5, 0.95, sky);
  float sh = top > 0.5 ? shadowF() : 1.0;
  vec3 light = uAmb * lm(sky) + uSunCol * max(dot(n, uSunDir), 0.0) * sh * open + vec3(1.0, 0.74, 0.46) * lm(vL.z);
  vec3 col = base * light * 1.05;
  vec3 refl = mix(uHor, uSkyTop, clamp(reflect(-V, n).y * 2.0, 0.0, 1.0)) * (0.3 + 0.7 * lm(sky));
  col = mix(col, refl, fres * 0.7 * top);
  float spec = pow(max(dot(reflect(-uSunDir, n), V), 0.0), 80.0) * sh * open;
  col += uSunCol * spec * 1.6 * top;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  gl_FragColor = vec4(mix(col, uFog, f), mix(mix(0.62, 0.92, fres), 1.0, f));
}`;
const LAVA_FS = `
uniform sampler2D uLava; uniform float uTime; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
varying vec2 vUv; varying vec4 vL; varying vec3 vN; varying float vDist; varying vec3 vW;
void main(){
  vec3 a = texture2D(uLava, vUv * 0.5 + vec2(uTime * 0.01, uTime * 0.007)).rgb, b = texture2D(uLava, vUv * 0.33 - vec2(uTime * 0.008, -uTime * 0.012)).rgb;
  vec3 c = mix(a, b, 0.5 + 0.5 * sin(uTime * 0.7 + vW.x * 0.3)) * (1.15 + 0.15 * sin(uTime * 2.0 + vW.z));
  float f = smoothstep(uFogNear, uFogFar, vDist);
  gl_FragColor = vec4(mix(c, uFog, f * 0.6), 1.0);
}`;
const DEPTH_VS = `
attribute vec2 aM; uniform float uTime; uniform float uWind; varying vec2 vUv;
void main(){ vec3 p = position; float sw = aM.y / 100.0; if (sw > 0.0) { float w = sin(uTime * 1.6 + p.x * 0.8 + p.z * 0.6) * 0.06 + sin(uTime * 2.7 + p.z * 1.3 + p.x * 0.4) * 0.025; p.x += w * sw * uWind; p.z += w * 0.6 * sw * uWind; }
  vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const DEPTH_FS = `
#include <packing>
uniform sampler2D uMap; varying vec2 vUv;
void main(){ if (texture2D(uMap, vUv).a < 0.5) discard; gl_FragColor = packDepthToRGBA(gl_FragCoord.z); }`;
const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT_FS = 'uniform sampler2D uTex; varying vec2 vUv; void main(){ vec3 c = texture2D(uTex, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.94, 1.0, l), 1.0); }';
const BLUR_FS = 'uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 c = texture2D(uTex, vUv).rgb * 0.227; c += (texture2D(uTex, vUv + uDir * 1.385).rgb + texture2D(uTex, vUv - uDir * 1.385).rgb) * 0.316; c += (texture2D(uTex, vUv + uDir * 3.23).rgb + texture2D(uTex, vUv - uDir * 3.23).rgb) * 0.07; gl_FragColor = vec4(c, 1.0); }';
const RAYS_FS = `uniform sampler2D uDepth; uniform vec2 uSun; varying vec2 vUv;
void main(){ vec2 uv = vUv, d = (uSun - uv) / 36.0; float il = 0.0, dec = 1.0; for (int i = 0; i < 36; i++) { uv += d; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) break; il += step(0.99999, texture2D(uDepth, uv).x) * dec; dec *= 0.955; } float fall = 1.0 - smoothstep(0.0, 0.8, length((uSun - vUv) * vec2(1.7, 1.0))); gl_FragColor = vec4(vec3(il / 36.0 * fall * fall), 1.0); }`;
const COMP_FS = `
uniform sampler2D uTex; uniform sampler2D uBloom; uniform sampler2D uRays; uniform vec2 uRcp; uniform float uBloomK; uniform float uRaysK; uniform vec3 uRayCol; uniform float uWater; uniform float uTime; uniform float uFxaa; uniform float uSat;
varying vec2 vUv;
vec3 fxaa(vec2 uv){
  vec3 L = vec3(0.299, 0.587, 0.114);
  vec3 nw = texture2D(uTex, uv + vec2(-1.0, -1.0) * uRcp).rgb, ne = texture2D(uTex, uv + vec2(1.0, -1.0) * uRcp).rgb, sw = texture2D(uTex, uv + vec2(-1.0, 1.0) * uRcp).rgb, se = texture2D(uTex, uv + vec2(1.0, 1.0) * uRcp).rgb, m = texture2D(uTex, uv).rgb;
  float lnw = dot(nw, L), lne = dot(ne, L), lsw = dot(sw, L), lse = dot(se, L), lm = dot(m, L);
  float mn = min(lm, min(min(lnw, lne), min(lsw, lse))), mx = max(lm, max(max(lnw, lne), max(lsw, lse)));
  vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), ((lnw + lsw) - (lne + lse)));
  float red = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0), rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcpMin, -8.0, 8.0) * uRcp;
  vec3 a = 0.5 * (texture2D(uTex, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(uTex, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(uTex, uv - dir * 0.5).rgb + texture2D(uTex, uv + dir * 0.5).rgb);
  float lb = dot(b, L); return (lb < mn || lb > mx) ? a : b;
}
void main(){
  vec2 uv = vUv;
  if (uWater > 0.5) uv += vec2(sin(uv.y * 28.0 + uTime * 2.2), cos(uv.x * 24.0 + uTime * 1.8)) * 0.0035;
  vec3 c = uFxaa > 0.5 ? fxaa(uv) : texture2D(uTex, uv).rgb;
  c += texture2D(uBloom, uv).rgb * uBloomK;
  c += uRayCol * texture2D(uRays, uv).r * uRaysK;
  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uSat);
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.18);
  if (uWater > 0.5) c = mix(c, c * vec3(0.45, 0.65, 1.1), 0.55);
  float v = distance(vUv, vec2(0.5)); c *= mix(1.0, smoothstep(0.85, 0.3, v), 0.32);
  gl_FragColor = vec4(c, 1.0);
}`;
const SKY_VS = 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const SKY_FS = `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uRain; varying vec3 vD;
void main(){ float h = vD.y; vec3 c = mix(uHor, uTop, smoothstep(-0.02, 0.55, h)); c = mix(c, uHor * 0.5, smoothstep(0.0, -0.35, h));
  float s = max(dot(vD, uSunDir), 0.0); c += uSun * (pow(s, 8.0) * 0.35 + pow(s, 60.0) * 0.5) * (1.0 - uRain * 0.8);
  c = mix(c, vec3(dot(c, vec3(0.33))) * 0.85, uRain * 0.6); gl_FragColor = vec4(c, 1.0); }`;
const CLOUD_VS = 'attribute float aS; varying float vS; varying float vD; void main(){ vS = aS; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = length(mv.xz); gl_Position = projectionMatrix * mv; }';
const CLOUD_FS = 'uniform vec3 uCol; uniform float uOp; varying float vS; varying float vD; void main(){ gl_FragColor = vec4(uCol * vS, uOp * (1.0 - smoothstep(220.0, 420.0, vD))); }';
const PART_VS = 'attribute float aSize; attribute vec3 aCol; varying vec3 vC; uniform float uScale; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }';
const PART_FS = 'varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.0); }';

const Render = {
  init(canvas, shell) {
    const R = this.R = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    R.autoClear = false;
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 700); this.camera.rotation.order = 'YXZ';
    this.hCam = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.scene = new THREE.Scene(); this.hScene = new THREE.Scene();
    this.quality = 2; this.scale = 1.5;
    const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    this.atlasT = tex(G.atlasCanvas);
    const dtex = (data, size) => { const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
    this.normT = dtex(G.atlasNorm, G.atlasSize); this.avgT = dtex(G.atlasAvg, 16);
    this.waterT = tex(tileCanvas('water', TS), true); this.lavaT = tex(tileCanvas('lava', TS), true);
    this.shadowSize = 2048;
    this.shadowRT = new THREE.WebGLRenderTarget(this.shadowSize, this.shadowSize, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.shadowCam = new THREE.OrthographicCamera(-56, 56, 56, -56, 1, 320);
    const U = this.U = {
      uMap: { value: this.atlasT }, uTime: { value: 0 }, uWind: { value: 1 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uAmb: { value: new THREE.Color(0.5, 0.5, 0.55) },
      uFog: { value: new THREE.Color('#a8d8ff') }, uFogNear: { value: 55 }, uFogFar: { value: 125 }, uShadow: { value: this.shadowRT.texture }, uShadowOn: { value: 1 }, uTexel: { value: 1 / 2048 }, uShadowMatrix: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() }, uSkyTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uWater: { value: this.waterT }, uLava: { value: this.lavaT },
      uNorm: { value: this.normT }, uAvg: { value: this.avgT }, uAtlasPx: { value: G.atlasSize }, uBump: { value: 1 }, uWet: { value: 0 }
    };
    this.matS = new THREE.ShaderMaterial({ vertexShader: VOX_VS, fragmentShader: VOX_FS, uniforms: U, extensions: { derivatives: true } });
    this.matW = new THREE.ShaderMaterial({ vertexShader: VOX_VS, fragmentShader: WATER_FS, uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.matL = new THREE.ShaderMaterial({ vertexShader: VOX_VS, fragmentShader: LAVA_FS, uniforms: U });
    this.matDepth = new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms: U, side: THREE.DoubleSide });
    this.matDepthE = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    this.amb = new THREE.AmbientLight(0xffffff, 0.6); this.sun = new THREE.DirectionalLight(0xffffff, 0.6); this.scene.add(this.amb, this.sun, this.sun.target);
    this.hAmb = new THREE.AmbientLight(0xffffff, 0.7); this.hDir = new THREE.DirectionalLight(0xffffff, 0.5); this.hDir.position.set(1, 2, 2); this.hScene.add(this.hAmb, this.hDir);
    this.buildSky(); this.buildClouds(); this.buildRain(); this.buildParticles(); this.buildPost();
    this.selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
    this.selBox.visible = false; this.scene.add(this.selBox);
    this.crackGeos = CRACK_TILES.map(n => { const g = new THREE.BoxGeometry(1.008, 1.008, 1.008); const [u0, v0, u1, v1] = tileUV(TILE[n]), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0); return g; });
    this.crack = new THREE.Mesh(this.crackGeos[0], new THREE.MeshBasicMaterial({ map: this.atlasT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); this.crack.visible = false; this.scene.add(this.crack);
    this.itemMat = new THREE.MeshLambertMaterial({ map: this.atlasT, alphaTest: 0.5, side: THREE.DoubleSide });
    this.decals = [];
    this.resize(shell);
  },
  // новые текстуры той же раскладки (UV чанков не меняются)
  refreshAtlas() {
    this.atlasT.image = G.atlasCanvas; this.atlasT.needsUpdate = true;
    this.normT.image = { data: G.atlasNorm, width: G.atlasSize, height: G.atlasSize }; this.normT.needsUpdate = true;
    this.avgT.image.data.set(G.atlasAvg); this.avgT.needsUpdate = true; this.U.uAtlasPx.value = G.atlasSize;
    this.waterT.image = tileCanvas('water', TS); this.waterT.needsUpdate = true; this.lavaT.image = tileCanvas('lava', TS); this.lavaT.needsUpdate = true;
  },
  setQuality(q, scale) {
    this.quality = q; this.scale = scale || this.scale;
    this.R.setPixelRatio(Math.min(devicePixelRatio, this.scale));
    const size = q >= 2 ? 2048 : 1024;
    if (size !== this.shadowSize) { this.shadowSize = size; this.shadowRT.setSize(size, size); this.U.uTexel.value = 1 / size; }
    const ext = q >= 2 ? 64 : 40; Object.assign(this.shadowCam, { left: -ext, right: ext, top: ext, bottom: -ext }); this.shadowCam.updateProjectionMatrix();
    this.U.uShadowOn.value = q >= 1 ? 1 : 0; this.U.uBump.value = q >= 1 ? 1 : 0.6;
    this.clouds.visible = true; this.resize();
  },
  resize(shell) {
    if (shell) this.shell = shell;
    const r = this.shell.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.R.setSize(w, h, false); this.camera.aspect = this.hCam.aspect = w / h; this.camera.updateProjectionMatrix(); this.hCam.updateProjectionMatrix();
    const pr = this.R.getPixelRatio(), W = Math.floor(w * pr), H = Math.floor(h * pr);
    this.rt.setSize(W, H); this.rt.depthTexture.image.width = W; this.rt.depthTexture.image.height = H;
    this.rtB1.setSize(W >> 2, H >> 2); this.rtB2.setSize(W >> 2, H >> 2); this.rtR.setSize(W >> 1, H >> 1);
    this.P.comp.uniforms.uRcp.value.set(1 / W, 1 / H);
    this.P.blur.uniforms.uDir.value.set(1 / (W >> 2), 0);
  },
  buildSky() {
    this.skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color('#ffd27a') }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uRain: { value: 0 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 14), new THREE.ShaderMaterial({ uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, vertexShader: SKY_VS, fragmentShader: SKY_FS }));
    this.sky.renderOrder = -3; this.sky.frustumCulled = false; this.scene.add(this.sky);
    const ct = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
    const sunT = ct(32, 32, g => { g.fillStyle = 'rgba(255,214,110,.22)'; g.fillRect(1, 1, 30, 30); g.fillStyle = 'rgba(255,226,140,.5)'; g.fillRect(6, 6, 20, 20); g.fillStyle = '#fff9dc'; g.fillRect(9, 9, 14, 14); });
    const moonT = ct(32, 32, g => { g.fillStyle = 'rgba(200,215,255,.15)'; g.fillRect(4, 4, 24, 24); g.fillStyle = '#e4ebf6'; g.fillRect(9, 9, 14, 14); g.fillStyle = '#b9c3d6'; [[11, 11, 3], [17, 10, 2], [14, 17, 4], [19, 18, 2]].forEach(([x, y, s]) => g.fillRect(x, y, s, s)); });
    this.sunM = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ map: sunT, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.moonM = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ map: moonT, transparent: true, depthWrite: false, fog: false }));
    this.sunM.renderOrder = this.moonM.renderOrder = -2; this.scene.add(this.sunM, this.moonM);
    const n = 1800, sp = new Float32Array(n * 3), ss = new Float32Array(n), sc = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); sp.set([Math.cos(a) * r * 420, Math.abs(u) * 420 - 30, Math.sin(a) * r * 420], i * 3); ss[i] = 1 + Math.random() * 2.2; const w = 0.75 + Math.random() * 0.25; sc.set([w, w, Math.min(1, w + 0.15)], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aSize', new THREE.BufferAttribute(ss, 1)); sg.setAttribute('aCol', new THREE.BufferAttribute(sc, 3));
    this.starU = { uOp: { value: 1 }, uTime: { value: 0 } };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: this.starU, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aSize; attribute vec3 aCol; varying vec3 vC; varying float vT; uniform float uTime; void main(){ vC = aCol; vT = 0.6 + 0.4 * sin(uTime * 3.0 + position.x * 0.13 + position.z * 0.07); gl_PointSize = aSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uOp; varying vec3 vC; varying float vT; void main(){ gl_FragColor = vec4(vC, uOp * vT); }' }));
    this.stars.renderOrder = -2; this.stars.frustumCulled = false; this.scene.add(this.stars);
  },
  buildClouds() {
    const N = makeNoise((G.world ? G.world.seed : 1) + 7), C = 48, cell = 12, filled = new Uint8Array(C * C);
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const a = x / C * Math.PI * 2, b = y / C * Math.PI * 2; filled[y * C + x] = N.n3(Math.cos(a) * 2.2, Math.sin(a) * 2.2 + Math.cos(b) * 2.2, Math.sin(b) * 2.2) > 0.2 ? 1 : 0; }
    const P = [], S = [], IX = [], at = (x, y) => filled[((y % C + C) % C) * C + ((x % C + C) % C)];
    const quad = (pts, s) => { const b = P.length / 3; pts.forEach(p => { P.push(...p); S.push(s); }); IX.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      if (!at(x, y)) continue;
      const X0 = (tx * C + x) * cell, Z0 = (ty * C + y) * cell, X1 = X0 + cell, Z1 = Z0 + cell, Y0 = 0, Y1 = 4;
      quad([[X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0]], 1.0);
      quad([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1]], 0.72);
      if (!at(x + 1, y)) quad([[X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1]], 0.86);
      if (!at(x - 1, y)) quad([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]], 0.86);
      if (!at(x, y + 1)) quad([[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], 0.8);
      if (!at(x, y - 1)) quad([[X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0]], 0.8);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1)); g.setIndex(IX);
    this.cloudU = { uCol: { value: new THREE.Color(1, 1, 1) }, uOp: { value: 0.85 } };
    if (this.clouds) { this.scene.remove(this.clouds); this.clouds.geometry.dispose(); }
    this.clouds = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.cloudU, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.clouds.frustumCulled = false; this.clouds.renderOrder = 1; this.scene.add(this.clouds); this.cloudSpan = C * cell; this.cloudOff = 0;
  },
  buildRain() {
    const n = 1400, p = new Float32Array(n * 6); this.rainN = n; this.rainD = [];
    for (let i = 0; i < n; i++) this.rainD.push({ x: rnd(-22, 22), y: rnd(0, 30), z: rnd(-22, 22), v: rnd(26, 34) });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9ab8e8, transparent: true, opacity: 0.55, depthWrite: false }));
    this.rain.frustumCulled = false; this.rain.visible = false; this.scene.add(this.rain);
  },
  buildParticles() {
    const n = 2500, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setDrawRange(0, 0); this.pList = []; this.pMax = n;
    this.partU = { uScale: { value: 300 } };
    this.parts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.partU, vertexShader: PART_VS, fragmentShader: PART_FS }));
    this.parts.frustumCulled = false; this.scene.add(this.parts);
  },
  buildPost() {
    const rt = (o = {}) => new THREE.WebGLRenderTarget(4, 4, Object.assign({ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }, o));
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4); this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.rtB1 = rt(); this.rtB2 = rt(); this.rtR = rt();
    const m = (fs, u) => new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    this.P = {
      bright: m(BRIGHT_FS, { uTex: { value: null } }),
      blur: m(BLUR_FS, { uTex: { value: null }, uDir: { value: new THREE.Vector2() } }),
      rays: m(RAYS_FS, { uDepth: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) } }),
      comp: m(COMP_FS, { uTex: { value: null }, uBloom: { value: null }, uRays: { value: null }, uRcp: { value: new THREE.Vector2() }, uBloomK: { value: 0.85 }, uRaysK: { value: 0 }, uRayCol: { value: new THREE.Color(1, 0.85, 0.6) }, uWater: { value: 0 }, uTime: { value: 0 }, uFxaa: { value: 1 }, uSat: { value: 1.1 } })
    };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad); this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  },
  pass(mat, target) { this.quad.material = mat; this.R.setRenderTarget(target); this.R.render(this.qScene, this.qCam); },
  // ---------- освещение мира по времени суток ----------
  updateEnv(env) {
    const U = this.U, a = env.time * Math.PI * 2, alt = Math.sin(a), rain = env.rain;
    const sunDir = new THREE.Vector3(Math.cos(a), alt, 0.3).normalize();
    const dF = clamp((alt + 0.12) / 0.42, 0, 1), sunset = clamp(1 - Math.abs(alt) / 0.3, 0, 1);
    const day = (c1, c2, t) => new THREE.Color(c1).lerp(new THREE.Color(c2), t);
    const top = day('#03050f', '#3f87e8', dF), hor = day('#0d1430', '#a3cdf4', dF).lerp(new THREE.Color('#ff9a55'), sunset * 0.6 * (1 - rain));
    if (rain) { top.lerp(new THREE.Color('#5a6270').multiplyScalar(0.3 + 0.7 * dF), rain * 0.7); hor.lerp(new THREE.Color('#7a8290').multiplyScalar(0.3 + 0.7 * dF), rain * 0.7); }
    this.skyU.uTop.value.copy(top); this.skyU.uHor.value.copy(hor); this.skyU.uSunDir.value.copy(sunDir); this.skyU.uRain.value = rain;
    this.skyU.uSun.value.set('#ffcf7a').multiplyScalar(clamp(alt + 0.3, 0, 1));
    U.uSkyTop.value.copy(top); U.uHor.value.copy(hor);
    // солнце днём, луна ночью — источник направленного света и теней
    const moon = alt < -0.05, ld = moon ? sunDir.clone().negate() : sunDir.clone();
    U.uSunDir.value.copy(ld);
    const sunStr = moon ? 0.16 * clamp(-alt * 3, 0, 1) : 0.52 * clamp(alt * 3.5, 0, 1);
    U.uSunCol.value.copy(moon ? new THREE.Color(0.62, 0.7, 1.0) : new THREE.Color(1.0, 0.93, 0.8).lerp(new THREE.Color(1.0, 0.6, 0.35), sunset * 0.7)).multiplyScalar(sunStr * (1 - rain * 0.75));
    U.uAmb.value.copy(new THREE.Color(0.1, 0.11, 0.2).lerp(new THREE.Color(0.5, 0.53, 0.62), dF)).multiplyScalar(1 - rain * 0.25);
    if (env.underwater) { U.uFog.value.set('#1d4aa0').multiplyScalar(0.3 + 0.7 * dF); U.uFogNear.value = 1; U.uFogFar.value = 18; }
    else if (env.inLava) { U.uFog.value.set('#ff5a00'); U.uFogNear.value = 0.3; U.uFogFar.value = 3; }
    else { U.uFog.value.copy(hor); U.uFogNear.value = 50 - rain * 20; U.uFogFar.value = 125 - rain * 45; }
    U.uTime.value = env.now; U.uWind.value = 1 + rain * 1.8; U.uCam.value.copy(this.camera.position); U.uWet.value += (rain - U.uWet.value) * Math.min(1, env.dt * 0.25);
    // сущности: яркость дня/пещер уже в цвете материала (lightLevel), здесь — только объём
    this.amb.intensity = 0.62; this.sun.intensity = 0.4 * (1 - rain * 0.4);
    this.sun.position.copy(env.center).addScaledVector(ld, 50); this.sun.target.position.copy(env.center);
    this.hAmb.intensity = 0.64; this.hDir.intensity = 0.4;
    const cp = this.camera.position;
    this.sky.position.copy(cp);
    this.sunM.position.copy(cp).addScaledVector(sunDir, 380); this.sunM.lookAt(cp); this.sunM.visible = rain < 0.7;
    this.moonM.position.copy(cp).addScaledVector(sunDir, -380); this.moonM.lookAt(cp);
    this.stars.position.copy(cp); this.stars.rotation.z = a * 0.5; this.starU.uOp.value = clamp((0.5 - dF) / 0.5, 0, 1) * (1 - rain); this.starU.uTime.value = env.now;
    this.cloudOff = (this.cloudOff + env.dt * 1.2) % this.cloudSpan;
    const span = this.cloudSpan; this.clouds.position.set(Math.floor((cp.x - this.cloudOff) / span) * span - span / 2 + this.cloudOff, WY + 34, Math.floor(cp.z / span) * span - span / 2);
    this.cloudU.uCol.value.copy(new THREE.Color('#1a1e30').lerp(new THREE.Color(1, 1, 1), dF)).multiplyScalar(1 - rain * 0.45); this.cloudU.uOp.value = 0.78 + rain * 0.2;
    this.env = { dF, sunDir, sunset, rain, moon, alt };
    return this.env;
  },
  updateShadow(center) {
    if (this.quality < 1) return;
    const sc = this.shadowCam, d = this.U.uSunDir.value;
    sc.position.copy(center).addScaledVector(d, 160); sc.lookAt(center); sc.updateMatrixWorld();
    // привязка к текселям — тени не «дрожат» при движении
    const ts = (sc.right - sc.left) / this.shadowSize, p = center.clone().applyMatrix4(sc.matrixWorldInverse);
    const dx = p.x - Math.round(p.x / ts) * ts, dy = p.y - Math.round(p.y / ts) * ts;
    const right = new THREE.Vector3().setFromMatrixColumn(sc.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(sc.matrixWorld, 1);
    sc.position.addScaledVector(right, dx).addScaledVector(up, dy); sc.updateMatrixWorld(); sc.matrixWorldInverse.copy(sc.matrixWorld).invert();
    const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.U.uShadowMatrix.value.copy(bias).multiply(sc.projectionMatrix).multiply(sc.matrixWorldInverse);
    const R = this.R; R.setRenderTarget(this.shadowRT); R.setClearColor(0xffffff, 1); R.clear();
    sc.layers.set(1); this.scene.overrideMaterial = this.matDepth; R.render(this.scene, sc);
    sc.layers.set(2); this.scene.overrideMaterial = this.matDepthE; R.render(this.scene, sc);
    this.scene.overrideMaterial = null; R.setRenderTarget(null); R.setClearColor(0x000000, 1);
  },
  render(params) {
    const R = this.R, cam = this.camera;
    this.P.comp.uniforms.uTime.value = this.U.uTime.value;
    if (this.quality < 1) {
      R.setRenderTarget(null); R.clear(); R.render(this.scene, cam);
      if (params.hand) { R.clearDepth(); R.render(this.hScene, this.hCam); }
      return;
    }
    R.setRenderTarget(this.rt); R.clear(); R.render(this.scene, cam);
    if (params.hand) { R.clearDepth(); R.render(this.hScene, this.hCam); }
    // блум
    this.P.bright.uniforms.uTex.value = this.rt.texture; this.pass(this.P.bright, this.rtB1);
    const W = this.rtB1.width, H = this.rtB1.height;
    for (let k = 0; k < 2; k++) {
      this.P.blur.uniforms.uTex.value = this.rtB1.texture; this.P.blur.uniforms.uDir.value.set((1 + k) / W, 0); this.pass(this.P.blur, this.rtB2);
      this.P.blur.uniforms.uTex.value = this.rtB2.texture; this.P.blur.uniforms.uDir.value.set(0, (1 + k) / H); this.pass(this.P.blur, this.rtB1);
    }
    // лучи света от солнца
    let raysK = 0;
    const e = this.env;
    if (this.quality >= 2 && e && !e.moon && e.alt > -0.05 && !params.underwater) {
      const sp = cam.position.clone().addScaledVector(e.sunDir, 300).project(cam);
      const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).dot(e.sunDir);
      if (facing > 0.15) {
        this.P.rays.uniforms.uSun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); this.P.rays.uniforms.uDepth.value = this.rt.depthTexture; this.pass(this.P.rays, this.rtR);
        raysK = 0.55 * clamp((facing - 0.15) / 0.5, 0, 1) * clamp(e.alt * 4 + 0.3, 0, 1) * (1 - e.rain) * (0.6 + e.sunset * 0.6);
        this.P.comp.uniforms.uRayCol.value.set(1, 0.85, 0.6).lerp(new THREE.Color(1, 0.55, 0.3), e.sunset);
      }
    }
    const C = this.P.comp.uniforms;
    C.uTex.value = this.rt.texture; C.uBloom.value = this.rtB1.texture; C.uRays.value = this.rtR.texture; C.uRaysK.value = raysK; C.uWater.value = params.underwater ? 1 : 0;
    C.uFxaa.value = this.quality >= 1 ? 1 : 0; C.uBloomK.value = this.quality >= 2 ? 0.7 : 0.45;
    this.pass(this.P.comp, null);
  },
  // ---------- частицы ----------
  emit(p) { if (this.pList.length < this.pMax) this.pList.push(p); },
  burst(x, y, z, col, n, sp, o = {}) {
    const c = col instanceof THREE.Color ? col : new THREE.Color(col);
    for (let i = 0; i < n; i++) this.emit({ x: x + (Math.random() - .5) * (o.spread || 0.3), y: y + (Math.random() - .5) * (o.spread || 0.3), z: z + (Math.random() - .5) * (o.spread || 0.3), vx: (Math.random() - .5) * sp, vy: Math.random() * sp * (o.up || 0.9), vz: (Math.random() - .5) * sp,
      life: (o.life || 0.6) + Math.random() * (o.life || 0.6), c: c.clone().multiplyScalar(0.75 + Math.random() * 0.4), g: o.g != null ? o.g : 14, s: (o.size || 0.11) * (0.7 + Math.random() * 0.6), lit: o.lit !== false, grow: o.grow || 0, collide: o.collide !== false });
  },
  blockBurst(x, y, z, id, n = 22) {
    const ti = TILE[BL[id].tn[2]] != null ? TILE[BL[id].tn[2]] : TILE[BL[id].tn[0]], ox = (ti % 16) * TS, oy = (ti >> 4) * TS, AW = G.atlasSize;
    const px = atlasPixels();
    for (let i = 0; i < n; i++) {
      const sx = ox + (Math.random() * TS | 0), sy = oy + (Math.random() * TS | 0), j = (sy * AW + sx) * 4;
      if (px[j + 3] < 100) continue;
      this.emit({ x: x + rnd(0.1, 0.9), y: y + rnd(0.1, 0.9), z: z + rnd(0.1, 0.9), vx: rnd(-1.6, 1.6), vy: rnd(0, 3.2), vz: rnd(-1.6, 1.6), life: rnd(0.4, 1.1), c: new THREE.Color(px[j] / 255, px[j + 1] / 255, px[j + 2] / 255), g: 14, s: rnd(0.07, 0.13), lit: true, collide: true });
    }
  },
  updateParticles(dt, lightFn) {
    const g = this.parts.geometry, pos = g.attributes.position.array, col = g.attributes.aCol.array, sz = g.attributes.aSize.array, L = this.pList; let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt; if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.grow) p.s += p.grow * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vz *= 1 - p.drag * dt; }
      if (p.collide && p.g > 0 && solidVox(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) { p.y = Math.floor(p.y) + 1.01; p.vy = 0; p.vx *= .4; p.vz *= .4; if (p.decal) { this.addDecal(p.x, p.y, p.z, p.c); p.decal = 0; } }
    }
    for (const p of L) {
      const k = p.lit ? lightFn(p.x, p.y, p.z) : 1;
      pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z; col[n * 3] = p.c.r * k; col[n * 3 + 1] = p.c.g * k; col[n * 3 + 2] = p.c.b * k; sz[n] = p.s; n++;
    }
    g.setDrawRange(0, n); g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSize.needsUpdate = true;
    this.partU.uScale.value = this.R.domElement.height / (2 * Math.tan(this.camera.fov * Math.PI / 360));
    // кровавые следы
    for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.t -= dt; d.m.material.opacity = Math.min(0.85, d.t / 4); if (d.t <= 0) { this.scene.remove(d.m); d.m.material.dispose(); this.decals.splice(i, 1); } }
  },
  addDecal(x, y, z, c) {
    if (this.decals.length > 70) { const d = this.decals.shift(); this.scene.remove(d.m); d.m.material.dispose(); }
    this._decalGeo = this._decalGeo || new THREE.PlaneGeometry(1, 1);
    const m = new THREE.Mesh(this._decalGeo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.55), transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    const s = rnd(0.15, 0.45); m.scale.set(s, s, 1); m.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); m.position.set(x, Math.floor(y) + 0.012, z);
    this.scene.add(m); this.decals.push({ m, t: 20 + Math.random() * 10 });
  },
  updateRain(dt, cp, intensity) {
    this.rain.visible = intensity > 0.05; if (!this.rain.visible) return;
    const pos = this.rain.geometry.attributes.position.array, w = G.world, count = Math.floor(this.rainN * intensity);
    for (let i = 0; i < this.rainN; i++) {
      const d = this.rainD[i], o = i * 6;
      if (i >= count) { pos.fill(0, o, o + 6); continue; }
      d.y -= d.v * dt;
      const wx = cp.x + d.x, wz = cp.z + d.z, gy = w.topOpaque(Math.floor(wx), Math.floor(wz)) + 1;
      if (cp.y + d.y < gy || d.y < -12) { if (cp.y + d.y < gy && Math.random() < 0.15 && Math.hypot(d.x, d.z) < 14) this.emit({ x: wx, y: gy + 0.05, z: wz, vx: rnd(-.6, .6), vy: rnd(1, 2), vz: rnd(-.6, .6), life: 0.25, c: new THREE.Color('#bcd4ff'), g: 12, s: 0.06, lit: true, collide: false }); d.x = rnd(-22, 22); d.z = rnd(-22, 22); d.y = rnd(14, 30); }
      const y = cp.y + d.y; pos[o] = wx; pos[o + 1] = y; pos[o + 2] = wz; pos[o + 3] = wx + 0.02; pos[o + 4] = y + 0.7; pos[o + 5] = wz + 0.02;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  },
  dispose() {
    try {
      this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); });
      this.hScene.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
      [this.rt, this.rtB1, this.rtB2, this.rtR, this.shadowRT].forEach(t => t.dispose());
      Object.values(this.P).forEach(m => m.dispose());
      this.crackGeos.forEach(g => g.dispose()); [this.atlasT, this.normT, this.avgT, this.waterT, this.lavaT].forEach(t => t.dispose());
      [this.matS, this.matW, this.matL, this.matDepth, this.matDepthE, this.itemMat].forEach(m => m.dispose());
      Object.keys(ITEM_GEO).forEach(k => { ITEM_GEO[k].dispose(); delete ITEM_GEO[k]; });
      this.R.dispose(); this.R.forceContextLoss && this.R.forceContextLoss();
    } catch (e) { console.warn(e); }
  }
};
