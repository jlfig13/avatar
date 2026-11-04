import type { BattleEventBody } from '../events.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import type { BattleState } from '../types.ts';

type Source = Extract<BattleEventBody, { type: 'damaged' }>['source'];

/** Subtracts hp (never below 0) and emits damaged (+ defeated when it reaches 0). */
export function applyDamage(
  state: BattleState,
  targetId: string,
  amount: number,
  source: Source,
): { state: BattleState; events: BattleEventBody[] } {
  const target = requireCombatant(state, targetId);
  if (!target.alive) return { state, events: [] };
  const hpAfter = Math.max(0, target.hp - amount);
  const next = updateCombatant(state, targetId, (c) => ({ ...c, hp: hpAfter, alive: hpAfter > 0 }));
  const events: BattleEventBody[] = [{ type: 'damaged', targetId, amount, hpAfter, source }];
  if (hpAfter === 0) events.push({ type: 'defeated', combatantId: targetId });
  return { state: next, events };
}

export function applyHeal(
  state: BattleState,
  targetId: string,
  amount: number,
): { state: BattleState; events: BattleEventBody[] } {
  const target = requireCombatant(state, targetId);
  if (!target.alive) return { state, events: [] };
  const hpAfter = Math.min(target.maxHp, target.hp + amount);
  const next = updateCombatant(state, targetId, (c) => ({ ...c, hp: hpAfter }));
  return {
    state: next,
    events: [{ type: 'healed', targetId, amount: hpAfter - target.hp, hpAfter }],
  };
}
