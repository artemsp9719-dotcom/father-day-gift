import * as THREE from 'three';

// Resample a generated dance, add a return to the opening pose, and smooth the
// entire periodic signal so both the pose and velocity agree at the loop seam.
export function prepareDanceClip(source, { smoothDance = false } = {}) {
  if (!smoothDance || source.duration <= 0) return source;
  const fps = 60;
  const bridge = 0.6;
  const count = Math.ceil((source.duration + bridge) * fps);
  const duration = count / fps;
  const times = Float32Array.from({ length: count + 1 }, (_, i) => i / fps);
  const sigma = 0.09 * fps;
  const radius = Math.ceil(sigma * 3);
  const weights = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const tracks = source.tracks.map(track => {
    const size = track.getValueSize();
    if (track.ValueTypeName !== 'quaternion' && track.ValueTypeName !== 'vector') return track.clone();
    const rotation = track.ValueTypeName === 'quaternion';
    const interpolant = track.createInterpolant();
    const start = Array.from(interpolant.evaluate(0));
    const end = Array.from(interpolant.evaluate(source.duration));
    const samples = [];
    const a = new THREE.Quaternion(), b = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const t = i / fps;
      if (t <= source.duration) samples.push(Array.from(interpolant.evaluate(t)));
      else {
        const x = (t - source.duration) / (duration - source.duration);
        const blend = x * x * (3 - 2 * x);
        samples.push(rotation ? a.fromArray(end).slerp(b.fromArray(start), blend).toArray()
          : end.map((v, k) => THREE.MathUtils.lerp(v, start[k], blend)));
      }
    }
    const values = new Float32Array((count + 1) * size);
    for (let i = 0; i < count; i++) {
      const sum = Array(size).fill(0), reference = samples[i];
      for (let j = -radius; j <= radius; j++) {
        const sample = samples[(i + j + count) % count];
        const sign = rotation && sample.reduce((s, v, k) => s + v * reference[k], 0) < 0 ? -1 : 1;
        const weight = weights[j + radius] * sign;
        for (let k = 0; k < size; k++) sum[k] += sample[k] * weight;
      }
      if (rotation) a.fromArray(sum).normalize().toArray(values, i * size);
      else for (let k = 0; k < size; k++) values[i * size + k] = sum[k] / totalWeight;
    }
    values.set(values.subarray(0, size), count * size);
    return rotation ? new THREE.QuaternionKeyframeTrack(track.name, times, values)
      : new THREE.VectorKeyframeTrack(track.name, times, values);
  });
  return new THREE.AnimationClip(`${source.name}_smooth`, duration, tracks);
}
