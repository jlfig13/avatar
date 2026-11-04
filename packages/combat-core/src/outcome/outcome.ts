import type { GameData } from '@elemental/shared';
import { finishTurn, isActive } from '../ct/ct.ts';
import { accept, type BattleEventBody, reject, type StepResult } from '../events.ts';
import { getCell, manhattan } from '../grid/grid.ts';
import { isHostile } from '../pathfinding/pathfinding.ts';
import { rollInt } from '../rng.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import { resetTimeouts } from '../turn/handlers.ts';
import type { Action, BattleState, Combatant } from '../types.ts';

// docs/02 §9 — end of battle and retreat.

/** clamp(base + mobility × perMobility − perAdjacentEnemy × adjacent enemies, min, max) in %. */
export function fleeChance(state: BattleState, actor: Combatant, data: GameData): number {
  const { flee } = data.rules;
  const adjacent = state.combatants.filter(
    (c) => isActive(c) && isHostile(actor, c) && manhattan(c.position, actor.position) === 1,
  ).length;
  const raw =
    flee.base + actor.attributes.mobility * flee.perMobility - flee.perAdjacentEnemy * adjacent;
  return Math.min(flee.max, Math.max(flee.min, raw));
}

export function handleFlee(
  state: BattleState,
  action: Extract<Action, { type: 'flee' }>,
  data: GameData,
): StepResult {
  const turn = state.turn;
  if (!turn) throw new Error('no active turn');
  if (turn.hasActed) return reject('already_acted');
  const actor = requireCombatant(state, action.actorId);
  if (!getCell(state.grid, actor.position)?.escape) return reject('not_on_escape_cell');
  const chance = fleeChance(state, actor, data);
  const [roll, rolled] = rollInt(resetTimeouts(state, actor.id), 1, 100);
  const success = roll <= chance;
  let next: BattleState = { ...rolled, turn: { ...turn, hasActed: true } };
  const events: BattleEventBody[] = [
    { type: 'fleeAttempt', combatantId: actor.id, chance, success },
  ];
  if (success) {
    // Leaving the battle also ends the turn.
    next = updateCombatant(next, actor.id, (c) => ({ ...c, fled: true }));
    const ended = finishTurn(next, data);
    next = ended.state;
    events.push(...ended.events);
  }
  return accept(next, events);
}

/** Victory / defeat / retreat check after every action. */
export function checkOutcome(state: BattleState): {
  state: BattleState;
  events: BattleEventBody[];
} {
  if (state.phase !== 'running') return { state, events: [] };
  const players = state.combatants.filter((c) => c.team === 'players');
  const enemies = state.combatants.filter((c) => c.team === 'enemies');
  const playersActive = players.some(isActive);
  let result: 'victory' | 'defeat' | 'fled' | null = null;
  if (!playersActive) result = players.some((c) => c.fled) ? 'fled' : 'defeat';
  else if (enemies.length > 0 && !enemies.some(isActive)) result = 'victory';
  if (!result) return { state, events: [] };
  return {
    state: { ...state, phase: result, turn: null },
    events: [{ type: 'battleEnded', result, rounds: state.round }],
  };
}
