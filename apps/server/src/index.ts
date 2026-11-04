import { createApp } from './app.ts';
import { ConfigError, loadConfig } from './config.ts';
import { connect } from './db/client.ts';
import { createLogger } from './logger.ts';
import { createRateLimiter } from './modules/account/rateLimit.ts';
import { createRedeemEndpoint } from './modules/account/routes.ts';

// Bootstrap. Rooms and routes are registered per module (combat, account, telemetry).
async function main() {
  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
  const logger = createLogger(config.LOG_LEVEL);
  const database = connect(config.DATABASE_URL);
  const limiter = createRateLimiter({
    max: config.AUTH_RATE_LIMIT_MAX,
    windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  });
  const app = createApp({
    config,
    logger,
    rooms: {},
    endpoints: { redeem: createRedeemEndpoint({ db: database.db, limiter, logger }) },
  });
  await app.listen();
  const shutdown = async () => {
    logger.info('shutting down');
    await app.close();
    await database.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
