import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import type { ApplyResult, BattleEvent } from '../src/events.ts';
import { fleeChance } from '../src/outcome/outcome.ts';
import { getCombatant } from '../src/state.ts';
import type { Action, BattleState, Combatant } from '../src/types.ts';
import {
  makeBattle,
  makeCombatant,
  makeData,
  makeGrid,
  makeTechnique,
  testRules,
} from './factories.ts';

const strike = makeTechnique({
  id: 't.strike',
  range: { min: 1, max: 9 },
  energyCost: 0,
  power: 40,
});
const data = makeData({
  techniques: { 't.strike': strike },
  rules: { ...testRules, accuracy: { ...testRules.accuracy, max: 100 } },
});
const edgeGrid = () =>
  makeGrid(10, 10, ({ x, y }) => ({ escape: x === 0 || y === 0 || x === 9 || y === 9 }));
const mob = (mobility: number) => ({
  power: 10,
  control: 10,
  resistance: 10,
  mobility,
  spirit: 10,
  focus: 0,
});

const player = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'p1',
    position: { x: 0, y: 5 },
    facing: 'E',
    techniqueIds: ['t.strike'],
    ...o,
  });
const enemy = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'e1',
    team: 'enemies',
    controller: 'ai',
    position: { x: 5, y: 5 },
    facing: 'W',
    ...o,
  });

const ok = (r: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } => {
  if (!r.ok) throw new Error(r.reason);
  return r;
};
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type);

describe('flee', () => {
  it('chance = clamp(30 + 2 × mobility − 10 × adjacent enemies, 10, 90)', () => {
    const state = makeBattle({
      grid: edgeGrid(),
      combatants: [player({ attributes: mob(10) }), enemy()],
    });
    expect(fleeChance(state, player({ attributes: mob(10) }), data)).toBe(50);
    const adjacent = makeBattle({
      grid: edgeGrid(),
      combatants: [player({ attributes: mob(10) }), enemy({ position: { x: 1, y: 5 } })],
    });
    expect(fleeChance(adjacent, player({ attributes: mob(10) }), data)).toBe(40);
    expect(fleeChance(state, player({ attributes: mob(40) }), data)).toBe(90);
    expect(fleeChance(adjacent, player({ attributes: mob(0) }), data)).toBe(20);
  });

  it('outside an escape cell returns not_on_escape_cell', () => {
    const state = makeBattle({
      grid: edgeGrid(),
      combatants: [player({ position: { x: 3, y: 5 } }), enemy()],
    });
    expect(applyAction(state, { type: 'flee', actorId: 'p1' }, data)).toEqual({
      ok: false,
      reason: 'not_on_escape_cell',
    });
  });

  it('a failed attempt consumes the action (and nothing else)', () => {
    // mobility 0, 1 adjacent enemy → 20%; find a seed that fails
    const at = (seed: number) =>
      makeBattle({
        seed,
        rngState: seed,
        grid: edgeGrid(),
        combatants: [player({ attributes: mob(0) }), enemy({ position: { x: 1, y: 5 } })],
      });
    const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((s) => {
      const r = ok(applyAction(at(s), { type: 'flee', actorId: 'p1' }, data));
      return r.events[0]?.type === 'fleeAttempt' && !(r.events[0] as { success: boolean }).success;
    });
    expect(seed).toBeDefined();
    const r = ok(applyAction(at(seed ?? 1), { type: 'flee', actorId: 'p1' }, data));
    expect(r.events).toEqual([
      expect.objectContaining({ type: 'fleeAttempt', chance: 20, success: false }),
    ]);
    expect(r.state.turn).toMatchObject({ combatantId: 'p1', hasActed: true, hasMoved: false });
    expect(applyAction(r.state, { type: 'flee', actorId: 'p1' }, data)).toEqual({
      ok: false,
      reason: 'already_acted',
    });
  });

  it('a successful attempt removes the player and ends the battle as fled', () => {
    const state = makeBattle({
      grid: edgeGrid(),
      combatants: [player({ attributes: mob(40) }), enemy()],
    });
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    const success = seeds
      .map((seed) =>
        ok(applyAction({ ...state, rngState: seed }, { type: 'flee', actorId: 'p1' }, data)),
      )
      .find((r) => (r.events[0] as { success?: boolean }).success);
    expect(success).toBeDefined();
    if (!success) return;
    expect(getCombatant(success.state, 'p1')?.fled).toBe(true);
    expect(success.state.phase).toBe('fled');
    expect(types(success.events)).toEqual(['fleeAttempt', 'turnEnded', 'battleEnded']);
    expect(success.events.at(-1)).toMatchObject({ type: 'battleEnded', result: 'fled' });
  });
});

describe('end of battle', () => {
  it('defeat when every player is down', () => {
    const state = makeBattle({
      combatants: [
        enemy({ techniqueIds: ['t.strike'] }),
        player({ hp: 1, position: { x: 4, y: 5 } }),
      ],
    });
    const r = ok(
      applyAction(
        state,
        { type: 'technique', actorId: 'e1', techniqueId: 't.strike', target: { x: 4, y: 5 } },
        data,
      ),
    );
    expect(r.state.phase).toBe('defeat');
    expect(r.events.at(-1)).toMatchObject({ type: 'battleEnded', result: 'defeat' });
  });

  it('a scripted full battle ends in victory with the expected events; later actions are battle_over', () => {
    // p1 (mobility 20, speed 8) vs e1 (mobility 10, speed 6). Each p1 hit: 40 + 10 − 5 = 45 → 3 hits.
    let state = makeBattle({
      turn: null,
      round: 0,
      combatants: [
        player({ attributes: mob(20) }),
        enemy({ hp: 120, maxHp: 120, attributes: mob(10) }),
      ],
    });
    const log: BattleEvent[] = [];
    const run = (action: Action) => {
      const r = ok(applyAction(state, action, data));
      state = r.state;
      log.push(...r.events);
    };
    for (let i = 0; i < 20 && state.phase === 'running'; i++) {
      run({ type: 'advance' });
      const actor = state.turn?.combatantId;
      if (actor === 'p1') {
        run({ type: 'technique', actorId: 'p1', techniqueId: 't.strike', target: { x: 5, y: 5 } });
        if (state.phase !== 'running') break;
        run({ type: 'endTurn', actorId: 'p1' });
      } else if (actor === 'e1') {
        run({ type: 'defend', actorId: 'e1' });
        run({ type: 'endTurn', actorId: 'e1' });
      }
    }
    expect(state.phase).toBe('victory');
    const damage = log
      .filter((e) => e.type === 'damaged')
      .map((e) => (e as { amount: number }).amount);
    // Hand-computed: first hit 45 (e1 not defending yet), then e1 always defends → 50 × 0.5 − 5 = 20.
    expect(damage).toEqual([45, 20, 20, 20, 20]);
    expect(log.slice(0, 5).map((e) => e.type)).toEqual([
      'roundStarted',
      'turnStarted',
      'techniqueUsed',
      'damaged',
      'turnEnded',
    ]);
    expect(log.filter((e) => e.type === 'defeated')).toEqual([
      expect.objectContaining({ combatantId: 'e1' }),
    ]);
    expect(log.at(-1)).toMatchObject({
      type: 'battleEnded',
      result: 'victory',
      rounds: state.round,
    });
    expect(log.map((e) => e.seq)).toEqual(log.map((_, i) => i + 1));
    expect(state.turn).toBeNull();
    expect(applyAction(state, { type: 'advance' }, data)).toEqual({
      ok: false,
      reason: 'battle_over',
    });
    expect(applyAction(state, { type: 'endTurn', actorId: 'p1' }, data)).toEqual({
      ok: false,
      reason: 'battle_over',
    });
  });
});
