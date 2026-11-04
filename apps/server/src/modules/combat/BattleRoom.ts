import { randomInt } from 'node:crypto';
import { type AuthContext, type Client, type Delayed, Room } from '@colyseus/core';
import {
  type Action,
  type BattleEvent,
  chooseActions,
  turnTimeoutSeconds,
} from '@elemental/combat-core';
import {
  BattleJoinOptionsSchema,
  type EventsMessage,
  type GameData,
  type Intent,
  IntentSchema,
  MESSAGE,
  type RejectedMessage,
  type TurnTimerMessage,
} from '@elemental/shared';
import type { Logger } from '../../logger.ts';
import type { AuthData } from '../account/roomAuth.ts';
import { BattleSession, createSetup, PLAYER_ID } from './session.ts';

export interface BattleSummary {
  readonly roomId: string;
  readonly accountId: string | null;
  readonly seed: number;
  readonly result: 'victory' | 'defeat' | 'fled' | 'abandoned';
  readonly durationSeconds: number;
  readonly rounds: number;
  readonly playerTurns: number;
  readonly timeouts: number;
}

export interface BattleRoomDeps {
  readonly data: GameData;
  readonly logger: Logger;
  authenticate(token: string): Promise<AuthData>;
  /** SRV-03 — pause between AI actions (ms). */
  readonly aiActionDelayMs: number;
  /** Tests shrink the turn timer; defaults to seconds × 1000. */
  turnTimeoutMs?(seconds: number): number;
  /** Seconds a dropped player may take to reconnect; defaults to rules.disconnect.allDisconnectedPauseSeconds. */
  readonly reconnectSeconds?: number;
  seed?(): number;
  onBattleStarted?(info: {
    roomId: string;
    accountId: string | null;
    seed: number;
    presetId: string;
    enemies: number;
  }): void;
  onBattleEnded?(summary: BattleSummary): void;
}

function toAction(intent: Intent, actorId: string): Action {
  switch (intent.kind) {
    case 'move':
      return { type: 'move', actorId, to: intent.to };
    case 'technique':
      return { type: 'technique', actorId, techniqueId: intent.techniqueId, target: intent.target };
    case 'defend':
      return { type: 'defend', actorId };
    case 'flee':
      return { type: 'flee', actorId };
    case 'endTurn':
      return { type: 'endTurn', actorId };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** docs/04 §4–5 — one authoritative battle per room (slice 1: single player vs AI). */
export class BattleRoom extends Room {
  /** Set by createBattleRoom(); each configured subclass carries its own dependencies. */
  static deps: BattleRoomDeps;
  private get deps(): BattleRoomDeps {
    // `as`: the runtime constructor is always a ConfiguredBattleRoom created by createBattleRoom().
    return (this.constructor as typeof BattleRoom).deps;
  }
  override maxClients = 1;
  session!: BattleSession;
  private accountId: string | null = null;
  private presetId = '';
  private enemies = 1;
  private startedAt = Date.now();
  private turnTimer: Delayed | null = null;
  private timedTurnSeq = -1;
  private paused = false;
  private running = false;
  private ended = false;
  private playerTurns = 0;
  private timeouts = 0;

  override async onAuth(
    _client: Client,
    _options: unknown,
    context: AuthContext,
  ): Promise<AuthData> {
    return this.deps.authenticate(context.token ?? '');
  }

  override onCreate(options: unknown) {
    const parsed = BattleJoinOptionsSchema.safeParse(options);
    if (!parsed.success || !this.deps.data.presets[parsed.data.presetId])
      throw new Error('invalid battle options');
    this.presetId = parsed.data.presetId;
    this.enemies = parsed.data.enemies;
    // The seed comes from the server (crypto) — never from the client.
    const seed = this.deps.seed?.() ?? randomInt(1, 2 ** 31 - 1);
    this.session = new BattleSession(
      createSetup(this.roomId, parsed.data, seed, this.deps.data),
      this.deps.data,
    );
    this.deps.logger.info(
      { roomId: this.roomId, seed, presetId: this.presetId, enemies: this.enemies },
      'battle created',
    );
    this.onMessage(MESSAGE.intent, (client, message: unknown) =>
      this.handleIntent(client, message),
    );
    this.onMessage(MESSAGE.requestSnapshot, (client) =>
      client.send(MESSAGE.snapshot, this.session.snapshot()),
    );
  }

  override onJoin(client: Client, _options: unknown, auth?: AuthData) {
    this.accountId = auth?.accountId ?? null;
    this.startedAt = Date.now();
    this.deps.onBattleStarted?.({
      roomId: this.roomId,
      accountId: this.accountId,
      seed: this.session.setup.seed,
      presetId: this.presetId,
      enemies: this.enemies,
    });
    client.send(MESSAGE.snapshot, this.session.snapshot());
    void this.proceed();
  }

  /** docs/02 §10 — with every player gone the battle pauses until they return (or the grace time ends). */
  override async onDrop(client: Client) {
    this.paused = true;
    this.clearTurnTimer();
    const seconds =
      this.deps.reconnectSeconds ?? this.deps.data.rules.disconnect.allDisconnectedPauseSeconds;
    this.deps.logger.info(
      { roomId: this.roomId, seconds },
      'player dropped, waiting for reconnection',
    );
    try {
      await this.allowReconnection(client, seconds);
    } catch {
      // onLeave handles the abandonment.
    }
  }

  override onReconnect(client: Client) {
    this.paused = false;
    client.send(MESSAGE.snapshot, this.session.snapshot());
    this.deps.logger.info({ roomId: this.roomId }, 'player reconnected');
    void this.proceed();
  }

  override onLeave() {
    this.clearTurnTimer();
    if (!this.ended) this.finish('abandoned');
  }

  override onDispose() {
    this.clearTurnTimer();
  }

  private sendAll(type: string, message: unknown) {
    for (const client of this.clients) client.send(type, message);
  }

  private broadcastEvents(events: readonly BattleEvent[]) {
    if (events.length === 0) return;
    for (const e of events) {
      if (e.type === 'turnStarted' && e.combatantId === PLAYER_ID) this.playerTurns++;
      if (e.type === 'timedOut') this.timeouts++;
    }
    const message: EventsMessage<BattleEvent> = { fromSeq: events[0]?.seq ?? 0, events };
    this.sendAll(MESSAGE.events, message);
  }

  private apply(action: Action) {
    const result = this.session.apply(action);
    if (result.ok) this.broadcastEvents(result.events);
    return result;
  }

  private handleIntent(client: Client, message: unknown) {
    const parsed = IntentSchema.safeParse(message);
    const clientSeq =
      message &&
      typeof message === 'object' &&
      'clientSeq' in message &&
      typeof message.clientSeq === 'number'
        ? message.clientSeq
        : -1;
    const reject = (reason: RejectedMessage['reason']) =>
      client.send(MESSAGE.rejected, { clientSeq, reason } satisfies RejectedMessage);
    if (!parsed.success) return reject('invalid_intent');
    if (this.paused) return reject('paused');
    if (this.session.state.turn?.combatantId !== PLAYER_ID) {
      return reject(this.session.state.phase === 'running' ? 'not_your_turn' : 'battle_over');
    }
    const result = this.apply(toAction(parsed.data, PLAYER_ID));
    if (!result.ok) return reject(result.reason);
    if (this.session.state.turn?.combatantId !== PLAYER_ID) {
      this.clearTurnTimer();
      void this.proceed();
    } else if (this.session.state.phase !== 'running') {
      this.finish(this.session.state.phase);
    }
  }

  /** Runs the battle until it needs player input (or ends). */
  private async proceed() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.session.state.phase === 'running' && !this.paused) {
        const actor = this.session.activeCombatant;
        if (!actor) {
          this.apply({ type: 'advance' });
          continue;
        }
        if (actor.controller === 'ai') {
          await this.runAiTurn(actor.id);
          continue;
        }
        this.startTurnTimer(actor.id);
        break;
      }
    } finally {
      this.running = false;
    }
    if (this.session.state.phase !== 'running') this.finish(this.session.state.phase);
  }

  /** SRV-03 — AI turns run on the server, with a configurable delay between actions. */
  private async runAiTurn(actorId: string) {
    // Monsters use the ai.profile of their data file; anything else plays 'balanced'.
    const template = this.session.setup.combatants.find((c) => c.id === actorId)?.template;
    const monsterProfile =
      (template?.kind === 'monster'
        ? this.deps.data.monsters[template.id]?.ai.profile
        : undefined) ?? 'balanced';
    const actions = chooseActions({
      state: this.session.state,
      actorId,
      data: this.deps.data,
      profile: monsterProfile,
    });
    for (const action of actions) {
      if (this.paused || this.session.state.phase !== 'running') return;
      if (this.deps.aiActionDelayMs > 0) await sleep(this.deps.aiActionDelayMs);
      const result = this.apply(action);
      if (!result.ok) {
        this.deps.logger.error(
          { roomId: this.roomId, action, reason: result.reason },
          'AI produced an invalid action',
        );
        this.apply({ type: 'endTurn', actorId });
        return;
      }
    }
  }

  /** docs/02 §5 — 60 s per player turn (10 s after repeated timeouts); expiry applies `timeout`. */
  private startTurnTimer(actorId: string) {
    const turnSeq = this.session.state.eventSeq;
    if (this.turnTimer && this.timedTurnSeq === turnSeq) return;
    this.clearTurnTimer();
    const seconds = turnTimeoutSeconds(this.session.state, actorId, this.deps.data);
    const ms = this.deps.turnTimeoutMs?.(seconds) ?? seconds * 1000;
    this.timedTurnSeq = turnSeq;
    const message: TurnTimerMessage = { combatantId: actorId, deadline: Date.now() + ms };
    this.sendAll(MESSAGE.turnTimer, message);
    this.turnTimer = this.clock.setTimeout(() => {
      this.turnTimer = null;
      if (this.session.state.turn?.combatantId !== actorId || this.paused) return;
      this.apply({ type: 'timeout', actorId });
      void this.proceed();
    }, ms);
  }

  private clearTurnTimer() {
    this.turnTimer?.clear();
    this.turnTimer = null;
    this.timedTurnSeq = -1;
  }

  private finish(result: BattleSummary['result']) {
    if (this.ended) return;
    this.ended = true;
    this.clearTurnTimer();
    const summary: BattleSummary = {
      roomId: this.roomId,
      accountId: this.accountId,
      seed: this.session.setup.seed,
      result,
      durationSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      rounds: this.session.state.round,
      playerTurns: this.playerTurns,
      timeouts: this.timeouts,
    };
    // Seed + actions are enough to replay the battle (docs/04 §1.3).
    this.deps.logger.info({ ...summary, actions: this.session.actions }, 'battle ended');
    this.deps.onBattleEnded?.(summary);
  }
}

export function createBattleRoom(deps: BattleRoomDeps): typeof BattleRoom {
  return class ConfiguredBattleRoom extends BattleRoom {
    static override deps = deps;
  };
}
