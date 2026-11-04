import {
  type BattleState,
  getAffectedCells,
  getReachableCells,
  getTargetingPreview,
  type Position,
} from '@elemental/combat-core';
import type { GameData } from '@elemental/game-data';

// CLI-04 — previews computed with the same combat-core the server uses (CLAUDE.md rule 7).

export type HighlightKind = 'reachable' | 'inRange' | 'noLineOfSight' | 'target' | 'area' | 'hover';

export interface Overlay {
  readonly cells: ReadonlyMap<string, HighlightKind>;
}

const key = (p: Position) => `${p.x},${p.y}`;
const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

/** Later kinds win: area over target over the others; the hovered cell is always outlined. */
export function computeOverlay(
  state: BattleState,
  actorId: string,
  techniqueId: string | null,
  hover: Position | null,
  data: GameData,
): Overlay {
  const cells = new Map<string, HighlightKind>();
  const turn = state.turn;
  const myTurn = turn?.combatantId === actorId && state.phase === 'running';
  if (myTurn && !techniqueId && !turn.hasMoved) {
    for (const p of getReachableCells(state, actorId, data)) cells.set(key(p), 'reachable');
  }
  if (myTurn && techniqueId && !turn.hasActed) {
    const preview = getTargetingPreview(state, actorId, techniqueId, data);
    for (const p of preview.inRange) cells.set(key(p), 'inRange');
    for (const p of preview.noLineOfSight) cells.set(key(p), 'noLineOfSight');
    for (const p of preview.valid) cells.set(key(p), 'target');
    if (hover && preview.valid.some((p) => same(p, hover))) {
      for (const p of getAffectedCells(state, actorId, techniqueId, hover, data))
        cells.set(key(p), 'area');
    }
  }
  if (hover && !cells.has(key(hover))) cells.set(key(hover), 'hover');
  return { cells };
}

export const parseKey = (k: string): Position => {
  const [x = '0', y = '0'] = k.split(',');
  return { x: Number(x), y: Number(y) };
};
