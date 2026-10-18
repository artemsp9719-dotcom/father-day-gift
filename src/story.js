export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smoothstep(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

// One shared timeline keeps the DOM copy and the 3D scene synchronized.
export function getStoryState(progress) {
  return {
    open: smoothstep(0.015, 0.3, progress),
    ambient: smoothstep(0.04, 0.18, progress),
    garlands: smoothstep(0.09, 0.23, progress),
    spotlight: smoothstep(0.21, 0.36, progress),
    finale: smoothstep(0.53, 0.8, progress),
    heroOpacity: 1 - smoothstep(0.51, 0.66, progress),
    noteOpacity: smoothstep(0.65, 0.83, progress),
    signatureOpacity: smoothstep(0.84, 0.96, progress),
  };
}
