import { createStore } from 'zustand/vanilla';

// Zustand is the bridge (docs/04 §8): network writes state, React reads it for the HUD,
// Phaser scenes subscribe to changes.

export const DEBUG_COLORS = [0x6fa8dc, 0xe06666, 0x93c47d, 0xf6b26b] as const;

export interface ClientState {
  /** CLI-01 smoke test: color of the test diamond drawn by the scene. */
  readonly diamondColor: number;
  cycleDiamondColor(): void;
}

export function createClientStore() {
  return createStore<ClientState>()((set, get) => ({
    diamondColor: DEBUG_COLORS[0],
    cycleDiamondColor() {
      const index = DEBUG_COLORS.indexOf(get().diamondColor as (typeof DEBUG_COLORS)[number]);
      set({ diamondColor: DEBUG_COLORS[(index + 1) % DEBUG_COLORS.length] ?? DEBUG_COLORS[0] });
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
