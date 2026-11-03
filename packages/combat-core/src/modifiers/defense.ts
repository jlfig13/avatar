import type { Combatant } from '../types.ts';

/** docs/02 §6.6 — multDefender: the `defending` status stores rules.turn.defendDamageMultiplier. */
export function defendMultiplier(target: Combatant): number {
  return target.status.find((s) => s.id === 'defending')?.magnitude ?? 1;
}
