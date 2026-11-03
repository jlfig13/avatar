import { describe, expect, it } from 'vitest';
import { CLIENT_DEPENDENCIES } from './index.ts';

describe('@elemental/client', () => {
  it('imports workspace packages by name', () => {
    expect(CLIENT_DEPENDENCIES).toEqual(['@elemental/combat-core', '@elemental/game-data']);
  });
});
