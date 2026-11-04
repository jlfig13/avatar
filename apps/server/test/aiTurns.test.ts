import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { type Harness, join, record, startBattleServer } from './battleRoomHarness.ts';

type Events = { events: { type: string; combatantId?: string }[] };
const enemyActs = (m: { type: string; message: unknown }) =>
  m.type === 'events' &&
  (m.message as Events).events.some(
    (e) => e.type === 'turnEnded' && e.combatantId?.startsWith('enemy'),
  );

describe('AI turns on the server (SRV-03)', () => {
  let harness: Harness;
  afterEach(async () => {
    await harness?.close();
  });

  it('the monster plays its turn without any client input', async () => {
    harness = await startBattleServer();
    const { room } = await join(harness.url);
    const rec = record(room);
    await rec.waitFor(enemyActs);
    // the player never sent an intent, yet the enemy turn ended and the player's turn started
    await rec.waitFor((m) => m.type === 'turnTimer');
    await room.leave();
  });

  it('waits the configured delay between AI actions', async () => {
    harness = await startBattleServer({ aiActionDelayMs: 120 });
    const { room } = await join(harness.url);
    const rec = record(room);
    const arrivals: number[] = [];
    room.onMessage('events', () => arrivals.push(Date.now()));
    await rec.waitFor(enemyActs, 5000);
    // enemy turn = ≥ 2 actions (… + endTurn) → at least one gap of ~120 ms between event batches
    const gaps = arrivals.slice(1).map((t, i) => t - (arrivals[i] ?? t));
    expect(Math.max(...gaps)).toBeGreaterThanOrEqual(100);
    await room.leave();
  });

  it('the delay comes from AI_ACTION_DELAY_MS (default 400, 0 allowed)', () => {
    const base = { DATABASE_URL: 'postgres://u:p@h:5432/d', CORS_ORIGIN: 'x' };
    expect(loadConfig(base).AI_ACTION_DELAY_MS).toBe(400);
    expect(loadConfig({ ...base, AI_ACTION_DELAY_MS: '0' }).AI_ACTION_DELAY_MS).toBe(0);
  });
});
