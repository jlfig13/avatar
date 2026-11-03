import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGameData, dataFiles, gameData } from '../src/index.ts';

const clone = <T>(value: T): T => structuredClone(value);

describe('game data', () => {
  it('loads the 8 techniques, 3 passives and 2 presets of slice 1', () => {
    expect(Object.keys(gameData.techniques).sort()).toEqual([
      'fire.blast',
      'fire.burst',
      'fire.surge',
      'fire.wall',
      'water.freeze',
      'water.glide',
      'water.shield',
      'water.whip',
    ]);
    expect(Object.keys(gameData.passives).sort()).toEqual([
      'fire.ember',
      'monster.counter',
      'water.backflow',
    ]);
    expect(Object.keys(gameData.presets).sort()).toEqual(['preset.fire', 'preset.water']);
    expect(gameData.rules.ct.threshold).toBe(100);
  });

  it('reports file and field when a required field is missing', () => {
    const water = clone(dataFiles['techniques/water.json']) as Record<string, unknown>[];
    delete water[0]?.energyCost;
    const result = buildGameData({ ...dataFiles, 'techniques/water.json': water });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/^techniques\/water\.json: \[0:water\.whip\]\.energyCost: /);
  });

  it('fails when a preset references an unknown technique', () => {
    const presets = clone(dataFiles['combatants/player-presets.json']) as {
      techniqueIds: string[];
    }[];
    presets[0]?.techniqueIds.push('water.typo');
    const result = buildGameData({ ...dataFiles, 'combatants/player-presets.json': presets });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(
      'combatants/player-presets.json: preset.water.techniqueIds: unknown technique "water.typo"',
    );
  });

  it('fails when a preset references an unknown passive', () => {
    const presets = clone(dataFiles['combatants/player-presets.json']) as {
      passiveIds: string[];
    }[];
    presets[1]?.passiveIds.push('fire.nope');
    const result = buildGameData({ ...dataFiles, 'combatants/player-presets.json': presets });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown fields (typos in data)', () => {
    const rules = { ...(dataFiles['rules.json'] as object), extra: 1 };
    expect(buildGameData({ ...dataFiles, 'rules.json': rules }).ok).toBe(false);
  });

  it('rejects duplicate ids', () => {
    const result = buildGameData({
      ...dataFiles,
      'techniques/copy.json': dataFiles['techniques/water.json'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('duplicate technique id "water.whip"'))).toBe(true);
  });
});

describe('validate:data CLI', () => {
  const script = join(import.meta.dirname, '..', 'scripts', 'validate.ts');
  const dataDir = join(import.meta.dirname, '..', 'data');
  const run = (dir: string) =>
    execFileSync(process.execPath, ['--conditions=@elemental/source', script, dir], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

  it('exits with an error naming the file and the field', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elemental-data-'));
    try {
      cpSync(dataDir, dir, { recursive: true });
      const file = join(dir, 'techniques', 'fire.json');
      const fire = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>[];
      delete fire[2]?.accuracy;
      writeFileSync(file, JSON.stringify(fire));
      expect(() => run(dir)).toThrow(/techniques\/fire\.json: \[2:fire\.burst\]\.accuracy/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes on the real data', () => {
    expect(run(dataDir)).toContain('validate:data ok');
  });
});
