// Graphics pass 2: the rest of the building in the same grimy, low-res, nearest-filtered look as pass 1 (gfx.js).
// Everything is ORIGINAL and generated in code at load time. Own seeded RNG so pass 1 and textures.js keep their exact look.
//  - dirtify(): re-bakes an existing tileable texture as a bigger macro tile (k x k of the original) with grime, stains,
//    streaks and per-tile tone shifts, so the pattern stops visibly repeating every metre.
//  - regrime(): swaps the shared architectural materials for grimy, world-space-mapped ones (walls, floors, ceilings, furniture).
//  - roomDecals(): contact shadows at every wall base, smoke lines under every ceiling, leak streaks, scuffs, mildew, floor stains.
//  - flattenGroups(): moves static, unreferenced groups' meshes into the scene so mergeStatic can batch them (draw calls).
import * as THREE from 'three';
import { planarUV, Decals, Batch } from './gfx.js';

let seed = 77031;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + (b - a) * rnd();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { repeat = true, nearest = true } = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; if (nearest) t.magFilter = THREE.NearestFilter; return t;
}
function noise(g, w, h, amt, chroma = 0) { const d = g.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { const n = (rnd() - 0.5) * amt; d.data[i] += n + (rnd() - 0.5) * chroma; d.data[i + 1] += n; d.data[i + 2] += n + (rnd() - 0.5) * chroma; } g.putImageData(d, 0, 0); }
function blob(g, x, y, r, color, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color.replace('A', a)); gr.addColorStop(1, color.replace('A', 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function stain(g, x, y, r, color, a, n = 6) { for (let i = 0; i < n; i++) blob(g, x + R(-r, r) * 0.6, y + R(-r, r) * 0.6, r * R(0.35, 0.9), color, a * R(0.5, 1)); }
// wrap-aware stain (draws the blotch on every side it crosses so the macro tile stays seamless)
function wstain(g, w, h, x, y, r, color, a, n) { for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) if (x + ox > -r * 1.5 && x + ox < w + r * 1.5 && y + oy > -r * 1.5 && y + oy < h + r * 1.5) { const s = seed; stain(g, x + ox, y + oy, r, color, a, n); seed = s; } stain(g, -999, -999, 1, color, 0, n); }
function drips(g, x, y0, len, color, a, w = 2) { const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, color.replace('A', a)); gr.addColorStop(1, color.replace('A', 0)); g.fillStyle = gr; g.fillRect(x, y0, w, len); }
function crack(g, x, y, len, ang, color = 'rgba(20,18,16,0.7)', w = 1) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < len; s += 4) { ang += R(-0.5, 0.5); x += Math.cos(ang) * 4; y += Math.sin(ang) * 4; g.lineTo(x, y); } g.stroke(); }

// ---------- dirtify: macro-tile an existing canvas texture with grime ----------
// o: { k: [kx, ky], stains: n per tile, sc: stain colour 'rgba(r,g,b,A)', sa: stain alpha, drips: n per tile (from the top), dc: drip colour,
//      tone: per-tile tone jitter (0..1), specks: n per tile, scuffs: n per tile (dark short strokes), cracks: n per macro, fade: wash toward a colour, maxPx: cap size }
export function dirtify(src, o = {}) {
  const img = src.image; const [kx, ky] = o.k || [3, 3]; const tw = img.width, th = img.height; const W = tw * kx, H = th * ky; const [c, g] = canvas(W, H);
  for (let j = 0; j < ky; j++) for (let i = 0; i < kx; i++) { g.drawImage(img, i * tw, j * th);
    if (o.tone) { const v = R(-1, 1) * o.tone; g.fillStyle = v > 0 ? `rgba(255,245,225,${v * 0.25})` : `rgba(20,16,10,${-v * 0.35})`; g.fillRect(i * tw, j * th, tw, th); } }
  if (o.fade) { g.fillStyle = o.fade; g.fillRect(0, 0, W, H); }
  const area = kx * ky, sc = o.sc || 'rgba(40,32,22,A)';
  for (let n = 0; n < (o.stains ?? 3) * area; n++) wstain(g, W, H, R(0, W), R(0, H), R(0.08, 0.35) * Math.min(tw, th) * (rnd() < 0.15 ? 2.2 : 1), sc, (o.sa ?? 0.22) * R(0.5, 1.2), 6);
  for (let n = 0; n < (o.light ?? 0) * area; n++) wstain(g, W, H, R(0, W), R(0, H), R(0.1, 0.3) * Math.min(tw, th), 'rgba(235,225,200,A)', 0.12, 4);
  for (let n = 0; n < (o.drips ?? 0) * area; n++) { const x = R(0, W), y = Math.floor(R(0, ky)) * th; drips(g, x, y, R(0.2, 0.9) * th, o.dc || 'rgba(70,52,30,A)', R(0.15, 0.4), R(1, 3)); }
  for (let n = 0; n < (o.scuffs ?? 0) * area; n++) { g.strokeStyle = `rgba(18,15,12,${R(0.15, 0.45)})`; g.lineWidth = R(1, 2.2); const x = R(0, W), y = R(0, H); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-14, 14), y + R(-3, 3)); g.stroke(); }
  for (let n = 0; n < (o.cracks ?? 0); n++) crack(g, R(0, W), R(0, H), R(30, 120), R(0, 6.3));
  for (let n = 0; n < (o.specks ?? 40) * area; n++) { const v = R(0, 1) < 0.5 ? R(10, 50) : R(150, 210); g.fillStyle = `rgba(${v},${v - 6},${v - 14},${R(0.2, 0.6)})`; g.fillRect(R(0, W) | 0, R(0, H) | 0, 1, 1); }
  noise(g, W, H, o.noise ?? 14, 3);
  const t = tex(c, { repeat: src.wrapS === THREE.RepeatWrapping }); t.userData = { k: [kx, ky] }; return t;
}

// ---------- extra original textures for pass 2 ----------
export function makeGrime2(T) {
  const G = {};
  // painted CMU, tan, corridor/shop/stair: 4 m x 3.2 m macro (32 px/m), roller laps, cart gouges, rust bleed from anchors, mildew
  { const W = 128, H = 104, s = 32; const [c, g] = canvas(W, H); g.fillStyle = '#b4ab95'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < H / (0.2 * s); r++) { const y = H - (r + 1) * 0.2 * s; const off = r % 2 ? 0.2 * s : 0; for (let k = -1; k < 11; k++) { const x = off + k * 0.4 * s; g.fillStyle = `rgba(${R(150, 185)},${R(142, 175)},${R(120, 150)},0.3)`; g.fillRect(x + 1, y + 1, 0.4 * s - 1, 0.2 * s - 1); }
      g.fillStyle = 'rgba(80,74,62,0.55)'; g.fillRect(0, y, W, 1); for (let k = -1; k < 11; k++) g.fillRect(off + k * 0.4 * s, y, 1, 0.2 * s); }
    for (let i = 0; i < 12; i++) wstain(g, W, H, R(0, W), R(0, H), R(4, 14), 'rgba(80,66,44,A)', 0.2, 5);
    for (let i = 0; i < 6; i++) drips(g, R(0, W), 0, R(20, 70), 'rgba(70,55,35,A)', R(0.15, 0.35), R(1, 2));
    for (let i = 0; i < 3; i++) { const x = R(0, W), y = R(10, 60); g.fillStyle = '#4a2a14'; g.fillRect(x, y, 2, 2); drips(g, x, y + 1, R(10, 30), 'rgba(120,58,20,A)', 0.5, 2); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(100,98,92,0.6)'; g.fillRect(R(0, W), R(0, H), R(2, 6), R(1, 4)); }
    for (let i = 0; i < 8; i++) wstain(g, W, H, R(0, W), R(0, H), R(3, 8), 'rgba(55,62,45,A)', 0.15, 4);
    noise(g, W, H, 16, 3); G.cmu = tex(c); }
  // sealed concrete floor (service areas): 4 m macro, 32 px/m: trowel swirl, oil, cart lanes, saw cuts, cracks
  { const W = 128, H = 128, s = 32; const [c, g] = canvas(W, H); g.fillStyle = '#6e6a62'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) wstain(g, W, H, R(0, W), R(0, H), R(8, 26), 'rgba(40,37,32,A)', 0.14, 4);
    for (let i = 0; i < 14; i++) wstain(g, W, H, R(0, W), R(0, H), R(6, 18), 'rgba(150,145,132,A)', 0.1, 3);
    for (let i = 0; i < 9; i++) wstain(g, W, H, R(0, W), R(0, H), R(3, 9), 'rgba(12,11,10,A)', R(0.3, 0.55), 5);
    g.fillStyle = 'rgba(20,18,15,0.8)'; g.fillRect(0, 0, W, 1); g.fillRect(0, 0, 1, H);
    for (let i = 0; i < 4; i++) crack(g, R(0, W), R(0, H), R(20, 70), R(0, 6.3), 'rgba(20,18,15,0.6)');
    for (let i = 0; i < 900; i++) { const v = R(50, 150); g.fillStyle = `rgba(${v},${v - 4},${v - 10},${R(0.15, 0.45)})`; g.fillRect(R(0, W) | 0, R(0, H) | 0, 1, 1); }
    noise(g, W, H, 20, 4); G.slab = tex(c); }
  // lay-in ceiling tiles: 3.6 m x 3.6 m macro (6 x 6 tiles, 20 px per tile): yellowed, a few water-stained tiles, a couple sagging/dark, dirty grid
  { const n = 6, t = 20, W = n * t; const [c, g] = canvas(W, W);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = R(-14, 8); g.fillStyle = `rgb(${196 + v},${189 + v},${168 + v * 1.2})`; g.fillRect(i * t, j * t, t, t);
      for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(90,85,70,${R(0.2, 0.5)})`; g.fillRect(i * t + R(1, t - 1) | 0, j * t + R(1, t - 1) | 0, 1, 1); }
      if (rnd() < 0.22) { const cx = i * t + R(4, t - 4), cy = j * t + R(4, t - 4), r = R(3, 8); g.strokeStyle = 'rgba(110,78,40,0.45)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); blob(g, cx, cy, r, 'rgba(130,95,50,A)', 0.22); }
      if (rnd() < 0.05) { g.fillStyle = 'rgba(60,55,45,0.35)'; g.fillRect(i * t + 1, j * t + 1, t - 2, t - 2); } }
    for (let i = 0; i <= n; i++) { g.fillStyle = 'rgba(100,95,82,0.95)'; g.fillRect(i * t - 1, 0, 1, W); g.fillRect(0, i * t - 1, W, 1); }
    for (let i = 0; i < 5; i++) { const x = R(0, W), y = R(0, W); for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(30,32,25,${R(0.3, 0.7)})`; g.fillRect(x + R(-4, 4) | 0, y + R(-4, 4) | 0, 1, 1); } }
    noise(g, W, W, 10, 3); G.ceilTiles = tex(c); }
  // old plaster ceiling (DuBose): 4 m macro, hairline cracks, water bloom, smoke near the edges is done with decals
  { const W = 128; const [c, g] = canvas(W, W); g.fillStyle = '#d9d2c0'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 14; i++) wstain(g, W, W, R(0, W), R(0, W), R(10, 28), 'rgba(150,135,100,A)', 0.12, 5);
    for (let i = 0; i < 3; i++) { const x = R(0, W), y = R(0, W); wstain(g, W, W, x, y, R(10, 18), 'rgba(140,105,60,A)', 0.2, 6); g.strokeStyle = 'rgba(120,85,45,0.35)'; g.beginPath(); g.arc(x, y, R(9, 15), 0, 7); g.stroke(); }
    for (let i = 0; i < 6; i++) crack(g, R(0, W), R(0, W), R(20, 80), R(0, 6.3), 'rgba(90,80,65,0.45)');
    noise(g, W, W, 9, 2); G.plaster = tex(c); }
  // dingy painted trim / casing / white enamel (1 m)
  { const [c, g] = canvas(32, 32); g.fillStyle = '#ddd6c4'; g.fillRect(0, 0, 32, 32); for (let i = 0; i < 6; i++) stain(g, R(0, 32), R(0, 32), R(3, 8), 'rgba(110,95,70,A)', 0.2, 3); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(70,60,45,0.4)'; g.fillRect(R(0, 32) | 0, R(0, 32) | 0, R(1, 4) | 0, 1); } noise(g, 32, 32, 10); G.paint = tex(c); }
  // a bigger, dirtier rug (worn path, fringe grime): keeps the original pattern underneath
  { G.rug = dirtify(T.rug, { k: [1, 1], stains: 10, sa: 0.3, sc: 'rgba(30,18,12,A)', scuffs: 30, specks: 400, tone: 0, light: 2 }); G.rug.wrapS = G.rug.wrapT = THREE.ClampToEdgeWrapping; }
  return G;
}

// ---------- swap architectural materials for grimy world-mapped ones ----------
// table: material -> { map, mpt: metres per texture (u), mptV (v), world: bool (planar world UVs) }
export function regrime(scene, W, T) {
  const M = W.M, L = (map, color = 0xffffff) => { const m = new THREE.MeshLambertMaterial({ map, color }); m.userData.s = 1; return m; };
  const G = W.GT2 = makeGrime2(T);
  const D = (src, o) => dirtify(src, o);
  // metres per macro tile = original repeat (material.userData.s) x k
  const spec = [
    [M.concrete, G.slab, 4, 4], [M.block, G.cmu, 4, 3.25], [M.blockTan, G.cmu, 4, 3.25], [M.ceil, G.ceilTiles, 3.6, 3.6],
    [M.cream, D(T.cream, { k: [4, 3], stains: 2, sa: 0.18, sc: 'rgba(110,88,55,A)', drips: 0.5, scuffs: 6, specks: 30, tone: 0.15, light: 0.4 }), 8, 6],
    [M.damask, D(T.damask, { k: [3, 3], stains: 2.5, sa: 0.22, sc: 'rgba(90,70,40,A)', drips: 0.6, dc: 'rgba(90,66,36,A)', specks: 30, tone: 0.18, fade: 'rgba(120,100,70,0.12)' }), 2.7, 2.7],
    [M.damaskBlue, null, 2.7, 2.7], [M.damaskRose, null, 2.7, 2.7], [M.damaskRed, null, 2.7, 2.7],
    [M.stripe, D(T.stripe, { k: [5, 5], stains: 2, sa: 0.2, sc: 'rgba(95,80,50,A)', drips: 0.4, specks: 20, tone: 0.12, fade: 'rgba(150,130,90,0.12)' }), 1.75, 1.75],
    [M.hardwood, D(T.hardwood, { k: [2, 2], stains: 4, sa: 0.25, sc: 'rgba(10,6,3,A)', scuffs: 30, specks: 120, tone: 0.1, light: 1.5 }), 4.4, 4.4],
    [M.pine, D(T.pine, { k: [3, 2], stains: 2, sa: 0.25, sc: 'rgba(30,16,6,A)', scuffs: 4, specks: 40, tone: 0.12 }), 2.7, 1.8],
    [M.mahogany, D(T.mahogany, { k: [3, 2], stains: 2, sa: 0.2, sc: 'rgba(8,4,2,A)', scuffs: 6, specks: 40, tone: 0.1, light: 1 }), 2.4, 1.6],
    [M.carpetRoom, D(T.carpetRoom, { k: [4, 4], stains: 2, sa: 0.32, sc: 'rgba(40,28,18,A)', specks: 60, tone: 0.1 }), 4, 4],
    [M.vct, D(T.vct, { k: [3, 3], stains: 2, sa: 0.25, sc: 'rgba(60,52,36,A)', scuffs: 14, specks: 60, tone: 0.15 }), 3.6, 3.6],
    [M.brick, D(T.brick, { k: [3, 4], stains: 2, sa: 0.3, sc: 'rgba(25,20,16,A)', drips: 1, dc: 'rgba(35,30,25,A)', specks: 40, tone: 0.12, light: 0.5 }), 2.7, 3.6],
    [M.pavers, D(T.pavers, { k: [4, 4], stains: 3, sa: 0.3, sc: 'rgba(15,12,10,A)', specks: 50, tone: 0.1, light: 1 }), 4.8, 4.8],
    [M.plate, D(T.plate, { k: [3, 3], stains: 3, sa: 0.3, sc: 'rgba(60,35,15,A)', specks: 30 }), 1.8, 1.8],
    [M.books, D(T.books, { k: [2, 1], stains: 1, sa: 0.25, sc: 'rgba(10,8,5,A)', specks: 20, fade: 'rgba(50,40,30,0.15)' }), 1.8, 0.9],
    [M.trim, G.plaster, 4, 4], [M.white, G.plaster, 4, 4],
  ];
  // damask tints share the dirty damask map
  const dmap = spec.find(s => s[0] === M.damask)[1]; for (const s of spec) if (!s[1]) s[1] = dmap;
  const byMat = new Map(); for (const [mat, map, mu, mv] of spec) {
    const ceilingish = mat === M.trim || mat === M.white;
    const nm = L(map, mat.color.getHex()); if (ceilingish) nm.color.set(mat === M.trim ? 0xe8e2d2 : 0xdcd6c6);
    // trim/white: plaster on big ceiling slabs, dingy paint (small 1 m texture) on casings, mantels, columns
    const small = ceilingish ? L(G.paint, mat === M.trim ? 0xf2ede0 : 0xe6e0d0) : null;
    byMat.set(mat, { nm, mu, mv, small });
  }
  const isWorldOK = m => !m.userData.batched && !m.userData.decals;
  scene.updateMatrixWorld(true); let n = 0; const box3 = new THREE.Box3(), sz = new THREE.Vector3();
  const list = []; scene.traverse(o => { if (o.isMesh && byMat.has(o.material) && isWorldOK(o)) list.push(o); });
  for (const m of list) {
    const e = byMat.get(m.material); let mat = e.nm, mu = e.mu, mv = e.mv;
    if (e.small) { box3.setFromObject(m); box3.getSize(sz); const ceiling = sz.y < 0.25 && sz.x > 1.4 && sz.z > 1.4 && box3.min.y > 2.3; if (!ceiling) { mat = e.small; mu = mv = 1; } }
    m.material = mat; if (!m.geometry.attributes.uv) continue;
    planarUV(m, (x, y, z, ax) => ax === 'y' ? [x / mu, -z / mu] : ax === 'x' ? [z / mu, y / mv] : [x / mu, y / mv]); n++;
  }
  // rugs: the dirtier rug (plane UVs stay 0..1)
  scene.traverse(o => { if (o.isMesh && o.material && o.material.map === T.rug) { o.material.map = G.rug; o.material.needsUpdate = true; } });
  // wainscot: keep its panel UVs, just dirtier (period 4 panels so it doesn't repeat every metre)
  M.wains.map = dirtify(T.wains, { k: [4, 1], stains: 2, sa: 0.22, sc: 'rgba(80,70,52,A)', scuffs: 18, specks: 40, tone: 0.1 }); M.wains.map.repeat.set(1 / 4, 1); M.wains.needsUpdate = true;
  return n;
}

// ---------- auto decals for every room the first pass didn't touch ----------
export function roomDecals(scene, W, rooms, skip) {
  const DD = new Decals(scene, W.GT.decals); let n = 0;
  for (const r of rooms) {
    if (skip(r)) continue; const y = r.y || 0, top = y + (r.h || 3), off = 0.1 + (r.wains ? 0.024 : r.base ? 0.022 : 0.004), o = r.open || {};
    const segs = (a, b, holes) => { const out = []; let cur = a; [...(holes || [])].sort((p, q) => p[0] - q[0]).forEach(h => { if (h[0] - 0.12 > cur) out.push([cur, h[0] - 0.12]); cur = Math.max(cur, h[1] + 0.12); }); if (cur < b) out.push([cur, b]); return out; };
    const walls = { n: [r.x0, r.x1, (p, q) => [p, r.z0 + off, q, r.z0 + off]], s: [r.x0, r.x1, (p, q) => [p, r.z1 - off, q, r.z1 - off]], w: [r.z0, r.z1, (p, q) => [r.x0 + off, p, r.x0 + off, q]], e: [r.z0, r.z1, (p, q) => [r.x1 - off, p, r.x1 - off, q]] };
    for (const k of ['n', 's', 'w', 'e']) { if (r.skip && r.skip.includes(k)) continue; const [a, b, mk] = walls[k];
      for (const [p, q] of segs(a + 0.12, b - 0.12, o[k])) { if (q - p < 0.15) continue; const [x0, z0, x1, z1] = mk(p, q);
        DD.wallBase(x0, z0, x1, z1, k, y, r.wains ? 0.26 : 0.36, 0.3); DD.wallTop(x0, z0, x1, z1, k, top, 0.32); n++;
        // grime splash band low on service walls, scuffs, a leak streak or two under the ceiling
        const len = q - p, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, al = (t) => k === 'n' || k === 's' ? [p + t, z0] : [x0, p + t];
        if (!r.wains && (r.wall === W.M.blockTan || r.wall === W.M.block || r.wall === W.M.cream)) DD.add(cx, y + 0.35, cz, k, len, 0.7, 12);
        for (let i = 0; i < Math.floor(len / 2.5); i++) { const [xx, zz] = al(R(0.3, len - 0.3)); DD.add(xx, y + R(0.25, 1.1), zz, k, R(0.6, 1.3), 0.32, 2, 0, rnd() < 0.5); }
        if (rnd() < 0.55) { const [xx, zz] = al(R(0.3, len - 0.3)); DD.add(xx, top - 0.5, zz, k, R(0.4, 0.8), R(0.7, 1.1), 1); }
        if (rnd() < 0.25) { const [xx, zz] = al(R(0.4, len - 0.4)); DD.add(xx, top - 0.65, zz, k, 1.1, 1.0, 15); }
      } }
    // mildew in a corner or two, ceiling water rings, floor stains
    const cs = [[r.x0 + off, r.z0 + 0.45, 'w', Math.PI / 2], [r.x1 - off, r.z0 + 0.45, 'e', -Math.PI / 2], [r.x0 + off, r.z1 - 0.45, 'w', Math.PI], [r.x1 - off, r.z1 - 0.45, 'e', 0]];
    for (const [x, z, f, rot] of cs) if (rnd() < 0.4) DD.add(x, top - 0.4, z, f, 0.7, 0.7, 4, rot);
    const area = (r.x1 - r.x0) * (r.z1 - r.z0);
    if (r.ceil) for (let i = 0; i < Math.ceil(area / 14); i++) if (rnd() < 0.6) DD.add(R(r.x0 + 0.6, r.x1 - 0.6), top - 0.004, R(r.z0 + 0.6, r.z1 - 0.6), 'down', R(0.5, 1.1), R(0.5, 1.1), 0, R(0, 6));
    for (let i = 0; i < Math.ceil(area / 10); i++) DD.add(R(r.x0 + 0.5, r.x1 - 0.5), y + 0.004, R(r.z0 + 0.5, r.z1 - 0.5), 'up', R(0.3, 0.8), R(0.3, 0.8), rnd() < 0.7 ? 5 : 11, R(0, 6));
  }
  return { mesh: DD.flush(), walls: n };
}

// ---------- flatten static groups so their meshes can be merged ----------
export function flattenGroups(scene, W) {
  const refs = new Set(), seen = new Set();
  const walk = (o, d) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 3) return; seen.add(o); if (o.isObject3D) { refs.add(o); return; } if (o.isMaterial || o.isTexture || o.isVector3 || o.isColor) return;
    for (const k of Object.keys(o)) { if (d === 0 && ['scene', 'colliders', 'occluders', 'interact', 'vlights', 'M', 'GT', 'GT2', 'heights', 'surfaces', 'regions'].includes(k)) continue; walk(o[k], d + 1); } };
  walk(W, 0); for (const i of W.interact) refs.add(i.mesh); for (const o of W.occluders) refs.add(o);
  let moved = 0;
  for (const grp of [...scene.children]) {
    if (grp.isMesh || !(grp.isGroup || grp.type === 'Object3D') || refs.has(grp) || !grp.visible) continue; let bad = false; grp.traverse(o => { if (o !== grp && (refs.has(o) || (!o.isMesh && !o.isGroup))) bad = true; }); if (bad) continue;
    grp.updateMatrixWorld(true); const ms = []; grp.traverse(o => { if (o.isMesh) ms.push(o); }); for (const m of ms) { scene.attach(m); moved++; } scene.remove(grp);
  }
  return moved;
}

// ---------- cell merge: everything static that's left (walls included) merged per material per CELL x CELL m tile ----------
// Occluders (walls the line-of-sight rays use) stay in the scene as invisible ray targets (Raycaster ignores .visible); a merged copy draws them.
// Tiles keep frustum culling working, so a view only pays for the tiles it can see.
export function mergeCells(scene, W, { cell = 16, name = 'cellStatic' } = {}) {
  const refs = new Set(), seen = new Set();
  const walk = (o, d) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 3) return; seen.add(o); if (o.isObject3D) { refs.add(o); return; } if (o.isMaterial || o.isTexture || o.isVector3 || o.isColor) return;
    for (const k of Object.keys(o)) { if (d === 0 && ['scene', 'colliders', 'occluders', 'interact', 'vlights', 'M', 'GT', 'GT2', 'heights', 'surfaces', 'regions', 'gfxMerge', 'gfx2'].includes(k)) continue; walk(o[k], d + 1); } };
  walk(W, 0); const inter = new Set(W.interact.map(i => i.mesh)), occ = new Set(W.occluders);
  const box = new THREE.Box3(), c = new THREE.Vector3(), tiles = new Map();
  for (const m of [...scene.children]) {
    if (!m.isMesh || refs.has(m) || inter.has(m) || m.userData.batched || m.userData.decals || !m.visible) continue; const mat = m.material;
    if (!mat || Array.isArray(mat) || mat.visible === false || mat.transparent) continue; const g = m.geometry; if (!g.attributes.uv || !g.attributes.normal || g.morphAttributes.position) continue;
    m.updateMatrixWorld(true); box.setFromObject(m).getCenter(c); const key = Math.floor(c.x / cell) + ',' + Math.floor(c.z / cell);
    if (!tiles.has(key)) tiles.set(key, new Map()); const t = tiles.get(key); if (!t.has(mat)) t.set(mat, []); t.get(mat).push(m);
  }
  let merged = 0, hidden = 0, out = 0;
  for (const t of tiles.values()) { const B = new Batch(scene);
    for (const [mat, list] of t) { if (list.length < 2) continue; for (const m of list) { B.add(m.geometry, mat, m.matrixWorld, false); if (occ.has(m)) { m.visible = false; m.userData.occProxy = true; hidden++; } else { scene.remove(m); merged++; } } }
    out += B.flush({ name }).length; }
  return { merged, hidden, meshes: out };
}
