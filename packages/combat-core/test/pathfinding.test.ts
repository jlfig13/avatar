import { describe, expect, it } from 'vitest';
import { findPath, getReachableCells, movementPoints } from '../src/pathfinding/pathfinding.ts';
import type { Position } from '../src/types.ts';
import { emptyData as data, makeBattle, makeCombatant, makeGrid } from './factories.ts';

const has = (cells: Position[], p: Position) => cells.some((c) => c.x === p.x && c.y === p.y);

describe('movementPoints', () => {
  it('is base + floor(mobility / divisor)', () => {
    const c = makeCombatant({
      id: 'a',
      attributes: { power: 0, control: 0, resistance: 0, mobility: 19, spirit: 0, focus: 0 },
    });
    expect(movementPoints(c, data)).toBe(4);
  });
});

describe('findPath', () => {
  it('goes around an obstacle', () => {
    // wall at x=2 for y=0..1; mover at (1,0) → (3,0) must detour through y=2
    const grid = makeGrid(5, 5, ({ x, y }) => ({ blocked: x === 2 && y <= 1 }));
    const state = makeBattle({
      grid,
      combatants: [makeCombatant({ id: 'p1', position: { x: 1, y: 0 } })],
    });
    const result = findPath(state, 'p1', { x: 3, y: 0 }, data, { budget: 10 });
    expect(result?.cost).toBe(6);
    expect(result?.path.some((p) => p.x === 2 && p.y <= 1)).toBe(false);
    expect(result?.path.at(-1)).toEqual({ x: 3, y: 0 });
  });

  it('cannot climb 3 levels in one step but can climb 2', () => {
    const grid = makeGrid(3, 1, ({ x }) => ({ height: x === 1 ? 3 : x === 2 ? 2 : 0 }));
    const state = makeBattle({
      grid,
      combatants: [makeCombatant({ id: 'p1', position: { x: 0, y: 0 } })],
    });
    expect(findPath(state, 'p1', { x: 1, y: 0 }, data)).toBeNull();
    const two = makeBattle({
      grid: makeGrid(2, 1, ({ x }) => ({ height: x === 1 ? 2 : 0 })),
      combatants: [makeCombatant({ id: 'p1', position: { x: 0, y: 0 } })],
    });
    expect(findPath(two, 'p1', { x: 1, y: 0 }, data)?.cost).toBe(1);
  });

  it('can descend up to 3 levels but not 4', () => {
    const three = makeBattle({
      grid: makeGrid(2, 1, ({ x }) => ({ height: x === 0 ? 3 : 0 })),
      combatants: [makeCombatant({ id: 'p1', position: { x: 0, y: 0 } })],
    });
    expect(findPath(three, 'p1', { x: 1, y: 0 }, data)).not.toBeNull();
    const four = makeBattle({
      grid: makeGrid(2, 1, ({ x }) => ({ height: x === 0 ? 4 : 0 })),
      combatants: [makeCombatant({ id: 'p1', position: { x: 0, y: 0 } })],
    });
    expect(findPath(four, 'p1', { x: 1, y: 0 }, data)).toBeNull();
  });

  it('shallow water costs 2 for fire users and 1 for water users', () => {
    const grid = makeGrid(2, 1, ({ x }) => ({ terrain: x === 1 ? 'shallow_water' : 'ground' }));
    const fire = makeBattle({ grid, combatants: [makeCombatant({ id: 'p1', element: 'fire' })] });
    const water = makeBattle({ grid, combatants: [makeCombatant({ id: 'p1', element: 'water' })] });
    expect(findPath(fire, 'p1', { x: 1, y: 0 }, data)?.cost).toBe(2);
    expect(findPath(water, 'p1', { x: 1, y: 0 }, data)?.cost).toBe(1);
  });

  it('ice costs +1 unless terrain cost is ignored', () => {
    const grid = makeGrid(2, 1, ({ x }) =>
      x === 1 ? { effect: { kind: 'ice', roundsLeft: 2, sourceId: 'x' } } : {},
    );
    const state = makeBattle({ grid, combatants: [makeCombatant({ id: 'p1', element: 'water' })] });
    expect(findPath(state, 'p1', { x: 1, y: 0 }, data)?.cost).toBe(2);
    expect(findPath(state, 'p1', { x: 1, y: 0 }, data, { ignoreTerrainCost: true })?.cost).toBe(1);
  });

  it('can pass through an ally but not stop on it; an enemy blocks', () => {
    const grid = makeGrid(3, 1);
    const withAlly = makeBattle({
      grid,
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 0, y: 0 } }),
        makeCombatant({ id: 'p2', position: { x: 1, y: 0 } }),
      ],
    });
    expect(findPath(withAlly, 'p1', { x: 2, y: 0 }, data)?.path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(findPath(withAlly, 'p1', { x: 1, y: 0 }, data)).toBeNull();
    expect(has(getReachableCells(withAlly, 'p1', data), { x: 1, y: 0 })).toBe(false);
    expect(has(getReachableCells(withAlly, 'p1', data), { x: 2, y: 0 })).toBe(true);

    const withEnemy = makeBattle({
      grid,
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 0, y: 0 } }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 1, y: 0 } }),
      ],
    });
    expect(findPath(withEnemy, 'p1', { x: 2, y: 0 }, data)).toBeNull();
  });

  it('ignores defeated combatants for occupancy', () => {
    const state = makeBattle({
      grid: makeGrid(3, 1),
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 0, y: 0 } }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 1, y: 0 }, alive: false }),
      ],
    });
    expect(findPath(state, 'p1', { x: 1, y: 0 }, data)).not.toBeNull();
  });
});

describe('getReachableCells', () => {
  it('returns cells within the movement points (diamond on open ground)', () => {
    const state = makeBattle({
      combatants: [makeCombatant({ id: 'p1', position: { x: 5, y: 5 } })],
    });
    // mobility 10 → 3 + 1 = 4 points → diamond of radius 4 without the centre: 2·4·5 = 40 cells
    const cells = getReachableCells(state, 'p1', data);
    expect(cells).toHaveLength(40);
    expect(has(cells, { x: 5, y: 5 })).toBe(false);
    expect(has(cells, { x: 9, y: 5 })).toBe(true);
  });

  it('takes < 2 ms on a 10 × 10 arena', () => {
    const grid = makeGrid(10, 10, ({ x, y }) => ({
      height: (x + y) % 3,
      terrain: x === 4 || x === 5 ? 'shallow_water' : 'ground',
      blocked: (x === 6 && y === 3) || (x === 2 && y === 7),
    }));
    const state = makeBattle({
      grid,
      combatants: [
        makeCombatant({
          id: 'p1',
          position: { x: 1, y: 8 },
          attributes: { power: 0, control: 0, resistance: 0, mobility: 40, spirit: 0, focus: 0 },
        }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 8, y: 1 } }),
      ],
    });
    for (let i = 0; i < 20; i++) getReachableCells(state, 'p1', data);
    const runs = 200;
    const start = performance.now();
    for (let i = 0; i < runs; i++) getReachableCells(state, 'p1', data);
    expect((performance.now() - start) / runs).toBeLessThan(2);
  });
});
