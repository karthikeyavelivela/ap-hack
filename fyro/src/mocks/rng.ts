// Deterministic PRNG helpers (seeded) so every reload shows identical data.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = () => number;
export const pick = <T,>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export function weighted(r: Rng, cum: number[]): number {
  const x = r() * cum[cum.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (cum[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
export function cumulative(w: number[]): number[] {
  let s = 0;
  return w.map((v) => (s += v));
}
export function poisson(r: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L && k < 200);
  return k - 1;
}
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
