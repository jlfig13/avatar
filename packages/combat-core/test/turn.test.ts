import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import type { ApplyResult } from '../src/events.ts';
import { defendMultiplier } from '../src/modifiers/defense.ts';
import { getCombatant } from '../src/state.ts';
import { turnTimeoutSeconds } from '../src/turn/handlers.ts';
import type { Action, BattleState } from '../src/types.ts';
import { deepFreeze, makeBattle, makeCombatant, makeData, testRules } from './factories.ts';

const data = makeData();

function ok(result: ApplyResult): Extract<ApplyResult, { ok: true }> {
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result;
}
const run = (state: BattleState, ...actions: Action[]) =>
  actions.reduce((s, a) => ok(applyAction(s, a, data)).state, state);

const battle = () =>
  deepFreeze(
    makeBattle({
      combatants: [
        makeCombatant({ id: 'p1', position: { x: 2, y: 2 }, facing: 'N', ct: 100 }),
        makeCombatant({ id: 'e1', team: 'enemies', controller: 'ai', position: { x: 8, y: 8 } }),
      ],
    }),
  );

describe('turn flow', () => {
  it('allows move then act, or act then move, once each', () => {
    const moveFirst = run(
      battle(),
      { type: 'move', actorId: 'p1', to: { x: 3, y: 2 } },
      { type: 'defend', actorId: 'p1' },
    );
    expect(moveFirst.turn).toMatchObject({ hasMoved: true, hasActed: true });
    const actFirst = run(
      battle(),
      { type: 'defend', actorId: 'p1' },
      { type: 'move', actorId: 'p1', to: { x: 3, y: 2 } },
    );
    expect(actFirst.turn).toMatchObject({ hasMoved: true, hasActed: true });
    expect(
      applyAction(moveFirst, { type: 'move', actorId: 'p1', to: { x: 4, y: 2 } }, data),
    ).toEqual({
      ok: false,
      reason: 'already_moved',
    });
    expect(applyAction(actFirst, { type: 'defend', actorId: 'p1' }, data)).toEqual({
      ok: false,
      reason: 'already_acted',
    });
  });

  it('rejects a destination outside the reachable cells', () => {
    // mobility 10 → 4 movement points
    expect(
      applyAction(battle(), { type: 'move', actorId: 'p1', to: { x: 7, y: 2 } }, data),
    ).toEqual({
      ok: false,
      reason: 'unreachable',
    });
    expect(
      applyAction(battle(), { type: 'move', actorId: 'p1', to: { x: 99, y: 2 } }, data),
    ).toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });

  it('updates position and facing to the direction of the last step', () => {
    const result = ok(
      applyAction(battle(), { type: 'move', actorId: 'p1', to: { x: 3, y: 4 } }, data),
    );
    const p1 = getCombatant(result.state, 'p1');
    expect(p1?.position).toEqual({ x: 3, y: 4 });
    expect(p1?.facing).toBe('S');
    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'moved',
        combatantId: 'p1',
        facing: 'S',
        path: expect.any(Array),
      }),
    ]);
    const west = ok(
      applyAction(battle(), { type: 'move', actorId: 'p1', to: { x: 0, y: 2 } }, data),
    );
    expect(getCombatant(west.state, 'p1')?.facing).toBe('W');
  });

  it('defend reduces damage taken by 30% (rules value) until the defender’s next turn', () => {
    const realData = makeData({
      rules: { ...testRules, turn: { ...testRules.turn, defendDamageMultiplier: 0.7 } },
    });
    const defended = ok(applyAction(battle(), { type: 'defend', actorId: 'p1' }, realData));
    const p1 = getCombatant(defended.state, 'p1');
    expect(p1 && Math.round(100 * defendMultiplier(p1))).toBe(70);

    // Still defending after ending the turn (and through the enemy's turn)…
    const ended = ok(applyAction(defended.state, { type: 'endTurn', actorId: 'p1' }, realData));
    const p1AfterEnd = getCombatant(ended.state, 'p1');
    expect(p1AfterEnd && defendMultiplier(p1AfterEnd)).toBe(0.7);

    // …and removed when p1's next turn starts.
    const ready = {
      ...ended.state,
      combatants: ended.state.combatants.map((c) => (c.id === 'p1' ? { ...c, ct: 100 } : c)),
    };
    const nextTurn = ok(applyAction(ready, { type: 'advance' }, realData));
    expect(nextTurn.state.turn?.combatantId).toBe('p1');
    const p1Next = getCombatant(nextTurn.state, 'p1');
    expect(p1Next && defendMultiplier(p1Next)).toBe(1);
    expect(nextTurn.events.map((e) => e.type)).toEqual(['turnStarted', 'statusExpired']);
  });

  it('endTurn closes the turn', () => {
    const result = ok(applyAction(battle(), { type: 'endTurn', actorId: 'p1' }, data));
    expect(result.state.turn).toBeNull();
    expect(result.events[0]).toMatchObject({ type: 'turnEnded', combatantId: 'p1', ctAfter: 0 });
  });
});

describe('timeout', () => {
  it('defends automatically, passes the turn and counts consecutive timeouts', () => {
    const result = ok(applyAction(battle(), { type: 'timeout', actorId: 'p1' }, data));
    expect(result.events.map((e) => e.type)).toEqual(['timedOut', 'defended', 'turnEnded']);
    expect(result.state.turn).toBeNull();
    const p1 = getCombatant(result.state, 'p1');
    expect(p1?.consecutiveTimeouts).toBe(1);
    expect(p1 && defendMultiplier(p1)).toBe(testRules.turn.defendDamageMultiplier);
  });

  it('only passes when the action was already used', () => {
    const acted = run(battle(), { type: 'defend', actorId: 'p1' });
    const result = ok(applyAction(acted, { type: 'timeout', actorId: 'p1' }, data));
    expect(result.events.map((e) => e.type)).toEqual(['timedOut', 'turnEnded']);
  });

  it('any manual action resets the counter; 3 timeouts shorten the turn time', () => {
    const afk = {
      ...battle(),
      combatants: battle().combatants.map((c) =>
        c.id === 'p1' ? { ...c, consecutiveTimeouts: 3 } : c,
      ),
    };
    expect(turnTimeoutSeconds(afk, 'p1', data)).toBe(testRules.turn.afkTimeoutSeconds);
    const moved = run(afk, { type: 'move', actorId: 'p1', to: { x: 3, y: 2 } });
    expect(getCombatant(moved, 'p1')?.consecutiveTimeouts).toBe(0);
    expect(turnTimeoutSeconds(moved, 'p1', data)).toBe(testRules.turn.timeoutSeconds);
    const ended = run(afk, { type: 'endTurn', actorId: 'p1' });
    expect(getCombatant(ended, 'p1')?.consecutiveTimeouts).toBe(0);
  });
});
