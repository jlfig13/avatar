import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { telemetryEvents } from '../src/db/schema.ts';
import { seedInvites } from '../src/db/seed.ts';
import { createLogger } from '../src/logger.ts';
import { redeemInvite } from '../src/modules/account/service.ts';
import { battleTelemetryHooks, createTelemetry } from '../src/modules/telemetry/telemetry.ts';
import { join, record, startBattleServer } from './battleRoomHarness.ts';
import { createTestDb, type TestDb } from './testDb.ts';

describe('battle telemetry (SRV-06)', () => {
  let testDb: TestDb;
  beforeAll(async () => {
    testDb = await createTestDb();
  });
  afterAll(async () => {
    await testDb.drop();
  });

  it('each battle writes battle_started and battle_ended', async () => {
    const telemetry = createTelemetry(testDb.db, createLogger('silent'));
    await seedInvites(testDb.db, 'TELEMETRY');
    const account = await redeemInvite(testDb.db, 'TELEMETRY');
    if (!account) throw new Error('no account');
    const harness = await startBattleServer({
      ...battleTelemetryHooks(telemetry),
      authenticate: async () => ({ accountId: account.accountId }),
    });
    try {
      const { room } = await join(harness.url);
      await record(room).waitFor((m) => m.type === 'turnTimer');
      await room.leave();
      const deadline = Date.now() + 3000;
      let rows = await testDb.db.select().from(telemetryEvents);
      while (rows.length < 2 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 25));
        rows = await testDb.db.select().from(telemetryEvents);
      }
      expect(rows.map((r) => r.type).sort()).toEqual(['battle_ended', 'battle_started']);
      expect(new Set(rows.map((r) => r.sessionId)).size).toBe(1);
      expect(rows.every((r) => r.accountId === account.accountId)).toBe(true);
      const ended = rows.find((r) => r.type === 'battle_ended');
      expect(ended?.payload).toMatchObject({
        result: 'abandoned',
        rounds: expect.any(Number),
        playerTurns: 1,
        timeouts: 0,
      });
      expect(ended?.payload).toHaveProperty('durationSeconds');
    } finally {
      await harness.close();
    }
  });

  it('a failed write does not throw (the battle goes on)', async () => {
    const broken = await createTestDb();
    await broken.drop(); // pool closed: every insert fails
    const errors: string[] = [];
    const telemetry = createTelemetry(
      broken.db,
      createLogger('error', { write: (l: string) => errors.push(l) }),
    );
    await expect(
      telemetry.record({
        accountId: null,
        sessionId: crypto.randomUUID(),
        type: 'battle_started',
        payload: {},
      }),
    ).resolves.toBeUndefined();
    expect(errors.join('')).toContain('telemetry write failed');
    const none = await testDb.db
      .select()
      .from(telemetryEvents)
      .where(eq(telemetryEvents.type, 'nope'));
    expect(none).toEqual([]);
  });
});
