import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import type { ApplyResult, BattleEvent } from '../src/events.ts';
import { getCell } from '../src/grid/grid.ts';
import { findPath } from '../src/pathfinding/pathfinding.ts';
import { getCombatant } from '../src/state.ts';
import { applyCellEffect, tickCellEffects } from '../src/terrain/terrain.ts';
import type { BattleState, CellEffect, Combatant, Grid, Position } from '../src/types.ts';
import { makeBattle, makeCombatant, makeData, makeGrid, makeTechnique } from './factories.ts';

const iceTech = makeTechnique({
  id: 't.ice',
  target: 'cell',
  range: { min: 1, max: 4 },
  power: 0,
  powerScaling: 0,
  effects: [{ kind: 'cellEffect', effect: 'ice' }],
});
const fireTech = makeTechnique({
  id: 't.fire',
  element: 'fire',
  target: 'cell',
  range: { min: 1, max: 4 },
  power: 0,
  powerScaling: 0,
  effects: [{ kind: 'cellEffect', effect: 'fire' }],
});
const data = makeData({ techniques: { 't.ice': iceTech, 't.fire': fireTech } });
const fx = (kind: CellEffect['kind'], extra: Partial<CellEffect> = {}): CellEffect => ({
  kind,
  roundsLeft: 2,
  sourceId: 'x',
  ...extra,
});

const ok = (r: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } => {
  if (!r.ok) throw new Error(r.reason);
  return r;
};
const player = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'p1',
    position: { x: 0, y: 0 },
    facing: 'E',
    techniqueIds: ['t.ice', 't.fire'],
    ...o,
  });
const battle = (grid: Grid, combatants: Combatant[] = [player()]) =>
  makeBattle({ grid, combatants });
const effectAt = (state: BattleState, p: Position) => getCell(state.grid, p)?.effect;

describe('cell effects', () => {
  it('ice followed by fire on the same cell results in fire', () => {
    let state = battle(makeGrid());
    state = ok(
      applyAction(
        state,
        { type: 'technique', actorId: 'p1', techniqueId: 't.ice', target: { x: 2, y: 0 } },
        data,
      ),
    ).state;
    expect(effectAt(state, { x: 2, y: 0 })?.kind).toBe('ice');
    state = {
      ...state,
      turn: { combatantId: 'p1', hasMoved: false, hasActed: false, usedTechniqueId: null },
    };
    const r = ok(
      applyAction(
        state,
        { type: 'technique', actorId: 'p1', techniqueId: 't.fire', target: { x: 2, y: 0 } },
        data,
      ),
    );
    expect(effectAt(r.state, { x: 2, y: 0 })).toEqual({
      kind: 'fire',
      roundsLeft: 2,
      sourceId: 'p1',
    });
    expect(r.events.at(-1)).toMatchObject({ type: 'cellEffectApplied', kind: 'fire', rounds: 2 });
  });

  it('fire is not applied on shallow water and lasts 3 rounds on vegetation', () => {
    const grid = makeGrid(3, 1, ({ x }) => ({
      terrain: x === 1 ? 'shallow_water' : x === 2 ? 'vegetation' : 'ground',
    }));
    const water = applyCellEffect(battle(grid), { x: 1, y: 0 }, 'fire', 'p1', data);
    expect(water.events).toEqual([]);
    expect(effectAt(water.state, { x: 1, y: 0 })).toBeUndefined();
    const grove = applyCellEffect(battle(grid), { x: 2, y: 0 }, 'fire', 'p1', data);
    expect(effectAt(grove.state, { x: 2, y: 0 })?.roundsLeft).toBe(3);
  });

  it('is never applied on a blocked cell; earth_wall is not raised under a combatant', () => {
    const grid = makeGrid(3, 1, ({ x }) => ({ blocked: x === 2 }));
    expect(applyCellEffect(battle(grid), { x: 2, y: 0 }, 'ice', 'p1', data).events).toEqual([]);
    expect(applyCellEffect(battle(grid), { x: 0, y: 0 }, 'earth_wall', 'p1', data).events).toEqual(
      [],
    );
    expect(
      applyCellEffect(battle(grid), { x: 1, y: 0 }, 'earth_wall', 'p1', data).events,
    ).toHaveLength(1);
  });

  it('entering a burning cell while moving deals damage and the path continues', () => {
    const grid = makeGrid(5, 1, ({ x }) => (x === 1 || x === 2 ? { effect: fx('fire') } : {}));
    const state = battle(grid);
    const r = ok(applyAction(state, { type: 'move', actorId: 'p1', to: { x: 3, y: 0 } }, data));
    expect(getCombatant(r.state, 'p1')?.position).toEqual({ x: 3, y: 0 });
    expect(getCombatant(r.state, 'p1')?.hp).toBe(80); // 2 cells × 10 (test rules)
    expect(r.events.map((e) => e.type)).toEqual(['moved', 'damaged', 'damaged']);
    expect(r.events[1]).toMatchObject({ source: 'terrain', amount: 10 });
  });

  it('a mover defeated by fire stops on that cell', () => {
    const grid = makeGrid(5, 1, ({ x }) => (x === 1 ? { effect: fx('fire') } : {}));
    const r = ok(
      applyAction(
        battle(grid, [player({ hp: 5 })]),
        { type: 'move', actorId: 'p1', to: { x: 3, y: 0 } },
        data,
      ),
    );
    expect(getCombatant(r.state, 'p1')).toMatchObject({ position: { x: 1, y: 0 }, alive: false });
    expect(r.events.map((e) => e.type)).toEqual(['moved', 'damaged', 'defeated', 'battleEnded']);
  });

  it('starting the turn on fire deals damage', () => {
    const grid = makeGrid(3, 1, ({ x }) => (x === 0 ? { effect: fx('fire') } : {}));
    const state = makeBattle({ grid, turn: null, combatants: [player({ ct: 100 })] });
    const r = ok(applyAction(state, { type: 'advance' }, data));
    expect(r.events.map((e) => e.type)).toEqual(['turnStarted', 'damaged']);
    expect(getCombatant(r.state, 'p1')?.hp).toBe(90);
  });

  it('ice costs +1 movement and A* takes it into account', () => {
    // straight line through ice costs 2+1; the detour costs 4: with budget 3 the straight path wins
    const grid = makeGrid(3, 2, ({ x, y }) => (x === 1 && y === 0 ? { effect: fx('ice') } : {}));
    const state = battle(grid);
    expect(findPath(state, 'p1', { x: 2, y: 0 }, data)?.cost).toBe(3);
    // a cheaper detour around ice is preferred
    const wide = makeGrid(3, 3, ({ x, y }) => (x === 1 && y <= 1 ? { effect: fx('ice') } : {}));
    const detour = findPath(
      battle(wide, [player({ position: { x: 0, y: 1 } })]),
      'p1',
      { x: 2, y: 1 },
      data,
      { budget: 10 },
    );
    expect(detour?.cost).toBe(3);
  });

  it('ice gives +accuracy against its occupant (rules value)', async () => {
    const { hitChance } = await import('../src/techniques/formulas.ts');
    const t = makeTechnique({ id: 't.hit', accuracy: 50 });
    const grid = makeGrid(3, 1, ({ x }) => (x === 1 ? { effect: fx('ice') } : {}));
    const a = player();
    const b = makeCombatant({ id: 'e1', team: 'enemies', position: { x: 1, y: 0 }, facing: 'W' });
    expect(hitChance(grid, t, a, b, data) - hitChance(makeGrid(3, 1), t, a, b, data)).toBe(10);
  });

  it('gust pushes whoever ends its movement on the cell, in the wind direction', () => {
    const grid = makeGrid(5, 1, ({ x }) =>
      x === 2 ? { effect: fx('gust', { direction: 'E' }) } : {},
    );
    const r = ok(
      applyAction(battle(grid), { type: 'move', actorId: 'p1', to: { x: 2, y: 0 } }, data),
    );
    expect(getCombatant(r.state, 'p1')?.position).toEqual({ x: 3, y: 0 });
    expect(r.events.map((e) => e.type)).toEqual(['moved', 'pushed']);
  });

  it('earth_wall blocks movement', () => {
    const grid = makeGrid(3, 1, ({ x }) =>
      x === 1 ? { effect: fx('earth_wall', { roundsLeft: 3 }) } : {},
    );
    expect(findPath(battle(grid), 'p1', { x: 2, y: 0 }, data)).toBeNull();
  });

  it('expires at the end of the round with events', () => {
    const grid = makeGrid(2, 1, ({ x }) => ({
      effect: fx(x === 0 ? 'ice' : 'fire', { roundsLeft: x === 0 ? 1 : 2 }),
    }));
    const r = tickCellEffects(battle(grid));
    expect(r.events).toEqual([
      { type: 'cellEffectExpired', position: { x: 0, y: 0 }, kind: 'ice' },
    ]);
    expect(effectAt(r.state, { x: 0, y: 0 })).toBeUndefined();
    expect(effectAt(r.state, { x: 1, y: 0 })?.roundsLeft).toBe(1);
  });

  it('ends of rounds tick effects through the normal turn flow', () => {
    const grid = makeGrid(3, 1, ({ x }) =>
      x === 2 ? { effect: fx('ice', { roundsLeft: 1 }) } : {},
    );
    const state = makeBattle({ grid, combatants: [player()] });
    const r = ok(applyAction(state, { type: 'endTurn', actorId: 'p1' }, data));
    expect(r.events.map((e) => e.type)).toEqual(['turnEnded', 'cellEffectExpired', 'roundStarted']);
  });
});
