import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Workspace packages resolve to their TypeScript sources (ADR-013); the rest are Vite's defaults.
const conditions = ['@elemental/source', 'module', 'browser', 'development|production'];

export default defineConfig({
  plugins: [react()],
  resolve: { conditions },
  server: { port: 5173 },
  test: { environment: 'node' },
});
