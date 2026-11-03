import { SHARED_PACKAGE } from '@elemental/shared';

export { applyAction } from './apply.ts';
export {
  type CombatantInput,
  type CreateBattleInput,
  createBattle,
  maxEnergyFor,
} from './createBattle.ts';
export type { ApplyResult, BattleEvent, BattleEventBody } from './events.ts';
export { next, nextInt, pick, type RngState, rollInt, seedRng } from './rng.ts';
export {
  cellIndex,
  getCombatant,
  samePosition,
  updateCell,
  updateCombatant,
  updateGridCell,
} from './state.ts';
export type * from './types.ts';

export const COMBAT_CORE_PACKAGE = '@elemental/combat-core';
export const COMBAT_CORE_PACKAGE_DEPENDENCIES = [SHARED_PACKAGE] as const;
