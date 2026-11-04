import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';
import { simulateBattle, summarize, toCsv, toMarkdown } from '../src/sim/simulate.ts';

describe('balance simulator (QA-01)', () => {
  it('is deterministic per seed and always reaches an outcome', () => {
    const a = simulateBattle({ presetId: 'preset.water', enemies: 1 }, 42, gameData);
    const b = simulateBattle({ presetId: 'preset.water', enemies: 1 }, 42, gameData);
    expect(a).toEqual(b);
    expect(['victory', 'defeat', 'fled', 'stalemate']).toContain(a.result);
    expect(a.durationSeconds).toBe(a.playerTurns * 20 + a.aiTurns * 3);
  });

  it('summarizes win rate, turns and technique usage, and writes Markdown + CSV', () => {
    const reports = [1, 2, 3, 4].flatMap((seed) => [
      simulateBattle({ presetId: 'preset.fire', enemies: 1 }, seed, gameData),
      simulateBattle({ presetId: 'preset.fire', enemies: 2 }, seed, gameData),
    ]);
    const summaries = summarize(reports);
    expect(summaries.map((s) => [s.presetId, s.enemies, s.battles])).toEqual([
      ['preset.fire', 1, 4],
      ['preset.fire', 2, 4],
    ]);
    const s = summaries[0];
    expect(s?.winRate).toBeGreaterThanOrEqual(0);
    expect(s?.techniques.some((t) => t.id.startsWith('fire.'))).toBe(true);
    const md = toMarkdown(summaries, { battles: 4, firstSeed: 1, elapsedMs: 10 });
    expect(md).toContain('| preset.fire | 1 |');
    const csv = toCsv(reports).trim().split('\n');
    expect(csv).toHaveLength(1 + reports.length);
    expect(csv[0]).toMatch(
      /^seed,preset,enemies,result,rounds,playerTurns,aiTurns,durationSeconds,uses:/,
    );
  });
});
