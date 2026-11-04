import { createStore } from 'zustand/vanilla';

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

export interface ClientState {
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
  return createStore<ClientState>()((set) => ({
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
