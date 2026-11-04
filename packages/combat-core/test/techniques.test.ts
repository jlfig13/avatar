import type { Technique } from '@elemental/shared';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import type { ApplyResult, BattleEvent } from '../src/events.ts';
import { getCombatant } from '../src/state.ts';
import type { BattleState, Combatant, Grid, Position } from '../src/types.ts';
import {
  deepFreeze,
  makeBattle,
  makeCombatant,
  makeData,
  makeGrid,
  makeTechnique,
  testRules,
} from './factories.ts';

// Shapes mirror docs/05 §4 and §6; numbers are round test values (base 20 vs resistance 10 → 15).
const T = {
  whip: makeTechnique({ id: 't.whip', element: 'water', range: { min: 1, max: 3 } }),
  shield: makeTechnique({
    id: 't.shield',
    role: 'defense',
    target: 'ally',
    range: { min: 0, max: 2 },
    accuracy: 0,
    power: 0,
    powerScaling: 0,
    effects: [{ kind: 'status', statusId: 'shielded', rounds: 2, magnitude: 0.5 }],
  }),
  freeze: makeTechnique({
    id: 't.freeze',
    role: 'control',
    target: 'cell',
    range: { min: 2, max: 4 },
    area: { shape: 'cross', radius: 1 },
    effects: [{ kind: 'damage' }, { kind: 'cellEffect', effect: 'ice' }],
  }),
  glide: makeTechnique({
    id: 't.glide',
    role: 'mobility',
    target: 'cell',
    range: { min: 1, max: 4 },
    power: 0,
    powerScaling: 0,
    effects: [{ kind: 'dash', maxCells: 4, ignoresTerrainCost: true }],
  }),
  blast: makeTechnique({ id: 't.blast', element: 'fire', range: { min: 1, max: 4 } }),
  wall: makeTechnique({
    id: 't.wall',
    element: 'fire',
    role: 'defense',
    target: 'cell',
    range: { min: 1, max: 3 },
    area: { shape: 'line', length: 3 },
    power: 0,
    powerScaling: 0,
    effects: [{ kind: 'cellEffect', effect: 'fire' }],
  }),
  burst: makeTechnique({
    id: 't.burst',
    element: 'fire',
    target: 'cell',
    range: { min: 2, max: 4 },
    area: { shape: 'cross', radius: 1 },
    ctDelay: 30,
    energyCost: 20,
  }),
  surge: makeTechnique({
    id: 't.surge',
    element: 'fire',
    role: 'mobility',
    target: 'cell',
    range: { min: 1, max: 3 },
    effects: [
      { kind: 'dash', maxCells: 3, ignoresTerrainCost: false, straightLine: true },
      { kind: 'damage' },
    ],
  }),
  claw: makeTechnique({ id: 't.claw', element: null, range: { min: 1, max: 1 }, energyCost: 0 }),
  pounce: makeTechnique({
    id: 't.pounce',
    element: null,
    range: { min: 2, max: 3 },
    effects: [{ kind: 'dash', maxCells: 3, ignoresTerrainCost: false }, { kind: 'damage' }],
  }),
} satisfies Record<string, Technique>;

const techniques = Object.fromEntries(Object.values(T).map((t) => [t.id, t]));
const allIds = Object.keys(techniques);
// accuracy.max 100 → chance 100 always hits, so damage tests are deterministic.
const sure = makeData({
  techniques,
  rules: { ...testRules, accuracy: { ...testRules.accuracy, max: 100 } },
});
const data = makeData({ techniques });

const player = (o: Partial<Combatant> = {}) =>
  makeCombatant({ id: 'p1', position: { x: 2, y: 5 }, facing: 'E', techniqueIds: allIds, ...o });
const ally = (o: Partial<Combatant> = {}) =>
  makeCombatant({ id: 'p2', position: { x: 4, y: 6 }, ...o });
const enemy = (o: Partial<Combatant> = {}) =>
  makeCombatant({
    id: 'e1',
    team: 'enemies',
    controller: 'ai',
    position: { x: 4, y: 5 },
    facing: 'W',
    ...o,
  });

const battle = (combatants: Combatant[], grid: Grid = makeGrid()) =>
  deepFreeze(makeBattle({ grid, combatants }));

function ok(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result;
}
const cast = (state: BattleState, techniqueId: string, target: Position, d = sure) =>
  applyAction(state, { type: 'technique', actorId: 'p1', techniqueId, target }, d);
const hp = (state: BattleState, id: string) => getCombatant(state, id)?.hp;
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type);

describe('technique validation', () => {
  const state = battle([player(), enemy()]);
  it('unknown or not-learned technique', () => {
    expect(cast(state, 't.nope', { x: 4, y: 5 })).toEqual({
      ok: false,
      reason: 'unknown_technique',
    });
    const limited = battle([player({ techniqueIds: ['t.whip'] }), enemy()]);
    expect(cast(limited, 't.blast', { x: 4, y: 5 })).toEqual({
      ok: false,
      reason: 'unknown_technique',
    });
  });
  it('not enough energy uses the effective (focus-reduced) cost', () => {
    // cost 20, focus 30 → ceil(20 × 0.7) = 14
    const poor = battle([
      player({ energy: 13, attributes: { ...player().attributes, focus: 30 } }),
      enemy({ position: { x: 4, y: 3 } }),
    ]);
    expect(cast(poor, 't.burst', { x: 4, y: 4 })).toEqual({
      ok: false,
      reason: 'not_enough_energy',
    });
    const enough = battle([
      player({ energy: 14, attributes: { ...player().attributes, focus: 30 } }),
      enemy({ position: { x: 4, y: 3 } }),
    ]);
    expect(getCombatant(ok(cast(enough, 't.burst', { x: 4, y: 4 })).state, 'p1')?.energy).toBe(0);
  });
  it('range, line of sight, target kind and one action per turn', () => {
    expect(cast(state, 't.claw', { x: 4, y: 5 })).toEqual({ ok: false, reason: 'out_of_range' });
    const rock = makeGrid(10, 10, ({ x, y }) => ({ blocked: x === 3 && y === 5 }));
    const losTech = makeData({
      techniques: { ...techniques, 't.whip': { ...T.whip, requiresLineOfSight: true } },
    });
    expect(cast(battle([player(), enemy()], rock), 't.whip', { x: 4, y: 5 }, losTech)).toEqual({
      ok: false,
      reason: 'no_line_of_sight',
    });
    expect(cast(state, 't.whip', { x: 3, y: 5 })).toEqual({ ok: false, reason: 'invalid_target' });
    const acted = ok(cast(state, 't.whip', { x: 4, y: 5 })).state;
    expect(cast(acted, 't.whip', { x: 4, y: 5 })).toEqual({ ok: false, reason: 'already_acted' });
  });
});

describe('the 8 slice-1 techniques and the 2 monster techniques (shapes)', () => {
  it('water.whip: single enemy damage, +bonus when the target stands in shallow water', () => {
    const r = ok(cast(battle([player(), enemy()]), 't.whip', { x: 4, y: 5 }));
    expect(hp(r.state, 'e1')).toBe(85); // 20 − 10 × 0.5 = 15
    expect(types(r.events)).toEqual(['techniqueUsed', 'damaged']);
    const water = makeGrid(10, 10, ({ x, y }) => ({
      terrain: x === 4 && y === 5 ? 'shallow_water' : 'ground',
    }));
    expect(
      hp(ok(cast(battle([player(), enemy()], water), 't.whip', { x: 4, y: 5 })).state, 'e1'),
    ).toBe(75); // 20 × 1.5 − 5
    // a fire technique gets no water bonus
    expect(
      hp(ok(cast(battle([player(), enemy()], water), 't.blast', { x: 4, y: 5 })).state, 'e1'),
    ).toBe(85);
  });

  it('water.shield: status on an ally or self, always hits, reduces damage taken', () => {
    const r = ok(
      cast(
        battle([player(), ally({ position: { x: 3, y: 6 } }), enemy()]),
        't.shield',
        { x: 3, y: 6 },
        data,
      ),
    );
    expect(getCombatant(r.state, 'p2')?.status).toEqual([
      { id: 'shielded', roundsLeft: 2, magnitude: 0.5 },
    ]);
    expect(types(r.events)).toEqual(['techniqueUsed', 'statusApplied']);
    const self = ok(cast(battle([player(), enemy()]), 't.shield', { x: 2, y: 5 }, data));
    expect(getCombatant(self.state, 'p1')?.status[0]?.id).toBe('shielded');
    const shieldedEnemy = battle([
      player(),
      enemy({ status: [{ id: 'shielded', roundsLeft: 2, magnitude: 0.5 }] }),
    ]);
    expect(hp(ok(cast(shieldedEnemy, 't.whip', { x: 4, y: 5 })).state, 'e1')).toBe(95); // 20 × 0.5 − 5
  });

  it('water.freeze: damages everyone in the cross area', () => {
    const state = battle([
      player(),
      enemy({ position: { x: 5, y: 5 } }),
      ally({ position: { x: 5, y: 6 }, facing: 'W' }),
    ]);
    const r = ok(cast(state, 't.freeze', { x: 5, y: 5 }));
    expect(hp(r.state, 'e1')).toBe(85);
    expect(hp(r.state, 'p2')).toBe(85);
    expect(r.events[0]).toMatchObject({
      type: 'techniqueUsed',
      affectedCells: expect.arrayContaining([{ x: 5, y: 4 }]),
    });
  });

  it('water.glide: dashes ignoring water cost and does not spend the movement', () => {
    const river = makeGrid(10, 10, ({ x }) => ({
      terrain: x >= 3 && x <= 5 ? 'shallow_water' : 'ground',
    }));
    const state = battle([player({ element: 'fire' }), enemy({ position: { x: 9, y: 9 } })], river);
    const r = ok(cast(state, 't.glide', { x: 6, y: 5 }));
    expect(getCombatant(r.state, 'p1')?.position).toEqual({ x: 6, y: 5 });
    expect(r.state.turn).toMatchObject({ hasMoved: false, hasActed: true });
    expect(types(r.events)).toEqual(['techniqueUsed', 'moved']);
    expect(applyAction(r.state, { type: 'move', actorId: 'p1', to: { x: 7, y: 5 } }, sure).ok).toBe(
      true,
    );
    // the landing cell must be free
    const occupied = battle(
      [player(), ally({ position: { x: 2, y: 7 } }), enemy({ position: { x: 9, y: 9 } })],
      river,
    );
    expect(cast(occupied, 't.glide', { x: 2, y: 7 })).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('fire.blast: single enemy damage', () => {
    const far = battle([player(), enemy({ position: { x: 6, y: 5 } })]);
    expect(hp(ok(cast(far, 't.blast', { x: 6, y: 5 })).state, 'e1')).toBe(85);
  });

  it('fire.wall: sets fire on a line of 3 cells perpendicular to the user, no damage', () => {
    const r = ok(
      cast(battle([player(), enemy({ position: { x: 9, y: 9 } })]), 't.wall', { x: 4, y: 5 }),
    );
    expect(r.events).toEqual([
      expect.objectContaining({
        type: 'techniqueUsed',
        affectedCells: [
          { x: 4, y: 4 },
          { x: 4, y: 5 },
          { x: 4, y: 6 },
        ],
      }),
      expect.objectContaining({
        type: 'cellEffectApplied',
        position: { x: 4, y: 4 },
        kind: 'fire',
      }),
      expect.objectContaining({
        type: 'cellEffectApplied',
        position: { x: 4, y: 5 },
        kind: 'fire',
      }),
      expect.objectContaining({
        type: 'cellEffectApplied',
        position: { x: 4, y: 6 },
        kind: 'fire',
      }),
    ]);
  });

  it('fire.burst: hits allies too and records the technique for the CT delay', () => {
    const state = battle([
      player(),
      enemy({ position: { x: 5, y: 5 } }),
      ally({ position: { x: 5, y: 4 }, facing: 'W' }),
    ]);
    const r = ok(cast(state, 't.burst', { x: 5, y: 5 }));
    expect(hp(r.state, 'e1')).toBe(85);
    expect(hp(r.state, 'p2')).toBe(85);
    expect(r.state.turn?.usedTechniqueId).toBe('t.burst');
    const ended = ok(applyAction(r.state, { type: 'endTurn', actorId: 'p1' }, sure));
    expect(ended.events[0]).toMatchObject({ type: 'turnEnded', ctAfter: -130 });
  });

  it('fire.surge: straight dash; damages an enemy adjacent to the landing cell', () => {
    const state = battle([player(), enemy({ position: { x: 6, y: 5 } })]);
    const r = ok(cast(state, 't.surge', { x: 5, y: 5 }));
    expect(getCombatant(r.state, 'p1')?.position).toEqual({ x: 5, y: 5 });
    expect(hp(r.state, 'e1')).toBe(85);
    expect(types(r.events)).toEqual(['techniqueUsed', 'moved', 'damaged']);
    // no enemy adjacent → only the dash
    expect(types(ok(cast(state, 't.surge', { x: 2, y: 3 })).events)).toEqual([
      'techniqueUsed',
      'moved',
    ]);
    // not in a straight line → unreachable; an enemy in the way blocks
    expect(cast(state, 't.surge', { x: 3, y: 4 })).toEqual({ ok: false, reason: 'unreachable' });
    const blocked = battle([player(), enemy({ position: { x: 3, y: 5 } })]);
    expect(cast(blocked, 't.surge', { x: 5, y: 5 })).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('monster.claw: melee damage', () => {
    const state = battle([player({ position: { x: 3, y: 5 } }), enemy()]);
    expect(hp(ok(cast(state, 't.claw', { x: 4, y: 5 })).state, 'e1')).toBe(85);
  });

  it('monster.pounce: dashes next to the target, faces it and damages it', () => {
    const state = battle([player({ position: { x: 1, y: 5 }, facing: 'N' }), enemy()]);
    const r = ok(cast(state, 't.pounce', { x: 4, y: 5 }));
    const p1 = getCombatant(r.state, 'p1');
    expect(p1?.position).toEqual({ x: 3, y: 5 });
    expect(p1?.facing).toBe('E');
    expect(hp(r.state, 'e1')).toBe(85);
    expect(types(r.events)).toEqual(['techniqueUsed', 'moved', 'damaged']);
  });
});

describe('technique resolution rules', () => {
  it('flank: attacking the back multiplies damage (rules value)', () => {
    // enemy faces E, attacker on its W side → back → ×2 in test rules: 40 − 5
    const r = ok(cast(battle([player(), enemy({ facing: 'E' })]), 't.whip', { x: 4, y: 5 }));
    expect(hp(r.state, 'e1')).toBe(65);
  });

  it('with a fixed seed the hit/damage outcome is always the same', () => {
    const lowAccuracy = makeData({
      techniques: { ...techniques, 't.whip': { ...T.whip, accuracy: 50 } },
    });
    const outcomes = (seed: number) => {
      const state = deepFreeze(
        makeBattle({ seed, rngState: seed, combatants: [player(), enemy()] }),
      );
      return types(ok(cast(state, 't.whip', { x: 4, y: 5 }, lowAccuracy)).events).join(',');
    };
    const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
    const first = seeds.map(outcomes);
    expect(seeds.map(outcomes)).toEqual(first);
    expect(new Set(first).size).toBe(2); // both hits and misses happen across seeds
    expect(first).toContain('techniqueUsed,missed');
  });

  it('a combatant reaching 0 hp is defeated', () => {
    const r = ok(cast(battle([player(), enemy({ hp: 10 })]), 't.whip', { x: 4, y: 5 }));
    expect(getCombatant(r.state, 'e1')).toMatchObject({ hp: 0, alive: false });
    expect(types(r.events)).toEqual(['techniqueUsed', 'damaged', 'defeated', 'battleEnded']);
  });

  it('statuses expire at the end of the round after their duration', () => {
    const state = battle([player({ ct: 100 }), enemy({ position: { x: 9, y: 9 } })]);
    let current = ok(cast(state, 't.shield', { x: 2, y: 5 })).state;
    const roundEnd = () => {
      // end p1's turn, then let e1 act (end turn) to close the round
      current = ok(applyAction(current, { type: 'endTurn', actorId: 'p1' }, sure)).state;
      const next = ok(applyAction(current, { type: 'advance' }, sure));
      const actor = next.state.turn?.combatantId ?? '';
      const ended = ok(applyAction(next.state, { type: 'endTurn', actorId: actor }, sure));
      current = ended.state;
      if (actor !== 'e1') throw new Error('expected e1');
      current = ok(applyAction(current, { type: 'advance' }, sure)).state;
      return ended.events;
    };
    expect(types(roundEnd())).not.toContain('statusExpired');
    expect(getCombatant(current, 'p1')?.status[0]?.roundsLeft).toBe(1);
    expect(types(roundEnd())).toContain('statusExpired');
    expect(getCombatant(current, 'p1')?.status).toEqual([]);
  });
});
