import { defineRoom, matchMaker } from '@colyseus/core';
import { Client, type Room as ClientRoom } from '@colyseus/sdk';
import { gameData } from '@elemental/game-data';
import { type App, createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { createLogger } from '../src/logger.ts';
import {
  type BattleRoom,
  type BattleRoomDeps,
  createBattleRoom,
} from '../src/modules/combat/BattleRoom.ts';

export interface Harness {
  app: App;
  url: string;
  close(): Promise<void>;
}

export async function startBattleServer(overrides: Partial<BattleRoomDeps> = {}): Promise<Harness> {
  const config = loadConfig({
    DATABASE_URL: 'postgres://u:p@localhost:5432/unused',
    CORS_ORIGIN: 'http://localhost:5173',
  });
  const room = createBattleRoom({
    data: gameData,
    logger: createLogger('silent'),
    aiActionDelayMs: 0,
    seed: () => 12345,
    async authenticate(token) {
      if (token !== 'good-token') throw new Error('invalid_token');
      return { accountId: 'account-1' };
    },
    ...overrides,
  });
  const app = createApp({
    config,
    logger: createLogger('silent'),
    rooms: { battle: defineRoom(room) },
  });
  const port = await app.listen(0);
  return { app, url: `ws://localhost:${port}`, close: () => app.close() };
}

/** Collects every server message of a joined room. */
export function record(room: ClientRoom) {
  const messages: { type: string; message: unknown }[] = [];
  for (const type of ['snapshot', 'events', 'rejected', 'turnTimer']) {
    room.onMessage(type, (message: unknown) => messages.push({ type, message }));
  }
  const waitFor = async (
    predicate: (m: { type: string; message: unknown }) => boolean,
    timeoutMs = 3000,
  ) => {
    const start = Date.now();
    for (;;) {
      const found = messages.find(predicate);
      if (found) return found;
      if (Date.now() - start > timeoutMs)
        throw new Error(`timeout waiting; got ${messages.map((m) => m.type).join(',')}`);
      await new Promise((r) => setTimeout(r, 10));
    }
  };
  return { messages, waitFor };
}

export async function join(
  url: string,
  options: Record<string, unknown> = { presetId: 'preset.fire', enemies: 1 },
) {
  const client = new Client(url);
  client.auth.token = 'good-token';
  const room = await client.joinOrCreate('battle', options);
  return { client, room };
}

export function serverRoom(roomId: string): BattleRoom {
  const room = matchMaker.getLocalRoomById(roomId);
  if (!room) throw new Error(`room ${roomId} not found`);
  // `as`: rooms named 'battle' are always BattleRoom instances in these tests.
  return room as unknown as BattleRoom;
}
