import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n/i18n.ts';
import { createClientStore, DEBUG_COLORS, watch } from '../src/store/store.ts';

describe('client store', () => {
  it('cycles the diamond color and notifies watchers (React → store → scene)', () => {
    const store = createClientStore();
    const seen: number[] = [];
    const unwatch = watch(
      store,
      (s) => s.diamondColor,
      (c) => seen.push(c),
    );
    store.getState().cycleDiamondColor();
    store.getState().cycleDiamondColor();
    expect(seen).toEqual([DEBUG_COLORS[0], DEBUG_COLORS[1], DEBUG_COLORS[2]]);
    unwatch();
    store.getState().cycleDiamondColor();
    expect(seen).toHaveLength(3);
  });
});

describe('debug state', () => {
  it('toggles the panel and keeps the latest stats and AI decision', () => {
    const store = createClientStore();
    expect(store.getState().debug.visible).toBe(false);
    store.getState().toggleDebug();
    store
      .getState()
      .setDebugStats({ sample: 1, fps: 60, gameObjects: 3, drawCalls: 2, memoryMb: null });
    store.getState().setLastAiDecision('enemy1: move + monster.claw (score 1.2)');
    expect(store.getState().debug).toEqual({
      visible: true,
      stats: { sample: 1, fps: 60, gameObjects: 3, drawCalls: 2, memoryMb: null },
      lastAiDecision: 'enemy1: move + monster.claw (score 1.2)',
    });
    store.getState().toggleDebug();
    expect(store.getState().debug.visible).toBe(false);
  });
});

describe('i18n', () => {
  it('translates known keys and falls back to the key', () => {
    expect(t('debug.cycleColor')).toBe('Trocar cor do losango');
    expect(t('missing.key')).toBe('missing.key');
  });
});
