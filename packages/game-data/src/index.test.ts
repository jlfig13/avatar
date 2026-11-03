import { describe, expect, it } from 'vitest';
import { GAME_DATA_PACKAGE, GAME_DATA_PACKAGE_DEPENDENCIES } from './index.ts';

describe('@elemental/game-data', () => {
  it('exposes its package name', () => {
    expect(GAME_DATA_PACKAGE).toBe('@elemental/game-data');
  });

  it('imports @elemental/shared by package name', () => {
    expect(GAME_DATA_PACKAGE_DEPENDENCIES).toContain('@elemental/shared');
  });
});
