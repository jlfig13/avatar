import { describe, expect, it } from 'vitest';
import { SERVER_DEPENDENCIES } from './index.ts';

describe('@elemental/server', () => {
  it('imports workspace packages by name', () => {
    expect(SERVER_DEPENDENCIES).toEqual([
      '@elemental/combat-core',
      '@elemental/game-data',
      '@elemental/shared',
    ]);
  });
});
