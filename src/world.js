// The Rizzo Center, compressed: loading dock -> engineering office -> service corridor -> stair B
// -> McLean guest hall + pantry -> terrace -> DuBose Home (enfilade hall, library, dining, butler's pantry, stair hall, suite).
// All geometry is procedural and original; inspired by (not copied from) reference photos of the real place.
import * as THREE from 'three';
import { labelTexture } from './textures.js';
import { makeGrime, planarUV, Batch, Decals, HALL_CEIL, mergeStatic } from './gfx.js';
import { regrime, roomDecals, flattenGroups, mergeCells } from './gfx2.js';
import { clutter2 } from './clutter2.js';
import { makePortrait } from './portrait.js';

const TH = 0.1; // wall thickness per side

export function buildWorld(scene, T) {
  const W = { colliders: [], occluders: [], interact: [], vlights: [], doors: [], heights: [], surfaces: [], anchors: {}, groups: {}, sounds: [], scene, rooms: [] };

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
  // gfx pass 1 (dock + McLean hall): grimy procedural textures, batched clutter, decals. See gfx.js.
  const GT = W.GT = makeGrime();
  const GM = W.GM = { dockFloor: L(GT.dockFloor), dockWall: L(GT.dockBlock), rollup: L(GT.rollup), corr: L(GT.corrugated, 0.6), dumpster: L(GT.dumpster, 1.2), lid: C(0x16181a), card: L(GT.cardboard, 0.5),
    pwood: L(GT.palletWood, 0.6), drum: L(GT.drum, 0.9), drumB: L(GT.drum, 0.9, 0x8a3a24), fixture: C(0x5a5e5c), bronze: C(0x2c2620), conduit: C(0x8e9294), yellow: L(GT.palletWood, 0.3, 0xd4a020), rubber: C(0x141414),
    brick: L(T.brick, 0.9, 0x8f7c70), hallCarpet: L(GT.hallCarpet), hallCeil: L(GT.hallCeil), hallWall: L(GT.hallWall), hallWains: L(GT.hallWains), trim: L(GT.trim, 0.5), sagTile: L(GT.sagTile),
    cartGray: C(0x2b2d30), vinyl: C(0x23324e), trashBag: C(0x0d0d0f), towel: C(0xe6e2d6), plastic: C(0xc9c3b3), steelD: C(0x6c7174), red: C(0x8a1c14), cord: C(0xd8892a), chrome: C(0xb8bcc0) };
  const puddleMat = new THREE.MeshPhongMaterial({ map: GT.decals, color: 0x9aa4b4, specular: 0x6a7a90, shininess: 90, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const childMark = () => scene.children.length; const childrenFrom = n => scene.children.slice(n).filter(o => o.isMesh);

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
  function lantern(x, y, z, v, scale = 1, topY) { // hanging glass lantern (DuBose). topY: where the chain meets the ceiling (null = post-mounted, no chain)
    const s = scale; const g = glowMat(0xffd59a);
    if (topY !== null) { deco(x - 0.01, y + 0.35 * s, z - 0.01, x + 0.01, topY ?? (y + 1.2), z + 0.01, M.black); if (topY !== undefined) deco(x - 0.07, topY - 0.03, z - 0.07, x + 0.07, topY, z + 0.07, M.brass); } // ceiling canopy
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
    W.rooms.push(r);
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
  const dockMark = childMark();
  room({ x0: 0, z0: 0, x1: 16, z1: 12, h: 5.5, floor: M.concrete, wall: M.block, base: M.hazard, casing: M.darkSteel, open: { n: [[2.4, 3.4, 2.2], [8, 10.4, 2.6]], e: [[9.8, 10.8, 2.2]], w: [[10.4, 11.4, 2.2]] }, surface: 'concrete' });
  // open-air dock yard: no roof. Grimy unique concrete slab + painted block mapped in world space (seamless across wall segments).
  for (const m of childrenFrom(dockMark)) {
    if (m.material === M.concrete) { m.material = GM.dockFloor; planarUV(m, (x, y, z, ax) => ax === 'y' ? [x / 16, 1 - z / 12] : [x / 16, y]); }
    else if (m.material === M.block) { m.material = GM.dockWall; planarUV(m, (x, y, z, ax) => ax === 'x' ? [z / 4, y / 5.5] : ax === 'z' ? [x / 4, y / 5.5] : [x / 4, z / 4]); }
  }
  W.groups.dock = [];
  const DB = W.dockBatch = new Batch(scene), DD = new Decals(scene, GT.decals), DP = new Decals(scene, GT.decals); DP.mat = puddleMat;
  const bx = (x0, y0, z0, x1, y1, z1, mat, s) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); const sc = s || mat.userData.s || 1; const uv = g.attributes.uv; const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0); const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / sc, uv.getY(i) * dims[f][1] / sc); } return DB.add(g, mat, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); };
  const bxM = (w, h, d, mat, pos, rot, s) => { const g = new THREE.BoxGeometry(w, h, d); const sc = s || mat.userData.s || 1; const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / sc, uv.getY(i) * dims[f][1] / sc); } const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]), 'YXZ')), new THREE.Vector3(1, 1, 1)); return DB.add(g, mat, m); };
  const cy = (x, y, z, r, h, mat, seg = 10, r2, rot) => { const g = new THREE.CylinderGeometry(r2 ?? r, r, h, seg); const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(1, 1, 1)); return DB.add(g, mat, m); };
  W.gfxHelpers = { bx, bxM, cy };
  // ---- lights: nothing hangs from the sky any more. Two vapor-tight fixtures under a steel canopy on the building wall (cold),
  //      a caged wall pack over the time clock and a sodium flood on the pier between the dock doors (warm). Same 'dock' group / reach as before. ----
  { const vA = light(4.8, 3.18, 1.5, 0xd8e6ff, 5.5, { dist: 12, group: 'dock' }), v2 = light(11.5, 3.18, 1.5, 0xd8e6ff, 6.5, { dist: 14, flicker: 0.15, group: 'dock' });
    for (const [x, v] of [[4.8, vA], [11.5, v2]]) { bx(x - 0.7, 3.27, 1.38, x + 0.7, 3.4, 1.62, GM.fixture); const lens = glowMat(0xdfe8f0); bx(x - 0.64, 3.24, 1.41, x + 0.64, 3.27, 1.59, lens); v.fixtures.push(lens); cy(x + 0.75, 3.33, 1.5, 0.02, 0.07, GM.conduit, 6); }
    const v1 = light(8.0, 4.35, 11.2, 0xffa850, 7.5, { dist: 14, group: 'dock' }); // sodium flood on the pier between DOCK 1 and DOCK 2
    bx(7.7, 4.45, 11.62, 8.3, 4.85, 11.9, GM.bronze); const sod = glowMat(0xffb060); bxM(0.5, 0.03, 0.26, sod, [8.0, 4.46, 11.66], [0.35, 0, 0]); v1.fixtures.push(sod); bx(7.96, 4.85, 11.84, 8.04, 5.4, 11.9, GM.conduit);
    const vC = light(0.55, 2.7, 3.8, 0xffc27a, 3.0, { dist: 9, group: 'dock' }); // caged wall pack over the time clock
    bx(0.1, 2.82, 3.62, 0.34, 3.12, 3.98, GM.bronze); const wp = glowMat(0xffd08a); bx(0.14, 2.79, 3.66, 0.32, 2.82, 3.94, wp); vC.fixtures.push(wp); for (let k = 0; k < 3; k++) bx(0.12, 2.74, 3.66 + k * 0.13, 0.34, 2.76, 3.68 + k * 0.13, GM.steelD);
    bx(0.1, 2.7, 3.5, 0.14, 3.24, 4.1, GM.steelD); // backplate bolted to the block
    light(13, 2.9, 1.0, 0xffc890, 2.5, { dist: 6, group: 'dock' }); // caged bulb over the corridor door
    const cage = glowMat(0xffd090); deco(12.9, 2.75, 0.12, 13.1, 2.95, 0.28, cage); W.vlights[W.vlights.length - 1].fixtures.push(cage);
    for (let k = 0; k < 4; k++) bx(12.88 + k * 0.08, 2.72, 0.1, 12.9 + k * 0.08, 2.98, 0.3, GM.steelD); }
  // ---- steel canopy along the building wall (corrugated deck, fascia, tension rods back to the wall) ----
  bx(0.12, 3.4, 0.1, 15.88, 3.47, 2.5, GM.corr); bx(0.12, 3.24, 2.42, 15.88, 3.56, 2.5, C(0x3a3f3c)); bx(0.12, 3.24, 0.1, 0.18, 3.47, 2.5, C(0x3a3f3c)); bx(15.82, 3.24, 0.1, 15.88, 3.47, 2.5, C(0x3a3f3c));
  for (const x of [0.6, 4.0, 7.6, 11.0, 15.3]) { const a = Math.atan2(2.3, 1.55); bxM(0.035, Math.hypot(2.3, 1.55), 0.035, GM.steelD, [x, 4.27, 1.3], [a, 0, 0]); bx(x - 0.08, 4.95, 0.1, x + 0.08, 5.15, 0.14, GM.steelD); }
  // gutter + downspout at the east end (rust streak under it)
  bx(0.12, 3.47, 2.44, 15.88, 3.6, 2.56, GM.steelD); cy(15.7, 0.05, 2.62, 0.05, 3.5, GM.steelD, 6); bx(15.6, 0, 2.5, 15.82, 0.08, 2.9, GM.steelD);
  // ---- the building above the canopy: brick up to 7.5 m, coping, two upstairs windows (one faintly lit behind a blind) ----
  { const bk = box(-0.1, 5.5, -0.3, 16.1, 7.5, 0.1, GM.brick, { solid: false, occ: false }); planarUV(bk, (x, y, z, ax) => ax === 'x' ? [z / 0.9, y / 0.9] : [x / 0.9, y / 0.9]);
    bx(-0.15, 7.5, -0.35, 16.15, 7.62, 0.22, M.darkSteel);
    for (const [x, lit] of [[4.2, false], [11.8, true]]) { bx(x - 0.65, 5.75, 0.1, x + 0.65, 7.0, 0.13, M.trim); const gm = lit ? glowMat(0x2c2214) : M.nightGlass; bx(x - 0.55, 5.85, 0.13, x + 0.55, 6.9, 0.135, gm);
      if (lit) { for (let k = 0; k < 9; k++) bx(x - 0.55, 6.85 - k * 0.1, 0.136, x + 0.55, 6.83 - k * 0.1, 0.14, C(0x2a2014)); } bx(x - 0.7, 5.7, 0.1, x + 0.7, 5.77, 0.2, M.trim); } }
  // copings on the yard walls
  bx(-0.04, 5.5, 0, 0.14, 5.58, 12, M.darkSteel); bx(0, 5.5, 11.86, 16, 5.58, 12.04, M.darkSteel);
  // roll-up doors + dock bumpers on south wall (rusty slats now)
  for (const x0 of [2, 9]) { const ru = deco(x0, 0.0, 11.86, x0 + 5, 4.0, 11.9, GM.rollup); planarUV(ru, (x, y) => [(x - x0) / 5, y / 4]); deco(x0 - 0.15, 0, 11.8, x0, 4.2, 11.9, M.yellow); deco(x0 + 5, 0, 11.8, x0 + 5.15, 4.2, 11.9, M.yellow); deco(x0 - 0.1, 4.0, 11.6, x0 + 5.1, 4.4, 11.9, M.darkSteel);
    deco(x0 + 0.6, 1.0, 11.6, x0 + 1.0, 1.4, 11.9, M.black); deco(x0 + 4.0, 1.0, 11.6, x0 + 4.4, 1.4, 11.9, M.black); deco(x0 + 1.5, 0, 9.8, x0 + 3.5, 0.03, 11.8, M.plate);
    DD.add(x0 + 2.5, 2.2, 11.86, 's', 5.2, 4.4, 9, 0, x0 > 5); DD.add(x0 - 0.08, 0.6, 11.79, 's', 0.6, 1.2, 12); }
  W.anchors.rollup = new THREE.Vector3(9, 2, 11.8);
  label(4.5, 4.6, 11.85, 2.6, 0.4, ['DOCK 1'], { w: 256, h: 40, size: 30, bg: '#1d1b17', fg: '#d9b23a', bold: true }, Math.PI);
  label(11.5, 4.6, 11.85, 2.6, 0.4, ['DOCK 2'], { w: 256, h: 40, size: 30, bg: '#1d1b17', fg: '#d9b23a', bold: true }, Math.PI);
  // bollards
  for (const x of [1.6, 7.6, 8.6, 14.6]) { const b = cyl(x, 0, 10.8, 0.11, 1.1, M.yellow, { solid: true }); DD.add(x, 0.004, 10.8, 'up', 0.5, 0.5, 13); }
  // time clock on west wall + badge rack + bulletin board
  { const x = 0.1; deco(x, 1.15, 3.55, x + 0.16, 1.65, 4.05, M.darkSteel); W.anchors.timeclock = new THREE.Vector3(0.3, 1.4, 3.8);
    const scr = glowMat(0x7fd18c); deco(x + 0.161, 1.45, 3.65, x + 0.165, 1.58, 3.95, scr);
    label(x + 0.17, 1.27, 3.8, 0.26, 0.1, ['SWIPE'], { w: 128, h: 48, size: 30, bg: '#222', fg: '#ddd' }, Math.PI / 2);
    W.timeclockMesh = deco(x, 1.1, 3.5, x + 0.2, 1.7, 4.1, new THREE.MeshBasicMaterial({ visible: false }));
    deco(x, 1.0, 4.3, x + 0.06, 1.8, 4.9, M.steel); for (let i = 0; i < 6; i++) deco(x + 0.06, 1.05 + i * 0.12, 4.35, x + 0.1, 1.12 + i * 0.12, 4.85, i % 2 ? M.cloth : M.beige);
    label(x + 0.03, 2.1, 3.8, 1.2, 0.4, ['CLOCK IN / OUT', 'ALL HOURLY STAFF'], { w: 256, h: 80, size: 22, bg: '#efe9d6', fg: '#8a1c14', bold: true }, Math.PI / 2);
    deco(x, 1.3, 5.6, x + 0.05, 2.3, 7.4, L(T.ceilTile, 1, 0xa08060));
    label(x + 0.06, 1.95, 6.0, 0.35, 0.45, ['SAFETY', 'FIRST', '', '___'], { w: 128, h: 160, size: 18, bg: '#f0f0e8', fg: '#222' }, Math.PI / 2);
    label(x + 0.06, 1.7, 6.9, 0.4, 0.5, ['3RD SHIFT', 'ENG ON CALL', 'x4411'], { w: 128, h: 160, size: 18, bg: '#f4e9a0', fg: '#222' }, Math.PI / 2);
    label(x + 0.06, 1.75, 2.75, 0.32, 0.22, ['NO', 'SMOKING'], { w: 128, h: 96, size: 26, bg: '#e8e2d0', fg: '#a01810', bold: true }, Math.PI / 2); }
  // ---- clutter (chunky low-poly, batched per material; colliders only where you'd actually bump into it) ----
  const col = (x0, x1, z0, z1, y1 = 1.2) => W.colliders.push({ x0, x1, z0, z1, y0: 0, y1 });
  function pallet(x, z, stack = 0, seedK = 0) { // slatted pallet + stacked cartons (same footprints/colliders as before)
    for (let k = 0; k < 7; k++) bx(x - 0.6, 0.12, z - 0.5 + k * 0.155, x + 0.6, 0.15, z - 0.5 + k * 0.155 + 0.1, GM.pwood);
    for (const zz of [-0.5, -0.05, 0.4]) bx(x - 0.6, 0.0, z + zz, x + 0.6, 0.12, z + zz + 0.1, GM.pwood);
    W.colliders.push({ x0: x - 0.6, x1: x + 0.6, y0: 0, y1: 0.15, z0: z - 0.5, z1: z + 0.5 });
    for (let i = 0; i < stack; i++) { const s = 0.3 + ((i * 37 + seedK * 11) % 10) / 10 * 0.15; const x0 = x - 0.55 + (i % 2) * 0.55, y0 = 0.15 + Math.floor(i / 2) * 0.45, x1 = x - 0.05 + (i % 2) * 0.55, y1 = y0 + s + 0.1;
      const jog = ((i * 13 + seedK) % 5 - 2) * 0.02; bxM(x1 - x0 - 0.02, y1 - y0, 0.88, GM.card, [(x0 + x1) / 2 + jog, (y0 + y1) / 2, z + jog], [0, jog * 2, 0]);
      W.colliders.push({ x0, x1, y0, y1, z0: z - 0.45, z1: z + 0.45 }); }
    DD.add(x, 0.004, z, 'up', 1.7, 1.5, 13); }
  pallet(13.8, 8.5, 4, 1); pallet(13.8, 6.6, 2, 2); pallet(2.2, 9.6, 3, 3);
  { // linen cart: open-top canvas sling bag hanging in a steel frame (sides sag, bottom bellies), casters, a heap of used towels spilling over, one on the floor
    const x0 = 5.5, x1 = 6.9, z0 = 2.2, z1 = 3.0, cv = L(GT.cardboard, 0.4, 0xc8b89a), cvD = L(GT.cardboard, 0.4, 0x8a7c62);
    for (const [a, b] of [[x0, z0], [x1 - 0.04, z0], [x0, z1 - 0.04], [x1 - 0.04, z1 - 0.04]]) { bx(a, 0.12, b, a + 0.04, 1.2, b + 0.04, GM.steelD); cy(a + 0.02, 0, b + 0.02, 0.06, 0.12, GM.rubber, 8, undefined, [Math.PI / 2, 0, 0]); }
    for (const z of [z0, z1 - 0.04]) bx(x0, 1.15, z, x1, 1.2, z + 0.04, GM.steelD); for (const x of [x0, x1 - 0.04]) bx(x, 1.15, z0, x + 0.04, 1.2, z1, GM.steelD); bx(x0, 0.12, z0, x1, 0.15, z0 + 0.03, GM.steelD); bx(x0, 0.12, z1 - 0.03, x1, 0.15, z1, GM.steelD);
    // sling: four canvas walls bowed inward (two slanted panels each) + a sagging bottom, hems wrapped over the top rails
    const pan = (w, h, pos, rot, m) => bxM(w, h, 0.015, m, pos, rot);
    for (const [zz, sg] of [[z0 + 0.03, 1], [z1 - 0.03, -1]]) { pan(1.32, 0.5, [6.2, 0.92, zz + sg * 0.035], [sg * 0.14, 0, 0], cv); pan(1.24, 0.42, [6.2, 0.47, zz + sg * 0.045], [-sg * 0.2, 0, 0], cvD); }
    for (const [xx, sg] of [[x0 + 0.03, 1], [x1 - 0.03, -1]]) { bxM(0.015, 0.5, 0.72, cv, [xx + sg * 0.035, 0.92, 2.6], [0, 0, -sg * 0.14]); bxM(0.015, 0.42, 0.64, cvD, [xx + sg * 0.045, 0.47, 2.6], [0, 0, sg * 0.2]); }
    bxM(1.2, 0.03, 0.6, cvD, [6.2, 0.27, 2.6], [0, 0, 0]); for (const z of [z0 + 0.02, z1 - 0.02]) bx(x0, 1.12, z - 0.012, x1, 1.22, z + 0.012, cv);
    const dirty = C(0xcfc8b6); for (let k = 0; k < 11; k++) bxM(0.36 + (k % 3) * 0.05, 0.12, 0.3, k % 4 === 3 ? dirty : GM.towel, [x0 + 0.24 + (k % 4) * 0.3 + (k > 7 ? 0.1 : 0), 1.14 + Math.floor(k / 4) * 0.1, z0 + 0.22 + (k % 2) * 0.32], [0.2 * ((k % 3) - 1), k * 0.7, 0.18 * (k % 3 - 1)]);
    bxM(0.06, 0.5, 0.34, GM.towel, [x1 + 0.03, 0.98, 2.5], [0, 0, 0.12]); bxM(0.44, 0.03, 0.36, dirty, [6.95, 0.015, 3.35], [0, 0.6, 0]); // one draped over the rail, one on the ground
    W.colliders.push({ x0, x1, y0: 0.2, y1: 1.2, z0, z1 }); DD.add(6.2, 0.004, 2.6, 'up', 1.8, 1.2, 13); }
  { // trash toters + compactor panel
    const tot = L(GT.dumpster, 0.8, 0x6a8a6a); cyl(15.2, 0, 1.2, 0.38, 1.05, tot, { solid: true }); cyl(15.2, 0, 2.1, 0.38, 1.05, tot, { solid: true });
    for (const z of [1.2, 2.1]) { cy(15.2, 1.05, z, 0.41, 0.06, GM.lid, 12); DD.add(15.2, 0.004, z, 'up', 1.1, 1.1, 13); }
    deco(15.85, 1.2, 4.5, 15.9, 1.9, 5.1, M.darkSteel); label(15.84, 1.75, 4.8, 0.5, 0.15, ['COMPACTOR'], { w: 128, h: 32, size: 16, bg: '#333', fg: '#eee' }, -Math.PI / 2); }
  { // dumpster in the southwest corner (lid propped, stencil, grime puddle)
    const x0 = 0.18, x1 = 1.38, z0 = 7.95, z1 = 10.05; bx(x0 + 0.04, 0.16, z0, x1, 1.22, z1, GM.dumpster); bx(x0, 1.1, z0 - 0.04, x1 + 0.04, 1.22, z1 + 0.04, GM.dumpster, 0.4);
    bxM(1.25, 0.05, 1.04, GM.lid, [0.8, 1.27, 8.5], [0, 0, 0]); bxM(0.05, 1.2, 1.04, GM.lid, [0.3, 1.86, 9.53], [0, 0, 0.1]); // one lid shut, one flipped up against the wall
    for (const z of [8.1, 9.9]) for (const x of [0.35, 1.2]) cy(x, 0.0, z, 0.08, 0.16, GM.rubber, 8);
    bx(x1, 0.5, 8.3, x1 + 0.08, 0.62, 9.7, GM.steelD); // fork pocket rail
    col(x0 - 0.05, x1 + 0.1, z0 - 0.06, z1 + 0.06, 1.3); DD.add(1.6, 0.004, 9.0, 'up', 2.0, 2.6, 11); DD.add(0.8, 0.004, 9.0, 'up', 1.8, 2.6, 13); }
  { // steel drums by the compactor (one rusted through)
    for (const [x, z, m] of [[15.35, 5.75, GM.drum], [15.4, 6.45, GM.drumB], [14.78, 6.05, GM.drum]]) { cy(x, 0, z, 0.29, 0.88, m, 12); cy(x, 0.88, z, 0.29, 0.02, GM.steelD, 12); cy(x, 0.28, z, 0.295, 0.03, GM.steelD, 12); cy(x, 0.6, z, 0.295, 0.03, GM.steelD, 12); col(x - 0.29, x + 0.29, z - 0.29, z + 0.29, 0.9); DD.add(x, 0.004, z, 'up', 0.9, 0.9, 13); }
    DD.add(15.1, 0.004, 6.3, 'up', 1.6, 1.4, 5); }
  { // baled cardboard by the toters
    bxM(0.8, 1.0, 1.05, GM.card, [15.42, 0.5, 3.35], [0, 0.04, 0], 0.35); for (const z of [3.05, 3.65]) bxM(0.82, 1.02, 0.03, GM.rubber, [15.42, 0.5, z], [0, 0.04, 0]); col(14.98, 15.86, 2.78, 3.92, 1.0); DD.add(15.3, 0.004, 3.35, 'up', 1.2, 1.4, 13); }
  { // wire cage cart, full of bagged linen, parked by the corridor door
    const x0 = 11.05, x1 = 12.1, z0 = 0.25, z1 = 1.05; for (let k = 0; k <= 6; k++) { const x = x0 + (x1 - x0) * k / 6; bx(x - 0.01, 0.15, z1 - 0.02, x + 0.01, 1.65, z1, GM.chrome); bx(x - 0.01, 0.15, z0, x + 0.01, 1.65, z0 + 0.02, GM.chrome); }
    for (let k = 0; k <= 4; k++) { const z = z0 + (z1 - z0) * k / 4; bx(x0, 0.15, z - 0.01, x0 + 0.02, 1.65, z + 0.01, GM.chrome); bx(x1 - 0.02, 0.15, z - 0.01, x1, 1.65, z + 0.01, GM.chrome); }
    for (const y of [0.15, 0.85, 1.63]) { bx(x0, y, z0, x1, y + 0.02, z0 + 0.02, GM.chrome); bx(x0, y, z1 - 0.02, x1, y + 0.02, z1, GM.chrome); bx(x0, y, z0, x0 + 0.02, y + 0.02, z1, GM.chrome); bx(x1 - 0.02, y, z0, x1, y + 0.02, z1, GM.chrome); }
    bx(x0, 0.15, z0, x1, 0.17, z1, GM.steelD); for (let k = 0; k < 5; k++) bxM(0.42, 0.36, 0.34, k % 2 ? GM.towel : C(0xb9c2cc), [x0 + 0.27 + (k % 2) * 0.48, 0.36 + Math.floor(k / 2) * 0.38, 0.65 + ((k * 7) % 3 - 1) * 0.1], [0, k, 0.2]);
    for (const [a, b] of [[x0 + 0.05, z0 + 0.05], [x1 - 0.05, z0 + 0.05], [x0 + 0.05, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]) cy(a, 0, b, 0.06, 0.15, GM.rubber, 8);
    col(x0, x1, z0, z1, 1.65); DD.add(11.6, 0.004, 0.7, 'up', 1.5, 1.2, 13); }
  { // loose cartons, flattened boxes against the wall
    bxM(0.6, 0.42, 0.45, GM.card, [12.75, 0.21, 0.42], [0, 0.15, 0]); bxM(0.5, 0.36, 0.4, GM.card, [12.8, 0.6, 0.45], [0, -0.2, 0]); bxM(0.04, 1.1, 0.9, GM.card, [13.4, 0.55, 0.62], [0, 0, -0.18]); DD.add(12.9, 0.004, 0.55, 'up', 1.2, 1.0, 13); }
  { // mop bucket + wringer + mop, wet patch
    const x = 4.6, z = 0.5; bx(x - 0.22, 0.04, z - 0.17, x + 0.22, 0.36, z + 0.17, GM.yellow); bx(x - 0.2, 0.36, z - 0.06, x + 0.2, 0.5, z + 0.06, GM.steelD); for (const [a, b] of [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]]) cy(x + a, 0, z + b, 0.03, 0.04, GM.rubber, 6);
    cy(x + 0.05, 0.25, z, 0.014, 1.35, GM.pwood, 6, undefined, [0.12, 0, -0.1]); bxM(0.2, 0.12, 0.12, GM.towel, [x - 0.02, 0.34, z - 0.01], [0, 0, 0]);
    DP.add(x + 0.3, 0.003, z + 0.45, 'up', 1.3, 1.0, 11, 0.6); DD.add(x, 0.004, z, 'up', 0.7, 0.6, 13); }
  { // sand-top ash urn by the time clock (Clint's), butts everywhere around it
    cy(0.45, 0, 2.95, 0.13, 0.8, GM.steelD, 10, 0.11); cy(0.45, 0.8, 2.95, 0.11, 0.06, C(0xb8ab88), 10); DD.add(0.9, 0.004, 3.6, 'up', 1.4, 1.4, 10, 0.3); DD.add(1.5, 0.004, 4.9, 'up', 1.0, 1.0, 10, 1.9); DD.add(0.45, 0.004, 2.95, 'up', 0.5, 0.5, 13); }
  { // cones (one knocked over), wheel chock, a leaning broken pallet
    const cone = C(0xd2581c), band = C(0xd8d8d0);
    const coneAt = (x, z, rx = 0, rz = 0, y = 0) => { cy(x, y, z, 0.17, 0.03, GM.rubber, 4, 0.17, [rx, 0, rz]); const c = new THREE.ConeGeometry(0.14, 0.62, 10); DB.add(c, cone, new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.34, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1))); };
    coneAt(8.1, 10.15); { const c = new THREE.ConeGeometry(0.14, 0.62, 10); DB.add(c, cone, new THREE.Matrix4().compose(new THREE.Vector3(6.4, 0.14, 10.9), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, Math.PI / 2)), new THREE.Vector3(1, 1, 1))); }
    bxM(0.18, 0.12, 0.28, C(0x2a2a2a), [10.6, 0.06, 10.4], [0, 0.3, 0]);
    for (let k = 0; k < 5; k++) bxM(0.1, 1.2, 0.025, GM.pwood, [7.35 + k * 0.32, 0.6, 11.72], [-0.18, 0, k === 3 ? 0.25 : 0]); for (const y of [0.15, 1.0]) bxM(1.45, 0.1, 0.08, GM.pwood, [8.0, y, 11.62 + y * 0.18], [-0.18, 0, 0]); }
  { // wall junk: hose reel, conduit + junction boxes, extinguisher, a dead phone box, an old calendar-free bulletin board
    const w = 0.1; bx(6.2, 0.9, w, 6.8, 1.5, w + 0.08, GM.steelD); cy(6.5, 1.2, w + 0.2, 0.25, 0.22, C(0x2a5a30), 14, undefined, [Math.PI / 2, 0, 0]); cy(6.5, 1.2, w + 0.2, 0.12, 0.24, GM.steelD, 10, undefined, [Math.PI / 2, 0, 0]);
    bx(7.25, 0.4, w, 7.31, 5.45, w + 0.05, GM.conduit); bx(7.12, 1.3, w, 7.44, 1.62, w + 0.1, GM.steelD); bx(7.12, 3.0, w, 7.44, 3.25, w + 0.09, GM.steelD); bx(7.31, 1.45, w, 7.9, 1.5, w + 0.04, GM.conduit);
    cy(7.75, 0.75, w + 0.12, 0.08, 0.42, GM.red, 10); bx(7.66, 1.17, w, 7.84, 1.3, w + 0.03, GM.steelD); bx(7.6, 1.42, w, 7.9, 1.62, w + 0.01, C(0xc81e14));
    bx(5.2, 1.3, w, 5.5, 1.75, w + 0.12, C(0x7a7a6a)); bx(5.25, 1.55, w + 0.12, 5.45, 1.7, w + 0.13, GM.rubber); }
  // pipes: up on the building wall, on brackets (no more floating)
  bx(0, 5.0, 0.12, 16, 5.15, 0.27, M.steel); bx(0, 4.75, 0.12, 16, 4.83, 0.2, L(T.concrete, 1, 0x8a2a1a)); for (let x = 0.8; x < 16; x += 2.2) bx(x, 4.7, 0.1, x + 0.06, 5.2, 0.3, GM.steelD);
  label(9.2, 2.85, 0.12, 2.0, 0.3, ['ENGINEERING  ·  McLEAN HALL  →'], { w: 512, h: 64, size: 30, bg: '#1d2a44', fg: '#e8e4d8' }, 0);
  label(2.9, 2.4, 0.12, 1.1, 0.22, ['MAINTENANCE'], { w: 256, h: 48, size: 28, bg: '#1d2a44', fg: '#e8e4d8', bold: true }, 0);
  W.surfaces.push({ x0: 0, x1: 16, z0: 0, z1: 12, s: 'concrete' });
  // ---- decals: contact shadows along every wall base, leak/rust streaks off the copings and anchors, oil, skids, butts, puddles ----
  DD.wallBase(0.1, 0, 2.28, 0, 'n', 0, 0.4, 0.35); DD.wallBase(3.52, 0, 7.88, 0, 'n', 0, 0.4, 0.35); DD.wallBase(10.52, 0, 15.9, 0, 'n', 0, 0.4, 0.35);
  DD.wallBase(0, 0.1, 0, 10.28, 'w', 0, 0.45, 0.4); DD.wallBase(0, 11.52, 0, 11.9, 'w', 0, 0.45, 0.4); DD.wallBase(0, 12, 16, 12, 's', 0, 0.45, 0.4); DD.wallBase(16, 0.1, 16, 9.68, 'e', 0, 0.45, 0.4); DD.wallBase(16, 10.92, 16, 11.9, 'e', 0, 0.45, 0.4);
  for (const [x, w] of [[1.0, 0.8], [5.6, 1.0], [12.2, 0.9], [14.8, 0.7]]) DD.add(x, 4.8, 11.9, 's', w, 1.4, 1); for (const z of [1.5, 6.4, 10.9]) DD.add(0.1, 4.7, z, 'w', 1.0, 1.6, 1); for (const z of [2.0, 6.9]) DD.add(15.9, 4.7, z, 'e', 1.0, 1.6, 1);
  DD.add(0.1, 2.3, 3.8, 'w', 0.5, 0.9, 9); DD.add(8.0, 3.9, 11.9, 's', 0.6, 1.1, 9); for (const x of [0.6, 4.0, 7.6, 11.0, 15.3]) DD.add(x, 4.6, 0.1, 'n', 0.4, 0.8, 9);
  DD.add(15.75, 1.6, 2.4, 'n', 0.5, 2.0, 9); DD.add(15.55, 0.004, 2.9, 'up', 0.9, 0.8, 11);
  for (const [x, z, w, r] of [[3.9, 10.6, 1.4, 0.4], [10.6, 10.9, 1.2, 2.1], [12.3, 9.8, 1.0, 1.0], [6.8, 8.6, 0.9, 0.3], [9.4, 4.8, 0.8, 2.6], [2.9, 7.4, 0.7, 1.2]]) DD.add(x, 0.004, z, 'up', w, w, 5, r);
  for (const [x, z, r] of [[4.5, 9.4, 0.15], [11.4, 9.2, -0.2], [13.0, 6.2, 0.6]]) DD.add(x, 0.004, z, 'up', 1.4, 3.0, 6, r);
  for (const [x, z, r] of [[5.8, 4.4, 0.4], [10.2, 7.4, 1.4], [3.1, 2.9, 2.2]]) DD.add(x, 0.004, z, 'up', 2.4, 2.4, 7, r);
  DD.add(9.6, 0.004, 3.6, 'up', 0.25, 0.3, 14, 0.7); DD.add(2.4, 0.004, 5.9, 'up', 0.22, 0.27, 14, 2.0);
  for (const [x, z, w, r] of [[8.3, 6.4, 2.2, 0.5], [5.3, 11.0, 1.8, 1.7], [11.9, 11.2, 1.5, 2.9], [14.2, 10.2, 1.0, 0.2]]) DP.add(x, 0.003, z, 'up', w, w * 0.7, 11, r);
  DD.add(0.1, 0.5, 6.5, 'w', 2.2, 1.0, 12); DD.add(15.9, 0.5, 6.0, 'e', 2.6, 1.0, 12); DD.add(0.1, 4.9, 11.6, 'w', 0.8, 0.8, 4, 0); DD.add(15.9, 4.9, 0.4, 'e', 0.8, 0.8, 4, Math.PI);
  W.dockDecals = [DD.flush(), DP.flush()]; W.dockBatched = DB.flush({ name: 'dockClutter' });
  // ---- employee lot door (east wall): Clint's way out at 10:58. Steel man door, locked for you all night. ----
  W.doors.lotDoor = door(15.95, 10.3, 'z', 1.0, { swing: 1, mat: L(T.concrete, 1, 0x56606a), locked: true, name: 'lot', lockedMsg: 'Employee lot. You\'re on till seven.' });
  label(15.84, 2.45, 10.3, 0.9, 0.2, ['EXIT · EMPLOYEE LOT'], { w: 256, h: 56, size: 24, bg: '#7a1410', fg: '#f2efe6', bold: true }, -Math.PI / 2);
  deco(15.82, 1.0, 10.62, 15.86, 1.06, 10.74, M.darkSteel); // push bar
  // ---- outside: the employee lot (east of the dock). At night it's sodium poles and dark; at 7 AM on Christmas it's the walk out into the sunrise.
  //      All procedural: asphalt, striping, curbs, parked cars, light poles, the building's back wall, a treeline, a dawn sky (hidden until the end). ----
  { const asph = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#3b3c3f'; g.fillRect(0, 0, 256, 256);
      const d = g.getImageData(0, 0, 256, 256); for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 46 + (Math.random() < 0.03 ? 40 : 0); d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n * 1.05; } g.putImageData(d, 0, 0);
      g.strokeStyle = 'rgba(15,15,16,0.7)'; g.lineWidth = 1.5; for (let k = 0; k < 3; k++) { g.beginPath(); let x = Math.random() * 256, y = 0; g.moveTo(x, y); while (y < 256) { x += (Math.random() - 0.5) * 30; y += 12 + Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
      for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(20,20,22,${0.08 + Math.random() * 0.12})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 30, 0, 7); g.fill(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const A = L(asph, 4); const lotX0 = 16, lotX1 = 50, lotZ0 = 0, lotZ1 = 36;
    box(lotX0, -0.1, lotZ0, lotX1, 0, lotZ1, A, { solid: false }); box(-20, -0.12, 12, lotX0, -0.02, 60, A, { solid: false }); box(lotX0, -0.12, lotZ1, 90, -0.02, 70, L(T.hedge, 3, 0x4a5a3a), { solid: false }); box(lotX1, -0.12, -40, 180, -0.02, lotZ1, L(T.hedge, 3, 0x4a5a3a), { solid: false }); box(90, -0.12, lotZ1, 180, -0.02, 90, L(T.hedge, 3, 0x4a5a3a), { solid: false });
    W.surfaces.push({ x0: lotX0, x1: lotX1, z0: lotZ0, z1: lotZ1, s: 'concrete' });
    // the building behind you: McLean's back wall (brick, dark windows) and the dock's outside face, a roofline, a few vents
    const brick = L(T.brick, 1.2, 0x9a8a80); box(lotX0, 0, -0.6, lotX1 + 6, 7.5, -0.05, brick); box(lotX0 - 0.2, 7.5, -0.8, lotX1 + 6, 7.8, 0.1, M.darkSteel, { solid: false });
    for (let x = 19; x < lotX1 + 4; x += 3.4) { for (const y of [2.0, 5.0]) { deco(x - 0.6, y - 0.75, -0.06, x + 0.6, y + 0.75, -0.02, M.nightGlass); deco(x - 0.68, y - 0.83, -0.08, x + 0.68, y - 0.75, 0.0, M.trim); } }
    box(15.9, 5.5, 0, 16.1, 6.1, 12, M.block, { solid: false }); deco(16.1, 5.9, 0, 16.3, 6.1, 12, M.darkSteel);
    for (const x0 of [2, 9]) { deco(x0, 0, 12.02, x0 + 5, 4.0, 12.06, M.rollup); deco(x0 - 0.15, 0, 12.0, x0, 4.2, 12.1, M.yellow); deco(x0 + 5, 0, 12.0, x0 + 5.15, 4.2, 12.1, M.yellow); deco(x0 + 0.5, 0, 12.06, x0 + 1.0, 1.3, 12.5, M.black); deco(x0 + 4.0, 0, 12.06, x0 + 4.5, 1.3, 12.5, M.black); }
    // (the dock has no roof any more: it's an open-air yard under the night sky; see the canopy + copings above)
    deco(16.0, 2.35, 9.7, 16.05, 2.75, 10.9, M.darkSteel); label(16.07, 2.55, 10.3, 0.9, 0.2, ['EMPLOYEE ENTRANCE · BADGE REQUIRED'], { w: 384, h: 56, size: 20, bg: '#1d2a44', fg: '#e8e4d8', bold: true }, Math.PI / 2);
    deco(16.05, 1.0, 10.95, 16.12, 1.25, 11.1, M.darkSteel); deco(16.12, 1.12, 10.98, 16.13, 1.2, 11.07, glowMat(0xd23a2a)); // badge reader
    // curbs + a sidewalk along the building, then the stalls
    box(lotX0, 0, 0, lotX1, 0.15, 2.2, L(T.concrete, 2, 0xa8a49a), { solid: false }); W.heights.push({ x0: lotX0, x1: lotX1, z0: 0, z1: 2.2, f: () => 0.15 });
    box(lotX0, 0, 8.4, lotX0 + 3.4, 0.12, 12.2, L(T.concrete, 2, 0xa8a49a), { solid: false }); W.heights.push({ x0: lotX0, x1: lotX0 + 3.4, z0: 8.4, z1: 12.2, f: () => 0.12 });
    const paint = new THREE.MeshLambertMaterial({ color: 0xd8d4c4 }); paint.userData.s = 1; const yel = new THREE.MeshLambertMaterial({ color: 0xc9a22a }); yel.userData.s = 1;
    for (const zr of [[3.2, 8.2], [24, 29], [29.4, 34.4]]) for (let x = 21; x <= 47; x += 2.6) deco(x - 0.05, 0.002, zr[0], x + 0.05, 0.006, zr[1], paint);
    for (let x = 22; x < 48; x += 3) deco(x, 0.002, 15.9, x + 1.5, 0.006, 16.1, yel); // drive-aisle dashes
    for (let x = 21.65; x < 47; x += 2.6) solidDeco(x + 0.3, 0, 3.4, x + 1.95, 0.14, 3.65, L(T.concrete, 1, 0xb0aca2)); // wheel stops
    // parked cars: day shift trickling in, a couple frosted over from the night
    const car = (x, z, ry, col, frost) => { const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = ry; scene.add(G);
      const body = C(col), dark = C(0x0b0c0e), glass = new THREE.MeshLambertMaterial({ color: frost ? 0xb9c6d2 : 0x1a2028, emissive: frost ? 0x20262c : 0x000000 }); glass.userData.s = 1;
      const B = (a, b, c, d, e, f, m) => box(a, b, c, d, e, f, m, { parent: G, solid: false, occ: false });
      B(-0.88, 0.32, -2.2, 0.88, 0.95, 2.2, body); B(-0.8, 0.95, -1.15, 0.8, 1.45, 0.95, glass); B(-0.82, 1.43, -1.0, 0.82, 1.5, 0.85, body);
      B(-0.9, 0.3, -2.25, 0.9, 0.45, -2.1, dark); B(-0.9, 0.3, 2.1, 0.9, 0.45, 2.25, dark);
      for (const sx of [-0.62, 0.62]) { B(sx - 0.17, 0.62, 2.19, sx + 0.17, 0.78, 2.22, glowMat(0x2a2620)); B(sx - 0.15, 0.62, -2.22, sx + 0.15, 0.76, -2.19, glowMat(0x3a0806)); }
      for (const [wx, wz] of [[-0.82, -1.35], [0.82, -1.35], [-0.82, 1.35], [0.82, 1.35]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), dark); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); G.add(w); }
      const c0 = Math.cos(ry), s0 = Math.sin(ry); const hx = Math.abs(c0) * 0.9 + Math.abs(s0) * 2.2, hz = Math.abs(s0) * 0.9 + Math.abs(c0) * 2.2; W.colliders.push({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz, y0: 0, y1: 1.5 }); return G; };
    car(22.3, 5.8, 0, 0x7a1e1a, true); car(27.5, 5.7, 0, 0x2a3a52, false); car(30.1, 5.8, 0.03, 0xb8b8b4, true); car(38.0, 5.8, 0, 0x2c2c2e, false);
    car(23.6, 26.6, Math.PI, 0x4a5a3a, true); car(34.0, 26.7, Math.PI, 0x8a8a90, true); car(41.8, 31.9, Math.PI + 0.04, 0x6a5040, false);
    W.anchors.chrisCar = new THREE.Vector3(43.3, 0, 5.8); car(43.3, 5.8, 0, 0x1e2a3a, false); // Chris's: no frost, still ticking
    // light poles (photocell sodium heads); they click off as the sun comes up
    W.lotLights = [];
    for (const [x, z] of [[19.6, 13.6], [32.0, 15.6], [44.5, 15.6], [32.0, 33.0]]) { cyl(x, 0, z, 0.1, 0.5, L(T.concrete, 1, 0x9a968c), { solid: true, r2: 0.14 }); cyl(x, 0.5, z, 0.06, 7.2, M.darkSteel);
      deco(x - 0.04, 7.55, z - 0.04, x + 0.9, 7.65, z + 0.04, M.darkSteel); const head = glowMat(0xffa654); deco(x + 0.55, 7.42, z - 0.18, x + 1.15, 7.56, z + 0.18, head);
      const v = light(x + 0.85, 7.2, z, 0xffa250, 5.5, { dist: 16, group: 'lot' }); v.fixtures.push(head); W.lotLights.push(v); }
    // the lot's edges: a low hedge, a chain-link fence, a dumpster corral, then trees; a utility line
    deco(lotX1, 0, 0, lotX1 + 0.8, 0.9, lotZ1, M.hedge); deco(lotX0 + 4, 0, lotZ1, lotX1, 0.9, lotZ1 + 0.8, M.hedge);
    W.colliders.push({ x0: lotX1, x1: lotX1 + 1, z0: -1, z1: lotZ1 + 1, y0: 0, y1: 3 }, { x0: lotX0 - 1, x1: lotX1 + 1, z0: lotZ1, z1: lotZ1 + 1, y0: 0, y1: 3 }, { x0: -6, x1: lotX0, z0: 12.1, z1: lotZ1 + 1, y0: 0, y1: 3, });
    const fence = new THREE.MeshLambertMaterial({ color: 0x8a9096, transparent: true, opacity: 0.35 }); fence.userData.s = 1; plane(lotX1 + 1.2, 1.0, lotZ1 / 2, lotZ1, 2.0, fence, Math.PI / 2);
    for (let z = 0; z <= lotZ1; z += 3) cyl(lotX1 + 1.2, 0, z, 0.03, 2.1, M.steel);
    solidDeco(17.2, 0, 31.5, 21.4, 1.8, 31.7, L(T.pine, 0.9, 0x6a5a48)); solidDeco(17.2, 0, 34.0, 21.4, 1.8, 34.2, L(T.pine, 0.9, 0x6a5a48)); solidDeco(17.0, 0, 31.5, 17.2, 1.8, 34.2, L(T.pine, 0.9, 0x6a5a48));
    solidDeco(18.0, 0, 32.1, 20.6, 1.4, 33.6, C(0x2a4a5a)); deco(17.9, 1.4, 32.0, 20.7, 1.5, 33.7, C(0x1a1a1c));
    const trunk = C(0x2a2018), pine = C(0x1c2e22), oak = C(0x3a3428);
    for (let i = 0; i < 46; i++) { const a = i / 46; let x, z; if (i % 3 === 0) { x = 95 + Math.random() * 35; z = -30 + Math.random() * 90; } else { x = lotX0 - 8 + Math.random() * (lotX1 - lotX0 + 24); z = lotZ1 + 3 + Math.random() * 16; }
      const h = 7 + Math.random() * 9; cyl(x, 0, z, 0.22, h * 0.45, trunk); if (Math.random() < 0.6) { const t = new THREE.Mesh(new THREE.ConeGeometry(1.6 + Math.random() * 1.3, h * 0.8, 8), pine); t.position.set(x, h * 0.55, z); scene.add(t); }
      else { for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 3 + Math.random() * 2, 4), oak); b.position.set(x + (Math.random() - 0.5) * 1.6, h * 0.55 + Math.random() * h * 0.3, z + (Math.random() - 0.5) * 1.6); b.rotation.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2); scene.add(b); } } } // bare winter oaks
    for (let x = 18; x < 60; x += 14) { cyl(x, 0, lotZ1 + 2.2, 0.12, 9, C(0x3a2c20)); deco(x - 1.2, 8.4, lotZ1 + 2.15, x + 1.2, 8.5, lotZ1 + 2.25, C(0x3a2c20)); }
    { const wire = new THREE.MeshBasicMaterial({ color: 0x15161a }); for (const y of [8.2, 8.45]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 42, 3), wire); w.rotation.z = Math.PI / 2; w.position.set(39, y, lotZ1 + 2.2); scene.add(w); } }
    // sodium light just over the lot door (on the dock circuit)
    light(17.3, 3.0, 10.3, 0xffa860, 2.6, { dist: 6, group: 'dock' }); const sod = glowMat(0xffb060); deco(17.1, 3.05, 10.15, 17.5, 3.15, 10.45, sod); W.vlights[W.vlights.length - 1].fixtures.push(sod); deco(16.1, 3.12, 10.27, 17.15, 3.17, 10.33, M.darkSteel); deco(16.1, 2.95, 10.2, 16.16, 3.3, 10.4, M.darkSteel); // wall arm
    W.anchors.lot = new THREE.Vector3(17.6, 0, 10.3);
    // 7 AM: cold gray daylight spilling in when the lot door opens (off until then)
    W.dawnSpill = light(17.6, 2.2, 10.3, 0xa8b4c8, 2.2, { dist: 7, on: false, group: 'dawn' });
    W.lotBlock = { x0: 16.05, x1: 16.5, z0: 9.75, z1: 10.85, y0: 0, y1: 2.3 }; W.colliders.push(W.lotBlock); // you never follow Clint out (the door is his, not yours) — lifted at 7 AM
    // ---- the dawn sky (hidden until the lot door opens for you): deep blue overhead, rose and orange low in the east (+x), a sun disc, a few lit clouds ----
    const D = W.dawn = new THREE.Group(); D.visible = false; scene.add(D); const C0 = new THREE.Vector3(33, 0, 18);
    { const R = 140, g = new THREE.SphereGeometry(R, 48, 24); const col = []; const p = g.attributes.position; const top = new THREE.Color(0x1d2c52), mid = new THREE.Color(0x5d6f9a), rose = new THREE.Color(0xd98a7a), amber = new THREE.Color(0xffb35a), low = new THREE.Color(0x8a6a78);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) / R, y = p.getY(i) / R, z = p.getZ(i) / R; const east = Math.max(0, x * 0.85 + 0.15 * (1 - Math.abs(z))); const e = Math.max(0, y);
        const c = top.clone().lerp(mid, Math.pow(1 - e, 2.2)); c.lerp(rose, Math.pow(1 - e, 6) * (0.35 + east * 0.65)); c.lerp(amber, Math.pow(1 - e, 14) * Math.pow(east, 2.2)); if (y < 0) c.copy(low).lerp(new THREE.Color(0x2a2a30), Math.min(1, -y * 4)); col.push(c.r, c.g, c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); sky.position.copy(C0); D.add(sky); }
    { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(0.16, 'rgba(255,226,160,1)'); gr.addColorStop(0.3, 'rgba(255,170,90,0.55)'); gr.addColorStop(1, 'rgba(255,120,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const sun = W.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false, transparent: true })); sun.scale.set(36, 36, 1); sun.position.set(C0.x + 125, 3, C0.z + 6); sun.renderOrder = -1; D.add(sun); }
    { const cm = new THREE.MeshBasicMaterial({ color: 0xe9a38a, fog: false, transparent: true, opacity: 0.85, depthWrite: false }); const cd = new THREE.MeshBasicMaterial({ color: 0x8a7290, fog: false, transparent: true, opacity: 0.7, depthWrite: false });
      for (let i = 0; i < 16; i++) { const a = (Math.random() - 0.5) * 2.2, e = 0.07 + Math.random() * 0.28; const r = 128; const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), i % 3 ? cm : cd);
        m.position.set(C0.x + Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, C0.z + Math.sin(a) * Math.cos(e) * r); m.scale.set(9 + Math.random() * 16, 1.2 + Math.random() * 1.5, 4 + Math.random() * 6); m.lookAt(C0.x, m.position.y, C0.z); m.renderOrder = -1; D.add(m); } }
    W.sunDir = new THREE.Vector3(1, 0.06, 0.05).normalize(); }
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

  // ---- Chris: engineering supervisor, day shift, in at 7 AM Christmas morning. Stylized, simple shapes, no likeness:
  //      tall and lean, short black hair, an open knit cardigan (oatmeal, ribbed, elbow patches) over a gray work shirt with a "Chris" patch,
  //      charcoal work pants, boots, a flashlight. Deep-set eyes under a heavy brow, a shadow of stubble. Faces +z locally. ----
  { const G = W.chris = new THREE.Group(); G.visible = false; scene.add(G);
    const knitTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#b39a74'; x.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 64; i += 4) { x.fillStyle = 'rgba(40,30,18,0.32)'; x.fillRect(i, 0, 1.4, 64); x.fillStyle = 'rgba(255,240,215,0.12)'; x.fillRect(i + 2, 0, 1, 64); }
      for (let j = 0; j < 64; j += 3) { x.fillStyle = 'rgba(30,22,12,0.10)'; x.fillRect(0, j, 64, 1); }
      const d = x.getImageData(0, 0, 64, 64); for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const knit = new THREE.MeshLambertMaterial({ map: knitTex, side: THREE.DoubleSide }), rib = C(0x8c7556), patchM = C(0x4a3424);
    const skin = C(0xc4977a), skinD = C(0xa87c62), hair = C(0x1c1917), shirt = C(0xa9b0b6), shirtD = C(0x8a9299), pants = C(0x34363a), boot = C(0x3a2618), belt = C(0x1a1410), sock = C(0x0a0a0c);
    const B = (x0, y0, z0, x1, y1, z1, m, p = G) => box(x0, y0, z0, x1, y1, z1, m, { parent: p, solid: false, occ: false });
    const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, p = G) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); p.add(o); return o; };
    const limb = (len, r0, r1, m, p, y0 = 0) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 10), m); c.position.y = y0 - len / 2; p.add(c); return c; };
    const openCyl = (rt, rb, h, gap, m, y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20, 1, true, gap / 2, Math.PI * 2 - gap), m); c.scale.z = 0.74; c.position.y = y; G.add(c); return c; };
    // legs: long (hip pivots at 1.02 for the walk)
    W.chrisLegs = [];
    for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * 0.105, 1.02, 0); G.add(hip); limb(0.96, 0.085, 0.07, pants, hip);
      B(-0.06, -1.02, -0.08, 0.06, -0.93, 0.2, boot, hip); B(-0.055, -0.95, -0.06, 0.055, -0.9, 0.06, sock, hip); W.chrisLegs.push(hip); }
    // the work shirt underneath (tucked in, belt), visible down the front and at the collar
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.165, 0.66, 16), shirt); sh.scale.z = 0.7; sh.position.y = 1.36; G.add(sh);
    const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.05, 16), belt); bl.scale.z = 0.72; bl.position.y = 1.03; G.add(bl); B(-0.03, 1.01, 0.115, 0.03, 1.05, 0.125, C(0x8a8a80));
    B(-0.009, 1.08, 0.118, 0.009, 1.62, 0.126, shirtD); for (let i = 0; i < 4; i++) sph(0.007, C(0xe8e8e0), 0, 1.2 + i * 0.1, 0.127);
    { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48; const x = cv.getContext('2d'); x.fillStyle = '#f2efe6'; x.beginPath(); x.ellipse(64, 24, 62, 22, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#1c3a7a'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#1c3a7a'; x.font = 'italic bold 26px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Chris', 64, 25);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const pm = W.chrisPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.034), new THREE.MeshLambertMaterial({ map: t, transparent: true })); pm.position.set(0.05, 1.5, 0.124); pm.rotation.y = 0.2; G.add(pm); }
    for (const sx of [-1, 1]) { const c = B(-0.05, -0.02, -0.01, 0.05, 0.02, 0.01, shirt); c.position.set(sx * 0.045, 1.675, 0.115); c.rotation.z = sx * 0.6; c.rotation.x = -0.35; } // collar points, over the cardigan's neckline
    // the cardigan: open down the front (wide V up top, narrower below), ribbed hem + button bands, patch pockets, long sleeves with elbow patches
    W.chrisCardigan = [openCyl(0.205, 0.198, 0.34, 1.05, knit, 1.5), openCyl(0.198, 0.19, 0.4, 0.42, knit, 1.13)];
    openCyl(0.193, 0.193, 0.06, 0.42, rib, 0.93);
    for (const sx of [-1, 1]) { for (const [y0, y1, a] of [[1.32, 1.66, 0.52], [0.9, 1.32, 0.21]]) { const xx = Math.sin(a) * 0.2 * sx, zz = Math.cos(a) * 0.2 * 0.74; B(xx - 0.016, y0, zz - 0.012, xx + 0.016, y1, zz + 0.012, rib); }
      if (sx < 0) for (let i = 0; i < 5; i++) { const a = i < 3 ? 0.21 : 0.52; sph(0.009, C(0x3a2a1a), -Math.sin(a) * 0.2, 0.99 + i * 0.12, Math.cos(a) * 0.148 + 0.014); }
      const pk = B(-0.055, -0.06, -0.008, 0.055, 0.06, 0.008, knit); pk.position.set(sx * 0.12, 1.06, 0.135); pk.rotation.y = sx * 0.55; }
    for (const sx of [-1, 1]) sph(0.07, knit, sx * 0.205, 1.635, 0, 1.05, 0.62, 0.95); // shoulders
    const arm = (sx) => { const S = new THREE.Group(); S.position.set(sx * 0.235, 1.63, 0); G.add(S); limb(0.33, 0.066, 0.058, knit, S);
      const E = new THREE.Group(); E.position.y = -0.33; S.add(E); limb(0.29, 0.056, 0.048, knit, E); limb(0.05, 0.05, 0.05, rib, E, -0.27);
      const ep = sph(0.04, patchM, 0, -0.02, -0.042, 1, 1.4, 0.45, E); // suede elbow patch
      const hand = sph(0.042, skin, 0, -0.35, 0.01, 0.85, 1.2, 0.8, E); return { S, E, hand }; };
    W.chrisArmL = arm(-1); W.chrisArmR = arm(1);
    // flashlight in his right hand (beam: a vlight driven by Story + a faint cone)
    { const fl = W.chrisFlash = new THREE.Group(); fl.position.set(0, -0.36, 0.02); fl.rotation.x = Math.PI; W.chrisArmR.E.add(fl);
      const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.2, 8), C(0x141416)); fl.add(bd); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.05, 10), C(0x1c1c20)); hd.position.y = 0.12; fl.add(hd);
      const lens = W.chrisLens = new THREE.Mesh(new THREE.CircleGeometry(0.025, 10), glowMat(0xfff2c8)); lens.position.y = 0.146; lens.rotation.x = -Math.PI / 2; fl.add(lens);
      const cone = W.chrisBeam = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      cone.position.y = 0.146 + 1.6; cone.rotation.x = Math.PI; fl.add(cone); }
    // neck + head: long face, short black hair (cropped, sideburns), heavy brow over deep-set eyes, a shadow of stubble
    limb(0.11, 0.055, 0.062, skin, G, 1.78);
    const H = W.chrisHead = new THREE.Group(); H.position.set(0, 1.77, 0.01); G.add(H);
    sph(0.105, skin, 0, 0.11, 0, 0.9, 1.16, 0.98, H);
    const stub = new THREE.Mesh(new THREE.SphereGeometry(0.107, 14, 10, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.3), new THREE.MeshLambertMaterial({ color: 0x3a2e2a, transparent: true, opacity: 0.32 })); stub.scale.set(0.91, 1.16, 0.99); stub.position.y = 0.11; H.add(stub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.27), hair); cap.scale.set(0.9 * 1.09, 1.16 * 1.13, 0.98 * 1.08); cap.position.set(0, 0.104, -0.004); H.add(cap); // cropped top, hairline well above the brows
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.108, 16, 10, Math.PI * 0.9, Math.PI * 1.2, Math.PI * 0.22, Math.PI * 0.43), hair); back.scale.set(0.93, 1.1, 1.0); back.position.y = 0.115; H.add(back); // back + sides, short
    for (const sx of [-1, 1]) { B(-0.008, -0.03, -0.014, 0.008, 0.03, 0.014, hair, H).position.set(sx * 0.093, 0.105, 0.03); // sideburns
      sph(0.024, skin, sx * 0.098, 0.1, -0.004, 0.5, 1, 0.85, H); // ears
      const s = sph(0.022, C(0x8a5e48), sx * 0.036, 0.135, 0.083, 1.2, 0.7, 0.6, H); // deep-set eye socket shadow
      sph(0.011, C(0x0c0a0a), sx * 0.036, 0.134, 0.093, 1, 0.9, 0.6, H);
      const br = B(-0.03, -0.007, -0.01, 0.03, 0.007, 0.01, hair, H); br.position.set(sx * 0.038, 0.155, 0.097); br.rotation.z = sx * -0.12; } // heavy, level brows
    B(-0.06, 0.145, 0.08, 0.06, 0.161, 0.1, skinD, H); // brow ridge
    sph(0.02, skinD, 0, 0.105, 0.102, 0.8, 1.4, 1.0, H); B(-0.026, 0.055, 0.094, 0.026, 0.061, 0.1, C(0x6a4a3e), H); // nose, mouth (flat, tired)
    W.anchors.chrisHead = new THREE.Vector3(); W.chrisPick = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.0, 0.5), new THREE.MeshBasicMaterial({ visible: false })); W.chrisPick.position.y = 1.0; G.add(W.chrisPick);
    W.chrisCol = { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 2.0, disabled: true }; W.colliders.push(W.chrisCol);
    W.chrisLight = light(0, -50, 0, 0xfff0d0, 3.2, { dist: 7, on: false, group: 'chris' }); W.chrisLight.fixtures.push(W.chrisLens.material);
    W.placeChris = (x, z, ry) => { G.position.set(x, G.position.y, z); G.rotation.y = ry; G.updateMatrixWorld(true); W.chrisHead.getWorldPosition(W.anchors.chrisHead); W.anchors.chrisHead.y += 0.1;
      Object.assign(W.chrisCol, { x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 }); };
    W.placeChris(18.6, 10.3, -Math.PI / 2); }

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
  const hallMark = childMark();
  room({ x0: -6, z0: -33, x1: 34, z1: -30, h: 2.8, floor: M.carpetHall, ceil: M.white, wall: M.cream, wains: M.wains, crown: true, open: { s: [[0.3, 2.7, 2.4], [8.6, 9.8, 2.2], [14.5, 17.5, 2.4]], e: [[-32.1, -30.9, 2.3]], n: [[23.52, 24.48, 2.2]] }, surface: 'carpet' });
  W.doors.terraceDoor = door(33.95, -31.5, 'z', 1.2, { swing: -1, mat: M.glass, name: 'terraceMcLean', breakable: true });
  for (const x of [-3, 1, 5, 12, 20, 28, 31.5]) fakeDoor(x, -32.9, 'n', 100 + Math.round((x + 6) / 4) * 2 + 1);
  for (const x of [12, 21, 25, 29]) fakeDoor(x, -30.1, 's', 100 + Math.round((x + 6) / 4) * 2); // west end of the south wall opens into the lobby (below)
  // dimmer, patchier pools (same positions/reach, so the blackout chase reads exactly as before); the north sconce at x=18 is a dead bulb
  for (const x of [-1, 8, 18, 26]) { const v = light(x + 1, 2.0, -31.5, 0xffc98a, 1.3, { dist: 8, group: 'mclean' }); if (x === 18) { const dead = sconce(x, 1.9, -32.9, 'n', null); dead.color.set(0x3a3428); dead.userData.base.set(0x3a3428); } else sconce(x, 1.9, -32.9, 'n', v); sconce(x === -1 ? -1 : x + 2, 1.9, -30.1, 's', v); }
  picture(3, 1.6, -32.9, 'n', 0.8, 0.6, 30); picture(23, 1.6, -30.1, 's', 0.8, 0.6, 190); picture(16, 1.6, -32.9, 'n', 1.0, 0.7, 100);
  label(-5.85, 2.35, -31.5, 0.5, 0.18, ['EXIT'], { w: 128, h: 48, size: 34, bg: '#300', fg: '#ff3b2b', bold: true, glow: 1.5 }, Math.PI / 2);
  windowOn(-5.88, 1.5, -31.5, 'w', 1.0, 1.5, M.navy);
  solidDeco(14.8, 0, -32.9, 16.4, 0.8, -32.45, M.mahogany); // console
  label(16, 2.6, -30.12, 0.8, 0.2, ['GUEST PANTRY'], { w: 256, h: 64, size: 30, bg: '#2a2a2a', fg: '#e0d6c0' }, Math.PI);
  label(32.5, 1.7, -30.12, 1.0, 0.25, ['TERRACE · DuBOSE HOME →'], { w: 384, h: 96, size: 30, bg: '#1c2a4a', fg: '#e8e0c8' }, Math.PI);
  // ---- gfx pass: grimy McLean. Unique worn carpet + stained drop ceiling, scuffed paint mapped in world space, dingy trim ----
  { const hc = HALL_CEIL;
    for (const m of childrenFrom(hallMark)) {
      if (m.material === M.carpetHall) { m.material = GM.hallCarpet; planarUV(m, (x, y, z) => [(x + 6) / 40, (z + 33) / 3]); }
      else if (m.material === M.white && m.position.y > 2.5) { m.material = GM.hallCeil; planarUV(m, (x, y, z) => [(x + 6) / 40, (z + 33) / 3]); }
      else if (m.material === M.cream) { m.material = GM.hallWall; planarUV(m, (x, y, z, ax) => [(ax === 'x' ? z : x) / 9.6, (y - 1.0) / 1.8]); }
      else if (m.material === M.wains) { m.material = GM.hallWains; planarUV(m, (x, y, z, ax) => [(ax === 'x' ? z : x) / 9.6, y / 0.95]); }
      else if (m.material === M.trim) { m.material = GM.trim; }
    }
    // the sagging, soaked tile hanging out of its slot
    const [si, sj] = hc.sag; const sx = -6 + si * hc.tile, sz = -30 - (sj + 1) * hc.tile; const sag = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.58), GM.sagTile); sag.geometry.translate(0.29, 0, 0); sag.position.set(sx + 0.01, 2.79, sz + 0.3); sag.rotation.z = -0.5; scene.add(sag); }
  const HB = new Batch(scene), HD = new Decals(scene, GT.decals), HP = new Decals(scene, GT.decals); HP.mat = puddleMat;
  { const hb = (x0, y0, z0, x1, y1, z1, mat) => HB.add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    const hm = (geo, mat, pos, rot = [0, 0, 0]) => HB.add(geo, mat, new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
    // housekeeping cart against the north wall between 127 and 129: shelves, linen, a vinyl bag, a trash bag, spray bottles
    { const x0 = 29.0, x1 = 30.6, z0 = -32.88, z1 = -32.32; hb(x0, 0.12, z0, x0 + 0.04, 1.1, z1, GM.cartGray); hb(x1 - 0.04, 0.12, z0, x1, 1.1, z1, GM.cartGray); for (const y of [0.12, 0.55, 1.05]) hb(x0, y, z0, x1, y + 0.05, z1, GM.cartGray);
      for (let k = 0; k < 8; k++) hm(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), GM.towel, [x0 + 0.25 + (k % 4) * 0.16, 1.16 + Math.floor(k / 4) * 0.11, -32.6], [0, 0, Math.PI / 2]); // rolled towels
      for (let k = 0; k < 3; k++) hb(x0 + 0.1 + k * 0.42, 0.6, z0 + 0.06, x0 + 0.48 + k * 0.42, 0.82, z1 - 0.06, k === 1 ? C(0xd8d4c8) : GM.towel);
      hb(x0 - 0.42, 0.25, z0 + 0.04, x0, 1.05, z1 - 0.02, GM.vinyl); hm(new THREE.SphereGeometry(0.26, 8, 6), GM.trashBag, [x1 + 0.18, 0.55, -32.6], [0, 0, 0]); hm(new THREE.CylinderGeometry(0.21, 0.16, 0.5, 8), GM.trashBag, [x1 + 0.18, 0.3, -32.6]);
      for (let k = 0; k < 3; k++) { hm(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), [C(0x3a7ac8), C(0xe8e0c8), C(0x5ab05a)][k], [x0 + 0.3 + k * 0.1, 1.42, -32.45]); }
      for (const [a, b] of [[x0 + 0.05, z0 + 0.05], [x1 - 0.05, z0 + 0.05], [x0 + 0.05, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]) hm(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), GM.rubber, [a, 0.05, b], [Math.PI / 2, 0, 0]);
      W.colliders.push({ x0: x0 - 0.45, x1: x1 + 0.45, z0: -32.95, z1: -32.3, y0: 0, y1: 1.2 }); HD.add(29.8, 0.003, -32.55, 'up', 2.6, 0.9, 13); }
    // wet-floor A-frame by the guest pantry
    { const c = document.createElement('canvas'); c.width = 64; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#e0b21e'; g.fillRect(0, 0, 64, 96); g.fillStyle = '#111'; g.font = 'bold 11px Arial'; g.textAlign = 'center'; g.fillText('CAUTION', 32, 20); g.fillText('WET', 32, 70); g.fillText('FLOOR', 32, 83);
      g.beginPath(); g.moveTo(32, 28); g.lineTo(50, 58); g.lineTo(14, 58); g.closePath(); g.lineWidth = 2; g.stroke(); g.fillRect(30, 36, 4, 12); g.fillRect(30, 51, 4, 3);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,50,20,${Math.random() * 0.25})`; g.fillRect(Math.random() * 64, Math.random() * 96, 1, 1); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; const sm = new THREE.MeshLambertMaterial({ map: t });
      for (const sgn of [-1, 1]) { const g2 = new THREE.BoxGeometry(0.3, 0.62, 0.012); hm(g2, sm, [13.75, 0.3, -30.55 + sgn * 0.09], [sgn * 0.28, 0.3, 0]); } HD.add(13.75, 0.003, -30.55, 'up', 0.6, 0.6, 13); }
    // extension cord from the south wall outlet, across the carpet, to an upright vacuum someone left
    { hb(5.12, 0.28, -30.11, 5.2, 0.4, -30.09, C(0xe8e4d8)); const pts = [[5.16, -30.12], [5.3, -30.4], [5.1, -30.9], [5.6, -31.4], [6.0, -31.6], [5.8, -32.1], [6.3, -32.4], [6.55, -32.5]];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx2, bz] = pts[i + 1]; const L2 = Math.hypot(bx2 - ax, bz - az); hm(new THREE.BoxGeometry(L2 + 0.02, 0.012, 0.014), GM.cord, [(ax + bx2) / 2, 0.006, (az + bz) / 2], [0, -Math.atan2(bz - az, bx2 - ax), 0]); }
      hm(new THREE.BoxGeometry(0.3, 0.12, 0.3), C(0x6a2a2a), [6.65, 0.08, -32.55]); hm(new THREE.CylinderGeometry(0.09, 0.08, 0.62, 8), C(0x8a8a86), [6.66, 0.5, -32.62], [-0.12, 0, 0]); hm(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), GM.chrome, [6.66, 1.05, -32.68], [-0.12, 0, 0]); hm(new THREE.BoxGeometry(0.22, 0.03, 0.03), GM.rubber, [6.66, 1.3, -32.71]); HD.add(6.65, 0.003, -32.55, 'up', 0.6, 0.5, 13); }
    // room-service tray left outside 107
    { hm(new THREE.BoxGeometry(0.46, 0.02, 0.34), C(0x2a2522), [12.5, 0.01, -32.55], [0, 0.2, 0]); hm(new THREE.CylinderGeometry(0.11, 0.1, 0.015, 12), GM.towel, [12.42, 0.028, -32.55]); hm(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), GM.chrome, [12.42, 0.035, -32.55]);
      hm(new THREE.CylinderGeometry(0.03, 0.025, 0.1, 8), C(0xc8d0d4), [12.64, 0.07, -32.48]); hm(new THREE.BoxGeometry(0.1, 0.005, 0.14), GM.towel, [12.62, 0.025, -32.65], [0, 0.6, 0]); HD.add(12.5, 0.003, -32.55, 'up', 0.7, 0.6, 13); } }
  // decals: contact shadows at every wall base / under the crown, leak streaks under the stained tiles, scuffs, hand smudges on the doors, mildew in the corners
  { const off = 0.022; const wb = (x0, z0, x1, z1, face) => { const d = { n: [0, off], s: [0, -off], e: [-off, 0], w: [off, 0] }[face]; HD.wallBase(x0 + d[0], z0 + d[1], x1 + d[0], z1 + d[1], face, 0, 0.3, 0.32); };
    for (const [a, b] of [[-5.9, 23.4], [24.6, 33.9]]) { wb(a, -32.9, b, -32.9, 'n'); HD.wallTop(a, -32.9, b, -32.9, 'n', 2.68, 0.35); }
    for (const [a, b] of [[-5.9, 0.18], [2.82, 8.48], [9.92, 14.38], [17.62, 33.9]]) { wb(a, -30.1, b, -30.1, 's'); HD.wallTop(a, -30.1, b, -30.1, 's', 2.68, 0.35); }
    wb(-5.9, -32.9, -5.9, -30.1, 'w'); HD.wallTop(-5.9, -32.9, -5.9, -30.1, 'w', 2.68, 0.35); for (const [a, b] of [[-32.9, -32.22], [-30.78, -30.1]]) { wb(33.9, a, 33.9, b, 'e'); HD.wallTop(33.9, a, 33.9, b, 'e', 2.68, 0.35); }
    const hc = HALL_CEIL; for (const [i, j] of hc.leak) { const x = -6 + (i + 0.5) * hc.tile; if (j === 0) HD.add(x, 2.3, -30.1, 's', 0.6, 0.75, 1); if (j === 4) HD.add(x, 2.3, -32.9, 'n', 0.6, 0.75, 1); }
    HD.add(5.34, 2.25, -30.1, 's', 1.4, 0.85, 15); HP.add(5.34, 0.004, -30.55, 'up', 1.2, 0.8, 11, 0.4); HD.add(5.34, 2.79, -30.9, 'down', 1.8, 1.4, 15);
    for (const [x, face] of [[-4.2, 'n'], [2.4, 'n'], [7.6, 'n'], [10.5, 's'], [13.4, 'n'], [19.3, 's'], [22.4, 'n'], [26.6, 's'], [30.0, 'n'], [32.6, 'n']]) { const z = face === 'n' ? -32.9 : -30.1; HD.add(x, 1.18, z, face, 1.1, 0.3, 2); HD.add(x + 0.7, 0.32, z + (face === 'n' ? off : -off), face, 0.9, 0.3, 2); }
    for (const x of [-3, 1, 5, 12, 20, 28, 31.5]) HD.add(x + 0.36, 1.05, -32.9 + 0.024, 'n', 0.32, 0.4, 3); for (const x of [12, 21, 25, 29]) HD.add(x + 0.36, 1.05, -30.1 - 0.024, 's', 0.32, 0.4, 3, 0, true);
    HD.add(-5.9, 2.45, -32.6, 'w', 0.7, 0.7, 4, Math.PI / 2); HD.add(-5.9, 2.45, -30.4, 'w', 0.7, 0.7, 4, Math.PI); HD.add(33.9, 2.45, -32.6, 'e', 0.6, 0.6, 4, -Math.PI / 2);
    HD.add(18.9, 0.004, -31.1, 'up', 0.22, 0.28, 14, 1.1); HD.add(27.2, 0.004, -30.8, 'up', 0.7, 0.7, 5, 0.3); HD.add(-2.1, 0.004, -31.8, 'up', 0.8, 0.6, 5, 1.8); }
  W.hallDecals = [HD.flush(), HP.flush()]; W.hallBatched = HB.flush({ name: 'hallClutter' });

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
  for (const [x, z] of [[38, -26], [44, -37]]) { cyl(x, 0, z, 0.06, 3, M.black, { solid: true }); const v = light(x, 3.1, z, 0xffcf8a, 3.2, { dist: 12, group: 'terrace' }); lantern(x, 3.3, z, v, 1.3, null); cyl(x, 2.95, z, 0.1, 0.12, M.black); } // lantern sits on the post (no chain into the sky)
  // pergola/colonnade along the south side (curved terrace hint)
  for (let i = 0; i < 5; i++) { const x = 36 + i * 2.8; cyl(x, 0, -26.2, 0.14, 3.2, M.trim, { solid: true }); } deco(35.6, 3.2, -26.5, 47.6, 3.4, -25.9, M.trim);
  // benches / planters
  solidDeco(39.5, 0, -36.8, 41.5, 0.45, -36.3, M.wood); cyl(42.8, 0, -29, 0.45, 0.6, M.brick, { solid: true }); deco(42.4, 0.6, -29.4, 43.2, 1.1, -28.6, M.hedge);
  // sky + trees + distant campus glow
  { // (the terrace's own sky dome + 120 star meshes were replaced by the shared camera-following night sky in gfx.js: same moon over the dock and the terrace)
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
  { const v = light(71.5, DY + 4.4, -32, 0xffd090, 3.5, { dist: 14, group: 'dubose' }); lantern(71.5, DY + 4.4, -32, v, 2.2, DY + 7);
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
    const gms = cols.map(c => glowMat(c)); tl.fixtures.push(...gms); for (let i = 0; i < 26; i++) { const h = 0.4 + (i / 26) * 1.7, a = i * 2.39; const r = rAt(h) + 0.02; const b = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), gms[i % 4]); b.position.set(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r); scene.add(b); }
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
    const gms = cols.map(c => glowMat(c)); tl.fixtures.push(...gms); for (let i = 0; i < 28; i++) { const h = 0.4 + (i / 28) * 1.8, a = i * 2.39; const r = rAt(h) + 0.02; const b = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), gms[i % 4]); b.position.set(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r); scene.add(b); }
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

  // =====================================================================
  // NIGHT TWO ADDITIONS (present in both nights; only night two uses them): Lady DuBose's portrait over the library fireplace,
  // a toilet + shower in the Room 117 bath, a plunger in the shop, a cable box in the DuBose Suite, and MECH 1, the boiler room off the dock.
  // =====================================================================
  { // ---- the portrait: original procedural oil painting (portrait.js), gilt frame, a little brass picture light ----
    const P = W.portrait = makePortrait(); const x = 50.22, y = DY + 2.17, z = -36.5;
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshLambertMaterial({ map: P.tex })); pm.position.set(x, y, z); pm.rotation.y = Math.PI / 2; scene.add(pm); P.mesh = pm;
    const gilt = C(0x8a6a2a), giltD = C(0x4a3614);
    for (const [y0, y1, z0, z1] of [[y + 0.5, y + 0.6, z - 0.5, z + 0.5], [y - 0.6, y - 0.5, z - 0.5, z + 0.5], [y - 0.6, y + 0.6, z - 0.5, z - 0.4], [y - 0.6, y + 0.6, z + 0.4, z + 0.5]]) { deco(50.12, y0, z0, 50.25, y1, z1, gilt); deco(50.2, y0 + 0.02, z0 + 0.02, 50.27, y1 - 0.02, z1 - 0.02, giltD); }
    deco(50.12, y - 0.52, z - 0.42, 50.16, y + 0.52, z + 0.42, giltD); // backing over the old mirror
    const v = W.portraitLight = light(50.5, y + 0.66, z, 0xffd8a0, 0.7, { dist: 2.6, group: 'portrait' }); const pg = glowMat(0xffe6b8);
    deco(50.12, y + 0.64, z - 0.03, 50.4, y + 0.67, z + 0.03, M.brass); deco(50.34, y + 0.6, z - 0.28, 50.44, y + 0.66, z + 0.28, M.brass); deco(50.35, y + 0.595, z - 0.26, 50.43, y + 0.6, z + 0.26, pg); v.fixtures.push(pg);
    label(50.2, y - 0.68, z, 0.3, 0.06, ['LADY DuBOSE'], { w: 128, h: 26, size: 15, bg: '#6a5220', fg: '#1a1408', bold: true, font: 'Georgia, serif' }, Math.PI / 2);
    W.anchors.portrait = new THREE.Vector3(x, y, z); }
  { // ---- Room 117 bath: toilet on the north wall, shower over the tub ----
    const x = 25.45, z = -33.35; const wm = C(0xeeece4);
    solidDeco(x - 0.2, 0.42, -33.3, x + 0.2, 0.82, -33.12, wm); deco(x - 0.22, 0.82, -33.32, x + 0.22, 0.86, -33.1, wm); deco(x + 0.12, 0.74, -33.33, x + 0.18, 0.76, -33.3, GM.chrome); // tank, lid, flush lever
    const bowl = cyl(x, 0, -33.62, 0.15, 0.4, wm, { r2: 0.2 }); bowl.scale.z = 1.3; cyl(x, 0.4, -33.62, 0.2, 0.03, wm).scale.z = 1.3;
    W.toiletWater = new THREE.Mesh(new THREE.CircleGeometry(0.15, 14), new THREE.MeshLambertMaterial({ color: 0x5a4a2a })); W.toiletWater.rotation.x = -Math.PI / 2; W.toiletWater.scale.y = 1.3; W.toiletWater.position.set(x, 0.37, -33.62); scene.add(W.toiletWater);
    W.toiletPlunger = new THREE.Group(); { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 6), GM.pwood); st.position.y = 0.48; const cup = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), C(0x8a1c14)); cup.position.y = 0.08; W.toiletPlunger.add(st, cup); }
    W.toiletPlunger.position.set(x, 0.3, -33.62); W.toiletPlunger.visible = false; scene.add(W.toiletPlunger);
    W.toiletMesh = deco(x - 0.3, 0, -33.95, x + 0.3, 0.9, -33.1, new THREE.MeshBasicMaterial({ visible: false })); W.colliders.push({ x0: x - 0.22, x1: x + 0.22, z0: -33.85, z1: -33.1, y0: 0, y1: 0.85 });
    W.anchors.toilet = new THREE.Vector3(x, 0.5, -33.6);
    // shower: riser + head on the south wall over the tub, mixing valve, a curtain on a rod
    deco(25.32, 0.6, -35.6, 25.36, 1.95, -35.56, GM.chrome); deco(25.3, 1.9, -35.6, 25.38, 1.94, -35.42, GM.chrome); cyl(25.34, 1.86, -35.42, 0.05, 0.05, GM.chrome, { r2: 0.03 });
    cyl(25.75, 1.05, -35.58, 0.06, 0.02, GM.chrome).rotation.x = Math.PI / 2; deco(25.73, 1.04, -35.56, 25.77, 1.06, -35.48, GM.chrome); // valve handle
    deco(25.05, 2.0, -34.97, 26.48, 2.02, -34.95, GM.chrome); const cur = deco(25.6, 0.6, -34.965, 26.45, 1.99, -34.955, C(0xd8dce0)); cur.userData.curtain = true;
    W.showerMesh = deco(25.1, 0.4, -35.55, 26.45, 2.0, -34.95, new THREE.MeshBasicMaterial({ visible: false })); W.anchors.shower = new THREE.Vector3(25.4, 1.6, -35.3); }
  { // ---- shop: a plunger leaning in the SW corner by the wet vac ----
    const G = W.plungerMesh = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 6), GM.pwood); st.position.set(0, 0.5, 0); const cup = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), C(0x8a1c14)); cup.position.y = 0.06;
    G.add(st, cup); G.position.set(1.08, 0, -0.22); G.rotation.z = 0.12; scene.add(G); W.plungerPick = deco(0.9, 0, -0.42, 1.3, 1.0, -0.1, new THREE.MeshBasicMaterial({ visible: false })); }
  { // ---- DuBose Suite: cable box in front of the TV (input + coax at the back) ----
    const y = DY + 1.0; solidDeco(66.38, y, -46.02, 66.6, y + 0.055, -45.62, C(0x161616), { solid: false }); W.cableLed = glowMat(0x30ff60); deco(66.6, y + 0.02, -45.7, 66.605, y + 0.03, -45.66, W.cableLed);
    W.cableMesh = deco(66.32, y - 0.05, -46.1, 66.68, y + 0.2, -45.5, new THREE.MeshBasicMaterial({ visible: false })); }
  { // ---- MECH 1: the boiler room, west of the dock (door in the dock's west wall). Grimy, one caged bulb, a firetube boiler, the water heater ----
    room({ x0: -6.8, z0: 6, x1: 0, z1: 12, h: 3.4, floor: M.concrete, ceil: M.concrete, wall: M.blockTan, base: M.hazard, skip: ['e'], surface: 'concrete' });
    W.doors.boilerDoor = door(0.0, 10.9, 'z', 1.0, { swing: -1, mat: L(T.rollup, 1, 0x5a5f62), locked: true, name: 'boiler', lockedMsg: 'MECH 1 · Boiler room. Nothing on your list in there.' });
    label(0.14, 2.45, 10.9, 0.5, 0.18, ['MECH 1 · BOILER'], { w: 192, h: 64, size: 20, bg: '#c9a11e', fg: '#111', bold: true }, Math.PI / 2);
    label(-0.12, 2.45, 10.9, 0.45, 0.16, ['NO OPEN FLAME'], { w: 192, h: 64, size: 20, bg: '#8a1c14', fg: '#eee', bold: true }, -Math.PI / 2);
    const jacket = L(GT.drum, 0.9, 0x7a2a1e), steelM = GM.steelD, pipeM = C(0x4a4e50), insul = C(0xb8b0a0), redV = C(0x9a1c14);
    // the boiler: a horizontal firetube shell on saddles, burner on the east end, flue up through the ceiling
    { const sh = cyl(-3.6, 0, 7.1, 0.85, 3.4, jacket, { seg: 16 }); sh.rotation.z = Math.PI / 2; sh.position.set(-3.6, 1.15, 7.1);
      for (const x of [-4.8, -2.4]) solidDeco(x - 0.15, 0, 6.4, x + 0.15, 0.5, 7.8, steelM);
      for (const x of [-5.3, -1.9]) { const r = cyl(x, 1.15, 7.1, 0.87, 0.06, steelM, { seg: 16 }); r.rotation.z = Math.PI / 2; r.position.set(x, 1.15, 7.1); }
      cyl(-4.6, 2.0, 7.1, 0.2, 1.4, pipeM); cyl(-4.6, 2.0, 7.1, 0.24, 0.08, steelM); // flue
      solidDeco(-1.9, 0.45, 6.65, -1.3, 1.55, 7.55, C(0x2a3a4a)); deco(-1.32, 0.6, 6.75, -1.29, 1.45, 7.45, C(0x1a2630)); // burner housing
      W.burnerGlow = glowMat(0x2a0800); deco(-1.29, 0.85, 7.0, -1.28, 0.95, 7.1, W.burnerGlow); // peephole
      W.lwcoLamp = glowMat(0xff2010); deco(-1.29, 1.3, 7.25, -1.28, 1.36, 7.31, W.lwcoLamp); W.readyLamp = glowMat(0x082008); deco(-1.29, 1.3, 7.36, -1.28, 1.36, 7.42, W.readyLamp);
      label(-1.285, 1.4, 7.33, 0.24, 0.05, ['LWCO  ·  READY'], { w: 128, h: 26, size: 12, bg: '#ccc', fg: '#111', bold: true }, Math.PI / 2);
      W.resetBtn = cyl(-1.27, 1.12, 7.32, 0.025, 0.02, C(0xc02010)); W.resetBtn.rotation.z = Math.PI / 2; W.resetBtn.position.set(-1.27, 1.12, 7.32);
      label(-1.285, 1.06, 7.33, 0.12, 0.035, ['RESET'], { w: 64, h: 18, size: 12, bg: '#111', fg: '#ddd', bold: true }, Math.PI / 2);
      for (const [zz, yy] of [[6.85, 1.25], [7.05, 1.25]]) { const g = cyl(-1.27, yy, zz, 0.06, 0.02, C(0xe8e4d8), { seg: 14 }); g.rotation.z = Math.PI / 2; g.position.set(-1.27, yy, zz); deco(-1.26, yy - 0.002, zz - 0.04, -1.258, yy + 0.002, zz + 0.01, M.black); } // pressure + temp gauges
      // gauge glass (sight glass) on the shell's east end: water level shows LOW until the feedwater is open
      deco(-1.86, 0.9, 7.88, -1.83, 1.6, 7.92, GM.chrome); const glass = deco(-1.84, 1.0, 7.86, -1.79, 1.5, 7.94, new THREE.MeshLambertMaterial({ color: 0x9ab0b8, transparent: true, opacity: 0.35 }));
      W.sightWater = deco(-1.835, 1.0, 7.87, -1.795, 1.5, 7.93, C(0x2a5a6a)); W.sightWater.scale.y = 0.12; W.sightWater.position.y = 1.0 + 0.5 * 0.06;
      W.colliders.push({ x0: -5.45, x1: -1.25, z0: 6.15, z1: 8.05, y0: 0, y1: 2.2 });
      W.boilerMesh = deco(-1.6, 0.4, 6.6, -1.1, 1.7, 7.6, new THREE.MeshBasicMaterial({ visible: false })); }
    // feedwater line with a red handwheel, a makeup-water meter, pipes up the wall and across the ceiling
    { cyl(-1.0, 0, 8.6, 0.05, 3.4, pipeM); cyl(-1.0, 0.3, 8.6, 0.07, 0.25, steelM); W.valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 14), redV); W.valveWheel.position.set(-0.86, 1.25, 8.6); W.valveWheel.rotation.y = Math.PI / 2; scene.add(W.valveWheel);
      deco(-0.95, 1.22, 8.57, -0.86, 1.28, 8.63, steelM); deco(-1.02, 1.6, 8.0, -0.98, 1.64, 8.6, pipeM); deco(-1.85, 1.6, 7.96, -0.98, 1.64, 8.0, pipeM);
      W.valveMesh = deco(-1.15, 0.9, 8.3, -0.6, 1.6, 8.9, new THREE.MeshBasicMaterial({ visible: false })); W.colliders.push({ x0: -1.1, x1: -0.9, z0: 8.5, z1: 8.7, y0: 0, y1: 3 });
      for (const [z, r] of [[6.4, 0.07], [6.7, 0.05], [11.6, 0.06]]) { const p = cyl(-3.4, 3.1, z, r, 6.6, z > 11 ? insul : pipeM); p.rotation.z = Math.PI / 2; p.position.set(-3.4, 3.1 - (z > 11 ? 0.15 : 0), z); }
      for (const x of [-6.0, -2.0, 0.0]) deco(x - 0.02, 3.15, 6.3, x + 0.02, 3.4, 6.8, steelM); }
    // water heater (the guest-room domestic hot water) in the NW corner, an expansion tank, two circulator pumps, a floor drain
    { cyl(-6.15, 0, 11.35, 0.36, 1.7, C(0x8a8e88), { solid: true, seg: 14 }); cyl(-6.15, 1.7, 11.35, 0.3, 0.08, C(0x6a6e68)); cyl(-6.0, 1.78, 11.2, 0.04, 1.5, pipeM); cyl(-6.3, 1.78, 11.5, 0.04, 1.5, insul);
      label(-5.78, 1.1, 11.35, 0.22, 0.3, ['DHW-1', '119 GAL', 'SET 140°F'], { w: 96, h: 128, size: 14, bg: '#e8e4d0', fg: '#222', bold: true }, Math.PI / 2);
      const ex = cyl(-5.2, 2.4, 11.6, 0.2, 0.6, C(0x9aa0a3)); ex.rotation.x = Math.PI / 2; ex.position.set(-5.2, 2.6, 11.6);
      for (const z of [9.4, 10.2]) { cyl(-6.55, 0.9, z, 0.1, 0.22, C(0x2a5a8a)); cyl(-6.55, 1.12, z, 0.03, 2.2, pipeM); }
      cyl(-3.2, 0.001, 9.6, 0.12, 0.01, M.darkSteel); solidDeco(-6.75, 0, 8.8, -6.4, 1.4, 9.0, steelM, { solid: false }); }
    // shelving with filters, chemical pails, a mop sink; one caged bulb on a cord
    { solidDeco(-3.0, 0, 11.55, -1.2, 1.9, 11.95, steelM); for (let s = 0; s < 4; s++) deco(-2.98, 0.15 + s * 0.55, 11.56, -1.22, 0.19 + s * 0.55, 11.94, steelM);
      for (const [x, y, c] of [[-2.7, 0.19, 0x2a5a8a], [-2.3, 0.19, 0xc9a11e], [-1.8, 0.74, 0xd8d4c8], [-2.6, 1.29, 0x5a5a5a], [-1.6, 0.19, 0x2a5a8a]]) cyl(x, y, 11.75, 0.13, 0.32, C(c));
      solidDeco(-5.2, 0, 11.4, -4.4, 0.35, 11.95, C(0x8a8a84)); 
      const v = W.boilerBulb = light(-3.3, 2.75, 9.6, 0xffc890, 2.6, { dist: 9, group: 'boiler', flicker: 0.04 }); const bg = glowMat(0xffd8a0); W.boilerBulbMat = bg;
      deco(-3.31, 2.95, 9.59, -3.29, 3.4, 9.61, M.black); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), bg); bulb.position.set(-3.3, 2.88, 9.6); scene.add(bulb); v.fixtures.push(bg);
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true })); cage.position.set(-3.3, 2.88, 9.6); scene.add(cage);
      W.burnerLight = light(-0.9, 0.9, 7.1, 0xff7a20, 0, { dist: 4, group: 'boilerFire', on: false });
      W.anchors.boiler = new THREE.Vector3(-1.4, 1.0, 7.1); W.anchors.boilerRoom = new THREE.Vector3(-3.4, 1.5, 9.5); }
  }
  // ---------- gfx pass: merge static, unreferenced meshes in the dock + McLean hall (draw calls) ----------
  // ---------- gfx pass 2: grimy world-mapped materials everywhere else, auto decals in every other room, clutter, then batch ----------
  W.gfx2 = { regrimed: regrime(scene, W, T) };
  W.gfx2.decals = roomDecals(scene, W, W.rooms, r => (r.x0 === 0 && r.z0 === 0 && r.x1 === 16) || (r.x0 === -6 && r.z0 === -33 && r.x1 === 34));
  W.gfx2.clutter = clutter2(scene, W, { L, C, GM, GT, puddleMat });
  W.gfx2.flattened = flattenGroups(scene, W);
  W.gfxMerge = [mergeStatic(scene, W, { x0: -0.5, x1: 16.5, z0: -0.5, z1: 12.6, y0: -1, y1: 8 }, { name: 'dockStatic' }), mergeStatic(scene, W, { x0: -6.5, x1: 34.5, z0: -33.3, z1: -29.95, y0: -1, y1: 3.2 }, { name: 'hallStatic' }),
    mergeCells(scene, W, { cell: 16, name: 'cellStatic' })]; // everything else static, walls too (same safety rules) // everything else static (same safety rules)
  // ---------- region tags for gameplay ----------
  W.regions = [
    { name: 'boiler', x0: -6.8, x1: -0.01, z0: 6, z1: 12 },
    { name: 'closet', x0: 58, x1: 60, z0: -46, z1: -43 }, { name: 'sewing', x0: 58, x1: 66, z0: -50, z1: -43 }, { name: 'bar', x0: 50, x1: 58, z0: -50, z1: -43 },
    { name: 'backhall', x0: 54, x1: 65.95, z0: -43, z1: -40 }, { name: 'bath117', x0: 24.95, x1: 26.6, z0: -35.6, z1: -33 }, { name: 'room117', x0: 21.8, x1: 26.6, z0: -38.4, z1: -33.02 },
    { name: 'dock', x0: 0, x1: 16, z0: 0, z1: 12 }, { name: 'lot', x0: 16.06, x1: 52, z0: -1, z1: 38 }, { name: 'office', x0: 0, x1: 6, z0: -5, z1: 0 }, { name: 'corridor', x0: 8, x1: 10.4, z0: -30, z1: 0 },
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
