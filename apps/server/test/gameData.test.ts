import { createBattle, type Grid } from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';

const grid: Grid = {
  width: 10,
  height: 10,
  cells: Array.from({ length: 100 }, () => ({
    height: 0,
    terrain: 'ground' as const,
    blocked: false,
    escape: false,
  })),
};

describe('slice 1 data + combat-core', () => {
  it('loads the clawbeast and its techniques/passive from the data files', () => {
    const beast = gameData.monsters['monster.clawbeast'];
    expect(beast?.maxHp).toBe(90);
    expect(gameData.techniques['monster.claw']?.range).toEqual({ min: 1, max: 1 });
    expect(gameData.techniques['monster.pounce']?.effects.map((e) => e.kind)).toEqual([
      'dash',
      'damage',
    ]);
    expect(gameData.passives['monster.counter']?.reaction.effect).toEqual({
      kind: 'counterAttack',
      damageMultiplier: 0.5,
    });
  });

  it('passes a preset and two clawbeasts to createBattle', () => {
    const state = createBattle({
      id: 'b',
      seed: 1,
      grid,
      data: gameData,
      combatants: [
        {
          id: 'p1',
          team: 'players',
          controller: 'player',
          position: { x: 1, y: 8 },
          facing: 'N',
          template: { kind: 'preset', id: 'preset.fire' },
        },
        {
          id: 'e1',
          team: 'enemies',
          controller: 'ai',
          position: { x: 8, y: 1 },
          facing: 'S',
          template: { kind: 'monster', id: 'monster.clawbeast' },
        },
        {
          id: 'e2',
          team: 'enemies',
          controller: 'ai',
          position: { x: 7, y: 1 },
          facing: 'S',
          template: { kind: 'monster', id: 'monster.clawbeast' },
        },
      ],
    });
    expect(state.combatants.map((c) => [c.id, c.hp, c.maxEnergy])).toEqual([
      ['p1', 95, 60],
      ['e1', 90, 50],
      ['e2', 90, 50],
    ]);
  });
});
