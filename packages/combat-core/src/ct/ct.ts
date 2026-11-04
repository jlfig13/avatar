import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { endRound } from '../round/endRound.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import type { BattleState, Combatant } from '../types.ts';

// docs/02 §4 — CT bar. Numbers come from rules.ct.

export const speedOf = (c: Combatant, data: GameData): number =>
  data.rules.ct.speedBase + Math.floor(c.attributes.mobility / data.rules.ct.speedMobilityDivisor);

export const isActive = (c: Combatant): boolean => c.alive && !c.fled;

/** Among combatants at/over the threshold: higher speed first, then lower id (lexicographic). */
function readyCombatant(combatants: readonly Combatant[], data: GameData): Combatant | undefined {
  const ready = combatants.filter((c) => isActive(c) && c.ct >= data.rules.ct.threshold);
  ready.sort(
    (a, b) => speedOf(b, data) - speedOf(a, data) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return ready[0];
}

/** Adds `speed` to every active combatant, tick by tick, until someone reaches the threshold. */
export function tickUntilReady(
  combatants: readonly Combatant[],
  data: GameData,
): { combatants: readonly Combatant[]; actorId: string } {
  if (!combatants.some((c) => isActive(c) && speedOf(c, data) > 0)) {
    throw new Error('tickUntilReady: no active combatant can gain CT');
  }
  let current = combatants;
  for (;;) {
    const ready = readyCombatant(current, data);
    if (ready) return { combatants: current, actorId: ready.id };
    current = current.map((c) => (isActive(c) ? { ...c, ct: c.ct + speedOf(c, data) } : c));
  }
}

export const ctDelayOf = (techniqueId: string | null, data: GameData): number =>
  techniqueId ? (data.techniques[techniqueId]?.ctDelay ?? 0) : 0;

/**
 * Ends the active turn: ct = ct - threshold - delay, marks the actor as having acted this round
 * and closes the round when every active combatant has acted. Leaves `turn` null.
 */
export function finishTurn(
  state: BattleState,
  data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const turn = state.turn;
  if (!turn) throw new Error('finishTurn: no active turn');
  const actor = requireCombatant(state, turn.combatantId);
  const ctAfter = actor.ct - data.rules.ct.threshold - ctDelayOf(turn.usedTechniqueId, data);
  let next = updateCombatant(state, actor.id, (c) => ({ ...c, ct: ctAfter }));
  const events: BattleEventBody[] = [{ type: 'turnEnded', combatantId: actor.id, ctAfter }];
  const acted = next.actedThisRound.includes(actor.id)
    ? next.actedThisRound
    : [...next.actedThisRound, actor.id];
  next = { ...next, turn: null, actedThisRound: acted };
  if (next.combatants.filter(isActive).every((c) => acted.includes(c.id))) {
    const upkeep = endRound(next, data);
    const round = next.round + 1;
    next = { ...upkeep.state, round, actedThisRound: [] };
    events.push(...upkeep.events, { type: 'roundStarted', round });
  }
  return { state: next, events };
}

/** docs/02 §4 — preview of the next `count` turns (ticks only, no actions, no delays). */
export function predictTurnOrder(state: BattleState, count: number, data: GameData): string[] {
  const order: string[] = [];
  let combatants = state.combatants;
  const threshold = data.rules.ct.threshold;
  const consume = (id: string, extra = 0) =>
    combatants.map((c) => (c.id === id ? { ...c, ct: c.ct - threshold - extra } : c));
  if (state.turn && order.length < count) {
    order.push(state.turn.combatantId);
    combatants = consume(state.turn.combatantId, ctDelayOf(state.turn.usedTechniqueId, data));
  }
  while (order.length < count && combatants.some(isActive)) {
    const result = tickUntilReady(combatants, data);
    order.push(result.actorId);
    combatants = result.combatants;
    combatants = consume(result.actorId);
  }
  return order;
}
