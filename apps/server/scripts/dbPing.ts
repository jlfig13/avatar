// pnpm db:ping — connects to DATABASE_URL and prints the PostgreSQL version (INF-04).
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (copy .env.example to .env).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const result = await client.query<{ version: string }>('select version() as version');
  console.log(result.rows[0]?.version ?? 'unknown version');
} catch (error) {
  console.error('Could not connect to PostgreSQL:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
