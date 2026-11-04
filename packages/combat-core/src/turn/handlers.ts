import type { GameData } from '@elemental/shared';
import { finishTurn } from '../ct/ct.ts';
import { accept, type BattleEventBody, reject, type StepResult } from '../events.ts';
import { findPath } from '../pathfinding/pathfinding.ts';
import { reactToApproach } from '../reactions/reactions.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import { travel } from '../techniques/movement.ts';
import type { Action, BattleState, TurnState } from '../types.ts';

type Of<T extends Action['type']> = Extract<Action, { type: T }>;

export const DEFENDING = 'defending';

const activeTurn = (state: BattleState): TurnState => {
  if (!state.turn) throw new Error('no active turn'); // applyAction checks this before dispatch
  return state.turn;
};

/** docs/02 §5 — any manual action resets the AFK counter. */
export const resetTimeouts = (state: BattleState, id: string): BattleState =>
  updateCombatant(state, id, (c) =>
    c.consecutiveTimeouts === 0 ? c : { ...c, consecutiveTimeouts: 0 },
  );

export function handleMove(state: BattleState, action: Of<'move'>, data: GameData): StepResult {
  const turn = activeTurn(state);
  if (turn.hasMoved) return reject('already_moved');
  const result = findPath(state, action.actorId, action.to, data);
  if (!result) return reject('unreachable');
  const moved = travel(resetTimeouts(state, action.actorId), action.actorId, result.path, data);
  const from = requireCombatant(state, action.actorId).position;
  const approached = reactToApproach(moved.state, action.actorId, from, data);
  return accept({ ...approached.state, turn: { ...turn, hasMoved: true } }, [
    ...moved.events,
    ...approached.events,
  ]);
}

/** Defending lasts until the defender's next turn (removed in startTurn), not by rounds. */
function applyDefend(state: BattleState, actorId: string, data: GameData): StepResult {
  const turn = activeTurn(state);
  if (turn.hasActed) return reject('already_acted');
  const magnitude = data.rules.turn.defendDamageMultiplier;
  const next = updateCombatant(state, actorId, (c) => ({
    ...c,
    status: [
      ...c.status.filter((s) => s.id !== DEFENDING),
      { id: DEFENDING, roundsLeft: 1, magnitude },
    ],
  }));
  return accept({ ...next, turn: { ...turn, hasActed: true } }, [
    { type: 'defended', combatantId: actorId },
  ]);
}

export function handleDefend(state: BattleState, action: Of<'defend'>, data: GameData): StepResult {
  return applyDefend(resetTimeouts(state, action.actorId), action.actorId, data);
}

export function handleEndTurn(
  state: BattleState,
  action: Of<'endTurn'>,
  data: GameData,
): StepResult {
  const ended = finishTurn(resetTimeouts(state, action.actorId), data);
  return accept(ended.state, ended.events);
}

/** docs/02 §5 — on timeout: Defend automatically (if the action is still free) and pass. */
export function handleTimeout(
  state: BattleState,
  action: Of<'timeout'>,
  data: GameData,
): StepResult {
  const actor = requireCombatant(state, action.actorId);
  const consecutive = actor.consecutiveTimeouts + 1;
  let next = updateCombatant(state, actor.id, (c) => ({ ...c, consecutiveTimeouts: consecutive }));
  const events: BattleEventBody[] = [{ type: 'timedOut', combatantId: actor.id, consecutive }];
  if (!activeTurn(next).hasActed) {
    const defended = applyDefend(next, actor.id, data);
    if (defended.ok) {
      next = defended.state;
      events.push(...defended.events);
    }
  }
  const ended = finishTurn(next, data);
  return accept(ended.state, [...events, ...ended.events]);
}

/** docs/02 §5 — AFK: after N consecutive timeouts the player's turn time drops. */
export function turnTimeoutSeconds(state: BattleState, actorId: string, data: GameData): number {
  const { turn } = data.rules;
  const actor = requireCombatant(state, actorId);
  return actor.consecutiveTimeouts >= turn.afkAfterConsecutive
    ? turn.afkTimeoutSeconds
    : turn.timeoutSeconds;
}
