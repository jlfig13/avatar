import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import { finishTurn, predictTurnOrder, speedOf } from '../src/ct/ct.ts';
import type { BattleState } from '../src/types.ts';
import { deepFreeze, makeBattle, makeCombatant, makeData, makeTechnique } from './factories.ts';

const attrs = (mobility: number) => ({
  power: 10,
  control: 10,
  resistance: 10,
  mobility,
  spirit: 10,
  focus: 0,
});
const data = makeData({
  techniques: { 'test.heavy': makeTechnique({ id: 'test.heavy', ctDelay: 30 }) },
});

function trio(): BattleState {
  return makeBattle({
    turn: null,
    round: 0,
    combatants: [
      makeCombatant({ id: 'a', attributes: attrs(10), position: { x: 0, y: 0 } }),
      makeCombatant({ id: 'b', attributes: attrs(15), position: { x: 1, y: 0 } }),
      makeCombatant({ id: 'c', attributes: attrs(20), position: { x: 2, y: 0 } }),
    ],
  });
}

/** Plays `count` turns of "advance → end turn" and returns who acted, plus the events. */
function play(state: BattleState, count: number, technique: Record<string, string> = {}) {
  const order: string[] = [];
  const events: string[] = [];
  let current = state;
  for (let i = 0; i < count; i++) {
    const advanced = applyAction(current, { type: 'advance' }, data);
    if (!advanced.ok) throw new Error(advanced.reason);
    events.push(...advanced.events.map((e) => e.type));
    const actor = advanced.state.turn?.combatantId ?? '';
    order.push(actor);
    const used = technique[actor] ?? null;
    const withTurn = {
      ...advanced.state,
      turn: advanced.state.turn && { ...advanced.state.turn, usedTechniqueId: used },
    };
    const ended = finishTurn(withTurn, data);
    events.push(...ended.events.map((e) => e.type));
    current = ended.state;
  }
  return { order, events, state: current };
}

describe('CT bar', () => {
  it('speed = 4 + floor(mobility / 5)', () => {
    expect(speedOf(makeCombatant({ id: 'x', attributes: attrs(10) }), data)).toBe(6);
    expect(speedOf(makeCombatant({ id: 'x', attributes: attrs(19) }), data)).toBe(7);
  });

  it('turn order for mobility 10/15/20 matches the hand-computed table', () => {
    // speeds a=6, b=7, c=8; all start at ct 0. Hand computation (ct after the ticks):
    // 1) t=13: c=104 → c acts, c=4      (a=78, b=91)
    // 2) +2:   b=105 → b acts, b=5      (a=90, c=20)
    // 3) +2:   a=102 → a acts, a=2      (b=19, c=36)
    // 4) +8:   c=100 → c acts, c=0      (a=50, b=75)
    // 5) +4:   b=103 → b acts, b=3      (a=74, c=32)
    // 6) +5:   a=104 and c=72 → a acts
    expect(play(trio(), 6).order).toEqual(['c', 'b', 'a', 'c', 'b', 'a']);
  });

  it('predictTurnOrder matches the played order and does not change the state', () => {
    const state = deepFreeze(trio());
    expect(predictTurnOrder(state, 6, data)).toEqual(['c', 'b', 'a', 'c', 'b', 'a']);
  });

  it('breaks ties by higher speed, then lower id', () => {
    const tie = makeBattle({
      turn: null,
      combatants: [
        makeCombatant({ id: 'z', attributes: attrs(10), ct: 100 }),
        makeCombatant({ id: 'y', attributes: attrs(20), ct: 100 }),
        makeCombatant({ id: 'x', attributes: attrs(10), ct: 100 }),
      ],
    });
    expect(predictTurnOrder(tie, 3, data)).toEqual(['y', 'x', 'z']);
  });

  it('a technique with ctDelay 30 delays the user relative to one who did not use it', () => {
    const twins = makeBattle({
      turn: null,
      round: 0,
      combatants: [
        makeCombatant({ id: 'heavy', attributes: attrs(10), position: { x: 0, y: 0 } }),
        makeCombatant({ id: 'light', attributes: attrs(10), position: { x: 1, y: 0 } }),
      ],
    });
    // Same speed: "heavy" acts first (id tie-break), uses the heavy technique, then waits longer.
    const { order } = play(twins, 4, { heavy: 'test.heavy' });
    expect(order.slice(0, 2)).toEqual(['heavy', 'light']);
    expect(order[2]).toBe('light');
  });

  it('emits roundStarted when every living combatant has acted', () => {
    const { events, state } = play(trio(), 3);
    expect(events.filter((e) => e === 'roundStarted')).toHaveLength(2); // round 1 and round 2
    expect(events.at(-1)).toBe('roundStarted');
    expect(state.round).toBe(2);
    expect(state.actedThisRound).toEqual([]);
  });

  it('ignores defeated combatants for ticks and for the end of the round', () => {
    const state = makeBattle({
      turn: null,
      round: 1,
      combatants: [
        makeCombatant({ id: 'a', attributes: attrs(10) }),
        makeCombatant({ id: 'dead', attributes: attrs(40), alive: false }),
      ],
    });
    const { order, state: after } = play(state, 1);
    expect(order).toEqual(['a']);
    expect(after.round).toBe(2);
  });

  it('advance is rejected while a turn is active', () => {
    const result = applyAction(makeBattle(), { type: 'advance' }, data);
    expect(result).toEqual({ ok: false, reason: 'not_your_turn' });
  });
});
