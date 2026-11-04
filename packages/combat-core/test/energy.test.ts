import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply.ts';
import { getCombatant } from '../src/state.ts';
import { energyRegenOf } from '../src/turn/startTurn.ts';
import { makeBattle, makeCombatant, makeData, makeTechnique } from './factories.ts';

const data = makeData({ techniques: { 't.x': makeTechnique({ id: 't.x', energyCost: 15 }) } });
const attrs = (spirit: number, focus: number) => ({
  power: 10,
  control: 10,
  resistance: 10,
  mobility: 10,
  spirit,
  focus,
});

describe('energy', () => {
  it('regen = 2 + floor(spirit / 10) + floor(focus / 10)', () => {
    expect(energyRegenOf(makeCombatant({ id: 'a', attributes: attrs(12, 25) }), data)).toBe(
      2 + 1 + 2,
    );
    expect(energyRegenOf(makeCombatant({ id: 'a', attributes: attrs(9, 9) }), data)).toBe(2);
  });

  it('regenerates at the start of the turn and reports it in turnStarted', () => {
    const state = makeBattle({
      turn: null,
      combatants: [
        makeCombatant({ id: 'p1', ct: 100, energy: 10, maxEnergy: 60, attributes: attrs(20, 10) }),
      ],
    });
    const result = applyAction(state, { type: 'advance' }, data);
    if (!result.ok) throw new Error(result.reason);
    expect(getCombatant(result.state, 'p1')?.energy).toBe(15);
    expect(result.events[0]).toMatchObject({
      type: 'turnStarted',
      combatantId: 'p1',
      energyRegen: 5,
    });
  });

  it('never exceeds the maximum', () => {
    const state = makeBattle({
      turn: null,
      combatants: [
        makeCombatant({ id: 'p1', ct: 100, energy: 58, maxEnergy: 60, attributes: attrs(20, 10) }),
      ],
    });
    const result = applyAction(state, { type: 'advance' }, data);
    if (!result.ok) throw new Error(result.reason);
    expect(getCombatant(result.state, 'p1')?.energy).toBe(60);
    expect(result.events[0]).toMatchObject({ energyRegen: 2 });
  });

  it('a technique without enough energy returns not_enough_energy', () => {
    const state = makeBattle({
      combatants: [
        makeCombatant({ id: 'p1', energy: 14, techniqueIds: ['t.x'] }),
        makeCombatant({ id: 'e1', team: 'enemies', position: { x: 1, y: 0 } }),
      ],
    });
    expect(
      applyAction(
        state,
        { type: 'technique', actorId: 'p1', techniqueId: 't.x', target: { x: 1, y: 0 } },
        data,
      ),
    ).toEqual({
      ok: false,
      reason: 'not_enough_energy',
    });
  });
});
