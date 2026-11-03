import { describe, expect, it } from 'vitest';
import { flankModifiers, flankPosition, heightAccuracyBonus } from '../src/modifiers/position.ts';
import type { Facing, Position } from '../src/types.ts';
import { testRules } from './factories.ts';

describe('heightAccuracyBonus', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 10],
    [3, 10],
    [4, 20],
    [8, 20],
    [-1, 0],
    [-2, -10],
    [-4, -20],
    [-6, -20],
  ])('dh %i → %i', (dh, bonus) => {
    expect(heightAccuracyBonus(dh, testRules)).toBe(bonus);
  });
});

describe('flankPosition', () => {
  const target: Position = { x: 5, y: 5 };
  const attackerAt: Record<Facing, Position> = {
    N: { x: 5, y: 4 },
    E: { x: 6, y: 5 },
    S: { x: 5, y: 6 },
    W: { x: 4, y: 5 },
  };
  // [target facing][attacker side] → position
  const table: Record<Facing, Record<Facing, 'front' | 'side' | 'back'>> = {
    N: { N: 'front', E: 'side', S: 'back', W: 'side' },
    E: { N: 'side', E: 'front', S: 'side', W: 'back' },
    S: { N: 'back', E: 'side', S: 'front', W: 'side' },
    W: { N: 'side', E: 'back', S: 'side', W: 'front' },
  };
  for (const facing of ['N', 'E', 'S', 'W'] as const) {
    for (const side of ['N', 'E', 'S', 'W'] as const) {
      it(`target facing ${facing}, attacker on ${side} → ${table[facing][side]}`, () => {
        expect(flankPosition(attackerAt[side], target, facing)).toBe(table[facing][side]);
      });
    }
  }

  it('uses the dominant axis at range and counts exact diagonals as side', () => {
    expect(flankPosition({ x: 5, y: 9 }, target, 'N')).toBe('back');
    expect(flankPosition({ x: 6, y: 9 }, target, 'N')).toBe('back');
    expect(flankPosition({ x: 7, y: 7 }, target, 'N')).toBe('side');
    expect(flankPosition({ x: 6, y: 1 }, target, 'N')).toBe('front');
  });
});

describe('flankModifiers', () => {
  it('reads side/back values from rules (not from code)', () => {
    expect(flankModifiers('front', testRules)).toEqual({ accuracy: 0, damage: 1 });
    expect(flankModifiers('side', testRules)).toEqual(testRules.flank.side);
    expect(flankModifiers('back', testRules)).toEqual(testRules.flank.back);
    const custom = {
      ...testRules,
      flank: { side: { accuracy: 1, damage: 1.01 }, back: { accuracy: 2, damage: 1.02 } },
    };
    expect(flankModifiers('back', custom)).toEqual({ accuracy: 2, damage: 1.02 });
  });
});
