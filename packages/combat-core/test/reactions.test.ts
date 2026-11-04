import type { Passive } from '@elemental/shared';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import type { ApplyResult, BattleEvent } from '../src/events.ts';
import { getCombatant } from '../src/state.ts';
import type { BattleState, Combatant } from '../src/types.ts';
import { makeBattle, makeCombatant, makeData, makeTechnique, testRules } from './factories.ts';

const passives: Record<string, Passive> = {
  'p.counter': {
    id: 'p.counter',
    nameKey: 'x',
    reaction: { trigger: 'hitByMelee', effect: { kind: 'counterAttack', damageMultiplier: 0.5 } },
  },
  'p.backflow': {
    id: 'p.backflow',
    nameKey: 'x',
    reaction: { trigger: 'hitByMelee', effect: { kind: 'push', cells: 1 } },
  },
  'p.ember': {
    id: 'p.ember',
    nameKey: 'x',
    reaction: {
      trigger: 'hitByMelee',
      effect: { kind: 'status', statusId: 'burning', rounds: 2, magnitude: 4 },
    },
  },
  'p.any': {
    id: 'p.any',
    nameKey: 'x',
    reaction: { trigger: 'hitByAny', effect: { kind: 'push', cells: 1 } },
  },
  'p.guard': {
    id: 'p.guard',
    nameKey: 'x',
    reaction: {
      trigger: 'enemyEntersAdjacent',
      effect: { kind: 'status', statusId: 'slowed', rounds: 1, magnitude: 1 },
    },
  },
};
const techniques = {
  't.claw': makeTechnique({ id: 't.claw', range: { min: 1, max: 1 }, energyCost: 0 }),
  't.bolt': makeTechnique({ id: 't.bolt', range: { min: 1, max: 4 }, energyCost: 0 }),
};
// accuracy.max 100 + accuracy 100 → every roll hits
const data = makeData({
  techniques,
  passives,
  rules: { ...testRules, accuracy: { ...testRules.accuracy, max: 100 } },
});

const player = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'p1',
    position: { x: 3, y: 5 },
    facing: 'E',
    techniqueIds: ['t.claw', 't.bolt'],
    ...o,
  });
const beast = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'e1',
    team: 'enemies',
    controller: 'ai',
    position: { x: 4, y: 5 },
    facing: 'W',
    techniqueIds: ['t.claw'],
    ...o,
  });

const ok = (r: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } => {
  if (!r.ok) throw new Error(r.reason);
  return r;
};
const attack = (
  state: BattleState,
  actorId: string,
  techniqueId: string,
  target: { x: number; y: number },
) => ok(applyAction(state, { type: 'technique', actorId, techniqueId, target }, data));
const withTurn = (state: BattleState, id: string): BattleState => ({
  ...state,
  turn: { combatantId: id, hasMoved: false, hasActed: false, usedTechniqueId: null },
});
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type);

describe('reactions', () => {
  it('monster counter-attack: 50% of its basic attack damage after a melee hit', () => {
    const r = attack(
      makeBattle({ combatants: [player(), beast({ passiveIds: ['p.counter'] })] }),
      'p1',
      't.claw',
      { x: 4, y: 5 },
    );
    expect(types(r.events)).toEqual(['techniqueUsed', 'damaged', 'reaction', 'damaged']);
    expect(r.events[2]).toMatchObject({
      combatantId: 'e1',
      reactionId: 'p.counter',
      triggeredBy: 'p1',
    });
    expect(r.events[3]).toMatchObject({ targetId: 'p1', amount: 8, source: 'reaction' }); // round(15 × 0.5)
    expect(getCombatant(r.state, 'e1')?.reactionUsedThisRound).toBe(true);
  });

  it('hitByMelee does not fire on a ranged hit; hitByAny does', () => {
    const far = (passiveIds: string[]) =>
      makeBattle({ combatants: [player({ position: { x: 1, y: 5 } }), beast({ passiveIds })] });
    expect(types(attack(far(['p.counter']), 'p1', 't.bolt', { x: 4, y: 5 }).events)).not.toContain(
      'reaction',
    );
    const r = attack(far(['p.any']), 'p1', 't.bolt', { x: 4, y: 5 });
    expect(types(r.events)).toEqual(['techniqueUsed', 'damaged', 'reaction', 'pushed']);
  });

  it('backflow pushes the attacker 1 cell away; ember sets burning on the attacker', () => {
    // the beast (at 4,5) claws the player (at 5,5); backflow pushes the beast west to 3,5
    const victim = (passiveIds: string[]) => player({ position: { x: 5, y: 5 }, passiveIds });
    const backflow = attack(
      withTurn(makeBattle({ combatants: [beast(), victim(['p.backflow'])] }), 'e1'),
      'e1',
      't.claw',
      { x: 5, y: 5 },
    );
    expect(getCombatant(backflow.state, 'e1')?.position).toEqual({ x: 3, y: 5 });
    const ember = attack(
      withTurn(makeBattle({ combatants: [beast(), victim(['p.ember'])] }), 'e1'),
      'e1',
      't.claw',
      { x: 5, y: 5 },
    );
    expect(getCombatant(ember.state, 'e1')?.status).toEqual([
      { id: 'burning', roundsLeft: 2, magnitude: 4 },
    ]);
  });

  it('burning deals its magnitude at the start of the owner’s turn', () => {
    const state = makeBattle({
      turn: null,
      combatants: [
        beast({ ct: 100, status: [{ id: 'burning', roundsLeft: 2, magnitude: 4 }] }),
        player(),
      ],
    });
    const r = ok(applyAction(state, { type: 'advance' }, data));
    expect(types(r.events)).toEqual(['turnStarted', 'damaged']);
    expect(getCombatant(r.state, 'e1')?.hp).toBe(96);
  });

  it('a second reaction in the same round does not fire; it resets next round', () => {
    let state = makeBattle({ combatants: [player(), beast({ passiveIds: ['p.counter'] })] });
    state = attack(state, 'p1', 't.claw', { x: 4, y: 5 }).state;
    const second = attack(withTurn(state, 'p1'), 'p1', 't.claw', { x: 4, y: 5 });
    expect(types(second.events)).toEqual(['techniqueUsed', 'damaged']);
    // end of round resets the flag
    const ended = ok(
      applyAction(
        withTurn({ ...second.state, actedThisRound: ['e1'] }, 'p1'),
        { type: 'endTurn', actorId: 'p1' },
        data,
      ),
    );
    expect(types(ended.events)).toContain('roundStarted');
    expect(getCombatant(ended.state, 'e1')?.reactionUsedThisRound).toBe(false);
  });

  it('the monster counter-attack does not trigger the player’s ember (no chains)', () => {
    const state = makeBattle({
      combatants: [player({ passiveIds: ['p.ember'] }), beast({ passiveIds: ['p.counter'] })],
    });
    const r = attack(state, 'p1', 't.claw', { x: 4, y: 5 });
    expect(types(r.events)).toEqual(['techniqueUsed', 'damaged', 'reaction', 'damaged']);
    expect(getCombatant(r.state, 'e1')?.status).toEqual([]);
    expect(getCombatant(r.state, 'p1')?.reactionUsedThisRound).toBe(false);
  });

  it('does not fire when the reactor was defeated by the attack', () => {
    const state = makeBattle({
      combatants: [player(), beast({ hp: 5, passiveIds: ['p.counter'] })],
    });
    const r = attack(state, 'p1', 't.claw', { x: 4, y: 5 });
    expect(types(r.events)).toEqual(['techniqueUsed', 'damaged', 'defeated']);
  });

  it('does not fire on a miss', () => {
    const miss = makeData({
      techniques: { ...techniques, 't.claw': { ...techniques['t.claw'], accuracy: 0 } },
      passives,
    });
    const state = makeBattle({ combatants: [player(), beast({ passiveIds: ['p.counter'] })] });
    const r = ok(
      applyAction(
        state,
        { type: 'technique', actorId: 'p1', techniqueId: 't.claw', target: { x: 4, y: 5 } },
        miss,
      ),
    );
    expect(types(r.events)).not.toContain('reaction');
  });

  it('enemyEntersAdjacent fires when a hostile mover becomes adjacent', () => {
    const state = makeBattle({
      combatants: [player({ position: { x: 1, y: 5 } }), beast({ passiveIds: ['p.guard'] })],
    });
    const r = ok(applyAction(state, { type: 'move', actorId: 'p1', to: { x: 3, y: 5 } }, data));
    expect(types(r.events)).toEqual(['moved', 'reaction', 'statusApplied']);
    expect(getCombatant(r.state, 'p1')?.status[0]?.id).toBe('slowed');
  });
});
