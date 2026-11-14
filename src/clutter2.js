// Graphics pass 2 clutter: chunky low-poly props for the shop, service corridor, stair B, pantry, terrace and lot.
// Batched per material (one draw call each), colliders only where you'd actually bump into something, nothing on the test/chase routes.
import * as THREE from 'three';
import { Batch, Decals } from './gfx.js';

export function clutter2(scene, W, { L, C, GM, GT, puddleMat }) {
  const B = new Batch(scene), DD = new Decals(scene, GT.decals), DP = new Decals(scene, GT.decals); DP.mat = puddleMat;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const put = (geo, mat, pos, rot = [0, 0, 0]) => B.add(geo, mat, new THREE.Matrix4().compose(new THREE.Vector3(...pos), q.setFromEuler(e.set(rot[0], rot[1], rot[2], 'YXZ')), one));
  const bx = (x0, y0, z0, x1, y1, z1, mat, rot) => put(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], rot);
  const cy = (x, y, z, r, h, mat, seg = 10, r2, rot) => put(new THREE.CylinderGeometry(r2 ?? r, r, h, seg), mat, [x, y + h / 2, z], rot);
  const col = (x0, x1, z0, z1, y1 = 1.2, y0 = 0) => W.colliders.push({ x0, x1, z0, z1, y0, y1 });
  const yellow = C(0xc9a11e), orange = C(0xd2581c), white = C(0xd8d4c8), red = C(0x9a1c14), steel = GM.steelD, black = C(0x151515), gray = C(0x5c5f60), paper = C(0xe6e0cc), blue = C(0x2a4a8a), green = C(0x2f5a34);

  // ===== ENGINEERING SHOP x[0,6] z[-5,0] =====
  { // fibreglass step ladder leaning on the south wall, east of the door
    for (const x of [4.55, 5.15]) bx(x, 0, -0.32, x + 0.06, 1.85, -0.26, yellow, [0.12, 0, 0]); for (let k = 0; k < 5; k++) bx(4.55, 0.3 + k * 0.32, -0.3 + k * 0.035, 5.21, 0.34 + k * 0.32, -0.24 + k * 0.035, steel);
    col(4.45, 5.3, -0.45, -0.1, 1.9);
    // two 5-gallon buckets (one with a squeegee in it), a wet vac in the SW corner
    cy(5.6, 0, -0.62, 0.15, 0.38, orange, 12, 0.16); cy(5.25, 0, -0.98, 0.15, 0.38, white, 12, 0.16); cy(5.25, 0.3, -0.98, 0.012, 1.1, GM.pwood, 6, undefined, [0.15, 0, 0.1]);
    col(5.05, 5.8, -1.18, -0.42, 0.4);
    cy(0.55, 0.05, -0.5, 0.24, 0.5, C(0x3a3c40), 12); cy(0.55, 0.55, -0.5, 0.22, 0.14, black, 12); for (let k = 0; k < 4; k++) cy(0.55 + Math.cos(k * 1.6) * 0.2, 0, -0.5 + Math.sin(k * 1.6) * 0.2, 0.04, 0.05, black, 6);
    put(new THREE.TorusGeometry(0.18, 0.03, 5, 12), black, [0.55, 0.72, -0.5], [Math.PI / 2, 0, 0]); col(0.3, 0.8, -0.75, -0.25, 0.7);
    // trash can between desk and bench, paper in it
    cy(3.15, 0, -4.62, 0.17, 0.55, gray, 10, 0.19); for (let k = 0; k < 4; k++) put(new THREE.IcosahedronGeometry(0.06, 0), paper, [3.1 + (k % 2) * 0.08, 0.55, -4.65 + (k > 1 ? 0.07 : -0.04)]); col(2.96, 3.34, -4.81, -4.43, 0.6);
    // on the bench: red toolbox, a coffee maker with a stained pot, a roll of paper towel, a voltage tester
    bx(3.6, 0.95, -4.75, 4.15, 1.17, -4.5, red); bx(3.62, 1.17, -4.73, 4.13, 1.2, -4.52, C(0x6a1410)); bx(3.82, 1.2, -4.64, 3.93, 1.24, -4.6, black);
    bx(5.05, 0.95, -4.85, 5.35, 1.3, -4.6, black); cy(5.2, 0.97, -4.55, 0.07, 0.14, C(0x2a1c10), 10); cy(4.65, 0.95, -4.7, 0.06, 0.24, paper, 10); bx(4.35, 0.95, -4.55, 4.43, 0.97, -4.4, yellow);
    // on the desk: clipboard of work orders, a mug, a pile of manuals
    bx(1.0, 0.8, -4.45, 1.28, 0.815, -4.25, C(0x6a4a2a), [0, 0.2, 0]); bx(1.03, 0.815, -4.43, 1.25, 0.82, -4.27, paper, [0, 0.2, 0]); cy(2.6, 0.8, -4.4, 0.04, 0.1, white, 8);
    for (let k = 0; k < 3; k++) bx(2.45, 0.8 + k * 0.03, -4.85, 2.75, 0.83 + k * 0.03, -4.6, [blue, paper, C(0x7a2a1a)][k], [0, k * 0.12, 0]);
    // hard hats + a box of lamps on the top shelf, a wall clock over the desk, conduit along the ceiling
    for (const [z, m] of [[-3.7, white], [-3.3, yellow]]) put(new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), m, [0.32, 2.04, z]);
    cy(2.0, 2.05, -4.89, 0.16, 0.04, white, 14, undefined, [Math.PI / 2, 0, 0]); bx(1.99, 2.08, -4.86, 2.01, 2.18, -4.855, black); bx(2.0, 2.07, -4.86, 2.08, 2.09, -4.855, black);
    bx(0.1, 2.55, -4.85, 6.0, 2.58, -4.82, GM.conduit); bx(5.85, 0.4, -4.85, 5.88, 2.58, -4.82, GM.conduit);
    put(new THREE.TorusGeometry(0.16, 0.025, 5, 14), C(0xd8892a), [1.5, 1.55, -0.14]); bx(1.48, 1.68, -0.15, 1.52, 1.72, -0.1, steel); // extension cord coiled on a hook
    DP.add(5.3, 0.003, -0.9, 'up', 0.9, 0.7, 11, 0.4); DD.add(3.1, 0.004, -4.6, 'up', 0.6, 0.6, 13); DD.add(0.55, 0.004, -0.5, 'up', 0.8, 0.8, 13); DD.add(4.9, 0.004, -0.3, 'up', 1.0, 0.6, 13);
  }
  // ===== SERVICE CORRIDOR x[8,10.4] z[-30,0] =====
  { // sprinkler main (red) + heads, a cable tray, extinguisher cabinets, a soiled-linen cart, a trash can, wet-floor sign
    bx(9.9, 2.78, -30, 10.0, 2.88, 0, red); for (let z = -28.5; z < 0; z += 3) { bx(9.93, 2.88, z - 0.02, 9.97, 3.0, z + 0.02, red); cy(9.95, 2.72, z, 0.02, 0.06, GM.chrome, 6); }
    bx(8.5, 2.85, -30, 8.9, 2.88, 0, steel); for (let z = -29.5; z < 0; z += 2.4) bx(8.5, 2.88, z, 8.52, 3.0, z + 0.04, steel);
    for (const z of [-24.0, -4.5]) { bx(10.22, 1.0, z - 0.3, 10.3, 1.75, z + 0.3, red); bx(10.21, 1.05, z - 0.25, 10.22, 1.7, z + 0.25, C(0x1a2028)); cy(10.18, 1.1, z, 0.07, 0.42, red, 8); }
    { const x0 = 9.95, x1 = 10.3, z0 = -15.2, z1 = -14.0; bx(x0, 0.15, z0, x1, 0.95, z1, C(0x3a3d42)); for (const [a, b] of [[x0 + 0.04, z0 + 0.06], [x1 - 0.04, z0 + 0.06], [x0 + 0.04, z1 - 0.06], [x1 - 0.04, z1 - 0.06]]) cy(a, 0, b, 0.05, 0.15, black, 6);
      for (let k = 0; k < 4; k++) put(new THREE.IcosahedronGeometry(0.2, 0), k % 2 ? white : C(0xb8c0c8), [10.12, 1.02 + (k > 1 ? 0.12 : 0), z0 + 0.3 + (k % 2) * 0.55]); col(x0, x1, z0, z1, 1.2); DD.add(10.1, 0.004, -14.6, 'up', 0.6, 1.4, 13); }
    cy(8.32, 0, -3.6, 0.17, 0.6, gray, 10, 0.19); col(8.13, 8.51, -3.8, -3.4, 0.6); DD.add(8.32, 0.004, -3.6, 'up', 0.5, 0.5, 13);
    for (const [z, w, r] of [[-21.4, 1.0, 0.3], [-10.5, 0.8, 1.4], [-26.8, 1.2, 2.0]]) DP.add(8.9, 0.003, z, 'up', w, w * 0.7, 11, r); // drips from the mop bucket and the cart
    for (const [z, r] of [[-17, 0.2], [-6.5, 2.6], [-27.5, 1.2]]) DD.add(9.2, 0.004, z, 'up', 1.0, 2.4, 6, r); // cart-wheel tracks
  }
  // ===== STAIR B x[10.4,14] z[-20,-10]: a mop bucket on the landing, butts in the corner, the old sign =====
  { cy(13.45, 2.4, -19.45, 0.16, 0.34, yellow, 10, 0.18); cy(13.45, 2.6, -19.45, 0.012, 1.15, GM.pwood, 6, undefined, [0.2, 0, -0.1]); DD.add(13.4, 2.404, -19.4, 'up', 0.7, 0.7, 13); DD.add(10.9, 0.004, -10.6, 'up', 0.7, 0.7, 10, 0.3);
    W.label(10.42, 1.55, -14.5, 0.35, 0.45, ['NO', 'LOITERING', '—', 'MGMT'], { w: 96, h: 128, size: 15, bg: '#d8d0b8', fg: '#7a1410', bold: true }, Math.PI / 2); }
  // ===== GUEST PANTRY: trash can + a bag of ice someone left melting =====
  { cy(17.6, 0, -26.75, 0.17, 0.6, gray, 10, 0.19); col(17.4, 17.8, -26.95, -26.55, 0.6); put(new THREE.SphereGeometry(0.16, 8, 6), C(0xd8e4ea), [17.25, 0.1, -26.4], [0, 0, 0]); DP.add(17.1, 0.003, -26.2, 'up', 0.7, 0.5, 11, 1.2); }
  // ===== TERRACE: sand-top urn by the McLean door, dead planters, puddles on the pavers, a stack of chairs under tarp =====
  { cy(34.55, 0, -33.0, 0.14, 0.75, C(0x2a2826), 10, 0.12); cy(34.55, 0.75, -33.0, 0.12, 0.05, C(0xb8ab88), 10); col(34.38, 34.72, -33.17, -32.83, 0.8); DD.add(34.8, 0.004, -33.2, 'up', 1.2, 1.2, 10, 0.5);
    for (const [x, z, w, r] of [[38.5, -31, 2.2, 0.4], [44.5, -28.5, 1.6, 1.9], [41.0, -35.6, 1.9, 2.6], [36.2, -27.8, 1.2, 0.9]]) DP.add(x, 0.003, z, 'up', w, w * 0.6, 11, r);
    for (const [x, z, r] of [[37.3, -34, 0.2], [45.5, -32.5, 1.4], [40.2, -27.6, 2.2]]) DD.add(x, 0.004, z, 'up', 1.6, 1.6, 7, r);
    { const x = 46.4, z = -36.7; for (let k = 0; k < 6; k++) bx(x - 0.3, 0.45 + k * 0.07, z - 0.3, x + 0.3, 0.5 + k * 0.07, z + 0.3, C(0x2c2c2a)); for (const [a, b] of [[-0.27, -0.27], [0.24, -0.27], [-0.27, 0.24], [0.24, 0.24]]) bx(x + a, 0, z + b, x + a + 0.03, 0.47, z + b + 0.03, C(0x2c2c2a));
      put(new THREE.BoxGeometry(0.78, 0.04, 0.78), C(0x2a3a5a), [x, 0.9, z], [0.05, 0.3, -0.06]); col(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0.95); DD.add(x, 0.004, z, 'up', 1.0, 1.0, 13); } }
  // ===== EMPLOYEE LOT: oil, wet patches, cracks, a few butts by the door =====
  { for (const [x, z, w, r] of [[24, 9, 2.4, 0.2], [33, 12, 3, 1.3], [41, 20, 2, 2.2], [28, 22, 2.6, 0.7], [20.2, 14.5, 1.8, 1.1]]) DP.add(x, 0.003, z, 'up', w, w * 0.6, 11, r);
    for (const [x, z, r] of [[22.3, 6.0, 0], [27.5, 5.6, 0.1], [38, 5.9, 0], [34, 26.6, 3.1]]) DD.add(x, 0.004, z, 'up', 1.4, 2.6, 5, r);
    for (const [x, z, r] of [[26, 14, 0.5], [36, 18, 1.7], [45, 10, 2.8], [30, 30, 0.2]]) DD.add(x, 0.004, z, 'up', 3, 3, 7, r); DD.add(17.6, 0.124, 9.4, 'up', 1.0, 1.0, 10, 1.1); }
  return { batched: B.flush({ name: 'clutter2' }).length, decals: [DD.flush(), DP.flush()] };
}
