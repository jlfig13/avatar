import type { GameData, TechniqueEffect } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { facingOf, getCell, inBounds, manhattan, neighbors4, step } from '../grid/grid.ts';
import { findPath, isHostile, stepCost } from '../pathfinding/pathfinding.ts';
import { requireCombatant, samePosition, updateCombatant } from '../state.ts';
import type { BattleState, Combatant, Facing, Position } from '../types.ts';

type Dash = Extract<TechniqueEffect, { kind: 'dash' }>;

const occupantAt = (state: BattleState, pos: Position, exceptId: string): Combatant | undefined =>
  state.combatants.find(
    (c) => c.id !== exceptId && c.alive && !c.fled && samePosition(c.position, pos),
  );

/** Straight dash (fire.surge): same row/column, every step legal, total cost within maxCells. */
function straightDashPath(
  state: BattleState,
  user: Combatant,
  dash: Dash,
  to: Position,
  data: GameData,
): Position[] | null {
  if (user.position.x !== to.x && user.position.y !== to.y) return null;
  const distance = manhattan(user.position, to);
  if (distance === 0 || distance > dash.maxCells) return null;
  const direction = facingOf(user.position, to, user.facing);
  const path: Position[] = [];
  let cost = 0;
  let current = user.position;
  for (let i = 0; i < distance; i++) {
    const next = step(current, direction);
    const occupant = occupantAt(state, next, user.id);
    if (occupant && isHostile(user, occupant)) return null;
    const stepValue = stepCost(state, user, current, next, data, dash.ignoresTerrainCost);
    if (stepValue === null) return null;
    cost += stepValue;
    if (cost > dash.maxCells) return null;
    path.push(next);
    current = next;
  }
  return occupantAt(state, to, user.id) ? null : path;
}

/** Path of a dash to a cell, or null if the dash cannot end there. */
export function dashPathToCell(
  state: BattleState,
  user: Combatant,
  dash: Dash,
  to: Position,
  data: GameData,
): Position[] | null {
  if (dash.straightLine) return straightDashPath(state, user, dash, to, data);
  const options = { budget: dash.maxCells, ignoreTerrainCost: dash.ignoresTerrainCost };
  return findPath(state, user.id, to, data, options)?.path ?? null;
}

/** Dash next to an enemy (monster.pounce): cheapest adjacent cell, ties in N, E, S, W order. */
export function dashPathToEnemy(
  state: BattleState,
  user: Combatant,
  dash: Dash,
  enemy: Position,
  data: GameData,
): Position[] | null {
  let best: { path: Position[]; cost: number } | null = null;
  const options = { budget: dash.maxCells, ignoreTerrainCost: dash.ignoresTerrainCost };
  for (const cell of neighbors4(state.grid, enemy)) {
    const result = dash.straightLine
      ? (() => {
          const path = straightDashPath(state, user, dash, cell, data);
          return path ? { path, cost: path.length } : null;
        })()
      : findPath(state, user.id, cell, data, options);
    if (result && (!best || result.cost < best.cost)) best = result;
  }
  return best?.path ?? null;
}

/** Moves the combatant along `path` (already validated), facing the last step. */
export function moveAlong(
  state: BattleState,
  id: string,
  path: readonly Position[],
): { state: BattleState; events: BattleEventBody[] } {
  const mover = requireCombatant(state, id);
  const last = path.at(-1);
  if (!last) return { state, events: [] };
  const facing = facingOf(path.at(-2) ?? mover.position, last, mover.facing);
  const next = updateCombatant(state, id, (c) => ({ ...c, position: last, facing }));
  return { state: next, events: [{ type: 'moved', combatantId: id, path, facing }] };
}

/**
 * Pushes a combatant up to `cells` cells in `direction`. Stops before a cell that is outside the
 * grid, blocked, occupied or not enterable by a normal step (height limits).
 */
export function push(
  state: BattleState,
  id: string,
  direction: Facing,
  cells: number,
  data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const target = requireCombatant(state, id);
  if (!target.alive) return { state, events: [] };
  let current = target.position;
  for (let i = 0; i < cells; i++) {
    const next = step(current, direction);
    if (!inBounds(state.grid, next) || getCell(state.grid, next)?.blocked) break;
    if (occupantAt(state, next, id)) break;
    if (stepCost(state, target, current, next, data, true) === null) break;
    current = next;
  }
  if (samePosition(current, target.position)) return { state, events: [] };
  const next = updateCombatant(state, id, (c) => ({ ...c, position: current }));
  return {
    state: next,
    events: [{ type: 'pushed', combatantId: id, from: target.position, to: current }],
  };
}
