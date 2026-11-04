import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import { fireDamageAt } from '../terrain/terrain.ts';
import type { BattleState, Combatant } from '../types.ts';

const DEFENDING = 'defending';

/** docs/02 §6.7 — regen = regenBase + floor(spirit / divisor) + floor(focus / divisor). */
export function energyRegenOf(c: Combatant, data: GameData): number {
  const { energy } = data.rules;
  return (
    energy.regenBase +
    Math.floor(c.attributes.spirit / energy.regenSpiritDivisor) +
    Math.floor(c.attributes.focus / energy.regenFocusDivisor)
  );
}

/** docs/02 §11 step 3 — start of turn: regenerate energy, fire damage, drop the previous defence. */
export function startTurn(
  state: BattleState,
  actorId: string,
  data: GameData,
): { state: BattleState; events: BattleEventBody[] } {
  const events: BattleEventBody[] = [];
  let next = state;
  if (requireCombatant(next, actorId).status.some((s) => s.id === DEFENDING)) {
    next = updateCombatant(next, actorId, (c) => ({
      ...c,
      status: c.status.filter((s) => s.id !== DEFENDING),
    }));
    events.push({ type: 'statusExpired', targetId: actorId, statusId: DEFENDING });
  }
  const actor = requireCombatant(next, actorId);
  const energy = Math.min(actor.maxEnergy, actor.energy + energyRegenOf(actor, data));
  next = updateCombatant(next, actorId, (c) => ({ ...c, energy }));
  events.unshift({ type: 'turnStarted', combatantId: actorId, energyRegen: energy - actor.energy });
  // docs/02 §8 — starting the turn on a burning cell hurts.
  const burned = fireDamageAt(next, actorId, actor.position, data);
  next = burned.state;
  events.splice(1, 0, ...burned.events);
  return { state: next, events };
}
