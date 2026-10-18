// A GitHub project site lives below /repository/, while Sites uses the root.
export function assetUrl(path) {
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
