import type { GameData, Passive } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { facingOf, manhattan } from '../grid/grid.ts';
import { isHostile } from '../pathfinding/pathfinding.ts';
import { rollInt } from '../rng.ts';
import { requireCombatant, updateCombatant } from '../state.ts';
import { damageAmount, hitChance } from '../techniques/formulas.ts';
import { applyDamage } from '../techniques/hp.ts';
import { push } from '../techniques/movement.ts';
import type { BattleState, Combatant, Position } from '../types.ts';

// docs/02 §7 — reactions come only from passives; max 1 per combatant per round; no chains.

type Result = { state: BattleState; events: BattleEventBody[] };
type Trigger = Passive['reaction']['trigger'];

export interface HitRecord {
  readonly victimId: string;
  /** attacker was adjacent (range 1) when the hit landed */
  readonly melee: boolean;
}

function reactionOf(
  reactor: Combatant,
  triggers: readonly Trigger[],
  data: GameData,
): Passive | undefined {
  if (!reactor.alive || reactor.fled || reactor.reactionUsedThisRound) return undefined;
  return reactor.passiveIds
    .map((id) => data.passives[id])
    .find((p): p is Passive => !!p && triggers.includes(p.reaction.trigger));
}

/** Resolves one reaction of `reactorId` against `targetId`. Its effects never trigger reactions. */
function react(
  state: BattleState,
  reactorId: string,
  passive: Passive,
  targetId: string,
  data: GameData,
): Result {
  let next = updateCombatant(state, reactorId, (c) => ({ ...c, reactionUsedThisRound: true }));
  const events: BattleEventBody[] = [
    { type: 'reaction', combatantId: reactorId, reactionId: passive.id, triggeredBy: targetId },
  ];
  const reactor = requireCombatant(next, reactorId);
  const target = requireCombatant(next, targetId);
  if (!target.alive) return { state: next, events };
  const effect = passive.reaction.effect;
  switch (effect.kind) {
    case 'counterAttack': {
      // The "basic attack" is the reactor's first technique (monster.claw for the clawbeast).
      const basic = data.techniques[reactor.techniqueIds[0] ?? ''];
      if (!basic) break;
      const [roll, rolled] = rollInt(next, 1, 100);
      next = rolled;
      if (roll > hitChance(next.grid, basic, reactor, target, data)) {
        events.push({ type: 'missed', attackerId: reactorId, targetId });
        break;
      }
      const full = damageAmount(next.grid, basic, reactor, target, data);
      const amount = Math.max(
        data.rules.damage.minDamage,
        Math.round(full * effect.damageMultiplier),
      );
      const hit = applyDamage(next, targetId, amount, 'reaction');
      next = hit.state;
      events.push(...hit.events);
      break;
    }
    case 'push': {
      const away = facingOf(reactor.position, target.position, reactor.facing);
      const pushed = push(next, targetId, away, effect.cells, data);
      next = pushed.state;
      events.push(...pushed.events);
      break;
    }
    case 'status':
      next = updateCombatant(next, targetId, (c) => ({
        ...c,
        status: [
          ...c.status.filter((s) => s.id !== effect.statusId),
          { id: effect.statusId, roundsLeft: effect.rounds, magnitude: effect.magnitude },
        ],
      }));
      events.push({
        type: 'statusApplied',
        targetId,
        statusId: effect.statusId,
        rounds: effect.rounds,
      });
      break;
  }
  return { state: next, events };
}

/** After a technique resolves: every surviving victim may react to the attacker (hitByAny / hitByMelee). */
export function reactToHits(
  state: BattleState,
  attackerId: string,
  hits: readonly HitRecord[],
  data: GameData,
): Result {
  let next = state;
  const events: BattleEventBody[] = [];
  for (const hit of hits) {
    if (hit.victimId === attackerId) continue;
    const victim = requireCombatant(next, hit.victimId);
    const triggers: Trigger[] = hit.melee ? ['hitByMelee', 'hitByAny'] : ['hitByAny'];
    const passive = reactionOf(victim, triggers, data);
    if (!passive || !requireCombatant(next, attackerId).alive) continue;
    const result = react(next, victim.id, passive, attackerId, data);
    next = result.state;
    events.push(...result.events);
  }
  return { state: next, events };
}

/** After a movement: hostile combatants the mover just became adjacent to may react (enemyEntersAdjacent). */
export function reactToApproach(
  state: BattleState,
  moverId: string,
  from: Position,
  data: GameData,
): Result {
  let next = state;
  const events: BattleEventBody[] = [];
  for (const other of state.combatants) {
    const mover = requireCombatant(next, moverId);
    if (!mover.alive || other.id === moverId || !isHostile(other, mover)) continue;
    const wasAdjacent = manhattan(from, other.position) === 1;
    if (wasAdjacent || manhattan(mover.position, other.position) !== 1) continue;
    const passive = reactionOf(requireCombatant(next, other.id), ['enemyEntersAdjacent'], data);
    if (!passive) continue;
    const result = react(next, other.id, passive, moverId, data);
    next = result.state;
    events.push(...result.events);
  }
  return { state: next, events };
}
