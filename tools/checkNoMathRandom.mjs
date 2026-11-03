// CLAUDE.md rule 6: Math.random is forbidden in game logic. Runs as part of `pnpm lint`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['packages/combat-core/src', 'packages/game-data', 'apps/server/src'];
const skip = new Set(['node_modules', 'dist', 'coverage']);
const pattern = /Math\s*\.\s*random/;
const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry) && pattern.test(readFileSync(path, 'utf8'))) {
      offenders.push(path);
    }
  }
}

for (const root of roots) walk(root);

if (offenders.length > 0) {
  console.error('Math.random is forbidden here (use the seeded RNG from combat-core):');
  for (const file of offenders) console.error(`  ${file}`);
  process.exit(1);
}
