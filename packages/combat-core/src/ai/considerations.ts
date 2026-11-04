import { getCell, manhattan } from '../grid/grid.ts';
import { flankPosition } from '../modifiers/position.ts';
import { isHostile, movementPoints } from '../pathfinding/pathfinding.ts';
import { damageAmount, effectiveCost, hitChance, SHIELDED } from '../techniques/formulas.ts';
import type { Combatant } from '../types.ts';
import type { Consideration, PlanView } from './types.ts';

// docs/05 §8 — slice-1 considerations. Each returns a value in [0, 1]; higher is better.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const active = (c: Combatant) => c.alive && !c.fled;

const damagingTechnique = (view: PlanView) =>
  view.plan.act?.kind === 'technique' &&
  view.plan.act.technique.effects.some((e) => e.kind === 'damage')
    ? view.plan.act.technique
    : null;

const hostileVictims = (view: PlanView) =>
  view.victims.filter((v) => v.id !== view.actor.id && isHostile(view.actor, v));

/** Nearest hostile (then lowest hp, then id) from the actor's current position. */
export function preferredTarget(view: PlanView): Combatant | undefined {
  const origin =
    view.ctx.state.combatants.find((c) => c.id === view.actor.id)?.position ?? view.actor.position;
  return view.state.combatants
    .filter((c) => active(c) && isHostile(view.actor, c))
    .sort(
      (a, b) =>
        manhattan(origin, a.position) - manhattan(origin, b.position) ||
        a.hp - b.hp ||
        (a.id < b.id ? -1 : 1),
    )[0];
}

/** chance × damage against hostile victims (fraction of their remaining hp), minus friendly fire. */
export const expectedDamage: Consideration = {
  id: 'expectedDamage',
  evaluate(view) {
    const technique = damagingTechnique(view);
    if (!technique) return 0;
    let value = 0;
    for (const victim of view.victims) {
      if (victim.id === view.actor.id) continue;
      const chance = hitChance(view.state.grid, technique, view.actor, victim, view.ctx.data) / 100;
      const share = Math.min(
        1,
        damageAmount(view.state.grid, technique, view.actor, victim, view.ctx.data) / victim.hp,
      );
      value += (isHostile(view.actor, victim) ? 1 : -1) * chance * share;
    }
    return clamp01(value);
  },
};

/** Highest chance of defeating a hostile victim with this technique. */
export const killChance: Consideration = {
  id: 'killChance',
  evaluate(view) {
    const technique = damagingTechnique(view);
    if (!technique) return 0;
    let best = 0;
    for (const victim of hostileVictims(view)) {
      if (
        damageAmount(view.state.grid, technique, view.actor, victim, view.ctx.data) >= victim.hp
      ) {
        best = Math.max(
          best,
          hitChance(view.state.grid, technique, view.actor, victim, view.ctx.data) / 100,
        );
      }
    }
    return best;
  },
};

/** Damage the enemies could expect to deal to `target` on its position next turn. */
export function incomingDamage(view: PlanView, target: Combatant): number {
  const { state, ctx } = view;
  let risk = 0;
  for (const enemy of state.combatants) {
    if (!active(enemy) || !isHostile(target, enemy)) continue;
    let best = 0;
    for (const id of enemy.techniqueIds) {
      const technique = ctx.data.techniques[id];
      if (!technique?.effects.some((e) => e.kind === 'damage')) continue;
      if (effectiveCost(technique, enemy, ctx.data) > enemy.energy) continue;
      const reach = movementPoints(enemy, ctx.data) + technique.range.max;
      if (manhattan(enemy.position, target.position) > reach) continue;
      const chance = hitChance(state.grid, technique, enemy, target, ctx.data) / 100;
      best = Math.max(best, chance * damageAmount(state.grid, technique, enemy, target, ctx.data));
    }
    risk += best;
  }
  return risk;
}

/** 1 − (damage the enemies could expect to deal on the destination next turn, as a share of hp). */
// Risk depends only on the destination: memoized per decision (keyed by the original state).
const safetyCache = new WeakMap<object, Map<string, number>>();

export const safety: Consideration = {
  id: 'safety',
  evaluate(view) {
    const { actor, ctx } = view;
    const key = `${actor.position.x},${actor.position.y}`;
    let cache = safetyCache.get(ctx.state);
    if (!cache) {
      cache = new Map();
      safetyCache.set(ctx.state, cache);
    }
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const value = clamp01(1 - incomingDamage(view, actor) / actor.hp);
    cache.set(key, value);
    return value;
  },
};

/**
 * Damage-reducing status (`shielded`, water.shield) on a non-hostile victim that is not shielded
 * yet: magnitude × rounds × share of its hp the enemies could deal next turn.
 */
export const protection: Consideration = {
  id: 'protection',
  evaluate(view) {
    if (view.plan.act?.kind !== 'technique') return 0;
    let best = 0;
    for (const effect of view.plan.act.technique.effects) {
      if (effect.kind !== 'status' || effect.statusId !== SHIELDED) continue;
      for (const victim of view.victims) {
        if (isHostile(view.actor, victim) || victim.status.some((s) => s.id === SHIELDED)) continue;
        const share = incomingDamage(view, victim) / victim.hp;
        best = Math.max(best, effect.magnitude * effect.rounds * share);
      }
    }
    return clamp01(best);
  },
};

/** Closer to the preferred target is better. */
export const closeness: Consideration = {
  id: 'closeness',
  evaluate(view) {
    const target = preferredTarget(view);
    if (!target) return 0;
    const span = view.state.grid.width + view.state.grid.height;
    return clamp01(1 - manhattan(view.actor.position, target.position) / span);
  },
};

/** Standing higher than the preferred target (dh clamped to ±4). */
export const heightAdvantage: Consideration = {
  id: 'heightAdvantage',
  evaluate(view) {
    const target = hostileVictims(view)[0] ?? preferredTarget(view);
    if (!target) return 0;
    const mine = getCell(view.state.grid, view.actor.position)?.height ?? 0;
    const theirs = getCell(view.state.grid, target.position)?.height ?? 0;
    return clamp01((Math.max(-4, Math.min(4, mine - theirs)) + 4) / 8);
  },
};

/** Attacking from the back (1) or side (0.5). */
export const flankAttack: Consideration = {
  id: 'flankAttack',
  evaluate(view) {
    if (!damagingTechnique(view)) return 0;
    let best = 0;
    for (const victim of hostileVictims(view)) {
      const position = flankPosition(view.actor.position, victim.position, victim.facing);
      best = Math.max(best, position === 'back' ? 1 : position === 'side' ? 0.5 : 0);
    }
    return best;
  },
};

/** Not ending the movement on a burning cell. */
export const avoidFire: Consideration = {
  id: 'avoidFire',
  evaluate(view) {
    return getCell(view.state.grid, view.actor.position)?.effect?.kind === 'fire' ? 0 : 1;
  },
};

/** Every consideration known by the AI, by id. Profiles in rules.json pick and weight them. */
export const CONSIDERATIONS: Readonly<Record<string, Consideration>> = Object.fromEntries(
  [
    expectedDamage,
    killChance,
    safety,
    protection,
    closeness,
    heightAdvantage,
    flankAttack,
    avoidFire,
  ].map((c) => [c.id, c]),
);
