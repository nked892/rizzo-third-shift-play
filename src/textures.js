// All textures are generated procedurally at load time (original assets, no external images).
import * as THREE from 'three';

let seed = 1337;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, opts = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  if (opts.nearest) { t.magFilter = THREE.NearestFilter; }
  return t;
}
function noise(g, w, h, amt, alpha = 1) {
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (rnd() - 0.5) * amt;
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; d.data[i + 3] = d.data[i + 3] * alpha;
  }
  g.putImageData(d, 0, 0);
}
function blotches(g, w, h, n, color, rmax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = color; g.globalAlpha = rnd() * 0.12;
    g.beginPath(); g.arc(rnd() * w, rnd() * h, rnd() * rmax, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

const T = {};
export function makeTextures() {
  // concrete floor
  { const [c, g] = canvas(256, 256); g.fillStyle = '#77736b'; g.fillRect(0, 0, 256, 256);
    blotches(g, 256, 256, 120, '#3b3833', 40); blotches(g, 256, 256, 60, '#a09a8c', 30); noise(g, 256, 256, 30);
    g.strokeStyle = 'rgba(30,28,25,0.6)'; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(30,28,25,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(40, 0); g.bezierCurveTo(70, 80, 30, 160, 90, 256); g.stroke();
    T.concrete = tex(c); }
  // cinder block painted
  { const [c, g] = canvas(128, 128); g.fillStyle = '#b9b4a3'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#8d887a'; g.lineWidth = 3;
    for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(0, r * 32); g.lineTo(128, r * 32); g.stroke();
      const off = r % 2 ? 32 : 0; for (let k = -1; k < 3; k++) { g.beginPath(); g.moveTo(off + k * 64, r * 32); g.lineTo(off + k * 64, r * 32 + 32); g.stroke(); } }
    noise(g, 128, 128, 16); blotches(g, 128, 128, 20, '#6e6858', 20); T.block = tex(c); }
  // painted block lower stripe (dock) - safety yellow band
  { const [c, g] = canvas(64, 64); g.fillStyle = '#b8902c'; g.fillRect(0, 0, 64, 64); for (let i = -64; i < 64; i += 16) { g.fillStyle = '#1d1b17'; g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 8, 64); g.lineTo(i + 72, 0); g.lineTo(i + 64, 0); g.fill(); } noise(g, 64, 64, 40); T.hazard = tex(c); }
  // ceiling tile
  { const [c, g] = canvas(128, 128); g.fillStyle = '#d6d2c6'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,85,75,${rnd() * 0.4})`; g.fillRect(rnd() * 128, rnd() * 128, 1, 1); }
    g.strokeStyle = '#8f8b80'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); blotches(g, 128, 128, 3, '#9b7c4a', 18); T.ceilTile = tex(c); }
  // McLean carpet: dark geometric
  { const [c, g] = canvas(128, 128); g.fillStyle = '#2f3031'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) {
      const v = (x / 32 + y / 32) % 2; g.strokeStyle = v ? '#4a4b4c' : '#3b3c3e'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) { g.beginPath(); if (v) { g.moveTo(x + 4 + k * 5, y + 2); g.lineTo(x + 4 + k * 5, y + 30); } else { g.moveTo(x + 2, y + 4 + k * 5); g.lineTo(x + 30, y + 4 + k * 5); } g.stroke(); } }
    noise(g, 128, 128, 22); T.carpetHall = tex(c); }
  // guest room carpet beige
  { const [c, g] = canvas(128, 128); g.fillStyle = '#8f8270'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) { g.strokeStyle = ((x + y) / 16) % 2 ? '#a39684' : '#7f7363'; g.lineWidth = 1; g.strokeRect(x + 2, y + 2, 12, 12); }
    noise(g, 128, 128, 20); T.carpetRoom = tex(c); }
  // cream wall with subtle texture
  { const [c, g] = canvas(128, 128); g.fillStyle = '#cfc4ad'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 10); blotches(g, 128, 128, 8, '#8c7f66', 30); T.cream = tex(c); }
  // damask (DuBose)
  { const [c, g] = canvas(128, 128); g.fillStyle = '#d4c69f'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#c3b48a';
    const motif = (cx, cy) => { g.beginPath(); g.ellipse(cx, cy, 10, 18, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx - 12, cy + 4, 6, 10, -0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx + 12, cy + 4, 6, 10, 0.6, 0, 7); g.fill(); g.fillRect(cx - 1, cy - 30, 2, 60); };
    motif(32, 32); motif(96, 96); motif(96, -32 + 128); motif(32, 160 - 128 + 96);
    noise(g, 128, 128, 10); blotches(g, 128, 128, 10, '#6d5f3e', 24); T.damask = tex(c); }
  // blue + white stripe wallpaper (DuBose dining)
  { const [c, g] = canvas(64, 64); g.fillStyle = '#e6e2d6'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a5a8c'; g.fillRect(0, 0, 14, 64); g.fillRect(32, 0, 4, 64); g.fillStyle = '#5c7aa8'; g.fillRect(16, 0, 2, 64); noise(g, 64, 64, 14); T.stripe = tex(c); }
  // white painted panel wainscot
  { const [c, g] = canvas(128, 64); g.fillStyle = '#e4e0d4'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#b6b1a2'; g.lineWidth = 3; g.strokeRect(10, 10, 108, 44); g.strokeStyle = '#f6f3ea'; g.lineWidth = 1; g.strokeRect(13, 13, 102, 38); noise(g, 128, 64, 10); T.wains = tex(c); }
  // hardwood (dark)
  { const [c, g] = canvas(256, 256); g.fillStyle = '#4a2a17'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) { const y = i * 16; const off = rnd() * 256; g.fillStyle = `hsl(22,${45 + rnd() * 15}%,${14 + rnd() * 9}%)`; g.fillRect(0, y, 256, 15);
      for (let k = 0; k < 40; k++) { g.strokeStyle = 'rgba(20,10,5,0.25)'; g.beginPath(); const yy = y + rnd() * 15; g.moveTo(0, yy); g.lineTo(256, yy + rnd() * 2 - 1); g.stroke(); }
      g.fillStyle = '#1a0d06'; g.fillRect(0, y + 15, 256, 1); g.fillRect(off, y, 1, 15); }
    noise(g, 256, 256, 12); T.hardwood = tex(c); }
  // pine (knotty, door casings and library)
  { const [c, g] = canvas(128, 256); g.fillStyle = '#8a5428'; g.fillRect(0, 0, 128, 256);
    for (let k = 0; k < 70; k++) { g.strokeStyle = `rgba(${60 + rnd() * 40},30,10,0.35)`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const x = rnd() * 128; g.moveTo(x, 0); g.bezierCurveTo(x + rnd() * 10 - 5, 80, x + rnd() * 10 - 5, 170, x + rnd() * 6 - 3, 256); g.stroke(); }
    for (let k = 0; k < 4; k++) { g.fillStyle = '#4a2810'; g.beginPath(); g.ellipse(rnd() * 128, rnd() * 256, 3 + rnd() * 3, 5 + rnd() * 4, 0, 0, 7); g.fill(); }
    noise(g, 128, 256, 12); T.pine = tex(c); }
  // dark mahogany furniture
  { const [c, g] = canvas(64, 128); g.fillStyle = '#3a1a10'; g.fillRect(0, 0, 64, 128); for (let k = 0; k < 40; k++) { g.strokeStyle = 'rgba(15,5,2,0.4)'; g.beginPath(); const x = rnd() * 64; g.moveTo(x, 0); g.lineTo(x + rnd() * 6 - 3, 128); g.stroke(); } noise(g, 64, 128, 10); T.mahogany = tex(c); }
  // red brick
  { const [c, g] = canvas(128, 128); g.fillStyle = '#b8ae9c'; g.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++) for (let b = -1; b < 3; b++) { const off = r % 2 ? 32 : 0; g.fillStyle = `hsl(${8 + rnd() * 8},${45 + rnd() * 15}%,${26 + rnd() * 10}%)`; g.fillRect(off + b * 64 + 2, r * 16 + 2, 60, 12); }
    noise(g, 128, 128, 22); T.brick = tex(c); }
  // brick pavers (terrace)
  { const [c, g] = canvas(128, 128); g.fillStyle = '#3a2c25'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { const hz = ((x + y) / 32) % 2; g.fillStyle = `hsl(10,40%,${22 + rnd() * 8}%)`; if (hz) { g.fillRect(x + 1, y + 1, 30, 14); g.fillRect(x + 1, y + 17, 30, 14); } else { g.fillRect(x + 1, y + 1, 14, 30); g.fillRect(x + 17, y + 1, 14, 30); } }
    noise(g, 128, 128, 24); T.pavers = tex(c); }
  // oriental rug
  { const [c, g] = canvas(256, 384); g.fillStyle = '#6e1a16'; g.fillRect(0, 0, 256, 384);
    g.strokeStyle = '#1f2a4a'; g.lineWidth = 18; g.strokeRect(14, 14, 228, 356); g.strokeStyle = '#c9a66b'; g.lineWidth = 3; g.strokeRect(28, 28, 200, 328); g.strokeRect(6, 6, 244, 372);
    g.fillStyle = '#1f2a4a'; g.beginPath(); g.moveTo(128, 90); g.lineTo(200, 192); g.lineTo(128, 294); g.lineTo(56, 192); g.fill();
    g.fillStyle = '#b5863f'; g.beginPath(); g.moveTo(128, 140); g.lineTo(170, 192); g.lineTo(128, 244); g.lineTo(86, 192); g.fill();
    g.fillStyle = '#6e1a16'; g.beginPath(); g.arc(128, 192, 16, 0, 7); g.fill();
    for (let i = 0; i < 160; i++) { g.fillStyle = ['#c9a66b', '#1f2a4a', '#3d5a3a', '#e0d2b0'][i % 4]; g.globalAlpha = 0.5; g.fillRect(36 + rnd() * 184, 36 + rnd() * 312, 3, 3); }
    g.globalAlpha = 1; noise(g, 256, 384, 26); T.rug = tex(c); T.rug.wrapS = T.rug.wrapT = THREE.ClampToEdgeWrapping; }
  // royal-blue runner
  { const [c, g] = canvas(64, 64); g.fillStyle = '#2756a0'; g.fillRect(0, 0, 64, 64); noise(g, 64, 64, 18); T.blueRunner = tex(c); }
  // linoleum/vct (pantry, office)
  { const [c, g] = canvas(128, 128); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#bdb8a8' : '#a9a493'; g.fillRect(x * 32, y * 32, 32, 32); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(60,55,45,${rnd() * 0.4})`; g.fillRect(rnd() * 128, rnd() * 128, 2, 1); } g.strokeStyle = '#7e7a6e'; g.lineWidth = 1; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
    noise(g, 128, 128, 10); T.vct = tex(c); }
  // diamond plate metal
  { const [c, g] = canvas(64, 64); g.fillStyle = '#6d6f70'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#8f9192'; for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) { g.save(); g.translate(x + 8 + (y / 16 % 2) * 8, y + 8); g.rotate(0.7); g.fillRect(-6, -1.5, 12, 3); g.restore(); } noise(g, 64, 64, 18); T.plate = tex(c); }
  // roll-up door slats
  { const [c, g] = canvas(64, 128); g.fillStyle = '#8b8e8c'; g.fillRect(0, 0, 64, 128); for (let y = 0; y < 128; y += 8) { g.fillStyle = '#5d605f'; g.fillRect(0, y, 64, 2); g.fillStyle = '#a6a9a7'; g.fillRect(0, y + 2, 64, 1); } noise(g, 64, 128, 16); blotches(g, 64, 128, 10, '#5a3d1f', 12); T.rollup = tex(c); }
  // statue concrete: rough, rust-streaked
  { const [c, g] = canvas(256, 256); g.fillStyle = '#86816f'; g.fillRect(0, 0, 256, 256); blotches(g, 256, 256, 200, '#4d4940', 20); blotches(g, 256, 256, 80, '#c9c4b5', 14);
    for (let i = 0; i < 26; i++) { const x = rnd() * 256; const grd = g.createLinearGradient(x, 0, x, 256); grd.addColorStop(0, 'rgba(120,58,20,0.55)'); grd.addColorStop(1, 'rgba(120,58,20,0)'); g.fillStyle = grd; g.fillRect(x, rnd() * 120, 2 + rnd() * 4, 160); }
    noise(g, 256, 256, 46); T.statue = tex(c); }
  // statue face: ORIGINAL design — black tally marks across the eyes, white smeared palm print, no mouth
  { const [c, g] = canvas(256, 256); g.drawImage(T.statue.image, 0, 0);
    g.strokeStyle = '#0e0c0a'; g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(70 + i * 22, 92 + rnd() * 6); g.lineTo(76 + i * 22, 132 + rnd() * 6); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(60, 128); g.lineTo(190, 96); g.stroke();
    g.fillStyle = 'rgba(232,228,214,0.85)'; g.beginPath(); g.ellipse(128, 190, 30, 26, 0, 0, 7); g.fill();
    for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(98 + f * 19, 150 - (f === 1 || f === 2 ? 8 : 0), 7, 20, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 12; i++) { g.fillRect(100 + rnd() * 56, 205, 3, 20 + rnd() * 30); }
    g.fillStyle = 'rgba(110,20,14,0.8)'; g.fillRect(122, 60, 12, 24);
    noise(g, 256, 256, 20); T.statueFace = tex(c); }
  // books
  { const [c, g] = canvas(128, 64); g.fillStyle = '#1b120c'; g.fillRect(0, 0, 128, 64); let x = 0; while (x < 128) { const w = 3 + rnd() * 6; const hh = 40 + rnd() * 22; g.fillStyle = `hsl(${[0, 20, 200, 120, 40][Math.floor(rnd() * 5)]},${30 + rnd() * 30}%,${15 + rnd() * 20}%)`; g.fillRect(x, 64 - hh, w - 1, hh); g.fillStyle = 'rgba(210,180,110,0.5)'; g.fillRect(x, 64 - hh + 6, w - 1, 1); x += w; } noise(g, 128, 64, 14); T.books = tex(c); }
  // grass / hedge
  { const [c, g] = canvas(64, 64); g.fillStyle = '#16210f'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 500; i++) { g.fillStyle = `hsl(${90 + rnd() * 30},40%,${8 + rnd() * 16}%)`; g.fillRect(rnd() * 64, rnd() * 64, 2, 2); } T.hedge = tex(c); }
  // night sky with tree line silhouette handled by geometry; sky gradient
  // ---- Christmas-shift additions (generated after the originals so the seeded textures above don't change) ----
  // window frost: pale crystalline edges, clear-ish centre
  { const [c, g] = canvas(128, 128); g.clearRect(0, 0, 128, 128);
    const grd = g.createRadialGradient(64, 64, 18, 64, 64, 90); grd.addColorStop(0, 'rgba(220,235,255,0.05)'); grd.addColorStop(1, 'rgba(230,240,255,0.85)'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(245,250,255,0.55)'; g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { const edge = rnd() * 4 | 0; let x = edge === 0 ? 0 : edge === 1 ? 128 : rnd() * 128, y = edge === 2 ? 0 : edge === 3 ? 128 : rnd() * 128; if (edge < 2) y = rnd() * 128; else x = rnd() * 128;
      let a = Math.atan2(64 - y, 64 - x) + (rnd() - 0.5) * 1.2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.cos(a) * 5; y += Math.sin(a) * 5; g.lineTo(x, y); if (rnd() < 0.4) { g.moveTo(x, y); g.lineTo(x + Math.cos(a + 1) * 4, y + Math.sin(a + 1) * 4); g.moveTo(x, y); } a += (rnd() - 0.5) * 0.6; } g.stroke(); }
    T.frost = new THREE.CanvasTexture(c); T.frost.colorSpace = THREE.SRGBColorSpace; }
  // breath puff: soft white blob
  { const [c, g] = canvas(64, 64); const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30); grd.addColorStop(0, 'rgba(235,240,245,0.9)'); grd.addColorStop(0.5, 'rgba(225,232,240,0.35)'); grd.addColorStop(1, 'rgba(220,230,240,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    T.puff = new THREE.CanvasTexture(c); T.puff.colorSpace = THREE.SRGBColorSpace; }
  // bolt of calico fabric (small faded florals)
  { const [c, g] = canvas(64, 64); g.fillStyle = '#9c7e74'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 60; i++) { g.fillStyle = ['#d9c7a8', '#6e4a48', '#7f8f6a', '#c9a0a0'][i % 4]; g.beginPath(); g.arc(rnd() * 64, rnd() * 64, 1 + rnd() * 2, 0, 7); g.fill(); } noise(g, 64, 64, 14); T.calico = tex(c); }
  // back-bar bottles (silhouettes against a dark mirror)
  { const [c, g] = canvas(128, 64); g.fillStyle = '#14100c'; g.fillRect(0, 0, 128, 64); let x = 3; while (x < 124) { const w = 6 + rnd() * 5, h = 26 + rnd() * 22; g.fillStyle = ['#3b2410', '#1e3a22', '#5a3a12', '#2a2a30', '#6a4a1a'][Math.floor(rnd() * 5)]; g.fillRect(x, 64 - h, w, h); g.fillRect(x + w * 0.35, 64 - h - 8, w * 0.3, 8); g.fillStyle = 'rgba(230,200,140,0.35)'; g.fillRect(x + 1, 64 - h + 4, 1, h - 8); x += w + 2 + rnd() * 3; } noise(g, 128, 64, 12); T.bottles = tex(c); }
  return T;
}

// text label texture (room numbers, signs, papers)
export function labelTexture(lines, opts = {}) {
  const w = opts.w || 256, h = opts.h || 128;
  const [c, g] = canvas(w, h);
  g.fillStyle = opts.bg || '#ddd8c8'; g.fillRect(0, 0, w, h);
  g.fillStyle = opts.fg || '#111';
  const size = opts.size || 28;
  g.font = `${opts.bold ? 'bold ' : ''}${size}px ${opts.font || 'Courier New, monospace'}`;
  g.textAlign = opts.align || 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, opts.align === 'left' ? 10 : w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
  if (opts.noise !== false) noise(g, w, h, 14);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
