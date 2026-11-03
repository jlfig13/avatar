import { describe, expect, it } from 'vitest';
import { next, nextInt, pick, rollInt, seedRng } from '../src/rng.ts';
import { deepFreeze, makeBattle } from './factories.ts';

function sequence(seed: number, count: number): number[] {
  let state = seedRng(seed);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const [value, nextState] = next(state);
    values.push(value);
    state = nextState;
  }
  return values;
}

describe('rng', () => {
  it('same seed produces the same sequence over 1,000 calls', () => {
    expect(sequence(12345, 1000)).toEqual(sequence(12345, 1000));
  });

  it('different seeds produce different sequences', () => {
    expect(sequence(1, 20)).not.toEqual(sequence(2, 20));
  });

  it('next returns values in [0, 1)', () => {
    for (const value of sequence(7, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('nextInt(1, 100) is uniform within ±2% per bucket of 10 over 100,000 samples', () => {
    const samples = 100_000;
    const buckets = new Array<number>(10).fill(0);
    let state = seedRng(2024);
    for (let i = 0; i < samples; i++) {
      const [value, nextState] = nextInt(state, 1, 100);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(100);
      const bucket = Math.floor((value - 1) / 10);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
      state = nextState;
    }
    for (const count of buckets) {
      expect(Math.abs(count / samples - 0.1)).toBeLessThanOrEqual(0.02);
    }
  });

  it('pick returns an element of the list deterministically', () => {
    const list = ['a', 'b', 'c'] as const;
    const [first] = pick(seedRng(9), list);
    const [again] = pick(seedRng(9), list);
    expect(list).toContain(first);
    expect(again).toBe(first);
  });

  it('pick throws on an empty list (programming error)', () => {
    expect(() => pick(seedRng(1), [])).toThrow();
  });

  it('rollInt advances BattleState.rngState without mutating the battle', () => {
    const battle = deepFreeze(makeBattle({ rngState: seedRng(5) }));
    const [value, after] = rollInt(battle, 1, 100);
    const [expected, expectedState] = nextInt(seedRng(5), 1, 100);
    expect(value).toBe(expected);
    expect(after.rngState).toBe(expectedState);
    expect(battle.rngState).toBe(seedRng(5));
  });
});
