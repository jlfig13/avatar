import type { GameData, Technique } from '@elemental/shared';
import { facingOf, getCell, inBounds, manhattan, step } from '../grid/grid.ts';
import { isHostile } from '../pathfinding/pathfinding.ts';
import { requireCombatant } from '../state.ts';
import type { BattleState, Combatant, Facing, Grid, Position } from '../types.ts';

// docs/02 §6.1–6.3 — range, area, line of sight and the height range bonus.

/** Bresenham cells between a and b, without the two end points. */
export function lineCells(a: Position, b: Position): Position[] {
  const cells: Position[] = [];
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx + dy;
  let { x, y } = a;
  while (x !== b.x || y !== b.y) {
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
    if (x !== b.x || y !== b.y) cells.push({ x, y });
  }
  return cells;
}

/** docs/02 §6.2 — blocked, earth_wall or too-high cells on the line block sight. Combatants do not. */
export function hasLineOfSight(grid: Grid, from: Position, to: Position): boolean {
  const origin = getCell(grid, from);
  const target = getCell(grid, to);
  if (!origin || !target) return false;
  const limit = Math.max(origin.height, target.height) + 1;
  return lineCells(from, to).every((pos) => {
    const cell = getCell(grid, pos);
    return !!cell && !cell.blocked && cell.effect?.kind !== 'earth_wall' && cell.height <= limit;
  });
}

export function findTechnique(data: GameData, id: string): Technique | undefined {
  return data.techniques[id];
}

/** docs/02 §6.3 — +1 max range when the attacker is `rangeBonusMinDiff` or more levels above. */
export function maxRangeTo(
  grid: Grid,
  technique: Technique,
  from: Position,
  to: Position,
  data: GameData,
): number {
  if (!technique.rangeBonusFromHeight) return technique.range.max;
  const dh = (getCell(grid, from)?.height ?? 0) - (getCell(grid, to)?.height ?? 0);
  return technique.range.max + (dh >= data.rules.height.rangeBonusMinDiff ? 1 : 0);
}

const occupantAt = (state: BattleState, pos: Position): Combatant | undefined =>
  state.combatants.find(
    (c) => c.alive && !c.fled && c.position.x === pos.x && c.position.y === pos.y,
  );

/** Whether `target` matches the technique's target kind (enemy / ally / self / cell). */
export function isValidTargetKind(
  state: BattleState,
  user: Combatant,
  technique: Technique,
  target: Position,
): boolean {
  const occupant = occupantAt(state, target);
  switch (technique.target) {
    case 'enemy':
      return !!occupant && occupant.id !== user.id && isHostile(user, occupant);
    case 'ally':
      return !!occupant && (occupant.id === user.id || !isHostile(user, occupant));
    case 'self':
      return target.x === user.position.x && target.y === user.position.y;
    case 'cell':
      return !getCell(state.grid, target)?.blocked;
  }
}

export type TargetCheck = 'ok' | 'out_of_range' | 'no_line_of_sight' | 'invalid_target';

/** Validates a target from `from` (defaults to the user's position). */
export function checkTarget(
  state: BattleState,
  user: Combatant,
  technique: Technique,
  target: Position,
  data: GameData,
  from: Position = user.position,
): TargetCheck {
  if (!inBounds(state.grid, target)) return 'out_of_range';
  const distance = manhattan(from, target);
  if (
    distance < technique.range.min ||
    distance > maxRangeTo(state.grid, technique, from, target, data)
  ) {
    return 'out_of_range';
  }
  // Range-1 techniques never require line of sight (docs/02 §6.2).
  if (technique.requiresLineOfSight && distance > 1 && !hasLineOfSight(state.grid, from, target)) {
    return 'no_line_of_sight';
  }
  const virtualUser = from === user.position ? user : { ...user, position: from };
  return isValidTargetKind(state, virtualUser, technique, target) ? 'ok' : 'invalid_target';
}

/** docs/05 §9 — every valid target cell for the technique, optionally from another cell. */
export function getTechniqueTargets(
  state: BattleState,
  actorId: string,
  techniqueId: string,
  data: GameData,
  from?: Position,
): Position[] {
  const user = requireCombatant(state, actorId);
  const technique = findTechnique(data, techniqueId);
  if (!technique) return [];
  const origin = from ?? user.position;
  const reach = technique.range.max + (technique.rangeBonusFromHeight ? 1 : 0);
  const result: Position[] = [];
  for (let y = origin.y - reach; y <= origin.y + reach; y++) {
    for (let x = origin.x - reach; x <= origin.x + reach; x++) {
      if (checkTarget(state, user, technique, { x, y }, data, origin) === 'ok')
        result.push({ x, y });
    }
  }
  return result;
}

const PERPENDICULAR: Readonly<Record<Facing, Facing>> = { N: 'E', S: 'E', E: 'S', W: 'S' };

/** Cells hit by the technique's area, clipped to the grid. */
export function areaCells(
  grid: Grid,
  technique: Technique,
  userPos: Position,
  userFacing: Facing,
  target: Position,
): Position[] {
  const cells: Position[] = [];
  const { area } = technique;
  switch (area.shape) {
    case 'single':
      cells.push(target);
      break;
    case 'self':
      cells.push(userPos);
      break;
    case 'cross':
      cells.push(target);
      for (const dir of ['N', 'E', 'S', 'W'] as const) {
        for (let i = 1; i <= area.radius; i++) cells.push(step(target, dir, i));
      }
      break;
    case 'line': {
      // Perpendicular to the user's direction, centred on the target.
      const direction = facingOf(userPos, target, userFacing);
      const axis = PERPENDICULAR[direction];
      const before = Math.floor((area.length - 1) / 2);
      for (let i = -before; i < area.length - before; i++) cells.push(step(target, axis, i));
      break;
    }
  }
  return cells.filter((p) => inBounds(grid, p));
}

/** docs/05 §9 */
export function getAffectedCells(
  state: BattleState,
  actorId: string,
  techniqueId: string,
  target: Position,
  data: GameData,
): Position[] {
  const user = requireCombatant(state, actorId);
  const technique = findTechnique(data, techniqueId);
  if (!technique) return [];
  return areaCells(state.grid, technique, user.position, user.facing, target);
}
