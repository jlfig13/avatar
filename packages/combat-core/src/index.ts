import { SHARED_PACKAGE } from '@elemental/shared';

export { chooseActions, chooseActionsWithDebug } from './ai/chooseActions.ts';
export { CONSIDERATIONS } from './ai/considerations.ts';
export type { AiContext, Candidate, Consideration } from './ai/types.ts';
export { applyAction } from './apply.ts';
export {
  type CombatantInput,
  type CreateBattleInput,
  createBattle,
  maxEnergyFor,
} from './createBattle.ts';
export { predictTurnOrder, speedOf } from './ct/ct.ts';
export type { ApplyResult, BattleEvent, BattleEventBody } from './events.ts';
export {
  DIRECTIONS,
  facingOf,
  getCell,
  gridFromFile,
  inBounds,
  manhattan,
  neighbors4,
  sliceArena,
  sliceOrigin,
  step,
} from './grid/grid.ts';
export {
  type FlankModifiers,
  type FlankPosition,
  flankModifiers,
  flankPosition,
  heightAccuracyBonus,
} from './modifiers/position.ts';
export { fleeChance } from './outcome/outcome.ts';
export {
  findPath,
  getReachableCells,
  isHostile,
  type MoveOptions,
  movementPoints,
  stepCost,
} from './pathfinding/pathfinding.ts';
export { next, nextInt, pick, type RngState, rollInt, seedRng } from './rng.ts';
export {
  cellIndex,
  getCombatant,
  samePosition,
  updateCell,
  updateCombatant,
  updateGridCell,
} from './state.ts';
export {
  getAffectedCells,
  getTechniqueTargets,
  hasLineOfSight,
  lineCells,
} from './targeting/targeting.ts';
export {
  basePower,
  damageAmount,
  effectiveCost,
  healAmount,
  hitChance,
} from './techniques/formulas.ts';
export { turnTimeoutSeconds } from './turn/handlers.ts';
export type * from './types.ts';

export const COMBAT_CORE_PACKAGE = '@elemental/combat-core';
export const COMBAT_CORE_PACKAGE_DEPENDENCIES = [SHARED_PACKAGE] as const;
