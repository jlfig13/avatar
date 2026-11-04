import { z } from 'zod';

// docs/05 §2 — PROVISÓRIO values live in packages/game-data/data/rules.json.
const num = z.number();
const int = z.number().int();

export const RulesSchema = z.strictObject({
  movement: z.strictObject({
    base: int,
    mobilityDivisor: int.min(1),
    jumpUp: int,
    jumpDown: int,
    extraCost: z.strictObject({ shallow_water: int, ice: int }),
    waterUsersIgnoreWater: z.boolean(),
  }),
  ct: z.strictObject({ threshold: int.min(1), speedBase: int, speedMobilityDivisor: int.min(1) }),
  turn: z.strictObject({
    timeoutSeconds: int,
    afkTimeoutSeconds: int,
    afkAfterConsecutive: int,
    defendDamageMultiplier: num,
  }),
  accuracy: z.strictObject({ min: num, max: num, controlVsMobilityFactor: num }),
  height: z.strictObject({
    rangeBonusMinDiff: int,
    accuracyPerStep: num,
    accuracyStepMinDiff: int,
    maxAccuracyBonus: num,
  }),
  flank: z.strictObject({
    side: z.strictObject({ accuracy: num, damage: num }),
    back: z.strictObject({ accuracy: num, damage: num }),
  }),
  damage: z.strictObject({ resistanceFactor: num, minDamage: num, waterOnShallowWaterBonus: num }),
  energy: z.strictObject({
    maxBase: int,
    maxPerSpirit: int,
    regenBase: int,
    regenSpiritDivisor: int.min(1),
    regenFocusDivisor: int.min(1),
    focusCostReductionCap: int,
  }),
  cellEffects: z.strictObject({
    ice: z.strictObject({ rounds: int, moveExtraCost: int, accuracyBonusAgainstOccupant: num }),
    fire: z.strictObject({ rounds: int, damage: int, vegetationExtraRounds: int }),
    earth_wall: z.strictObject({ rounds: int }),
    gust: z.strictObject({ rounds: int, pushCells: int }),
  }),
  flee: z.strictObject({
    base: num,
    perMobility: num,
    perAdjacentEnemy: num,
    min: num,
    max: num,
  }),
  disconnect: z.strictObject({ graceRounds: int, allDisconnectedPauseSeconds: int }),
  arena: z.strictObject({ common: int, boss: int, masterTrial: int }),
  /** docs/05 §8 — utility AI weights per profile (consideration id → weight). PROVISÓRIO. */
  ai: z.strictObject({ profiles: z.record(z.string(), z.record(z.string(), num)) }),
});

export type Rules = z.infer<typeof RulesSchema>;
