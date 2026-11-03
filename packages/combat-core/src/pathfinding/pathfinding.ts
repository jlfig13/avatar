import type { GameData } from '@elemental/shared';
import { getCell, inBounds, manhattan, neighbors4 } from '../grid/grid.ts';
import { requireCombatant } from '../state.ts';
import type { BattleState, Combatant, Position } from '../types.ts';

// docs/02 §3.1 — movement. All numbers come from rules.json.

export interface MoveOptions {
  /** Movement budget; defaults to the combatant's movement points. */
  readonly budget?: number;
  /** Ignore extra terrain costs (shallow water, ice) — used by water.glide. */
  readonly ignoreTerrainCost?: boolean;
}

export const movementPoints = (c: Combatant, data: GameData): number =>
  data.rules.movement.base +
  Math.floor(c.attributes.mobility / data.rules.movement.mobilityDivisor);

const key = (p: Position): number => p.y * 1000 + p.x;

export const isHostile = (a: Combatant, b: Combatant): boolean =>
  a.team !== b.team || a.team === 'third_party';

function occupants(state: BattleState, moverId: string): Map<number, Combatant> {
  const map = new Map<number, Combatant>();
  for (const c of state.combatants) {
    if (c.id !== moverId && c.alive && !c.fled) map.set(key(c.position), c);
  }
  return map;
}

/** Cost to step from `from` to the adjacent `to`, or null if the step is not allowed. */
export function stepCost(
  state: BattleState,
  mover: Combatant,
  from: Position,
  to: Position,
  data: GameData,
  ignoreTerrainCost = false,
): number | null {
  const source = getCell(state.grid, from);
  const target = getCell(state.grid, to);
  if (!source || !target) return null;
  if (target.blocked || target.effect?.kind === 'earth_wall') return null;
  const { movement } = data.rules;
  const dh = target.height - source.height;
  if (dh > movement.jumpUp || -dh > movement.jumpDown) return null;
  let cost = 1;
  if (!ignoreTerrainCost) {
    const waterImmune = movement.waterUsersIgnoreWater && mover.element === 'water';
    if (target.terrain === 'shallow_water' && !waterImmune)
      cost += movement.extraCost.shallow_water;
    if (target.effect?.kind === 'ice') cost += movement.extraCost.ice;
  }
  return cost;
}

interface Node {
  readonly pos: Position;
  readonly cost: number;
  readonly prev: number | null;
}

/**
 * Best-first search limited by the budget. Without `target` it is Dijkstra (explores everything
 * reachable); with `target` it is A* with the Manhattan heuristic (admissible: every step costs ≥ 1)
 * and stops when the target is settled. Neighbour order N, E, S, W keeps results deterministic.
 */
function search(
  state: BattleState,
  mover: Combatant,
  data: GameData,
  options: MoveOptions,
  target?: Position,
): Map<number, Node> {
  const budget = options.budget ?? movementPoints(mover, data);
  const others = occupants(state, mover.id);
  const start: Node = { pos: mover.position, cost: 0, prev: null };
  const nodes = new Map<number, Node>([[key(mover.position), start]]);
  const open: Node[] = [start];
  const score = (n: Node) => n.cost + (target ? manhattan(n.pos, target) : 0);
  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (score(open[i] as Node) < score(open[best] as Node)) best = i;
    }
    const current = open.splice(best, 1)[0] as Node;
    if ((nodes.get(key(current.pos))?.cost ?? Number.POSITIVE_INFINITY) < current.cost) continue;
    if (target && key(current.pos) === key(target)) break;
    for (const next of neighbors4(state.grid, current.pos)) {
      const occupant = others.get(key(next));
      if (occupant && isHostile(mover, occupant)) continue; // enemies block; allies can be crossed
      const step = stepCost(state, mover, current.pos, next, data, options.ignoreTerrainCost);
      if (step === null) continue;
      const cost = current.cost + step;
      if (cost > budget) continue;
      const known = nodes.get(key(next));
      if (known && known.cost <= cost) continue;
      const node = { pos: next, cost, prev: key(current.pos) };
      nodes.set(key(next), node);
      open.push(node);
    }
  }
  return nodes;
}

/** Every cell the combatant can end its movement on (excludes its own cell and occupied cells). */
export function getReachableCells(
  state: BattleState,
  actorId: string,
  data: GameData,
  options: MoveOptions = {},
): Position[] {
  const mover = requireCombatant(state, actorId);
  const others = occupants(state, actorId);
  const result: Position[] = [];
  for (const node of search(state, mover, data, options).values()) {
    if (node.cost > 0 && !others.has(key(node.pos))) result.push(node.pos);
  }
  return result.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Path without the start cell and its cost, or null if `to` cannot be reached within the budget. */
export function findPath(
  state: BattleState,
  actorId: string,
  to: Position,
  data: GameData,
  options: MoveOptions = {},
): { path: Position[]; cost: number } | null {
  const mover = requireCombatant(state, actorId);
  if (!inBounds(state.grid, to) || key(to) === key(mover.position)) return null;
  if (occupants(state, actorId).has(key(to))) return null;
  const nodes = search(state, mover, data, options, to);
  const end = nodes.get(key(to));
  if (!end) return null;
  const path: Position[] = [];
  let cursor: Node | undefined = end;
  while (cursor && cursor.prev !== null) {
    path.unshift(cursor.pos);
    cursor = nodes.get(cursor.prev);
  }
  return { path, cost: end.cost };
}
