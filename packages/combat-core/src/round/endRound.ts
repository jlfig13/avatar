import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import type { BattleState } from '../types.ts';

/** Statuses whose lifetime is not counted in rounds (removed at the owner's next turn). */
const TURN_BOUND = new Set(['defending']);

/** End-of-round upkeep: status durations tick down (docs/02 §4 — rounds count durations). */
export function endRound(
  state: BattleState,
  _data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const events: BattleEventBody[] = [];
  const combatants = state.combatants.map((c) => {
    if (c.status.length === 0) return c;
    const status = c.status.flatMap((s) => {
      if (TURN_BOUND.has(s.id)) return [s];
      const roundsLeft = s.roundsLeft - 1;
      if (roundsLeft > 0) return [{ ...s, roundsLeft }];
      events.push({ type: 'statusExpired', targetId: c.id, statusId: s.id });
      return [];
    });
    return { ...c, status };
  });
  return { state: { ...state, combatants }, events };
}
