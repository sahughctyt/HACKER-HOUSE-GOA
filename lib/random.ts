/**
 * Small seeded PRNG so a given "seed" always produces the same graphic.
 * Re-roll = new seed, which is what the shuffle button does.
 */

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  private s: number;

  constructor(seed: number | string) {
    this.s = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 1;
  }

  /** mulberry32 */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length) % items.length];
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }
}

export function newSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
