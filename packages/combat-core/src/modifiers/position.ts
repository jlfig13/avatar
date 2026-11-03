import type { Rules } from '@elemental/shared';
import { DIRECTIONS } from '../grid/grid.ts';
import type { Facing, Position } from '../types.ts';

// docs/02 §6.3 — height accuracy bonus. dh = attackerHeight - targetHeight.
export function heightAccuracyBonus(dh: number, rules: Rules): number {
  const { accuracyPerStep, accuracyStepMinDiff, maxAccuracyBonus } = rules.height;
  const steps = Math.floor(Math.abs(dh) / accuracyStepMinDiff);
  const bonus = Math.min(steps * accuracyPerStep, maxAccuracyBonus);
  return dh < 0 ? -bonus || 0 : bonus;
}

export type FlankPosition = 'front' | 'side' | 'back';

/**
 * docs/02 §6.4 — where the attacker stands relative to the target's facing. Uses the dominant
 * component of target→attacker: forward = front, backward = back, sideways or exact diagonal = side.
 */
export function flankPosition(
  attacker: Position,
  target: Position,
  targetFacing: Facing,
): FlankPosition {
  const dir = DIRECTIONS[targetFacing];
  const vx = attacker.x - target.x;
  const vy = attacker.y - target.y;
  const forward = vx * dir.x + vy * dir.y;
  const sideways = Math.abs(vx * dir.y - vy * dir.x);
  if (forward > sideways || (forward === 0 && sideways === 0)) return 'front';
  if (-forward > sideways) return 'back';
  return 'side';
}

export interface FlankModifiers {
  /** percentage points added to accuracy */
  readonly accuracy: number;
  readonly damage: number;
}

export function flankModifiers(position: FlankPosition, rules: Rules): FlankModifiers {
  if (position === 'front') return { accuracy: 0, damage: 1 };
  return rules.flank[position];
}
