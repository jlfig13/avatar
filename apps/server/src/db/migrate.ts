import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client.ts';

// Resolves to src/db/migrations both from src/db and from dist/db (SQL files are not compiled).
export const MIGRATIONS_FOLDER = join(import.meta.dirname, '..', '..', 'src', 'db', 'migrations');

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
