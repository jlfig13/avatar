import { defineConfig } from 'vitest/config';

// Resolve workspace packages to their TypeScript sources (no build needed for tests).
const conditions = ['@elemental/source'];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
});
