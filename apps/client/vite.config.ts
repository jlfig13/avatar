import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Workspace packages resolve to their TypeScript sources (ADR-013); the rest are Vite's defaults.
const conditions = ['@elemental/source', 'module', 'browser', 'development|production'];

export default defineConfig({
  plugins: [react()],
  resolve: { conditions },
  ssr: { resolve: { conditions: ['@elemental/source'] } },
  server: { port: 5173 },
  // VITE_* variables come from the repository root .env (see .env.example).
  envDir: '../../',
  test: { environment: 'node' },
});
