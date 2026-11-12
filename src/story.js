// Third Shift — Christmas Eve shift: clock in, two work orders in McLean, then DuBose and the statue;
// back to McLean, then the DuBose sewing room (Lady DuBose's haunt), one more McLean ticket while 173 hunts, and clock out at the dock.
import * as THREE from 'three';
import { makeStatue } from './statue.js';

const DEE = 'DEE (NIGHT AUDIT)';
const ME = 'YOU';
const CELL = 0.25;
const DY_BAR = 0.34; // DuBose floor height (matches world.js DY)
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// places 173 backs off to after pounding on a door it can't break (chosen out of view, farther from you than it was)
const LURKS = [[52.6, -48.6], [63.5, -31.5], [56, -37], [55, -27.5], [71, -27], [72, -46], [44, -31], [40, -34], [30.5, -31.5], [-3, -31.5], [16, -27.2], [9.2, -22], [9.2, -6]];

export class Story {
  constructor(g) {
    this.g = g; const W = this.W = g.W;
    this.f = { clocked: false, radio: false, wo1: 0, wo2: 0, ballast: false, key: false, phase: 'clockin', teased: false, suiteT: 0, power: true, breaker: false, ended: false, thermo: false, rad: false, cried: false, ptac: 0 };
    this.tickets = []; this.queue = []; this.subT = 0; this.cp = null; this.timers = []; this.cold = 0; this.puffs = []; this.puffT = 0; this.rock = { amp: 0, t: 0 }; this.peekDoor = null;
    // statue
    this.statue = makeStatue(g.T); this.statue.visible = false; this.statue.position.set(0, -50, 0); g.scene.add(this.statue);
    this.S = { active: false, hunting: false, seen: false, moved: false, bashT: 0, bashTick: 0, seenEver: false };
    this.buildNav();
    this.addInteractions();
    this.blink = { meter: 1, lid: 0, forced: 0 };
    this._v = new THREE.Vector3(); this._ray = new THREE.Raycaster();
  }

  // ---------------- interactions ----------------
  addInteractions() {
    const W = this.W, f = this.f, g = this.g;
    const add = o => W.interact.push(o);
    add({ mesh: W.timeclockMesh, range: 2.2, hold: 0.7, enabled: () => !f.clocked, prompt: () => 'Clock in — swipe badge',
      use: () => { f.clocked = true; g.sound.punch(); g.hud.toast('IN  ' + this.clockStr() + '   ·   ENGINEERING / 3RD SHIFT', 3.5);
        this.say([[ME, 'Clocked in. Radio\'s on the charger in the shop.', 2.6]]); f.phase = 'radio'; this.obj('Grab your radio — maintenance office, just inside the dock'); } });
    add({ mesh: W.radioPick, range: 2.2, enabled: () => !f.radio, prompt: () => f.clocked ? 'Take radio + flashlight' : 'Radio (clock in first)',
      use: () => { if (!f.clocked) { g.hud.toast('Clock in first. Payroll will not forgive you.'); return; }
        f.radio = true; W.radioMesh.visible = false; W.radioLed.visible = false; g.sound.pickup(); g.flashOn = true; g.hud.toast('Radio + flashlight.   [F] flashlight', 3);
        this.say([[DEE, 'Hey, you on? It\'s Dee up front. Quiet night, but I\'ve got two for you already.', 4.2],
          [DEE, 'Ice machine in the first-floor guest pantry in McLean is leaking all over the floor. Again.', 4.4],
          [DEE, 'And a guest says the light\'s out on the Stair B landing. Pitch black. Ballasts are on the shelf in the shop.', 5],
          [ME, 'Copy. On it.', 1.6]], () => {
          this.tickets = [{ id: 'WO-4471', text: 'Ice machine leak — McLean 1st fl pantry' }, { id: 'WO-4472', text: 'Light out — Stair B landing' }];
          g.hud.tickets(this.tickets); g.sound.ding(); this.obj('Close both work orders<br>· Ice machine — McLean guest pantry (corridor → EMPLOYEES ONLY door)<br>· Stair B light — off the service corridor'); f.phase = 'wo'; }); } });
    // WO-4471 ice machine: pull panel, clear drain, mop
    add({ mesh: W.iceMesh, range: 2.4, enabled: () => f.radio && f.wo1 < 2, hold: () => [1.0, 2.6][f.wo1],
      prompt: () => !this.tickets.length ? 'Ice machine (leaking)' : ['Pull the front panel', 'Clear the clogged drain line'][f.wo1],
      onHoldStart: () => { if (f.wo1 === 1) g.sound.gurgle(2.6); else g.sound.burst({ f: 1500, q: 3, peak: 0.25, hold: 0.3, rel: 0.2 }); },
      use: () => { if (f.wo1 === 0) { W.iceFront.position.x += 0.5; W.iceFront.rotation.y = 0.5; g.sound.clunk(); g.hud.toast('Panel off. Drain line\'s packed with slime.'); }
        else { this.dripLoop && (this.dripLoop.on = false); g.sound.swish(); g.hud.toast('Drain\'s clear. Now the floor.'); W.iceFront.position.x -= 0.5; W.iceFront.rotation.y = 0; }
        f.wo1++; } });
    add({ mesh: W.puddleMesh, range: 2.6, enabled: () => f.radio && f.wo1 === 2, hold: 2.0, prompt: () => 'Mop up the water',
      onHoldStart: () => { g.sound.swish(); setTimeout(() => g.sound.swish(), 600); setTimeout(() => g.sound.swish(), 1200); },
      use: () => { f.wo1 = 3; W.puddle.visible = false; this.closeTicket(0); } });
    add({ mesh: W.puddle, range: 2.6, enabled: () => false, prompt: () => '' });
    // WO-4472 ballast
    add({ mesh: W.ballastMesh, range: 2.2, enabled: () => f.radio && !f.ballast && f.wo2 < 2, prompt: () => 'Take a replacement ballast',
      use: () => { f.ballast = true; g.sound.pickup(); g.hud.toast('Got a ballast. Stair B is off the service corridor.'); } });
    add({ mesh: W.stairFixtureMesh, range: 2.4, enabled: () => f.radio && f.wo2 < 2, hold: () => f.ballast ? [0.8, 3.0][f.wo2] : 0,
      prompt: () => !f.ballast ? 'Dead fixture — need a ballast (shop shelf)' : ['Drop the lens', 'Swap the ballast'][f.wo2],
      onHoldStart: () => { if (f.wo2 === 1) { g.sound.buzz(0.4); setTimeout(() => g.sound.burst({ f: 2800, q: 4, peak: 0.2, rel: 0.05 }), 1200); setTimeout(() => g.sound.burst({ f: 2200, q: 4, peak: 0.2, rel: 0.05 }), 2100); } },
      use: () => { if (!f.ballast) { g.hud.toast('Need a replacement ballast from the shelf in the shop.'); return; }
        if (f.wo2 === 0) { W.stairCover.visible = false; g.sound.clunk(); f.wo2 = 1; return; }
        f.wo2 = 2; W.stairCover.visible = true; const v = W.stairLight; v.on = true; v.flicker = 0.5; g.sound.buzz(1.2); setTimeout(() => { v.flicker = 0; }, 1600);
        setTimeout(() => { g.sound.statueScrapeAt && g.sound.statueScrapeAt(); this.distantScrape(new THREE.Vector3(12.2, 7, -14)); }, 2600);
        this.closeTicket(1); } });
    add({ mesh: W.keyMesh, range: 2.2, enabled: () => f.phase === 'getkey', prompt: () => 'Take the DuBose house key',
      use: () => { f.key = true; g.inv.add('DuBose key'); g.sound.pickup(); f.phase = 'godubose'; this.obj('Check the DuBose Suite<br>McLean hall → terrace door → DuBose side door → past the front stair');
        this.say([[DEE, 'Through McLean, out the terrace door, side door of the house. Suite\'s off the front stair hall.', 4.5]]); } });
    add({ mesh: W.keyMesh, range: 2.2, enabled: () => f.phase !== 'getkey', prompt: () => 'Key cabinet', use: () => g.hud.toast(f.key ? 'You already have the DuBose key.' : 'Nothing you need right now.') });
    add({ mesh: W.panelMesh, range: 2.2, enabled: () => !f.power && !f.breaker, hold: 1.6, prompt: () => 'Reset the main breaker',
      onHoldStart: () => g.sound.burst({ f: 1200, q: 3, peak: 0.25, hold: 0.2, rel: 0.1 }), use: () => this.breakerReset() });
    add({ mesh: W.panelMesh, range: 2.2, enabled: () => f.power || f.breaker, prompt: () => 'Panel DH-1', use: () => g.hud.toast(f.breaker ? 'Main is on. Get out.' : 'Everything\'s on. For now.') });
    // ---- Christmas-shift interactions ----
    add({ mesh: W.timeclockMesh, range: 2.2, hold: 0.9, enabled: () => f.phase === 'clockout', prompt: () => 'Clock out — swipe badge', use: () => this.clockOut() });
    add({ mesh: W.thermoMesh, range: 2.0, enabled: () => ['sewing', 'voices'].includes(f.phase), prompt: () => 'Thermostat',
      use: () => { f.thermo = true; g.sound.clunk(); g.hud.toast('Set to 72°. Reading 38°F. You can see your breath.', 3.5); } });
    add({ mesh: W.radMesh, range: 2.2, enabled: () => f.phase === 'sewing' && !f.rad, hold: 2.0, prompt: () => 'Open the radiator valve',
      onHoldStart: () => g.sound.hiss(2.0, W.anchors.radiator),
      use: () => { f.rad = true; g.sound.clunk(); g.hud.toast('Valve\'s wide open. Pipe\'s ice cold. Nothing\'s coming up from the boiler.', 4); this.closeWO('WO-4473');
        if (!f.cried) this.after(2.2, () => this.cry()); } });
    add({ mesh: W.radMesh, range: 2.2, enabled: () => f.rad, prompt: () => 'Radiator', use: () => g.hud.toast('Stone cold.') });
    add({ mesh: W.glassMesh, range: 2.0, enabled: () => ['bar', 'slam'].includes(f.phase), prompt: () => 'A glass', use: () => g.hud.toast('Still cold. Still wet. Nobody here.') });
    add({ mesh: W.ptacMesh, range: 2.4, enabled: () => f.phase === 'wo117' && f.ptac < 3, hold: () => [1.0, 2.4, 1.4][f.ptac],
      prompt: () => ['PTAC — pull the front cover', 'Pull the filter and knock it clean (caked solid)', 'Reset — hold HEAT until it kicks on'][f.ptac],
      onHoldStart: () => { if (f.ptac === 1) { g.sound.swish(); setTimeout(() => g.sound.ctx && g.sound.swish(), 700); setTimeout(() => g.sound.ctx && g.sound.swish(), 1500); } else g.sound.burst({ f: 1500, q: 3, peak: 0.2, hold: 0.2, rel: 0.2 }); },
      use: () => { if (f.ptac === 0) { W.ptacFront.position.z += 0.35; W.ptacFront.rotation.x = -0.6; g.sound.clunk(); g.hud.toast('Cover off. Filter\'s a gray felt brick.'); }
        else if (f.ptac === 1) { W.ptacFilter.visible = false; g.sound.clunk(); g.hud.toast('Filter\'s clean enough. Now reset it.'); W.ptacFront.position.z -= 0.35; W.ptacFront.rotation.x = 0; }
        else { g.sound.buzz(0.3); this.warm = g.sound.warmAir(W.anchors.ptac); g.hud.toast('Compressor kicks on. Warm air.'); this.wo117Done(); }
        f.ptac++; } });
    add({ mesh: W.ptacMesh, range: 2.4, enabled: () => f.ptac >= 3, prompt: () => 'PTAC (heating)', use: () => g.hud.toast('Blowing warm. 117 has heat.') });
    // McLean terrace door doubles as the exit at the end
    W.doors.duboseDoor.onOpen = () => { if (f.phase === 'godubose' && !this._dbOpen) { this._dbOpen = true; this.say([[ME, 'Smells like old wood and cold fireplaces.', 2.4]]); } };
  }

  // ---------------- helpers ----------------
  clockStr() { const s = Math.floor(this.g.time); let h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; }
  obj(html) { this.g.hud.objective(html); }
  say(lines, then) { this.queue.push(...lines.map(l => ({ who: l[0], text: l[1], dur: l[2] }))); if (then) this.queue.push({ fn: then }); }
  closeTicket(i) {
    const g = this.g; this.tickets[i].done = true; g.hud.tickets(this.tickets); g.sound.ding(); g.hud.toast(this.tickets[i].id + '  CLOSED  · ' + this.clockStr(), 3);
    if (i === 0) this.say([[DEE, 'Saw it close on my end. Thanks, hon.', 2.4]]);
    if (i === 1) this.say([[DEE, 'Stair B\'s showing fixed. Was that you banging around up top?', 3.2], [ME, '...No. I\'m on the landing.', 2.2], [DEE, 'Huh. Old building.', 1.8]]);
    if (this.tickets.every(t => t.done)) {
      this.say([[DEE, 'Okay, you\'re gonna love this. The DuBose Suite just rang the front desk.', 3.8], [DEE, 'Nobody\'s booked in DuBose tonight. House is locked up. Nobody answered when I called back.', 4.6],
        [DEE, 'Probably the phone line again. Grab the DuBose key out of the cabinet in the shop and go take a look?', 4.6]], () => {
        g.cut('', () => { g.time += 47 * 60; }); this.f.phase = 'getkey'; this.obj('Get the DuBose key — key cabinet, maintenance office'); });
    } else g.cut('', () => { g.time += 31 * 60; });
  }
  distantScrape(pos) { const s = this.g.sound; if (!s.ctx) return; const p = s.panner(pos, 3, 1); for (let i = 0; i < 4; i++) s.burst({ f: 500, q: 0.9, peak: 0.5, a: 0.05, hold: 0.25, rel: 0.2, dest: p, buf: s.brown, t0: s.t + i * 0.55 }); }
  setGroup(group, on, level = 1, flicker = 0) { for (const v of this.W.vlights) if (v.group === group) { v.on = on; v.level = level; v.flicker = flicker; } }

  // ---------------- lifecycle ----------------
  start() {
    const g = this.g, s = g.sound, W = this.W;
    g.setView(4, 6.5, 1.25, 0); g.hud.tickets([]);
    this.obj('Clock in — time clock on the dock wall');
    s.hum(new THREE.Vector3(5, 4.6, 6), 0.05); s.hum(new THREE.Vector3(11.5, 4.6, 4), 0.05); s.hum(new THREE.Vector3(3, 2.6, -2.5), 0.035);
    s.hum(new THREE.Vector3(9.2, 2.9, -6), 0.03); s.hum(new THREE.Vector3(9.2, 2.9, -18), 0.04); s.hum(new THREE.Vector3(9.2, 2.9, -26), 0.03); s.hum(new THREE.Vector3(16, 2.7, -27.5), 0.03);
    s.drone(W.anchors.ice, 0.09); this.dripLoop = s.drip(W.anchors.ice);
    this.clockLoop = s.clock(W.anchors.clock); this.tv = s.staticLoop(W.anchors.tv, 0.07); this.tvOn = true;
    this.scrape = s.statueLoop(); this.rattleT = 6;
    this.setGroup('dubose', true, 0.7, 0.02);
    setTimeout(() => this.say([[ME, '10:58. Badge first, then the shop.', 2.4]]), 900);
  }
  restart() { location.reload(); }

  // ---------------- DuBose beats ----------------
  tease() { const st = this.statue; st.visible = true; st.position.copy(this.W.anchors.balcony); st.rotation.y = 0.4; this.f.teased = true; }
  powerOut() {
    const g = this.g, f = this.f; f.power = false; f.phase = 'breaker';
    this.setGroup('dubose', false); this.tvOn = false; this.tv.set(0); this.W.tvMat.color.setRGB(0.01, 0.01, 0.01); this.W.tvLight.intensity = 0; this.W.tvLight.on = false;
    g.sound.powerDown(); g.flashOn = true; g.post.uniforms.glitch.value = 0.8;
    const st = this.statue; st.visible = true; st.position.set(this.W.anchors.enfiladeEnd.x, 0, -31.5); st.rotation.y = -Math.PI / 2;
    this.S.active = true; this.S.hunting = false; this.S.huntDelay = 9;
    this.say([[DEE, '—you there? Board just showed DuBose drop. Whole house.', 3], [DEE, 'Breaker\'s in the butler\'s pantry, back of the dining room. You\'ve got the flashlight?', 4.2], [ME, '...There\'s something in the hall.', 2.4]]);
    this.obj('Reset the DuBose breaker — butler\'s pantry, through the dining room');
    setTimeout(() => g.hud.toast('It only moves when you can\'t see it.   Keep it in view.   [SPACE] blink when YOU choose.', 6), 1500);
    this.saveCP('A');
  }
  breakerReset() {
    const g = this.g, f = this.f; f.breaker = true; f.power = true; f.phase = 'escape'; g.sound.powerUp(); this.setGroup('dubose', true, 1, 0.06);
    this.tvOn = true; this.W.tvLight.on = true; this.tv.set(0.07);
    this.say([[DEE, 'Board\'s green. Whatever that was — just come back over. Now.', 3.4]]);
    this.obj('Get out — back through the side door, across the terrace, into McLean');
    this.saveCP('B');
  }
  saveCP(id) { const p = this.g.player; this.cp = { id, x: p.pos.x, z: p.pos.z, yaw: p.yaw, sx: this.statue.position.x, sz: this.statue.position.z }; }
  retry() {
    const g = this.g, f = this.f, W = this.W, S = this.S; g.player.frozen = false; g.post.uniforms.dead.value = 0; this.dying = 0; g.shake = 0;
    this.timers = []; this.endPeek(); this.queue = []; g.hud.sub('', ''); this.subT = 0;
    this.blink.meter = 1; this.blink.lid = 0; this.blink.forced = 0; g.flashOn = true; S.bashT = 0; S._graceSet = false; S.seenEver = false;
    if (this.cp.id === 'E') { this.slamState(false); }
    else if (this.cp.id === 'F') { this.mcleanHuntState(true); g.setView(31.0, -31.5, Math.PI / 2, 0); this.obj(this.wo117Obj()); }
    else {
      for (const d of [W.doors.butlerDoor, W.doors.suiteDoor, W.doors.duboseDoor]) { d.broken = false; d.locked = false; d.setOpen(true, false); }
      if (this.cp.id === 'A') { f.power = false; f.breaker = false; f.phase = 'breaker'; this.setGroup('dubose', false); g.setView(71.7, -45.5, Math.PI, 0); this.statue.position.set(W.anchors.enfiladeEnd.x, 0, -31.5);
        this.obj('Reset the DuBose breaker — butler\'s pantry, through the dining room'); S.hunting = false; S.huntDelay = 9; }
      else { g.setView(65.2, -26.2, -Math.PI / 2 + Math.PI, 0); W.doors.butlerDoor.setOpen(false, false); this.statue.position.set(55, 0.34, -25.8); S.hunting = true;
        this.obj('Get out — back through the side door, across the terrace, into McLean'); }
      g.player.yaw = this.cp.id === 'A' ? Math.PI : Math.PI / 2;
    }
    g.cut('', null);
  }
  kill() {
    const g = this.g; if (this.dying) return; this.dying = 1; g.player.frozen = true; g.sound.snap(); g.shake = 1;
    // camera wrench
    const p = g.player; const st = this.statue.position; p.yaw = Math.atan2(-(st.x - p.pos.x), -(st.z - p.pos.z)); this.snapT = 0;

  }
  end() {
    const g = this.g; this.f.ended = true; this.S.active = false; this.endPeek(); g.sound.clunk(true); g.post.uniforms.glitch.value = 1; g.sound.setMuffle(20000);
    this.warm && this.warm.set(0); this.farSong && this.farSong.stop(0.3);
    g.showEnd(`You clocked out at ${this._outTime || this.clockStr()} on Christmas morning and walked out under the dock light. You didn't look back.<br><br>
      The day crew found the roll-up door rattling on its track and nobody on the dock.<br>
      Room 117 has heat. The DuBose sewing room read 71°F by eight, and nobody could say why it had been cold.<br><br>
      Some rooms in the old house stay cold at Christmas, whatever the thermostat says.<br><br><b>END OF SHIFT</b>`);
  }

  // ================= Christmas-shift continuation =================
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  closeWO(id) { const g = this.g; const t = this.tickets.find(t => t.id === id); if (!t || t.done) return; t.done = true; g.hud.tickets(this.tickets); g.sound.ding(); g.hud.toast(id + '  CLOSED  · ' + this.clockStr(), 3); }
  placeName(reg) { return ({ mclean: 'McLean Hall', room117: 'McLean · Rm 117', bath117: 'McLean · Rm 117', pantry: 'McLean Hall', terrace: 'Terrace', corridor: 'Service Corridor', dock: 'Loading Dock' })[reg] || 'DuBose Home'; }
  wo117Obj() { return 'WO-4474: No heat — Room 117 (McLean hall, north side)<br>It\'s still out there. Shut doors behind you · HOLD [Q] / [RIGHT MOUSE] at a door to peek'; }

  // back inside McLean after the breaker: catch your breath, then Dee calls about the sewing room
  afterFirstEscape() {
    const g = this.g, f = this.f, S = this.S; f.phase = 'haunt_call'; S.active = false; this.statue.visible = false; this.scrape && this.scrape.set(0); this.endPeek(); this._teaseSeen = true;
    g.sound.clunk(true); g.post.uniforms.glitch.value = 0.6; this.obj('');
    this.say([[ME, '...I\'m in. I\'m back in McLean.', 2.2], [DEE, 'Okay. Okay. Sit down a minute, hon.', 2.4]], () => {
      g.cut('2:41 AM', () => { g.time = Math.max(g.time, 86400 + 2 * 3600 + 41 * 60); this.hauntCall(); }); });
  }
  hauntCall() {
    const g = this.g, f = this.f, W = this.W;
    this.tickets = [{ id: 'WO-4473', text: 'Low-temp alarm — DuBose sewing rm (unbooked)' }]; g.hud.tickets(this.tickets); g.sound.ding();
    this.say([[DEE, 'You still with me? It\'s after two. ...Merry Christmas, I guess.', 3.6],
      [DEE, 'Board\'s throwing a low-temp alarm in DuBose. The sewing room, off the back hall. Fifty-one and dropping.', 5],
      [DEE, 'And the house line rang the desk again. Nobody on it. Just... somebody humming.', 4.4],
      [ME, 'I\'m not going back over there.', 2],
      [DEE, 'If those pipes freeze on Christmas it\'s both our jobs. Open the radiator up and come straight back. I buzzed the back hall open.', 5.6]], () => {
      f.phase = 'haunt_go'; W.doors.backDoor.locked = false; W.doors.duboseDoor.locked = false;
      this.setGroup('haunt', true, 0.75, 0.03);
      if (g.sound.ctx) { this.song && this.song.stop(); this.song = g.sound.lullaby(W.anchors.sewing, 0.16); }
      this.obj('Check the DuBose sewing room<br>terrace → side door → stair hall → back hall door (under the balcony)'); });
  }
  enterSewing() {
    const g = this.g, f = this.f; f.phase = 'sewing'; this.song && this.song.stop(0.06); this.song = null; this.rock.amp = 0.17; this.rock.t = 0;
    if (g.sound.ctx) g.sound.creak(0.09);
    this.say([[ME, '...Jesus. It\'s freezing in here.', 2.4]]);
    this.obj('Open the radiator valve — east wall, under the window');
    this.after(12, () => { if (!f.cried) this.cry(); });
  }
  cry() { // brief, distant, once. Then quiet.
    const g = this.g, f = this.f; if (f.cried || f.phase !== 'sewing') return; f.cried = true; if (g.sound.ctx) g.sound.babyCry(this.W.anchors.alcove);
    this.after(5.5, () => this.startVoices());
  }
  startVoices() {
    const g = this.g, f = this.f; if (f.phase !== 'sewing') return; f.phase = 'voices'; if (g.sound.ctx) this.voices = g.sound.murmur(this.W.anchors.bar, 0.14);
    this.after(1.8, () => this.say([[ME, '...Somebody\'s in the bar.', 2]]));
    this.obj('Somebody\'s in the bar next door — through the sewing room\'s west door');
  }
  enterBar() {
    const f = this.f; f.phase = 'bar'; this.barT = 0; this.voices && this.voices.stop(); this.voices = null;
    this.say([[ME, 'Hello? ...Bar\'s closed, folks.', 2.2]]); this.obj('Nobody. A glass on the bar. A stool pulled out.');
  }
  doSlam() {
    const g = this.g, D = this.W.doors, s = g.sound; this._slammed = true; this.queue = []; g.hud.sub('', ''); this.subT = 0;
    const at = d => new THREE.Vector3(d.x, 1.4, d.z); const snd = (fn) => { if (s.ctx) fn(); };
    D.connDoor.setOpen(false, false); snd(() => s.slam(at(D.connDoor))); g.shake = 0.9; g.post.uniforms.glitch.value = 0.5;
    this.after(0.55, () => { D.sewDoor.setOpen(false, false); snd(() => s.slam(at(D.sewDoor))); g.shake = Math.max(g.shake, 0.5); });
    this.after(1.05, () => { D.barDoor.setOpen(true, false); snd(() => s.slam(at(D.barDoor))); g.shake = Math.max(g.shake, 0.7); this.setGroup('haunt', false); this.blink.forced = 0.4; snd(() => s.blink()); });
    this.after(1.2, () => { this.slamState(true); this.distantScrape(this.statue.position.clone().setY(1)); });
    this.after(2.0, () => { this.setGroup('haunt', true, 0.5, 0.12); this.say([[ME, '...Doors don\'t do that.', 2]]); });
    this.after(4.4, () => g.hud.toast('It only moves when you can\'t see it. Keep it in view and back out past it.', 4.5));
  }
  // the herd: called live (after the slams) and on retry from checkpoint E
  slamState(live) {
    const g = this.g, W = this.W, D = W.doors, S = this.S, st = this.statue, f = this.f, p = g.player.pos;
    f.phase = 'slam'; this._slammed = true;
    for (const d of [D.connDoor, D.sewDoor]) { d.broken = false; d.setOpen(false, false); d.locked = true; d.lockedMsg = 'It won\'t budge. Like something\'s leaning on it from the other side.'; }
    for (const d of [D.barDoor, D.backDoor, D.duboseDoor, D.terraceDoor]) { d.broken = false; d.locked = false; if (!d.open) d.setOpen(true, false); }
    this.voices && this.voices.stop(); this.voices = null; this.song && this.song.stop(); this.song = null;
    let spot = W.anchors.barStatue.clone();
    if (live) { const c = [spot, new THREE.Vector3(57.0, DY_BAR, -49.1), new THREE.Vector3(53.4, DY_BAR, -49.2)]; spot = c.find(v => Math.hypot(v.x - p.x, v.z - p.z) >= 3.2) || c.sort((a, b) => Math.hypot(b.x - p.x, b.z - p.z) - Math.hypot(a.x - p.x, a.z - p.z))[0]; }
    else { g.setView(56.9, -47.7, 0, 0); this.setGroup('haunt', true, 0.5, 0.12); }
    st.visible = true; st.position.set(spot.x, W.groundY(spot.x, spot.z), spot.z); st.rotation.y = Math.atan2(p.x - st.position.x, p.z - st.position.z);
    if (!live) g.player.yaw = Math.atan2(-(st.position.x - p.x), -(st.position.z - p.z));
    S.active = true; S.hunting = false; S.huntDelay = live ? 2.8 : 2.2; S._graceSet = false; S.seenEver = false; S.farSpeed = 9; S.nearSpeed = 6.8; S.bashT = 0;
    this.obj('Get out — past it into the back hall, through the stair hall, out the side door, back to McLean');
    this.saveCP('E');
  }
  reachMcLean2() {
    const g = this.g; this.mcleanHuntState(false);
    this.obj('Catch your breath — McLean hall');
    this.after(3.0, () => g.hud.toast('It followed you over. A shut door holds it — it pounds, then backs off.', 5));
    this.say([[DEE, 'You\'re back in McLean? ...Okay. I\'m not gonna ask.', 3], [DEE, 'The old night guys never liked that room at Christmas. I never asked them why.', 4.2],
      [DEE, 'One more, then go home. 117 called down freezing, so I moved them to 121. PTAC\'s dead. Get it heating before day shift?', 6]], () => {
      this.tickets = [...this.tickets.filter(t => t.id === 'WO-4473'), { id: 'WO-4474', text: 'No heat — Rm 117 PTAC (guest moved to 121)' }]; g.hud.tickets(this.tickets); g.sound.ding();
      this.obj(this.wo117Obj()); });
  }
  mcleanHuntState(retry) {
    const S = this.S, st = this.statue, p = this.g.player.pos, f = this.f; f.phase = 'wo117';
    S.active = true; st.visible = true; S.farSpeed = 3.0; S.nearSpeed = 4.6; S.hunting = false; S.huntDelay = retry ? 6 : 16; S._graceSet = true; S.bashT = 0; // live: let Dee finish before it starts moving
    if (retry || Math.hypot(st.position.x - p.x, st.position.z - p.z) < 12) st.position.set(43, 0, -31.5);
    const td = this.W.doors.terraceDoor; td.broken = false; td.locked = false;
    if (retry && !this.tickets.find(t => t.id === 'WO-4474')) { this.tickets.push({ id: 'WO-4474', text: 'No heat — Rm 117 PTAC (guest moved to 121)' }); this.g.hud.tickets(this.tickets); }
    this.saveCP('F');
  }
  wo117Done() {
    const g = this.g, f = this.f, S = this.S; this.closeWO('WO-4474');
    S.active = false; this._vanish = true; this.after(1.0, () => this.distantScrape(new THREE.Vector3(44, 1, -31.5)));
    this.say([[DEE, '117\'s showing heat. ...That\'s the night, hon.', 3], [DEE, 'Day crew\'s pulling in. Go clock out. And — Merry Christmas.', 3.4]], () => {
      g.cut('6:52 AM', () => { g.time = Math.max(g.time, 86400 + 6 * 3600 + 52 * 60); f.phase = 'clockout'; this.obj('Clock out — time clock on the dock wall<br>McLean hall → EMPLOYEES ONLY door → service corridor → dock'); }); });
  }
  clockOut() {
    const g = this.g, f = this.f, W = this.W, s = g.sound, st = this.statue; f.phase = 'out'; this._outTime = this.clockStr();
    if (s.ctx) s.punch(); g.hud.toast('OUT  ' + this._outTime + '   ·   ENGINEERING / 3RD SHIFT', 3.5); this.obj(''); this.farSong && this.farSong.stop(0.5);
    const face = () => { const p = g.player.pos; st.rotation.y = Math.atan2(p.x - st.position.x, p.z - st.position.z); };
    this.after(1.3, () => { st.visible = true; st.position.set(9.7, 0, 0.9); face(); this.distantScrape(new THREE.Vector3(9.7, 1, 0.9)); this.say([[ME, '...No. No, no, no.', 1.8]]); });
    this.after(3.4, () => { this.setGroup('dock', false); if (s.ctx) s.powerDown(); });
    this.after(4.1, () => { const p = g.player.pos; const d = new THREE.Vector3(9.7 - p.x, 0, 0.9 - p.z); const l = d.length(); if (l > 2.8) d.multiplyScalar(2.6 / l); st.position.set(p.x + d.x, 0, p.z + d.z); face(); this.setGroup('dock', true, 0.55, 0.35); if (s.ctx) s.sting(); });
    this.after(5.8, () => { this.setGroup('dock', false); if (s.ctx) { s.slam(W.anchors.rollup); s.rattle(W.anchors.rollup); } g.shake = 1; g.post.uniforms.glitch.value = 1; });
    this.after(6.5, () => { st.visible = false; this.setGroup('dock', true, 1, 0.05); });
    this.after(7.6, () => this.end());
  }
  // 173 pounded on a door it can't break: it backs off somewhere you can't see, farther away than it was
  withdraw() {
    const g = this.g, S = this.S, st = this.statue, p = g.player.pos; this.bfs(p.x, p.z, true);
    const cur = this.dist[this.cellOf(st.position.x, st.position.z)]; const save = st.position.clone(); let best = null, bd = 1e9;
    for (const [x, z] of LURKS) { const d = this.dist[this.cellOf(x, z)]; if (d >= 1e9 || d < Math.min(cur, 1e8) + 16 || Math.hypot(x - p.x, z - p.z) < 6) continue;
      st.position.set(x, this.W.groundY(x, z), z); const seen = this.isSeen(); st.position.copy(save); if (seen) continue; if (d < bd) { bd = d; best = [x, z]; } }
    if (best) st.position.set(best[0], this.W.groundY(best[0], best[1]), best[1]);
    S.hunting = false; S.huntDelay = 4.5 + Math.random() * 2; S._graceSet = true; S.bashT = 0; this.navT = 0;
    if (!this._toldWithdraw) { this._toldWithdraw = true; this.after(1.2, () => g.hud.toast('...It\'s gone quiet.', 2.5)); }
  }
  // hold Q / right mouse at a closed door: it cracks open away from you and you lean into the gap
  updatePeek(dt) {
    const g = this.g, p = g.player.pos, W = this.W; let D = null;
    if (g.peekHeld() && g.state === 'play' && !this.dying && !g.player.frozen) {
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw); let bd = 1.25;
      for (const d of W.doors) { if (d.open || d.broken || d.locked) continue; const dx = d.x - p.x, dz = d.z - p.z, dd = Math.hypot(dx, dz); if (dd > bd) continue;
        if (dd > 0.3 && (dx * fx + dz * fz) / dd < 0.1) continue; if (Math.abs(p.y - d.pivot.position.y) > 1) continue; bd = dd; D = d; }
      const P = this.peekDoor; if (P && !P.open && !P.locked && !P.broken && Math.hypot(P.x - p.x, P.z - p.z) < 1.5) D = P; // sticky while held
    }
    if (D !== this.peekDoor) { if (this.peekDoor) this.peekDoor.peekA = 0; this.peekDoor = D; this._occ = null;
      if (D) { if (g.sound.ctx) g.sound.creak(0.05, g.sound.panner(new THREE.Vector3(D.x, 1.2, D.z))); if (!this._peekUsed) { this._peekUsed = true; g.hud.toast('Peeking. It can\'t move while you can see it through the gap.\n[E] throw the door open  ·  let go to ease it shut', 4.5); } } }
    g.peeking = !!D; const off = this._po || (this._po = new THREE.Vector3());
    if (D) {
      const side = D.axis === 'x' ? (Math.sign(p.z - D.z) || 1) : (Math.sign(p.x - D.x) || 1);
      D.peekA = (D.axis === 'x' ? side : -side) * 0.62; // 'x' doors swing their free edge to -z on +angle, 'z' doors to +x: crack it away from you
      const gx = D.axis === 'x' ? D.x - D.w / 2 + D.w * 0.86 : D.x + 0.14 * side, gz = D.axis === 'x' ? D.z + 0.14 * side : D.z - D.w / 2 + D.w * 0.86;
      off.set(gx - p.x, 0, gz - p.z); const l = off.length(); if (l > 0.9) off.multiplyScalar(0.9 / l);
    } else off.set(0, 0, 0);
    g.peekOff.lerp(off, Math.min(1, dt * 8));
  }
  endPeek() { if (this.peekDoor) this.peekDoor.peekA = 0; this.peekDoor = null; this._occ = null; this.g.peeking = false; this.g.peekOff.set(0, 0, 0); }
  updateHaunt(dt, reg) {
    const g = this.g, f = this.f, W = this.W, p = g.player.pos;
    if (this.song && this.song.on) this.song.clarity(1 - (p.distanceTo(W.anchors.sewing) - 2) / 22);
    if (f.phase === 'haunt_go' && reg === 'sewing') this.enterSewing();
    if (f.phase === 'voices' && reg === 'bar') this.enterBar();
    if (f.phase === 'bar') { this.barT += dt; if (!this._slammed && this.barT > 2.4 && (p.x < 57.0 || this.barT > 5)) this.doSlam(); }
    if (f.phase === 'slam' && reg === 'backhall' && !this._hideTold) { this._hideTold = true; g.hud.toast('Linen closet, right there: duck in and shut the door. It\'ll pound, but it can\'t get through.\nHOLD [Q] or [RIGHT MOUSE] at a closed door to peek through the crack.', 7); }
    if (f.phase === 'slam' && reg === 'mclean' && p.x < 33.7) this.reachMcLean2();
    if (this._vanish && this.statue.visible && !this.isSeen()) { this._vanish = false; this.statue.visible = false; this.scrape && this.scrape.set(0); }
    if (f.phase === 'clockout' && reg === 'corridor' && !this._corrSong) { this._corrSong = true;
      this.after(2.0, () => { const v = W.vlights.find(v => v.group === 'corr' && v.pos.z === -18); if (v) v.flicker = 0.7; if (g.sound.ctx) this.farSong = g.sound.lullaby(new THREE.Vector3(9.2, 1.6, -29.6), 0.07, { gap: 99, roll: 0.6 }); });
      this.after(11, () => { this.farSong && this.farSong.stop(1.2); }); }
    // the cold: frost at the edges of the lens, breath, everything muffled
    const coldTarget = reg === 'sewing' && ['sewing', 'voices'].includes(f.phase) ? 1 : 0;
    this.cold += (coldTarget - this.cold) * Math.min(1, dt * (coldTarget > this.cold ? 0.9 : 0.45));
    const fe = document.getElementById('frost'); if (fe) fe.style.opacity = (this.cold * 0.85).toFixed(3);
    if (W.frostMats) for (const m of W.frostMats) m.opacity = Math.max(m.opacity, this.cold * 0.9);
    if (g.sound.ctx) { const hz = 20000 * Math.pow(1000 / 20000, this.cold); if (Math.abs(hz - (this._muf ?? 20000)) > 40) { this._muf = hz; g.sound.setMuffle(hz); } }
    this.updateBreath(dt);
    if (this.rock.amp > 0.002 && W.haunt.rocker) { this.rock.t += dt; this.rock.amp *= Math.pow(0.78, dt); W.haunt.rocker.rotation.x = Math.sin(this.rock.t * 2.3) * this.rock.amp; }
  }
  updateBreath(dt) {
    if (this.cold > 0.45) { this.puffT -= dt; if (this.puffT <= 0) { this.puffT = 2.3 + Math.random() * 0.8; this.puff(); } }
    for (const q of this.puffs) { if (q.life <= 0) continue; q.life -= dt; const k = 1 - q.life / q.max; q.s.position.addScaledVector(q.v, dt); q.s.scale.setScalar(0.12 + k * 0.55); q.s.material.opacity = 0.34 * Math.pow(1 - k, 1.4) * Math.min(1, k * 6); if (q.life <= 0) q.s.visible = false; }
  }
  puff() {
    const g = this.g, cam = g.camera; let q = this.puffs.find(q => q.life <= 0);
    if (!q) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: g.T.puff, color: 0x9aa3ad, transparent: true, depthWrite: false, opacity: 0 })); g.scene.add(sp); q = { s: sp, v: new THREE.Vector3(), life: 0, max: 1.7 }; this.puffs.push(q); }
    const fw = this._fw || (this._fw = new THREE.Vector3()); cam.getWorldDirection(fw);
    q.s.position.copy(cam.position).addScaledVector(fw, 0.34); q.s.position.y -= 0.14; q.v.copy(fw).multiplyScalar(0.3); q.v.y += 0.07; q.life = q.max; q.s.visible = true;
    if (g.sound.ctx) g.sound.breath(0.035);
  }

  // ---------------- 173 navigation ----------------
  buildNav() {
    const W = this.W, b = W.bounds; this.nx = Math.ceil((b.x1 - b.x0) / CELL); this.nz = Math.ceil((b.z1 - b.z0) / CELL);
    const N = this.nx * this.nz; this.blocked = new Uint8Array(N); this.doorCell = new Int16Array(N).fill(-1); this.dist = new Int32Array(N);
    const doorCols = new Set(W.doors.map(d => d.col)); const inf = 0.14;
    for (const c of W.colliders) { if (doorCols.has(c)) continue; if (c.y1 < 0.3 || c.y0 > 2.0) continue; this.mark(c, inf, (i) => { this.blocked[i] = 1; }); }
    W.doors.forEach((d, k) => this.mark(d.col, 0.2, i => { if (!this.blocked[i]) this.doorCell[i] = k; }));
  }
  mark(c, inf, fn) { const b = this.W.bounds; const i0 = Math.max(0, Math.floor((c.x0 - inf - b.x0) / CELL)), i1 = Math.min(this.nx - 1, Math.floor((c.x1 + inf - b.x0) / CELL)); const j0 = Math.max(0, Math.floor((c.z0 - inf - b.z0) / CELL)), j1 = Math.min(this.nz - 1, Math.floor((c.z1 + inf - b.z0) / CELL)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * this.nx + i); }
  cellOf(x, z) { const b = this.W.bounds; const i = Math.max(0, Math.min(this.nx - 1, Math.floor((x - b.x0) / CELL))), j = Math.max(0, Math.min(this.nz - 1, Math.floor((z - b.z0) / CELL))); return j * this.nx + i; }
  center(c) { const b = this.W.bounds; return [b.x0 + (c % this.nx + 0.5) * CELL, b.z0 + (Math.floor(c / this.nx) + 0.5) * CELL]; }
  // distance field from the player. First pass treats shut doors as walls, so 173 takes an open route if there is one;
  // only if you're shut in somewhere does it path through a door (and then pound on it). doorsPassable skips the first pass.
  bfs(x, z, doorsPassable) {
    if (!doorsPassable) { this.bfsPass(x, z, true); const sc = this.cellOf(this.statue.position.x, this.statue.position.z); if (this.dist[sc] < 1e9) return; }
    this.bfsPass(x, z, false);
  }
  bfsPass(x, z, doorsBlock) {
    const D = this.dist; D.fill(1e9); const q = this._q || (this._q = new Int32Array(this.nx * this.nz)); let h = 0, t = 0; const s = this.cellOf(x, z); D[s] = 0; q[t++] = s; const nx = this.nx;
    while (h < t) { const c = q[h++]; const ci = c % nx; const d = D[c] + 1;
      for (const o of [1, -1, nx, -nx]) { const n = c + o; if (n < 0 || n >= D.length) continue; if ((o === 1 && ci === nx - 1) || (o === -1 && ci === 0)) continue; if (this.blocked[n] || D[n] <= d) continue; if (doorsBlock && this.closedDoorAt(n)) continue; D[n] = d; q[t++] = n; } }
  }
  closedDoorAt(c) { const k = this.doorCell[c]; if (k < 0) return null; const d = this.W.doors[k]; return d.open ? null : d; }

  isSeen() {
    const g = this.g, cam = g.camera, st = this.statue; if (!st.visible) return false; if (this.blink.lid > 0.55) return false;
    st.updateMatrixWorld(); cam.updateMatrixWorld(); const camPos = cam.position;
    for (const lp of st.userData.checkPoints) {
      const wp = this._v.copy(lp).applyMatrix4(st.matrixWorld); const dist = wp.distanceTo(camPos); if (dist > 40) continue;
      const vc = wp.clone().applyMatrix4(cam.matrixWorldInverse); if (vc.z > -0.05) continue; const ndc = wp.clone().project(cam); if ( Math.abs(ndc.x) > 1.02 || Math.abs(ndc.y) > 1.02) continue;
      this._ray.set(camPos, wp.clone().sub(camPos).normalize()); this._ray.far = dist - 0.1;
      const occ = this.peekDoor ? (this._occ || (this._occ = this.W.occluders.filter(o => o !== this.peekDoor.panel))) : this.W.occluders;
      const hit = this._ray.intersectObjects(occ, false); if (!hit.length) return true;
    }
    return false;
  }
  updateStatue(dt) {
    const S = this.S, st = this.statue, g = this.g, p = g.player.pos; S.moved = false;
    S.seen = this.isSeen();
    if (S.seen && !S.seenEver) { S.seenEver = true; g.sound.sting(); }
    if (!S.hunting) { if (S.seenEver && !S._graceSet) { S._graceSet = true; S.huntDelay = Math.min(S.huntDelay, 1.0); } S.huntDelay -= dt; if (S.huntDelay <= 0) S.hunting = true; }
    const dx = p.x - st.position.x, dz = p.z - st.position.z; const dist = Math.hypot(dx, dz);
    if (!S.seen && S.hunting && !this.dying) {
      this.navT = (this.navT || 0) - dt; if (this.navT <= 0) { this.navT = 0.2; this.bfs(p.x, p.z); }
      let remain = (dist > 14 ? (S.farSpeed ?? 9) : (S.nearSpeed ?? 6.8)) * dt; let guard = 0;
      while (remain > 0 && guard++ < 20) {
        const cx = st.position.x, cz = st.position.z; let tx, tz;
        const ddx = p.x - cx, ddz = p.z - cz, dd = Math.hypot(ddx, ddz);
        if (dd < 0.75) break;
        if (dd < 3 && this.clearLine(cx, cz, p.x, p.z)) { tx = p.x; tz = p.z; }
        else { const c = this.cellOf(cx, cz); let best = c, bd = this.dist[c]; const nx = this.nx;
          for (const [di, dj] of NB) { const n = c + di + dj * nx; if (n < 0 || n >= this.dist.length) continue; if (di && dj && (this.blocked[c + di] || this.blocked[c + dj * nx])) continue; const dv = this.dist[n] + (di && dj ? 0.4 : 0); if (dv < bd) { bd = dv; best = n; } }
          if (best === c) { [tx, tz] = this.center(c); if (Math.hypot(tx - cx, tz - cz) < 0.05) break; } else [tx, tz] = this.center(best); }
        const mx = tx - cx, mz = tz - cz, ml = Math.hypot(mx, mz); if (ml < 1e-4) break; const step = Math.min(remain, ml, 0.25);
        const nxp = cx + mx / ml * step, nzp = cz + mz / ml * step;
        const door = this.closedDoorAt(this.cellOf(nxp, nzp));
        if (door) { this.bash(door, dt); break; }
        st.position.x = nxp; st.position.z = nzp; remain -= step; S.moved = true;
      }
      st.position.y = this.W.groundY(st.position.x, st.position.z);
      st.rotation.y = Math.atan2(p.x - st.position.x, p.z - st.position.z);
      if (Math.hypot(p.x - st.position.x, p.z - st.position.z) < 0.95 && Math.abs(p.y - st.position.y) < 1.2) this.kill();
    }
    if (this.scrape) { this.scrape.setPos(new THREE.Vector3(st.position.x, st.position.y + 0.3, st.position.z)); this.scrape.set(S.moved ? 1.0 : 0); }
  }
  clearLine(x0, z0, x1, z1) { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25); for (let i = 1; i < n; i++) { const c = this.cellOf(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); if (this.blocked[c] || this.closedDoorAt(c)) return false; } return true; }
  bash(door, dt) {
    const S = this.S, g = this.g; S.bashT += dt; S.bashTick -= dt;
    if (S.bashTick <= 0) { S.bashTick = 0.85; g.sound.bash(new THREE.Vector3(door.x, 1, door.z)); door.angle += (Math.random() - 0.5) * 0.08; g.shake = Math.max(g.shake, 0.25); }
    if (door.sturdy) { if (S.bashT > 3.3) { S.bashT = 0; this.withdraw(); } return; }
    if (S.bashT > 3.6) { S.bashT = 0; door.broken = true; door.setOpen(true, false); door.pivot.rotation.y = door.target; door.angle = door.target; g.sound.bash(new THREE.Vector3(door.x, 1, door.z)); g.sound.creak(0.2); }
  }

  // ---------------- per-frame ----------------
  updateBlink(dt) {
    const g = this.g, B = this.blink, k = g.keys; const holding = k.Space && g.state === 'play';
    let closed = false;
    if (holding) { closed = true; B.meter = 1; }
    else if (B.forced > 0) { B.forced -= dt; closed = true; if (B.forced <= 0) B.meter = 1; }
    else { B.meter -= dt / (this.S.active ? 8 : 11); if (B.meter <= 0) { B.forced = 0.22; g.sound.blink(); } }
    if (holding && !this._wasHolding) g.sound.blink(); this._wasHolding = holding;
    B.lid += ((closed ? 1 : 0) - B.lid) * Math.min(1, dt * 28);
    g.post.uniforms.blink.value = B.lid; g.player.eyesClosed = B.lid > 0.55;
    document.getElementById('blinkfill').style.width = (Math.max(0, B.meter) * 100) + '%';
  }
  update(dt) {
    const g = this.g, f = this.f, W = this.W, p = g.player.pos;
    // radio queue
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) g.hud.sub('', ''); }
    if (this.subT <= 0 && this.queue.length) { const q = this.queue.shift(); if (q.fn) q.fn(); else { g.hud.sub(q.who, q.text); this.subT = q.dur + 0.4; if (q.who === DEE) g.sound.radio(q.dur * 0.85); } }
    this.updateBlink(dt);
    // doors animate
    for (const d of W.doors) { const tgt = d.peekA && !d.open ? d.peekA : d.target; if (d.open) d.peekA = 0; d.angle += (tgt - d.angle) * Math.min(1, dt * (d.peekA ? 9 : 7)); d.pivot.rotation.y = d.angle; d.pivot.updateMatrixWorld(true); }
    // scheduled beats (story time, so they pause with the game)
    if (!this.dying) for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    this.updatePeek(dt);
    const reg = W.regionAt(p.x, p.z);
    // dock door rattle ambience
    this.rattleT -= dt; if (this.rattleT <= 0) { this.rattleT = 14 + Math.random() * 20; if (reg === 'dock' || reg === 'office' || reg === 'corridor') g.sound.rattle(W.anchors.rollup); }
    // DuBose beats
    if (f.phase === 'godubose' && reg && ['duboseHall', 'foyer', 'library', 'dining'].includes(reg) && !f.teased) { this.tease(); }
    if (f.teased && !this.S.active && !this._teaseSeen && this.isSeen()) { this._teaseSeen = true; g.sound.sting(); this.say([[ME, '...Who put a statue up there?', 2.2]]); }
    if (f.phase === 'godubose' && reg === 'suite') { f.suiteT += dt; if (f.suiteT > 0.3 && !this._suiteSaid) { this._suiteSaid = true; this.say([[ME, 'Bed\'s made. TV\'s on. Nobody here.', 2.4]]); } if (f.suiteT > 3.0) { this.statue.visible = false; this.powerOut(); } }
    if (this.S.active) this.updateStatue(dt);
    if (f.phase === 'escape' && p.x < 33.7 && reg === 'mclean' && !f.ended) this.afterFirstEscape();
    this.updateHaunt(dt, reg);
    // death camera wrench
    if (this.dying) { this.snapT += dt; if (this.snapT > 0.45) g.post.uniforms.dead.value = 1; if (this.snapT > 1.2 && g.state === 'play') { g.showDead('SIGNAL LOST · ' + this.clockStr() + ' · ' + this.placeName(reg)); return; } g.player.pitch = Math.min(0.2, g.player.pitch + dt * 2); g.camera.rotation.z = Math.min(1.4, this.snapT * 9) * -1; }
  }
  always(dt) {
    if (this.tvOn && this.W.tvMat) { const v = 0.35 + Math.random() * 0.4; this.W.tvMat.color.setRGB(v * 0.8, v * 0.85, v); this.W.tvLight.intensity = 0.5 + Math.random() * 0.4; this.W.tvLight.on = true; }
  }
}
