// pnpm db:migrate — applies pending migrations to DATABASE_URL.
import { connect } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const handle = connect(url);
try {
  await runMigrations(handle.db);
  console.log('migrations applied');
} finally {
  await handle.close();
}
