import type { GameData } from '@elemental/shared';
import { type ApplyResult, type BattleEvent, reject, type StepResult } from './events.ts';
import type { Action, ActorAction, BattleState } from './types.ts';

export type ActionHandler<A extends Action> = (
  state: BattleState,
  action: A,
  data: GameData,
) => StepResult;

type HandlerMap = { [K in Action['type']]: ActionHandler<Extract<Action, { type: K }>> };

// Handlers not implemented yet reject; each issue replaces its stub.
const notImplemented = (): StepResult => reject('invalid_target');

const handlers: HandlerMap = {
  advance: notImplemented,
  move: notImplemented,
  technique: notImplemented,
  defend: notImplemented,
  flee: notImplemented,
  endTurn: notImplemented,
  timeout: notImplemented,
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
  return finalize(handler(state, action, data));
}
