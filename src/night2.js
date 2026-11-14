// NIGHT TWO — Christmas night, 11 PM to 7 AM. Same building, same job, same radio. Lady DuBose is the haunting.
// Guest calls radioed by Dee: a clogged toilet (117), a dead TV (the DuBose Suite), no hot water (117 -> MECH 1, the boiler room).
// Her portrait over the library fireplace changes when you look away, its eyes follow you, and late in the night it's empty.
// 4 AM: the library damper. She steps out. Shut a door between you and her (peek through the crack if you have to).
// 7 AM: clock out. Clint comes in through the lot door, still angry, and doesn't want to hear a word of it. Go home.
// The player is never voiced (subtitles only). Dee: radio takes (Piper kristin); Clint: in person (Piper joe), both in audio/n2/.
import * as THREE from 'three';

const DEE = 'DEE (NIGHT AUDIT)', ME = 'YOU', CLINT = 'CLINT';
const DY = 0.34;
const T_START = 82720;                 // 10:58:40 PM
const T_TV = 86400 + 52 * 60;          // 12:52 AM
const T_SHOWER = 86400 + 2 * 3600 + 47 * 60;  // 2:47 AM
const T_DAMPER = 86400 + 4 * 3600 + 16 * 60;  // 4:16 AM
const T_SEVEN = 86400 + 6 * 3600 + 57 * 60;   // 6:57 AM
const DAMPER = { x: 51.25, z: -36.5 };          // standing at the library fireplace
const LADY_SPAWN = [51.0, -38.9];
const SHOP_WAKE = { x: 2.55, z: -2.85, yaw: 0.615, pitch: -0.2 };

export class Night2 {
  constructor(story) {
    this.s = story; this.g = story.g; this.W = story.W;
    this.n = { phase: 'clockin', clocked: false, radio: false, plunger: false, toilet: 0, cable: 0, shower: 0, boiler: 0, damper: false, out: false, portraitSeen: false };
    this.lady = null; this.L = null; this.pt = { vis: false, away: 0, state: 'normal', said: 0, t: 0 }; this.cl = null;
    this.buildLady(); this.buildProps(); this.addInteractions();
  }
  get f() { return this.s.f; }
  say(l, then) { this.s.say(l, then); } after(t, fn) { this.s.after(t, fn); } obj(h) { this.s.obj(h); }
  ticket(id, text) { const s = this.s; s.tickets = [...s.tickets.filter(t => !t.done || t.id === id).filter(t => t.id !== id), { id, text }]; this.g.hud.tickets(s.tickets); this.g.sound.ctx && this.g.sound.ding(); }

  // ---------------- Lady DuBose (the figure): dark dress, white open collar, silver curls, pearls. Pale, faintly lit from nowhere. ----------------
  buildLady() {
    const G = this.lady = new THREE.Group(); G.visible = false; this.g.scene.add(G);
    const mat = (c, e = 0, o = 0.92) => new THREE.MeshLambertMaterial({ color: c, emissive: e, transparent: true, opacity: o });
    const dress = mat(0x141824, 0x05070c), white = mat(0xe8e4da, 0x2a2a28), skin = mat(0xcab8a8, 0x2a2420), hair = mat(0xc8ccd0, 0x30343a), pearl = mat(0xfbf8f0, 0x6a6660, 1), eye = new THREE.MeshBasicMaterial({ color: 0x050303 });
    this.ladyMats = [dress, white, skin, hair, pearl];
    const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); G.add(o); return o; };
    add(new THREE.CylinderGeometry(0.2, 0.46, 1.22, 14), dress, 0, 0.61, 0);                 // skirt to the floor
    add(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 12), dress, 0, 1.42, 0, 1, 1, 0.8);       // bodice
    for (const sx of [-1, 1]) { add(new THREE.SphereGeometry(0.085, 10, 8), dress, sx * 0.17, 1.6, 0, 1, 0.8, 1);
      add(new THREE.CylinderGeometry(0.05, 0.042, 0.62, 8), dress, sx * 0.2, 1.3, 0.02, 1, 1, 1, 0, sx * 0.08);         // arms, hanging
      add(new THREE.SphereGeometry(0.04, 8, 6), skin, sx * 0.225, 0.97, 0.03, 0.8, 1.2, 0.7);                           // hands
      add(new THREE.BoxGeometry(0.11, 0.16, 0.02), white, sx * 0.07, 1.56, 0.14, 1, 1, 1, -0.25, sx * 0.55); }           // open collar
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), skin, 0, 1.66, 0.01);
    const head = this.ladyHead = add(new THREE.SphereGeometry(0.1, 14, 10), skin, 0, 1.79, 0.02, 0.95, 1.15, 1);
    for (const sx of [-1, 1]) { add(new THREE.SphereGeometry(0.016, 6, 5), eye, sx * 0.035, 1.8, 0.105, 1.2, 0.8, 0.5); add(new THREE.SphereGeometry(0.014, 8, 6), pearl, sx * 0.1, 1.73, 0.01); }
    // hair: a set silver perm. A soft grey under-volume, then ~190 tight curls (instanced little rings, one draw call) in four shades of silver,
    // packed densest on the crown and sides, swept back off the face, short at the nape. Shaded by the scene light like everything else.
    const R = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const under = mat(0x8c9096, 0x14161a); this.ladyMats.push(under);
    add(new THREE.SphereGeometry(0.112, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), under, 0, 1.805, -0.012, 1.04, 1.12, 1.06, -0.32);   // cap, tipped back off the brow
    add(new THREE.SphereGeometry(0.06, 10, 8), under, 0, 1.745, -0.085, 1.5, 0.9, 0.9);                                                  // short nape
    const curlMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x0e1014, transparent: true, opacity: 0.92 }); this.ladyMats.push(curlMat);
    const N = 190, curls = new THREE.InstancedMesh(new THREE.TorusGeometry(0.0145, 0.0068, 5, 10), curlMat, N); G.add(curls); this.ladyHair = curls;
    const shades = [0xd4d7da, 0xbcc0c6, 0xa2a7ae, 0x878c94].map(c => new THREE.Color(c)); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let k = 0, guard = 0; const C0 = new THREE.Vector3(0, 1.8, -0.01);
    while (k < N && guard++ < 6000) {
      const th = R() * Math.PI * 2, ph = Math.acos(1 - R() * 1.25); // polar angle from straight up; skip the underside
      const dir = new THREE.Vector3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
      if (dir.z > 0.42 && dir.y < 0.62) continue;          // face stays clear
      if (dir.y < -0.05 && dir.z > -0.3) continue;         // no curls over the ears/jaw
      if (dir.y < -0.25) continue;                         // short at the nape
      const r = 0.112 + R() * 0.028 + (dir.y > 0.5 ? 0.012 : 0) + (Math.abs(dir.x) > 0.6 && dir.y > -0.1 ? 0.016 : 0); // volume on the crown and at the sides
      v.copy(dir).multiply(new THREE.Vector3(1.02, 1.12, 1.04)).multiplyScalar(r).add(C0);
      e.set(R() * Math.PI, R() * Math.PI, R() * Math.PI); q.setFromEuler(e); const s0 = 0.8 + R() * 0.55; sc.set(s0, s0, s0 * (0.8 + R() * 0.5));
      m4.compose(v, q, sc); curls.setMatrixAt(k, m4);
      const shade = shades[Math.min(3, Math.floor(R() * 2.2 + (dir.y < 0.2 ? 1.2 : 0)))].clone().multiplyScalar(0.92 + R() * 0.12); curls.setColorAt(k, shade); k++; }
    curls.count = k; curls.instanceMatrix.needsUpdate = true; if (curls.instanceColor) curls.instanceColor.needsUpdate = true;
    this.ladyLight = this.W.light(0, 1.6, 0, 0x9fb4e6, 0.9, { dist: 3.2, group: 'lady', on: false });
  }
  placeLady(x, z, ry) { const G = this.lady; G.position.set(x, this.W.groundY(x, z), z); if (ry !== undefined) G.rotation.y = ry; this.ladyLight.pos.set(x, G.position.y + 1.7, z); }
  ladyShow(v, op = 0.92) { this.lady.visible = v; this.ladyLight.on = v; for (const m of this.ladyMats) m.opacity = m === this.ladyMats[4] ? 1 : op; }
  // runtime props for the polish pass: the suite TV's picture and the burner's flame window (added after the static merge, so they animate)
  buildProps() {
    const W = this.W, sc = this.g.scene;
    const tvc = this.tvCanvas = document.createElement('canvas'); tvc.width = 128; tvc.height = 72; this.tvTex = new THREE.CanvasTexture(tvc); this.tvTex.magFilter = THREE.NearestFilter; this.tvTex.colorSpace = THREE.SRGBColorSpace;
    const scr = this.tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.6), new THREE.MeshBasicMaterial({ map: this.tvTex, toneMapped: false })); scr.rotation.y = Math.PI / 2; scr.position.set(66.335, W.anchors.tv.y + 0.05, -45.8); scr.visible = false; sc.add(scr);
    const fc = this.flameCanvas = document.createElement('canvas'); fc.width = 32; fc.height = 32; this.flameTex = new THREE.CanvasTexture(fc); this.flameTex.magFilter = THREE.NearestFilter; this.flameTex.colorSpace = THREE.SRGBColorSpace;
    const fw = this.flameWin = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ map: this.flameTex, toneMapped: false })); fw.rotation.y = Math.PI / 2; fw.position.set(-1.276, 0.92, 7.05); sc.add(fw);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.016, 6, 18), new THREE.MeshLambertMaterial({ color: 0x3a3e40 })); ring.rotation.y = Math.PI / 2; ring.position.set(-1.274, 0.92, 7.05); sc.add(ring);
    const hc = document.createElement('canvas'); hc.width = hc.height = 64; const hg = hc.getContext('2d'); const gr = hg.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,170,80,0.9)'); gr.addColorStop(0.35, 'rgba(255,110,30,0.35)'); gr.addColorStop(1, 'rgba(255,80,0,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 64, 64);
    const halo = this.flameHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.rotation.y = Math.PI / 2; halo.position.set(-1.22, 0.92, 7.05); halo.visible = false; sc.add(halo);
    this.drawFlame(0, false);
  }
  drawFlame(t, lit) { const c = this.flameCanvas.getContext('2d'); c.fillStyle = lit ? '#1a0602' : '#070302'; c.fillRect(0, 0, 32, 32); if (!lit) { this.flameTex.needsUpdate = true; return; }
    for (let x = 0; x < 32; x += 2) { const h = 14 + Math.sin(t * 9 + x * 0.7) * 4 + Math.sin(t * 23 + x * 1.9) * 3 + Math.random() * 4;
      c.fillStyle = '#ff7a1c'; c.fillRect(x, 32 - h - 6, 2, h); c.fillStyle = '#ffc860'; c.fillRect(x, 32 - h * 0.6 - 6, 2, h * 0.6); c.fillStyle = '#5a8cff'; c.fillRect(x, 24, 2, 4 + Math.random() * 2); c.fillStyle = '#c8dcff'; c.fillRect(x, 27, 2, 2); }
    this.flameTex.needsUpdate = true; }
  drawTV(t) { const c = this.tvCanvas.getContext('2d'); // the yule-log channel: a brick hearth, a grate of logs, flames
    c.fillStyle = '#2a1008'; c.fillRect(0, 0, 128, 72); c.fillStyle = '#5a2414'; for (let y = 0; y < 72; y += 8) for (let x = (y / 8) % 2 * 8; x < 128; x += 16) c.fillRect(x + 1, y + 1, 14, 6);
    c.fillStyle = '#0c0604'; c.fillRect(22, 18, 84, 48); const gl = 0.85 + Math.sin(t * 7) * 0.08 + Math.random() * 0.07;
    for (let x = 26; x < 102; x += 3) { const h = (18 + Math.sin(t * 6 + x * 0.3) * 6 + Math.sin(t * 15 + x * 1.3) * 4 + Math.random() * 5) * gl; c.fillStyle = '#ff6a10'; c.fillRect(x, 56 - h, 3, h); c.fillStyle = '#ffb030'; c.fillRect(x, 56 - h * 0.65, 3, h * 0.65); c.fillStyle = '#fff0a0'; c.fillRect(x, 56 - h * 0.3, 3, h * 0.3); }
    c.fillStyle = '#3a2010'; c.fillRect(30, 54, 68, 6); c.fillStyle = '#4a2a14'; c.fillRect(36, 50, 56, 5); c.fillStyle = '#ff4a10'; for (let i = 0; i < 9; i++) c.fillRect(34 + Math.random() * 60, 58 + Math.random() * 5, 2, 1);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < 72; y += 2) c.fillRect(0, y, 128, 1); this.tvTex.needsUpdate = true; return gl; }

  // ---------------- interactions (night two only) ----------------
  addInteractions() {
    const W = this.W, g = this.g, n = this.n, s = this.s, add = o => { const en = o.enabled; o.enabled = () => s.night === 2 && (!en || en()); W.interact.push(o); };
    add({ mesh: W.timeclockMesh, range: 2.2, hold: 0.7, enabled: () => !n.clocked, prompt: () => 'Clock in — swipe badge', use: () => this.clockIn() });
    add({ mesh: W.timeclockMesh, range: 2.2, enabled: () => n.clocked && n.phase !== 'clockout' && !n.out, prompt: () => 'Time clock', use: () => g.hud.toast('You\'re on till seven.', 2.2) });
    add({ mesh: W.timeclockMesh, range: 2.2, hold: 0.7, enabled: () => n.phase === 'clockout', prompt: () => 'Clock out — swipe badge', use: () => this.punchOut() });
    add({ mesh: W.timeclockMesh, range: 2.2, enabled: () => n.out, prompt: () => 'Time clock', use: () => g.hud.toast('OUT ' + (this._outTime || '7:00 AM') + '. Go home.', 2.5) });
    add({ mesh: W.radioPick, range: 2.2, enabled: () => !n.radio, prompt: () => n.clocked ? 'Take radio + flashlight' : 'Radio (clock in first)', use: () => { if (!n.clocked) { g.hud.toast('Clock in first.'); return; } this.takeRadio(); } });
    add({ mesh: W.radioPick, range: 2.2, enabled: () => n.radio, prompt: () => 'Radio charger', use: () => g.hud.toast('Empty. The radio\'s on your belt.', 2) });
    add({ mesh: W.plungerPick, range: 2.2, enabled: () => !n.plunger && n.phase === 'toilet', prompt: () => 'Take the plunger', use: () => { n.plunger = true; W.plungerMesh.visible = false; g.inv.add('plunger'); g.sound.ctx && g.sound.pickup(); g.hud.toast('Plunger. Room 117 — McLean hall, north side.', 3); } });
    add({ mesh: W.plungerPick, range: 2.2, enabled: () => !n.plunger && n.phase !== 'toilet', prompt: () => 'Plunger', use: () => g.hud.toast('A plunger. Nobody\'s called for one. Yet.', 2) });
    // WO-4481: the toilet in 117
    add({ mesh: W.toiletMesh, range: 2.0, enabled: () => n.phase === 'toilet' && n.toilet < 2, hold: () => n.plunger ? [2.8, 0.6][n.toilet] : 0,
      prompt: () => !n.plunger ? 'Toilet — clogged to the rim (need the plunger from the shop)' : ['Plunge it', 'Flush to test'][n.toilet],
      onHoldStart: () => { const so = g.sound; if (!so.ctx || n.toilet) return; W.toiletPlunger.visible = true; this._plungeT = 2.8; for (let i = 0; i < 6; i++) setTimeout(() => so.ctx && so.plunge(W.anchors.toilet), i * 440); },
      use: () => { if (!n.plunger) { g.hud.toast('Need the plunger. It\'s in the shop by the wet vac.', 3); return; }
        if (n.toilet === 0) { n.toilet = 1; W.toiletPlunger.visible = false; g.sound.ctx && g.sound.gurgle(1.6); W.toiletWater.material.color.setHex(0x8a8a78); W.toiletWater.position.y = 0.3; g.hud.toast('It lets go with a gulp. Water\'s going down.', 3); }
        else { n.toilet = 2; g.sound.ctx && g.sound.flush(W.anchors.toilet); W.toiletWater.material.color.setHex(0xa8b4b8); this.after(0.4, () => this.toiletDone()); } } });
    add({ mesh: W.toiletMesh, range: 2.0, enabled: () => n.toilet >= 2, prompt: () => 'Toilet', use: () => g.hud.toast('Flushes fine. Bowl\'s clean.', 2) });
    // WO-4482: the suite TV
    add({ mesh: W.cableMesh, range: 2.2, enabled: () => n.phase === 'tv' && n.cable < 3, hold: () => [0, 1.0, 1.6][n.cable],
      prompt: () => ['Check the cable box', 'Switch the TV input to HDMI 2', 'Tighten the loose coax'][n.cable],
      onHoldStart: () => { const so = g.sound; if (!so.ctx) return; if (n.cable === 1) so.burst({ f: 2200, q: 5, peak: 0.12, rel: 0.04 }); else { so.burst({ f: 900, q: 2, peak: 0.12, hold: 0.4, rel: 0.2 }); } },
      use: () => { if (n.cable === 0) { n.cable = 1; g.hud.toast('Box is on. TV\'s set to HDMI 1. The box is plugged into HDMI 2.', 3.5); }
        else if (n.cable === 1) { n.cable = 2; this.s.tvOn = false; W.tvMat.color.setRGB(0.05, 0.08, 0.22); W.tvLight.intensity = 0.25; g.hud.toast('NO SIGNAL. The coax on the back is hand-loose.', 3); }
        else { n.cable = 3; this.tvFixed(); } } });
    add({ mesh: W.cableMesh, range: 2.2, enabled: () => n.cable >= 3, prompt: () => 'Cable box', use: () => g.hud.toast(this._tvSnow ? 'Snow. You\'re not touching it again.' : 'Picture\'s good.', 2) });
    // WO-4483: the 117 shower, then MECH 1
    add({ mesh: W.showerMesh, range: 2.2, enabled: () => n.phase === 'shower' && n.shower === 0, prompt: () => 'Run the shower', use: () => this.showerCold() });
    add({ mesh: W.showerMesh, range: 2.2, enabled: () => n.shower > 0, prompt: () => 'Shower', use: () => g.hud.toast(n.boiler >= 3 ? 'Hot. Steam\'s coming off it.' : 'Still ice cold.', 2) });
    add({ mesh: W.boilerMesh, range: 2.2, enabled: () => n.phase === 'boiler' && (n.boiler === 0 || n.boiler === 2), hold: () => n.boiler === 2 ? 1.0 : 0,
      prompt: () => n.boiler === 0 ? 'Check the boiler controls' : 'Press RESET on the burner control',
      use: () => { if (n.boiler === 0) { n.boiler = 1; g.hud.toast('LWCO lamp\'s lit: low-water cutoff tripped, burner locked out.\nGauge glass is almost empty. Open the feedwater valve.', 5); this.obj('Open the feedwater valve — red handwheel on the pipe, right of the boiler'); }
        else this.ignite(); } });
    add({ mesh: W.boilerMesh, range: 2.2, enabled: () => n.phase === 'boiler' && n.boiler === 1, prompt: () => 'Burner control — LOW WATER', use: () => g.hud.toast('Locked out on low water. Feed it first.', 2) });
    add({ mesh: W.boilerMesh, range: 2.2, enabled: () => n.boiler >= 3, prompt: () => 'Boiler', use: () => g.hud.toast('Firing. 12 psi. Leave it be.', 2) });
    add({ mesh: W.valveMesh, range: 2.0, enabled: () => n.phase === 'boiler' && n.boiler === 1, hold: 2.4, prompt: () => 'Open the feedwater valve',
      onHoldStart: () => { g.sound.ctx && g.sound.hiss(2.4, W.anchors.boiler); this._valveT = 2.4; },
      use: () => { n.boiler = 2; this._sightK = 0.06; this._sightTarget = 0.55; g.sound.ctx && g.sound.gurgle(2.0); g.hud.toast('Water\'s coming up in the glass. Now reset the burner.', 3); this.obj('Reset the burner — RESET button on the burner control'); } });
    add({ mesh: W.valveMesh, range: 2.0, enabled: () => n.boiler >= 2, prompt: () => 'Feedwater valve (open)', use: () => g.hud.toast('Open. Gauge glass is at half.', 2) });
    // WO-4484: the library damper (created here: an invisible box in the firebox)
    const dm = W.damperMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 1.1), new THREE.MeshBasicMaterial({ visible: false })); dm.position.set(50.55, DY + 0.45, -36.5); this.g.scene.add(dm);
    add({ mesh: dm, range: 2.2, enabled: () => n.phase === 'damper' && !n.damper, hold: 1.6, prompt: () => 'Close the flue damper',
      onHoldStart: () => { const so = g.sound; if (so.ctx) { so.burst({ f: 700, q: 2, peak: 0.3, hold: 0.6, rel: 0.2, buf: so.brown }); setTimeout(() => so.ctx && so.clunk(), 1400); } }, use: () => this.damperClosed() });
    add({ mesh: dm, range: 2.2, enabled: () => n.damper, prompt: () => 'Fireplace', use: () => g.hud.toast('Damper\'s shut.', 2) });
    add({ mesh: W.clintPick, range: 2.4, enabled: () => W.clint.visible && n.phase === 'leave' && this.cl && this.cl.mode !== 'talk', prompt: () => 'Clint', use: () => g.hud.toast('He doesn\'t want to hear it.', 2) });
  }

  // ---------------- lifecycle ----------------
  start() {
    const g = this.g, so = g.sound, W = this.W, s = this.s; g.time = T_START;
    g.setView(4, 6.5, Math.atan2(4 - 1.2, 6.5 - 4.75), 0.02); g.hud.tickets([]); s.tickets = [];
    W.clint.visible = false; W.clintCol.disabled = true; s.f.clint = 2; s.f.phase = 'n2';
    if (so.ctx) { so.hum(new THREE.Vector3(5, 4.6, 6), 0.05); so.hum(new THREE.Vector3(11.5, 4.6, 4), 0.05); so.hum(new THREE.Vector3(3, 2.6, -2.5), 0.035);
      so.hum(new THREE.Vector3(9.2, 2.9, -6), 0.03); so.hum(new THREE.Vector3(9.2, 2.9, -18), 0.04); so.hum(new THREE.Vector3(9.2, 2.9, -26), 0.03); so.drone(W.anchors.ice, 0.06);
      s.clockLoop = so.clock(W.anchors.clock); s.tv = so.staticLoop(W.anchors.tv, 0.05); }
    s.tvOn = true; s.rattleT = 6; s.scrape = null;
    s.setGroup('dubose', true, 0.7, 0.02); s.setGroup('haunt', false); s.setGroup('boiler', true, 1, 0.04);
    W.puddle.visible = false; W.doors.duboseDoor.locked = true; W.doors.boilerDoor.locked = true; W.doors.boilerDoor.lockedMsg = 'MECH 1 · Boiler room. Locked.';
    this.obj('Clock in — time clock on the dock wall');
    this.after(1.2, () => this.say([[ME, 'Christmas night. Same dock. Same cold.', 2.6]]));
    s.saveCP('N2');
  }
  clockIn() { const g = this.g, n = this.n; n.clocked = true; g.sound.ctx && g.sound.punch(); g.hud.toast('IN  ' + this.s.clockStr() + '   ·   ENGINEERING / 3RD SHIFT', 3.5); n.phase = 'radio'; this.obj('Grab your radio — maintenance office, just inside the dock'); }
  takeRadio() {
    const g = this.g, W = this.W, n = this.n; n.radio = true; this.s.f.radio = true; W.radioMesh.visible = false; W.radioLed.visible = false; g.sound.ctx && g.sound.pickup(); g.flashOn = true; g.inv.add('DuBose key');
    g.hud.toast('Radio + flashlight. The DuBose key\'s still on your ring.   [F] flashlight', 3.5);
    this.say([[DEE, 'Hey, you on? It\'s Dee. You came back. Brave.', 3.4], [DEE, 'Merry Christmas, hon. Three guest calls already, and it\'s not even midnight.', 4.6],
      [DEE, 'First one\'s 117. Toilet\'s clogged and it\'s about to come over the rim. Plunger\'s in the shop.', 5.2], [ME, 'Copy. On it.', 1.5]], () => {
      this.ticket('WO-4481', 'Toilet clogged — Rm 117'); n.phase = 'toilet'; this.obj('WO-4481: Clogged toilet — Room 117<br>Plunger: shop, by the wet vac · 117: corridor → McLean hall, north side'); W.doors.r117.locked = false; });
  }
  toiletDone() {
    const s = this.s, g = this.g; s.closeWO('WO-4481'); this.n.phase = 'between';
    this.say([[DEE, 'Saw it close. 117 says thank you. ...They said it sounded like somebody humming in the pipes.', 5.4], [ME, '...Old pipes.', 1.6]], () =>
      g.cut('12:52 AM', () => { g.time = Math.max(g.time, T_TV); this.tvCall(); }));
  }
  tvCall() {
    const n = this.n, W = this.W; n.phase = 'tv'; this.s.tvOn = true; this._tvSnow = false;
    this.say([[DEE, 'Next one. Family rented the DuBose Suite for Christmas. They\'re out at a late dinner, and the TV\'s nothing but snow.', 6.4],
      [DEE, 'DuBose key\'s on your ring. Same way as last night. Terrace, side door, stair hall.', 4.6]], () => {
      this.ticket('WO-4482', 'TV no picture — DuBose Suite'); this.obj('WO-4482: TV shows snow — DuBose Suite<br>McLean hall → terrace door → DuBose side door → stair hall → suite'); W.doors.terraceDoor.locked = false; });
  }
  tvFixed() {
    const g = this.g, W = this.W, s = this.s; s.tvOn = false; s.tv && s.tv.set(0); W.tvMat.color.setRGB(0.55, 0.32, 0.12); W.tvLight.on = true; W.tvLight.intensity = 1.5; W.tvLight.color && W.tvLight.color.setHex(0xff9a4a); this._tvGlow = true; this.tvScreen.visible = true; this.drawTV(0);
    g.sound.ctx && g.sound.clunk(); g.hud.toast('Picture. The yule-log channel.', 2.5); s.closeWO('WO-4482'); this.n.phase = 'tvdone';
    // the TV goes back to snow on its own and hums at you for a few seconds, then quiet
    this.after(6.5, () => { this._tvGlow = false; this.tvScreen.visible = false; W.tvLight.color && W.tvLight.color.setHex(0xa0c0ff); W.tvLight.intensity = 0.5; this._tvSnow = true; s.tvOn = true; s.tv && s.tv.set(0.08); if (g.sound.ctx) { this._tvHum = g.sound.lullaby(W.anchors.tv, 0.2, this.humOpts({ gap: 0.8 })); this._tvHum.clarity(0.5); } g.post.uniforms.glitch.value = 0.5; });
    this.after(11.5, () => { this._tvHum && this._tvHum.stop(0.2); this._tvHum = null; s.tvOn = false; s.tv && s.tv.set(0); W.tvMat.color.setRGB(0.01, 0.01, 0.01); W.tvLight.on = false; this.say([[ME, '...Nope.', 1.4]]); });
    this.after(13.5, () => this.say([[DEE, 'Suite TV\'s showing back on. ...Okay, it just went off again. Never mind. Come on back.', 5.2]], () => { this.n.phase = 'tvback'; this.obj('Head back to McLean'); }));
  }
  showerCall() {
    const n = this.n; n.phase = 'shower';
    this.say([[DEE, 'You still with me? It\'s almost three. 117 again. They want a shower, and the water\'s ice cold.', 5.6], [ME, 'On my way.', 1.4]], () => {
      this.ticket('WO-4483', 'No hot water — Rm 117 shower'); this.obj('WO-4483: No hot water — Room 117 shower'); });
  }
  showerCold() {
    const g = this.g, n = this.n, W = this.W; n.shower = 1; if (g.sound.ctx) { this._shower = g.sound.shower(W.anchors.shower); this.after(3.5, () => { this._shower && this._shower.stop(); this._shower = null; }); }
    g.hud.toast('Ice cold. Not even lukewarm.', 3);
    this.after(1.6, () => this.say([[DEE, 'Nobody in McLean has hot water. That\'s the boiler room, off the dock. Door\'s by the time clock. I buzzed it open.', 6.4]], () => {
      n.phase = 'boiler'; W.doors.boilerDoor.locked = false; W.doors.boilerDoor.lockedMsg = null; this.obj('Get the hot water back — MECH 1, the boiler room<br>door in the dock\'s west wall, past the dumpster'); }));
  }
  ignite() {
    const g = this.g, W = this.W, n = this.n, so = g.sound; n.boiler = 3; W.lwcoLamp.color.setHex(0x200402); W.lwcoLamp.userData.base = new THREE.Color(0x200402); W.readyLamp.color.setHex(0x30ff40);
    if (so.ctx) { so.ignite(W.anchors.boiler); this._roar = so.burner(W.anchors.boiler); } W.burnerGlow.color.setHex(0xff8a30); W.burnerLight.on = true; W.burnerLight.intensity = 2.4; this.flameHalo.visible = true; this.drawFlame(0, true); g.shake = 0.3;
    g.hud.toast('WHUMP. The burner lights. Flame\'s orange through the peephole.', 1.8); this.obj('');
    this.after(3.2, () => this.boilerScare());
  }
  // the jump scare: the bulb pops, the room goes black but for the burner's glow, and she's right behind you
  boilerScare() {
    const g = this.g, W = this.W, so = g.sound, p = g.player, n = this.n; n.phase = 'scare';
    const v = W.boilerBulb; v.on = false; so.ctx && so.burst({ f: 3000, q: 3, peak: 0.4, rel: 0.05 }); g.flashOn = false; g.flashDead = true;
    const bx = p.pos.x + Math.sin(p.yaw) * 1.1, bz = p.pos.z + Math.cos(p.yaw) * 1.1; // behind you (camera looks along -sin, -cos)
    const cx = Math.max(-6.4, Math.min(-0.5, bx)), cz = Math.max(8.3, Math.min(11.6, bz));
    this.placeLady(cx, cz, Math.atan2(p.pos.x - cx, p.pos.z - cz)); this.ladyShow(true, 0.85); this.ladyLight.intensity = 0.5;
    if (so.ctx) { this._hum && this._hum.stop(); this._hum = so.lullaby(new THREE.Vector3(cx, 1.6, cz), 0.28, this.humOpts({ gap: 0.5, ref: 1.0 })); this._hum.clarity(1); }
    this.scare = { t: 0, done: false };
    this.after(1.0, () => this.say([[ME, '...', 1.2]]));
  }
  updateScare(dt) {
    const S = this.scare; if (!S || S.done) return; S.t += dt; const g = this.g, so = g.sound;
    const seen = this.ladySeen(); if (seen || S.t > 6) { S.done = true; const p = g.player;
      if (!seen) { const fx = p.pos.x - Math.sin(p.yaw) * 0.9, fz = p.pos.z - Math.cos(p.yaw) * 0.9; this.placeLady(Math.max(-6.4, Math.min(-0.5, fx)), Math.max(8.3, Math.min(11.6, fz)), p.yaw); } // she's there when you turn, or she's in front of you
      this.n.scared = true; so.ctx && so.scream(); g.shake = 1.2; g.post.uniforms.glitch.value = 1.0; this.ladyLight.intensity = 2.2; this.W.boilerBulb.on = true; this.W.boilerBulb.flicker = 0.6;
      this.after(0.55, () => { this.ladyShow(false); this._hum && this._hum.stop(0.05); this._hum = null; this.W.boilerBulb.flicker = 0.08; g.flashDead = false; g.flashOn = true; this.g.post.uniforms.glitch.value = 0.7; });
      this.after(1.6, () => this.say([[ME, 'Get out. Get out get out get out.', 2.2]]));
      this.after(4.0, () => this.say([[DEE, 'Board says the burner\'s firing. 117 says the shower\'s hot. ...You okay? You sound out of breath.', 5.8], [ME, '...Fine. I\'m fine.', 1.6]], () => {
        this.s.closeWO('WO-4483'); this.n.phase = 'boilerdone'; this.obj('Take a breath. Back to the shop.'); }));
    }
  }
  damperCall() {
    const n = this.n, W = this.W; n.phase = 'damper'; this.pt.forceEmpty = true;
    this.say([[DEE, 'Hon. Low-temp alarm in the DuBose library. Somebody left the fireplace damper open, it\'s letting the cold in.', 6.2],
      [DEE, 'Close it up and come straight back. And... the house line\'s ringing again. Humming. I\'m not picking it up.', 5.8]], () => {
      this.ticket('WO-4484', 'Low temp — DuBose library (damper open)'); this.obj('WO-4484: Close the library fireplace damper — DuBose library');
      if (this.g.sound.ctx) { this._hum && this._hum.stop(); this._hum = this.g.sound.lullaby(this.W.anchors.portrait, 0.18, this.humOpts({})); } });
  }
  damperClosed() {
    const g = this.g, n = this.n; n.damper = true; this.s.closeWO('WO-4484'); this._hum && this._hum.stop(0.05); this._hum = null; g.hud.toast('Damper\'s shut. ...The humming stopped.', 2.5);
    this.after(2.4, () => this.say([[ME, '...Where\'d she go?', 1.8]]));
    this.after(4.0, () => this.huntState(true));
  }
  // checkpoint N2D: she's out of the frame and between you and the corner. Get out of the house. Shut a door on her.
  huntState(live) {
    const g = this.g, W = this.W, n = this.n, s = this.s; n.phase = 'hunt'; n.damper = true; this.pt.forceEmpty = true;
    s.tickets.forEach(t => { if (t.id === 'WO-4484') t.done = true; }); g.hud.tickets(s.tickets);
    for (const d of [W.doors.duboseDoor, W.doors.terraceDoor]) { d.broken = false; d.locked = false; if (!live) d.setOpen(true, false); }
    if (!live) { g.player.vel.set(0, 0, 0); g.setView(DAMPER.x, DAMPER.z, -Math.PI / 2, 0); }
    this.placeLady(LADY_SPAWN[0], LADY_SPAWN[1], 0); this.ladyShow(true, 0.9); this.ladyLight.intensity = 0.9;
    this.L = { delay: live ? 3.2 : 2.6, blockedT: 0, navT: 0, gone: false, seenEver: false };
    if (g.sound.ctx) { this._hum && this._hum.stop(); this._hum = g.sound.lullaby(new THREE.Vector3(LADY_SPAWN[0], 1.6, LADY_SPAWN[1]), 0.3, this.humOpts({ gap: 0.6, ref: 1.6 })); this._hum.clarity(1); g.sound.sting(); }
    g.shake = 0.5; g.post.uniforms.glitch.value = 0.6;
    this.obj('Get out of the house — library → hall → side door → terrace → McLean<br>Shut a door between you and her · HOLD [Q] / [RIGHT MOUSE] at a shut door to peek');
    if (live) this.after(0.8, () => g.hud.toast('She\'s faster when you\'re not looking at her.', 3.5));
    s.saveCP('N2D');
  }
  ladySeen() {
    const L = this.lady; if (!L.visible) return false; const g = this.g, cam = g.camera, s = this.s; if (s.blink.lid > 0.55) return false;
    const wp = this._lv || (this._lv = new THREE.Vector3()); wp.set(L.position.x, L.position.y + 1.5, L.position.z); cam.updateMatrixWorld();
    const ndc = wp.clone().project(cam); const vc = wp.clone().applyMatrix4(cam.matrixWorldInverse); if (vc.z > -0.05 || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return false;
    const dist = wp.distanceTo(cam.position); const ray = this._lr || (this._lr = new THREE.Raycaster()); ray.set(cam.position, wp.clone().sub(cam.position).normalize()); ray.far = dist - 0.1;
    const occ = s.peekDoor ? this.W.occluders.filter(o => o !== s.peekDoor.panel) : this.W.occluders; return !ray.intersectObjects(occ, false).length;
  }
  updateHunt(dt, reg) {
    const L = this.L; if (!L || L.gone) return; const g = this.g, s = this.s, G = this.lady, p = g.player.pos;
    const seen = this.ladySeen(); if (seen) L.seenEver = true; if (L.delay > 0) { L.delay -= dt; }
    const d = Math.hypot(p.x - G.position.x, p.z - G.position.z);
    if (this._hum) { this._hum.setPos(new THREE.Vector3(G.position.x, G.position.y + 1.6, G.position.z)); this._hum.clarity(1 - (d - 1.5) / 14); }
    let blocked = false;
    if (L.delay <= 0 && !s.dying) {
      L.navT -= dt; if (L.navT <= 0) { L.navT = 0.2; s.bfsPass(p.x, p.z, true); }
      const c0 = s.cellOf(G.position.x, G.position.z); if (s.dist[c0] >= 1e9) blocked = true;
      let remain = (seen ? 0.75 : 2.05) * dt, guard = 0;
      while (!blocked && remain > 0 && guard++ < 12) {
        const cx = G.position.x, cz = G.position.z; let tx, tz; const dd = Math.hypot(p.x - cx, p.z - cz); if (dd < 0.7) break;
        if (dd < 3 && s.clearLine(cx, cz, p.x, p.z)) { tx = p.x; tz = p.z; }
        else { const c = s.cellOf(cx, cz); let best = c, bd = s.dist[c]; const nx = s.nx;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const k = c + di + dj * nx; if (k < 0 || k >= s.dist.length) continue; if (di && dj && (s.blocked[c + di] || s.blocked[c + dj * nx])) continue; const dv = s.dist[k] + (di && dj ? 0.4 : 0); if (dv < bd) { bd = dv; best = k; } }
          if (best === c) break; [tx, tz] = s.center(best); }
        const mx = tx - cx, mz = tz - cz, ml = Math.hypot(mx, mz); if (ml < 1e-4) break; const step = Math.min(remain, ml, 0.25);
        const nx2 = cx + mx / ml * step, nz2 = cz + mz / ml * step; if (s.closedDoorAt(s.cellOf(nx2, nz2))) { blocked = true; break; }
        G.position.x = nx2; G.position.z = nz2; remain -= step; }
      G.position.y = this.W.groundY(G.position.x, G.position.z) + Math.sin(performance.now() / 700) * 0.015; G.rotation.y = Math.atan2(p.x - G.position.x, p.z - G.position.z); this.ladyLight.pos.set(G.position.x, G.position.y + 1.7, G.position.z);
      if (d < 0.85 && Math.abs(p.y - G.position.y) < 1.2) { s.statue.position.copy(G.position); s.kill(); }
    }
    if (blocked) { L.blockedT += dt; if (L.blockedT > 0.6 && !L.toldBlocked) { L.toldBlocked = true; g.hud.toast('She stops at the door. The humming doesn\'t.', 3); } } else L.blockedT = Math.max(0, L.blockedT - dt * 0.5);
    if (L.blockedT > 4.5 || (reg === 'mclean' && p.x < 33.7)) this.escaped();
  }
  escaped() {
    const g = this.g, L = this.L; if (!L || L.gone) return; L.gone = true; this.ladyShow(false); this._hum && this._hum.stop(1.5); this._hum = null; this.n.phase = 'escaped'; this.obj(''); g.post.uniforms.glitch.value = 0.4;
    this.after(1.4, () => this.say([[ME, '...She\'s gone. She\'s gone.', 2.0], [DEE, 'You\'re out? Okay. Okay. Stay in McLean. That\'s the night. Go clock out at seven.', 5.2]], () =>
      g.cut('6:57 AM', () => { g.time = Math.max(g.time, T_SEVEN); this.clockoutState(true); })));
  }
  // checkpoint N2H: back in the shop, the night's done. Clock out at the dock.
  clockoutState(live) {
    const g = this.g, W = this.W, n = this.n, s = this.s; n.phase = 'clockout'; this.ladyShow(false); this.L = null; this.pt.forceEmpty = false; this.pt.state = 'normal'; this.pt.end = true;
    s.endPeek(); g.player.vel.set(0, 0, 0); g.player.frozen = false; g.setView(SHOP_WAKE.x, SHOP_WAKE.z, SHOP_WAKE.yaw, SHOP_WAKE.pitch);
    const od = W.doors.officeDoor; od.broken = false; od.locked = false; if (!od.open) od.setOpen(true, false);
    this.obj('Clock out — time clock on the dock wall'); s.saveCP('N2H');
  }
  punchOut() {
    const g = this.g, n = this.n; if (n.out) return; n.out = true; n.phase = 'clint'; g.time = Math.max(g.time, 86400 + 7 * 3600 + 12); this._outTime = this.s.clockStr();
    g.sound.ctx && g.sound.punch(); g.hud.toast('OUT  ' + this._outTime + '   ·   ENGINEERING / 3RD SHIFT', 3); this.obj('');
    this.after(2.0, () => this.clintArrive());
  }
  // ---------------- 7 AM: Clint. Still angry. Not ready for any stories. ----------------
  clintArrive() {
    const g = this.g, W = this.W, s = g.sound; const ld = W.doors.lotDoor; if (s.ctx) { s.locked(new THREE.Vector3(15.95, 1, 10.3)); s.clunk(); }
    this.after(0.5, () => ld.setOpen(true)); W.clint.visible = true; W.clintCig.visible = false; W.placeClint(18.3, 10.3, -Math.PI / 2); W.clintCol.disabled = true;
    this.cl = { t: 0, ph: 0, wait: 0.8, mode: 'enter', pts: [[16.9, 10.3], [15.0, 10.1]], i: 0, said: false };
  }
  clintTarget() { const p = this.g.player.pos, reg = this.W.regionAt(p.x, p.z);
    if (reg === 'office') return [2.9, 1.3]; if (reg === 'corridor') return [9.2, 1.3]; if (reg === 'boiler') return [1.2, 10.9]; if (reg !== 'dock') return [9.0, 6.0];
    const dx = 13 - p.x, dz = 9 - p.z, d = Math.hypot(dx, dz) || 1; return [Math.max(1.2, Math.min(14.8, p.x + dx / d * 1.7)), Math.max(1.2, Math.min(10.8, p.z + dz / d * 1.7))]; }
  clintTalk() {
    const C = this.cl; if (C.mode === 'talk' || C.mode === 'done') return; C.mode = 'talk';
    this.say([[ME, 'Clint. Last night, and tonight, there was—', 2.2], [CLINT, 'Don\'t. I don\'t want to hear it.', 2.6], [CLINT, 'I worked a double yesterday. I got four hours of sleep, and it\'s the day after Christmas.', 5.4],
      [CLINT, 'I am not ready for any stories. Not today.', 3.0], [CLINT, 'Whatever it is, put it in the log.', 2.4], [CLINT, 'Go home. Get some rest.', 2.2], [ME, '...Yeah. Okay.', 1.6]], () => this.unlockLot());
  }
  unlockLot() {
    const W = this.W, n = this.n, ld = W.doors.lotDoor; n.phase = 'leave'; ld.locked = false; ld.lockedMsg = null; W.lotBlock.disabled = true; W.dawn.visible = true; if (!ld.open) ld.setOpen(true); W.dawnSpill.on = true;
    this.obj('Go home — out the employee-lot door'); if (this.cl) { this.cl.mode = 'office'; this.cl.pts = [[8.6, 2.2], [3.3, 1.2]]; this.cl.i = 0; }
  }
  updateClint(dt) {
    const g = this.g, W = this.W, C = this.cl, G = W.clint; if (!C || !G.visible) return; C.t += dt; const p = g.player.pos, R = W.clintArmR, Lf = W.clintArmL, H = W.clintHead; const lerp = (a, b, k) => a + (b - a) * Math.min(1, dt * k);
    if (C.wait > 0) { C.wait -= dt; W.placeClint(G.position.x, G.position.z, G.rotation.y); return; }
    let tgt = null; if (C.mode === 'enter' || C.mode === 'office') tgt = C.pts[Math.min(C.i, C.pts.length - 1)]; else if (C.mode === 'approach') tgt = this.clintTarget();
    let moving = false;
    if (tgt) { const dx = tgt[0] - G.position.x, dz = tgt[1] - G.position.z, d = Math.hypot(dx, dz); const near = C.mode === 'approach' && Math.hypot(p.x - G.position.x, p.z - G.position.z) < 2.0;
      if (d < 0.06 || near) { if (C.mode === 'enter') { C.i++; if (C.i >= C.pts.length) C.mode = 'approach'; } else if (C.mode === 'approach') this.clintTalk(); else if (C.mode === 'office') { C.i++; if (C.i >= C.pts.length) { C.mode = 'done'; G.visible = false; } } }
      else { const m = Math.min(d, 1.25 * dt); G.position.x += dx / d * m; G.position.z += dz / d * m; const a = Math.atan2(dx, dz); G.rotation.y += Math.atan2(Math.sin(a - G.rotation.y), Math.cos(a - G.rotation.y)) * Math.min(1, dt * 6); moving = true; } }
    if (C.mode === 'approach' && C.t > 16) this.clintTalk();
    const ld = W.doors.lotDoor; if (C.mode !== 'enter' && ld.open && !C.shut && G.position.x < 14.6 && this.n.phase === 'clint') { C.shut = true; ld.setOpen(false); }
    if (!moving && C.mode === 'talk') { const by = Math.atan2(p.x - G.position.x, p.z - G.position.z); G.rotation.y += Math.atan2(Math.sin(by - G.rotation.y), Math.cos(by - G.rotation.y)) * Math.min(1, dt * 2.5); }
    if (moving) { C.ph += dt * 5.2; const sw = Math.sin(C.ph) * 0.42; W.clintLegs[0].rotation.x = sw; W.clintLegs[1].rotation.x = -sw; G.position.y = Math.abs(Math.cos(C.ph)) * 0.025; R.S.rotation.x = lerp(R.S.rotation.x, sw * 0.5, 8); Lf.S.rotation.x = lerp(Lf.S.rotation.x, -sw * 0.5, 8); R.E.rotation.x = lerp(R.E.rotation.x, -0.25, 6); Lf.E.rotation.x = lerp(Lf.E.rotation.x, -0.25, 6); }
    else { W.clintLegs[0].rotation.x = lerp(W.clintLegs[0].rotation.x, 0, 6); W.clintLegs[1].rotation.x = lerp(W.clintLegs[1].rotation.x, 0, 6); G.position.y = 0;
      const talking = this.s.subT > 0 && this.s.curWho === CLINT; R.S.rotation.x = lerp(R.S.rotation.x, talking ? -0.35 + Math.sin(C.t * 3) * 0.15 : 0.0, 5); R.E.rotation.x = lerp(R.E.rotation.x, talking ? -0.9 : -0.15, 5); R.S.rotation.z = lerp(R.S.rotation.z, talking ? 0.2 : 0.05, 5);
      Lf.S.rotation.x = lerp(Lf.S.rotation.x, 0.05, 4); Lf.E.rotation.x = lerp(Lf.E.rotation.x, -0.15, 4); }
    const yaw = Math.atan2(p.x - G.position.x, p.z - G.position.z) - G.rotation.y; const ty = Math.max(-0.7, Math.min(0.7, Math.atan2(Math.sin(yaw), Math.cos(yaw))));
    H.rotation.order = 'YXZ'; H.rotation.y = lerp(H.rotation.y, C.mode === 'talk' || C.mode === 'approach' ? ty : 0, 3); H.rotation.x = lerp(H.rotation.x, C.mode === 'talk' ? 0.02 : 0.1, 3);
    W.placeClint(G.position.x, G.position.z, G.rotation.y); W.clintCol.disabled = moving || C.mode === 'enter' || C.mode === 'done';
  }
  updateLot(dt, reg) {
    const g = this.g, W = this.W, n = this.n, p = g.player.pos, s = g.sound;
    if (W.dawn.visible) { g.outdoor = Math.max(0, Math.min(1, (p.x - 15.7) / 2.8)); W.dawnSpill.level = 1; }
    if (n.phase === 'leave' && reg === 'lot') { n.phase = 'sunrise'; this._sunT = 0; this._leaveTime = this.s.clockStr(); this.obj(''); if (s.ctx) this._morning = s.morning(0.5); this.after(1.2, () => this.say([[ME, '...', 1.4]])); }
    if (n.phase === 'sunrise') { this._sunT += dt; W.sun.position.y = Math.min(20, 4 + this._sunT * 0.4); const L = W.lotLights; for (let i = 0; i < L.length; i++) if (L[i].on && this._sunT > 1 + i * 1.2) L[i].on = false;
      if (this._sunT > 4.5) g.post.uniforms.bright.value = 1 + Math.min(1, (this._sunT - 4.5) / 3) * 0.9; if (this._sunT > 7.6 && !this.s.f.ended) this.end(); }
  }

  // ---------------- the portrait ----------------
  humOpts(o) { // her hum: an original, slow, wavering minor tune in an older, lower voice (not the sewing-room lullaby, not any existing song)
    return { base: 220, beat: 0.78, vib: 4.2, tune: [[0, 2], [-2, 1], [-4, 1], [-5, 2], [-4, 1], [0, 3], [3, 2], [2, 1], [0, 1], [-2, 1], [-4, 1], [-5, 3], [-7, 1], [-5, 1], [-4, 1], [-5, 3]], ...o }; }
  portraitVisible() {
    const P = this.W.portrait, cam = this.g.camera, a = this.W.anchors.portrait; const d = cam.position.distanceTo(a); if (d > 14) return false;
    const ndc = a.clone().project(cam); const vc = a.clone().applyMatrix4(cam.matrixWorldInverse); if (vc.z > -0.05 || Math.abs(ndc.x) > 0.95 || Math.abs(ndc.y) > 0.95) return false;
    if (cam.position.x < a.x + 0.1) return false; // behind the wall
    const ray = this._pr || (this._pr = new THREE.Raycaster()); ray.set(cam.position, a.clone().sub(cam.position).normalize()); ray.far = d - 0.15; return !ray.intersectObjects(this.W.occluders, false).length;
  }
  updatePortrait(dt) {
    const P = this.W.portrait, pt = this.pt, n = this.n, cam = this.g.camera, a = this.W.anchors.portrait; pt.t += dt; const vis = this.portraitVisible();
    // what she should be when you next look: normal at first, closer after the TV, empty from 4 AM until you're out, back on the wall at 7
    let want = 'normal'; if (pt.forceEmpty) want = 'empty'; else if (!pt.end && pt.seenNormal && ['tvdone', 'tvback', 'between2', 'shower', 'boiler', 'scare', 'boilerdone'].includes(n.phase)) want = 'close';
    if (!vis) { pt.away += dt; if (pt.away > 0.8 && pt.state !== want) { pt.state = want; pt.changed = true; } }
    else { if (pt.state === 'normal') pt.seenNormal = true; if (!n.portraitSeen) { n.portraitSeen = true; this.say([[ME, '...Lady DuBose.', 1.8], [ME, 'Used to stand right here on break and just stare at her.', 3.0]]); }
      if (pt.changed && pt.away > 0.8) { pt.changed = false; if (!pt.toldChange) { pt.toldChange = true; this.after(0.6, () => this.say([[ME, pt.state === 'empty' ? '...She\'s not in it.' : '...Was she that close before?', 2.2]])); } this.g.sound.ctx && this.g.sound.creak(0.04, this.g.sound.panner(a)); }
      pt.away = 0; }
    pt.vis = vis;
    // eyes follow: toward the camera, a little down
    const ex = Math.max(-1, Math.min(1, (a.z - cam.position.z) / 2.2)), ey = Math.max(-0.4, Math.min(0.8, (a.y - cam.position.y) * 0.9));
    P.set(pt.state, ex, ey, pt.state === 'close' && n.phase === 'scare');
  }

  // ---------------- per-frame (called from Story.update when night two) ----------------
  update(dt, reg) {
    const g = this.g, n = this.n, W = this.W;
    this.updatePortrait(dt); this.updateScare(dt); this.updateHunt(dt, reg); this.updateClint(dt); if (n.out) this.updateLot(dt, reg);
    if (this._tvGlow) { this._tvT = (this._tvT || 0) + dt; if ((this._tvF = (this._tvF || 0) + dt) > 0.08) { this._tvF = 0; const gl = this.drawTV(this._tvT); W.tvLight.intensity = 1.2 + gl * 0.5; } }
    if (this._sightK !== undefined && this._sightK < this._sightTarget) { this._sightK = Math.min(this._sightTarget, this._sightK + dt * 0.25); W.sightWater.scale.y = this._sightK * 2; W.sightWater.position.y = 1.0 + 0.5 * this._sightK; }
    if (this._valveT > 0) { this._valveT -= dt; W.valveWheel.rotation.x += dt * 2.6; }
    if (n.boiler >= 3) { this._flT = (this._flT || 0) + dt; const fl = 0.8 + Math.sin(this._flT * 11) * 0.1 + Math.random() * 0.2; if (W.burnerLight.on) W.burnerLight.intensity = 2.0 * fl + 0.4; this.flameHalo.material.opacity = 0.65 + fl * 0.35; if ((this._flF = (this._flF || 0) + dt) > 0.06) { this._flF = 0; this.drawFlame(this._flT, true); } }
    // beats keyed to where you are
    if (n.phase === 'tvback' && reg === 'mclean' && g.player.pos.x < 33.7) { n.phase = 'between2'; this.say([[ME, '...Back in McLean.', 1.6]], () => g.cut('2:47 AM', () => { g.time = Math.max(g.time, T_SHOWER); this.wakeShop(); this.showerCall(); })); }
    if (n.phase === 'boilerdone' && ['office', 'corridor'].includes(reg)) { n.phase = 'between3'; this.say([[ME, '...Sit down. Just for a minute.', 2.0]], () => g.cut('4:16 AM', () => { g.time = Math.max(g.time, T_DAMPER); this.wakeShop(); this.damperCall(); })); }
    if (this._hum && n.phase === 'damper') this._hum.clarity(1 - (g.player.pos.distanceTo(W.anchors.portrait) - 2) / 20);
    if (n.phase === 'damper' && reg === 'library' && !this._libSaid) { this._libSaid = true; this.say([[ME, 'The painting. ...It\'s empty.', 2.2]]); }
  }
  wakeShop() { const g = this.g, W = this.W; this.s.endPeek(); g.player.vel.set(0, 0, 0); g.setView(SHOP_WAKE.x, SHOP_WAKE.z, SHOP_WAKE.yaw, SHOP_WAKE.pitch); const od = W.doors.officeDoor; od.broken = false; od.locked = false; if (!od.open) od.setOpen(true, false); }

  retry(id) {
    const g = this.g; this.scare = null;
    if (id === 'N2D') { this.huntState(false); }
    else if (id === 'N2H') { this.clockoutState(false); }
    else { try { sessionStorage.setItem('rizzo-auto', '2'); } catch (e) {} location.reload(); }
  }
  end() {
    const g = this.g, s = this.s; s.f.ended = true; this._morning && this._morning.set(0.25); this._hum && this._hum.stop(0.3);
    try { localStorage.setItem('rizzo-n2-done', '1'); } catch (e) {}
    g.showEnd(`Four work orders closed between eleven and seven: the toilet in 117, the TV in the DuBose Suite, the hot water, the library damper. All green on Dee's board.<br><br>
      At 4:20 the painting over the library fireplace was empty. At seven, when the day housekeeper dusted the frame, Lady DuBose was back in it, looking at the door.<br><br>
      You clocked out at ${this._outTime || '7:00 AM'}. Clint didn't want to hear a word of it. Go home, he said. Get some rest.<br><br>
      Somewhere behind you, very faintly, somebody was humming.<br><br><b>END OF SHIFT · NIGHT TWO</b>`, 2);
  }
}
