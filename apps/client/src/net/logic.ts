import {
  type BattleState,
  getReachableCells,
  getTechniqueTargets,
  type Position,
} from '@elemental/combat-core';
import type { GameData } from '@elemental/game-data';

// CLI-06 — pure helpers of the network layer (unit tested).

/** Intent payload sent to the server (validated there by IntentSchema, docs/04 §5.1). */
export type IntentBody =
  | { kind: 'move'; to: Position }
  | { kind: 'technique'; techniqueId: string; target: Position }
  | { kind: 'defend' }
  | { kind: 'flee' }
  | { kind: 'endTurn' };

const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

/** What a click on `cell` means right now: a technique on a valid target, a move, or nothing. */
export function intentForClick(
  state: BattleState,
  actorId: string,
  techniqueId: string | null,
  cell: Position,
  data: GameData,
): IntentBody | null {
  const turn = state.turn;
  if (state.phase !== 'running' || turn?.combatantId !== actorId) return null;
  if (techniqueId) {
    if (turn.hasActed) return null;
    const valid = getTechniqueTargets(state, actorId, techniqueId, data).some((p) => same(p, cell));
    return valid ? { kind: 'technique', techniqueId, target: cell } : null;
  }
  if (turn.hasMoved) return null;
  return getReachableCells(state, actorId, data).some((p) => same(p, cell))
    ? { kind: 'move', to: cell }
    : null;
}

/** docs/04 §5.2 — a gap in `seq` means events were missed: ask for a snapshot. */
export function hasSeqGap(lastEventSeq: number, fromSeq: number): boolean {
  return fromSeq !== lastEventSeq + 1;
}

/** ws://host:port → http://host:port (same server serves the HTTP routes). */
export function httpBaseFrom(wsUrl: string): string {
  return wsUrl.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/$/, '');
}

/**
 * The server DTO omits the RNG (docs/04, ADR-023). The client only uses the state for previews,
 * never to resolve actions, so neutral RNG fields are enough to satisfy the core type.
 */
export function stateFromDto(dto: Omit<BattleState, 'seed' | 'rngState'>): BattleState {
  return { ...dto, seed: 0, rngState: 0 };
}
