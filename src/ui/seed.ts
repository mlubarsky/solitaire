/** Reads `?seed=<n>` from a query string. Returns null when absent or invalid. */
export function parseSeed(search: string): number | null {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n >>> 0 : null;
}

/** A fresh random 32-bit seed for a new deal (the engine itself never uses Math.random). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}
