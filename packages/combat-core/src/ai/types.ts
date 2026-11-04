import type { GameData, Technique } from '@elemental/shared';
import type { RngState } from '../rng.ts';
import type { Action, BattleState, Combatant, Position } from '../types.ts';

// docs/05 §8 — utility AI contract.

export interface AiContext {
  readonly state: BattleState;
  readonly actorId: string;
  readonly data: GameData;
  /** Tie-break RNG; defaults to the battle's current rngState (the battle RNG is not consumed). */
  readonly rng?: RngState;
  /** Weights profile from rules.ai.profiles (monsters: their ai.profile); defaults to 'balanced'. */
  readonly profile?: string;
}

export type PlanAct =
  | { readonly kind: 'technique'; readonly technique: Technique; readonly target: Position }
  | { readonly kind: 'defend' }
  | null;

/** One possible turn: optional move, then optional action, then end of turn. */
export interface Plan {
  readonly destination: Position | null;
  readonly act: PlanAct;
}

/** What a consideration sees: the battle as if the actor already stood on the destination. */
export interface PlanView {
  readonly ctx: AiContext;
  readonly plan: Plan;
  /** state with the actor moved to the destination (no side effects applied) */
  readonly state: BattleState;
  readonly actor: Combatant;
  /** combatants inside the technique's affected cells (empty for move/defend) */
  readonly victims: readonly Combatant[];
}

/** A normalized score in [0, 1] for one aspect of a plan. */
export interface Consideration {
  readonly id: string;
  evaluate(view: PlanView): number;
}

export interface Candidate {
  readonly actions: Action[];
  readonly score: number;
  readonly debug: Record<string, number>;
}
