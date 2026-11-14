// Graphics pass 1 (dock + McLean hall): grimy, lived-in, low-res procedural textures, decals, batching helpers and the night sky.
// Everything here is ORIGINAL and generated in code at load time (canvas noise, stains, grout, rust). No downloaded or third-party art.
// Uses its own seeded RNG so the original textures in textures.js keep their exact look.
import * as THREE from 'three';

let seed = 90210;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + (b - a) * rnd();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
// crunchy look: nearest magnification (visible texels up close), mipmapped minification so distance doesn't shimmer
function tex(c, { repeat = true, nearest = true } = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; if (nearest) t.magFilter = THREE.NearestFilter; return t;
}
function noise(g, w, h, amt, chroma = 0) {
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) { const n = (rnd() - 0.5) * amt; d.data[i] += n + (rnd() - 0.5) * chroma; d.data[i + 1] += n; d.data[i + 2] += n + (rnd() - 0.5) * chroma; }
  g.putImageData(d, 0, 0);
}
function blob(g, x, y, r, color, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color.replace('A', a)); gr.addColorStop(1, color.replace('A', 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
// irregular blotch: a cluster of soft blobs (stains, oil, mildew)
function stain(g, x, y, r, color, a, n = 7) { for (let i = 0; i < n; i++) blob(g, x + R(-r, r) * 0.6, y + R(-r, r) * 0.6, r * R(0.35, 0.9), color, a * R(0.5, 1)); }
// water ring: pale-ish interior, brown tide line
function waterRing(g, x, y, r) {
  g.save(); g.translate(x, y); g.scale(1, R(0.7, 1.2));
  for (let k = 0; k < 3; k++) { const rr = r * (1 - k * 0.22); g.strokeStyle = `rgba(${110 + k * 10},${78 + k * 6},${40},${0.35 - k * 0.08})`; g.lineWidth = R(1, 2.2); g.beginPath();
    for (let a = 0; a <= 6.3; a += 0.25) { const q = rr * (1 + 0.12 * Math.sin(a * 3 + k) + R(-0.05, 0.05)); a === 0 ? g.moveTo(Math.cos(a) * q, Math.sin(a) * q) : g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.stroke(); }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(140,105,60,0.10)'); gr.addColorStop(0.85, 'rgba(120,85,45,0.22)'); gr.addColorStop(1, 'rgba(120,85,45,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  g.restore();
}
function crack(g, x, y, len, ang, color = 'rgba(20,18,16,0.75)', w = 1) {
  g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
  for (let s = 0; s < len; s += 4) { ang += R(-0.5, 0.5); x += Math.cos(ang) * 4; y += Math.sin(ang) * 4; g.lineTo(x, y); if (rnd() < 0.08) { const sx = x, sy = y; g.moveTo(sx, sy); let a2 = ang + R(-1.2, 1.2), xx = sx, yy = sy; for (let k = 0; k < 4; k++) { a2 += R(-0.4, 0.4); xx += Math.cos(a2) * 3; yy += Math.sin(a2) * 3; g.lineTo(xx, yy); } g.moveTo(x, y); } }
  g.stroke();
}
function drips(g, x, y0, len, color, a, w = 2) { const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, color.replace('A', a)); gr.addColorStop(1, color.replace('A', 0)); g.fillStyle = gr; g.fillRect(x, y0, w, len); }

// ======================= textures =======================
export const DOCK = { x0: 0, x1: 16, z0: 0, z1: 12 };
export const HALL = { x0: -6, x1: 34, z0: -33, z1: -30 };
// ceiling tile grid for the McLean hall (0.6 m lay-in tiles). Missing / sagging tiles are shared with world.js so the holes line up.
export const HALL_CEIL = { px: 50, tile: 0.6, missing: [[9, 2], [52, 1]], sag: [31, 3], leak: [[18, 1], [19, 1], [43, 3], [61, 2], [5, 4], [36, 0], [27, 2], [57, 4]] };

export function makeGrime() {
  const G = {};
  // ---- dock floor: one unique 16 x 12 m slab (3 cm texels): saw-cut joints, cracks, oil, tire scuffs, worn yellow paint, a drain ----
  { const W = 512, H = 384, s = W / 16; const [c, g] = canvas(W, H); const P = (x, z) => [x * s, z * s];
    g.fillStyle = '#6b6760'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) stain(g, R(0, W), R(0, H), R(20, 70), 'rgba(40,38,34,A)', 0.10, 4);
    for (let i = 0; i < 40; i++) stain(g, R(0, W), R(0, H), R(15, 50), 'rgba(150,146,135,A)', 0.08, 3);
    // trowel swirl + aggregate specks
    for (let i = 0; i < 2600; i++) { const v = R(50, 150); g.fillStyle = `rgba(${v},${v - 4},${v - 10},${R(0.15, 0.5)})`; g.fillRect(R(0, W), R(0, H), 1, 1); }
    // wheel lanes from the roll-up doors toward the corridor door (dirtier, polished)
    for (const x0 of [3.4, 5.6, 10.4, 12.6]) { g.strokeStyle = 'rgba(25,23,20,0.10)'; g.lineWidth = 10; g.beginPath(); g.moveTo(x0 * s, H); g.bezierCurveTo(x0 * s, 8 * s, 9 * s, 4 * s, 9.2 * s, 0); g.stroke(); }
    // tire skid marks near the doors
    for (let i = 0; i < 9; i++) { const x = R(2, 14) * s, y = R(8.5, 11.8) * s; g.strokeStyle = `rgba(15,14,13,${R(0.12, 0.28)})`; g.lineWidth = R(3, 6); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R(-40, 40), y - R(20, 60), x + R(-70, 70), y - R(40, 110)); g.stroke(); }
    // oil spots (heavier near the doors and the dumpster corner)
    for (let i = 0; i < 26; i++) { const near = rnd() < 0.7; const x = near ? R(2, 14) : R(0.5, 15.5), z = near ? R(8.5, 11.6) : R(1, 11); stain(g, x * s, z * s, R(6, 22), 'rgba(12,11,10,A)', R(0.35, 0.6), 6); }
    stain(g, ...P(1.4, 9.4), 40, 'rgba(30,26,18,A)', 0.4, 9); // dumpster juice
    // saw-cut control joints every 4 m + cracks wandering off them
    g.strokeStyle = 'rgba(18,17,15,0.85)'; g.lineWidth = 1.4; for (let x = 4; x < 16; x += 4) { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, H); g.stroke(); } for (let z = 4; z < 12; z += 4) { g.beginPath(); g.moveTo(0, z * s); g.lineTo(W, z * s); g.stroke(); }
    for (let i = 0; i < 14; i++) crack(g, R(0, W), R(0, H), R(40, 160), R(0, 6.3), 'rgba(20,18,15,0.7)', 1);
    // spalled patches
    for (let i = 0; i < 6; i++) { const x = R(20, W - 20), y = R(20, H - 20); g.fillStyle = 'rgba(50,47,42,0.6)'; g.beginPath(); for (let a = 0; a < 6.3; a += 0.7) g.lineTo(x + Math.cos(a) * R(4, 11), y + Math.sin(a) * R(3, 9)); g.fill(); }
    // worn yellow paint: keep-clear hatch in front of the corridor door, stripes at the dock doors, a walkway line to the lot door
    const paint = (x0, y0, x1, y1, wear = 0.45) => { for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (rnd() > wear * R(0.4, 1.4)) { g.fillStyle = `rgba(${200 + R(-20, 20)},${160 + R(-20, 20)},${40},${R(0.55, 0.9)})`; g.fillRect(x, y, 1, 1); } };
    paint(8 * s, 0.1 * s, 10.4 * s, 0.22 * s); paint(8 * s, 1.55 * s, 10.4 * s, 1.67 * s); paint(8 * s, 0.1 * s, 8.12 * s, 1.67 * s); paint(10.28 * s, 0.1 * s, 10.4 * s, 1.67 * s);
    g.save(); g.beginPath(); g.rect(8.1 * s, 0.2 * s, 2.2 * s, 1.36 * s); g.clip(); for (let k = -6; k < 12; k++) { g.save(); g.translate(8 * s + k * 10, 0); g.rotate(-0.7); g.restore(); }
    for (let k = 0; k < 9; k++) { const x = 8.1 * s + k * 9; for (let t = 0; t < 44; t++) { if (rnd() < 0.35) continue; g.fillStyle = `rgba(205,165,45,${R(0.5, 0.85)})`; g.fillRect(x + t * 0.9, 0.2 * s + t, 3, 1); } } g.restore();
    for (const x0 of [2, 9]) { paint((x0 - 0.15) * s, 9.55 * s, (x0 + 5.15) * s, 9.68 * s, 0.55); }
    paint(13.0 * s, 10.25 * s, 15.9 * s, 10.35 * s, 0.6);
    // floor drain in the middle (with a rust halo) + wet patch around it
    { const [x, y] = P(8, 6.2); stain(g, x, y, 34, 'rgba(25,24,22,A)', 0.35, 7); stain(g, x, y, 16, 'rgba(90,50,20,A)', 0.35, 5); g.fillStyle = '#1a1917'; g.fillRect(x - 8, y - 8, 16, 16); g.fillStyle = '#3a3936'; for (let k = -6; k <= 6; k += 3) g.fillRect(x - 7, y + k, 14, 1); }
    // cigarette butts by the time clock (Clint's spot)
    for (let i = 0; i < 26; i++) { const x = R(0.3, 1.9) * s, y = R(3.2, 5.8) * s; g.fillStyle = rnd() < 0.5 ? '#d8d2c0' : '#b8803a'; g.fillRect(x, y, 2, 1); g.fillStyle = 'rgba(10,10,10,0.25)'; g.fillRect(x - 1, y + 1, 3, 1); }
    // dust and grime piled against the walls
    const edge = (x0, y0, x1, y1, horiz) => { const gr = horiz ? g.createLinearGradient(0, y0, 0, y1) : g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(20,18,15,0.55)'); gr.addColorStop(1, 'rgba(20,18,15,0)'); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || W, Math.abs(y1 - y0) || H); };
    edge(0, 0, W, 14, true); { const gr = g.createLinearGradient(0, H, 0, H - 14); gr.addColorStop(0, 'rgba(20,18,15,0.55)'); gr.addColorStop(1, 'rgba(20,18,15,0)'); g.fillStyle = gr; g.fillRect(0, H - 14, W, 14); }
    { const gr = g.createLinearGradient(0, 0, 14, 0); gr.addColorStop(0, 'rgba(20,18,15,0.55)'); gr.addColorStop(1, 'rgba(20,18,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, 14, H); }
    { const gr = g.createLinearGradient(W, 0, W - 14, 0); gr.addColorStop(0, 'rgba(20,18,15,0.55)'); gr.addColorStop(1, 'rgba(20,18,15,0)'); g.fillStyle = gr; g.fillRect(W - 14, 0, 14, H); }
    noise(g, W, H, 22, 4); G.dockFloor = tex(c, { repeat: false }); }

  // ---- dock walls: painted CMU 4 m wide x 5.5 m tall (u repeats, v = height): grime at the base, rain stains from the top, peeling paint, rust bleed ----
  { const W = 256, H = 352, s = W / 4; const [c, g] = canvas(W, H);
    g.fillStyle = '#a19d90'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < H / (0.2 * s); r++) { const y = H - (r + 1) * 0.2 * s; const off = r % 2 ? 0.2 * s : 0;
      for (let k = -1; k < 11; k++) { const x = off + k * 0.4 * s; g.fillStyle = `rgba(${R(140, 175)},${R(135, 170)},${R(120, 155)},0.25)`; g.fillRect(x + 1, y + 1, 0.4 * s - 2, 0.2 * s - 2); }
      g.fillStyle = 'rgba(70,66,58,0.55)'; g.fillRect(0, y, W, 1.4); for (let k = -1; k < 11; k++) g.fillRect(off + k * 0.4 * s, y, 1.4, 0.2 * s); }
    // peeling paint patches showing bare gray block
    for (let i = 0; i < 18; i++) { const x = R(0, W), y = R(H * 0.3, H); g.fillStyle = 'rgba(105,103,98,0.7)'; g.beginPath(); for (let a = 0; a < 6.3; a += 0.5) g.lineTo(x + Math.cos(a) * R(3, 12), y + Math.sin(a) * R(2, 8)); g.fill(); g.strokeStyle = 'rgba(210,205,190,0.5)'; g.lineWidth = 1; g.stroke(); }
    // rain / water streaks from the top coping, rust bleeding from anchors
    for (let i = 0; i < 26; i++) drips(g, R(0, W), 0, R(40, 220), 'rgba(45,40,34,A)', R(0.15, 0.4), R(1, 4));
    for (let i = 0; i < 5; i++) { const x = R(0, W), y = R(40, 200); g.fillStyle = '#4a2a14'; g.fillRect(x - 1, y - 1, 3, 3); drips(g, x - 1, y, R(20, 70), 'rgba(120,58,20,A)', 0.5, 3); }
    // grime band at the base (splash-back, forklift scuffs), black rubber marks
    { const gr = g.createLinearGradient(0, H, 0, H - 1.2 * s); gr.addColorStop(0, 'rgba(25,22,18,0.75)'); gr.addColorStop(0.4, 'rgba(35,31,26,0.35)'); gr.addColorStop(1, 'rgba(35,31,26,0)'); g.fillStyle = gr; g.fillRect(0, H - 1.2 * s, W, 1.2 * s); }
    for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(10,10,10,${R(0.25, 0.55)})`; g.lineWidth = R(1, 3); const x = R(0, W), y = H - R(0.25, 0.9) * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(10, 40), y + R(-3, 3)); g.stroke(); }
    { const gr = g.createLinearGradient(0, 0, 0, 0.5 * s); gr.addColorStop(0, 'rgba(30,28,24,0.6)'); gr.addColorStop(1, 'rgba(30,28,24,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 0.5 * s); }
    for (let i = 0; i < 10; i++) stain(g, R(0, W), R(0, H), R(10, 30), 'rgba(60,64,50,A)', 0.12, 4); // mildew
    noise(g, W, H, 18, 3); G.dockBlock = tex(c); }

  // ---- roll-up dock door: faded galvanized slats, rust creeping up from the bottom and down the seams, dents, a kick-plate of grime (5 x 4 m) ----
  { const W = 320, H = 256, s = W / 5; const [c, g] = canvas(W, H);
    g.fillStyle = '#7c8380'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 7) { g.fillStyle = 'rgba(40,44,44,0.65)'; g.fillRect(0, y, W, 1); g.fillStyle = 'rgba(190,196,192,0.35)'; g.fillRect(0, y + 1, W, 1); g.fillStyle = `rgba(${R(90, 130)},${R(95, 135)},${R(95, 130)},0.25)`; g.fillRect(0, y + 2, W, 4); }
    for (let i = 0; i < 40; i++) { const x = R(0, W); const gr = g.createLinearGradient(0, H, 0, H - R(30, 140)); gr.addColorStop(0, 'rgba(120,55,18,0.7)'); gr.addColorStop(1, 'rgba(120,55,18,0)'); g.fillStyle = gr; g.fillRect(x, 0, R(2, 9), H); }
    for (let i = 0; i < 30; i++) drips(g, R(0, W), Math.floor(R(0, H / 7)) * 7 + 2, R(10, 50), 'rgba(110,50,15,A)', 0.45, R(1, 3));
    for (let i = 0; i < 12; i++) stain(g, R(0, W), R(0, H), R(6, 18), 'rgba(30,32,32,A)', 0.4, 4); // dents (shadowed)
    { const gr = g.createLinearGradient(0, H, 0, H - 0.6 * s); gr.addColorStop(0, 'rgba(20,16,12,0.8)'); gr.addColorStop(1, 'rgba(20,16,12,0)'); g.fillStyle = gr; g.fillRect(0, H - 0.6 * s, W, 0.6 * s); }
    g.fillStyle = '#2a2622'; g.fillRect(W * 0.46, H - 0.95 * s, W * 0.08, 0.1 * s); // lift handle
    noise(g, W, H, 20, 4); G.rollup = tex(c, { repeat: false }); }

  // ---- corrugated canopy deck (underside), dark galvanized with rust spots ----
  { const [c, g] = canvas(64, 64); g.fillStyle = '#4b504f'; g.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 8) { g.fillStyle = 'rgba(15,16,16,0.6)'; g.fillRect(x, 0, 2, 64); g.fillStyle = 'rgba(140,145,140,0.3)'; g.fillRect(x + 4, 0, 1, 64); }
    for (let i = 0; i < 6; i++) stain(g, R(0, 64), R(0, 64), R(3, 9), 'rgba(110,50,15,A)', 0.4, 3); noise(g, 64, 64, 18); G.corrugated = tex(c); }

  // ---- dumpster: chipped green paint, rust, a white stencil ----
  { const [c, g] = canvas(128, 96); g.fillStyle = '#2e4632'; g.fillRect(0, 0, 128, 96);
    for (let i = 0; i < 30; i++) stain(g, R(0, 128), R(0, 96), R(3, 12), 'rgba(105,52,18,A)', 0.55, 4);
    for (let i = 0; i < 25; i++) { g.strokeStyle = `rgba(160,170,150,${R(0.15, 0.35)})`; g.lineWidth = 1; const x = R(0, 128), y = R(0, 96); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-14, 14), y + R(-4, 4)); g.stroke(); }
    { const gr = g.createLinearGradient(0, 96, 0, 60); gr.addColorStop(0, 'rgba(60,30,10,0.7)'); gr.addColorStop(1, 'rgba(60,30,10,0)'); g.fillStyle = gr; g.fillRect(0, 60, 128, 36); }
    g.fillStyle = 'rgba(225,225,215,0.75)'; g.font = 'bold 13px monospace'; g.fillText('NO HOT ASHES', 16, 40); g.fillText('RIZZO 4', 36, 56);
    noise(g, 128, 96, 18, 4); G.dumpster = tex(c); }
  // ---- cardboard (tape, stamps) ----
  { const [c, g] = canvas(64, 64); g.fillStyle = '#9c7748'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 3) { g.fillStyle = 'rgba(70,50,25,0.12)'; g.fillRect(0, i, 64, 1); }
    g.fillStyle = 'rgba(200,180,140,0.55)'; g.fillRect(28, 0, 9, 64); g.strokeStyle = 'rgba(40,30,20,0.6)'; g.strokeRect(6, 40, 18, 14); g.fillStyle = 'rgba(40,30,20,0.55)'; g.fillRect(9, 44, 12, 2); g.fillRect(9, 48, 9, 2);
    stain(g, 48, 52, 10, 'rgba(60,40,20,A)', 0.35, 4); noise(g, 64, 64, 16); G.cardboard = tex(c); }
  // ---- weathered pallet / scrap wood ----
  { const [c, g] = canvas(64, 64); g.fillStyle = '#857559'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(50,40,28,${R(0.15, 0.4)})`; g.beginPath(); const y = R(0, 64); g.moveTo(0, y); g.lineTo(64, y + R(-3, 3)); g.stroke(); }
    for (let i = 0; i < 5; i++) stain(g, R(0, 64), R(0, 64), R(4, 10), 'rgba(35,30,22,A)', 0.4, 3); noise(g, 64, 64, 20); G.palletWood = tex(c); }
  // ---- rusty steel (drums, brackets) ----
  { const [c, g] = canvas(64, 64); g.fillStyle = '#3b4a5a'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 25; i++) stain(g, R(0, 64), R(0, 64), R(3, 10), 'rgba(115,55,18,A)', 0.6, 3); for (let y = 10; y < 64; y += 22) { g.fillStyle = 'rgba(20,20,20,0.5)'; g.fillRect(0, y, 64, 2); } noise(g, 64, 64, 18); G.drum = tex(c); }

  // ---- McLean carpet: one unique 40 x 3 m runner (3 cm texels): dated burgundy/gold lattice, a worn traffic lane, stains, dust at the walls ----
  { const W = 1280, H = 96, s = W / 40; const [c, g] = canvas(W, H);
    g.fillStyle = '#3a2326'; g.fillRect(0, 0, W, H);
    const p = 16; // ~0.5 m lattice
    for (let y = -p; y < H + p; y += p) for (let x = 0; x < W + p; x += p) { const ox = (Math.floor(y / p) % 2) ? p / 2 : 0;
      g.strokeStyle = 'rgba(150,118,62,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + p / 2, y + p / 2); g.lineTo(x + ox, y + p); g.lineTo(x + ox - p / 2, y + p / 2); g.closePath(); g.stroke();
      g.fillStyle = 'rgba(40,70,72,0.55)'; g.fillRect(x + ox - 1, y + p / 2 - 1, 2, 2); }
    g.strokeStyle = 'rgba(150,118,62,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 7); g.lineTo(W, 7); g.moveTo(0, H - 7); g.lineTo(W, H - 7); g.stroke(); // border
    // worn lane down the middle: flattened, faded pile
    { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0.2, 'rgba(120,100,95,0)'); gr.addColorStop(0.5, 'rgba(120,100,95,0.28)'); gr.addColorStop(0.8, 'rgba(120,100,95,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(150,130,120,${R(0.05, 0.2)})`; g.fillRect(R(0, W), H / 2 + R(-22, 22), R(2, 6), 1); }
    // stains: coffee, something darker, a bleach spot, wheel tracks from carts
    for (let i = 0; i < 34; i++) stain(g, R(0, W), R(6, H - 6), R(3, 11), 'rgba(18,10,8,A)', R(0.3, 0.6), 5);
    for (let i = 0; i < 8; i++) stain(g, R(0, W), R(10, H - 10), R(4, 8), 'rgba(170,140,110,A)', 0.35, 4);
    for (let i = 0; i < 4; i++) stain(g, R(0, W), R(10, H - 10), R(6, 12), 'rgba(70,20,14,A)', 0.4, 5);
    for (const y of [H / 2 - 9, H / 2 + 9]) { g.strokeStyle = 'rgba(15,10,10,0.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x < W; x += 40) g.lineTo(x, y + R(-2, 2)); g.stroke(); }
    { for (const [y0, y1] of [[0, 9], [H, H - 9]]) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(10,8,8,0.7)'); gr.addColorStop(1, 'rgba(10,8,8,0)'); g.fillStyle = gr; g.fillRect(0, Math.min(y0, y1), W, 9); } }
    noise(g, W, H, 20, 6); G.hallCarpet = tex(c, { repeat: false }); }

  // ---- McLean ceiling: unique 40 x 3 m field of yellowed 0.6 m lay-in tiles; water rings, a big leak, mildew dots, two missing tiles (black plenum) ----
  { const C = HALL_CEIL, W = 40 * C.px, H = 3 * C.px, t = C.tile * C.px; const [c, g] = canvas(W, H);
    g.fillStyle = '#c7c0ab'; g.fillRect(0, 0, W, H);
    const nx = Math.round(40 / C.tile), nz = 5;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = i * t, y = j * t; const v = R(-12, 8); g.fillStyle = `rgb(${199 + v},${192 + v},${171 + v * 1.2})`; g.fillRect(x, y, t, t);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(90,85,70,${R(0.2, 0.5)})`; g.fillRect(x + R(1, t - 2), y + R(1, t - 2), 1, 1); } }
    for (const [i, j] of C.leak) { waterRing(g, (i + R(0.3, 0.7)) * t, (j + R(0.3, 0.7)) * t, R(0.25, 0.5) * t); }
    waterRing(g, 18.9 * t, 1.5 * t, 1.1 * t); stain(g, 18.9 * t, 1.5 * t, 0.8 * t, 'rgba(100,70,35,A)', 0.25, 6); // the pantry leak, spreading over 2-3 tiles
    for (let i = 0; i < 12; i++) { const x = R(0, W), y = R(0, H); for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(30,32,25,${R(0.3, 0.7)})`; g.fillRect(x + R(-6, 6), y + R(-6, 6), 1, 1); } }
    // grid T-bar (dirty)
    for (let i = 0; i <= nx; i++) { g.fillStyle = 'rgba(95,90,78,0.9)'; g.fillRect(i * t - 1, 0, 2, H); } for (let j = 0; j <= nz; j++) { g.fillStyle = 'rgba(95,90,78,0.9)'; g.fillRect(0, j * t - 1, W, 2); }
    // missing tiles + the sagging tile's empty slot: black plenum with a hint of duct
    for (const [i, j] of [...C.missing, C.sag]) { g.fillStyle = '#060606'; g.fillRect(i * t + 1, j * t + 1, t - 2, t - 2); g.fillStyle = 'rgba(70,70,68,0.6)'; g.fillRect(i * t + 3, j * t + t * 0.35, t - 6, 3); }
    // dirt at the wall edges
    for (const [y0, y1] of [[0, 8], [H, H - 8]]) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(60,50,35,0.55)'); gr.addColorStop(1, 'rgba(60,50,35,0)'); g.fillStyle = gr; g.fillRect(0, Math.min(y0, y1), W, 8); }
    noise(g, W, H, 12, 3); G.hallCeil = tex(c, { repeat: false }); }
  // single loose ceiling tile (sagging, soaked)
  { const [c, g] = canvas(32, 32); g.fillStyle = '#a89c80'; g.fillRect(0, 0, 32, 32); waterRing(g, 16, 16, 13); stain(g, 16, 18, 10, 'rgba(80,55,25,A)', 0.4, 5); noise(g, 32, 32, 14); G.sagTile = tex(c, { repeat: false }); }

  // ---- McLean wall above the chair rail: 4.8 m x 1.8 m (v = height above the rail): roller-textured paint, yellowing at the top, ceiling-leak streaks, scuffs, hand smudges ----
  { const W = 768, H = 144, s = W / 9.6; const [c, g] = canvas(W, H); // pass 2: 9.6 m wide so the repeat doesn't read, and dirtier up close
    g.fillStyle = '#c4b89e'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,235' : '90,80,60'},${R(0.03, 0.07)})`; g.fillRect(R(0, W), 0, R(4, 14), H); } // roller laps
    { const gr = g.createLinearGradient(0, 0, 0, 0.6 * s); gr.addColorStop(0, 'rgba(110,85,40,0.5)'); gr.addColorStop(1, 'rgba(110,85,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 0.7 * s); }
    for (let i = 0; i < 2600; i++) { const v = rnd() < 0.6 ? R(60, 110) : R(200, 240); g.fillStyle = `rgba(${v},${v - 8},${v - 20},${R(0.12, 0.4)})`; g.fillRect(R(0, W) | 0, R(0, H) | 0, 1, 1); } // grit, pinholes
    for (let i = 0; i < 26; i++) { const x = R(0, W), y = R(0, H); g.fillStyle = 'rgba(150,140,120,0.7)'; g.fillRect(x, y, R(2, 6), R(1, 4)); g.fillStyle = 'rgba(60,50,40,0.5)'; g.fillRect(x, y + 3, R(2, 6), 1); } // dings + chipped paint
    for (let i = 0; i < 9; i++) { const x = R(0, W), y = H - R(0.25, 0.75) * s; stain(g, x, y, 7, 'rgba(60,48,34,A)', 0.3, 4); for (let f = 0; f < 4; f++) blob(g, x - 6 + f * 4, y - 9, 2.5, 'rgba(60,48,34,A)', 0.28); } // hand prints by the doors
    for (let i = 0; i < 20; i++) { const x = R(0, W); drips(g, x, 0, R(30, 120), 'rgba(100,70,35,A)', R(0.3, 0.55), R(2, 6)); drips(g, x + R(3, 8), 0, R(10, 50), 'rgba(110,80,40,A)', 0.2, 2); }
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(40,35,30,${R(0.12, 0.35)})`; g.lineWidth = R(1, 2.5); const x = R(0, W), y = H - R(0.02, 0.5) * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(8, 40), y + R(-2, 2)); g.stroke(); }
    for (let i = 0; i < 30; i++) stain(g, R(0, W), H - R(0.1, 0.7) * s, R(5, 14), 'rgba(70,58,42,A)', 0.3, 5); // hand smudges / cart bumps
    for (let i = 0; i < 16; i++) stain(g, R(0, W), R(0, H), R(12, 30), 'rgba(110,90,55,A)', 0.2, 6);
    { const gr = g.createLinearGradient(0, H, 0, H - 0.35 * s); gr.addColorStop(0, 'rgba(60,50,38,0.35)'); gr.addColorStop(1, 'rgba(60,50,38,0)'); g.fillStyle = gr; g.fillRect(0, H - 0.35 * s, W, 0.35 * s); }
    noise(g, W, H, 12, 3); G.hallWall = tex(c); }
  // ---- McLean wainscot (0.95 m, v = height): off-white raised panels 1.2 m wide, kick marks, vacuum dings, gray grime at the floor ----
  { const W = 768, H = 76, s = W / 9.6; const [c, g] = canvas(W, H);
    g.fillStyle = '#cdc6b4'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 8; k++) { const x = k * 1.2 * s; g.fillStyle = 'rgba(80,72,58,0.45)'; g.fillRect(x + 0.12 * s, 0.18 * s, 0.96 * s, 1); g.fillRect(x + 0.12 * s, 0.18 * s, 1, 0.6 * s); g.fillStyle = 'rgba(255,252,240,0.4)'; g.fillRect(x + 0.12 * s, 0.78 * s, 0.96 * s, 1); g.fillRect(x + 1.08 * s, 0.18 * s, 1, 0.6 * s);
      g.fillStyle = 'rgba(60,55,45,0.25)'; g.fillRect(x, 0, 1, H); }
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(20,18,16,${R(0.2, 0.55)})`; g.lineWidth = R(1, 2.5); const x = R(0, W), y = H - R(0.03, 0.3) * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(4, 22), y + R(-3, 2)); g.stroke(); }
    for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(120,85,50,0.55)'; g.fillRect(R(0, W), H - R(0.05, 0.2) * s, R(2, 5), R(1, 3)); } // chips to wood
    { const gr = g.createLinearGradient(0, H, 0, H - 0.25 * s); gr.addColorStop(0, 'rgba(40,36,30,0.6)'); gr.addColorStop(1, 'rgba(40,36,30,0)'); g.fillStyle = gr; g.fillRect(0, H - 0.25 * s, W, 0.25 * s); }
    noise(g, W, H, 12, 3); G.hallWains = tex(c); }
  // dingy painted trim (casings, rail, crown, base)
  { const [c, g] = canvas(32, 32); g.fillStyle = '#d6cfbd'; g.fillRect(0, 0, 32, 32); for (let i = 0; i < 6; i++) stain(g, R(0, 32), R(0, 32), R(3, 8), 'rgba(90,80,60,A)', 0.18, 3); noise(g, 32, 32, 12); G.trim = tex(c); }

  // ---- decal atlas 4x4 (128 px cells), alpha stains for walls / floors / ceilings, plus soft contact-shadow gradients ----
  { const S = 128, [c, g] = canvas(S * 4, S * 4); g.clearRect(0, 0, S * 4, S * 4);
    const cell = (k, fn) => { const x = (k % 4) * S, y = Math.floor(k / 4) * S; g.save(); g.beginPath(); g.rect(x, y, S, S); g.clip(); g.translate(x, y); fn(); g.restore(); };
    cell(0, () => { waterRing(g, 64, 64, 44); waterRing(g, 70, 60, 26); });                          // water ring
    cell(1, () => { for (let i = 0; i < 9; i++) drips(g, R(20, 108), 0, R(40, 128), 'rgba(80,58,30,A)', R(0.3, 0.6), R(2, 6)); }); // leak streaks (top-anchored)
    cell(2, () => { for (let i = 0; i < 16; i++) { g.strokeStyle = `rgba(20,18,16,${R(0.2, 0.6)})`; g.lineWidth = R(1, 4); const y = R(40, 90), x = R(0, 60); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(30, 68), y + R(-6, 6)); g.stroke(); } }); // scuffs
    cell(3, () => { for (let i = 0; i < 5; i++) { const x = R(30, 98), y = R(30, 98); stain(g, x, y, 12, 'rgba(50,40,30,A)', 0.35, 4); for (let f = 0; f < 4; f++) blob(g, x - 9 + f * 6, y - 14, 4, 'rgba(50,40,30,A)', 0.3); } }); // hand smudges
    cell(4, () => { for (let i = 0; i < 60; i++) blob(g, R(0, 128) * R(0.3, 1), R(0, 128) * R(0.3, 1), R(2, 9), 'rgba(25,32,22,A)', R(0.2, 0.55)); }); // mildew (corner-weighted)
    cell(5, () => { stain(g, 64, 64, 40, 'rgba(8,8,7,A)', 0.65, 10); stain(g, 64, 64, 22, 'rgba(15,12,10,A)', 0.5, 6); });  // oil spot
    cell(6, () => { for (let k = 0; k < 2; k++) { g.strokeStyle = 'rgba(10,10,10,0.35)'; g.lineWidth = 12; g.beginPath(); g.moveTo(30 + k * 52, 128); g.bezierCurveTo(32 + k * 52, 80, 50 + k * 40, 40, 60 + k * 30, 0); g.stroke(); } }); // tire skid
    cell(7, () => { crack(g, 4, 64, 160, 0, 'rgba(15,13,11,0.85)', 1.5); crack(g, 60, 64, 60, 1.2, 'rgba(15,13,11,0.7)', 1); }); // crack
    cell(8, () => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); // contact shadow (dark at v=0)
    cell(9, () => { for (let i = 0; i < 6; i++) { const x = R(20, 108); g.fillStyle = 'rgba(70,32,10,0.8)'; g.fillRect(x - 2, 0, 5, 5); drips(g, x - 1, 3, R(50, 125), 'rgba(120,55,18,A)', 0.6, R(2, 4)); } }); // rust bleed
    cell(10, () => { for (let i = 0; i < 18; i++) { g.save(); g.translate(R(10, 118), R(10, 118)); g.rotate(R(0, 6.3)); g.fillStyle = '#e2dccb'; g.fillRect(-4, -1, 7, 2.5); g.fillStyle = '#c08a40'; g.fillRect(3, -1, 3, 2.5); g.restore(); } stain(g, 64, 64, 40, 'rgba(30,30,30,A)', 0.15, 6); }); // cigarette butts + ash
    cell(11, () => { stain(g, 64, 64, 54, 'rgba(10,12,14,A)', 0.55, 12); });                                   // wet patch
    cell(12, () => { const gr = g.createLinearGradient(0, 128, 0, 30); gr.addColorStop(0, 'rgba(30,26,20,0.7)'); gr.addColorStop(1, 'rgba(30,26,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 80; i++) blob(g, R(0, 128), R(70, 128), R(1, 4), 'rgba(30,26,20,A)', 0.5); }); // splash grime
    cell(13, () => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); // blob shadow
    cell(14, () => { g.fillStyle = 'rgba(225,220,205,0.95)'; g.save(); g.translate(64, 64); g.rotate(0.4); g.fillRect(-18, -26, 36, 52); g.fillStyle = 'rgba(60,60,60,0.6)'; for (let k = 0; k < 8; k++) g.fillRect(-14, -20 + k * 5, R(14, 28), 1.5); g.restore(); }); // a dropped receipt
    cell(15, () => { stain(g, 64, 40, 50, 'rgba(105,75,40,A)', 0.35, 10); waterRing(g, 64, 40, 50); for (let i = 0; i < 6; i++) drips(g, R(30, 98), 50, R(30, 78), 'rgba(105,75,40,A)', 0.35, R(2, 5)); }); // water damage bloom
    G.decals = tex(c, { repeat: false, nearest: false }); }
  return G;
}

// ======================= helpers =======================
// planar world-space UVs: fn(x, y, z, axis) -> [u, v], axis = dominant normal axis 'x' | 'y' | 'z'
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();
export function planarUV(mesh, fn) {
  mesh.updateMatrixWorld(true); const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv; _m3.getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < pos.count; i++) { _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); _n.fromBufferAttribute(nor, i).applyMatrix3(_m3);
    const ax = Math.abs(_n.x) > 0.5 ? 'x' : Math.abs(_n.y) > 0.5 ? 'y' : 'z'; const [u, v] = fn(_v.x, _v.y, _v.z, ax, _n); uv.setXY(i, u, v); }
  uv.needsUpdate = true;
}

// Static batcher: collects geometry per material and merges it into one mesh per material (one draw call each).
export class Batch {
  constructor(scene) { this.scene = scene; this.parts = new Map(); this.meshes = []; }
  add(geo, mat, matrix, dispose = true) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); if (matrix) g.applyMatrix4(matrix); if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(g); if (dispose) geo.dispose(); return g; }
  addMesh(m) { m.updateMatrixWorld(true); this.add(m.geometry, m.material, m.matrixWorld); }
  flush(opts = {}) {
    for (const [mat, list] of this.parts) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      for (const g of list) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(P, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(U, 2)); bg.computeBoundingSphere(); bg.computeBoundingBox();
      const m = new THREE.Mesh(bg, mat); m.matrixAutoUpdate = false; m.updateMatrix(); m.userData.batched = true; if (opts.name) m.name = opts.name; if (opts.renderOrder) m.renderOrder = opts.renderOrder;
      this.scene.add(m); this.meshes.push(m);
    }
    this.parts.clear(); return this.meshes;
  }
}

// Decal quads from the 4x4 atlas, batched into one mesh. face: 'n'|'s'|'e'|'w' wall facing (+z, -z, +x, -x), 'up' (floor), 'down' (ceiling)
export class Decals {
  constructor(scene, map) {
    this.mat = new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    this.scene = scene; this.P = []; this.N = []; this.U = [];
  }
  add(cx, cy, cz, face, w, h, cellIdx, rot = 0, flip = false) {
    const cu = (cellIdx % 4) / 4, cv = 1 - (Math.floor(cellIdx / 4) + 1) / 4, inset = 0.002; const off = 0.004;
    let nx = 0, ny = 0, nz = 0, ux, vx; // basis: right (u) and up (v) vectors in world
    switch (face) { case 'n': nz = 1; ux = [1, 0, 0]; vx = [0, 1, 0]; break; case 's': nz = -1; ux = [-1, 0, 0]; vx = [0, 1, 0]; break; case 'e': nx = -1; ux = [0, 0, 1]; vx = [0, 1, 0]; break; case 'w': nx = 1; ux = [0, 0, -1]; vx = [0, 1, 0]; break;
      case 'up': ny = 1; ux = [1, 0, 0]; vx = [0, 0, -1]; break; default: ny = -1; ux = [1, 0, 0]; vx = [0, 0, 1]; }
    if (rot) { const c = Math.cos(rot), s = Math.sin(rot); const u2 = ux.map((a, i) => a * c + vx[i] * s), v2 = vx.map((a, i) => -ux[i] * s + a * c); ux = u2; vx = v2; }
    const ox = cx + nx * off, oy = cy + ny * off, oz = cz + nz * off; const hw = w / 2, hh = h / 2;
    const corner = (a, b) => [ox + ux[0] * a * hw + vx[0] * b * hh, oy + ux[1] * a * hw + vx[1] * b * hh, oz + ux[2] * a * hw + vx[2] * b * hh];
    const u0 = cu + inset, u1 = cu + 0.25 - inset, v0 = cv + inset, v1 = cv + 0.25 - inset; const A = flip ? [u1, u0] : [u0, u1];
    const q = [[corner(-1, -1), A[0], v0], [corner(1, -1), A[1], v0], [corner(1, 1), A[1], v1], [corner(-1, -1), A[0], v0], [corner(1, 1), A[1], v1], [corner(-1, 1), A[0], v1]];
    for (const [p, u, v] of q) { this.P.push(...p); this.N.push(nx, ny, nz); this.U.push(u, v); }
  }
  // contact shadow strip along a wall base (wall face + floor). face = the way the wall faces.
  wallBase(x0, z0, x1, z1, face, y = 0, hWall = 0.32, wFloor = 0.3) {
    const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.add(cx, y + hWall / 2, cz, face, len, hWall, 8);
    const d = { n: [0, 1], s: [0, -1], e: [-1, 0], w: [1, 0] }[face], rot = { n: Math.PI, s: 0, w: -Math.PI / 2, e: Math.PI / 2 }[face];
    this.add(cx + d[0] * wFloor / 2, y + 0.002, cz + d[1] * wFloor / 2, 'up', len, wFloor, 8, rot);
  }
  // darkening where wall meets ceiling (dark at the top)
  wallTop(x0, z0, x1, z1, face, top, h = 0.35) { const len = Math.hypot(x1 - x0, z1 - z0); this.add((x0 + x1) / 2, top - h / 2, (z0 + z1) / 2, face, len, h, 8, Math.PI); }
  flush() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.mat); m.renderOrder = 1; m.userData.decals = true; m.matrixAutoUpdate = false; this.scene.add(m); return m; }
}

// ======================= night sky (follows the camera, so it never parallaxes) =======================
// Christmas Eve 2026 really is a full moon. Moon sits SSE, ~40 degrees up, so it reads over the dock's south wall.
export const MOON_DIR = new THREE.Vector3(Math.sin(0.35) * Math.cos(0.7), Math.sin(0.7), Math.cos(0.35) * Math.cos(0.7)).normalize();
export function buildNightSky(scene) {
  const S = new THREE.Group(); S.name = 'nightSky'; scene.add(S); const RAD = 150;
  // gradient dome: blue-black zenith, a faint hazy horizon (town glow), brighter around the moon
  { const g = new THREE.SphereGeometry(RAD, 40, 20); const p = g.attributes.position, col = [];
    const zen = new THREE.Color(0x03050b), mid = new THREE.Color(0x0a1122), hor = new THREE.Color(0x1d2232), town = new THREE.Color(0x2a2626), moonC = new THREE.Color(0x24324c), below = new THREE.Color(0x07080a); const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const e = v.y; const c = zen.clone().lerp(mid, Math.pow(1 - Math.max(0, e), 2.5));
      c.lerp(hor, Math.pow(1 - Math.max(0, e), 9)); if (v.x < -0.2 || v.z < -0.3) c.lerp(town, Math.pow(1 - Math.max(0, e), 14) * 0.6);
      const m = Math.max(0, v.dot(MOON_DIR)); c.lerp(moonC, Math.pow(m, 10) * 0.8);
      if (e < 0) c.copy(below); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; dome.frustumCulled = false; S.add(dome); }
  // stars: one Points draw call, faint, none right next to the moon (it washes them out)
  { const n = 520, P = [], C = []; const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { do { v.set(R(-1, 1), R(0.05, 1), R(-1, 1)); } while (v.lengthSq() > 1 || v.lengthSq() < 0.05); v.normalize(); if (v.dot(MOON_DIR) > 0.93 && rnd() < 0.9) continue;
      v.multiplyScalar(RAD * 0.95); P.push(v.x, v.y, v.z); const b = Math.pow(rnd(), 4) * 0.7 + 0.08; const tint = rnd(); C.push(b * (tint < 0.2 ? 1.0 : 0.85), b * 0.9, b * (tint > 0.8 ? 1.0 : 0.85)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })); st.renderOrder = -9; st.frustumCulled = false; S.add(st); S.userData.stars = st; }
  // moon: halo + disc (original procedural maria), sprites
  { const [c, g] = canvas(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(200,215,255,0.55)'); gr.addColorStop(0.18, 'rgba(170,190,240,0.28)'); gr.addColorStop(0.5, 'rgba(120,140,200,0.08)'); gr.addColorStop(1, 'rgba(100,120,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c, { repeat: false, nearest: false }), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); halo.scale.set(60, 60, 1); halo.position.copy(MOON_DIR).multiplyScalar(RAD * 0.9); halo.renderOrder = -8; S.add(halo); S.userData.halo = halo; }
  { const [c, g] = canvas(64, 64); g.fillStyle = '#e9ecf2'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(32, 32, 30, 0, 7); g.clip(); for (const [x, y, r] of [[24, 22, 9], [36, 18, 7], [40, 30, 8], [22, 36, 6], [33, 42, 5], [44, 40, 4], [28, 28, 5]]) stain(g, x, y, r, 'rgba(120,128,145,A)', 0.55, 5);
    for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(150,155,170,0.4)'; g.beginPath(); g.arc(R(6, 58), R(6, 58), R(1, 3), 0, 7); g.stroke(); }
    const sh = g.createRadialGradient(32, 32, 18, 32, 32, 31); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,70,90,0.35)'); g.fillStyle = sh; g.fillRect(0, 0, 64, 64); g.restore();
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c, { repeat: false, nearest: false }), fog: false, depthWrite: false, transparent: true })); disc.scale.set(10.5, 10.5, 1); disc.position.copy(MOON_DIR).multiplyScalar(RAD * 0.88); disc.renderOrder = -7; S.add(disc); S.userData.disc = disc; }
  // thin clouds: a few wispy streaks, one drifting low past the moon
  { const [c, g] = canvas(256, 64); for (let i = 0; i < 60; i++) { const x = R(20, 236), y = R(24, 40) + Math.sin(x / 30) * 4; const gr = g.createRadialGradient(x, y, 0, x, y, R(8, 22)); gr.addColorStop(0, 'rgba(150,160,185,0.18)'); gr.addColorStop(1, 'rgba(150,160,185,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 64); }
    const ct = tex(c, { repeat: false, nearest: false }); S.userData.clouds = [];
    for (const [az, el, w, op] of [[0.15, 0.62, 70, 0.9], [-0.9, 0.35, 90, 0.55], [1.4, 0.28, 80, 0.5], [2.6, 0.5, 70, 0.4], [-2.2, 0.22, 100, 0.45]]) {
      const m = new THREE.SpriteMaterial({ map: ct, fog: false, depthWrite: false, transparent: true, opacity: op, color: 0x9aa6c4 }); const sp = new THREE.Sprite(m);
      const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); sp.position.copy(d).multiplyScalar(RAD * 0.85); sp.scale.set(w, w / 4, 1); sp.renderOrder = -6; S.add(sp); S.userData.clouds.push({ sp, az, el, op }); } }
  S.traverse(o => { o.userData.noShadow = true; });
  // dim: 0..1 (1 = clear). Blackouts pull a cloud over the moon.
  S.userData.setDim = (k) => { S.userData.disc.material.opacity = 0.35 + 0.65 * k; S.userData.halo.material.opacity = 0.25 + 0.75 * k; S.userData.stars.material.opacity = 0.5 + 0.5 * k; };
  S.userData.update = (cam, dt, t) => { S.position.copy(cam.position); for (const c of S.userData.clouds) { c.az += dt * 0.0035; const d = _v.set(Math.sin(c.az) * Math.cos(c.el), Math.sin(c.el), Math.cos(c.az) * Math.cos(c.el)); c.sp.position.copy(d).multiplyScalar(RAD * 0.85); } };
  return S;
}

// Merge static, unreferenced scene meshes inside a region into one mesh per material (fewer draw calls, same look).
// Skips anything gameplay can touch: meshes referenced from W, interactables, occluders (used for line-of-sight rays), transparent / invisible ones.
export function mergeStatic(scene, W, region, opts = {}) {
  const refs = new Set(); const seen = new Set();
  const walk = (o, d) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 3) return; seen.add(o); if (o.isObject3D) { refs.add(o); return; } if (o.isMaterial || o.isTexture || o.isVector3 || o.isColor) return;
    for (const k of Object.keys(o)) { if (d === 0 && ['scene', 'colliders', 'occluders', 'interact', 'vlights', 'M', 'GT', 'heights', 'surfaces', 'regions'].includes(k)) continue; walk(o[k], d + 1); } };
  walk(W, 0);
  for (const i of W.interact) refs.add(i.mesh); for (const o of W.occluders) refs.add(o);
  const box = new THREE.Box3(); const byMat = new Map();
  for (const m of scene.children) {
    if (!m.isMesh || refs.has(m) || m.userData.batched || m.userData.decals || !m.visible) continue; const mat = m.material;
    if (!mat || Array.isArray(mat) || mat.visible === false || mat.transparent) continue; const g = m.geometry; if (!g.attributes.uv || !g.attributes.normal || g.morphAttributes.position) continue;
    m.updateMatrixWorld(true); box.setFromObject(m);
    if (box.min.x < region.x0 || box.max.x > region.x1 || box.min.z < region.z0 || box.max.z > region.z1 || box.min.y < (region.y0 ?? -5) || box.max.y > (region.y1 ?? 20)) continue;
    if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push(m);
  }
  const B = new Batch(scene); let merged = 0;
  for (const [mat, list] of byMat) { if (list.length < 2) continue; for (const m of list) { B.add(m.geometry, mat, m.matrixWorld, false); scene.remove(m); merged++; } }
  const out = B.flush({ name: opts.name }); return { merged, meshes: out.length };
}
