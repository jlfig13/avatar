import type { BattleState } from './types.ts';

// Deterministic PRNG (mulberry32). The whole state is one uint32, stored in BattleState.rngState.
// All functions are pure: they return the value and the next state.

export type RngState = number;

export const seedRng = (seed: number): RngState => seed >>> 0;

/** Returns a float in [0, 1) and the next state. */
export function next(state: RngState): [number, RngState] {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextState];
}

/** Integer in [min, max] (inclusive). */
export function nextInt(state: RngState, min: number, max: number): [number, RngState] {
  const [value, nextState] = next(state);
  return [min + Math.floor(value * (max - min + 1)), nextState];
}

export function pick<T>(state: RngState, items: readonly T[]): [T, RngState] {
  if (items.length === 0) throw new Error('pick: empty list');
  const [index, nextState] = nextInt(state, 0, items.length - 1);
  return [items[index] as T, nextState];
}

/** Convenience: roll an integer using (and advancing) the battle's RNG. */
export function rollInt(state: BattleState, min: number, max: number): [number, BattleState] {
  const [value, rngState] = nextInt(state.rngState, min, max);
  return [value, { ...state, rngState }];
}
