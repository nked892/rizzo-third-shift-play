// The Rizzo Center, compressed: loading dock -> engineering office -> service corridor -> stair B
// -> McLean guest hall + pantry -> terrace -> DuBose Home (enfilade hall, library, dining, butler's pantry, stair hall, suite).
// All geometry is procedural and original; inspired by (not copied from) reference photos of the real place.
import * as THREE from 'three';
import { labelTexture } from './textures.js';

const TH = 0.1; // wall thickness per side

export function buildWorld(scene, T) {
  const W = { colliders: [], occluders: [], interact: [], vlights: [], doors: [], heights: [], surfaces: [], anchors: {}, groups: {}, sounds: [], scene };

  // ---------- materials ----------
  const L = (map, s = 1, color = 0xffffff, extra = {}) => { const m = new THREE.MeshLambertMaterial({ map, color, ...extra }); m.userData.s = s; return m; };
  const C = (color, extra = {}) => { const m = new THREE.MeshLambertMaterial({ color, ...extra }); m.userData.s = 1; return m; };
  const M = W.M = {
    concrete: L(T.concrete, 3), block: L(T.block, 0.8), blockTan: L(T.block, 0.8, 0xd9caa8), hazard: L(T.hazard, 0.5), ceil: L(T.ceilTile, 0.6),
    carpetHall: L(T.carpetHall, 1.2), carpetRoom: L(T.carpetRoom, 1), cream: L(T.cream, 2), wains: L(T.wains, 1.0), damask: L(T.damask, 0.9),
    damaskBlue: L(T.damask, 0.9, 0x5f7fb8), stripe: L(T.stripe, 0.35), hardwood: L(T.hardwood, 2.2), pine: L(T.pine, 0.9), mahogany: L(T.mahogany, 0.8),
    brick: L(T.brick, 0.9), pavers: L(T.pavers, 1.2), vct: L(T.vct, 1.2), plate: L(T.plate, 0.6), rollup: L(T.rollup, 1.5), blue: L(T.blueRunner, 0.6),
    books: L(T.books, 0.9), hedge: L(T.hedge, 1), white: C(0xe8e4d8), trim: C(0xefece2), steel: C(0x9aa0a3), darkSteel: C(0x3c4043), black: C(0x111111),
    brass: C(0xb08d3c), cloth: C(0xf0eee6), navy: C(0x1c2a4a), beige: C(0xb7aa90), leather: C(0x4a2e22), red: C(0x8a1c14), yellow: C(0xc9a11e), wood: L(T.pine, 0.9, 0x8a6a50),
    damaskRose: L(T.damask, 0.9, 0xb98a80), damaskRed: L(T.damask, 0.9, 0x8a3a30), calico: L(T.calico, 0.4), bottles: L(T.bottles, 1),
    glass: new THREE.MeshLambertMaterial({ color: 0x223040, transparent: true, opacity: 0.35 }), nightGlass: C(0x0a0f18, { emissive: 0x05080d }),
  };
  M.glass.userData.s = 1; M.nightGlass.userData.s = 1;

  // ---------- geometry helpers ----------
  function boxGeo(w, h, d, s) {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
    return g;
  }
  function box(x0, y0, z0, x1, y1, z1, mat, o = {}) {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    const m = new THREE.Mesh(boxGeo(w, h, d, o.s || mat.userData.s || 1), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    (o.parent || scene).add(m);
    if (o.solid !== false) W.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), mesh: m });
    if (o.occ !== false) W.occluders.push(m);
    return m;
  }
  W.box = box;
  const deco = (x0, y0, z0, x1, y1, z1, mat, o = {}) => box(x0, y0, z0, x1, y1, z1, mat, { solid: false, occ: false, ...o });
  const solidDeco = (x0, y0, z0, x1, y1, z1, mat, o = {}) => box(x0, y0, z0, x1, y1, z1, mat, { occ: false, ...o });
  function cyl(x, y, z, r, h, mat, o = {}) { const m = new THREE.Mesh(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg || 12), mat); m.position.set(x, y + h / 2, z); scene.add(m); if (o.solid) W.colliders.push({ x0: x - r, x1: x + r, y0: y, y1: y + h, z0: z - r, z1: z + r }); return m; }
  function plane(x, y, z, w, h, mat, rotY = 0, rotX = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rotX, rotY, 0, 'YXZ'); scene.add(m); return m; }
  W.plane = plane;
  function label(x, y, z, w, h, lines, opts, rotY) { const t = labelTexture(lines, opts); return plane(x, y, z, w, h, new THREE.MeshLambertMaterial({ map: t, emissive: opts.glow ? 0xffffff : 0, emissiveMap: opts.glow ? t : null, emissiveIntensity: opts.glow || 0 }), rotY); }
  W.label = label;
  // wall-facing rotation for a plane on a given wall side of a room: n wall faces +z (rot 0), s faces -z (PI), w faces +x (PI/2), e faces -x (-PI/2)
  const ROT = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 };
  W.ROT = ROT;

  // ---------- lights (virtual, pooled at runtime) ----------
  function light(x, y, z, color, intensity, o = {}) {
    const v = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, base: intensity, dist: o.dist || 12, on: o.on !== false, flicker: o.flicker || 0, group: o.group || null, fixtures: [], level: 1 };
    W.vlights.push(v); return v;
  }
  W.light = light;
  function glowMat(color, i = 1) { const m = new THREE.MeshBasicMaterial({ color }); m.userData.base = new THREE.Color(color); m.userData.i = i; return m; }
  W.glowMat = glowMat;
  function troffer(x, y, z, v, len = 1.2, rotY = 0) { // fluorescent strip/troffer
    const g = glowMat(0xdfe8f0); const lens = deco(x - len / 2, y - 0.04, z - 0.15, x + len / 2, y, z + 0.15, g); lens.rotation.y = rotY;
    const body = deco(x - len / 2 - 0.03, y - 0.02, z - 0.18, x + len / 2 + 0.03, y + 0.05, z + 0.18, M.white); body.rotation.y = rotY;
    if (v) v.fixtures.push(g); return g;
  }
  function sconce(x, y, z, side, v) { // wall sconce with glowing shade
    const r = ROT[side]; const dx = Math.sin(r) * 0.12, dz = Math.cos(r) * 0.12;
    const g = glowMat(0xffd9a0); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.25, 10), g); s.position.set(x + dx, y, z + dz); scene.add(s);
    deco(x + dx - 0.02, y - 0.25, z + dz - 0.02, x + dx + 0.02, y - 0.12, z + dz + 0.02, M.brass);
    if (v) v.fixtures.push(g); return g;
  }
  function lantern(x, y, z, v, scale = 1) { // hanging glass lantern (DuBose)
    const s = scale; const g = glowMat(0xffd59a);
    deco(x - 0.01, y + 0.35 * s, z - 0.01, x + 0.01, y + 1.2, z + 0.01, M.black);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.4 * s, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a7a5a, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); glass.position.set(x, y + 0.1 * s, z); scene.add(glass);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 6), g); bulb.position.set(x, y + 0.08 * s, z); scene.add(bulb);
    deco(x - 0.18 * s, y + 0.3 * s, z - 0.18 * s, x + 0.18 * s, y + 0.34 * s, z + 0.18 * s, M.brass); deco(x - 0.14 * s, y - 0.12 * s, z - 0.14 * s, x + 0.14 * s, y - 0.09 * s, z + 0.14 * s, M.brass);
    if (v) v.fixtures.push(g);
  }
  function chandelier(x, y, z, v) {
    const g = glowMat(0xffe2b0);
    deco(x - 0.015, y + 0.3, z - 0.015, x + 0.015, y + 2, z + 0.015, M.brass);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 20), M.brass); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); scene.add(ring);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), g); c.position.set(x + Math.cos(a) * 0.45, y + 0.08, z + Math.sin(a) * 0.45); scene.add(c);
      const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0.7 })); p.position.set(x + Math.cos(a) * 0.3, y - 0.2, z + Math.sin(a) * 0.3); scene.add(p); }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), g); core.position.set(x, y - 0.05, z); scene.add(core);
    if (v) v.fixtures.push(g);
  }

  // ---------- room builder ----------
  function subtract(a, b, holes) { const segs = []; let cur = a; [...holes].sort((p, q) => p[0] - q[0]).forEach(h => { if (h[0] > cur) segs.push([cur, h[0]]); cur = Math.max(cur, h[1]); }); if (cur < b) segs.push([cur, b]); return segs; }
  function room(r) {
    const y = r.y || 0, h = r.h || 3, base = Math.min(0, y), top = y + h;
    const o = r.open || {};
    if (r.floor) box(r.x0, y - 0.1, r.z0, r.x1, y, r.z1, r.floor, { solid: false, s: r.fs });
    if (r.ceil) box(r.x0, top, r.z0, r.x1, top + 0.1, r.z1, r.ceil, { solid: false });
    const sides = {
      n: { a: r.x0, b: r.x1, mk: (p, q, y0, y1, m, inset = 0) => box(p, y0, r.z0, q, y1, r.z0 + TH + inset, m) },
      s: { a: r.x0, b: r.x1, mk: (p, q, y0, y1, m, inset = 0) => box(p, y0, r.z1 - TH - inset, q, y1, r.z1, m) },
      w: { a: r.z0, b: r.z1, mk: (p, q, y0, y1, m, inset = 0) => box(r.x0, y0, p, r.x0 + TH + inset, y1, q, m) },
      e: { a: r.z0, b: r.z1, mk: (p, q, y0, y1, m, inset = 0) => box(r.x1 - TH - inset, y0, p, r.x1, y1, q, m) },
    };
    for (const k of ['n', 's', 'w', 'e']) {
      if (r.skip && r.skip.includes(k)) continue;
      const S = sides[k]; const holes = o[k] || [];
      const wallMat = (r.walls && r.walls[k]) || r.wall;
      for (const [p, q] of subtract(S.a, S.b, holes)) {
        if (r.wains) { S.mk(p, q, base, y + 0.95, r.wains); S.mk(p, q, y + 0.95, y + 1.0, M.trim, 0.035); S.mk(p, q, y + 1.0, top, wallMat); S.mk(p, q, y, y + 0.14, M.trim, 0.02); }
        else { S.mk(p, q, base, top, wallMat); if (r.base) S.mk(p, q, y, y + 0.12, r.base, 0.02); }
        if (r.crown) S.mk(p, q, top - 0.12, top, M.trim, 0.06);
      }
      for (const hole of holes) {
        const ht = y + (hole[2] || 2.25);
        if (ht < top) S.mk(hole[0], hole[1], ht, top, wallMat);
        if (r.casing !== false) { const cm = r.casing || M.trim; S.mk(hole[0] - 0.12, hole[0], y, ht + 0.12, cm, 0.04); S.mk(hole[1], hole[1] + 0.12, y, ht + 0.12, cm, 0.04); S.mk(hole[0] - 0.12, hole[1] + 0.12, ht, ht + 0.12, cm, 0.04); }
      }
    }
    if (r.surface) W.surfaces.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, s: r.surface, y });
    if (y) W.heights.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, f: () => y });
    return r;
  }

  // ---------- doors ----------
  function door(x, z, axis, w, o = {}) {
    const hgt = o.h || 2.2, y = o.y || 0, th = 0.05;
    const pivot = new THREE.Group(); const mat = o.mat || M.pine;
    let panel;
    if (axis === 'x') { pivot.position.set(x - w / 2, y, z); panel = box(0, 0, -th, w, hgt, th, mat, { solid: false, occ: false, parent: pivot }); }
    else { pivot.position.set(x, y, z - w / 2); panel = box(-th, 0, 0, th, hgt, w, mat, { solid: false, occ: false, parent: pivot }); }
    // panel detailing + handle
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.brass);
    if (axis === 'x') { knob.position.set(w - 0.1, 1.0, 0); } else { knob.position.set(0, 1.0, w - 0.1); }
    knob.scale.set(axis === 'x' ? 1 : 3.2, 1, axis === 'x' ? 3.2 : 1); pivot.add(knob);
    if (o.window) { const gw = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), M.nightGlass); if (axis === 'x') { gw.position.set(w / 2, 1.5, th + 0.002); } else { gw.position.set(th + 0.002, 1.5, w / 2); gw.rotation.y = Math.PI / 2; } pivot.add(gw); }
    scene.add(pivot); W.occluders.push(panel);
    const col = axis === 'x' ? { x0: x - w / 2, x1: x + w / 2, z0: z - 0.08, z1: z + 0.08, y0: y, y1: y + hgt } : { x0: x - 0.08, x1: x + 0.08, z0: z - w / 2, z1: z + w / 2, y0: y, y1: y + hgt };
    const D = { pivot, panel, axis, w, x, z, col, open: false, angle: 0, target: 0, swing: o.swing || 1, locked: !!o.locked, key: o.key, name: o.name || 'door', broken: false, onOpen: o.onOpen, lockedMsg: o.lockedMsg,
      sturdy: !o.breakable, peekA: 0 }; // sturdy doors hold: 173 pounds, then backs off (see Story.bash). peekA = cracked-open angle while peeking
    W.colliders.push(col); D.colIdx = W.colliders.length - 1;
    D.setOpen = (v, snd = true) => { D.open = v; D.target = v ? D.swing * 1.75 : 0; col.disabled = v; if (snd && W.sound) W.sound.door(new THREE.Vector3(x, y + 1, z), v); if (v && D.onOpen) D.onOpen(D); };
    W.doors.push(D);
    W.interact.push({ mesh: panel, door: D, range: 2.2,
      prompt: () => D.broken ? null : (D.locked && !(D.key && W.has && W.has(D.key))) ? (D.lockedMsg || 'Locked') : (D.open ? 'Close' : 'Open'),
      use: () => { if (D.broken) return; if (D.locked && !(D.key && W.has && W.has(D.key))) { W.sound && W.sound.locked(new THREE.Vector3(x, 1, z)); W.toast && W.toast(D.lockedMsg || 'Locked.'); D.onLocked && D.onLocked(D); return; } if (D.locked) { D.locked = false; W.toast && W.toast('Unlocked with ' + D.key + '.'); } D.setOpen(!D.open); } });
    const proxy = deco(col.x0, y + 0.1, col.z0, col.x1, y + hgt - 0.1, col.z1, new THREE.MeshBasicMaterial({ visible: false }));
    W.interact.push({ mesh: proxy, door: D, range: 1.9, enabled: () => D.open && !D.broken, prompt: () => 'Close', use: () => D.setOpen(false) });
    return D;
  }
  W.door = door;
  // non-opening guest-room door applied on a wall face
  function fakeDoor(x, z, side, num, o = {}) {
    const r = ROT[side]; const nx = Math.sin(r), nz = Math.cos(r); const w = 0.95, h = 2.15;
    const along = side === 'n' || side === 's';
    const px = x + nx * 0.02, pz = z + nz * 0.02;
    const d = plane(px, h / 2, pz, w, h, o.mat || M.mahogany, r);
    // casing
    const cm = o.casing || M.trim;
    if (along) { deco(x - w / 2 - 0.1, 0, z - 0.04, x - w / 2, h + 0.1, z + 0.04, cm); deco(x + w / 2, 0, z - 0.04, x + w / 2 + 0.1, h + 0.1, z + 0.04, cm); deco(x - w / 2 - 0.1, h, z - 0.04, x + w / 2 + 0.1, h + 0.1, z + 0.04, cm); }
    else { deco(x - 0.04, 0, z - w / 2 - 0.1, x + 0.04, h + 0.1, z - w / 2, cm); deco(x - 0.04, 0, z + w / 2, x + 0.04, h + 0.1, z + w / 2 + 0.1, cm); deco(x - 0.04, h, z - w / 2 - 0.1, x + 0.04, h + 0.1, z + w / 2 + 0.1, cm); }
    const hx = along ? x + w / 2 - 0.12 : px + nx * 0.03, hz = along ? pz + nz * 0.03 : z + w / 2 - 0.12;
    const hd = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.12 : 0.03, 0.03, along ? 0.03 : 0.12), M.brass); hd.position.set(hx, 1.0, hz); scene.add(hd);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.06 : 0.02, 0.12, along ? 0.02 : 0.06), M.darkSteel); lock.position.set(hx, 1.15, hz); scene.add(lock);
    if (num) label(px + nx * 0.01 + (along ? 0 : 0), 1.62, pz + nz * 0.01, 0.22, 0.12, [String(num)], { w: 128, h: 64, size: 34, bg: '#b39253', fg: '#2a1c0a', bold: true, font: 'Georgia, serif' }, r);
    W.interact.push({ mesh: d, range: 2, prompt: () => 'Room ' + (num || ''), use: () => { W.sound && W.sound.locked(new THREE.Vector3(x, 1, z)); W.toast && W.toast(o.msg || 'Guest room. Do Not Disturb hours. Leave it.'); } });
    return d;
  }
  function picture(x, y, z, side, w, h, hue) {
    const r = ROT[side]; const nx = Math.sin(r), nz = Math.cos(r);
    const c = document.createElement('canvas'); c.width = 64; c.height = 48; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 48); grd.addColorStop(0, `hsl(${hue},25%,45%)`); grd.addColorStop(0.6, `hsl(${hue + 30},20%,30%)`); grd.addColorStop(1, `hsl(${hue + 60},25%,18%)`); g.fillStyle = grd; g.fillRect(0, 0, 64, 48);
    g.fillStyle = `hsla(${hue + 90},20%,15%,0.8)`; g.beginPath(); g.moveTo(0, 36); for (let i = 0; i <= 8; i++) g.lineTo(i * 8, 28 + Math.sin(i * 1.7 + hue) * 6); g.lineTo(64, 48); g.lineTo(0, 48); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    plane(x + nx * 0.04, y, z + nz * 0.04, w, h, new THREE.MeshLambertMaterial({ map: t }), r);
    const f = plane(x + nx * 0.035, y, z + nz * 0.035, w + 0.12, h + 0.12, M.brass, r);
  }
  function rug(x0, z0, x1, z1, y = 0) { const m = plane((x0 + x1) / 2, y + 0.006, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), new THREE.MeshLambertMaterial({ map: T.rug }), 0, -Math.PI / 2); return m; }
  function chair(x, z, rotY, mat = M.beige, y = 0, wood = M.mahogany) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
    box(-0.3, 0.38, -0.3, 0.3, 0.5, 0.3, mat, { parent: g, solid: false, occ: false }); box(-0.3, 0.5, 0.22, 0.3, 1.05, 0.3, mat, { parent: g, solid: false, occ: false });
    for (const [a, b] of [[-0.27, -0.27], [0.24, -0.27], [-0.27, 0.24], [0.24, 0.24]]) box(a, 0, b, a + 0.04, 0.38, b + 0.04, wood, { parent: g, solid: false, occ: false });
    W.colliders.push({ x0: x - 0.32, x1: x + 0.32, z0: z - 0.32, z1: z + 0.32, y0: y, y1: y + 1 });
  }
  function armchair(x, z, rotY, mat = M.beige, y = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
    box(-0.42, 0.12, -0.4, 0.42, 0.45, 0.4, mat, { parent: g, solid: false, occ: false }); box(-0.42, 0.45, 0.25, 0.42, 1.0, 0.4, mat, { parent: g, solid: false, occ: false });
    box(-0.42, 0.45, -0.4, -0.3, 0.68, 0.4, mat, { parent: g, solid: false, occ: false }); box(0.3, 0.45, -0.4, 0.42, 0.68, 0.4, mat, { parent: g, solid: false, occ: false });
    box(-0.4, 0, -0.38, 0.4, 0.12, 0.38, M.mahogany, { parent: g, solid: false, occ: false });
    W.colliders.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45, y0: y, y1: y + 1 });
  }
  function fireplace(x, z, side, y = 0) { // brick firebox + white mantel on a wall
    const r = ROT[side]; const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = r; scene.add(g);
    box(-0.9, 0, 0, 0.9, 1.25, 0.3, M.trim, { parent: g, solid: false, occ: false }); box(-1.0, 1.25, 0, 1.0, 1.35, 0.38, M.trim, { parent: g, solid: false, occ: false });
    box(-0.55, 0, 0.3, 0.55, 0.85, 0.31, M.black, { parent: g, solid: false, occ: false }); box(-0.9, 0, 0.3, 0.9, 0.04, 0.7, M.brick, { parent: g, solid: false, occ: false });
    box(-0.4, 1.6, 0.0, 0.4, 2.3, 0.04, M.brass, { parent: g, solid: false, occ: false }); box(-0.36, 1.64, 0.04, 0.36, 2.26, 0.05, M.nightGlass, { parent: g, solid: false, occ: false });
  }
  function windowOn(x, y, z, side, w = 1.0, h = 1.6, drapes = M.navy) { // divided-light window, black night outside
    const r = ROT[side]; const nx = Math.sin(r), nz = Math.cos(r); const along = side === 'n' || side === 's';
    plane(x + nx * 0.015, y, z + nz * 0.015, w, h, M.nightGlass, r);
    for (let i = 1; i < 3; i++) { const o = -w / 2 + i * w / 3; along ? deco(x + o - 0.02, y - h / 2, z - 0.03, x + o + 0.02, y + h / 2, z + 0.03, M.trim) : deco(x - 0.03, y - h / 2, z + o - 0.02, x + 0.03, y + h / 2, z + o + 0.02, M.trim); }
    for (let i = 1; i < 4; i++) { const o = -h / 2 + i * h / 4; along ? deco(x - w / 2, y + o - 0.02, z - 0.03, x + w / 2, y + o + 0.02, z + 0.03, M.trim) : deco(x - 0.03, y + o - 0.02, z - w / 2, x + 0.03, y + o + 0.02, z + w / 2, M.trim); }
    along ? deco(x - w / 2 - 0.08, y - h / 2 - 0.08, z - 0.04, x + w / 2 + 0.08, y + h / 2 + 0.08, z + 0.04, M.trim, {}) : deco(x - 0.04, y - h / 2 - 0.08, z - w / 2 - 0.08, x + 0.04, y + h / 2 + 0.08, z + w / 2 + 0.08, M.trim);
    if (drapes) for (const sgn of [-1, 1]) { const o = sgn * (w / 2 + 0.2); along ? deco(x + o - 0.18, y - h / 2 - 0.4, z + nz * 0.08 - 0.05, x + o + 0.18, y + h / 2 + 0.4, z + nz * 0.08 + 0.05, drapes) : deco(x + nx * 0.08 - 0.05, y - h / 2 - 0.4, z + o - 0.18, x + nx * 0.08 + 0.05, y + h / 2 + 0.4, z + o + 0.18, drapes); }
  }

  // =====================================================================
  // LOADING DOCK  x[0,16] z[0,12]
  // =====================================================================
  room({ x0: 0, z0: 0, x1: 16, z1: 12, h: 5.5, floor: M.concrete, wall: M.block, base: M.hazard, casing: M.darkSteel, open: { n: [[2.4, 3.4, 2.2], [8, 10.4, 2.6]], e: [[9.8, 10.8, 2.2]] }, surface: 'concrete' });
  W.groups.dock = [];
  { const v1 = light(5, 4.6, 6, 0xd8e6ff, 9, { dist: 14, group: 'dock' }), v2 = light(11.5, 4.6, 4, 0xd8e6ff, 8, { dist: 14, flicker: 0.15, group: 'dock' });
    for (const [x, z, v] of [[5, 6, v1], [11.5, 4, v2]]) { troffer(x, 4.7, z, v, 2.4); deco(x - 0.01, 4.75, z - 0.01, x + 0.01, 5.5, z + 0.01, M.black); }
    light(13, 2.9, 1.0, 0xffc890, 2.5, { dist: 6, group: 'dock' }); // caged bulb over the corridor door
    const cage = glowMat(0xffd090); deco(12.9, 2.75, 0.12, 13.1, 2.95, 0.28, cage); W.vlights[W.vlights.length - 1].fixtures.push(cage); }
  // roll-up doors + dock bumpers on south wall
  for (const x0 of [2, 9]) { deco(x0, 0.0, 11.86, x0 + 5, 4.0, 11.9, M.rollup); deco(x0 - 0.15, 0, 11.8, x0, 4.2, 11.9, M.yellow); deco(x0 + 5, 0, 11.8, x0 + 5.15, 4.2, 11.9, M.yellow); deco(x0 - 0.1, 4.0, 11.6, x0 + 5.1, 4.4, 11.9, M.darkSteel);
    deco(x0 + 0.6, 1.0, 11.6, x0 + 1.0, 1.4, 11.9, M.black); deco(x0 + 4.0, 1.0, 11.6, x0 + 4.4, 1.4, 11.9, M.black); deco(x0 + 1.5, 0, 9.8, x0 + 3.5, 0.03, 11.8, M.plate); }
  W.anchors.rollup = new THREE.Vector3(9, 2, 11.8);
  label(4.5, 4.6, 11.85, 2.6, 0.4, ['DOCK 1'], { w: 256, h: 40, size: 30, bg: '#1d1b17', fg: '#d9b23a', bold: true }, Math.PI);
  label(11.5, 4.6, 11.85, 2.6, 0.4, ['DOCK 2'], { w: 256, h: 40, size: 30, bg: '#1d1b17', fg: '#d9b23a', bold: true }, Math.PI);
  // bollards
  for (const x of [1.6, 7.6, 8.6, 14.6]) { const b = cyl(x, 0, 10.8, 0.11, 1.1, M.yellow, { solid: true }); }
  // time clock on west wall + badge rack + bulletin board
  { const x = 0.1; deco(x, 1.15, 3.55, x + 0.16, 1.65, 4.05, M.darkSteel); W.anchors.timeclock = new THREE.Vector3(0.3, 1.4, 3.8);
    const scr = glowMat(0x7fd18c); deco(x + 0.161, 1.45, 3.65, x + 0.165, 1.58, 3.95, scr);
    label(x + 0.17, 1.27, 3.8, 0.26, 0.1, ['SWIPE'], { w: 128, h: 48, size: 30, bg: '#222', fg: '#ddd' }, Math.PI / 2);
    W.timeclockMesh = deco(x, 1.1, 3.5, x + 0.2, 1.7, 4.1, new THREE.MeshBasicMaterial({ visible: false }));
    deco(x, 1.0, 4.3, x + 0.06, 1.8, 4.9, M.steel); for (let i = 0; i < 6; i++) deco(x + 0.06, 1.05 + i * 0.12, 4.35, x + 0.1, 1.12 + i * 0.12, 4.85, i % 2 ? M.cloth : M.beige);
    label(x + 0.03, 2.1, 3.8, 1.2, 0.4, ['CLOCK IN / OUT', 'ALL HOURLY STAFF'], { w: 256, h: 80, size: 22, bg: '#efe9d6', fg: '#8a1c14', bold: true }, Math.PI / 2);
    deco(x, 1.3, 5.6, x + 0.05, 2.3, 7.4, L(T.ceilTile, 1, 0xa08060));
    label(x + 0.06, 1.95, 6.0, 0.35, 0.45, ['SAFETY', 'FIRST', '', '___'], { w: 128, h: 160, size: 18, bg: '#f0f0e8', fg: '#222' }, Math.PI / 2);
    label(x + 0.06, 1.7, 6.9, 0.4, 0.5, ['3RD SHIFT', 'ENG ON CALL', 'x4411'], { w: 128, h: 160, size: 18, bg: '#f4e9a0', fg: '#222' }, Math.PI / 2); }
  // pallets, boxes, linen cart, trash
  function pallet(x, z, stack = 0) { solidDeco(x - 0.6, 0, z - 0.5, x + 0.6, 0.15, z + 0.5, M.wood); for (let i = 0; i < stack; i++) { const s = 0.3 + Math.random() * 0.15; solidDeco(x - 0.55 + (i % 2) * 0.55, 0.15 + Math.floor(i / 2) * 0.45, z - 0.45, x - 0.05 + (i % 2) * 0.55, 0.15 + Math.floor(i / 2) * 0.45 + s + 0.1, z + 0.45, M.beige); } }
  pallet(13.8, 8.5, 4); pallet(13.8, 6.6, 2); pallet(2.2, 9.6, 3);
  { // linen cart
    solidDeco(5.5, 0.2, 2.2, 6.9, 1.2, 3.0, M.beige); deco(5.5, 1.2, 2.2, 6.9, 1.4, 3.0, M.cloth); for (const [a, b] of [[5.55, 2.25], [6.8, 2.25], [5.55, 2.9], [6.8, 2.9]]) deco(a, 0, b, a + 0.05, 0.2, b + 0.05, M.black); }
  { // trash toters + compactor panel
    cyl(15.2, 0, 1.2, 0.38, 1.05, L(T.concrete, 1, 0x2d4a2d), { solid: true }); cyl(15.2, 0, 2.1, 0.38, 1.05, L(T.concrete, 1, 0x2d4a2d), { solid: true });
    deco(15.85, 1.2, 4.5, 15.9, 1.9, 5.1, M.darkSteel); label(15.84, 1.75, 4.8, 0.5, 0.15, ['COMPACTOR'], { w: 128, h: 32, size: 16, bg: '#333', fg: '#eee' }, -Math.PI / 2); }
  // pipes on ceiling
  deco(0, 5.0, 0.4, 16, 5.15, 0.55, M.steel); deco(0, 4.8, 0.7, 16, 4.88, 0.78, L(T.concrete, 1, 0x8a2a1a));
  label(9.2, 2.85, 0.12, 2.0, 0.3, ['ENGINEERING  ·  McLEAN HALL  →'], { w: 512, h: 64, size: 30, bg: '#1d2a44', fg: '#e8e4d8' }, 0);
  label(2.9, 2.4, 0.12, 1.1, 0.22, ['MAINTENANCE'], { w: 256, h: 48, size: 28, bg: '#1d2a44', fg: '#e8e4d8', bold: true }, 0);
  W.surfaces.push({ x0: 0, x1: 16, z0: 0, z1: 12, s: 'concrete' });
  // ---- employee lot door (east wall): Clint's way out at 10:58. Steel man door, locked for you all night. ----
  W.doors.lotDoor = door(15.95, 10.3, 'z', 1.0, { swing: 1, mat: L(T.concrete, 1, 0x56606a), locked: true, name: 'lot', lockedMsg: 'Employee lot. You\'re on till seven.' });
  label(15.84, 2.45, 10.3, 0.9, 0.2, ['EXIT · EMPLOYEE LOT'], { w: 256, h: 56, size: 24, bg: '#7a1410', fg: '#f2efe6', bold: true }, -Math.PI / 2);
  deco(15.82, 1.0, 10.62, 15.86, 1.06, 10.74, M.darkSteel); // push bar
  { // outside: a slab of the lot under a sodium light, then night
    box(16, -0.1, 8.9, 20.0, 0, 11.7, L(T.concrete, 1, 0x3a3a3e), { solid: false });
    const night = C(0x05070c, { emissive: 0x030409 });
    box(19.9, 0, 8.9, 20.0, 4, 11.7, night); box(16, 0, 8.8, 20.0, 4, 8.9, night); box(16, 0, 11.7, 20.0, 4, 11.8, night); box(16, 3.2, 8.9, 20.0, 3.3, 11.7, night, { solid: false });
    for (const [z, c] of [[9.4, 0xffa040], [11.1, 0xffb050]]) { const m = glowMat(c); deco(19.88, 1.6 + Math.random() * 0.6, z, 19.9, 1.7 + Math.random() * 0.6, z + 0.12, m); } // far lot poles
    light(17.3, 3.0, 10.3, 0xffa860, 2.6, { dist: 6, group: 'dock' }); const sod = glowMat(0xffb060); deco(17.1, 3.05, 10.15, 17.5, 3.15, 10.45, sod); W.vlights[W.vlights.length - 1].fixtures.push(sod);
    W.anchors.lot = new THREE.Vector3(17.6, 0, 10.3);
    W.colliders.push({ x0: 16.05, x1: 16.5, z0: 9.75, z1: 10.85, y0: 0, y1: 2.3 }); } // you never follow him out (the door is his, not yours)
  // ---- Clint: chief engineer, waiting at the time clock to go home. Stylized, simple shapes, no likeness:
  //      heavyset, bald, blue short-sleeve button-down work shirt, black pants, cigarette. Faces +z locally. ----
  { const G = W.clint = new THREE.Group(); scene.add(G);
    const skin = C(0xc58f6c), shirt = C(0x3e6496), shirtD = C(0x2f4e78), pants = C(0x16161a), shoe = C(0x0b0b0c), belt = C(0x231a14), brow = C(0x5a3a28);
    const B = (x0, y0, z0, x1, y1, z1, m, p = G) => box(x0, y0, z0, x1, y1, z1, m, { parent: p, solid: false, occ: false });
    const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, p = G) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); p.add(o); return o; };
    const limb = (len, r0, r1, m, p) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 10), m); c.position.y = -len / 2; p.add(c); return c; };
    // legs (hip pivots, for the walk out)
    W.clintLegs = [];
    for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * 0.125, 0.9, 0); G.add(hip); limb(0.84, 0.12, 0.1, pants, hip);
      B(-0.075, -0.9, -0.09, 0.075, -0.82, 0.19, shoe, hip); W.clintLegs.push(hip); }
    // belt + heavy middle
    const beltM = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 16), belt); beltM.scale.z = 0.9; beltM.position.set(0, 0.93, 0.02); G.add(beltM);
    B(-0.04, 0.905, 0.25, 0.04, 0.955, 0.265, C(0x9a8a60)); // buckle
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.285, 0.6, 16), shirt); torso.scale.z = 0.8; torso.position.set(0, 1.25, 0); G.add(torso);
    sph(0.29, shirt, 0, 1.1, 0.05, 1.0, 0.82, 0.88); // belly, shirt stretched over it
    for (const sx of [-1, 1]) sph(0.115, shirt, sx * 0.265, 1.49, 0, 1, 0.8, 1); // shoulders
    // collar, placket + buttons, chest pocket + pen, name patch
    for (const sx of [-1, 1]) { const c = B(-0.06, -0.025, -0.012, 0.06, 0.025, 0.012, shirtD); c.position.set(sx * 0.06, 1.55, 0.17); c.rotation.z = sx * 0.5; c.rotation.x = -0.3; }
    B(-0.016, 1.33, 0.205, 0.016, 1.53, 0.217, shirtD); for (let i = 0; i < 3; i++) sph(0.009, C(0xe8e8e0), 0, 1.36 + i * 0.065, 0.219);
    B(0.06, 1.33, 0.2, 0.16, 1.43, 0.212, shirtD); const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 6), C(0x111111)); pen.position.set(0.085, 1.42, 0.214); G.add(pen);
    { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48; const x = cv.getContext('2d'); x.fillStyle = '#f2efe6'; x.beginPath(); x.ellipse(64, 24, 62, 22, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#b3261e'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#b3261e'; x.font = 'italic bold 26px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Clint', 64, 25);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.042), new THREE.MeshLambertMaterial({ map: t, transparent: true })); pm.position.set(-0.11, 1.4, 0.208); G.add(pm); }
    // arms: shoulder group -> short blue sleeve + bare upper arm -> elbow group -> forearm + hand
    const arm = (sx) => { const S = new THREE.Group(); S.position.set(sx * 0.31, 1.48, 0); G.add(S);
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.082, 0.18, 10), shirt); sl.position.y = -0.07; S.add(sl);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.06, 0.16, 10), skin); up.position.y = -0.21; S.add(up);
      const E = new THREE.Group(); E.position.y = -0.29; S.add(E); limb(0.27, 0.058, 0.048, skin, E);
      const hand = sph(0.045, skin, 0, -0.3, 0.01, 0.85, 1.15, 0.8, E); return { S, E, hand }; };
    W.clintArmL = arm(-1); W.clintArmR = arm(1);
    // cigarette between the right hand's fingers: paper, filter, ember (brightens on a drag)
    { const cig = W.clintCig = new THREE.Group(); cig.position.set(0, -0.33, 0.06); cig.rotation.x = Math.PI / 2; W.clintArmR.E.add(cig);
      const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.075, 6), C(0xf0ece2)); paper.position.y = 0.0; cig.add(paper);
      const filt = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.024, 6), C(0xc8893c)); filt.position.y = -0.049; cig.add(filt);
      const em = W.clintEmber = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 8, 6), glowMat(0xff5a14)); em.position.y = 0.04; cig.add(em); }
    // neck + bald head: ears, a heavy brow (scowling), nose
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.1, 10), skin); neck.position.set(0, 1.59, 0.0); G.add(neck);
    const H = W.clintHead = new THREE.Group(); H.position.set(0, 1.63, 0.01); G.add(H);
    sph(0.118, skin, 0, 0.11, 0, 0.98, 1.08, 1.02, H); sph(0.112, C(0xd09a78), 0, 0.15, -0.005, 0.94, 0.92, 0.98, H); // crown catches the light
    for (const sx of [-1, 1]) { sph(0.026, skin, sx * 0.115, 0.1, -0.005, 0.5, 1, 0.85, H); const b = B(-0.04, -0.008, -0.008, 0.04, 0.008, 0.008, brow, H); b.position.set(sx * 0.045, 0.14, 0.108); b.rotation.z = sx * 0.28; }
    sph(0.02, skin, 0, 0.09, 0.118, 0.9, 1.1, 1, H); sph(0.068, skin, 0, 0.035, 0.035, 1.35, 0.65, 1.15, H); // nose, jowls
    W.anchors.clintHead = new THREE.Vector3(); W.clintPick = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.8, 0.6), new THREE.MeshBasicMaterial({ visible: false })); W.clintPick.position.y = 0.9; G.add(W.clintPick);
    W.clintCol = { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 1.8, disabled: true }; W.colliders.push(W.clintCol);
    W.placeClint = (x, z, ry) => { G.position.set(x, 0, z); G.rotation.y = ry; G.updateMatrixWorld(true); W.clintHead.getWorldPosition(W.anchors.clintHead); W.anchors.clintHead.y += 0.08;
      Object.assign(W.clintCol, { x0: x - 0.34, x1: x + 0.34, z0: z - 0.34, z1: z + 0.34 }); };
    W.placeClint(1.2, 4.75, 1.0); }

  // =====================================================================
  // MAINTENANCE / ENGINEERING OFFICE  x[0,6] z[-5,0] (just inside the dock door)
  // =====================================================================
  room({ x0: 0, z0: -5, x1: 6, z1: 0, h: 2.7, floor: M.vct, ceil: M.ceil, wall: M.blockTan, base: M.darkSteel, casing: M.darkSteel, open: { s: [[2.4, 3.4, 2.2]] }, surface: 'tile' });
  W.doors.officeDoor = door(2.9, -0.05, 'x', 1.0, { swing: 1, mat: L(T.rollup, 1, 0x9fa4a6), window: true, name: 'office' });
  { const v = light(3, 2.6, -2.5, 0xe8f0ff, 5, { dist: 9, group: 'office' }); troffer(3, 2.69, -2.5, v, 1.2); troffer(3, 2.69, -2.1, null, 1.2).userData.parentLight = v; v.fixtures.push(W.scene.children[W.scene.children.length - 2].material); }
  // desk + chair + radio charger
  solidDeco(0.6, 0, -4.9, 2.9, 0.76, -4.2, M.steel); deco(0.6, 0.76, -4.9, 2.9, 0.8, -4.2, L(T.concrete, 1, 0x7a6b52));
  { const g = glowMat(0x22ff44); deco(1.9, 0.8, -4.75, 2.3, 0.86, -4.55, M.black); const led = deco(2.22, 0.86, -4.6, 2.25, 0.87, -4.57, g);
    W.radioMesh = deco(1.98, 0.86, -4.72, 2.08, 1.08, -4.62, M.black); deco(2.03, 1.08, -4.69, 2.05, 1.28, -4.67, M.black); W.anchors.radio = new THREE.Vector3(2.0, 0.95, -4.65);
    W.radioPick = deco(1.8, 0.8, -4.9, 2.4, 1.3, -4.4, new THREE.MeshBasicMaterial({ visible: false })); W.radioLed = led; }
  deco(0.8, 0.8, -4.85, 1.5, 1.25, -4.75, M.black); deco(0.85, 0.85, -4.84, 1.45, 1.2, -4.83, glowMat(0x203040)); // old monitor
  label(1.15, 1.03, -4.825, 0.58, 0.33, ['WORK ORDERS', '0 OPEN'], { w: 128, h: 72, size: 14, bg: '#0c1824', fg: '#7fd18c', glow: 0.8 }, 0);
  chair(1.7, -3.6, Math.PI, L(T.concrete, 1, 0x202020), 0, M.black);
  // key cabinet on east wall
  { const x = 5.9; deco(x - 0.12, 1.1, -3.0, x, 1.9, -2.2, M.darkSteel); W.keyMesh = deco(x - 0.13, 1.1, -3.0, x - 0.12, 1.9, -2.2, L(T.plate, 0.3, 0x55595b));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) deco(x - 0.135, 1.75 - r * 0.17, -2.92 + c * 0.15, x - 0.125, 1.8 - r * 0.17, -2.88 + c * 0.15, M.brass);
    label(x - 0.14, 2.0, -2.6, 0.7, 0.12, ['KEYS — ENG ONLY'], { w: 256, h: 40, size: 22, bg: '#ddd', fg: '#a00', bold: true }, -Math.PI / 2); W.anchors.keys = new THREE.Vector3(5.7, 1.5, -2.6); }
  // metal shelving with ballast boxes and lamp cartons on west wall
  { solidDeco(0.1, 0, -4.0, 0.55, 2.1, -1.2, new THREE.MeshLambertMaterial({ color: 0x5a6068, transparent: true, opacity: 0.0 }));
    for (let s = 0; s < 4; s++) deco(0.1, 0.2 + s * 0.6, -4.0, 0.55, 0.24 + s * 0.6, -1.2, M.steel);
    for (const z of [-4.0, -1.24]) for (const x of [0.1, 0.51]) deco(x, 0, z, x + 0.04, 2.1, z + 0.04, M.steel);
    for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++) deco(0.15, 0.24 + s * 0.6, -3.9 + i * 0.65, 0.5, 0.24 + s * 0.6 + 0.22 + (i % 2) * 0.08, -3.4 + i * 0.65, i % 2 ? M.beige : L(T.ceilTile, 1, 0xd8cfa8));
    label(0.56, 1.15, -2.6, 0.5, 0.12, ['BALLASTS'], { w: 128, h: 32, size: 18, bg: '#d8cfa8', fg: '#222' }, Math.PI / 2);
    W.ballastMesh = deco(0.1, 0.8, -3.2, 0.6, 1.5, -2.0, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.ballast = new THREE.Vector3(0.4, 1.1, -2.6); }
  // pegboard with tools and a whiteboard on north wall
  deco(3.4, 1.0, -4.92, 5.6, 2.0, -4.9, L(T.ceilTile, 0.3, 0xa58a62)); for (let i = 0; i < 8; i++) deco(3.6 + i * 0.25, 1.3 + (i % 3) * 0.2, -4.9, 3.66 + i * 0.25, 1.6 + (i % 3) * 0.2, -4.86, i % 2 ? M.red : M.darkSteel);
  solidDeco(3.4, 0, -4.9, 5.6, 0.9, -4.3, M.wood); deco(3.4, 0.9, -4.9, 5.6, 0.95, -4.3, M.plate);
  label(4.5, 2.3, -4.89, 1.4, 0.4, ['PM SCHEDULE — DEC'], { w: 256, h: 64, size: 22, bg: '#f2f2ee', fg: '#234' }, 0);

  // =====================================================================
  // SERVICE CORRIDOR x[8,10.4] z[-30,0]
  // =====================================================================
  room({ x0: 8, z0: -30, x1: 10.4, z1: 0, h: 3, floor: M.concrete, ceil: M.ceil, wall: M.blockTan, base: M.darkSteel, casing: M.darkSteel, open: { s: [[8, 10.4, 2.6]], n: [[8.6, 9.8, 2.2]], e: [[-12.2, -11.2, 2.2]] }, surface: 'concrete' });
  W.doors.staffDoor = door(9.2, -29.95, 'x', 1.2, { swing: 1, mat: L(T.rollup, 1, 0x8d7a5c), name: 'staff' });
  W.doors.stairDoor = door(10.35, -11.7, 'z', 1.0, { swing: 1, mat: L(T.rollup, 1, 0x6b2a20), window: true, name: 'stairB' });
  label(10.28, 2.45, -11.7, 0.5, 0.18, ['STAIR B'], { w: 128, h: 48, size: 26, bg: '#1d2a44', fg: '#fff', bold: true }, -Math.PI / 2);
  label(9.2, 2.45, -29.88, 0.9, 0.2, ['EMPLOYEES ONLY'], { w: 256, h: 56, size: 26, bg: '#a01c14', fg: '#fff', bold: true }, 0);
  for (const z of [-6, -18, -26]) { const v = light(9.2, 2.9, z, 0xd8e6ff, 4, { dist: 9, group: 'corr', flicker: z === -18 ? 0.25 : 0 }); troffer(9.2, 2.99, z, v, 1.2, Math.PI / 2); }
  deco(8.12, 2.6, -30, 8.3, 2.75, 0, M.steel); deco(8.12, 2.35, -30, 8.24, 2.45, 0, L(T.concrete, 1, 0x2a5a2a));
  { solidDeco(8.2, 0, -21.5, 8.8, 0.55, -20.9, M.yellow); cyl(8.5, 0.55, -21.2, 0.02, 1.0, M.wood); } // mop bucket
  solidDeco(9.6, 0, -8.6, 10.3, 1.0, -7.0, M.beige); deco(9.6, 1.0, -8.6, 10.3, 1.08, -7.0, M.cloth); // housekeeping cart

  // =====================================================================
  // STAIR B  x[10.4,14] z[-20,-10]; ramp up north to landing at 2.4
  // =====================================================================
  room({ x0: 10.4, z0: -20, x1: 14, z1: -10, h: 6.5, floor: M.concrete, wall: M.block, base: M.darkSteel, casing: M.darkSteel, open: { w: [[-12.2, -11.2, 2.2]] }, surface: 'concrete' });
  box(10.4, 6.5, -20, 14, 6.6, -10, M.ceil, { solid: false });
  { const rise = 2.4, z0 = -12.6, z1 = -16.6, n = 13;
    W.heights.push({ x0: 10.4, x1: 14, z0: -20, z1: -10, f: (x, z) => z > z0 ? 0 : z < z1 ? rise : (z0 - z) / (z0 - z1) * rise });
    for (let i = 0; i < n; i++) { const za = z0 - i * (z0 - z1) / n, zb = z0 - (i + 1) * (z0 - z1) / n; deco(10.5, 0, zb, 13.9, (i + 1) * rise / n, za, M.concrete, { occ: true }); deco(10.5, (i + 1) * rise / n, za - 0.04, 13.9, (i + 1) * rise / n + 0.01, za, M.yellow); }
    deco(10.5, 0, -19.9, 13.9, rise, z1, M.concrete, { occ: true });
    // handrails
    for (let i = 0; i <= 4; i++) { const z = z0 - i; const yy = Math.min(rise, Math.max(0, (z0 - z) / (z0 - z1) * rise)); deco(13.75, yy, z - 0.02, 13.79, yy + 0.9, z + 0.02, M.steel); }
    const rail = deco(13.74, 0, z1, 13.8, 0.05, z0, M.steel); rail.position.y = rise / 2 + 0.9; rail.rotation.x = Math.atan2(rise, z0 - z1);
    W.surfaces.push({ x0: 10.4, x1: 14, z0: -20, z1: -10, s: 'metal' }); }
  // dead fixture (WO-2) on the landing's north wall + locked door to L2
  { const v = light(12.2, 4.5, -19.4, 0xd8e6ff, 6, { dist: 9, on: false, group: 'stairB' }); W.stairLight = v;
    const lens = glowMat(0x101214); W.stairLens = lens; deco(11.6, 4.4, -19.9, 12.8, 4.62, -19.7, M.white); const ln = deco(11.62, 4.36, -19.88, 12.78, 4.4, -19.72, lens); v.fixtures.push(lens); W.anchors.stairFixture = new THREE.Vector3(12.2, 4.4, -19.8);
    W.stairFixtureMesh = deco(11.4, 3.9, -19.95, 13.0, 4.8, -19.4, new THREE.MeshBasicMaterial({ visible: false }));
    W.stairCover = deco(11.62, 4.3, -19.86, 12.78, 4.36, -19.74, new THREE.MeshLambertMaterial({ color: 0xcfd6dc, transparent: true, opacity: 0.8 }));
    fakeDoor(12.2, -19.9, 'n', null, { mat: L(T.rollup, 1, 0x6b2a20), casing: M.darkSteel, msg: 'Stair B, level 2. Not tonight\'s problem.' }).position.y = 2.4 + 1.075;
    label(12.2, 2.4 + 2.35, -19.88, 0.5, 0.15, ['LEVEL 2'], { w: 128, h: 40, size: 24, bg: '#1d2a44', fg: '#fff' }, 0);
    const v2 = light(12, 2.6, -10.6, 0xff4030, 1.2, { dist: 6, group: 'stairB', flicker: 0.1 }); const em = glowMat(0xff3020); deco(11.8, 2.55, -10.12, 12.2, 2.65, -10.1, em); v2.fixtures.push(em); }

  // =====================================================================
  // McLEAN HALL guest corridor x[-6,34] z[-33,-30]
  // =====================================================================
  room({ x0: -6, z0: -33, x1: 34, z1: -30, h: 2.8, floor: M.carpetHall, ceil: M.white, wall: M.cream, wains: M.wains, crown: true, open: { s: [[0.3, 2.7, 2.4], [8.6, 9.8, 2.2], [14.5, 17.5, 2.4]], e: [[-32.1, -30.9, 2.3]], n: [[23.52, 24.48, 2.2]] }, surface: 'carpet' });
  W.doors.terraceDoor = door(33.95, -31.5, 'z', 1.2, { swing: -1, mat: M.glass, name: 'terraceMcLean', breakable: true });
  for (const x of [-3, 1, 5, 12, 20, 28, 31.5]) fakeDoor(x, -32.9, 'n', 100 + Math.round((x + 6) / 4) * 2 + 1);
  for (const x of [12, 21, 25, 29]) fakeDoor(x, -30.1, 's', 100 + Math.round((x + 6) / 4) * 2); // west end of the south wall opens into the lobby (below)
  for (const x of [-1, 8, 18, 26]) { const v = light(x + 1, 2.0, -31.5, 0xffc98a, 2.2, { dist: 8, group: 'mclean' }); sconce(x, 1.9, -32.9, 'n', v); sconce(x === -1 ? -1 : x + 2, 1.9, -30.1, 's', v); }
  picture(3, 1.6, -32.9, 'n', 0.8, 0.6, 30); picture(23, 1.6, -30.1, 's', 0.8, 0.6, 190); picture(16, 1.6, -32.9, 'n', 1.0, 0.7, 100);
  label(-5.85, 2.35, -31.5, 0.5, 0.18, ['EXIT'], { w: 128, h: 48, size: 34, bg: '#300', fg: '#ff3b2b', bold: true, glow: 1.5 }, Math.PI / 2);
  windowOn(-5.88, 1.5, -31.5, 'w', 1.0, 1.5, M.navy);
  solidDeco(14.8, 0, -32.9, 16.4, 0.8, -32.45, M.mahogany); // console
  label(16, 2.6, -30.12, 0.8, 0.2, ['GUEST PANTRY'], { w: 256, h: 64, size: 30, bg: '#2a2a2a', fg: '#e0d6c0' }, Math.PI);
  label(32.5, 1.7, -30.12, 1.0, 0.25, ['TERRACE · DuBOSE HOME →'], { w: 384, h: 96, size: 30, bg: '#1c2a4a', fg: '#e8e0c8' }, Math.PI);

  // =====================================================================
  // GUEST PANTRY x[14,18] z[-30,-25] (ice machine WO-1)
  // =====================================================================
  room({ x0: 14, z0: -30, x1: 18, z1: -25, h: 2.8, floor: M.vct, ceil: M.ceil, wall: M.cream, base: M.trim, casing: M.trim, open: { n: [[14.5, 17.5, 2.4]] }, surface: 'tile' });
  { const v = light(16, 2.7, -27.5, 0xe0ecff, 4, { dist: 8, group: 'pantry' }); troffer(16, 2.79, -27.5, v, 1.2, Math.PI / 2); W.pantryLight = v; }
  // ice machine on west wall
  { const x = 14.1; solidDeco(x, 0, -28.6, x + 0.8, 1.0, -27.6, M.steel); deco(x, 1.0, -28.6, x + 0.8, 1.75, -27.6, L(T.plate, 0.25, 0xb8bec2));
    W.iceFront = deco(x + 0.8, 0.15, -28.5, x + 0.83, 0.9, -27.7, L(T.plate, 0.2, 0xc8ccd0)); deco(x + 0.83, 0.95, -28.3, x + 0.85, 1.05, -27.9, M.black);
    label(x + 0.86, 1.4, -28.1, 0.45, 0.12, ['ICE'], { w: 128, h: 40, size: 30, bg: '#d0d4d8', fg: '#1c3a6a', bold: true }, Math.PI / 2);
    W.iceMesh = deco(x, 0, -28.7, x + 1.2, 1.8, -27.5, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.ice = new THREE.Vector3(x + 0.6, 0.5, -28.1);
    W.puddle = plane(x + 1.4, 0.008, -27.9, 1.8, 1.4, new THREE.MeshLambertMaterial({ color: 0x9fb8c8, transparent: true, opacity: 0.5, emissive: 0x0a1418 }), 0, -Math.PI / 2);
    W.puddleMesh = deco(x + 0.9, 0, -28.5, x + 2.2, 0.1, -27.2, new THREE.MeshBasicMaterial({ visible: false }));
    deco(x + 0.9, 0.95, -26.6, x + 1.3, 1.25, -26.3, M.yellow); label(x + 1.1, 1.1, -26.29, 0.36, 0.25, ['CAUTION', 'WET'], { w: 128, h: 96, size: 26, bg: '#d9b23a', fg: '#111', bold: true }, 0); }
  // counter + coffee + microwave along east wall
  { const x = 17.9; solidDeco(x - 0.6, 0, -29.9, x, 0.9, -27.2, M.mahogany); deco(x - 0.62, 0.9, -29.9, x, 0.94, -27.2, L(T.concrete, 1, 0xd8d0c0));
    deco(x - 0.45, 0.94, -29.6, x - 0.1, 1.35, -29.2, M.black); deco(x - 0.5, 0.94, -28.6, x - 0.05, 1.25, -27.9, M.darkSteel); deco(x - 0.51, 1.0, -28.5, x - 0.5, 1.2, -28.1, glowMat(0x102010));
    for (let i = 0; i < 4; i++) cyl(x - 0.3, 0.94, -28.9 + i * 0.12, 0.04, 0.1, M.cloth);
    upperCabinets(x - 0.35, x, -29.9, -27.2, 1.6, 2.4); }
  function upperCabinets(x0, x1, z0, z1, y0, y1) { deco(x0, y0, z0, x1, y1, z1, M.mahogany); }
  // fridge (glass door, lit), ice cream freezer, stacked washer/dryer on south wall
  { solidDeco(14.2, 0, -25.8, 15.0, 1.9, -25.1, M.black); const fr = glowMat(0x9fc0d8); deco(14.25, 0.1, -25.12, 14.95, 1.8, -25.1, fr);
    for (let s = 0; s < 4; s++) for (let i = 0; i < 5; i++) deco(14.3 + i * 0.13, 0.25 + s * 0.4, -25.2, 14.38 + i * 0.13, 0.47 + s * 0.4, -25.15, [M.red, M.yellow, M.navy, L(T.concrete, 1, 0x2a6a2a)][(s + i) % 4]);
    light(14.6, 1.0, -25.6, 0x9fc0ff, 0.6, { dist: 3, group: 'pantry' });
    solidDeco(15.3, 0, -25.8, 16.3, 0.85, -25.2, M.white); deco(15.35, 0.85, -25.75, 16.25, 0.87, -25.25, M.glass);
    solidDeco(16.6, 0, -25.75, 17.3, 1.8, -25.1, M.white); deco(16.75, 0.3, -25.11, 17.15, 0.7, -25.1, M.nightGlass); deco(16.75, 1.1, -25.11, 17.15, 1.5, -25.1, M.darkSteel); }
  armchair(15.2, -26.6, 0, M.navy); W.surfaces.push({ x0: 14, x1: 18, z0: -30, z1: -25, s: 'tile' });

  // =====================================================================
  // TERRACE x[34,48] z[-38,-25] (outdoors, night)
  // =====================================================================
  box(34, -0.1, -38, 48, 0, -25, M.pavers, { solid: false }); W.surfaces.push({ x0: 34, x1: 48, z0: -38, z1: -25, s: 'brick' });
  // McLean facade (brick) with the glass door opening
  for (const [a, b] of [[-38, -32.1], [-30.9, -25]]) box(34, 0, a, 34.12, 7, b, M.brick); box(34, 2.3, -32.1, 34.12, 7, -30.9, M.brick); box(34.1, 7, -38, 34.6, 7.3, -25, M.trim);
  for (const z of [-36, -27.5]) for (const y of [1.6, 4.6]) { windowOn(34.13, y, z, 'e', 1.0, 1.6, null); deco(34.13, y - 0.85, z - 0.55, 34.18, y - 0.8, z + 0.55, M.trim); }
  for (const z of [-36, -27.5]) { const g = glowMat(0x7a6040); plane(34.14, 4.6, z, 0.95, 1.55, g, Math.PI / 2); }
  // DuBose facade at x=48 (Georgian brick, white trim)
  for (const [a, b] of [[-38, -32.1], [-30.9, -25]]) box(47.88, 0, a, 48, 8, b, M.brick); box(47.88, 2.4, -32.1, 48, 8, -30.9, M.brick);
  deco(47.7, 2.4, -32.4, 47.88, 2.7, -30.6, M.trim); for (const z of [-32.35, -30.65]) cyl(47.78, 0, z, 0.08, 2.4, M.trim);
  for (const z of [-35.5, -27.5]) for (const y of [1.6, 5.2]) windowOn(47.87, y, z, 'w', 1.1, 1.8, null);
  box(47.5, 8, -38.5, 48.2, 8.4, -24.5, M.trim, { solid: false });
  // low brick walls + hedges + boundary
  box(34, 0, -38.2, 48, 0.8, -37.8, M.brick); box(34, 0, -25.2, 48, 0.8, -24.8, M.brick);
  box(34, 0, -38.6, 48, 3, -38.2, new THREE.MeshBasicMaterial({ visible: false }), { occ: false }); box(34, 0, -24.8, 48, 3, -24.4, new THREE.MeshBasicMaterial({ visible: false }), { occ: false });
  deco(34.2, 0.8, -38.2, 47.8, 1.3, -37.8, M.hedge); deco(34.2, 0.8, -25.2, 47.8, 1.3, -24.8, M.hedge);
  // lamp posts
  for (const [x, z] of [[38, -26], [44, -37]]) { cyl(x, 0, z, 0.06, 3, M.black, { solid: true }); const v = light(x, 3.1, z, 0xffcf8a, 4, { dist: 12, group: 'terrace' }); lantern(x, 3.0, z, v, 1.3); }
  // pergola/colonnade along the south side (curved terrace hint)
  for (let i = 0; i < 5; i++) { const x = 36 + i * 2.8; cyl(x, 0, -26.2, 0.14, 3.2, M.trim, { solid: true }); } deco(35.6, 3.2, -26.5, 47.6, 3.4, -25.9, M.trim);
  // benches / planters
  solidDeco(39.5, 0, -36.8, 41.5, 0.45, -36.3, M.wood); cyl(42.8, 0, -29, 0.45, 0.6, M.brick, { solid: true }); deco(42.4, 0.6, -29.4, 43.2, 1.1, -28.6, M.hedge);
  // sky + trees + distant campus glow
  { const g = new THREE.SphereGeometry(200, 16, 8); const col = []; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 200; const c = new THREE.Color().setHSL(0.62, 0.35, Math.max(0.012, 0.06 - y * 0.06)); col.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); sky.position.set(41, 0, -31); scene.add(sky);
    const sm = new THREE.MeshBasicMaterial({ color: 0x9aa4b8, fog: false }); for (let i = 0; i < 120; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.25 + Math.random() * 0.3, 4, 3), sm); s.position.set(41 + Math.cos(a) * Math.cos(e) * 180, Math.sin(e) * 180, -31 + Math.sin(a) * Math.cos(e) * 180); scene.add(s); }
    const tm = new THREE.MeshBasicMaterial({ color: 0x030504 }); for (let i = 0; i < 26; i++) { const side = i % 2 ? -1 : 1; const x = 30 + Math.random() * (side > 0 ? 24 : 15), z = side > 0 ? -22 + Math.random() * -0 + 4 + Math.random() * 10 : -42 - Math.random() * 12; const h = 9 + Math.random() * 9; const t = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, h, 7), tm); t.position.set(x, h / 2, z); scene.add(t); } }

  // =====================================================================
  // DuBOSE HOME — where it goes wrong.
  // Enfilade hall x[48,66] z[-33,-30]: vestibule at 0, two-step rise at x 51.4-51.8 to 0.34
  // =====================================================================
  const DY = 0.34;
  W.groups.dubose = [];
  room({ x0: 48, z0: -33, x1: 66, z1: -30, h: 3.4, ceil: M.trim, wall: M.cream, wains: M.wains, crown: true, casing: M.pine, open: { w: [[-32.1, -30.9, 2.3]], n: [[54, 55.2, 2.3]], s: [[59, 60.2, 2.3]], e: [[-33, -30, 3.0]] } });
  box(48, -0.1, -33, 51.4, 0, -30, M.hardwood, { solid: false }); box(51.4, -0.1, -33, 51.6, 0.17, -30, M.trim, { solid: false }); deco(51.4, 0.16, -33, 51.62, 0.18, -30, M.hardwood);
  box(51.6, -0.1, -33, 66, DY, -30, M.hardwood, { solid: false }); deco(51.6, DY - 0.01, -33, 51.82, DY + 0.005, -30, M.hardwood);
  W.heights.push({ x0: 48, x1: 66, z0: -33, z1: -30, f: (x) => x < 51.4 ? 0 : x < 51.6 ? 0.17 : DY });
  W.surfaces.push({ x0: 48, x1: 66, z0: -33, z1: -30, s: 'wood' });
  W.doors.duboseDoor = door(48.05, -31.5, 'z', 1.2, { swing: 1, mat: M.trim, locked: true, key: 'DuBose key', lockedMsg: 'Locked. DuBose key is in the key cabinet.', name: 'dubose', breakable: true });
  // the enfilade: pine-cased doorways crossing the hall at x=51.5, 56.5, 61.5 (you look straight through all three)
  for (const x of [51.5, 56.5, 61.5]) { const y0 = x < 51.6 ? 0 : DY;
    box(x - 0.15, 0, -33, x + 0.15, 3.4, -32.25, M.cream); box(x - 0.15, 0, -30.75, x + 0.15, 3.4, -30, M.cream); box(x - 0.15, y0 + 2.45, -32.25, x + 0.15, 3.4, -30.75, M.cream);
    for (const s of [-1, 1]) { deco(x - 0.2, y0, -32.35, x + 0.2, y0 + 2.57, -32.25, M.pine); deco(x - 0.2, y0, -30.75, x + 0.2, y0 + 2.57, -30.65, M.pine); } deco(x - 0.2, y0 + 2.45, -32.35, x + 0.2, y0 + 2.6, -30.65, M.pine); }
  // an open pine door leaf folded back at the first doorway
  { const g = new THREE.Group(); g.position.set(51.75, DY, -32.88); g.rotation.y = -0.08; scene.add(g); box(0, 0, -0.03, 1.4, 2.4, 0.03, M.pine, { parent: g, solid: false, occ: false }); }
  for (const x of [50, 54.2, 59, 64]) { const v = light(x, 2.6, -31.5, 0xffc480, 2.4, { dist: 9, group: 'dubose', flicker: x === 59 ? 0.08 : 0 }); lantern(x, 2.55 + (x < 51 ? 0 : DY), -31.5, v); }
  rug(52.4, -32.3, 55.6, -30.7, DY); rug(57.2, -32.3, 60.8, -30.7, DY); rug(48.6, -32.2, 51.0, -30.8, 0);
  picture(53, 1.9, -32.9, 'n', 0.5, 0.65, 25); picture(58.5, 1.9, -32.9, 'n', 0.5, 0.65, 40); picture(63.5, 1.9, -30.1, 's', 0.8, 0.6, 200); picture(57.5, 1.9, -30.1, 's', 0.5, 0.65, 15);
  { // knotty pine bookcase in the vestibule (foreground of the classic view)
    solidDeco(48.2, 0, -32.95, 50.4, 2.3, -32.55, M.pine); for (let s = 0; s < 5; s++) deco(48.3, 0.15 + s * 0.44, -32.56, 50.3, 0.53 + s * 0.44, -32.55, M.books); }
  W.anchors.duboseEntry = new THREE.Vector3(49, 0, -31.5); W.anchors.enfiladeEnd = new THREE.Vector3(50.3, 0, -31.5);

  // LIBRARY x[50,62] z[-40,-33] — knotty pine paneling
  room({ x0: 50, z0: -40, x1: 62, z1: -33, y: DY, h: 3.4, floor: M.hardwood, ceil: M.trim, wall: M.pine, crown: true, casing: M.pine, base: M.pine, open: { s: [[54, 55.2, 2.3]] }, surface: 'wood' });
  for (let i = 0; i < 4; i++) { const x0 = 51.5 + i * 2.5; solidDeco(x0, DY, -39.9, x0 + 2.2, DY + 2.8, -39.5, M.pine); for (let s = 0; s < 6; s++) deco(x0 + 0.08, DY + 0.15 + s * 0.44, -39.51, x0 + 2.12, DY + 0.53 + s * 0.44, -39.5, M.books); }
  fireplace(50.1, -36.5, 'w', DY); armchair(52.2, -35.2, -2.2, M.leather, DY); armchair(52.2, -37.8, -0.9, M.leather, DY); rug(51.5, -38.5, 56.5, -34.2, DY);
  solidDeco(57, DY, -37, 59, DY + 0.75, -35.8, M.mahogany);
  { const v = light(58, DY + 1.4, -36.4, 0xffb060, 1.4, { dist: 7, group: 'dubose' }); const g = glowMat(0xffd090); cyl(58, DY + 0.75, -36.4, 0.03, 0.4, M.brass); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.25, 10), g); sh.position.set(58, DY + 1.25, -36.4); scene.add(sh); v.fixtures.push(g); }

  // DINING ROOM x[50,62] z[-30,-22] — blue & white stripes, chandelier, white tablecloths
  room({ x0: 50, z0: -30, x1: 62, z1: -22, y: DY, h: 3.4, floor: M.hardwood, ceil: M.trim, wall: M.stripe, wains: M.wains, crown: true, casing: M.trim, open: { n: [[59, 60.2, 2.3]], e: [[-25, -23.8, 2.2]] }, surface: 'wood' });
  for (const [x, z] of [[53, -27.4], [57, -27.4], [53, -24.2], [57, -24.2]]) { cyl(x, DY, z, 0.75, 0.76, M.cloth, { solid: true, seg: 16 }); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; chair(x + Math.cos(a) * 1.05, z + Math.sin(a) * 1.05, -a - Math.PI / 2, M.navy, DY); } }
  { const v = light(55, DY + 2.6, -25.8, 0xffd8a0, 3.2, { dist: 10, group: 'dubose' }); chandelier(55, DY + 2.7, -25.8, v); }
  fireplace(50.1, -26, 'w', DY); windowOn(53, DY + 1.6, -22.1, 's', 1.1, 1.9); windowOn(58, DY + 1.6, -22.1, 's', 1.1, 1.9);
  solidDeco(59.5, DY, -29.9, 61.8, DY + 0.9, -29.4, M.mahogany); // sideboard
  W.doors.butlerDoor = door(61.95, -24.4, 'z', 1.2, { swing: 1, y: DY, mat: M.trim, name: 'butler', breakable: true });

  // BUTLER'S PANTRY x[62,66] z[-30,-22] — DuBose breaker panel
  room({ x0: 62, z0: -30, x1: 66, z1: -22, y: DY, h: 3.0, floor: M.vct, ceil: M.trim, wall: M.cream, base: M.trim, casing: M.trim, open: { w: [[-25, -23.8, 2.2]] }, surface: 'tile' });
  solidDeco(62.1, DY, -29.9, 65.9, DY + 0.9, -29.3, M.trim); deco(62.1, DY + 0.9, -29.9, 65.9, DY + 0.94, -29.3, L(T.concrete, 1, 0x3a3a3a)); deco(62.1, DY + 1.5, -29.9, 65.9, DY + 2.4, -29.5, M.trim);
  { const v = light(64, DY + 2.9, -26, 0xfff0d0, 2.4, { dist: 7, group: 'dubose' }); const g = glowMat(0xfff0d0); const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), g); s.rotation.x = Math.PI; s.position.set(64, DY + 2.98, -26); scene.add(s); v.fixtures.push(g); }
  { const x = 65.9; deco(x - 0.12, DY + 0.9, -27.5, x, DY + 1.9, -26.7, M.darkSteel); W.panelDoor = deco(x - 0.13, DY + 0.9, -27.5, x - 0.12, DY + 1.9, -26.7, L(T.plate, 0.3, 0x707478));
    label(x - 0.14, DY + 2.05, -27.1, 0.6, 0.12, ['PANEL DH-1  ·  120/208V'], { w: 256, h: 40, size: 18, bg: '#ddd', fg: '#000' }, -Math.PI / 2);
    W.panelMesh = deco(x - 0.4, DY + 0.8, -27.7, x, DY + 2.0, -26.5, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.panel = new THREE.Vector3(65.7, DY + 1.4, -27.1); }

  // STAIR HALL / FOYER x[66,78] z[-42,-22] — formal stair, royal-blue runner, damask, grandfather clock
  room({ x0: 66, z0: -42, x1: 78, z1: -22, y: DY, h: 7, floor: M.hardwood, ceil: M.trim, wall: M.damask, wains: M.wains, crown: true, casing: M.trim, open: { w: [[-33, -30, 3.0], [-41.85, -40.75, 2.25]], n: [[71, 72.4, 2.3]] }, surface: 'wood' });
  rug(68.5, -34, 74.2, -25.5, DY);
  { // grandfather clock + flanking chairs on west wall, console + mirror on south wall
    const x = 66.12; solidDeco(x, DY, -37.4, x + 0.45, DY + 2.2, -36.8, M.mahogany); deco(x + 0.45, DY + 1.6, -37.3, x + 0.46, DY + 2.0, -36.9, M.cloth);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), M.cloth); face.position.set(x + 0.47, DY + 1.8, -37.1); face.rotation.y = Math.PI / 2; scene.add(face);
    deco(x + 0.47, DY + 1.78, -37.1, x + 0.48, DY + 1.92, -37.09, M.black); deco(x + 0.47, DY + 1.79, -37.2, x + 0.48, DY + 1.81, -37.1, M.black);
    deco(x + 0.2, DY + 2.2, -37.45, x + 0.5, DY + 2.45, -36.75, M.mahogany); W.anchors.clock = new THREE.Vector3(x + 0.3, DY + 1.6, -37.1);
    chair(66.6, -38.4, Math.PI / 2, M.navy, DY); chair(66.6, -35.8, Math.PI / 2, M.navy, DY);
    solidDeco(69.6, DY, -22.5, 72.4, DY + 0.85, -22.1, M.mahogany); deco(70.2, DY + 1.2, -22.12, 71.8, DY + 2.4, -22.1, M.nightGlass); deco(70.1, DY + 1.1, -22.13, 71.9, DY + 2.55, -22.11, M.brass);
    windowOn(68, DY + 1.8, -22.1, 's', 1.0, 2.2); windowOn(75.0, DY + 1.8, -22.1, 's', 1.0, 2.2);
    fakeDoor(73.5, -22.1, 's', null, { mat: M.trim, msg: 'Front door. Alarmed after 11. Don\'t.' }).position.y = DY + 1.075; }
  { const v = light(71.5, DY + 4.4, -32, 0xffd090, 3.5, { dist: 14, group: 'dubose' }); lantern(71.5, DY + 4.4, -32, v, 2.2);
    const v2 = light(70, DY + 2.5, -22.4, 0xffc070, 1.6, { dist: 7, group: 'dubose' }); sconce(68.9, DY + 2.3, -22.1, 's', v2); sconce(72.9, DY + 2.3, -22.1, 's', v2); }
  // the formal stair: rises north along the east wall to a balcony along the north wall; flared bottom steps
  { const N = 18, rise = 3.4 / N, xC = 76.7, zStart = -33.6, depth = 0.31, sw = 1.5;
    const treadMat = M.hardwood;
    for (let i = 0; i < N; i++) { const yTop = DY + (i + 1) * rise; const za = zStart - i * depth, zb = za - depth;
      const flare = Math.max(0, 3 - i) * 0.35; const x0 = xC - sw / 2 - flare, x1 = xC + sw / 2;
      deco(x0, DY, zb, x1, yTop - 0.03, za, M.trim, { occ: true }); deco(x0 - 0.03, yTop - 0.03, zb - 0.02, x1, yTop, za + 0.03, treadMat);
      deco(xC - 0.55, yTop, zb, xC + 0.55, yTop + 0.012, za + 0.02, M.blue); deco(xC - 0.55, yTop - rise + 0.01, za, xC + 0.55, yTop, za + 0.025, M.blue);
      // balusters on the open (west) side
      for (let b = 0; b < 2; b++) deco(x0 + 0.05, yTop, za - b * depth / 2 - 0.02, x0 + 0.08, yTop + 0.9, za - b * depth / 2, M.white); }
    // stringer + handrail
    const L0 = Math.hypot(N * depth, 3.4); const rail = deco(0, 0, 0, 0.07, 0.08, L0, M.mahogany); rail.position.set(xC - sw / 2 + 0.07, DY + 1.7 + 0.9, zStart - N * depth / 2); rail.rotation.x = Math.atan2(3.4, N * depth);
    const newel = cyl(xC - sw / 2 - 1.05 + 0.07, DY, zStart - 0.15, 0.08, 1.05, M.mahogany); const cap = cyl(xC - sw / 2 - 1.05 + 0.07, DY + 1.05, zStart - 0.15, 0.1, 0.08, M.mahogany);
    W.colliders.push({ x0: xC - sw / 2 - 1.1, x1: 78, z0: zStart - N * depth - 0.1, z1: zStart + 0.05, y0: 0, y1: 5 });
    W.occluders.push(rail);
    // balcony along north wall at the top
    const bY = DY + 3.4; box(66.1, bY - 0.3, -42, 78, bY, -39.2, M.trim, { solid: false }); deco(66.1, bY - 0.01, -42, 78, bY + 0.005, -39.2, M.hardwood);
    for (let x = 66.4; x < 75.8; x += 0.24) deco(x, bY, -39.3, x + 0.035, bY + 0.9, -39.25, M.white); deco(66.1, bY + 0.9, -39.35, 75.9, bY + 0.98, -39.2, M.mahogany);
    W.anchors.balcony = new THREE.Vector3(70.5, bY, -40.4);
    // red velvet rope at the foot (the upstairs is closed)
    for (const x of [74.7, 75.9]) { cyl(x, DY, -33.3, 0.03, 0.9, M.brass); } const rope = deco(74.7, DY + 0.8, -33.32, 75.9, DY + 0.84, -33.28, M.red); }
  { const v = light(75.2, DY + 2.2, -31.5, 0xffd8a8, 2.6, { dist: 9, group: 'dubose' }); sconce(77.9, DY + 2.2, -31.5, 'e', v);
    const v2 = light(74.5, DY + 4.6, -38.0, 0xffd8a8, 2.0, { dist: 9, group: 'dubose' }); sconce(77.9, DY + 4.6, -37.5, 'e', v2); }
  W.anchors.foyer = new THREE.Vector3(71, DY, -30);

  // DuBOSE SUITE x[66,78] z[-50,-42] — off the stair hall, sloped attic-style ceiling and fireplace
  room({ x0: 66, z0: -50, x1: 78, z1: -42, y: DY, h: 3.2, floor: M.carpetRoom, ceil: M.trim, wall: M.cream, walls: { n: M.damaskBlue }, crown: true, base: M.trim, casing: M.trim, open: { s: [[71, 72.4, 2.3]] }, surface: 'carpet' });
  W.doors.suiteDoor = door(71.7, -42.05, 'x', 1.4, { swing: 1, y: DY, mat: M.trim, name: 'suite', breakable: true });
  { // sloped ceiling planes (dormer feel) east + west
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 8), M.trim); p.position.set(s > 0 ? 76.9 : 67.1, DY + 2.6, -46); p.rotation.set(-Math.PI / 2, 0, 0); p.rotateY(s * 0.75); scene.add(p); } }
  { const y = DY; // bed (dark wood headboard), nightstands, lamps, bench, dresser + TV, armchair
    solidDeco(70.2, y, -49.9, 73.8, y + 1.5, -49.75, M.mahogany); solidDeco(70.3, y, -49.75, 73.7, y + 0.45, -47.4, M.mahogany);
    deco(70.35, y + 0.45, -49.7, 73.65, y + 0.72, -47.45, M.cloth); deco(70.3, y + 0.6, -48.1, 73.7, y + 0.74, -47.35, M.beige);
    deco(70.6, y + 0.72, -49.6, 71.8, y + 0.92, -49.1, M.cloth); deco(72.2, y + 0.72, -49.6, 73.4, y + 0.92, -49.1, M.cloth);
    solidDeco(70.6, y, -47.2, 73.4, y + 0.45, -46.8, M.beige);
    for (const x of [69.4, 74.6]) { solidDeco(x - 0.35, y, -49.9, x + 0.35, y + 0.6, -49.4, M.mahogany); cyl(x, y + 0.6, -49.6, 0.08, 0.35, M.brass); }
    const v = light(69.4, y + 1.3, -49.4, 0xffc070, 1.5, { dist: 7, group: 'dubose' }); const g = glowMat(0xffd8a0); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.28, 10), g); sh.position.set(69.4, y + 1.1, -49.6); scene.add(sh); v.fixtures.push(g);
    const v2 = light(74.6, y + 1.3, -49.4, 0xffc070, 1.5, { dist: 7, group: 'dubose' }); const g2 = glowMat(0xffd8a0); const sh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.28, 10), g2); sh2.position.set(74.6, y + 1.1, -49.6); scene.add(sh2); v2.fixtures.push(g2);
    solidDeco(66.1, y, -46.8, 66.65, y + 1.0, -44.8, M.mahogany); deco(66.25, y + 1.0, -46.6, 66.3, y + 1.7, -45.0, M.black);
    const tv = glowMat(0x101418); W.tvMat = tv; deco(66.31, y + 1.04, -46.55, 66.32, y + 1.66, -45.05, tv); W.anchors.tv = new THREE.Vector3(66.4, y + 1.3, -45.8);
    W.tvLight = light(67, y + 1.3, -45.8, 0xa0c0ff, 0, { dist: 6, group: 'tv' });
    armchair(75.8, -44.0, 2.4, M.leather, y); fireplace(77.9, -46.5, 'e', y); windowOn(66.1, y + 1.5, -43.4, 'w', 0.9, 1.6); rug(69.2, -46.5, 74.8, -43, y); }
  W.anchors.suite = new THREE.Vector3(72, DY, -46);

  // =====================================================================
  // CHRISTMAS-SHIFT ADDITIONS: a little seasonal decor, the DuBose back hall / sewing room / bar, and McLean Room 117.
  // =====================================================================
  W.haunt = {};
  // a modest tree in the DuBose stair hall (it's Christmas Eve; nobody went overboard)
  { const x = 67.5, z = -23.7, y = DY; const tm = new THREE.MeshLambertMaterial({ color: 0x1b3620 }); const cones = [[0.75, 0.28], [0.57, 0.78], [0.39, 1.28]];
    for (const [r, b] of cones) { const c = new THREE.Mesh(new THREE.ConeGeometry(r, 0.95, 9), tm); c.position.set(x, y + b + 0.475, z); scene.add(c); }
    deco(x - 0.22, y, z - 0.22, x + 0.22, y + 0.32, z + 0.22, M.red); W.colliders.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.6, z1: z + 0.6, y0: y, y1: y + 2.2 });
    const rAt = h => { let r = 0.05; for (const [cr, b] of cones) if (h >= b && h <= b + 0.95) r = Math.max(r, cr * (1 - (h - b) / 0.95)); return r; };
    const tl = light(x, y + 1.2, z + 0.5, 0xffc070, 0.5, { dist: 3.5, group: 'dubose' }); const cols = [0xffc870, 0xff5a40, 0x6aa0ff, 0x7aff90];
    for (let i = 0; i < 26; i++) { const h = 0.4 + (i / 26) * 1.7, a = i * 2.39; const r = rAt(h) + 0.02; const gm = glowMat(cols[i % 4]); const b = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), gm); b.position.set(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r); scene.add(b); tl.fixtures.push(gm); }
    const star = glowMat(0xffe0a0); const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), star); st.position.set(x, y + 2.28, z); scene.add(st); tl.fixtures.push(star); }
  function wreath(x, y, z, rotY, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.3 * s, 0.09 * s, 6, 14), new THREE.MeshLambertMaterial({ color: 0x1f3d22 })); g.add(t);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 5, 4), M.red); b.position.set(Math.cos(a) * 0.3 * s, Math.sin(a) * 0.3 * s, 0.07 * s); g.add(b); }
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.1 * s, 0.04 * s), M.red); bow.position.set(0, -0.3 * s, 0.08 * s); g.add(bow);
  }
  wreath(47.84, 3.15, -31.5, -Math.PI / 2); // DuBose side door, facing the terrace
  wreath(15.6, 2.25, -32.86, 0, 0.7); // over the McLean hall console

  // ---- BACK HALL x[54,66] z[-43,-40]: narrow service hall behind the front stair; pine wainscot, two small lanterns ----
  room({ x0: 54, z0: -43, x1: 66, z1: -40, y: DY, h: 3.0, floor: M.hardwood, ceil: M.trim, wall: M.cream, wains: M.pine, crown: true, casing: M.pine,
    open: { e: [[-41.85, -40.75, 2.25]], n: [[55.45, 56.55, 2.2], [58.55, 59.45, 2.1], [61.45, 62.55, 2.2]] }, surface: 'wood' });
  W.doors.backDoor = door(66.0, -41.3, 'z', 1.1, { swing: -1, y: DY, mat: M.pine, name: 'backhall', locked: true, lockedMsg: 'Back hall. Locked up for the night.' });
  for (const x of [57.6, 64.0]) { const v = light(x, DY + 2.3, -41.5, 0xffc480, 1.5, { dist: 6.5, group: 'haunt', on: false }); lantern(x, DY + 2.25, -41.5, v, 0.8); }
  rug(54.6, -42.1, 65.4, -40.9, DY); picture(60.5, DY + 1.75, -40.1, 's', 0.6, 0.45, 55);
  solidDeco(64.6, DY, -40.55, 65.7, DY + 0.45, -40.15, M.pine); // bench by the stair-hall door
  label(62, DY + 2.45, -42.88, 0.7, 0.14, ['SEWING ROOM'], { w: 256, h: 48, size: 26, bg: '#b39253', fg: '#2a1c0a', font: 'Georgia, serif' }, 0);
  W.anchors.backhall = new THREE.Vector3(60, DY, -41.5);

  // ---- SEWING ROOM x[58,66] z[-50,-43]: faded rose damask over pine, treadle machine under the window, bolts of cloth, dress form,
  //      rocking chair, cast-iron radiator. A built-in linen closet fills its SW corner (door opens to the back hall). ----
  room({ x0: 58, z0: -50, x1: 66, z1: -43, y: DY, h: 3.2, floor: M.hardwood, ceil: M.trim, wall: M.damaskRose, wains: M.pine, crown: true, casing: M.pine,
    open: { s: [[58.55, 59.45, 2.1], [61.45, 62.55, 2.2]], w: [[-48.55, -47.45, 2.2]] }, surface: 'wood' });
  W.doors.sewDoor = door(62, -43.0, 'x', 1.1, { swing: 1, y: DY, mat: M.pine, name: 'sewing' });
  // linen closet x[58,60] z[-46,-43] (hide spot): pine walls inside the sewing room's corner
  box(58.1, 0, -46.1, 60.1, DY + 3.2, -45.9, M.pine); box(59.9, 0, -46.1, 60.1, DY + 3.2, -43.1, M.pine);
  for (let s = 0; s < 4; s++) { deco(58.12, DY + 0.35 + s * 0.45, -45.85, 58.38, DY + 0.38 + s * 0.45, -44.0, M.pine); deco(58.14, DY + 0.38 + s * 0.45, -45.7, 58.36, DY + 0.52 + s * 0.45, -44.3, s % 2 ? M.cloth : M.beige); }
  cyl(59.7, DY, -45.7, 0.015, 1.3, M.wood); // broom
  W.doors.closetDoor = door(59, -43.0, 'x', 0.9, { swing: 1, y: DY, mat: M.pine, name: 'closet', h: 2.05 });
  // window + frost (frost opacity is driven by the story)
  windowOn(61.2, DY + 1.65, -49.9, 'n', 1.1, 1.6, M.cloth); windowOn(64.6, DY + 1.65, -49.9, 'n', 1.0, 1.6, M.cloth);
  W.frostMats = [];
  for (const [fx, fw] of [[61.2, 1.1], [64.6, 1.0]]) { const fm = new THREE.MeshBasicMaterial({ map: T.frost, transparent: true, opacity: 0, depthWrite: false }); W.frostMats.push(fm); plane(fx, DY + 1.65, -49.86, fw, 1.6, fm, 0); }
  { // treadle sewing table + machine + lamp
    const x = 61.2, z = -49.45, y = DY; solidDeco(x - 0.6, y + 0.7, z - 0.3, x + 0.6, y + 0.76, z + 0.3, M.mahogany);
    for (const sx of [-0.55, 0.5]) deco(x + sx, y, z - 0.25, x + sx + 0.05, y + 0.7, z + 0.25, M.black); deco(x - 0.5, y + 0.06, z - 0.15, x + 0.5, y + 0.1, z + 0.1, M.black);
    W.colliders.push({ x0: x - 0.62, x1: x + 0.62, z0: z - 0.32, z1: z + 0.32, y0: y, y1: y + 0.8 });
    deco(x - 0.25, y + 0.76, z - 0.12, x + 0.2, y + 0.82, z + 0.12, M.black); deco(x - 0.25, y + 0.82, z - 0.06, x - 0.15, y + 1.05, z + 0.04, M.black); deco(x - 0.25, y + 1.0, z - 0.06, x + 0.15, y + 1.07, z + 0.04, M.black); deco(x + 0.1, y + 0.86, z - 0.04, x + 0.15, y + 1.07, z + 0.03, M.black);
    deco(x + 0.25, y + 0.76, z - 0.2, x + 0.55, y + 0.8, z + 0.15, M.calico); deco(x - 0.55, y + 0.76, z - 0.1, x - 0.35, y + 0.79, z + 0.2, M.cloth);
    const v = light(x + 0.45, y + 1.25, z + 0.2, 0xffb868, 1.1, { dist: 5, group: 'haunt', on: false }); const g = glowMat(0xffd090); cyl(x + 0.45, y + 0.76, z, 0.02, 0.35, M.brass); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.18, 10), g); sh.position.set(x + 0.45, y + 1.18, z); scene.add(sh); v.fixtures.push(g); W.haunt.sewLamp = v;
    chair(x, z + 0.75, 0, M.calico, y, M.mahogany); }
  { // bolts of cloth on a pine shelf (east wall) + a dress form
    solidDeco(65.45, DY, -44.6, 65.9, DY + 1.9, -43.3, M.pine); for (let s = 0; s < 3; s++) for (let i = 0; i < 3; i++) { const m = L(T.calico, 0.4, [0xffffff, 0xa0b0d0, 0xd0b090, 0xb0d0a0, 0xe0a0a0][(s * 3 + i) % 5]); deco(65.5, DY + 0.25 + s * 0.6, -44.5 + i * 0.4, 65.88, DY + 0.55 + s * 0.6, -44.2 + i * 0.4, m); }
    const df = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.17, 0.02], [0.2, 0.18], [0.15, 0.4], [0.2, 0.62], [0.16, 0.72], [0.05, 0.78], [0, 0.8]].map(p => new THREE.Vector2(p[0], p[1])), 10), L(T.calico, 0.6, 0xd8cfc0)); df.scale.set(1, 1, 0.75); df.position.set(65.0, DY + 0.95, -46.2); scene.add(df);
    cyl(65.0, DY + 0.1, -46.2, 0.02, 0.85, M.mahogany); cyl(65.0, DY, -46.2, 0.22, 0.1, M.mahogany, { solid: true }); }
  { // rocking chair by the window (the story rocks it)
    const g = new THREE.Group(); g.position.set(63.6, DY, -48.4); g.rotation.y = 0.5; scene.add(g); const piv = new THREE.Group(); g.add(piv);
    const B = (x0, y0, z0, x1, y1, z1, m) => box(x0, y0, z0, x1, y1, z1, m, { parent: piv, solid: false, occ: false });
    for (const sx of [-0.26, 0.22]) { B(sx, 0, -0.4, sx + 0.04, 0.04, 0.45, M.mahogany); B(sx, 0.04, -0.25, sx + 0.04, 0.42, -0.21, M.mahogany); B(sx, 0.04, 0.2, sx + 0.04, 1.05, 0.24, M.mahogany); }
    B(-0.26, 0.42, -0.28, 0.26, 0.47, 0.24, M.mahogany); for (let i = 0; i < 5; i++) B(-0.2 + i * 0.1, 0.47, 0.2, -0.17 + i * 0.1, 1.0, 0.23, M.mahogany); B(-0.26, 1.0, 0.18, 0.26, 1.08, 0.25, M.mahogany);
    W.colliders.push({ x0: 63.1, x1: 64.1, z0: -48.9, z1: -47.9, y0: DY, y1: DY + 1 }); W.haunt.rocker = piv; }
  { // cast-iron radiator under the east window + the thermostat by the door
    const x = 65.75; for (let i = 0; i < 12; i++) deco(x - 0.12, DY + 0.08, -48.2 + i * 0.09, x + 0.12, DY + 0.8, -48.14 + i * 0.09, L(T.concrete, 1, 0xc9c2b0)); deco(x - 0.13, DY + 0.06, -48.25, x + 0.13, DY + 0.1, -47.1, M.darkSteel);
    W.colliders.push({ x0: x - 0.14, x1: 66, z0: -48.25, z1: -47.1, y0: DY, y1: DY + 0.85 });
    deco(x - 0.1, DY + 0.2, -48.38, x - 0.02, DY + 0.32, -48.25, M.brass); // valve
    W.radMesh = deco(x - 0.45, DY, -48.5, 66, DY + 1.0, -47.0, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.radiator = new THREE.Vector3(65.6, DY + 0.5, -47.7);
    deco(63.35, DY + 1.38, -43.12, 63.55, DY + 1.58, -43.1, M.beige); W.thermoLabel = label(63.45, DY + 1.48, -43.13, 0.14, 0.09, ['38°'], { w: 64, h: 40, size: 24, bg: '#d8d0b8', fg: '#7a1410', bold: true }, Math.PI);
    W.thermoMesh = deco(63.1, DY + 1.2, -43.4, 63.8, DY + 1.8, -43.1, new THREE.MeshBasicMaterial({ visible: false })); }
  rug(60.6, -48.2, 64.2, -44.8, DY); picture(59.0, DY + 1.9, -49.9, 'n', 0.45, 0.55, 330);
  W.anchors.sewing = new THREE.Vector3(62.6, DY + 1.4, -47.2); W.anchors.alcove = new THREE.Vector3(59.2, DY + 1.0, -48.6);

  // ---- THE BAR x[50,58] z[-50,-43]: the old DuBose parlor bar. Knotty pine, mahogany bar + brass rail, back-bar bottles, stools, a two-top. ----
  room({ x0: 50, z0: -50, x1: 58, z1: -43, y: DY, h: 3.2, floor: M.hardwood, ceil: M.trim, wall: M.pine, crown: true, casing: M.pine, base: M.pine,
    open: { s: [[55.45, 56.55, 2.2]], e: [[-48.55, -47.45, 2.2]] }, surface: 'wood' });
  W.doors.barDoor = door(56, -43.0, 'x', 1.1, { swing: 1, y: DY, mat: M.pine, name: 'bar' });
  W.doors.connDoor = door(58.0, -48.0, 'z', 1.1, { swing: -1, y: DY, mat: M.pine, name: 'conn' });
  { const y = DY;
    solidDeco(50.95, y, -49.3, 51.6, y + 1.02, -44.4, M.mahogany); deco(50.9, y + 1.02, -49.38, 51.72, y + 1.08, -44.32, L(T.mahogany, 0.8, 0x6a3a28)); deco(51.66, y + 0.16, -49.2, 51.7, y + 0.2, -44.5, M.brass);
    solidDeco(50.1, y, -49.6, 50.55, y + 0.9, -44.2, M.mahogany); deco(50.11, y + 1.15, -49.5, 50.14, y + 2.3, -44.3, M.nightGlass);
    for (let s = 0; s < 2; s++) { deco(50.12, y + 1.25 + s * 0.5, -49.4, 50.4, y + 1.28 + s * 0.5, -44.4, M.pine); deco(50.15, y + 1.28 + s * 0.5, -49.3, 50.17, y + 1.68 + s * 0.5, -44.5, M.bottles); }
    // stools: three tucked in, one pulled out and turned (nobody's on it)
    const stool = (x, z, r) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = r; scene.add(g); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), M.brass); leg.position.y = 0.36; g.add(leg); const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10), M.leather); seat.position.y = 0.76; g.add(seat); const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 10), M.brass); ft.position.y = 0.015; g.add(ft); W.colliders.push({ x0: x - 0.22, x1: x + 0.22, z0: z - 0.22, z1: z + 0.22, y0: y, y1: y + 0.8 }); return g; };
    stool(52.05, -48.6, 0); stool(52.05, -47.5, 0); stool(52.05, -45.3, 0); W.haunt.stool = stool(52.55, -46.25, 0.9);
    // a single glass on the bar, a finger of something in it
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xc8d8e0, transparent: true, opacity: 0.45, side: THREE.DoubleSide })); gl.position.set(51.35, y + 1.125, -46.3); scene.add(gl);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.029, 0.03, 10), new THREE.MeshLambertMaterial({ color: 0x8a4a12, emissive: 0x1a0a02 })); liq.position.set(51.35, y + 1.095, -46.3); scene.add(liq); W.anchors.glass = new THREE.Vector3(51.35, y + 1.1, -46.3);
    W.glassMesh = deco(51.1, y + 1.0, -46.6, 51.7, y + 1.4, -46.0, new THREE.MeshBasicMaterial({ visible: false }));
    // two-top by the wall, one chair turned out
    cyl(53.4, y, -46.0, 0.42, 0.74, M.mahogany, { solid: true, seg: 14 }); chair(52.65, -46.0, Math.PI / 2, M.leather, y); chair(54.3, -45.7, -2.2, M.leather, y);
    for (const [x, z] of [[53.2, -44.0], [55.6, -49.3]]) { const v = light(x, y + 2.3, z, 0xffb870, 1.2, { dist: 6, group: 'haunt', on: false }); lantern(x, y + 2.25, z, v, 0.8); }
    const bb = light(50.9, y + 1.7, -46.8, 0xffa860, 0.5, { dist: 3, group: 'haunt', on: false }); const bg = glowMat(0xffc080); deco(50.13, y + 2.32, -49.3, 50.2, y + 2.36, -44.5, bg); bb.fixtures.push(bg);
    fireplace(57.9, -45.0, 'e', y); rug(52.8, -49.0, 57.2, -43.8, y); }
  W.anchors.bar = new THREE.Vector3(51.8, DY + 1.3, -46.8); W.anchors.barStatue = new THREE.Vector3(55.0, DY, -44.25);

  // ---- ROOM 117 x[21.8,26.6] z[-38.4,-33]: vacant McLean guest room, no heat tonight. Bathroom (hide spot) by the entry. ----
  room({ x0: 21.8, z0: -38.4, x1: 26.6, z1: -33, h: 2.7, floor: M.carpetRoom, ceil: M.white, wall: M.cream, base: M.trim, casing: M.trim, open: { s: [[23.52, 24.48, 2.2]] }, surface: 'carpet' });
  W.doors.r117 = door(24, -33.0, 'x', 0.95, { swing: 1, mat: M.mahogany, name: 'r117' });
  label(25.0, 1.6, -32.88, 0.22, 0.12, ['117'], { w: 128, h: 64, size: 34, bg: '#b39253', fg: '#2a1c0a', bold: true, font: 'Georgia, serif' }, 0);
  { // bathroom x[24.9,26.6] z[-35.6,-33]: partition walls + door on its west side
    box(24.9, 0, -35.7, 26.5, 2.7, -35.6, M.cream); box(24.9, 0, -35.7, 25.0, 2.7, -35.15, M.cream); box(24.9, 0, -34.25, 25.0, 2.7, -33.1, M.cream); box(24.9, 2.1, -35.15, 25.0, 2.7, -34.25, M.cream);
    for (const z of [-35.15, -34.25]) deco(24.86, 0, z - (z < -35 ? 0.08 : 0), 25.04, 2.18, z + (z < -35 ? 0 : 0.08), M.trim);
    W.doors.bath117 = door(24.95, -34.7, 'z', 0.9, { swing: 1, mat: M.white, name: 'bath117', h: 2.05 });
    box(24.95, -0.09, -35.6, 26.5, 0.005, -33.1, M.vct, { solid: false });
    solidDeco(25.95, 0, -34.9, 26.5, 0.85, -33.6, M.white); deco(25.9, 0.85, -34.95, 26.5, 0.89, -33.55, L(T.concrete, 1, 0xd8d0c0)); deco(26.47, 1.1, -34.8, 26.5, 1.9, -33.7, M.nightGlass);
    solidDeco(25.1, 0, -35.55, 26.45, 0.55, -34.95, M.white); }
  { const y = 0; // bed, nightstand + lamp, PTAC under the window, desk
    solidDeco(21.9, y, -37.4, 22.05, y + 1.3, -35.2, M.mahogany); solidDeco(22.05, y, -37.3, 24.1, y + 0.5, -35.3, M.mahogany); deco(22.05, y + 0.5, -37.25, 24.05, y + 0.68, -35.35, M.cloth); deco(22.7, y + 0.6, -37.32, 24.12, y + 0.72, -35.28, M.navy);
    deco(22.1, y + 0.68, -37.1, 22.5, y + 0.8, -36.4, M.cloth); deco(22.1, y + 0.68, -36.2, 22.5, y + 0.8, -35.5, M.cloth);
    solidDeco(21.9, y, -38.3, 22.5, y + 0.6, -37.6, M.mahogany); const v = light(22.2, y + 1.15, -37.9, 0xffc070, 1.1, { dist: 6, group: 'r117' }); const g = glowMat(0xffd8a0); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.24, 10), g); sh.position.set(22.2, y + 0.95, -37.95); scene.add(sh); v.fixtures.push(g);
    windowOn(25.15, 1.75, -38.3, 'n', 1.2, 1.1, M.navy);
    solidDeco(24.4, y, -38.3, 25.9, y + 0.85, -38.0, L(T.ceilTile, 0.4, 0xd8cdb0)); W.ptacFront = deco(24.45, y + 0.15, -38.0, 25.85, y + 0.82, -37.96, L(T.plate, 0.15, 0xcfc6ae));
    deco(25.5, y + 0.6, -37.955, 25.8, y + 0.78, -37.95, M.black); W.ptacFilter = deco(24.55, y + 0.25, -38.0, 25.4, y + 0.7, -37.99, L(T.concrete, 0.3, 0x5a5448));
    W.ptacMesh = deco(24.3, 0, -38.4, 26.0, 1.0, -37.6, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.ptac = new THREE.Vector3(25.15, 0.5, -38.1);
    solidDeco(26.0, y, -37.9, 26.5, y + 0.76, -36.5, M.mahogany); chair(25.5, -37.2, -Math.PI / 2, M.beige); rug(22.6, -38.0, 25.6, -35.8, 0.002); }
  W.anchors.r117 = new THREE.Vector3(24, 0, -35.5);

  // =====================================================================
  // McLEAN LOBBY + FRONT DESK x[-6,7.5] z[-30,-21] (6:51 AM ending). Opens north into the west end of McLean hall through a pair of
  // fire doors on magnetic hold-opens (they let go when the power drops). Night-audit station, radio/key return tray, Dee at the desk.
  // =====================================================================
  W.groups.lobby = [];
  room({ x0: -6, z0: -30, x1: 7.5, z1: -21, h: 3.4, floor: M.hardwood, ceil: M.trim, wall: M.cream, wains: M.wains, crown: true, casing: M.trim, skip: ['n'], surface: 'wood' });
  box(-6, 2.8, -30.1, 7.5, 3.4, -29.9, M.cream); // header over the hall wall (lobby ceiling is higher than the hall's)
  label(1.5, 2.65, -30.12, 1.3, 0.2, ['FRONT DESK · LOBBY'], { w: 384, h: 56, size: 30, bg: '#1c2a4a', fg: '#e8e0c8' }, Math.PI);
  label(1.5, 2.62, -29.88, 1.5, 0.2, ['McLEAN HALL · GUEST ROOMS'], { w: 384, h: 56, size: 28, bg: '#1c2a4a', fg: '#e8e0c8' }, 0);
  { // fire-door pair on mag holders, held open flat against the lobby side of the wall
    const mk = (cx, right) => { const D = door(cx, -30.0, 'x', 1.2, { swing: right ? 1 : -1, mat: M.mahogany, window: true, name: right ? 'lobbyR' : 'lobbyL' });
      if (right) { for (const c of D.pivot.children) c.position.x = -c.position.x; D.pivot.position.x += 1.2; }
      D.holdOpen = () => { D.broken = false; D.locked = false; D.setOpen(true, false); D.target = D.swing * (Math.PI - 0.14); D.angle = D.target; D.pivot.rotation.y = D.angle; }; D.setOpen(false, false); D.locked = true; D.lockedMsg = 'Lobby. Dee keeps these shut overnight for the audit. Radio her if you need the desk.'; return D; };
    W.doors.lobbyL = mk(0.9, false); W.doors.lobbyR = mk(2.1, true);
    for (const x of [0.12, 2.88]) deco(x - 0.06, 1.85, -29.9, x + 0.06, 1.97, -29.84, M.darkSteel); // the mag holders
  }
  // lights
  const vL1 = light(-3.2, 2.9, -26.2, 0xffd8a0, 2.6, { dist: 10, group: 'lobby' }), vL2 = light(4.8, 2.9, -27.2, 0xffd8a0, 2.4, { dist: 10, group: 'lobby' });
  chandelier(-3.2, 3.0, -26.2, vL1); chandelier(4.8, 3.0, -27.2, vL2);
  const vDesk = light(1.5, 2.4, -24.2, 0xffcf96, 2.0, { dist: 7, group: 'lobby' }); lantern(0.3, 2.45, -24.0, vDesk, 0.9); lantern(2.7, 2.45, -24.0, vDesk, 0.9);
  // ---- the front desk: mahogany front with a stone transaction ledge, work surface behind, side returns ----
  { const stone = L(T.concrete, 1, 0xd9d1c2);
    solidDeco(-1.2, 0, -24.6, 4.2, 1.05, -24.3, M.mahogany, { occ: true }); deco(-1.25, 1.05, -24.7, 4.25, 1.1, -24.22, stone);
    for (let i = 0; i < 5; i++) deco(-1.0 + i * 1.08, 0.12, -24.62, -0.2 + i * 1.08, 0.92, -24.6, L(T.mahogany, 0.8, 0x5a3022)); // raised panels
    solidDeco(-1.2, 0, -24.3, 4.2, 0.74, -23.6, M.mahogany); deco(-1.2, 0.74, -24.3, 4.2, 0.78, -23.55, stone);
    solidDeco(-1.2, 0, -24.3, -0.9, 1.05, -21.1, M.mahogany); solidDeco(3.9, 0, -24.3, 4.2, 1.05, -21.1, M.mahogany);
    deco(-1.22, 1.05, -24.3, -0.88, 1.1, -21.1, stone); deco(3.88, 1.05, -24.3, 4.22, 1.1, -21.1, stone);
    // garland along the front with a few red berries, and a small wreath on the panel
    deco(-1.2, 0.96, -24.68, 4.2, 1.03, -24.62, new THREE.MeshLambertMaterial({ color: 0x1f3d22 }));
    for (let x = -1.0; x < 4.1; x += 0.42) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), M.red); b.position.set(x, 0.99, -24.69); scene.add(b); }
    wreath(1.5, 0.55, -24.64, Math.PI, 0.55);
    // night-audit station: monitor (turned toward her chair), keyboard, printer, the audit packet, desk phone, a small lamp
    const mon = new THREE.Group(); mon.position.set(2.85, 0.78, -23.85); mon.rotation.y = -0.85; scene.add(mon);
    box(-0.28, 0.12, -0.03, 0.28, 0.46, 0.03, M.black, { parent: mon, solid: false, occ: false }); box(-0.03, 0, -0.03, 0.03, 0.12, 0.03, M.black, { parent: mon, solid: false, occ: false });
    const scr = label(0, 0, 0, 0.52, 0.3, ['NIGHT AUDIT · 12/25/26', 'DAY END ........ DONE', 'ROOMS 41 · OCC 22', 'ENG: WO-4471..4474 ✓'], { w: 256, h: 150, size: 17, bg: '#0c1824', fg: '#9fd8b0', glow: 0.9 }, 0);
    scene.remove(scr); scr.position.set(0, 0.29, 0.032); mon.add(scr);
    deco(2.0, 0.78, -23.95, 2.55, 0.8, -23.78, M.black); // keyboard
    solidDeco(-0.8, 0.78, -24.15, -0.3, 0.98, -23.7, L(T.concrete, 1, 0x3a3c3e)); deco(-0.75, 0.98, -24.1, -0.35, 1.0, -23.8, M.cloth); // printer + paper
    for (let i = 0; i < 4; i++) { const p = deco(0.05, 0.78 + i * 0.012, -24.15, 0.33, 0.79 + i * 0.012, -23.75, M.cloth); p.rotation.y = (i - 1.5) * 0.06; } // audit packet
    deco(3.5, 0.78, -24.1, 3.75, 0.84, -23.9, M.black); deco(3.52, 0.84, -24.1, 3.73, 0.88, -24.04, M.black); // phone
    const vMon = light(2.4, 1.2, -23.3, 0x9fc0ff, 0.7, { dist: 3, group: 'lobby' });
    // RADIO RETURN tray + ENG key drop on the transaction ledge (the two hand-ins)
    deco(0.62, 1.1, -24.62, 1.02, 1.13, -24.32, M.black); deco(0.62, 1.13, -24.62, 0.65, 1.17, -24.32, M.black); deco(0.99, 1.13, -24.62, 1.02, 1.17, -24.32, M.black);
    label(0.825, 1.08, -24.705, 0.5, 0.05, ['RADIO RETURN'], { w: 256, h: 28, size: 20, bg: '#111', fg: '#e8e4d8', bold: true }, Math.PI);
    W.deskRadio = new THREE.Group(); scene.add(W.deskRadio); { const r = deco(0.74, 1.13, -24.52, 0.84, 1.33, -24.44, M.black, { parent: W.deskRadio }); deco(0.79, 1.33, -24.49, 0.81, 1.5, -24.47, M.black, { parent: W.deskRadio }); const led = deco(0.765, 1.3, -24.53, 0.775, 1.31, -24.525, glowMat(0x22ff44), { parent: W.deskRadio }); }
    W.deskRadio.visible = false;
    deco(2.05, 1.1, -24.6, 2.35, 1.24, -24.42, M.brass); deco(2.09, 1.19, -24.61, 2.31, 1.205, -24.6, M.black);
    label(2.2, 1.14, -24.605, 0.26, 0.04, ['ENG KEYS'], { w: 192, h: 28, size: 20, bg: '#b08d3c', fg: '#1a1208', bold: true }, Math.PI);
    W.deskKeys = new THREE.Group(); scene.add(W.deskKeys);
    { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 5, 14), M.steel); ring.rotation.x = Math.PI / 2; ring.position.set(2.75, 1.112, -24.45); W.deskKeys.add(ring);
      for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.004, 0.018), i === 0 ? M.brass : M.steel); const a = -0.4 + i * 0.45; k.position.set(2.75 + Math.cos(a) * 0.08, 1.111, -24.45 + Math.sin(a) * 0.08); k.rotation.y = -a; W.deskKeys.add(k); }
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.035), M.red); tag.position.set(2.62, 1.111, -24.5); W.deskKeys.add(tag); }
    W.deskKeys.visible = false;
    W.radioTrayMesh = deco(0.45, 1.05, -24.75, 1.2, 1.45, -24.2, new THREE.MeshBasicMaterial({ visible: false }));
    W.keyDropMesh = deco(1.85, 1.05, -24.75, 2.95, 1.4, -24.2, new THREE.MeshBasicMaterial({ visible: false }));
    W.anchors.deskTray = new THREE.Vector3(0.82, 1.15, -24.47); W.anchors.keyDrop = new THREE.Vector3(2.2, 1.15, -24.47);
    // behind the desk: key cubbies, the house sign, a staff door
    deco(-0.6, 1.2, -21.12, 1.0, 2.0, -21.05, M.mahogany); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) deco(-0.55 + c * 0.26, 1.25 + r * 0.19, -21.13, -0.33 + c * 0.26, 1.41 + r * 0.19, -21.12, M.black);
    label(1.2, 2.62, -21.11, 2.4, 0.42, ['THE RIZZO CENTER'], { w: 512, h: 90, size: 54, bg: '#1c2a4a', fg: '#c9a74e', font: 'Georgia, serif' }, Math.PI);
    label(1.2, 2.3, -21.11, 2.4, 0.14, ['PAUL J. RIZZO CONFERENCE CENTER · CHAPEL HILL'], { w: 512, h: 30, size: 18, bg: '#1c2a4a', fg: '#e8e0c8' }, Math.PI);
    fakeDoor(3.2, -21.1, 's', null, { mat: M.mahogany, msg: 'Front office. Dee\'s side of the desk.' });
    rug(-0.4, -27.6, 3.4, -25.0, 0);
  }
  // ---- Dee: night auditor, seated at the desk. Stylized and simple (no likeness): navy blazer, red top, reading glasses, hair up. ----
  { const G = W.dee = new THREE.Group(); G.position.set(1.5, 0, -23.05); scene.add(G);
    const skin = C(0x8a5a3e), hair = C(0x24160f), blazer = C(0x1e2a44), slacks = C(0x2a2a30), top = C(0x8a1c1e), chairM = C(0x18181a);
    const B = (x0, y0, z0, x1, y1, z1, m, p = G) => box(x0, y0, z0, x1, y1, z1, m, { parent: p, solid: false, occ: false });
    const limb = (a, b, r, m, p = G) => { const d = new THREE.Vector3().subVectors(b, a); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, d.length(), 8), m); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); p.add(c); return c; };
    // chair
    B(-0.26, 0.42, -0.24, 0.26, 0.5, 0.26, chairM); B(-0.24, 0.55, 0.22, 0.24, 1.12, 0.3, chairM); limb(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0.42, 0), 0.03, chairM);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; limb(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(Math.cos(a) * 0.28, 0.03, Math.sin(a) * 0.28), 0.018, chairM); }
    // seated body
    B(-0.18, 0.5, -0.36, 0.18, 0.64, 0.12, slacks); // lap
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.185, 0.56, 12), blazer); torso.scale.z = 0.72; torso.position.set(0, 0.9, 0.04); torso.rotation.x = -0.08; G.add(torso);
    B(-0.06, 1.08, -0.1, 0.06, 1.17, -0.07, top); // red top at the collar
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), blazer); sh.position.set(sx * 0.165, 1.13, 0.03); G.add(sh);
      const el = new THREE.Vector3(sx * 0.215, 0.9, -0.16), hd = new THREE.Vector3(sx * 0.13, 0.8, -0.5);
      limb(new THREE.Vector3(sx * 0.175, 1.12, 0.02), el, 0.048, blazer); limb(el, hd, 0.04, blazer); const hn = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), skin); hn.scale.set(1, 0.6, 1.3); hn.position.copy(hd).add(new THREE.Vector3(0, 0, -0.04)); G.add(hn); }
    label(1.5 + 0.09, 1.02, -23.15, 0.07, 0.03, ['DEE'], { w: 64, h: 28, size: 20, bg: '#f2efe6', fg: '#1c2a4a', bold: true }, Math.PI);
    limb(new THREE.Vector3(0, 1.16, 0.01), new THREE.Vector3(0, 1.25, 0.0), 0.045, skin);
    const H = W.deeHead = new THREE.Group(); H.position.set(0, 1.25, -0.005); G.add(H);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), skin); head.scale.set(0.9, 1.12, 0.98); head.position.y = 0.1; H.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hair); cap.scale.set(0.95, 1.1, 1.02); cap.position.set(0, 0.11, 0.012); cap.rotation.x = 0.55; H.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), hair); bun.position.set(0, 0.17, 0.085); H.add(bun);
    W.anchors.deeHead = new THREE.Vector3(1.5, 1.38, -23.1); W.deePick = deco(1.12, 0.9, -23.45, 1.88, 1.58, -22.8, new THREE.MeshBasicMaterial({ visible: false }));
    W.colliders.push({ x0: 1.1, x1: 1.9, z0: -23.5, z1: -22.7, y0: 0, y1: 1.5 });
  }
  // ---- the guest side: front doors (west), sitting area, a tree, the bell cart ----
  { const dawn = new THREE.MeshLambertMaterial({ color: 0x1a2436, emissive: 0x0e1726 }); dawn.userData.s = 1;
    for (const z of [-26.15, -24.95]) { plane(-5.885, 1.15, z, 1.1, 2.2, dawn, Math.PI / 2); deco(-5.9, 0, z - 0.6, -5.84, 2.3, z - 0.55, M.darkSteel); deco(-5.9, 0, z + 0.55, -5.84, 2.3, z + 0.6, M.darkSteel); deco(-5.89, 0.95, z - 0.45, -5.8, 1.0, z + 0.45, M.brass); }
    deco(-5.9, 2.3, -26.8, -5.84, 2.38, -24.3, M.darkSteel); plane(-5.885, 2.75, -25.55, 2.4, 0.7, dawn, Math.PI / 2);
    const fd = deco(-5.95, 0, -26.8, -5.8, 2.3, -24.3, new THREE.MeshBasicMaterial({ visible: false }));
    W.interact.push({ mesh: fd, range: 2.4, prompt: () => 'Front doors', use: () => { W.sound && W.sound.locked(new THREE.Vector3(-5.9, 1, -25.5)); W.toast && W.toast('Front doors. Locked until seven; day shift has the key. It\'s just starting to go gray out there.'); } });
    wreath(-5.8, 2.75, -25.55, Math.PI / 2, 0.8); rug(-5.6, -26.9, -4.3, -24.2, 0);
    windowOn(-5.88, 1.6, -28.6, 'w', 0.9, 1.6, M.navy); windowOn(-5.88, 1.6, -22.5, 'w', 0.9, 1.6, M.navy);
    armchair(-3.4, -28.6, Math.PI - 0.4, M.navy); armchair(-1.8, -28.4, Math.PI + 0.5, M.navy); cyl(-2.6, 0, -27.5, 0.42, 0.45, M.mahogany, { solid: true, seg: 16 }); rug(-4.4, -29.5, -0.9, -26.4, 0);
    picture(-3.3, 1.8, -21.1, 's', 1.0, 0.7, 210); picture(6.0, 1.8, -21.1, 's', 0.9, 0.65, 35);
    // the tree (same modest style as the one in the DuBose stair hall)
    const x = -4.7, z = -22.4, y = 0; const tm = new THREE.MeshLambertMaterial({ color: 0x1b3620 }); const cones = [[0.8, 0.28], [0.6, 0.8], [0.42, 1.32]];
    for (const [r, b] of cones) { const c = new THREE.Mesh(new THREE.ConeGeometry(r, 1.0, 9), tm); c.position.set(x, y + b + 0.5, z); scene.add(c); }
    deco(x - 0.22, y, z - 0.22, x + 0.22, y + 0.32, z + 0.22, M.red); W.colliders.push({ x0: x - 0.65, x1: x + 0.65, z0: z - 0.65, z1: z + 0.65, y0: y, y1: y + 2.3 });
    const rAt = h => { let r = 0.05; for (const [cr, b] of cones) if (h >= b && h <= b + 1.0) r = Math.max(r, cr * (1 - (h - b) / 1.0)); return r; };
    const tl = light(x + 0.4, y + 1.2, z - 0.4, 0xffc070, 0.6, { dist: 3.5, group: 'lobby' }); const cols = [0xffc870, 0xff5a40, 0x6aa0ff, 0x7aff90];
    for (let i = 0; i < 28; i++) { const h = 0.4 + (i / 28) * 1.8, a = i * 2.39; const r = rAt(h) + 0.02; const gm = glowMat(cols[i % 4]); const b = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), gm); b.position.set(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r); scene.add(b); tl.fixtures.push(gm); }
    const star = glowMat(0xffe0a0); const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), star); st.position.set(x, y + 2.38, z); scene.add(st); tl.fixtures.push(star);
    // bell cart parked by the east wall
    { const bx = 6.4, bz = -27.4; solidDeco(bx - 0.4, 0.12, bz - 0.7, bx + 0.4, 0.18, bz + 0.7, L(T.carpetRoom, 1, 0x7a2020)); for (const sz of [-0.62, 0.62]) { cyl(bx, 0.18, bz + sz, 0.02, 1.7, M.brass); } deco(bx - 0.02, 1.86, bz - 0.64, bx + 0.02, 1.9, bz + 0.64, M.brass);
      for (const [a, b] of [[-0.35, -0.6], [0.35, -0.6], [-0.35, 0.6], [0.35, 0.6]]) cyl(bx + a, 0, bz + b, 0.05, 0.12, M.black); }
    solidDeco(7.0, 0, -25.2, 7.4, 0.85, -23.4, M.mahogany); deco(7.05, 0.85, -25.1, 7.3, 1.2, -23.5, L(T.books, 0.5)); // brochure console
    fakeDoor(7.4, -22.4, 'e', null, { mat: M.mahogany, msg: 'Sales offices. Locked.' });
  }
  W.anchors.lobby = new THREE.Vector3(1.5, 0, -27); W.anchors.lobbyDoors = new THREE.Vector3(1.5, 1.2, -30);

  // ---- MDP-1, the McLean main, in the maintenance shop (east wall, beside the key cabinet). Separate from DuBose's DH-1. ----
  { const x = 5.9; solidDeco(x - 0.45, 0, -4.2, x, 2.1, -3.1, L(T.plate, 0.3, 0x6d7377));
    deco(x - 0.47, 0.9, -3.95, x - 0.45, 1.65, -3.35, M.darkSteel); deco(x - 0.48, 1.42, -3.9, x - 0.47, 1.6, -3.4, M.black);
    label(x - 0.471, 1.9, -3.65, 0.9, 0.22, ['MDP-1 · McLEAN MAIN', '480Y/277V · 3Ø 4W · 1200A'], { w: 320, h: 80, size: 19, bg: '#e8e8e0', fg: '#111', bold: true }, -Math.PI / 2);
    label(x - 0.471, 0.55, -3.65, 0.7, 0.3, ['⚠ DANGER', 'ARC FLASH HAZARD', 'PPE REQUIRED'], { w: 256, h: 110, size: 22, bg: '#e8742a', fg: '#111', bold: true }, -Math.PI / 2);
    W.mdpTripped = label(x - 0.482, 1.51, -3.65, 0.32, 0.12, ['TRIPPED'], { w: 128, h: 48, size: 30, bg: '#300', fg: '#ff4a3a', bold: true, glow: 1.4 }, -Math.PI / 2);
    W.mdpClosed = label(x - 0.482, 1.51, -3.65, 0.32, 0.12, ['CLOSED'], { w: 128, h: 48, size: 30, bg: '#032', fg: '#5aff8a', bold: true, glow: 1.4 }, -Math.PI / 2);
    W.mdpTripped.visible = false;
    const hp = W.mdpHandle = new THREE.Group(); hp.position.set(x - 0.5, 1.05, -3.75); scene.add(hp); box(-0.03, -0.02, -0.02, 0.0, 0.25, 0.02, M.black, { parent: hp, solid: false, occ: false }); box(-0.05, 0.22, -0.04, 0.0, 0.28, 0.04, M.red, { parent: hp, solid: false, occ: false });
    const pb = deco(x - 0.5, 1.08, -3.5, x - 0.47, 1.16, -3.42, C(0x2a8a3a)); label(x - 0.472, 1.2, -3.46, 0.12, 0.04, ['CLOSE'], { w: 96, h: 32, size: 22, bg: '#ddd', fg: '#111', bold: true }, -Math.PI / 2);
    W.mdpMesh = deco(x - 0.95, 0.6, -4.25, x, 2.05, -3.05, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.mdp = new THREE.Vector3(x - 0.5, 1.3, -3.65); }

  // ---------- region tags for gameplay ----------
  W.regions = [
    { name: 'closet', x0: 58, x1: 60, z0: -46, z1: -43 }, { name: 'sewing', x0: 58, x1: 66, z0: -50, z1: -43 }, { name: 'bar', x0: 50, x1: 58, z0: -50, z1: -43 },
    { name: 'backhall', x0: 54, x1: 65.95, z0: -43, z1: -40 }, { name: 'bath117', x0: 24.95, x1: 26.6, z0: -35.6, z1: -33 }, { name: 'room117', x0: 21.8, x1: 26.6, z0: -38.4, z1: -33.02 },
    { name: 'dock', x0: 0, x1: 16, z0: 0, z1: 12 }, { name: 'office', x0: 0, x1: 6, z0: -5, z1: 0 }, { name: 'corridor', x0: 8, x1: 10.4, z0: -30, z1: 0 },
    { name: 'stairB', x0: 10.4, x1: 14, z0: -20, z1: -10 }, { name: 'lobby', x0: -6, x1: 7.5, z0: -29.98, z1: -21 }, { name: 'mclean', x0: -6, x1: 34, z0: -33, z1: -30 }, { name: 'pantry', x0: 14, x1: 18, z0: -30, z1: -25 },
    { name: 'terrace', x0: 34, x1: 48, z0: -38, z1: -25 }, { name: 'duboseHall', x0: 48, x1: 66, z0: -33, z1: -30 }, { name: 'library', x0: 50, x1: 62, z0: -40, z1: -33 },
    { name: 'dining', x0: 50, x1: 62, z0: -30, z1: -22 }, { name: 'butler', x0: 62, x1: 66, z0: -30, z1: -22 }, { name: 'foyer', x0: 66, x1: 78, z0: -42, z1: -22 }, { name: 'suite', x0: 66, x1: 78, z0: -50, z1: -42 },
  ];
  W.regionAt = (x, z) => { for (const r of W.regions) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.name; return null; };
  W.groundY = (x, z) => { let y = 0; for (const h of W.heights) if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1) y = h.f(x, z); return y; };
  W.surfaceAt = (x, z) => { let s = 'concrete'; for (const r of W.surfaces) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) s = r.s; return s; };
  W.bounds = { x0: -7, x1: 79, z0: -51, z1: 13 };
  return W;
}
