import type { Database } from '../../db/client.ts';
import { telemetryEvents } from '../../db/schema.ts';
import type { Logger } from '../../logger.ts';

export type TelemetryType = 'battle_started' | 'battle_ended';

export interface TelemetryEvent {
  readonly accountId: string | null;
  readonly sessionId: string;
  readonly type: TelemetryType;
  readonly payload: Record<string, unknown>;
}

export interface Telemetry {
  /** Never throws and never blocks the battle: failures are only logged. */
  record(event: TelemetryEvent): Promise<void>;
}

export function createTelemetry(db: Database, logger: Logger): Telemetry {
  return {
    async record(event) {
      try {
        await db.insert(telemetryEvents).values({
          accountId: event.accountId,
          sessionId: event.sessionId,
          type: event.type,
          payload: event.payload,
        });
      } catch (error) {
        logger.error(
          { err: error, type: event.type, sessionId: event.sessionId },
          'telemetry write failed',
        );
      }
    },
  };
}

/** docs/04 §6 — battle_started / battle_ended from the BattleRoom hooks. */
export function battleTelemetryHooks(telemetry: Telemetry) {
  return {
    onBattleStarted(info: {
      sessionId: string;
      accountId: string | null;
      presetId: string;
      enemies: number;
      seed: number;
    }) {
      void telemetry.record({
        accountId: info.accountId,
        sessionId: info.sessionId,
        type: 'battle_started',
        payload: { presetId: info.presetId, enemies: info.enemies, seed: info.seed },
      });
    },
    onBattleEnded(summary: {
      sessionId: string;
      accountId: string | null;
      result: string;
      durationSeconds: number;
      rounds: number;
      playerTurns: number;
      timeouts: number;
    }) {
      void telemetry.record({
        accountId: summary.accountId,
        sessionId: summary.sessionId,
        type: 'battle_ended',
        payload: {
          result: summary.result,
          durationSeconds: summary.durationSeconds,
          rounds: summary.rounds,
          playerTurns: summary.playerTurns,
          timeouts: summary.timeouts,
        },
      });
    },
  };
}
