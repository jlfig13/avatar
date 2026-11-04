import { createApp } from './app.ts';
import { ConfigError, loadConfig } from './config.ts';
import { createLogger } from './logger.ts';

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
  const app = createApp({ config, logger, rooms: {} });
  await app.listen();
  const shutdown = async () => {
    logger.info('shutting down');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
