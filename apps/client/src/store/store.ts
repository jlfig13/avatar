import type { BattleEvent, BattleState, Position } from '@elemental/combat-core';
import { createStore } from 'zustand/vanilla';
import type { IntentBody } from '../net/logic.ts';

// Zustand is the bridge (docs/04 §8): network writes state, React reads it for the HUD,
// Phaser scenes subscribe to changes.

export interface DebugStats {
  /** increasing sample number (shows the panel is live) */
  readonly sample: number;
  readonly fps: number;
  readonly gameObjects: number;
  /** null when the renderer does not report it */
  readonly drawCalls: number | null;
  /** MB of JS heap, null when the browser does not expose it */
  readonly memoryMb: number | null;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface ClientState {
  /** CLI-06 — network state. */
  readonly connection: ConnectionStatus;
  /** recent server events (consumed by the animation queue, CLI-07) */
  readonly events: readonly BattleEvent[];
  readonly rejected: { readonly reason: string; readonly at: number } | null;
  readonly turnTimer: { readonly combatantId: string; readonly deadline: number } | null;
  /** where intents go (the server connection); null when offline */
  readonly sendIntent: ((intent: IntentBody) => void) | null;
  setConnection(status: ConnectionStatus): void;
  pushEvents(events: readonly BattleEvent[]): void;
  setRejected(reason: string | null): void;
  setTurnTimer(timer: { combatantId: string; deadline: number } | null): void;
  setIntentSink(sink: ((intent: IntentBody) => void) | null): void;
  /** Current battle as known by the client (server snapshot; local preview until CLI-06). */
  readonly battle: BattleState | null;
  /** Combatant controlled by this client. */
  readonly actorId: string;
  readonly selectedTechniqueId: string | null;
  readonly hoverCell: Position | null;
  setBattle(battle: BattleState | null): void;
  selectTechnique(id: string | null): void;
  setHoverCell(cell: Position | null): void;
  /** CLI-11 — debug panel (F3). */
  readonly debug: {
    readonly visible: boolean;
    readonly stats: DebugStats | null;
    readonly lastAiDecision: string | null;
  };
  toggleDebug(): void;
  setDebugStats(stats: DebugStats): void;
  setLastAiDecision(log: string): void;
}

export function createClientStore() {
  return createStore<ClientState>()((set, get) => ({
    connection: 'idle',
    events: [],
    rejected: null,
    turnTimer: null,
    sendIntent: null,
    setConnection(connection) {
      set({ connection });
    },
    pushEvents(events) {
      // keep the last 200 events; the animation queue consumes them in order
      set((s) => ({ events: [...s.events, ...events].slice(-200) }));
    },
    setRejected(reason) {
      set({ rejected: reason === null ? null : { reason, at: Date.now() } });
    },
    setTurnTimer(turnTimer) {
      set({ turnTimer });
    },
    setIntentSink(sendIntent) {
      set({ sendIntent });
    },
    battle: null,
    actorId: 'player',
    selectedTechniqueId: null,
    hoverCell: null,
    setBattle(battle) {
      set({ battle });
    },
    selectTechnique(id) {
      set({ selectedTechniqueId: get().selectedTechniqueId === id ? null : id });
    },
    setHoverCell(cell) {
      const current = get().hoverCell;
      if (current === cell || (current && cell && current.x === cell.x && current.y === cell.y))
        return;
      set({ hoverCell: cell });
    },
    debug: { visible: false, stats: null, lastAiDecision: null },
    toggleDebug() {
      set((s) => ({ debug: { ...s.debug, visible: !s.debug.visible } }));
    },
    setDebugStats(stats) {
      set((s) => ({ debug: { ...s.debug, stats } }));
    },
    setLastAiDecision(log) {
      set((s) => ({ debug: { ...s.debug, lastAiDecision: log } }));
    },
  }));
}

export type ClientStore = ReturnType<typeof createClientStore>;

/** Calls `apply` now and whenever the selected slice changes; returns the unsubscribe function. */
export function watch<T>(
  store: ClientStore,
  select: (s: ClientState) => T,
  apply: (value: T) => void,
): () => void {
  let current = select(store.getState());
  apply(current);
  return store.subscribe((state) => {
    const next = select(state);
    if (!Object.is(next, current)) {
      current = next;
      apply(next);
    }
  });
}
