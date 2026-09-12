export const WORLD = 720;
export const FLOOR = 610;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const runnerSpeed = seconds => Math.min(490, 300 + seconds * 3);
export const runnerGap = seconds => Math.max(1.12, 1.7 - seconds * .009);
export const formationSpeed = wave => Math.min(115, 32 + wave * 7);
export function readBest(storage, mode) {
  try { const n = Number(storage?.getItem('lj-arcade-v2:' + mode)); return Number.isSafeInteger(n) && n >= 0 ? n : 0; }
  catch { return 0; }
}
export function saveBest(storage, mode, score) {
  try { storage?.setItem('lj-arcade-v2:' + mode, String(Math.max(0, Math.floor(score)))); } catch {}
}
