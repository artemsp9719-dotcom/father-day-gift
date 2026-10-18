import * as THREE from 'three';

// Some generated dances include a pelvis roll beyond 90 degrees. Keep the
// heading and limb tracks, but limit this model's whole-body lean.
export function createMotionStabilizer(model, { maxHipLean } = {}) {
  const hips = model.getObjectByName('Hips');
  if (!hips || !(maxHipLean > 0)) return () => {};
  const limit = Math.min(maxHipLean, Math.PI / 2);
  const twist = new THREE.Quaternion();
  const swing = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  const identity = new THREE.Quaternion();
  const feet = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
    .map(name => model.getObjectByName(name)).filter(Boolean);
  const point = new THREE.Vector3();
  const lowestFoot = () => {
    model.updateWorldMatrix(true, true);
    return Math.min(...feet.map(foot => {
      foot.getWorldPosition(point);
      model.parent.worldToLocal(point);
      return point.y;
    }));
  };
  const referenceFootY = feet.length && model.parent ? lowestFoot() : null;
  return () => {
    // q = swing * twist: twist is the heading around the skeleton's Y axis.
    const q = hips.quaternion;
    twist.set(0, q.y, 0, q.w);
    if (twist.lengthSq() < 1e-10) twist.identity();
    else twist.normalize();
    swing.copy(q).multiply(inverse.copy(twist).invert()).normalize();
    const angle = 2 * Math.acos(Math.min(1, Math.abs(swing.w)));
    // Soft saturation avoids a velocity kink where a hard angle clamp starts.
    if (angle > 1e-8) swing.slerp(identity, 1 - limit * Math.tanh(angle / limit) / angle);
    q.copy(swing).multiply(twist).normalize();
    // Keep the lower shoe at the original stage contact height after correcting
    // the pelvis, instead of making the dancer hover or sink into the floor.
    if (referenceFootY !== null) model.position.y += referenceFootY - lowestFoot();
  };
}
