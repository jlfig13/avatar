import { Client, type Room } from '@colyseus/sdk';
import type { BattleEvent, BattleState } from '@elemental/combat-core';
import type { ClientStore } from '../store/store.ts';
import { hasSeqGap, httpBaseFrom, type IntentBody, stateFromDto } from './logic.ts';
import { loadReconnection, loadToken, saveReconnection, saveToken } from './storage.ts';

export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567';

type Snapshot = { state: Omit<BattleState, 'seed' | 'rngState'>; lastEventSeq: number };
type EventsMessage = { fromSeq: number; events: BattleEvent[] };

/** CLI-06 — invite redemption, room connection, intents and resynchronisation. */
export class BattleConnection {
  private readonly store: ClientStore;
  private readonly client = new Client(SERVER_URL);
  private room: Room | null = null;
  private clientSeq = 0;
  private lastEventSeq = 0;
  private snapshotPending = false;

  constructor(store: ClientStore) {
    this.store = store;
  }

  get hasToken() {
    return loadToken() !== null;
  }

  /** POST /auth/redeem → token stored locally (shown only once by the server). */
  async redeem(
    inviteCode: string,
  ): Promise<'ok' | 'invalid_invite' | 'too_many_attempts' | 'network_error'> {
    try {
      const response = await fetch(`${httpBaseFrom(SERVER_URL)}/auth/redeem`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });
      if (response.status === 403) return 'invalid_invite';
      if (response.status === 429) return 'too_many_attempts';
      if (!response.ok) return 'network_error';
      const { token } = (await response.json()) as { token: string };
      saveToken(token);
      return 'ok';
    } catch {
      return 'network_error';
    }
  }

  async join(presetId: string, enemies: number) {
    this.client.auth.token = loadToken() ?? '';
    this.store.getState().setConnection('connecting');
    try {
      this.attach(await this.client.joinOrCreate('battle', { presetId, enemies }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // an unknown token (e.g. the database was reset) sends the player back to the invite screen
      if (/token|auth|401/i.test(message)) saveToken(null);
      this.store.getState().setConnection('error');
    }
  }

  /** After a reload: resume the same battle with the saved reconnection ticket. */
  async resume(): Promise<boolean> {
    const ticket = loadReconnection();
    if (!ticket) return false;
    this.store.getState().setConnection('connecting');
    try {
      this.attach(await this.client.reconnect(ticket));
      return true;
    } catch {
      saveReconnection(null);
      this.store.getState().setConnection('idle');
      return false;
    }
  }

  private attach(room: Room) {
    this.room = room;
    saveReconnection(room.reconnectionToken);
    const state = this.store.getState();
    state.setConnection('connected');
    room.onMessage('snapshot', (snapshot: Snapshot) => {
      this.snapshotPending = false;
      this.lastEventSeq = snapshot.lastEventSeq;
      this.store.getState().setBattle(stateFromDto(snapshot.state));
    });
    room.onMessage('events', (message: EventsMessage) => {
      if (hasSeqGap(this.lastEventSeq, message.fromSeq)) {
        this.requestSnapshot();
        return;
      }
      this.lastEventSeq = message.events.at(-1)?.seq ?? this.lastEventSeq;
      this.store.getState().pushEvents(message.events);
      // The client never applies results itself: it asks the authoritative state.
      this.requestSnapshot();
    });
    room.onMessage('rejected', (message: { clientSeq: number; reason: string }) => {
      this.store.getState().setRejected(message.reason);
    });
    room.onMessage('turnTimer', (message: { combatantId: string; deadline: number }) => {
      this.store.getState().setTurnTimer(message);
    });
    room.onLeave(() => {
      this.store.getState().setConnection('idle');
    });
  }

  private requestSnapshot() {
    if (this.snapshotPending || !this.room) return;
    this.snapshotPending = true;
    this.room.send('requestSnapshot');
  }

  send(intent: IntentBody) {
    if (!this.room) return;
    this.clientSeq += 1;
    this.room.send('intent', { ...intent, clientSeq: this.clientSeq });
  }

  async leave() {
    saveReconnection(null);
    await this.room?.leave();
    this.room = null;
  }
}
