import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import type { BattleState } from '../types.ts';

/** docs/02 §11 step 3 — start-of-turn effects. Extended by CORE-06, CORE-10 and CORE-11. */
export function startTurn(
  state: BattleState,
  actorId: string,
  _data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  return { state, events: [{ type: 'turnStarted', combatantId: actorId, energyRegen: 0 }] };
}
