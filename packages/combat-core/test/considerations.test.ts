import { describe, expect, it } from 'vitest';
import { chooseActions, chooseActionsWithDebug } from '../src/ai/chooseActions.ts';
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

describe('AI considerations (dash to cell and protection)', () => {
  const surge = makeTechnique({
    id: 't.surge',
    target: 'cell',
    range: { min: 1, max: 3 },
    effects: [
      { kind: 'dash', maxCells: 3, ignoresTerrainCost: false, straightLine: true },
      { kind: 'damage' },
    ],
  });
  const shield = makeTechnique({
    id: 't.shield',
    role: 'defense',
    target: 'ally',
    range: { min: 0, max: 2 },
    accuracy: 100,
    power: 0,
    powerScaling: 0,
    effects: [{ kind: 'status', statusId: 'shielded', rounds: 2, magnitude: 0.3 }],
  });
  const profileData = (profile: Record<string, number>) =>
    makeData({
      techniques: { ...techniques, 't.surge': surge, 't.shield': shield },
      rules: { ...testRules, ai: { profiles: { p: profile } } },
    });
  const acting = { combatantId: 'p1', hasMoved: true, hasActed: false, usedTechniqueId: null };
  const enemy = (o: Partial<Combatant> = {}) =>
    makeCombatant({
      id: 'm1',
      team: 'enemies',
      controller: 'ai',
      position: { x: 4, y: 5 },
      techniqueIds: ['t.claw'],
      ...o,
    });

  it('estimates the damage of a dash to a cell on the enemies adjacent to the landing cell', () => {
    const data = profileData({ expectedDamage: 1 });
    const state = makeBattle({
      turn: acting,
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 0, y: 5 }, techniqueIds: ['t.surge'] }),
        enemy(),
      ],
    });
    const { actions, candidates } = chooseActionsWithDebug({
      state,
      actorId: 'p1',
      data,
      profile: 'p',
    });
    const landing = (x: number) =>
      candidates.find((c) =>
        c.actions.some((a) => a.type === 'technique' && a.target.x === x && a.target.y === 5),
      )?.debug.expectedDamage;
    expect(landing(3)).toBeGreaterThan(0);
    expect(landing(2)).toBe(0);
    expect(actions.find((a) => a.type === 'technique')).toMatchObject({
      techniqueId: 't.surge',
      target: { x: 3, y: 5 },
    });
  });

  it('values a shield on an ally under threat, but not on an already shielded one', () => {
    const data = profileData({ protection: 1 });
    const shieldDebug = (status: Combatant['status']) => {
      const state = makeBattle({
        turn: acting,
        combatants: [
          makeCombatant({ id: 'p1', position: { x: 3, y: 5 }, techniqueIds: ['t.shield'], status }),
          enemy(),
        ],
      });
      const { candidates, actions } = chooseActionsWithDebug({
        state,
        actorId: 'p1',
        data,
        profile: 'p',
      });
      const onSelf = candidates.find((c) =>
        c.actions.some((a) => a.type === 'technique' && a.target.x === 3 && a.target.y === 5),
      );
      return { value: onSelf?.debug.protection ?? -1, actions };
    };
    const threatened = shieldDebug([]);
    expect(threatened.value).toBeGreaterThan(0);
    expect(threatened.actions.find((a) => a.type === 'technique')).toMatchObject({
      techniqueId: 't.shield',
      target: { x: 3, y: 5 },
    });
    expect(shieldDebug([{ id: 'shielded', roundsLeft: 1, magnitude: 0.3 }]).value).toBe(0);
  });

  it('does not value a shield when no enemy can reach the ally next turn', () => {
    const data = profileData({ protection: 1 });
    const state = makeBattle({
      turn: acting,
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 0, y: 0 }, techniqueIds: ['t.shield'] }),
        enemy({ position: { x: 9, y: 9 } }),
      ],
    });
    const { candidates } = chooseActionsWithDebug({ state, actorId: 'p1', data, profile: 'p' });
    expect(candidates.every((c) => (c.debug.protection ?? 0) === 0)).toBe(true);
  });
});
