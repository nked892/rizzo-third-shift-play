// ORIGINAL statue design for this game (not the Kato sculpture): a poured-concrete figure, slightly too tall,
// shoulders hunched, arms fused to the body, rebar jutting from the back and one shoulder, a small egg head
// with tally marks painted across where the eyes would be and a white smeared palm-print where a mouth would be.
import * as THREE from 'three';
export function makeStatue(T) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: T.statue }); const face = new THREE.MeshLambertMaterial({ map: T.statueFace });
  const rust = new THREE.MeshLambertMaterial({ color: 0x5a2a12 });
  const lathe = (pts, m) => { const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 10); const mesh = new THREE.Mesh(geo, m); return mesh; };
  // body: lumpy tapered column, wider at the hips, narrow neck
  const body = lathe([[0.0, 0], [0.24, 0.02], [0.27, 0.25], [0.24, 0.6], [0.3, 0.9], [0.33, 1.2], [0.31, 1.45], [0.2, 1.62], [0.09, 1.7], [0.0, 1.72]], mat);
  body.scale.set(1, 1, 0.72); g.add(body);
  // deform vertices slightly for hand-poured lumpiness (deterministic)
  const p = body.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 + 0.07 * Math.sin(a * 3 + y * 7) + 0.04 * Math.sin(a * 7 - y * 13); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } body.geometry.computeVertexNormals();
  // fused arms hanging too long
  for (const s of [-1, 1]) { const arm = lathe([[0, 0], [0.07, 0.02], [0.08, 0.4], [0.1, 0.75], [0.07, 0.9], [0, 0.92]], mat); arm.position.set(s * 0.33, 0.45, 0.02); arm.rotation.z = s * 0.06; g.add(arm); }
  // head: small egg, tilted
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), face); head.scale.set(0.95, 1.3, 0.9); head.position.set(0, 1.9, 0.02); head.rotation.set(0.12, -Math.PI / 2, 0.1); g.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 8), mat); neck.position.set(0, 1.74, 0); g.add(neck);
  // rebar
  for (const [x, y, z, rx, rz, l] of [[0.05, 1.3, -0.18, -0.6, 0.2, 0.5], [-0.1, 1.0, -0.2, -0.9, -0.3, 0.4], [0.28, 1.5, 0, 0.1, -1.1, 0.35], [0.0, 0.6, -0.16, -1.2, 0.1, 0.3]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, l, 5), rust); r.position.set(x, y, z); r.rotation.set(rx, 0, rz); r.translateY(l / 2); g.add(r); }
  // base chunk of broken slab
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 7), mat); base.position.y = 0.03; g.add(base);
  g.traverse(o => { if (o.isMesh) o.userData.statue = true; });
  g.userData.checkPoints = [new THREE.Vector3(0, 1.9, 0), new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0.3, 1.0, 0), new THREE.Vector3(-0.3, 1.0, 0)];
  return g;
}
