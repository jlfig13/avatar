import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/db/migrate.ts';
import { invites } from '../src/db/schema.ts';
import { parseInviteCodes, seedInvites } from '../src/db/seed.ts';
import { createTestDb, type TestDb } from './testDb.ts';

describe('database (SRV-05)', () => {
  let testDb: TestDb;
  beforeAll(async () => {
    testDb = await createTestDb({ migrate: false });
  });
  afterAll(async () => {
    await testDb.drop();
  });

  it('migrations create the 4 tables on an empty database', async () => {
    await runMigrations(testDb.db);
    const result = await testDb.db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    expect(result.rows.map((r) => r.table_name)).toEqual([
      'accounts',
      'characters',
      'invites',
      'telemetry_events',
    ]);
  });

  it('db:seed is idempotent', async () => {
    expect(await seedInvites(testDb.db, 'ALPHA-001, ALPHA-002:5')).toBe(2);
    expect(await seedInvites(testDb.db, 'ALPHA-001, ALPHA-002:5')).toBe(0);
    const rows = await testDb.db.select().from(invites).orderBy(invites.code);
    expect(rows.map((r) => [r.code, r.maxUses, r.uses])).toEqual([
      ['ALPHA-001', 1, 0],
      ['ALPHA-002', 5, 0],
    ]);
  });

  it('parses INVITE_CODES and rejects malformed entries', () => {
    expect(parseInviteCodes('')).toEqual([]);
    expect(parseInviteCodes('A, B:3')).toEqual([
      { code: 'A', maxUses: 1 },
      { code: 'B', maxUses: 3 },
    ]);
    expect(() => parseInviteCodes('C:0')).toThrow();
  });
});
