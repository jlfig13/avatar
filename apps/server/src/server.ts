import { defineRoom } from '@colyseus/core';
import { gameData } from '@elemental/game-data';
import { type App, createApp } from './app.ts';
import type { Config } from './config.ts';
import type { Database } from './db/client.ts';
import type { Logger } from './logger.ts';
import { createRateLimiter } from './modules/account/rateLimit.ts';
import { requireAccount } from './modules/account/roomAuth.ts';
import { createRedeemEndpoint } from './modules/account/routes.ts';
import { type BattleRoomDeps, createBattleRoom } from './modules/combat/BattleRoom.ts';
import { battleTelemetryHooks, createTelemetry } from './modules/telemetry/telemetry.ts';

/** Wires every module (account, combat, telemetry) into one Colyseus app. */
export function buildServer(
  config: Config,
  db: Database,
  logger: Logger,
  overrides: Partial<BattleRoomDeps> = {},
): App {
  const limiter = createRateLimiter({
    max: config.AUTH_RATE_LIMIT_MAX,
    windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  });
  const battle = createBattleRoom({
    data: gameData,
    logger,
    aiActionDelayMs: config.AI_ACTION_DELAY_MS,
    authenticate: (token) => requireAccount(db, token),
    ...battleTelemetryHooks(createTelemetry(db, logger)),
    ...overrides,
  });
  return createApp({
    config,
    logger,
    rooms: { battle: defineRoom(battle) },
    endpoints: { redeem: createRedeemEndpoint({ db, limiter, logger }) },
  });
}
