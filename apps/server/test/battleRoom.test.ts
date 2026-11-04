import { gameData } from '@elemental/game-data';
import { afterEach, describe, expect, it } from 'vitest';
import { replay } from '../src/modules/combat/session.ts';
import { type Harness, join, record, serverRoom, startBattleServer } from './battleRoomHarness.ts';

type Events = { fromSeq: number; events: { type: string; seq: number; combatantId?: string }[] };
const isPlayerTurn = (m: { type: string; message: unknown }) => m.type === 'turnTimer';

describe('BattleRoom (SRV-02)', () => {
  let harness: Harness;
  afterEach(async () => {
    await harness?.close();
  });

  it('rejects joining without a valid token', async () => {
    harness = await startBattleServer();
    const { Client } = await import('@colyseus/sdk');
    const anonymous = new Client(harness.url);
    await expect(anonymous.joinOrCreate('battle', { presetId: 'preset.fire' })).rejects.toThrow();
  });

  it('sends a snapshot without RNG data, plays the AI turn and starts the player timer', async () => {
    harness = await startBattleServer();
    const { room } = await join(harness.url);
    const rec = record(room);
    const snapshot = await rec.waitFor((m) => m.type === 'snapshot');
    expect(snapshot.message).toMatchObject({ lastEventSeq: 0 });
    expect(snapshot.message).not.toHaveProperty('state.seed');
    expect(snapshot.message).not.toHaveProperty('state.rngState');
    const timer = await rec.waitFor(isPlayerTurn);
    expect(timer.message).toMatchObject({ combatantId: 'player' });
    const seqs = rec.messages
      .filter((m) => m.type === 'events')
      .flatMap((m) => (m.message as Events).events.map((e) => e.seq));
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));
    await room.leave();
  });

  it('rejects invalid intents with the core reason (or invalid_intent for malformed ones)', async () => {
    harness = await startBattleServer();
    const { room } = await join(harness.url);
    const rec = record(room);
    await rec.waitFor(isPlayerTurn);
    room.send('intent', { kind: 'move', to: { x: 9, y: 0 }, clientSeq: 1 });
    expect((await rec.waitFor((m) => m.type === 'rejected')).message).toEqual({
      clientSeq: 1,
      reason: 'unreachable',
    });
    room.send('intent', { kind: 'teleport', clientSeq: 2 });
    expect(
      (
        await rec.waitFor(
          (m) => m.type === 'rejected' && (m.message as { clientSeq: number }).clientSeq === 2,
        )
      ).message,
    ).toEqual({
      clientSeq: 2,
      reason: 'invalid_intent',
    });
    room.send('intent', {
      kind: 'technique',
      techniqueId: 'fire.blast',
      target: { x: 9, y: 9 },
      clientSeq: 3,
    });
    const third = await rec.waitFor(
      (m) => m.type === 'rejected' && (m.message as { clientSeq: number }).clientSeq === 3,
    );
    expect(third.message).toMatchObject({
      clientSeq: 3,
      reason: expect.stringMatching(/out_of_range|invalid_target|no_line_of_sight/),
    });
    await room.leave();
  });

  it('when the turn timer expires: defend + pass the turn', async () => {
    harness = await startBattleServer({ turnTimeoutMs: () => 150 });
    const { room } = await join(harness.url);
    const rec = record(room);
    await rec.waitFor(isPlayerTurn);
    const timedOut = await rec.waitFor(
      (m) => m.type === 'events' && (m.message as Events).events.some((e) => e.type === 'timedOut'),
    );
    const types = (timedOut.message as Events).events.map((e) => e.type);
    expect(types.slice(0, 3)).toEqual(['timedOut', 'defended', 'turnEnded']);
    await room.leave();
  });

  it('a reconnecting player receives a snapshot with the correct lastEventSeq', async () => {
    harness = await startBattleServer({ reconnectSeconds: 5 });
    const { client, room } = await join(harness.url);
    const rec = record(room);
    await rec.waitFor(isPlayerTurn);
    room.send('intent', { kind: 'endTurn', clientSeq: 1 });
    await rec.waitFor(
      (m) => m.type === 'turnTimer' && rec.messages.filter(isPlayerTurn).length >= 2,
    );
    const roomId = room.roomId;
    const token = room.reconnectionToken;
    room.connection.close(4999, 'network drop');
    await new Promise((r) => setTimeout(r, 100));
    const back = await client.reconnect(token);
    const rec2 = record(back);
    const snapshot = await rec2.waitFor((m) => m.type === 'snapshot');
    expect((snapshot.message as { lastEventSeq: number }).lastEventSeq).toBe(
      serverRoom(roomId).session.state.eventSeq,
    );
    await back.leave();
  });

  it('replay: seed + recorded actions reproduce the same final state', async () => {
    harness = await startBattleServer({ turnTimeoutMs: () => 30 });
    const { room } = await join(harness.url, { presetId: 'preset.water', enemies: 2 });
    const rec = record(room);
    // let a few turns time out (AI + player) and play some actions
    await rec.waitFor(isPlayerTurn);
    room.send('intent', { kind: 'defend', clientSeq: 1 });
    room.send('intent', { kind: 'endTurn', clientSeq: 2 });
    await new Promise((r) => setTimeout(r, 400));
    const session = serverRoom(room.roomId).session;
    expect(session.actions.length).toBeGreaterThan(5);
    expect(replay(session.setup, session.actions, gameData)).toEqual(session.state);
    await room.leave();
  });
});
