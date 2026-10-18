import * as THREE from 'three';

// The demo is a real articulated 3D character. Every limb has its own pivot;
// the user model can replace the whole group without changing the page.
export function createDemoDad() {
  const root = new THREE.Group();
  root.name = 'DemoDad';
  const mat = (color, flat = false) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, flatShading: flat });
  const skin = mat('#d5a077');
  const skinWarm = mat('#bb7959');
  const shirt = mat('#e1d3b7', true);
  const collar = mat('#c8b893');
  const jeans = mat('#465a72', true);
  const seam = mat('#586f85');
  const shoe = mat('#dad2bc');
  const sole = mat('#ece7d8');
  const hair = mat('#39271e', true);
  const hairLight = mat('#4c3325', true);
  const dark = mat('#30251e');
  const eyeWhite = mat('#fff7e7');
  const iris = mat('#5c6b63');
  const mouth = mat('#784633');

  function mesh(geometry, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(...position);
    part.scale.set(...scale);
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }
  const sphere = (material, parent, pos, scale, detail = 16) => mesh(new THREE.SphereGeometry(1, detail, 12), material, parent, pos, scale);
  function cylinder(top, bottom, length, material, parent, pos, radial = 10) {
    return mesh(new THREE.CylinderGeometry(top, bottom, length, radial), material, parent, pos);
  }
  function joint(parent, pos) {
    const pivot = new THREE.Group();
    pivot.position.set(...pos);
    parent.add(pivot);
    return pivot;
  }
  function line(points, radius, material, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), material, parent);
  }

  const hips = joint(root, [0, 1.44, 0]);
  sphere(jeans, hips, [0, 0, 0], [0.39, 0.24, 0.235]);
  const belt = cylinder(0.30, 0.30, 0.055, dark, hips, [0, 0.08, 0], 16);
  belt.scale.z = 0.62;
  mesh(new THREE.BoxGeometry(0.10, 0.05, 0.035), collar, hips, [0, 0.08, 0.20]);

  const torso = joint(hips, [0, 0.1, 0]);
  const torsoShape = new THREE.LatheGeometry([
    new THREE.Vector2(0.34, 0), new THREE.Vector2(0.41, 0.16),
    new THREE.Vector2(0.43, 0.48), new THREE.Vector2(0.47, 0.76),
    new THREE.Vector2(0.38, 0.88), new THREE.Vector2(0.18, 0.94),
  ], 12);
  mesh(torsoShape, shirt, torso, [0, 0, 0], [1, 1, 0.62]);
  const hem = cylinder(0.345, 0.345, 0.04, shirt, torso, [0, 0.012, 0], 12);
  hem.scale.z = 0.62;
  const neck = cylinder(0.14, 0.16, 0.25, skin, torso, [0, 1, 0]);
  const collarRing = mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 20), collar, torso, [0, 0.95, 0]);
  collarRing.rotation.x = Math.PI / 2;

  const head = joint(torso, [0, 1.22, 0]);
  sphere(skin, head, [0, 0.12, 0.015], [0.31, 0.40, 0.285], 20);
  sphere(skin, head, [0, -0.09, 0.052], [0.245, 0.22, 0.245], 16);
  for (const side of [-1, 1]) {
    sphere(skin, head, [side * 0.305, 0.1, 0.01], [0.065, 0.107, 0.05]);
    sphere(skinWarm, head, [side * 0.329, 0.1, 0.045], [0.022, 0.052, 0.014]);
    sphere(eyeWhite, head, [side * 0.116, 0.15, 0.27], [0.071, 0.044, 0.025]);
    sphere(iris, head, [side * 0.111, 0.151, 0.292], [0.027, 0.029, 0.012]);
    sphere(dark, head, [side * 0.109, 0.151, 0.302], [0.014, 0.02, 0.007]);
    sphere(eyeWhite, head, [side * 0.11 - 0.007, 0.162, 0.309], [0.007, 0.009, 0.004]);
    line([[side * 0.06, 0.239, 0.27], [side * 0.12, 0.255, 0.27], [side * 0.18, 0.23, 0.25]], 0.018, hair, head);
  }
  sphere(skin, head, [0, 0.065, 0.303], [0.065, 0.078, 0.079]);
  sphere(skinWarm, head, [0, 0.033, 0.335], [0.048, 0.021, 0.033]);
  line([[-0.135, -0.035, 0.25], [-0.08, -0.09, 0.28], [0, -0.106, 0.29], [0.08, -0.09, 0.28], [0.135, -0.035, 0.25]], 0.017, mouth, head);
  line([[-0.086, -0.077, 0.29], [0, -0.09, 0.302], [0.086, -0.077, 0.29]], 0.012, eyeWhite, head);
  // Sculpted hair cap and swept quiff.
  mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.47), hair, head, [0, 0.23, -0.04], [0.318, 0.29, 0.29]);
  for (let i = 0; i < 5; i++) {
    const tuft = sphere(i % 2 ? hair : hairLight, head, [-0.22 + i * 0.105, 0.44 + Math.sin(i * 0.65) * 0.055, 0.10], [0.095, 0.13, 0.19], 8);
    tuft.rotation.z = -0.34;
  }
  for (const side of [-1, 1]) {
    sphere(hair, head, [side * 0.27, 0.20, -0.015], [0.045, 0.16, 0.19], 10);
  }

  function arm(side) {
    const shoulder = joint(torso, [side * 0.435, 0.76, 0]);
    sphere(shirt, shoulder, [0, -0.10, 0], [0.205, 0.22, 0.19], 12);
    cylinder(0.18, 0.15, 0.30, shirt, shoulder, [0, -0.21, 0]);
    cylinder(0.125, 0.105, 0.26, skin, shoulder, [0, -0.40, 0]);
    const elbow = joint(shoulder, [0, -0.53, 0]);
    sphere(skin, elbow, [0, 0, 0], [0.11, 0.115, 0.11]);
    cylinder(0.105, 0.073, 0.43, skin, elbow, [0, -0.20, 0]);
    const hand = joint(elbow, [0, -0.45, 0]);
    sphere(skin, hand, [0, -0.065, 0], [0.086, 0.125, 0.065]);
    const thumb = sphere(skin, hand, [-side * 0.072, -0.025, 0.023], [0.042, 0.074, 0.045]);
    thumb.rotation.z = side * 0.45;
    if (side === -1) {
      const band = cylinder(0.078, 0.078, 0.07, dark, elbow, [0, -0.37, 0], 16);
      mesh(new THREE.BoxGeometry(0.10, 0.09, 0.035), collar, elbow, [0, -0.37, 0.077]);
    }
    return { shoulder, elbow, hand };
  }
  function leg(side) {
    const hip = joint(hips, [side * 0.205, -0.12, 0]);
    cylinder(0.195, 0.14, 0.65, jeans, hip, [0, -0.29, 0]);
    const knee = joint(hip, [0, -0.61, 0]);
    sphere(jeans, knee, [0, 0, 0], [0.145, 0.15, 0.15], 12);
    cylinder(0.14, 0.105, 0.64, jeans, knee, [0, -0.29, 0]);
    cylinder(0.11, 0.115, 0.055, seam, knee, [0, -0.595, 0]);
    const foot = joint(knee, [0, -0.64, 0.06]);
    sphere(sole, foot, [0, -0.015, 0.075], [0.145, 0.075, 0.285], 16);
    sphere(shoe, foot, [0, 0.052, 0.07], [0.135, 0.10, 0.25], 16);
    sphere(dark, foot, [0, 0.08, -0.085], [0.112, 0.055, 0.072], 12);
    for (let i = 0; i < 3; i++) {
      line([[-0.075, 0.143 - i * 0.008, 0.04 + i * 0.045], [0.075, 0.143 - i * 0.008, 0.04 + i * 0.045]], 0.009, sole, foot);
    }
    return { hip, knee, foot };
  }
  const leftArm = arm(-1), rightArm = arm(1);
  const leftLeg = leg(-1), rightLeg = leg(1);

  function animate(time, reducedMotion) {
    const t = reducedMotion ? 0.65 : time;
    const beat = t * 3.8;
    const sway = Math.sin(beat);
    const double = Math.sin(beat * 2);
    hips.position.x = sway * 0.10;
    hips.position.y = 1.44 + Math.abs(double) * 0.055;
    hips.rotation.y = Math.sin(beat * 0.5) * 0.16;
    hips.rotation.z = sway * 0.055;
    torso.rotation.z = -sway * 0.11;
    torso.rotation.y = Math.sin(beat + 0.6) * 0.13;
    head.rotation.z = Math.sin(beat - 0.3) * 0.09;
    head.rotation.y = Math.sin(beat * 0.5 + 0.4) * 0.16;
    head.rotation.x = Math.sin(beat * 2) * 0.04;
    leftArm.shoulder.rotation.z = -0.72 + Math.sin(beat + 0.8) * 0.28;
    leftArm.shoulder.rotation.x = -0.2 + Math.cos(beat) * 0.28;
    leftArm.elbow.rotation.x = -1.05 + Math.sin(beat + 0.3) * 0.3;
    leftArm.elbow.rotation.z = -0.25;
    rightArm.shoulder.rotation.z = 1.08 + Math.sin(beat + 0.8) * 0.40;
    rightArm.shoulder.rotation.x = -0.2 + Math.sin(beat + 0.7) * 0.35;
    rightArm.elbow.rotation.z = 0.68 + Math.cos(beat) * 0.25;
    rightArm.elbow.rotation.x = -0.55 + Math.sin(beat) * 0.2;
    leftLeg.hip.rotation.z = -0.15 - sway * 0.07;
    rightLeg.hip.rotation.z = 0.15 - sway * 0.07;
    leftLeg.hip.rotation.x = Math.sin(beat) * 0.13;
    rightLeg.hip.rotation.x = -Math.sin(beat) * 0.13;
    leftLeg.knee.rotation.x = 0.1 + Math.max(0, -sway) * 0.16;
    rightLeg.knee.rotation.x = 0.1 + Math.max(0, sway) * 0.16;
    leftLeg.foot.rotation.x = -leftLeg.knee.rotation.x * 0.5;
    rightLeg.foot.rotation.x = -rightLeg.knee.rotation.x * 0.5;
  }
  animate(0.65, false);
  return { root, animate };
}
