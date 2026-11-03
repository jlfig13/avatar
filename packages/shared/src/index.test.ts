import { describe, expect, it } from 'vitest';
import { SHARED_PACKAGE } from './index.ts';

describe('@elemental/shared', () => {
  it('exposes its package name', () => {
    expect(SHARED_PACKAGE).toBe('@elemental/shared');
  });
});
