import {
  type Action,
  applyAction,
  type BattleState,
  type Combatant,
  createBattle,
  damageAmount,
  type Grid,
  type Position,
} from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';

// Integration: the real slice-1 data runs through combat-core.
const flat = (water: Position[] = []): Grid => ({
  width: 10,
  height: 10,
  cells: Array.from({ length: 100 }, (_, i) => ({
    height: 0,
    terrain: water.some((p) => p.y * 10 + p.x === i)
      ? ('shallow_water' as const)
      : ('ground' as const),
    blocked: false,
    escape: false,
  })),
});

function setup(
  kind: 'preset' | 'monster',
  id: string,
  me: Position,
  foe: Position,
  grid = flat(),
): BattleState {
  const state = createBattle({
    id: 'b',
    seed: 3,
    grid,
    data: gameData,
    combatants: [
      {
        id: 'me',
        team: 'players',
        controller: 'player',
        position: me,
        facing: 'E',
        template: { kind, id },
      },
      {
        id: 'foe',
        team: 'enemies',
        controller: 'ai',
        position: foe,
        facing: 'W',
        template: { kind: 'monster', id: 'monster.clawbeast' },
      },
      {
        id: 'friend',
        team: 'players',
        controller: 'player',
        position: { x: 0, y: 9 },
        facing: 'N',
        template: { kind: 'preset', id: 'preset.water' },
      },
    ],
  });
  return {
    ...state,
    round: 1,
    turn: { combatantId: 'me', hasMoved: false, hasActed: false, usedTechniqueId: null },
  };
}

const cases: [string, 'preset' | 'monster', string, Position, Position, Position][] = [
  ['water.whip', 'preset', 'preset.water', { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 5 }],
  ['water.shield', 'preset', 'preset.water', { x: 2, y: 5 }, { x: 8, y: 5 }, { x: 2, y: 5 }],
  ['water.freeze', 'preset', 'preset.water', { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }],
  ['water.glide', 'preset', 'preset.water', { x: 2, y: 5 }, { x: 8, y: 5 }, { x: 5, y: 5 }],
  ['fire.blast', 'preset', 'preset.fire', { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }],
  ['fire.wall', 'preset', 'preset.fire', { x: 2, y: 5 }, { x: 8, y: 5 }, { x: 4, y: 5 }],
  ['fire.burst', 'preset', 'preset.fire', { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }],
  ['fire.surge', 'preset', 'preset.fire', { x: 2, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }],
  ['monster.claw', 'monster', 'monster.clawbeast', { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 5 }],
  [
    'monster.pounce',
    'monster',
    'monster.clawbeast',
    { x: 1, y: 5 },
    { x: 4, y: 5 },
    { x: 4, y: 5 },
  ],
];

describe('real slice-1 techniques', () => {
  it.each(cases)('%s resolves', (techniqueId, kind, template, me, foe, target) => {
    const state = setup(kind, template, me, foe);
    const action: Action = { type: 'technique', actorId: 'me', techniqueId, target };
    const result = applyAction(state, action, gameData);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  });

  it('water.whip deals 20% more (before resistance) on a target in shallow water', () => {
    const technique = gameData.techniques['water.whip'];
    if (!technique) throw new Error('missing');
    const dry = setup('preset', 'preset.water', { x: 2, y: 5 }, { x: 4, y: 5 });
    const wet = setup(
      'preset',
      'preset.water',
      { x: 2, y: 5 },
      { x: 4, y: 5 },
      flat([{ x: 4, y: 5 }]),
    );
    const [me, foe] = dry.combatants as [Combatant, Combatant];
    // power + attacker.power × scaling (docs/02 §6.6); values read from the data (QA-01 tunes them)
    const base = technique.power + me.attributes.power * technique.powerScaling;
    const resistance = foe.attributes.resistance * gameData.rules.damage.resistanceFactor;
    expect(damageAmount(dry.grid, technique, me, foe, gameData)).toBe(
      Math.round(base - resistance),
    );
    expect(damageAmount(wet.grid, technique, me, foe, gameData)).toBe(
      Math.round(base * 1.2 - resistance),
    );
  });
});
