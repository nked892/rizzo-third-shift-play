// Lady DuBose's portrait: an ORIGINAL procedural "oil painting" (generated in code, no photo or image data used).
// An elderly woman in a dark dress with a white open collar, silver curled hair, pearl earrings, against a dark olive ground.
// Built from thousands of brush-like strokes, then smeared along a stroke field, cracked and varnished so it reads as old oil paint.
// States: 'normal' | 'close' (she's leaning toward you) | 'empty' (just the chair and the ground). Eyes are a separate layer so they can follow you.
import * as THREE from 'three';

const W = 256, H = 320;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
const hex = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

export function makePortrait(seed = 1907) {
  const R = rng(seed), rr = (a, b) => a + R() * (b - a);
  // one brush dab: an elongated, slightly bristly ellipse
  const dab = (g, x, y, len, wid, ang, col, a) => { g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = a; g.fillStyle = col;
    g.beginPath(); g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = a * 0.5; for (let k = -1; k <= 1; k += 2) { g.fillRect(-len * 0.9, k * wid * 0.45, len * 1.8, 0.6); } g.restore(); };
  const fillStrokes = (g, inside, n, palette, len, wid, angFn, a = [0.25, 0.6]) => { for (let i = 0; i < n; i++) { const x = rr(0, W), y = rr(0, H); if (!inside(x, y)) continue; const c = palette[(R() * palette.length) | 0]; dab(g, x, y, rr(len[0], len[1]), rr(wid[0], wid[1]), angFn(x, y), c, rr(a[0], a[1])); } };
  const inEll = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;

  // ---------- the ground + a carved chair back (shared by every state) ----------
  const [bg, gb] = mk();
  { const grd = gb.createRadialGradient(80, 70, 10, 128, 160, 260); grd.addColorStop(0, '#5a5236'); grd.addColorStop(0.45, '#2f2c1e'); grd.addColorStop(1, '#141410'); gb.fillStyle = grd; gb.fillRect(0, 0, W, H);
    fillStrokes(gb, () => true, 2600, ['#3e3826', '#2a281b', '#4a4329', '#22251c', '#56502f', '#1b1c15'], [6, 18], [2, 5], (x, y) => 0.6 + Math.sin(x * 0.02 + y * 0.013) * 0.8, [0.08, 0.22]);
    // chair back: dark red velvet with a carved mahogany rail, behind her shoulders
    { gb.save(); gb.beginPath(); gb.moveTo(36, 320); gb.lineTo(40, 160); gb.quadraticCurveTo(128, 138, 216, 160); gb.lineTo(220, 320); gb.closePath(); const cg = gb.createLinearGradient(0, 150, 0, 320); cg.addColorStop(0, '#2a0f0b'); cg.addColorStop(1, '#120605'); gb.fillStyle = cg; gb.globalAlpha = 0.9; gb.fill(); gb.restore(); }
    fillStrokes(gb, (x, y) => y > 158 && y < 300 && Math.abs(x - 128) < 86, 700, ['#2e100c', '#38140f', '#260c09', '#40180f'], [5, 12], [2, 4], () => Math.PI / 2 + rr(-0.3, 0.3), [0.1, 0.22]);
    fillStrokes(gb, (x, y) => (Math.abs(y - 150 - Math.abs(x - 128) * 0.12) < 7) && Math.abs(x - 128) < 96, 700, ['#3a2213', '#5a3519', '#7a4a22', '#24150c'], [4, 9], [1.5, 3], () => rr(-0.2, 0.2), [0.4, 0.8]);
    for (const sx of [36, 220]) fillStrokes(gb, (x, y) => Math.abs(x - sx) < 7 && y > 150, 300, ['#3a2213', '#5a3519', '#24150c'], [4, 10], [1.5, 3], () => Math.PI / 2, [0.4, 0.8]); }

  // ---------- the sitter (drawn at a scale around her collar so 'close' can lean her in) ----------
  function figure(g, s) {
    g.save(); g.translate(128, 220); g.scale(s, s); g.translate(-128, -220);
    const skin = ['#d6b098', '#dcb8a0', '#cfa890', '#e0c0a8'], skinSh = ['#a57a63', '#b08068'];
    const shape = (fn, fill, a = 1) => { g.save(); g.globalAlpha = a; g.beginPath(); fn(); g.fillStyle = fill; g.fill(); g.restore(); };
    const lin = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
    const rad = (x0, y0, r0, x1, y1, r1, stops) => { const q = g.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
    // base masses (the underpainting)
    shape(() => { g.moveTo(10, 320); g.bezierCurveTo(14, 250, 50, 214, 100, 204); g.lineTo(156, 204); g.bezierCurveTo(206, 214, 242, 250, 246, 320); g.closePath(); }, lin(0, 200, 0, 320, [[0, '#262a3a'], [1, '#0e0f15']]));
    shape(() => { g.moveTo(104, 160); g.lineTo(152, 160); g.lineTo(156, 214); g.lineTo(100, 214); g.closePath(); }, lin(0, 160, 0, 214, [[0, '#8e6450'], [0.35, '#c9a088'], [1, '#d4ae96']]));
    shape(() => { g.moveTo(84, 202); g.lineTo(110, 200); g.lineTo(128, 230); g.lineTo(146, 200); g.lineTo(172, 202); g.lineTo(206, 236); g.lineTo(168, 252); g.lineTo(128, 262); g.lineTo(88, 252); g.lineTo(50, 236); g.closePath(); }, lin(60, 200, 200, 260, [[0, '#f2efe6'], [0.6, '#dcd8cc'], [1, '#b8b4a8']]));
    shape(() => { g.moveTo(110, 200); g.lineTo(128, 230); g.lineTo(146, 200); g.closePath(); }, lin(0, 200, 0, 230, [[0, '#c49c84'], [1, '#d8b49c']]));
    shape(() => { g.ellipse(128, 132, 40, 52, 0, 0, 7); }, rad(112, 112, 6, 128, 136, 58, [[0, '#ecd2bc'], [0.55, '#d6b098'], [1, '#a77c64']]));
    // dress: deep navy-black shoulders
    fillStrokes(g, (x, y) => y > 214 && Math.abs(x - 128) < 30 + (y - 204) * 1.1 && Math.abs(x - 128) < 114, 1600, ['#14161f', '#1c2030', '#0d0e14', '#262a3c'], [5, 13], [2, 4], (x) => (x < 128 ? -0.5 : 0.5) + Math.PI / 2 * 0.6, [0.15, 0.35]);
    // light catching the shoulders
    fillStrokes(g, (x, y) => y > 210 && y < 240 && Math.abs(x - 128) > 60 && Math.abs(x - 128) < 100, 260, ['#3c4460', '#4a5270'], [4, 9], [1.5, 3], (x) => x < 128 ? -0.4 : 0.4, [0.15, 0.3]);
    // neck
    fillStrokes(g, (x, y) => y > 170 && y < 206 && Math.abs(x - 128) < 22, 300, skin, [3, 7], [1.5, 3], () => Math.PI / 2, [0.1, 0.25]);
    // white open collar: two broad lapels opening into a V
    const lapel = (x, y) => { const dx = x - 128, dy = y - 198; if (dy < 0 || dy > 48) return false; const half = 16 + dy * 0.25; const outer = 44 + dy * 0.9; return Math.abs(dx) > half && Math.abs(dx) < outer && dy < 48 - Math.max(0, Math.abs(dx) - 50) * 0.6; };
    fillStrokes(g, lapel, 900, ['#efece4', '#e4e0d4', '#f7f5ee', '#d6d2c6'], [4, 10], [1.5, 3], (x) => x < 128 ? 0.75 : -0.75, [0.12, 0.3]);
    fillStrokes(g, (x, y) => lapel(x, y) && (Math.abs(x - 128) < 26 + (y - 198) * 0.3 || y > 236), 380, ['#a8a69c', '#8e8c84', '#b7b4aa'], [3, 8], [1, 2.5], (x) => x < 128 ? 0.75 : -0.75, [0.1, 0.22]); // fold shadows
    // V of the neckline (skin)
    fillStrokes(g, (x, y) => { const dy = y - 198; return dy > 0 && dy < 40 && Math.abs(x - 128) < 16 + dy * 0.25 - dy * 0.42; }, 120, skin, [3, 6], [1.2, 2.5], () => Math.PI / 2, [0.1, 0.25]);
    // ---- the face ----
    const face = inEll(128, 132, 40, 52);
    fillStrokes(g, face, 1400, skin, [3, 7], [1.2, 2.6], (x, y) => Math.atan2(y - 132, x - 128) + Math.PI / 2, [0.08, 0.2]);
    fillStrokes(g, (x, y) => face(x, y) && x > 142, 260, skinSh, [3, 7], [1.2, 2.6], (x, y) => Math.atan2(y - 132, x - 128) + Math.PI / 2, [0.06, 0.16]); // shadow side (light from the upper left)
    fillStrokes(g, (x, y) => face(x, y) && x < 118 && y < 150 && y > 100, 300, ['#f0d8c2', '#f4e0cc'], [3, 7], [1.2, 2.6], () => 1.2, [0.08, 0.2]); // lit cheek/forehead
    fillStrokes(g, inEll(110, 150, 10, 7), 120, ['#d48f80', '#c98272'], [3, 6], [1.5, 3], () => 0.3, [0.12, 0.25]); fillStrokes(g, inEll(148, 150, 9, 7), 90, ['#c27a6a'], [3, 6], [1.5, 3], () => -0.3, [0.1, 0.2]); // a little colour in the cheeks
    // age: forehead lines, crow's feet, nasolabial folds, a soft jowl, under-eye bags
    g.lineCap = 'round';
    const line = (pts, w, col, a) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + rr(-0.4, 0.4), pts[i][1] + rr(-0.4, 0.4)); g.stroke(); g.globalAlpha = 1; };
    for (let k = 0; k < 3; k++) line([[106, 100 + k * 5], [118, 98 + k * 5], [130, 99 + k * 5], [148, 101 + k * 5]], 0.8, '#9a6c55', 0.14);
    for (const sx of [-1, 1]) { const ex = 128 + sx * 25; for (let k = -1; k <= 1; k++) line([[ex + sx * 10, 126 + k * 3], [ex + sx * 16, 124 + k * 5]], 0.7, '#9a6c55', 0.16);
      line([[ex - 7, 136], [ex, 138.5], [ex + 7, 136]], 1.0, '#a57a63', 0.22); // bags
      line([[128 + sx * 9, 146], [128 + sx * 16, 156], [128 + sx * 18, 166]], 1.2, '#9a6c55', 0.24); // nasolabial
      line([[128 + sx * 20, 168], [128 + sx * 26, 176], [128 + sx * 30, 170]], 1.3, '#a57a63', 0.16); } // jowl
    // brows: thin and silvering
    for (const sx of [-1, 1]) fillStrokes(g, (x, y) => Math.abs(y - (118 - Math.abs(x - 128 - sx * 22) * -0.05 - (x - 128) * sx * 0.02)) < 2.2 && Math.abs(x - (128 + sx * 22)) < 12, 120, ['#8d8a85', '#a8a49e', '#6f6a64'], [2, 4], [0.6, 1.2], () => sx * -0.15, [0.4, 0.7]);
    // eye sockets (the eyes themselves are their own layer)
    for (const sx of [-1, 1]) fillStrokes(g, inEll(128 + sx * 21, 128, 11, 6.5), 260, ['#a97c66', '#9a6c55', '#b88a72'], [2, 5], [1, 2], () => 0, [0.25, 0.45]);
    // nose: a lit ridge and a shadowed side, nostrils
    fillStrokes(g, (x, y) => y > 126 && y < 156 && Math.abs(x - 126) < 3, 140, ['#f0d8c2', '#ebd0b8'], [2, 5], [0.8, 1.6], () => Math.PI / 2, [0.35, 0.6]);
    fillStrokes(g, (x, y) => y > 128 && y < 156 && x > 129 && x < 136, 160, skinSh, [2, 5], [0.8, 1.6], () => Math.PI / 2, [0.25, 0.45]);
    fillStrokes(g, inEll(128, 156, 9, 4), 120, ['#a8735c', '#b98a70'], [2, 4], [1, 2], () => 0, [0.3, 0.5]);
    for (const sx of [-1, 1]) { g.globalAlpha = 0.6; g.fillStyle = '#5e3a2c'; g.beginPath(); g.ellipse(128 + sx * 4.5, 157.5, 2.2, 1.3, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    // mouth: thin, closed, the corners just barely up
    fillStrokes(g, (x, y) => Math.abs(y - (170 + ((x - 128) / 13) ** 2 * -1.2)) < 1.8 && Math.abs(x - 128) < 13, 160, ['#a85e58', '#9a4f4a', '#b86e66'], [2, 4], [0.8, 1.6], () => 0, [0.5, 0.8]);
    line([[114, 169.2], [121, 170.6], [128, 170.9], [135, 170.6], [142, 169.2]], 1.0, '#5e2e28', 0.55);
    // ---- silver curls: a short set coif, high over the forehead and full at the sides ----
    const hair = (x, y) => { const top = inEll(128, 92, 50, 34)(x, y), sides = inEll(88, 118, 15, 30)(x, y) || inEll(168, 118, 15, 30)(x, y); return (top || sides) && !inEll(128, 128, 36, 30)(x, y); };
    const greys = ['#cfd2d4', '#b9bdc0', '#e6e7e5', '#9fa3a6', '#f2f2ef', '#878b8e'];
    for (let i = 0; i < 1500; i++) { const x = rr(70, 186), y = rr(54, 152); if (!hair(x, y)) continue; const r = rr(2.5, 6.5); const a0 = rr(0, 6.28);
      g.globalAlpha = rr(0.35, 0.75); g.strokeStyle = greys[(R() * greys.length) | 0]; g.lineWidth = rr(1, 2.2); g.beginPath(); g.arc(x, y, r, a0, a0 + rr(2.5, 4.8)); g.stroke(); }
    for (let i = 0; i < 380; i++) { const x = rr(70, 186), y = rr(54, 152); if (!hair(x, y)) continue; g.globalAlpha = rr(0.2, 0.4); g.fillStyle = '#5f6366'; g.beginPath(); g.arc(x, y, rr(1, 2.4), 0, 7); g.fill(); } // shadow between curls
    for (let i = 0; i < 200; i++) { const x = rr(76, 150), y = rr(58, 110); if (!hair(x, y)) continue; g.globalAlpha = rr(0.3, 0.6); g.strokeStyle = '#fbfbf8'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, rr(2, 4), 3.6, 5.2); g.stroke(); } // highlights (lit from the upper left)
    g.globalAlpha = 1;
    // ears (mostly hidden by the curls) and pearl earrings
    for (const sx of [-1, 1]) { const ex = 128 + sx * 41; fillStrokes(g, inEll(ex, 146, 4.5, 9), 70, skin, [2, 4], [1, 2], () => Math.PI / 2, [0.4, 0.7]);
      const px = ex + sx * 1.5, py = 157; const grd = g.createRadialGradient(px - 1.6, py - 1.8, 0.4, px, py, 5); grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, '#ece8dc'); grd.addColorStop(0.8, '#a9a294'); grd.addColorStop(1, '#5a554c');
      g.fillStyle = grd; g.beginPath(); g.arc(px, py, 4.6, 0, 7); g.fill(); g.globalAlpha = 0.35; g.fillStyle = '#2a2620'; g.beginPath(); g.ellipse(px + sx * 1, py + 5, 4, 1.4, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.restore();
  }
  // eyes: whites barely showing, grey-blue irises, pupil offset (dx, dy in -1..1) so they can turn toward you
  function eyes(g, s, dx, dy, dark) {
    g.save(); g.translate(128, 220); g.scale(s, s); g.translate(-128, -220);
    for (const sx of [-1, 1]) { const ex = 128 + sx * 21, ey = 128.5;
      g.fillStyle = dark ? '#3a2a24' : '#d8d0c2'; g.beginPath(); g.ellipse(ex, ey, 7.2, 3.3, 0, 0, 7); g.fill();
      const ix = ex + dx * 3.6, iy = ey + dy * 1.2; g.save(); g.beginPath(); g.ellipse(ex, ey, 7.2, 3.3, 0, 0, 7); g.clip();
      if (!dark) { g.fillStyle = '#4d5a66'; g.beginPath(); g.arc(ix, iy, 3.3, 0, 7); g.fill(); g.fillStyle = '#1a1c1e'; g.beginPath(); g.arc(ix, iy, 1.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(ix - 1.6, iy - 1.6, 1, 1); }
      else { g.fillStyle = '#0a0606'; g.beginPath(); g.arc(ix, iy, 3.6, 0, 7); g.fill(); }
      g.restore();
      g.strokeStyle = '#5e3a2c'; g.lineWidth = 1.2; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(ex, ey - 0.4, 7.4, 3.5, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); // upper lid line
      g.globalAlpha = 0.45; g.fillStyle = '#b88a72'; g.beginPath(); g.ellipse(ex, ey - 3.6, 7.6, 2.2, 0, 0, 7); g.fill(); g.globalAlpha = 1; } // heavy, hooded lids
    g.restore();
  }
  // oil-paint treatment: smear along a stroke field (sample + re-lay short strokes in the sampled colour), then craquelure, varnish and grime
  function paintify(c, g, n = 3800) {
    const d = g.getImageData(0, 0, W, H).data;
    for (let i = 0; i < n; i++) { const x = rr(0, W), y = rr(0, H); const k = ((y | 0) * W + (x | 0)) * 4; const a = Math.sin(x * 0.045) * 0.9 + Math.cos(y * 0.03) * 0.7;
      dab(g, x, y, rr(2, 5), rr(0.7, 1.5), a, hex(d[k] + rr(-4, 4), d[k + 1] + rr(-4, 4), d[k + 2] + rr(-4, 4)), rr(0.2, 0.4)); }
  }
  const [varnish, gv] = mk();
  { gv.fillStyle = 'rgba(120,90,30,0.16)'; gv.fillRect(0, 0, W, H); // yellowed varnish
    const vg = gv.createRadialGradient(128, 150, 60, 128, 160, 220); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,4,0.55)'); gv.fillStyle = vg; gv.fillRect(0, 0, W, H);
    gv.strokeStyle = 'rgba(20,14,8,0.32)'; gv.lineWidth = 0.6; for (let i = 0; i < 520; i++) { let x = rr(0, W), y = rr(0, H); gv.beginPath(); gv.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rr(-7, 7); y += rr(-7, 7); gv.lineTo(x, y); } gv.stroke(); } // craquelure
    for (let i = 0; i < 90; i++) { gv.fillStyle = `rgba(30,24,12,${rr(0.05, 0.15)})`; gv.beginPath(); gv.arc(rr(0, W), rr(0, H), rr(2, 12), 0, 7); gv.fill(); } // grime / soot
    } 
  const layers = {};
  for (const [name, s] of [['normal', 1], ['close', 1.16]]) { const [c, g] = mk(); g.drawImage(bg, 0, 0); figure(g, s); paintify(c, g); layers[name] = { c, s }; }
  { const [c, g] = mk(); g.drawImage(bg, 0, 0); paintify(c, g, 2400); layers.empty = { c, s: 1 }; }
  // the displayed canvas
  const [out, go] = mk(); const tex = new THREE.CanvasTexture(out); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 1;
  const P = { canvas: out, tex, state: '', ex: 0, ey: 0, dark: false };
  P.set = (state = 'normal', ex = 0, ey = 0, dark = false) => { ex = Math.round(ex * 4) / 4; ey = Math.round(ey * 4) / 4; if (state === P.state && ex === P.ex && ey === P.ey && dark === P.dark) return;
    P.state = state; P.ex = ex; P.ey = ey; P.dark = dark; const L = layers[state] || layers.normal; go.drawImage(L.c, 0, 0); if (state !== 'empty') eyes(go, L.s, ex, ey, dark); go.drawImage(varnish, 0, 0); tex.needsUpdate = true; };
  P.set('normal');
  return P;
}
