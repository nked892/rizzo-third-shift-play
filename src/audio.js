// Fully procedural WebAudio sound design (original; no samples).
export class Sound {
  constructor() { this.ctx = null; this.loops = []; }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = 0.9;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    // muffle: a master lowpass the story closes down in the cold sewing room
    this.muf = C.createBiquadFilter(); this.muf.type = 'lowpass'; this.muf.frequency.value = 20000; this.muf.Q.value = 0.5;
    this.master.connect(this.muf); this.muf.connect(comp); comp.connect(C.destination);
    const len = C.sampleRate * 2;
    this.white = C.createBuffer(1, len, C.sampleRate);
    const d = this.white.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.brown = C.createBuffer(1, len, C.sampleRate);
    const b = this.brown.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    // ambient room tone
    const amb = this.noiseSrc(this.brown); const ag = C.createGain(); ag.gain.value = 0.05; amb.connect(ag); ag.connect(this.master); amb.start();
    const o1 = C.createOscillator(); o1.frequency.value = 41; const o2 = C.createOscillator(); o2.frequency.value = 43.3;
    const og = C.createGain(); og.gain.value = 0.018; o1.connect(og); o2.connect(og); og.connect(this.master); o1.start(); o2.start();
    this.ambGain = og;
  }
  get t() { return this.ctx.currentTime; }
  noiseSrc(buf) { const s = this.ctx.createBufferSource(); s.buffer = buf || this.white; s.loop = true; s.loopStart = Math.random(); return s; }
  panner(pos, ref = 2, roll = 1.4) {
    const p = this.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 60;
    if (pos) this.setPos(p, pos); p.connect(this.master); return p;
  }
  setPos(p, pos) { const t = this.ctx.currentTime; p.positionX.setTargetAtTime(pos.x, t, 0.03); p.positionY.setTargetAtTime(pos.y, t, 0.03); p.positionZ.setTargetAtTime(pos.z, t, 0.03); }
  updateListener(cam) {
    if (!this.ctx) return; const L = this.ctx.listener; const t = this.ctx.currentTime;
    const f = cam.getWorldDirection(this._v || (this._v = cam.position.clone()));
    if (L.positionX) { L.positionX.setValueAtTime(cam.position.x, t); L.positionY.setValueAtTime(cam.position.y, t); L.positionZ.setValueAtTime(cam.position.z, t);
      L.forwardX.setValueAtTime(f.x, t); L.forwardY.setValueAtTime(f.y, t); L.forwardZ.setValueAtTime(f.z, t); L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t); }
    else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
  }
  env(g, a, peak, hold, rel, t0) { const t = t0 ?? this.t; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); return t + a + hold + rel; }
  burst({ type = 'bandpass', f = 1000, q = 1, peak = 0.3, a = 0.002, hold = 0.01, rel = 0.08, dest, t0, buf } = {}) {
    const C = this.ctx; const s = this.noiseSrc(buf); const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = C.createGain();
    s.connect(fl); fl.connect(g); g.connect(dest || this.master); const end = this.env(g, a, peak, hold, rel, t0); s.start(t0 ?? this.t); s.stop(end + 0.05); return fl;
  }
  tone({ f = 440, type = 'sine', peak = 0.2, a = 0.005, hold = 0.05, rel = 0.2, dest, t0, f2 } = {}) {
    const C = this.ctx; const o = C.createOscillator(); o.type = type; const t = t0 ?? this.t; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + hold + rel);
    const g = C.createGain(); o.connect(g); g.connect(dest || this.master); const end = this.env(g, a, peak, hold, rel, t); o.start(t); o.stop(end + 0.05); return o;
  }
  // ---- loops ----
  hum(pos, vol = 0.05) { // fluorescent ballast hum
    const C = this.ctx, p = this.panner(pos, 1.5, 1.6); const g = C.createGain(); g.gain.value = vol; g.connect(p);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(g);
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120; o.connect(lp); o.start();
    const o2 = C.createOscillator(); o2.type = 'sine'; o2.frequency.value = 240; const g2 = C.createGain(); g2.gain.value = 0.5; o2.connect(g2); g2.connect(g); o2.start();
    const n = this.noiseSrc(); const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000; const ng = C.createGain(); ng.gain.value = 0.15; n.connect(hp); hp.connect(ng); ng.connect(g); n.start();
    const L = { gain: g, base: vol, set: v => g.gain.setTargetAtTime(v, this.t, 0.05) }; this.loops.push(L); return L;
  }
  drone(pos, vol = 0.08) { // ice machine compressor
    const C = this.ctx, p = this.panner(pos, 1.5, 1.5); const g = C.createGain(); g.gain.value = vol; g.connect(p);
    const n = this.noiseSrc(this.brown); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; n.connect(lp); lp.connect(g); n.start();
    const o = C.createOscillator(); o.type = 'square'; o.frequency.value = 58; const lp2 = C.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 200; const og = C.createGain(); og.gain.value = 0.25; o.connect(lp2); lp2.connect(og); og.connect(g); o.start();
    const L = { gain: g, base: vol, set: v => g.gain.setTargetAtTime(v, this.t, 0.1) }; this.loops.push(L); return L;
  }
  drip(pos) { // ice machine leak drips
    const p = this.panner(pos, 1, 2); const L = { on: true, p };
    const tick = () => { if (!L.on) return; this.tone({ f: 900 + Math.random() * 600, f2: 400, peak: 0.12, hold: 0, rel: 0.06, dest: p }); setTimeout(tick, 400 + Math.random() * 900); }; tick(); return L;
  }
  staticLoop(pos, vol = 0.06) {
    const C = this.ctx, p = this.panner(pos, 1, 1.8); const g = C.createGain(); g.gain.value = vol; g.connect(p);
    const n = this.noiseSrc(); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.4; n.connect(bp); bp.connect(g); n.start();
    return { set: v => g.gain.setTargetAtTime(v, this.t, 0.05) };
  }
  clock(pos) { const p = this.panner(pos, 1.2, 1.6); let k = 0; const L = { on: true };
    const tick = () => { if (!L.on) return; this.burst({ f: k++ % 2 ? 2400 : 1900, q: 8, peak: 0.18, rel: 0.04, dest: p }); this.tone({ f: 620, peak: 0.05, hold: 0, rel: 0.05, dest: p }); setTimeout(tick, 1000); }; tick(); return L; }
  statueLoop() { // concrete grinding on floor, gain driven by movement
    const C = this.ctx; const p = this.panner(null, 2.5, 0.9); const g = C.createGain(); g.gain.value = 0; g.connect(p);
    const n = this.noiseSrc(this.brown); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.9; n.connect(bp);
    const am = C.createGain(); am.gain.value = 0.6; bp.connect(am); am.connect(g);
    const lfo = C.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 23; const lg = C.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(am.gain); lfo.start();
    const n2 = this.noiseSrc(); const bp2 = C.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2300; bp2.Q.value = 2; const g2 = C.createGain(); g2.gain.value = 0.25; n2.connect(bp2); bp2.connect(g2); g2.connect(g); n.start(); n2.start();
    return { p, g, setPos: pos => this.setPos(p, pos), set: v => g.gain.setTargetAtTime(v, this.t, v > 0.01 ? 0.01 : 0.06) };
  }
  // ---- one shots ----
  step(surface, vol = 1) {
    const s = { concrete: [1700, 1.1, 0.16, 0.05], carpet: [420, 0.7, 0.10, 0.09], wood: [900, 1.6, 0.17, 0.07], brick: [1300, 1, 0.14, 0.06], tile: [2600, 1.5, 0.12, 0.04], metal: [2200, 3, 0.16, 0.12] }[surface] || [1500, 1, 0.12, 0.05];
    this.burst({ f: s[0] * (0.85 + Math.random() * 0.3), q: s[1], peak: s[2] * vol, rel: s[3] });
    this.tone({ f: surface === 'wood' ? 140 : 90, f2: 50, peak: 0.08 * vol, hold: 0, rel: 0.08 });
    if (surface === 'wood' && Math.random() < 0.12) this.creak(0.05);
  }
  creak(vol = 0.08, dest) { const C = this.ctx; const o = C.createOscillator(); o.type = 'sawtooth'; const t = this.t; o.frequency.setValueAtTime(70 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(110 + Math.random() * 60, t + 0.5);
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6; const g = C.createGain(); o.connect(bp); bp.connect(g); g.connect(dest || this.master); this.env(g, 0.08, vol, 0.3, 0.25); o.start(); o.stop(t + 0.8); }
  door(pos, opening) { const p = this.panner(pos, 2, 1.2); this.burst({ f: 1800, q: 4, peak: 0.25, rel: 0.05, dest: p }); if (opening) this.creak(0.12, p); else setTimeout(() => { this.burst({ f: 300, q: 1, peak: 0.6, rel: 0.12, dest: p, buf: this.brown }); this.burst({ f: 2000, q: 5, peak: 0.2, rel: 0.05, dest: p }); }, 280); }
  locked(pos) { const p = this.panner(pos, 2, 1.2); for (let i = 0; i < 3; i++) this.burst({ f: 2400, q: 6, peak: 0.2, rel: 0.04, dest: p, t0: this.t + i * 0.09 }); }
  bash(pos) { const p = this.panner(pos, 3, 0.8); this.burst({ f: 180, q: 0.8, peak: 1.0, a: 0.001, hold: 0.04, rel: 0.3, dest: p, buf: this.brown }); this.burst({ f: 2600, q: 3, peak: 0.25, hold: 0.05, rel: 0.2, dest: p }); }
  rattle(pos) { const p = this.panner(pos, 4, 0.7); const n = 6 + Math.floor(Math.random() * 8); for (let i = 0; i < n; i++) this.burst({ f: 900 + Math.random() * 1600, q: 5, peak: 0.25 + Math.random() * 0.2, rel: 0.07, dest: p, t0: this.t + i * (0.05 + Math.random() * 0.05) }); this.burst({ f: 120, q: 1, peak: 0.3, hold: 0.2, rel: 0.4, dest: p, buf: this.brown }); }
  punch() { this.tone({ f: 1850, type: 'square', peak: 0.08, hold: 0.12, rel: 0.02 }); setTimeout(() => { this.burst({ f: 700, q: 2, peak: 0.6, rel: 0.12 }); this.burst({ f: 3000, q: 6, peak: 0.2, rel: 0.05 }); }, 180); }
  ding() { this.tone({ f: 1320, peak: 0.12, hold: 0.05, rel: 0.3 }); this.tone({ f: 1760, peak: 0.1, hold: 0.05, rel: 0.4, t0: this.t + 0.12 }); }
  pickup() { this.burst({ f: 1200, q: 2, peak: 0.25, rel: 0.08 }); this.tone({ f: 300, peak: 0.08, hold: 0, rel: 0.1 }); }
  clunk(big) { this.burst({ f: big ? 220 : 600, q: 1.5, peak: 0.7, rel: 0.18, buf: this.brown }); this.burst({ f: 2500, q: 4, peak: 0.25, rel: 0.05 }); }
  powerDown() { this.clunk(true); this.tone({ f: 120, f2: 18, type: 'sawtooth', peak: 0.12, hold: 0.1, rel: 1.6 }); }
  powerUp() { this.clunk(true); this.tone({ f: 25, f2: 120, type: 'sawtooth', peak: 0.08, a: 0.6, hold: 0.2, rel: 0.4 }); for (let i = 0; i < 4; i++) this.burst({ f: 4000, q: 2, peak: 0.08, rel: 0.03, t0: this.t + 0.3 + i * 0.12 }); }
  gurgle(dur = 2.5) { const C = this.ctx; const n = this.noiseSrc(this.brown); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; const g = C.createGain(); const lfo = C.createOscillator(); lfo.frequency.value = 7; const lg = C.createGain(); lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); n.connect(lp); lp.connect(g); g.connect(this.master); this.env(g, 0.2, 0.5, dur - 0.6, 0.4); n.start(); lfo.start(); n.stop(this.t + dur); lfo.stop(this.t + dur); }
  swish() { this.burst({ f: 1100, q: 0.7, peak: 0.25, a: 0.12, hold: 0.05, rel: 0.25 }); }
  buzz(dur = 0.6, pos) { const C = this.ctx; const o = C.createOscillator(); o.type = 'square'; o.frequency.value = 120; const g = C.createGain(); const lp = C.createBiquadFilter(); lp.frequency.value = 2000; o.connect(lp); lp.connect(g); g.connect(pos ? this.panner(pos) : this.master); this.env(g, 0.01, 0.08, dur, 0.05); o.start(); o.stop(this.t + dur + 0.1); }
  sting() { [55, 58.3, 82.4, 116.5, 123.5].forEach((f, i) => this.tone({ f, type: i % 2 ? 'sawtooth' : 'triangle', peak: 0.07, a: 0.05, hold: 1.4, rel: 2.5 })); this.burst({ f: 300, q: 0.5, peak: 0.4, a: 0.01, hold: 0.1, rel: 1.5, buf: this.brown }); }
  snap() { // neck snap
    this.burst({ f: 3500, type: 'highpass', q: 0.7, peak: 1.0, a: 0.0005, hold: 0.008, rel: 0.05 });
    for (let i = 0; i < 6; i++) this.burst({ f: 900 + Math.random() * 1800, q: 4, peak: 0.6, a: 0.0005, rel: 0.03, t0: this.t + 0.01 + i * 0.012 });
    this.burst({ f: 140, q: 1, peak: 1.0, a: 0.001, hold: 0.04, rel: 0.4, buf: this.brown });
  }
  blink() { this.burst({ f: 500, q: 0.6, peak: 0.03, rel: 0.05 }); }
  breath(vol = 0.05) { this.burst({ f: 700, q: 0.4, peak: vol, a: 0.4, hold: 0.2, rel: 0.6 }); }
  // radio: squelch + garbled voice + hiss, length in seconds
  radio(len) {
    const C = this.ctx; const t = this.t; const out = C.createGain(); out.gain.value = 0.9; out.connect(this.master);
    this.burst({ f: 2200, q: 0.8, peak: 0.35, a: 0.002, hold: 0.06, rel: 0.05, dest: out });
    const hiss = this.noiseSrc(); const hb = C.createBiquadFilter(); hb.type = 'bandpass'; hb.frequency.value = 2500; hb.Q.value = 0.6; const hg = C.createGain(); hiss.connect(hb); hb.connect(hg); hg.connect(out); this.env(hg, 0.03, 0.07, len, 0.1, t); hiss.start(t); hiss.stop(t + len + 0.3);
    // voice-ish formant garble
    const o = C.createOscillator(); o.type = 'sawtooth'; const f1 = C.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4; const f2 = C.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 5;
    const vg = C.createGain(); vg.gain.value = 0; const sh = C.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); } sh.curve = curve;
    o.connect(f1); o.connect(f2); f1.connect(vg); f2.connect(vg); vg.connect(sh); const vo = C.createGain(); vo.gain.value = 0.35; sh.connect(vo); vo.connect(out);
    let tt = t + 0.12; while (tt < t + len) { const syl = 0.07 + Math.random() * 0.13; o.frequency.setValueAtTime(175 + Math.random() * 60, tt); f1.frequency.setValueAtTime(400 + Math.random() * 500, tt); f2.frequency.setValueAtTime(1100 + Math.random() * 1200, tt);
      vg.gain.setTargetAtTime(Math.random() < 0.12 ? 0 : 0.5, tt, 0.015); tt += syl; if (Math.random() < 0.15) { vg.gain.setTargetAtTime(0, tt, 0.02); tt += 0.12; } }
    vg.gain.setTargetAtTime(0, t + len, 0.02); o.start(t); o.stop(t + len + 0.3);
    this.burst({ f: 1900, q: 0.8, peak: 0.3, a: 0.002, hold: 0.08, rel: 0.05, dest: out, t0: t + len + 0.05 });
  }
  // ---- Dee's recorded radio takes (src/dee-lines.js; original Piper TTS voice, radio-processed offline) ----
  // Preloaded after the Clock In click. Relative URLs, so it works from a subfolder (GitHub Pages). A missing take just falls back to radio().
  loadVoices(lines, base = 'audio/dee/') {
    if (!this.ctx || this.voiceBufs) return; this.voiceBufs = {}; this.voiceFails = 0;
    for (const [text, [file]] of Object.entries(lines)) {
      fetch(base + file).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(ab => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
        .then(buf => { this.voiceBufs[text] = buf; }).catch(() => { this.voiceFails++; });
    }
  }
  // play a take; returns its length in seconds, or 0 if it isn't loaded (caller falls back to the squelch)
  // opts.pos: in-person (front desk) takes come from her, positionally, instead of straight out of the radio
  voice(text, opts = {}) {
    const b = this.ctx && this.voiceBufs && this.voiceBufs[text]; if (!b) return 0;
    this.stopVoice(); const s = this.ctx.createBufferSource(); s.buffer = b; const g = this.ctx.createGain(); g.gain.value = opts.pos ? 1.25 : 1.0;
    s.connect(g); g.connect(opts.pos ? this.panner(opts.pos, 1.8, 0.9) : this.master); s.start(); this._vsrc = s; s.onended = () => { if (this._vsrc === s) this._vsrc = null; }; return b.duration;
  }
  stopVoice() { const s = this._vsrc; this._vsrc = null; if (s) try { s.stop(); } catch (e) {} }
  // ---- Christmas-shift additions (all original synthesis) ----
  setMuffle(hz) { if (!this.ctx) return; this.muf.frequency.setTargetAtTime(Math.max(300, Math.min(20000, hz)), this.t, 0.25); }
  // An ORIGINAL wordless lullaby, hummed ("mm / oo"), slow 3/4, minor-ish. Not based on any existing song or carol.
  // Positional, with a small room echo; clarity(0..1) opens the lowpass as you get closer.
  lullaby(pos, vol = 0.15, opts = {}) {
    const C = this.ctx, p = this.panner(pos, opts.ref || 1.6, opts.roll || 1.1); const out = C.createGain(); out.gain.value = 0; out.connect(p);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(out);
    const dl = C.createDelay(1); dl.delayTime.value = 0.14; const fb = C.createGain(); fb.gain.value = 0.36; const wet = C.createGain(); wet.gain.value = 0.45; lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
    const voice = C.createGain(); voice.gain.value = 0; voice.connect(lp);
    const o = C.createOscillator(); o.type = 'triangle'; const o2 = C.createOscillator(); o2.type = 'sine';
    const f1 = C.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 400; f1.Q.value = 2.5; const f2 = C.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 820; f2.Q.value = 4;
    const fg = C.createGain(); fg.gain.value = 0.9; o.connect(f1); o.connect(f2); f1.connect(fg); f2.connect(fg); fg.connect(voice); const sg = C.createGain(); sg.gain.value = 0.35; o2.connect(sg); sg.connect(voice);
    const vib = C.createOscillator(); vib.frequency.value = 5.1; const vg = C.createGain(); vg.gain.value = 2.6; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    const base = opts.base || 262; const beat = 0.64;
    // [semitones from base, beats]
    const tune = [[0, 2], [3, 1], [7, 2], [5, 1], [3, 1], [2, 1], [0, 1], [2, 3], [-2, 2], [0, 1], [3, 2], [2, 1], [0, 1], [-2, 1], [-5, 1], [0, 3]];
    o.start(); o2.start(); vib.start();
    const L = { on: true, phrases: 0 };
    const phrase = () => {
      if (!L.on) return; let t = this.t + 0.05;
      for (const [st, b] of tune) { const f = base * Math.pow(2, st / 12); o.frequency.setTargetAtTime(f, t, 0.05); o2.frequency.setTargetAtTime(f, t, 0.05);
        voice.gain.setTargetAtTime(0.5, t, 0.07); voice.gain.setTargetAtTime(0.32, t + b * beat * 0.6, 0.2); voice.gain.setTargetAtTime(0.12, t + b * beat - 0.08, 0.03); t += b * beat; }
      voice.gain.setTargetAtTime(0, t - 0.1, 0.3); L.phrases++;
      const len = t - this.t; L.timer = setTimeout(phrase, (len + (opts.gap ?? 2.6)) * 1000);
    };
    out.gain.setTargetAtTime(vol, this.t, 0.8); phrase();
    L.set = v => out.gain.setTargetAtTime(v, this.t, 0.3);
    L.clarity = c => lp.frequency.setTargetAtTime(450 + Math.max(0, Math.min(1, c)) ** 2 * 3200, this.t, 0.2);
    L.setPos = pos => this.setPos(p, pos);
    L.stop = (fade = 0.15) => { if (!L.on) return; L.on = false; clearTimeout(L.timer); out.gain.setTargetAtTime(0, this.t, fade); const end = this.t + fade * 8 + 0.5; o.stop(end); o2.stop(end); vib.stop(end); };
    return L;
  }
  // A short, distant infant cry. Audio only, played once, filtered as if through a wall. Never looped.
  babyCry(pos) {
    const C = this.ctx, p = this.panner(pos, 1.4, 1.2); const out = C.createGain(); out.gain.value = 0.2; const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; out.connect(lp); lp.connect(p);
    const dl = C.createDelay(1); dl.delayTime.value = 0.17; const fb = C.createGain(); fb.gain.value = 0.3; lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(p);
    const t0 = this.t + 0.05;
    [[0, 0.55], [0.8, 0.6], [1.6, 0.95]].forEach(([at, d], i) => {
      const t = t0 + at; const o = C.createOscillator(); o.type = 'sawtooth'; const f0 = 400 + i * 15;
      o.frequency.setValueAtTime(f0 * 0.9, t); o.frequency.linearRampToValueAtTime(f0 * 1.18, t + d * 0.35); o.frequency.linearRampToValueAtTime(f0 * 0.82, t + d);
      const j = C.createOscillator(); j.frequency.value = 8 + i; const jg = C.createGain(); jg.gain.value = 12; j.connect(jg); jg.connect(o.frequency);
      const a = C.createBiquadFilter(); a.type = 'bandpass'; a.frequency.value = 1150; a.Q.value = 3; const b = C.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 2700; b.Q.value = 4;
      const g = C.createGain(); g.gain.value = 0; o.connect(a); o.connect(b); a.connect(g); b.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.07); g.gain.setValueAtTime(0.6, t + d - 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); j.start(t); o.stop(t + d + 0.05); j.stop(t + d + 0.05); });
  }
  // Indistinct voices + the odd glass, as if a few people are at a bar in the next room.
  murmur(pos, vol = 0.12) {
    const C = this.ctx, p = this.panner(pos, 2, 1.0); const out = C.createGain(); out.gain.value = 0; out.connect(p); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.connect(out);
    const L = { on: true, voices: [] };
    for (let k = 0; k < 3; k++) { const o = C.createOscillator(); o.type = 'sawtooth'; const f1 = C.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4; const f2 = C.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 5;
      const vg = C.createGain(); vg.gain.value = 0; o.connect(f1); o.connect(f2); f1.connect(vg); f2.connect(vg); vg.connect(lp); o.start(); L.voices.push({ o, f1, f2, vg, pitch: [118, 160, 205][k] }); }
    const sched = () => { if (!L.on) return; const t0 = this.t;
      for (const v of L.voices) { let tt = t0 + Math.random() * 0.3; while (tt < t0 + 1.0) { const syl = 0.08 + Math.random() * 0.14; v.o.frequency.setValueAtTime(v.pitch * (0.85 + Math.random() * 0.35), tt); v.f1.frequency.setValueAtTime(350 + Math.random() * 500, tt); v.f2.frequency.setValueAtTime(1000 + Math.random() * 1100, tt);
        v.vg.gain.setTargetAtTime(Math.random() < 0.3 ? 0 : 0.28, tt, 0.02); tt += syl; } }
      if (Math.random() < 0.3) this.clink(null, p); L.timer = setTimeout(sched, 1000); };
    out.gain.setTargetAtTime(vol, this.t, 0.6); sched();
    L.stop = () => { if (!L.on) return; L.on = false; clearTimeout(L.timer); out.gain.cancelScheduledValues(this.t); out.gain.setValueAtTime(out.gain.value, this.t); out.gain.linearRampToValueAtTime(0, this.t + 0.06); for (const v of L.voices) v.o.stop(this.t + 0.2); };
    return L;
  }
  clink(pos, dest) { const p = dest || this.panner(pos, 1.5, 1.4); const t = this.t + Math.random() * 0.2; this.tone({ f: 3100 + Math.random() * 400, peak: 0.05, hold: 0, rel: 0.35, dest: p, t0: t }); this.tone({ f: 4300 + Math.random() * 500, peak: 0.03, hold: 0, rel: 0.25, dest: p, t0: t + 0.004 }); }
  // A hard door slam: heavier and sharper than a normal close.
  slam(pos) { const p = this.panner(pos, 3.5, 0.6);
    this.burst({ f: 130, q: 0.7, peak: 1.2, a: 0.001, hold: 0.06, rel: 0.55, dest: p, buf: this.brown }); this.burst({ f: 1900, q: 2.5, peak: 0.45, a: 0.001, hold: 0.01, rel: 0.12, dest: p });
    this.tone({ f: 70, f2: 32, peak: 0.35, hold: 0.05, rel: 0.5, dest: p }); setTimeout(() => this.ctx && this.burst({ f: 2600, q: 6, peak: 0.15, rel: 0.08, dest: p }), 120); }
  hiss(dur = 1.8, pos) { const C = this.ctx; const n = this.noiseSrc(); const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500; const g = C.createGain(); n.connect(hp); hp.connect(g); g.connect(pos ? this.panner(pos, 1, 1.5) : this.master); this.env(g, 0.15, 0.12, dur - 0.4, 0.25); n.start(); n.stop(this.t + dur + 0.1); }
  // ---- 6:51 AM ending ----
  // your own pulse in your ears; rate (beats/s) driven by how close it is
  heartbeat(vol = 0.1) { const L = { on: true, rate: 1.1, vol };
    const beat = () => { if (!L.on) return; const t = this.t; this.tone({ f: 62, f2: 40, peak: L.vol, a: 0.004, hold: 0.03, rel: 0.16, t0: t }); this.tone({ f: 55, f2: 36, peak: L.vol * 0.7, a: 0.004, hold: 0.02, rel: 0.2, t0: t + 0.22 });
      L.timer = setTimeout(beat, 1000 / Math.max(0.6, L.rate)); };
    beat(); L.stop = () => { L.on = false; clearTimeout(L.timer); }; return L; }
  // a box truck backing up to the dock: day shift
  backup(pos, n = 5) { const p = this.panner(pos, 6, 0.5); for (let i = 0; i < n; i++) this.tone({ f: 1040, type: 'square', peak: 0.035, a: 0.01, hold: 0.42, rel: 0.03, dest: p, t0: this.t + i * 1.0 }); }
  jingle() { for (let i = 0; i < 7; i++) this.tone({ f: 2600 + Math.random() * 2200, peak: 0.05, hold: 0, rel: 0.12, t0: this.t + i * 0.035 + Math.random() * 0.02 }); }
  warmAir(pos, vol = 0.06) { // PTAC blower
    const C = this.ctx, p = this.panner(pos, 1.2, 1.6); const g = C.createGain(); g.gain.value = 0; g.connect(p);
    const n = this.noiseSrc(this.brown); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; n.connect(lp); lp.connect(g); n.start();
    const o = C.createOscillator(); o.type = 'triangle'; o.frequency.value = 96; const og = C.createGain(); og.gain.value = 0.2; o.connect(og); og.connect(g); o.start();
    g.gain.setTargetAtTime(vol, this.t, 0.6); return { set: v => g.gain.setTargetAtTime(v, this.t, 0.3) };
  }
}
