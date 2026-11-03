import { describe, expect, it } from 'vitest';
import { applyAction, finalize } from '../src/apply.ts';
import { accept } from '../src/events.ts';
import { updateCell, updateCombatant } from '../src/state.ts';
import { deepFreeze, emptyData, makeBattle } from './factories.ts';

describe('applyAction', () => {
  it('rejects an action from a combatant that does not own the turn', () => {
    const state = deepFreeze(makeBattle());
    const result = applyAction(state, { type: 'endTurn', actorId: 'e1' }, emptyData);
    expect(result).toEqual({ ok: false, reason: 'not_your_turn' });
  });

  it('rejects actor actions when there is no active turn', () => {
    const state = deepFreeze(makeBattle({ turn: null }));
    const result = applyAction(state, { type: 'defend', actorId: 'p1' }, emptyData);
    expect(result).toEqual({ ok: false, reason: 'not_your_turn' });
  });

  it('rejects any action after the battle ended', () => {
    const state = deepFreeze(makeBattle({ phase: 'victory' }));
    expect(applyAction(state, { type: 'advance' }, emptyData)).toEqual({
      ok: false,
      reason: 'battle_over',
    });
  });

  it('never mutates the input state (deep-frozen)', () => {
    const state = deepFreeze(makeBattle());
    const snapshot = structuredClone(state);
    for (const action of [
      { type: 'advance' } as const,
      { type: 'endTurn', actorId: 'p1' } as const,
      { type: 'move', actorId: 'p1', to: { x: 2, y: 1 } } as const,
    ]) {
      applyAction(state, action, emptyData);
    }
    expect(state).toEqual(snapshot);
  });
});

describe('event seq', () => {
  it('stamps increasing seq continuing from state.eventSeq', () => {
    const state = makeBattle({ eventSeq: 41 });
    const result = finalize(
      accept(state, [
        { type: 'roundStarted', round: 1 },
        { type: 'turnStarted', combatantId: 'p1', energyRegen: 0 },
        { type: 'defended', combatantId: 'p1' },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((e) => e.seq)).toEqual([42, 43, 44]);
    expect(result.state.eventSeq).toBe(44);
  });
});

describe('immutable helpers', () => {
  it('updateCombatant returns a new state and leaves the original intact', () => {
    const state = deepFreeze(makeBattle());
    const next = updateCombatant(state, 'p1', (c) => ({ ...c, hp: 1 }));
    expect(next.combatants[0]?.hp).toBe(1);
    expect(state.combatants[0]?.hp).toBe(100);
    expect(next.combatants[1]).toBe(state.combatants[1]);
  });

  it('updateCombatant throws for an unknown id (programming error)', () => {
    expect(() => updateCombatant(makeBattle(), 'nobody', (c) => c)).toThrow();
  });

  it('updateCell returns a new grid and leaves the original intact', () => {
    const state = deepFreeze(makeBattle());
    const grid = updateCell(state.grid, { x: 2, y: 3 }, (cell) => ({ ...cell, height: 4 }));
    expect(grid.cells[3 * 10 + 2]?.height).toBe(4);
    expect(state.grid.cells[3 * 10 + 2]?.height).toBe(0);
  });
});
