import * as THREE from 'three';
import { makeTextures } from './textures.js';
import { buildWorld } from './world.js';
import { buildNightSky, MOON_DIR } from './gfx.js';
import { Sound } from './audio.js';
import { Story } from './story.js';
import { DEE_LINES } from './dee-lines.js';
import { CLINT_LINES } from './clint-lines.js';
import { CHRIS_LINES } from './chris-lines.js';
import { N2_LINES } from './n2-lines.js';

const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shots') || params.has('manual') });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; // only the moon casts; re-rendered on demand (see updateMoon)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020304);
scene.fog = new THREE.FogExp2(0x040506, 0.036);
const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 260);
camera.rotation.order = 'YXZ';
scene.add(camera);

const T = makeTextures();
const W = buildWorld(scene, T);
const sound = new Sound();
W.sound = sound;

// ---------- lighting ----------
const hemi = new THREE.HemisphereLight(0x8090a8, 0x201810, 0.5); scene.add(hemi);
// 7 AM, the employee lot: a low warm sun from the east (+x) and a dawn haze, blended in by game.outdoor (0 inside .. 1 out in the lot; Story sets it)
const sunLight = new THREE.DirectionalLight(0xffc49a, 0); sunLight.position.copy(W.anchors.lot).addScaledVector(W.sunDir, 60); sunLight.target.position.copy(W.anchors.lot); scene.add(sunLight); scene.add(sunLight.target);
const NIGHT_FOG = new THREE.Color(0x040506), DAWN_FOG = new THREE.Color(0x8c8a98), NIGHT_SKY = new THREE.Color(0x020304), HEMI_SKY = new THREE.Color(0x8090a8), DAWN_HEMI = new THREE.Color(0xb8b4c8);
// gfx pass 1: per-area night mood (ambient fill + fog), eased so doorways don't pop. Unlisted areas keep the original values.
const AREA = { dock: { hemi: 0.62, fog: new THREE.Color(0x070a12), dens: 0.03 }, mclean: { hemi: 0.3, fog: new THREE.Color(0x030303), dens: 0.045 },
  // gfx pass 2: the rest of the building, same idea (dim fill, close dark fog indoors; cold blue haze outdoors)
  office: { hemi: 0.42, fog: new THREE.Color(0x040404), dens: 0.04 }, corridor: { hemi: 0.3, fog: new THREE.Color(0x030303), dens: 0.05 }, stairB: { hemi: 0.26, fog: new THREE.Color(0x030303), dens: 0.05 },
  pantry: { hemi: 0.36, fog: new THREE.Color(0x030303), dens: 0.045 }, lobby: { hemi: 0.38, fog: new THREE.Color(0x040404), dens: 0.04 }, room117: { hemi: 0.3, fog: new THREE.Color(0x030303), dens: 0.045 }, bath117: { hemi: 0.3, fog: new THREE.Color(0x030303), dens: 0.045 },
  terrace: { hemi: 0.55, fog: new THREE.Color(0x070a12), dens: 0.03 }, lot: { hemi: 0.6, fog: new THREE.Color(0x070a12), dens: 0.028 }, boiler: { hemi: 0.24, fog: new THREE.Color(0x040302), dens: 0.055 },
  duboseHall: { hemi: 0.32, fog: new THREE.Color(0x040302), dens: 0.045 }, library: { hemi: 0.3, fog: new THREE.Color(0x040302), dens: 0.045 }, dining: { hemi: 0.32, fog: new THREE.Color(0x040302), dens: 0.045 },
  butler: { hemi: 0.32, fog: new THREE.Color(0x040302), dens: 0.045 }, foyer: { hemi: 0.3, fog: new THREE.Color(0x040302), dens: 0.04 }, suite: { hemi: 0.3, fog: new THREE.Color(0x040302), dens: 0.045 },
  backhall: { hemi: 0.26, fog: new THREE.Color(0x030202), dens: 0.05 }, sewing: { hemi: 0.3, fog: new THREE.Color(0x030303), dens: 0.045 }, closet: { hemi: 0.2, fog: new THREE.Color(0x020202), dens: 0.05 }, bar: { hemi: 0.3, fog: new THREE.Color(0x040302), dens: 0.045 } };
const AREA_DEF = { hemi: 1, fog: NIGHT_FOG, dens: 0.036 }; const area = { hemi: 1, fog: NIGHT_FOG.clone(), dens: 0.036 }; let lastReg = null, areaSnap = false;
function updateOutdoor(dt = 0.016) { const k = Math.max(0, Math.min(1, game.outdoor || 0));
  const reg = W.regionAt(camera.position.x, camera.position.z) || lastReg; lastReg = reg; const A = AREA[reg] || AREA_DEF; const e = areaSnap ? 1 : Math.min(1, dt * 2.5); areaSnap = false;
  area.hemi += (A.hemi - area.hemi) * e; area.fog.lerp(A.fog, e); area.dens += (A.dens - area.dens) * e;
  scene.fog.color.copy(area.fog).lerp(DAWN_FOG, k); scene.fog.density = area.dens + (0.011 - area.dens) * k; scene.background.copy(NIGHT_SKY).lerp(DAWN_FOG, k);
  hemi.intensity = (0.5 * area.hemi + k * (0.5 * (1 - area.hemi) + 0.75)) * (game.dark ? 0.28 : 1); hemi.color.copy(HEMI_SKY).lerp(DAWN_HEMI, k); sunLight.intensity = k * (game.sunGain ?? 2.0); }
// ---------- the full moon over the open-air dock (Christmas Eve 2026 really is a full moon) ----------
const nightSky = W.nightSky = buildNightSky(scene);
const MOON_C = new THREE.Vector3(8, 0, 6);
// A directional light would shine through every ceiling in the building, so the moon is a narrow, far-away, non-decaying spot: near-parallel rays,
// its cone only covers the yard (and the first few metres of the office / corridor, whose ceilings sit in its shadow map and shade them). It also fades with distance from the dock.
const moon = W.moon = new THREE.SpotLight(0x9fb4e6, 0, 0, 0.215, 0.35, 0); moon.position.copy(MOON_C).addScaledVector(MOON_DIR, 60); moon.target.position.copy(MOON_C); scene.add(moon); scene.add(moon.target);
moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.camera.near = 35; moon.shadow.camera.far = 95; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03;
const SHADOW_BOX = new THREE.Box3(new THREE.Vector3(-6, -1, -15), new THREE.Vector3(22, 9, 26));
{ const bb = new THREE.Box3(); scene.updateMatrixWorld(true); scene.traverse(o => { if (!o.isMesh || o.userData.noShadow) return; bb.setFromObject(o); if (!bb.intersectsBox(SHADOW_BOX)) return; const m = o.material; if (!m || Array.isArray(m)) return;
  const basic = m.isMeshBasicMaterial || m.isSpriteMaterial; o.receiveShadow = !basic && !o.userData.decals; o.castShadow = !basic && !m.transparent && m.visible !== false && !o.userData.decals; }); }
// second moon spot for the terrace (same moon, same direction): its own small shadow map, only on while you're on or next to the terrace
const MOON_T = new THREE.Vector3(41, 0, -31.5); const moon2 = W.moon2 = new THREE.SpotLight(0x9fb4e6, 0, 0, 0.13, 0.4, 0); moon2.position.copy(MOON_T).addScaledVector(MOON_DIR, 60); moon2.target.position.copy(MOON_T); scene.add(moon2); scene.add(moon2.target);
moon2.castShadow = true; moon2.shadow.mapSize.set(1024, 1024); moon2.shadow.camera.near = 40; moon2.shadow.camera.far = 90; moon2.shadow.bias = -0.0004; moon2.shadow.normalBias = 0.03;
{ const TB = new THREE.Box3(new THREE.Vector3(31, -1, -40), new THREE.Vector3(51, 10, -23)), bb = new THREE.Box3(); scene.traverse(o => { if (!o.isMesh || o.userData.noShadow) return; bb.setFromObject(o); if (!bb.intersectsBox(TB)) return; const m = o.material; if (!m || Array.isArray(m)) return;
  const basic = m.isMeshBasicMaterial || m.isSpriteMaterial; o.receiveShadow = o.receiveShadow || (!basic && !o.userData.decals); o.castShadow = o.castShadow || (!basic && !m.transparent && m.visible !== false && !o.userData.decals); }); }
let moon2K = 0, shadow2 = false;
let moonK = 0, shadowTick = 0;
function updateMoon(dt) {
  const p = camera.position; const dx = Math.max(0, -p.x, p.x - 16), dz = Math.max(0, -p.z, p.z - 12); const near = Math.max(0, 1 - Math.hypot(dx, dz) / 4);
  const ph = game.story && game.story.f && game.story.f.phase; const dim = (game.dark || ph === 'chase') ? 0.2 : 1; // a cloud bank rolls over the moon in the blackouts
  const dawn = W.dawn && W.dawn.visible; nightSky.visible = !dawn; nightSky.userData.update(camera, dt); nightSky.userData.setDim(dim < 1 ? 0.15 : 1);
  const target = dawn ? 0 : near * dim * (game.moonGain ?? 2.5); const was = moonK; moonK += (target - moonK) * Math.min(1, dt * 3); moon.intensity = moonK;
  { const dx = Math.max(0, 33 - p.x, p.x - 49), dz = Math.max(0, -38 - p.z, p.z + 25); const nearT = Math.max(0, 1 - Math.hypot(dx, dz) / 3.5); const t2 = dawn ? 0 : nearT * dim * 2.2; moon2K += (t2 - moon2K) * Math.min(1, dt * 3); moon2.intensity = moon2K;
    if (moon2K > 0.01 && !shadow2) { shadow2 = true; renderer.shadowMap.needsUpdate = true; } if (moon2K <= 0.01) shadow2 = false; }
  if (moonK > 0.01) { const dyn = (W.clint.visible && W.clint.position.x < 18) || W.chris.visible || W.doors.some(d => Math.abs(d.angle - d.target) > 0.01 && d.x > -1 && d.x < 17 && d.z > -1 && d.z < 13);
    if (was <= 0.01 || ++shadowTick >= (dyn ? 2 : 30)) { shadowTick = 0; renderer.shadowMap.needsUpdate = true; } } }
const LIGHT_GAIN = 3.2; const POOL = 10; const pool = [];
for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(l); pool.push(l); }
const flash = new THREE.SpotLight(0xfff2da, 0, 22, 0.52, 0.55, 1.6); flash.position.set(0.18, -0.12, 0); camera.add(flash); camera.add(flash.target); flash.target.position.set(0, -0.15, -1);
const flashFill = new THREE.PointLight(0xfff2da, 0, 3.5, 2); camera.add(flashFill);
const tmpV = new THREE.Vector3();
function updateLights(dt, t) {
  for (const v of W.vlights) {
    let f = 1;
    if (v.flicker) { v._fk = (v._fk || 0) - dt; if (v._fk <= 0) { v._val = Math.random() < v.flicker ? 0.1 + Math.random() * 0.4 : 1; v._fk = v._val < 1 ? 0.03 + Math.random() * 0.12 : 0.2 + Math.random() * 2.5; } f = v._val ?? 1; }
    v.eff = v.on ? v.intensity * v.level * f * LIGHT_GAIN : 0;
    for (const m of v.fixtures) { const lv = v.on ? Math.min(1.2, v.level * f) : 0.04; m.color.copy(m.userData.base).multiplyScalar(lv); }
  }
  const p = camera.position;
  const cands = W.vlights.filter(v => v.eff > 0.01).map(v => [v, v.pos.distanceTo(p) - v.dist * 0.35]).sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < POOL; i++) { const l = pool[i]; const c = cands[i]; if (c && c[1] < 22) { const v = c[0]; l.position.copy(v.pos); l.color.copy(v.color); l.intensity = v.eff; l.distance = v.dist; } else l.intensity = 0; }
}

// ---------- post-processing (found-footage camera) ----------
const SCALE = params.has('hq') ? 0.85 : 0.62;
const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, depthBuffer: true });
const post = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: rt.texture }, time: { value: 0 }, blink: { value: 0 }, noiseAmt: { value: 0.09 }, glitch: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, dead: { value: 0 }, bright: { value: 1.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, blink, noiseAmt, glitch, dead, bright; uniform vec2 res; varying vec2 vUv;
  float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 cc = vUv-0.5; float r2 = dot(cc,cc);
    vec2 uv = 0.5 + cc*(1.0+0.07*r2);
    float band = step(1.0-glitch*0.35, rand(vec2(floor(uv.y*48.0), floor(time*24.0))));
    uv.x += band*(rand(vec2(time, floor(uv.y*48.0)))-0.5)*0.12*glitch;
    float roll = fract(time*0.07); float rl = smoothstep(0.0,0.015,abs(vUv.y-roll)); 
    float ca = 0.0018 + 0.009*r2 + glitch*0.012;
    vec3 col = vec3(texture2D(tDiffuse, uv+cc*ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv-cc*ca).b);
    if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) col=vec3(0.);
    col *= bright;
    col = col/(1.0+col*0.35);
    col = pow(max(col,0.0), vec3(1.0/2.2));
    float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, 0.72);
    col = col*vec3(0.95,1.02,0.97) + vec3(0.018,0.024,0.022);
    col += (rand(floor(vUv*res)+fract(time*7.31)*91.0)-0.5)*noiseAmt*(1.0+glitch);
    col *= 0.94+0.06*sin(vUv.y*res.y*3.14159);
    col *= mix(0.97,1.0,rl);
    col *= smoothstep(0.95,0.25,length(cc*vec2(1.0,1.15))*1.18);
    float d = abs(vUv.y-0.5); float o = 0.5*(1.0-blink);
    col *= 1.0 - smoothstep(o-0.06, o, d);
    col = mix(col, vec3(rand(vUv*res+time)*0.35), dead);
    gl_FragColor = vec4(col,1.0);
  }`, depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(); const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); rt.setSize(Math.floor(w * SCALE), Math.floor(h * SCALE)); post.uniforms.res.value.set(w * SCALE, h * SCALE); }
addEventListener('resize', resize); resize();

// ---------- player ----------
const player = { pos: new THREE.Vector3(3, 0, 6), yaw: Math.PI / 2, pitch: 0, vel: new THREE.Vector3(), bob: 0, stamina: 1, eyesClosed: false, blink: 1, blinkT: 0, frozen: false, lastStepPhase: 0 };
const keys = {};
const EYE = 1.62, RAD = 0.28;
function collide(p) {
  for (let it = 0; it < 2; it++) for (const c of W.colliders) {
    if (c.disabled) continue; if (c.y1 < p.y + 0.35 || c.y0 > p.y + 1.7) continue;
    const cx = Math.max(c.x0, Math.min(p.x, c.x1)), cz = Math.max(c.z0, Math.min(p.z, c.z1));
    const dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 < RAD * RAD) { if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (RAD - d); p.z += dz / d * (RAD - d); }
      else { const ox = Math.min(p.x - c.x0, c.x1 - p.x), oz = Math.min(p.z - c.z0, c.z1 - p.z); if (ox < oz) p.x = (p.x - c.x0 < c.x1 - p.x) ? c.x0 - RAD : c.x1 + RAD; else p.z = (p.z - c.z0 < c.z1 - p.z) ? c.z0 - RAD : c.z1 + RAD; } }
  }
}
function updatePlayer(dt) {
  const fw = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const running = keys.ShiftLeft || keys.ShiftRight;
  let speed = 0; const moving = !player.frozen && !game.peeking && (fw || st);
  if (moving) { speed = running && player.stamina > 0.05 ? 4.6 : 2.5; if (running && speed > 3) player.stamina = Math.max(0, player.stamina - dt / 6); }
  if (!running || !moving) player.stamina = Math.min(1, player.stamina + dt / 9);
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  const dir = new THREE.Vector3(-sy * fw + cy * st, 0, -cy * fw - sy * st); if (dir.lengthSq() > 0) dir.normalize();
  const target = dir.multiplyScalar(speed);
  player.vel.lerp(target, Math.min(1, dt * 10));
  const p = player.pos; p.x += player.vel.x * dt; p.z += player.vel.z * dt; collide(p);
  const gy = W.groundY(p.x, p.z); p.y += (gy - p.y) * Math.min(1, dt * 14);
  const hs = Math.hypot(player.vel.x, player.vel.z);
  player.bob += hs * dt * 2.1;
  const phase = Math.floor(player.bob / Math.PI);
  if (phase !== player.lastStepPhase && hs > 0.6) { player.lastStepPhase = phase; if (sound.ctx) sound.step(W.surfaceAt(p.x, p.z), hs > 3.5 ? 1.3 : 0.9); }
  camera.position.set(p.x, p.y + EYE + Math.sin(player.bob * 2) * 0.03 * Math.min(1, hs / 2.5), p.z);
  camera.position.x += Math.cos(player.yaw) * Math.sin(player.bob) * 0.015;
  camera.position.add(game.peekOff); // leaning into a cracked door while peeking (Story.updatePeek)
  camera.rotation.set(player.pitch, player.yaw, Math.sin(player.bob) * 0.004 + (game.shake || 0) * (Math.random() - 0.5) * 0.05);
}

// ---------- HUD ----------
const hud = {
  toastT: 0,
  toast(msg, dur = 3) { const el = $('toast'); el.textContent = msg; el.style.opacity = 1; hud.toastT = dur; },
  objective(html) { $('objective').innerHTML = html ? 'OBJECTIVE<br><b>' + html + '</b>' : ''; },
  tickets(list) { $('tickets').innerHTML = '<div class="hd">WORK ORDERS · HotSOS</div>' + (list.length ? list.map(t => `<div class="${t.done ? 'done' : ''}">${t.id}  ${t.text}</div>`).join('') : '<div>— none assigned —</div>'); },
  sub(who, text) { $('sub').innerHTML = text ? (who ? `<span class="who">${who}:</span> ` : '') + text : ''; },
};
W.toast = hud.toast; W.has = k => game.inv.has(k);

// ---------- interaction ----------
const ray = new THREE.Raycaster(); ray.far = 3;
let hover = null, holdT = 0, holdItem = null;
function updateInteract(dt) {
  camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const meshes = W.interact.filter(i => !i.enabled || i.enabled()).map(i => i.mesh);
  const hits = ray.intersectObjects([...meshes, ...W.occluders], false);
  hover = null;
  if (hits.length) { const h = hits[0]; const it = W.interact.find(i => i.mesh === h.object && (!i.enabled || i.enabled())); if (it && h.distance < (it.range || 2.2)) hover = it; }
  const pr = hover ? hover.prompt() : null;
  const peekHint = hover && hover.door && !hover.door.open && !hover.door.broken && !hover.door.locked && game.story.S.active ? '    ·    [HOLD Q / RIGHT MOUSE] Peek' : '';
  $('prompt').textContent = pr && !player.eyesClosed ? ((typeof hover.hold === 'function' ? hover.hold() : hover.hold) ? '[HOLD E] ' : '[E] ') + pr + peekHint : (game.peeking ? '[E] Open it   ·   release to shut' : '');
  const holdLen = hover ? (typeof hover.hold === 'function' ? hover.hold() : hover.hold) : 0;
  if (hover && holdLen && keys.KeyE && !player.frozen) { if (holdItem !== hover) { holdItem = hover; holdT = 0; hover.onHoldStart && hover.onHoldStart(); } holdT += dt; $('holdbar').style.display = 'block'; $('holdfill').style.width = Math.min(100, holdT / holdLen * 100) + '%'; if (holdT >= holdLen) { const it = hover; holdItem = null; holdT = 0; keysE = false; keys.KeyE = false; it.use(); } }
  else { holdItem = null; holdT = 0; $('holdbar').style.display = 'none'; }
}
let keysE = false;

// ---------- game state ----------
const game = window.game = {
  W, T, scene, camera, player, sound, hud, keys, post, renderer, flash, inv: new Set(), state: 'title', time: 82720, shake: 0, flashOn: false, battery: 0.82, peeking: false, peekOff: new THREE.Vector3(), mouseR: false,
  peekHeld() { return !!(keys.KeyQ || game.mouseR); },
  cut(text, then) { const el = $('cut'); el.textContent = text || ''; el.classList.remove('hidden'); post.uniforms.glitch.value = 1; if (sound.ctx) sound.burst({ f: 3000, q: 0.3, peak: 0.25, hold: 0.25, rel: 0.1 }); setTimeout(() => { el.classList.add('hidden'); then && then(); }, 900); },
  setView(x, z, yaw, pitch = 0, y) { player.pos.set(x, y ?? W.groundY(x, z), z); player.yaw = yaw; player.pitch = pitch; areaSnap = true; },
  lockPointer() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} },
};
game.story = new Story(game);

function fmtTime(s) { s = Math.floor(s) % 86400; let h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')} ${ap}`; }

// ---------- input ----------
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (keys[e.code]) return; keys[e.code] = true;
  if (game.state !== 'play') return;
  if (e.code === 'KeyE' && game.peeking && game.story.peekDoor) { const d = game.story.peekDoor; const dir = Math.sign(d.peekA) || d.swing; d.setOpen(true); d.target = dir * 1.75; return; } // throw it open the way it was cracked (away from you)
  if (e.code === 'KeyE' && hover && !(typeof hover.hold === 'function' ? hover.hold() : hover.hold) && !player.eyesClosed) hover.use();
  if (e.code === 'KeyF' && game.flashDead) { sound.ctx && sound.burst({ f: 2500, q: 5, peak: 0.2, rel: 0.03 }); game.hud.toast('Click. Nothing. The flashlight\'s dead.', 2); return; }
  if (e.code === 'KeyF') { game.flashOn = !game.flashOn; sound.ctx && sound.burst({ f: 2500, q: 5, peak: 0.2, rel: 0.03 }); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
// right mouse = peek (hold)
addEventListener('mousedown', e => { if (e.button === 2) game.mouseR = true; });
addEventListener('mouseup', e => { if (e.button === 2) game.mouseR = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { game.mouseR = false; for (const k in keys) keys[k] = false; });
addEventListener('mousemove', e => { if (game.state !== 'play' || document.pointerLockElement !== canvas) return; player.yaw -= e.movementX * 0.0022; player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * 0.0022)); });
canvas.addEventListener('click', () => { if (game.state === 'play' && document.pointerLockElement !== canvas) game.lockPointer(); });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && game.state === 'play' && !params.has('nolock')) pause(true); });
function pause(v) { if (v) { game.state = 'pause'; $('pause').classList.remove('hidden'); } else { $('pause').classList.add('hidden'); game.state = 'play'; game.lockPointer(); } }
function begin(night = 1) { game.night = night; game.story.setNight(night); sound.init();
  if (night === 2) sound.loadVoices(N2_LINES, 'audio/n2/'); else { sound.loadVoices(CLINT_LINES, 'audio/clint/'); sound.loadVoices(DEE_LINES); sound.loadVoices(CHRIS_LINES, 'audio/chris/'); }
  try { sessionStorage.removeItem('rizzo-next'); } catch (e) {}
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); game.state = 'play'; game.lockPointer(); game.story.start(); }
game.begin = begin; game.N2_LINES = N2_LINES;
$('start').onclick = () => begin(1);
$('night2').onclick = () => begin(2);
// Night 2 unlocks after you finish night one (or ?n2 for testing). The end card can send you straight to it (reload, then the title offers it first).
{ let unlocked = params.has('n2'), next = null; try { unlocked = unlocked || localStorage.getItem('rizzo-n1-done') === '1'; next = sessionStorage.getItem('rizzo-next'); } catch (e) {}
  if (unlocked) $('night2').classList.remove('hidden');
  if (next === '2') { $('night2').classList.remove('hidden'); $('night2').classList.add('primary'); $('start').before($('night2')); $('start').textContent = 'NIGHT 1 · CHRISTMAS EVE'; } }
$('n2go').onclick = () => { try { sessionStorage.setItem('rizzo-auto', '2'); } catch (e) {} location.reload(); };
$('resume').onclick = () => pause(false);
$('restart').onclick = $('restart2').onclick = () => { $('pause').classList.add('hidden'); $('dead').classList.add('hidden'); game.story.restart(); game.state = 'play'; game.lockPointer(); };
$('retry').onclick = () => { $('dead').classList.add('hidden'); game.story.retry(); game.state = 'play'; game.lockPointer(); };
$('again').onclick = () => { try { sessionStorage.setItem('rizzo-next', '1'); } catch (e) {} $('end').classList.add('hidden'); game.story.restart(); game.state = 'play'; game.lockPointer(); };
game.showDead = msg => { game.state = 'dead'; $('deadmsg').textContent = msg || ''; $('dead').classList.remove('hidden'); document.exitPointerLock && document.exitPointerLock(); };
game.showEnd = (html, night = 1) => { game.state = 'end'; $('endtxt').innerHTML = html; $('tape').textContent = night === 2 ? 'END OF RECOVERED FOOTAGE — TAPE 2' : 'END OF RECOVERED FOOTAGE — TAPE 1'; $('endh').textContent = night === 2 ? 'THIRD SHIFT · NIGHT TWO' : 'THIRD SHIFT'; $('n2go').textContent = night === 2 ? 'PLAY NIGHT 2 AGAIN' : 'NIGHT 2 →'; $('again').textContent = night === 2 ? 'BACK TO NIGHT 1' : 'PLAY AGAIN'; $('end').classList.remove('hidden'); $('hud').classList.add('hidden'); document.exitPointerLock && document.exitPointerLock(); };

// ---------- loop ----------
const clock = new THREE.Clock(); let acc = 0;
function frame(dtOverride) {
  const dt = Math.min(0.05, dtOverride ?? clock.getDelta()); const t = performance.now() / 1000;
  if (game.state === 'play') {
    game.time += dt;
    updatePlayer(dt);
    game.story.update(dt);
    updateInteract(dt);
    $('clock').textContent = fmtTime(game.time); $('date').textContent = game.night === 2 ? (game.time >= 86400 ? 'DEC 26 2026' : 'DEC 25 2026') : (game.time >= 86400 ? 'DEC 25 2026' : 'DEC 24 2026');
    game.battery = Math.max(0.08, game.battery - dt / 5400); $('batfill').style.width = (game.battery * 100) + '%';
    $('sprintfill').style.width = (player.stamina * 100) + '%';
    if (hud.toastT > 0) { hud.toastT -= dt; if (hud.toastT <= 0) $('toast').style.opacity = 0; }
  } else if (game.state === 'shots') { camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z); camera.rotation.set(player.pitch, player.yaw, 0); $('clock').textContent = fmtTime(game.time); } else if (game.state === 'title' || game.state === 'pause') { camera.rotation.set(player.pitch, player.yaw, 0); if (game.state === 'title') { camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z); } }
  game.story.always && game.story.always(dt);
  flash.intensity = game.flashOn ? 14 * (0.92 + Math.random() * 0.03) : 0; flashFill.intensity = game.flashOn ? 0.35 : 0;
  updateLights(dt, t); updateOutdoor(dt); updateMoon(dt);
  sound.updateListener(camera);
  post.uniforms.time.value = t; post.uniforms.glitch.value = Math.max(0, post.uniforms.glitch.value - dt * 1.5);
  game.shake = Math.max(0, game.shake - dt * 2);
  if (game.noRender) return;
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
function loop() { frame(); requestAnimationFrame(loop); }
game.frame = frame;
if (!params.has('shots') && !params.has('manual')) loop(); else { game.state = 'shots'; $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); game.hud.tickets([]); }
// restart / retry-from-the-start / "play night 2 again": straight back onto the dock at 10:58 PM, no title. Audio and the mouse unlock on the first click/key.
{ let auto = null; try { auto = sessionStorage.getItem('rizzo-auto'); sessionStorage.removeItem('rizzo-auto'); } catch (e) {}
  if (auto === '2') { begin(2); const wake = () => { sound.init(); if (sound.ctx && sound.ctx.state !== 'running') sound.ctx.resume(); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
    addEventListener('pointerdown', wake); addEventListener('keydown', wake); game.autoNight = 2; } }
window.__ready = true;
