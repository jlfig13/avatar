import { isHostile } from '../pathfinding/pathfinding.ts';
import { damageAmount, hitChance } from '../techniques/formulas.ts';
import type { Consideration } from './types.ts';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** chance × damage against hostile victims (as a fraction of their remaining hp), minus friendly fire. */
export const expectedDamage: Consideration = {
  id: 'expectedDamage',
  evaluate({ plan, state, actor, victims, ctx }) {
    if (plan.act?.kind !== 'technique') return 0;
    const { technique } = plan.act;
    if (!technique.effects.some((e) => e.kind === 'damage')) return 0;
    let value = 0;
    for (const victim of victims) {
      if (victim.id === actor.id) continue;
      const chance = hitChance(state.grid, technique, actor, victim, ctx.data) / 100;
      const share = Math.min(
        1,
        damageAmount(state.grid, technique, actor, victim, ctx.data) / victim.hp,
      );
      value += (isHostile(actor, victim) ? 1 : -1) * chance * share;
    }
    return clamp01(value);
  },
};

/** Every consideration known by the AI, by id. Profiles in rules.json pick and weight them. */
export const CONSIDERATIONS: Readonly<Record<string, Consideration>> = {
  [expectedDamage.id]: expectedDamage,
};
