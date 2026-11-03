import type { BattleState, CellEffectKind, Facing, Position, RejectReason } from './types.ts';

// docs/05 §1.3 — every event has `seq` (increasing within the battle) and `type`.
export type BattleEventBody =
  | { readonly type: 'roundStarted'; readonly round: number }
  | { readonly type: 'turnStarted'; readonly combatantId: string; readonly energyRegen: number }
  | {
      readonly type: 'moved';
      readonly combatantId: string;
      readonly path: readonly Position[];
      readonly facing: Facing;
    }
  | {
      readonly type: 'techniqueUsed';
      readonly combatantId: string;
      readonly techniqueId: string;
      readonly target: Position;
      readonly affectedCells: readonly Position[];
    }
  | { readonly type: 'missed'; readonly attackerId: string; readonly targetId: string }
  | {
      readonly type: 'damaged';
      readonly targetId: string;
      readonly amount: number;
      readonly hpAfter: number;
      readonly source: 'technique' | 'terrain' | 'reaction';
    }
  | {
      readonly type: 'healed';
      readonly targetId: string;
      readonly amount: number;
      readonly hpAfter: number;
    }
  | {
      readonly type: 'statusApplied';
      readonly targetId: string;
      readonly statusId: string;
      readonly rounds: number;
    }
  | { readonly type: 'statusExpired'; readonly targetId: string; readonly statusId: string }
  | {
      readonly type: 'cellEffectApplied';
      readonly position: Position;
      readonly kind: CellEffectKind;
      readonly rounds: number;
    }
  | {
      readonly type: 'cellEffectExpired';
      readonly position: Position;
      readonly kind: CellEffectKind;
    }
  | {
      readonly type: 'pushed';
      readonly combatantId: string;
      readonly from: Position;
      readonly to: Position;
    }
  | {
      readonly type: 'reaction';
      readonly combatantId: string;
      readonly reactionId: string;
      readonly triggeredBy: string;
    }
  | { readonly type: 'defended'; readonly combatantId: string }
  | { readonly type: 'timedOut'; readonly combatantId: string; readonly consecutive: number }
  | {
      readonly type: 'fleeAttempt';
      readonly combatantId: string;
      readonly chance: number;
      readonly success: boolean;
    }
  | { readonly type: 'defeated'; readonly combatantId: string }
  | { readonly type: 'turnEnded'; readonly combatantId: string; readonly ctAfter: number }
  | {
      readonly type: 'battleEnded';
      readonly result: 'victory' | 'defeat' | 'fled';
      readonly rounds: number;
    };

export type BattleEvent = BattleEventBody & { readonly seq: number };

export type ApplyResult =
  | { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] }
  | { readonly ok: false; readonly reason: RejectReason };

/** Internal result of a handler: events are stamped with `seq` by applyAction. */
export type StepResult =
  | { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEventBody[] }
  | { readonly ok: false; readonly reason: RejectReason };

export const reject = (reason: RejectReason): StepResult => ({ ok: false, reason });

export const accept = (
  state: BattleState,
  events: readonly BattleEventBody[] = [],
): StepResult => ({ ok: true, state, events });
