import { ConfigError, loadConfig } from './config.ts';
import { connect } from './db/client.ts';
import { createLogger } from './logger.ts';
import { buildServer } from './server.ts';

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
  const app = buildServer(config, database.db, logger);
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
