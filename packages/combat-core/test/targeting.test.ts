import { describe, expect, it } from 'vitest';
import {
  getAffectedCells,
  getTechniqueTargets,
  hasLineOfSight,
  lineCells,
} from '../src/targeting/targeting.ts';
import type { Facing, Position } from '../src/types.ts';
import { makeBattle, makeCombatant, makeData, makeGrid, makeTechnique } from './factories.ts';

const ranged = makeTechnique({
  id: 't.ranged',
  range: { min: 1, max: 3 },
  requiresLineOfSight: true,
  rangeBonusFromHeight: true,
});
const melee = makeTechnique({
  id: 't.melee',
  range: { min: 1, max: 1 },
  requiresLineOfSight: false,
});
const cross = makeTechnique({
  id: 't.cross',
  target: 'cell',
  range: { min: 2, max: 4 },
  area: { shape: 'cross', radius: 1 },
});
const wall = makeTechnique({
  id: 't.wall',
  target: 'cell',
  range: { min: 1, max: 3 },
  area: { shape: 'line', length: 3 },
});
const shield = makeTechnique({ id: 't.shield', target: 'ally', range: { min: 0, max: 2 } });
const data = makeData({
  techniques: {
    't.ranged': ranged,
    't.melee': melee,
    't.cross': cross,
    't.wall': wall,
    't.shield': shield,
  },
});
const has = (cells: Position[], p: Position) => cells.some((c) => c.x === p.x && c.y === p.y);

describe('line of sight', () => {
  it('lineCells excludes both end points', () => {
    expect(lineCells({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(lineCells({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });

  it('a rock between attacker and target blocks a technique that requires line of sight', () => {
    const grid = makeGrid(10, 10, ({ x, y }) => ({
      blocked: x === 3 && y === 1,
      terrain: x === 3 && y === 1 ? 'rock' : 'ground',
    }));
    expect(hasLineOfSight(grid, { x: 1, y: 1 }, { x: 4, y: 1 })).toBe(false);
    const state = makeBattle({
      grid,
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 1, y: 1 } }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 4, y: 1 } }),
      ],
    });
    expect(has(getTechniqueTargets(state, 'p1', 't.ranged', data), { x: 4, y: 1 })).toBe(false);
  });

  it('a cell higher than max(origin, target) + 1 blocks; combatants do not', () => {
    const grid = makeGrid(5, 1, ({ x }) => ({ height: x === 2 ? 2 : 0 }));
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
    const lower = makeGrid(5, 1, ({ x }) => ({ height: x === 2 ? 1 : 0 }));
    expect(hasLineOfSight(lower, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
    const wallEffect = makeGrid(5, 1, ({ x }) =>
      x === 2 ? { effect: { kind: 'earth_wall', roundsLeft: 3, sourceId: 'x' } } : {},
    );
    expect(hasLineOfSight(wallEffect, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
  });

  it('range-1 techniques never require line of sight', () => {
    const grid = makeGrid(3, 3);
    const state = makeBattle({
      grid,
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 1, y: 1 } }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 2, y: 1 } }),
      ],
    });
    expect(getTechniqueTargets(state, 'p1', 't.melee', data)).toEqual([{ x: 2, y: 1 }]);
  });
});

describe('range', () => {
  it('an attacker 2 levels above gains +1 max range with rangeBonusFromHeight', () => {
    const grid = makeGrid(10, 1, ({ x }) => ({ height: x === 0 ? 2 : 0 }));
    const at = (x: number) =>
      makeBattle({
        grid,
        combatants: [
          makeCombatant({ id: 'p1', position: { x: 0, y: 0 } }),
          makeCombatant({ id: 'e1', team: 'enemies', position: { x, y: 0 } }),
        ],
      });
    expect(has(getTechniqueTargets(at(4), 'p1', 't.ranged', data), { x: 4, y: 0 })).toBe(true);
    expect(has(getTechniqueTargets(at(5), 'p1', 't.ranged', data), { x: 5, y: 0 })).toBe(false);
    // 1 level above: no bonus
    const low = makeGrid(10, 1, ({ x }) => ({ height: x === 0 ? 1 : 0 }));
    const state = { ...at(4), grid: low };
    expect(has(getTechniqueTargets(state, 'p1', 't.ranged', data), { x: 4, y: 0 })).toBe(false);
  });

  it('respects min range and target kind (enemy only, ally includes self)', () => {
    const state = makeBattle({
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 5, y: 5 } }),
        makeCombatant({ id: 'p2', position: { x: 5, y: 6 } }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 7, y: 5 } }),
      ],
    });
    expect(getTechniqueTargets(state, 'p1', 't.ranged', data)).toEqual([{ x: 7, y: 5 }]);
    expect(getTechniqueTargets(state, 'p1', 't.shield', data)).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 6 },
    ]);
    const cells = getTechniqueTargets(state, 'p1', 't.cross', data);
    expect(has(cells, { x: 6, y: 5 })).toBe(false); // min range 2
    expect(has(cells, { x: 9, y: 5 })).toBe(true);
  });

  it('can compute targets from another cell (for move previews)', () => {
    const state = makeBattle({
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 0, y: 0 } }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 6, y: 0 } }),
      ],
    });
    expect(getTechniqueTargets(state, 'p1', 't.ranged', data)).toEqual([]);
    expect(getTechniqueTargets(state, 'p1', 't.ranged', data, { x: 4, y: 0 })).toEqual([
      { x: 6, y: 0 },
    ]);
  });
});

describe('area', () => {
  const userAt = (position: Position, facing: Facing = 'S') =>
    makeBattle({ combatants: [makeCombatant({ id: 'p1', position, facing })] });

  it.each([
    [
      'N',
      { x: 5, y: 8 },
      { x: 5, y: 6 },
      [
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
      ],
    ],
    [
      'S',
      { x: 5, y: 2 },
      { x: 5, y: 4 },
      [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
      ],
    ],
    [
      'E',
      { x: 2, y: 5 },
      { x: 4, y: 5 },
      [
        { x: 4, y: 4 },
        { x: 4, y: 5 },
        { x: 4, y: 6 },
      ],
    ],
    [
      'W',
      { x: 8, y: 5 },
      { x: 6, y: 5 },
      [
        { x: 6, y: 4 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
      ],
    ],
  ] as const)(
    'line is perpendicular to the user direction %s and centred on the target',
    (_dir, user, target, expected) => {
      expect(getAffectedCells(userAt(user), 'p1', 't.wall', target, data)).toEqual(expected);
    },
  );

  it('cross r1 covers the target and its 4 neighbours', () => {
    const cells = getAffectedCells(userAt({ x: 1, y: 1 }), 'p1', 't.cross', { x: 4, y: 4 }, data);
    expect(cells).toHaveLength(5);
    expect(has(cells, { x: 4, y: 3 }) && has(cells, { x: 5, y: 4 })).toBe(true);
  });

  it('never includes cells outside the grid', () => {
    const corner = getAffectedCells(userAt({ x: 3, y: 3 }), 'p1', 't.cross', { x: 0, y: 0 }, data);
    expect(corner).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    const edgeLine = getAffectedCells(userAt({ x: 0, y: 3 }), 'p1', 't.wall', { x: 0, y: 0 }, data);
    expect(edgeLine).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });
});
