import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { tickCellEffects } from '../terrain/terrain.ts';
import type { BattleState } from '../types.ts';

/** Statuses whose lifetime is not counted in rounds (removed at the owner's next turn). */
const TURN_BOUND = new Set(['defending']);

/** End-of-round upkeep: statuses and cell effects tick down (docs/02 §4, §8). */
export function endRound(
  state: BattleState,
  _data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const events: BattleEventBody[] = [];
  const combatants = state.combatants.map((c) => {
    // docs/02 §7 — one reaction per round: reset for the new round.
    const fresh = c.reactionUsedThisRound ? { ...c, reactionUsedThisRound: false } : c;
    if (fresh.status.length === 0) return fresh;
    const status = fresh.status.flatMap((s) => {
      if (TURN_BOUND.has(s.id)) return [s];
      const roundsLeft = s.roundsLeft - 1;
      if (roundsLeft > 0) return [{ ...s, roundsLeft }];
      events.push({ type: 'statusExpired', targetId: c.id, statusId: s.id });
      return [];
    });
    return { ...fresh, status };
  });
  const terrain = tickCellEffects({ ...state, combatants });
  return { state: terrain.state, events: [...events, ...terrain.events] };
}
