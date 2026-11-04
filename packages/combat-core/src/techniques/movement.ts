import type { GameData, TechniqueEffect } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { facingOf, getCell, inBounds, manhattan, neighbors4, step } from '../grid/grid.ts';
import { findPath, isHostile, stepCost } from '../pathfinding/pathfinding.ts';
import { requireCombatant, samePosition, updateCombatant } from '../state.ts';
import { fireDamageAt } from '../terrain/terrain.ts';
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

/**
 * Moves the combatant along a validated path, facing the last step (docs/02 §8): entering a
 * burning cell deals fire damage and the path continues — unless the mover is defeated, which
 * stops it on that cell. Ending the movement on a gust cell pushes the mover with the wind.
 */
export function travel(
  state: BattleState,
  id: string,
  path: readonly Position[],
  data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const mover = requireCombatant(state, id);
  if (path.length === 0) return { state, events: [] };
  let next = state;
  const damage: BattleEventBody[] = [];
  const walked: Position[] = [];
  for (const cell of path) {
    walked.push(cell);
    const burned = fireDamageAt(next, id, cell, data);
    next = burned.state;
    damage.push(...burned.events);
    if (!requireCombatant(next, id).alive) break;
  }
  const last = walked.at(-1) ?? mover.position;
  const facing = facingOf(walked.at(-2) ?? mover.position, last, mover.facing);
  next = updateCombatant(next, id, (c) => ({ ...c, position: last, facing }));
  const events: BattleEventBody[] = [
    { type: 'moved', combatantId: id, path: walked, facing },
    ...damage,
  ];
  const gust = getCell(next.grid, last)?.effect;
  if (gust?.kind === 'gust' && gust.direction && requireCombatant(next, id).alive) {
    const pushed = push(next, id, gust.direction, data.rules.cellEffects.gust.pushCells, data);
    next = pushed.state;
    events.push(...pushed.events);
  }
  return { state: next, events };
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
  const moved = updateCombatant(state, id, (c) => ({ ...c, position: current }));
  const burned = fireDamageAt(moved, id, current, data);
  return {
    state: burned.state,
    events: [
      { type: 'pushed', combatantId: id, from: target.position, to: current },
      ...burned.events,
    ],
  };
}
