import { Client } from '@colyseus/sdk';
import { type Action, chooseActions } from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';
import type { Intent } from '@elemental/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { telemetryEvents } from '../src/db/schema.ts';
import { seedInvites } from '../src/db/seed.ts';
import { createLogger } from '../src/logger.ts';
import { replay } from '../src/modules/combat/session.ts';
import { buildServer } from '../src/server.ts';
import { record, serverRoom } from './battleRoomHarness.ts';
import { createTestDb, type TestDb } from './testDb.ts';

type Event = { type: string; seq: number; result?: string };

function toIntent(action: Action, clientSeq: number): Intent | null {
  switch (action.type) {
    case 'move':
      return { kind: 'move', to: action.to, clientSeq };
    case 'technique':
      return {
        kind: 'technique',
        techniqueId: action.techniqueId,
        target: action.target,
        clientSeq,
      };
    case 'defend':
    case 'flee':
    case 'endTurn':
      return { kind: action.type, clientSeq };
    default:
      return null;
  }
}

describe('full battle over the network (SRV-07)', () => {
  let testDb: TestDb;
  let app: App;
  let port: number;
  beforeAll(async () => {
    testDb = await createTestDb();
    await seedInvites(testDb.db, 'E2E-001');
    const config = loadConfig({
      DATABASE_URL: testDb.url,
      CORS_ORIGIN: 'http://localhost:5173',
      AI_ACTION_DELAY_MS: '0',
    });
    app = buildServer(config, testDb.db, createLogger('silent'), { seed: () => 2024 });
    port = await app.listen(0);
  });
  afterAll(async () => {
    await app.close();
    await testDb.drop();
  });

  it('redeems an invite, joins with the token and plays a battle to the end', async () => {
    const redeemed = await fetch(`http://localhost:${port}/auth/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'E2E-001' }),
    });
    expect(redeemed.status).toBe(201);
    const { token } = (await redeemed.json()) as { token: string };

    const client = new Client(`ws://localhost:${port}`);
    client.auth.token = token;
    const room = await client.joinOrCreate('battle', { presetId: 'preset.fire', enemies: 1 });
    const rec = record(room);
    const events: Event[] = [];
    room.onMessage('events', (m: { events: Event[] }) => events.push(...m.events));
    const rejected: unknown[] = [];
    room.onMessage('rejected', (m: unknown) => rejected.push(m));

    // Scripted player: on each of its turns, send the moves the balanced AI would pick.
    let clientSeq = 0;
    let handledTimers = 0;
    const deadline = Date.now() + 20_000;
    while (!events.some((e) => e.type === 'battleEnded') && Date.now() < deadline) {
      const timers = rec.messages.filter((m) => m.type === 'turnTimer').length;
      if (timers > handledTimers) {
        handledTimers = timers;
        const state = serverRoom(room.roomId).session.state;
        if (state.turn?.combatantId === 'player') {
          for (const action of chooseActions({ state, actorId: 'player', data: gameData })) {
            const intent = toIntent(action, ++clientSeq);
            if (intent) room.send('intent', intent);
          }
        }
      }
      await new Promise((r) => setTimeout(r, 10));
    }

    const ended = events.find((e) => e.type === 'battleEnded');
    expect(ended, `events: ${events.map((e) => e.type).join(',')}`).toBeDefined();
    expect(['victory', 'defeat']).toContain(ended?.result);
    expect(rejected).toEqual([]);
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));

    const session = serverRoom(room.roomId).session;
    expect(replay(session.setup, session.actions, gameData)).toEqual(session.state);
    await room.leave();

    await new Promise((r) => setTimeout(r, 200));
    const rows = await testDb.db.select().from(telemetryEvents);
    expect(rows.map((r) => r.type).sort()).toEqual(['battle_ended', 'battle_started']);
    expect(rows.find((r) => r.type === 'battle_ended')?.payload).toMatchObject({
      result: ended?.result,
    });
  });
});
