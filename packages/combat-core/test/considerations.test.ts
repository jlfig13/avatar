import { describe, expect, it } from 'vitest';
import { chooseActions } from '../src/ai/chooseActions.ts';
import { getCombatant } from '../src/state.ts';
import type { Action, BattleState, Combatant, Position } from '../src/types.ts';
import {
  makeBattle,
  makeCombatant,
  makeData,
  makeGrid,
  makeTechnique,
  testRules,
} from './factories.ts';

const techniques = {
  't.claw': makeTechnique({ id: 't.claw', range: { min: 1, max: 1 }, energyCost: 0, accuracy: 80 }),
  't.pounce': makeTechnique({
    id: 't.pounce',
    range: { min: 2, max: 3 },
    energyCost: 10,
    accuracy: 80,
    effects: [{ kind: 'dash', maxCells: 3, ignoresTerrainCost: false }, { kind: 'damage' }],
  }),
};
const weights = {
  expectedDamage: 1,
  killChance: 0.6,
  safety: 0.2,
  closeness: 0.3,
  heightAdvantage: 0.1,
  flankAttack: 0.2,
  avoidFire: 0.5,
};
const data = makeData({
  techniques,
  rules: { ...testRules, ai: { profiles: { aggressive_melee: weights } } },
});

const beast = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'm1',
    team: 'enemies',
    controller: 'ai',
    position: { x: 1, y: 5 },
    techniqueIds: ['t.claw'],
    ...o,
  });
const hero = (o: Partial<Combatant> = {}) =>
  makeCombatant({ id: 'p1', position: { x: 5, y: 5 }, facing: 'E', techniqueIds: [], ...o });
const choose = (state: BattleState) =>
  chooseActions({ state, actorId: 'm1', data, profile: 'aggressive_melee' });
const moveOf = (actions: Action[]): Position | undefined =>
  actions.find((a) => a.type === 'move')?.to as Position | undefined;
const turn = { combatantId: 'm1', hasMoved: false, hasActed: false, usedTechniqueId: null };

describe('AI considerations (aggressive_melee)', () => {
  it('with equal expected damage, prefers the higher cell', () => {
    // hero at (5,5) faces N: front (5,4), sides W (4,5) and E (6,5), back (5,6) out of reach (5 steps).
    // Both sides are 4 steps away; E is 1 level higher (dh 1 → no accuracy change): same expected damage.
    const grid = makeGrid(10, 10, ({ x, y }) => ({ height: x === 6 && y === 5 ? 1 : 0 }));
    const state = makeBattle({
      grid,
      turn,
      combatants: [beast({ position: { x: 5, y: 2 } }), hero({ facing: 'N', hp: 100 })],
    });
    const actions = choose(state);
    expect(actions.map((a) => a.type)).toEqual(['move', 'technique', 'endTurn']);
    expect(moveOf(actions)).toEqual({ x: 6, y: 5 });
  });

  it('prefers attacking from the back when possible', () => {
    // hero at (5,5) faces E; its back is (4,5)
    const state = makeBattle({
      turn,
      combatants: [beast({ position: { x: 4, y: 3 } }), hero({ facing: 'E' })],
    });
    expect(moveOf(choose(state))).toEqual({ x: 4, y: 5 });
  });

  it('does not end its movement on fire when an equivalent cell exists', () => {
    // back cell (4,5) burns; the sides (5,4)/(5,6) are fine
    const fire = { kind: 'fire' as const, roundsLeft: 2, sourceId: 'x' };
    const grid = makeGrid(10, 10, ({ x, y }) => (x === 4 && y === 5 ? { effect: fire } : {}));
    const state = makeBattle({
      grid,
      turn,
      combatants: [beast({ position: { x: 4, y: 3 } }), hero({ facing: 'E' })],
    });
    const destination = moveOf(choose(state));
    expect(destination).toBeDefined();
    expect(destination).not.toEqual({ x: 4, y: 5 });
  });

  it('uses pounce when the target is 2–3 cells away and not reachable on foot', () => {
    // mobility 10 → 4 movement points; the hero is 7 cells away: walking + claw cannot reach,
    // walking 4 then pouncing from 3 cells can.
    const state = makeBattle({
      turn,
      combatants: [
        beast({ position: { x: 0, y: 5 }, techniqueIds: ['t.claw', 't.pounce'] }),
        hero({ position: { x: 7, y: 5 } }),
      ],
    });
    const actions = choose(state);
    const technique = actions.find((a) => a.type === 'technique');
    expect(technique).toMatchObject({ techniqueId: 't.pounce', target: { x: 7, y: 5 } });
    const from = moveOf(actions) ?? getCombatant(state, 'm1')?.position;
    const distance = from ? Math.abs(from.x - 7) + Math.abs(from.y - 5) : 0;
    expect(distance).toBeGreaterThanOrEqual(2);
    expect(distance).toBeLessThanOrEqual(3);
  });

  it('closes in on the preferred target when no attack is possible', () => {
    const state = makeBattle({
      turn,
      combatants: [beast({ position: { x: 0, y: 0 } }), hero({ position: { x: 9, y: 9 } })],
    });
    const destination = moveOf(choose(state));
    expect(destination && destination.x + destination.y).toBe(4);
  });
});
