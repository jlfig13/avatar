import type { GameData } from '@elemental/shared';
import { tickUntilReady } from '../ct/ct.ts';
import { accept, type BattleEventBody, reject, type StepResult } from '../events.ts';
import type { BattleState } from '../types.ts';
import { startTurn } from './startTurn.ts';

/** `advance`: ticks the CT bar until someone gets the turn, then starts that turn. */
export function handleAdvance(state: BattleState, _action: unknown, data: GameData): StepResult {
  if (state.turn) return reject('not_your_turn');
  const events: BattleEventBody[] = [];
  let next = state;
  if (next.round === 0) {
    next = { ...next, round: 1 };
    events.push({ type: 'roundStarted', round: 1 });
  }
  const { combatants, actorId } = tickUntilReady(next.combatants, data);
  next = {
    ...next,
    combatants,
    turn: { combatantId: actorId, hasMoved: false, hasActed: false, usedTechniqueId: null },
  };
  const started = startTurn(next, actorId, data);
  return accept(started.state, [...events, ...started.events]);
}
