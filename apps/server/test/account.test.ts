import { defineRoom, Room } from '@colyseus/core';
import { Client } from '@colyseus/sdk';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type App, createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { accounts } from '../src/db/schema.ts';
import { seedInvites } from '../src/db/seed.ts';
import { createLogger } from '../src/logger.ts';
import { createRateLimiter } from '../src/modules/account/rateLimit.ts';
import { type AuthData, requireAccount } from '../src/modules/account/roomAuth.ts';
import { createRedeemEndpoint } from '../src/modules/account/routes.ts';
import { hashToken } from '../src/modules/account/tokens.ts';
import { createTestDb, type TestDb } from './testDb.ts';

describe('anonymous accounts (SRV-04)', () => {
  let testDb: TestDb;
  let app: App;
  let base: string;
  const logs: string[] = [];

  beforeAll(async () => {
    testDb = await createTestDb();
    await seedInvites(testDb.db, 'ONE-USE, TWO-USES:2');
    const db = testDb.db;
    class SecureRoom extends Room {
      static override async onAuth(token: string): Promise<AuthData> {
        return requireAccount(db, token);
      }
      override onJoin(
        client: { send: (type: string, msg: unknown) => void },
        _options: unknown,
        auth: AuthData,
      ) {
        client.send('hello', auth.accountId);
      }
    }
    const config = loadConfig({ DATABASE_URL: testDb.url, CORS_ORIGIN: 'http://localhost:5173' });
    const logger = createLogger('info', { write: (line: string) => logs.push(line) });
    app = createApp({
      config,
      logger,
      rooms: { secure: defineRoom(SecureRoom) },
      endpoints: {
        redeem: createRedeemEndpoint({
          db,
          limiter: createRateLimiter({ max: 7, windowMs: 60_000 }),
          logger,
        }),
      },
    });
    base = `localhost:${await app.listen(0)}`;
  });
  afterAll(async () => {
    await app.close();
    await testDb.drop();
  });

  const redeem = (inviteCode: unknown) =>
    fetch(`http://${base}/auth/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
    });

  it('creates an account and returns the token once; only its hash is stored', async () => {
    const res = await redeem('TWO-USES');
    expect(res.status).toBe(201);
    const body = (await res.json()) as { accountId: string; token: string };
    expect(body.token.length).toBeGreaterThanOrEqual(40);
    const [row] = await testDb.db.select().from(accounts).where(eq(accounts.id, body.accountId));
    expect(row?.tokenHash).toBe(hashToken(body.token));
    expect(JSON.stringify(row)).not.toContain(body.token);
  });

  it('403 without a valid invite and when the invite is exhausted', async () => {
    expect((await redeem('NOPE')).status).toBe(403);
    expect((await redeem('ONE-USE')).status).toBe(201);
    expect((await redeem('ONE-USE')).status).toBe(403);
  });

  it('rejects room connections without a token or with an invalid one; accepts a valid one', async () => {
    const anonymous = new Client(`ws://${base}`);
    await expect(anonymous.joinOrCreate('secure')).rejects.toThrow();
    const forged = new Client(`ws://${base}`);
    forged.auth.token = 'x'.repeat(43);
    await expect(forged.joinOrCreate('secure')).rejects.toThrow();

    const { token, accountId } = (await (await redeem('TWO-USES')).json()) as {
      token: string;
      accountId: string;
    };
    const client = new Client(`ws://${base}`);
    client.auth.token = token;
    const room = await client.joinOrCreate('secure');
    const hello = await new Promise((resolve) => room.onMessage('hello', resolve));
    expect(hello).toBe(accountId);
    await room.leave();
  });

  it('never writes tokens to the log', async () => {
    const res = await redeem('NOPE');
    expect(res.status).toBe(403);
    const tokens = await testDb.db.select({ hash: accounts.tokenHash }).from(accounts);
    const output = logs.join('');
    expect(output).toContain('account created');
    for (const { hash } of tokens) expect(output).not.toContain(hash);
    expect(output).not.toMatch(/"token":"[A-Za-z0-9_-]{20,}"/);
  });

  it('limits attempts per IP (429)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await redeem('NOPE')).status);
    expect(statuses).toContain(429);
  });
});

describe('rate limiter', () => {
  it('allows max attempts per window and resets after it', () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect([limiter.hit('a'), limiter.hit('a'), limiter.hit('a'), limiter.hit('b')]).toEqual([
      true,
      true,
      false,
      true,
    ]);
    t = 1000;
    expect(limiter.hit('a')).toBe(true);
  });
});
