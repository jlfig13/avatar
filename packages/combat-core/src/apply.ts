import type { GameData } from '@elemental/shared';
import type { ApplyResult, BattleEvent, StepResult } from './events.ts';
import { checkOutcome, handleFlee } from './outcome/outcome.ts';
import { handleTechnique } from './techniques/resolve.ts';
import { handleAdvance } from './turn/advance.ts';
import { handleDefend, handleEndTurn, handleMove, handleTimeout } from './turn/handlers.ts';
import type { Action, ActorAction, BattleState } from './types.ts';

export type ActionHandler<A extends Action> = (
  state: BattleState,
  action: A,
  data: GameData,
) => StepResult;

type HandlerMap = { [K in Action['type']]: ActionHandler<Extract<Action, { type: K }>> };

const handlers: HandlerMap = {
  advance: handleAdvance,
  move: handleMove,
  technique: handleTechnique,
  defend: handleDefend,
  flee: handleFlee,
  endTurn: handleEndTurn,
  timeout: handleTimeout,
};

/** Stamps increasing `seq` on events and stores the last one in `state.eventSeq`. */
export function finalize(result: StepResult): ApplyResult {
  if (!result.ok) return result;
  let seq = result.state.eventSeq;
  const events: BattleEvent[] = result.events.map((body) => {
    seq += 1;
    return { ...body, seq };
  });
  return { ok: true, state: { ...result.state, eventSeq: seq }, events };
}

function isActorAction(action: Action): action is ActorAction {
  return action.type !== 'advance';
}

/** docs/05 §9 — the only way to change a battle. Never mutates `state`. */
export function applyAction(state: BattleState, action: Action, data: GameData): ApplyResult {
  if (state.phase !== 'running') return { ok: false, reason: 'battle_over' };
  if (isActorAction(action) && state.turn?.combatantId !== action.actorId) {
    return { ok: false, reason: 'not_your_turn' };
  }
  const handler = handlers[action.type] as ActionHandler<Action>;
  const result = handler(state, action, data);
  if (!result.ok) return result;
  // docs/02 §11 step 7 — check victory, defeat or retreat after every action.
  const outcome = checkOutcome(result.state);
  return finalize({
    ok: true,
    state: outcome.state,
    events: [...result.events, ...outcome.events],
  });
}
