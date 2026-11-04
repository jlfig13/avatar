// pnpm test:sim [--battles N] [--preset preset.water|preset.fire|all] [--enemies 1|2|all] [--seed S]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { gameData } from '@elemental/game-data';
import {
  type BattleReport,
  simulateBattle,
  summarize,
  toCsv,
  toMarkdown,
} from '../src/sim/simulate.ts';

const { values } = parseArgs({
  options: {
    battles: { type: 'string', default: '100' },
    preset: { type: 'string', default: 'all' },
    enemies: { type: 'string', default: 'all' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: join(import.meta.dirname, '..', '..', '..', 'reports') },
  },
});

const battles = Number.parseInt(values.battles, 10);
const firstSeed = Number.parseInt(values.seed, 10);
const presets = values.preset === 'all' ? Object.keys(gameData.presets).sort() : [values.preset];
const enemyCounts = values.enemies === 'all' ? [1, 2] : [Number.parseInt(values.enemies, 10)];
if (!Number.isInteger(battles) || battles < 1)
  throw new Error('--battles must be a positive integer');
for (const preset of presets)
  if (!gameData.presets[preset]) throw new Error(`unknown preset ${preset}`);

const started = performance.now();
const reports: BattleReport[] = [];
for (const presetId of presets) {
  for (const enemies of enemyCounts) {
    for (let i = 0; i < battles; i++)
      reports.push(simulateBattle({ presetId, enemies }, firstSeed + i, gameData));
  }
}
const elapsedMs = performance.now() - started;

const summaries = summarize(reports);
mkdirSync(values.out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const md = join(values.out, `sim-${stamp}.md`);
const csv = join(values.out, `sim-${stamp}.csv`);
writeFileSync(md, toMarkdown(summaries, { battles, firstSeed, elapsedMs }));
writeFileSync(csv, toCsv(reports));

for (const s of summaries) {
  console.log(
    `${s.presetId} × ${s.enemies}: win ${(s.winRate * 100).toFixed(1)}% · rounds ${s.avgRounds.toFixed(1)} · player turns ${s.avgPlayerTurns.toFixed(1)} · ~${Math.round(s.avgDurationSeconds)} s`,
  );
}
console.log(`${reports.length} battles in ${(elapsedMs / 1000).toFixed(1)} s → ${md}`);
