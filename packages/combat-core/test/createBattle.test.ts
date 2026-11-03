import { describe, expect, it } from 'vitest';
import { type CombatantInput, createBattle } from '../src/createBattle.ts';
import { seedRng } from '../src/rng.ts';
import { makeData, makeGrid } from './factories.ts';

const data = makeData({
  monsters: {
    'monster.test': {
      id: 'monster.test',
      nameKey: 'monster.test.name',
      role: 'melee',
      maxHp: 50,
      attributes: { power: 10, control: 10, resistance: 10, mobility: 10, spirit: 5, focus: 0 },
      techniqueIds: ['t.claw'],
      passiveIds: [],
      ai: { profile: 'aggressive_melee' },
    },
  },
  presets: {
    'preset.test': {
      id: 'preset.test',
      nameKey: 'preset.test.name',
      element: 'water',
      maxHp: 100,
      attributes: { power: 10, control: 10, resistance: 10, mobility: 10, spirit: 10, focus: 0 },
      techniqueIds: ['t.whip'],
      passiveIds: ['p.passive'],
    },
  },
});

const player: CombatantInput = {
  id: 'p1',
  team: 'players',
  controller: 'player',
  position: { x: 1, y: 1 },
  facing: 'N',
  template: { kind: 'preset', id: 'preset.test' },
};
const monster: CombatantInput = {
  id: 'e1',
  team: 'enemies',
  controller: 'ai',
  position: { x: 5, y: 5 },
  facing: 'S',
  template: { kind: 'monster', id: 'monster.test' },
};

describe('createBattle', () => {
  it('builds combatants from presets and monsters with full hp and energy', () => {
    const state = createBattle({
      id: 'b',
      seed: 7,
      grid: makeGrid(),
      combatants: [player, monster],
      data,
    });
    const [p, e] = state.combatants;
    expect(p).toMatchObject({ element: 'water', hp: 100, maxHp: 100, energy: 60, maxEnergy: 60 });
    expect(e).toMatchObject({ element: null, hp: 50, energy: 50, maxEnergy: 50, controller: 'ai' });
    expect(e?.techniqueIds).toEqual(['t.claw']);
    expect(state).toMatchObject({ turn: null, round: 0, phase: 'running', eventSeq: 0 });
    expect(state.rngState).toBe(seedRng(7));
  });

  it('throws on an unknown template, duplicate id, blocked or occupied cell', () => {
    const grid = makeGrid(10, 10, ({ x, y }) => ({ blocked: x === 3 && y === 3 }));
    const base = { id: 'b', seed: 1, grid, data };
    expect(() =>
      createBattle({
        ...base,
        combatants: [{ ...player, template: { kind: 'monster', id: 'x' } }],
      }),
    ).toThrow(/unknown monster/);
    expect(() => createBattle({ ...base, combatants: [player, { ...monster, id: 'p1' }] })).toThrow(
      /duplicate/,
    );
    expect(() =>
      createBattle({ ...base, combatants: [{ ...player, position: { x: 3, y: 3 } }] }),
    ).toThrow(/blocked/);
    expect(() =>
      createBattle({ ...base, combatants: [player, { ...monster, position: { x: 1, y: 1 } }] }),
    ).toThrow(/occupied/);
    expect(() =>
      createBattle({ ...base, combatants: [{ ...player, position: { x: 10, y: 0 } }] }),
    ).toThrow(/outside/);
  });
});
