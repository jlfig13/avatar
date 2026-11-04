import { z } from 'zod';

// docs/04 §5 — client ↔ server protocol. Every client message is validated with these schemas.

const Coord = z.number().int().min(0).max(63);
const Cell = z.strictObject({ x: Coord, y: Coord });
const clientSeq = z.number().int().min(0);

export const IntentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('move'), to: Cell, clientSeq }),
  z.strictObject({
    kind: z.literal('technique'),
    techniqueId: z.string().min(1).max(64),
    target: Cell,
    clientSeq,
  }),
  z.strictObject({ kind: z.literal('defend'), clientSeq }),
  z.strictObject({ kind: z.literal('flee'), clientSeq }),
  z.strictObject({ kind: z.literal('endTurn'), clientSeq }),
]);
export type Intent = z.infer<typeof IntentSchema>;

/** Options sent when joining a battle room (slice 1: preset + 1–2 enemies). */
export const BattleJoinOptionsSchema = z.object({
  presetId: z.string().min(1).max(64),
  enemies: z.number().int().min(1).max(2).default(1),
});
export type BattleJoinOptions = z.infer<typeof BattleJoinOptionsSchema>;

/** Protocol-level rejections on top of the core RejectReason values. */
export type ProtocolRejectReason = 'invalid_intent' | 'not_your_turn' | 'paused';

// Server → client messages, generic over the core types (shared does not depend on the core).
export interface SnapshotMessage<State> {
  readonly state: State;
  readonly lastEventSeq: number;
}
export interface EventsMessage<Event> {
  readonly fromSeq: number;
  readonly events: readonly Event[];
}
export interface RejectedMessage<Reason extends string = string> {
  readonly clientSeq: number;
  readonly reason: Reason | ProtocolRejectReason;
}
export interface TurnTimerMessage {
  readonly combatantId: string;
  /** epoch ms */
  readonly deadline: number;
}

export const MESSAGE = {
  intent: 'intent',
  requestSnapshot: 'requestSnapshot',
  snapshot: 'snapshot',
  events: 'events',
  rejected: 'rejected',
  turnTimer: 'turnTimer',
} as const;
