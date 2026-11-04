import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { connect, type DbHandle } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';

// Integration tests use a real PostgreSQL (docker compose locally, service in CI): one fresh DB per suite.
export const ADMIN_URL =
  process.env.DATABASE_URL ?? 'postgres://elemental:elemental@localhost:5432/elemental';

export interface TestDb extends DbHandle {
  readonly url: string;
  drop(): Promise<void>;
}

export async function createTestDb(options: { migrate?: boolean } = {}): Promise<TestDb> {
  const name = `elemental_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  const handle = connect(url.toString());
  if (options.migrate !== false) await runMigrations(handle.db);
  return {
    ...handle,
    url: url.toString(),
    async drop() {
      await handle.close();
      const cleanup = new pg.Client({ connectionString: ADMIN_URL });
      await cleanup.connect();
      await cleanup.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await cleanup.end();
    },
  };
}
