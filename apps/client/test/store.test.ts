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

describe('i18n', () => {
  it('translates known keys and falls back to the key', () => {
    expect(t('debug.cycleColor')).toBe('Trocar cor do losango');
    expect(t('missing.key')).toBe('missing.key');
  });
});
