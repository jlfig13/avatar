import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n/i18n.ts';
import { createClientStore, watch } from '../src/store/store.ts';

describe('client store', () => {
  it('notifies watchers only when the selected slice changes (store → scene bridge)', () => {
    const store = createClientStore();
    const seen: boolean[] = [];
    const unwatch = watch(
      store,
      (s) => s.debug.visible,
      (v) => seen.push(v),
    );
    store.getState().toggleDebug();
    store
      .getState()
      .setDebugStats({ sample: 1, fps: 60, gameObjects: 1, drawCalls: 1, memoryMb: null });
    store.getState().toggleDebug();
    expect(seen).toEqual([false, true, false]);
    unwatch();
    store.getState().toggleDebug();
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
    expect(t('debug.fps')).toBe('FPS');
    expect(t('missing.key')).toBe('missing.key');
  });
});
