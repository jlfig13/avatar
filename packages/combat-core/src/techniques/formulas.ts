import type { GameData, Technique } from '@elemental/shared';
import { getCell } from '../grid/grid.ts';
import { defendMultiplier } from '../modifiers/defense.ts';
import { flankModifiers, flankPosition, heightAccuracyBonus } from '../modifiers/position.ts';
import type { Combatant, Grid } from '../types.ts';

// docs/02 §6.5–6.7 — pure formulas, also used by the AI to estimate outcomes.

export const SHIELDED = 'shielded';

/** docs/02 §6.7 — ceil(cost × (1 − min(focus, cap) / 100)). */
export function effectiveCost(technique: Technique, user: Combatant, data: GameData): number {
  const reduction = Math.min(user.attributes.focus, data.rules.energy.focusCostReductionCap);
  return Math.ceil(technique.energyCost * (1 - reduction / 100));
}

const heightAt = (grid: Grid, c: Combatant) => getCell(grid, c.position)?.height ?? 0;

/** docs/02 §6.5 — hit chance in %, clamped to [min, max]. */
export function hitChance(
  grid: Grid,
  technique: Technique,
  attacker: Combatant,
  target: Combatant,
  data: GameData,
): number {
  const { rules } = data;
  const flank = flankModifiers(
    flankPosition(attacker.position, target.position, target.facing),
    rules,
  );
  const onIce = getCell(grid, target.position)?.effect?.kind === 'ice';
  const raw =
    technique.accuracy +
    (attacker.attributes.control - target.attributes.mobility) *
      rules.accuracy.controlVsMobilityFactor +
    heightAccuracyBonus(heightAt(grid, attacker) - heightAt(grid, target), rules) +
    flank.accuracy +
    (onIce ? rules.cellEffects.ice.accuracyBonusAgainstOccupant : 0);
  return Math.min(rules.accuracy.max, Math.max(rules.accuracy.min, raw));
}

/** docs/02 §6.6 — base = power + attacker.power × powerScaling. */
export const basePower = (technique: Technique, attacker: Combatant): number =>
  technique.power + attacker.attributes.power * technique.powerScaling;

/** docs/02 §6.6 — damage on hit (no critical hits in slice 1). */
export function damageAmount(
  grid: Grid,
  technique: Technique,
  attacker: Combatant,
  target: Combatant,
  data: GameData,
  extraMultiplier = 1,
): number {
  const { rules } = data;
  const flank = flankModifiers(
    flankPosition(attacker.position, target.position, target.facing),
    rules,
  );
  const onWater = getCell(grid, target.position)?.terrain === 'shallow_water';
  const terrain =
    technique.element === 'water' && onWater ? rules.damage.waterOnShallowWaterBonus : 1;
  const shield = 1 - (target.status.find((s) => s.id === SHIELDED)?.magnitude ?? 0);
  const mult = flank.damage * terrain * defendMultiplier(target) * shield * extraMultiplier;
  const raw =
    basePower(technique, attacker) * mult -
    target.attributes.resistance * rules.damage.resistanceFactor;
  return Math.max(rules.damage.minDamage, Math.round(raw));
}

/** docs/02 §6.6 — healing uses the same base, without resistance or flank. */
export const healAmount = (technique: Technique, user: Combatant): number =>
  Math.max(0, Math.round(basePower(technique, user)));
