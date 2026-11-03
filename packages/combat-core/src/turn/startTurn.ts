import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import type { BattleState } from '../types.ts';

const DEFENDING = 'defending';

/** docs/02 §11 step 3 — start-of-turn effects. Energy regen arrives with CORE-10, fire with CORE-11. */
export function startTurn(
  state: BattleState,
  actorId: string,
  _data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const events: BattleEventBody[] = [];
  let next = state;
  if (requireCombatant(next, actorId).status.some((s) => s.id === DEFENDING)) {
    next = updateCombatant(next, actorId, (c) => ({
      ...c,
      status: c.status.filter((s) => s.id !== DEFENDING),
    }));
    events.push({ type: 'statusExpired', targetId: actorId, statusId: DEFENDING });
  }
  events.unshift({ type: 'turnStarted', combatantId: actorId, energyRegen: 0 });
  return { state: next, events };
}
