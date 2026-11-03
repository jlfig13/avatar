// pnpm validate:data — validates packages/game-data/data/**/*.json against the schemas.
// Reads from disk (not from imports) so malformed JSON and unlisted files are reported too.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildGameData } from '../src/build.ts';
import { dataFiles } from '../src/files.ts';

const dataDir = process.argv[2] ?? join(import.meta.dirname, '..', 'data');

function listJson(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listJson(path);
    return entry.endsWith('.json') ? [path] : [];
  });
}

const errors: string[] = [];
const files: Record<string, unknown> = {};
for (const path of listJson(dataDir)) {
  const key = relative(dataDir, path).split('\\').join('/');
  try {
    files[key] = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${key}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  if (process.argv[2] === undefined && !(key in dataFiles)) {
    errors.push(`${key}: not listed in packages/game-data/src/files.ts`);
  }
}

const result = buildGameData(files);
if (!result.ok) errors.push(...result.errors);

if (errors.length > 0) {
  console.error(`validate:data failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const { data } = result as Extract<typeof result, { ok: true }>;
console.log(
  `validate:data ok — ${Object.keys(data.techniques).length} techniques, ` +
    `${Object.keys(data.passives).length} passives, ${Object.keys(data.presets).length} presets, ` +
    `${Object.keys(data.monsters).length} monsters, ${Object.keys(data.maps).length} maps`,
);
