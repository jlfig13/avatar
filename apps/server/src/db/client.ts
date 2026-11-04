import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

export type Database = NodePgDatabase<typeof schema>;

export interface DbHandle {
  readonly db: Database;
  close(): Promise<void>;
}

export function connect(databaseUrl: string): DbHandle {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
