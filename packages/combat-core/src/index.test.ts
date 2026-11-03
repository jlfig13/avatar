import { describe, expect, it } from 'vitest';
import { COMBAT_CORE_PACKAGE, COMBAT_CORE_PACKAGE_DEPENDENCIES } from './index.ts';

describe('@elemental/combat-core', () => {
  it('exposes its package name', () => {
    expect(COMBAT_CORE_PACKAGE).toBe('@elemental/combat-core');
  });

  it('imports @elemental/shared by package name', () => {
    expect(COMBAT_CORE_PACKAGE_DEPENDENCIES).toContain('@elemental/shared');
  });
});
