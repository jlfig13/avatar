import { applyAction } from '../apply.ts';
import { getReachableCells } from '../pathfinding/pathfinding.ts';
import { nextInt } from '../rng.ts';
import { requireCombatant, samePosition, updateCombatant } from '../state.ts';
import { areaCells, getTechniqueTargets } from '../targeting/targeting.ts';
import { effectiveCost } from '../techniques/formulas.ts';
import type { Action, BattleState, Position } from '../types.ts';
import { CONSIDERATIONS } from './considerations.ts';
import type { AiContext, Candidate, Plan, PlanView } from './types.ts';

const EPSILON = 1e-9;

function profileWeights(ctx: AiContext): Record<string, number> {
  const name = ctx.profile ?? 'balanced';
  const weights = ctx.data.rules.ai.profiles[name];
  if (!weights) throw new Error(`AI profile "${name}" missing from rules.json`);
  return weights;
}

/** docs/05 §8 — stay or every reachable cell × usable technique × valid target, plus move-only and defend. */
export function generatePlans(ctx: AiContext): Plan[] {
  const { state, actorId, data } = ctx;
  const turn = state.turn;
  const actor = requireCombatant(state, actorId);
  const destinations: (Position | null)[] = [null];
  if (!turn?.hasMoved) destinations.push(...getReachableCells(state, actorId, data));
  const plans: Plan[] = [];
  for (const destination of destinations) {
    plans.push({ destination, act: null });
    if (turn?.hasActed) continue;
    plans.push({ destination, act: { kind: 'defend' } });
    for (const id of actor.techniqueIds) {
      const technique = data.techniques[id];
      if (!technique || effectiveCost(technique, actor, data) > actor.energy) continue;
      for (const target of getTechniqueTargets(
        state,
        actorId,
        id,
        data,
        destination ?? undefined,
      )) {
        plans.push({ destination, act: { kind: 'technique', technique, target } });
      }
    }
  }
  return plans;
}

export function planActions(plan: Plan, actorId: string): Action[] {
  const actions: Action[] = [];
  if (plan.destination) actions.push({ type: 'move', actorId, to: plan.destination });
  if (plan.act?.kind === 'technique') {
    actions.push({
      type: 'technique',
      actorId,
      techniqueId: plan.act.technique.id,
      target: plan.act.target,
    });
  } else if (plan.act?.kind === 'defend') {
    actions.push({ type: 'defend', actorId });
  }
  actions.push({ type: 'endTurn', actorId });
  return actions;
}

function view(ctx: AiContext, plan: Plan): PlanView {
  const moved: BattleState = plan.destination
    ? updateCombatant(ctx.state, ctx.actorId, (c) => ({
        ...c,
        position: plan.destination as Position,
      }))
    : ctx.state;
  const actor = requireCombatant(moved, ctx.actorId);
  let victims: PlanView['victims'] = [];
  if (plan.act?.kind === 'technique') {
    const cells = areaCells(
      moved.grid,
      plan.act.technique,
      actor.position,
      actor.facing,
      plan.act.target,
    );
    victims = moved.combatants.filter(
      (c) => c.alive && !c.fled && cells.some((p) => samePosition(p, c.position)),
    );
  }
  return { ctx, plan, state: moved, actor, victims };
}

export function scorePlans(ctx: AiContext): Candidate[] {
  const weights = Object.entries(profileWeights(ctx));
  return generatePlans(ctx).map((plan) => {
    const planView = view(ctx, plan);
    const debug: Record<string, number> = {};
    let score = 0;
    for (const [id, weight] of weights) {
      const consideration = CONSIDERATIONS[id];
      if (!consideration) throw new Error(`Unknown AI consideration "${id}"`);
      const value = consideration.evaluate(planView);
      debug[id] = value;
      score += weight * value;
    }
    return { actions: planActions(plan, ctx.actorId), score, debug };
  });
}

/** Applies the actions in order; returns the prefix that is valid (stops when the battle ends). */
function validPrefix(
  state: BattleState,
  actions: readonly Action[],
  ctx: AiContext,
): Action[] | null {
  let current = state;
  const applied: Action[] = [];
  for (const action of actions) {
    if (current.phase !== 'running') break;
    const result = applyAction(current, action, ctx.data);
    if (!result.ok) return null;
    current = result.state;
    applied.push(action);
  }
  return applied;
}

/**
 * docs/05 §8 — the actions of the actor's turn (e.g. move + technique + endTurn). The best-scored
 * candidate wins; ties are broken with the RNG; candidates that fail validation are skipped.
 */
export function chooseActionsWithDebug(ctx: AiContext): {
  actions: Action[];
  candidates: Candidate[];
} {
  const candidates = scorePlans(ctx).sort((a, b) => b.score - a.score);
  let rng = ctx.rng ?? ctx.state.rngState;
  let start = 0;
  while (start < candidates.length) {
    const top = (candidates[start] as Candidate).score;
    let end = start;
    while (end < candidates.length && top - (candidates[end] as Candidate).score < EPSILON) end++;
    const tied = candidates.slice(start, end);
    while (tied.length > 0) {
      const [index, nextRng] = nextInt(rng, 0, tied.length - 1);
      rng = nextRng;
      const [candidate] = tied.splice(index, 1);
      const actions = candidate && validPrefix(ctx.state, candidate.actions, ctx);
      if (actions) return { actions, candidates };
    }
    start = end;
  }
  return { actions: [{ type: 'endTurn', actorId: ctx.actorId }], candidates };
}

export function chooseActions(ctx: AiContext): Action[] {
  return chooseActionsWithDebug(ctx).actions;
}
