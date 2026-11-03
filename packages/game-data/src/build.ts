import {
  type GameData,
  type GridFile,
  GridFileSchema,
  type Monster,
  MonsterSchema,
  type Passive,
  PassiveSchema,
  type Preset,
  PresetSchema,
  type Rules,
  RulesSchema,
  type Technique,
  TechniqueSchema,
} from '@elemental/shared';
import { z } from 'zod';

/** Raw JSON contents keyed by path relative to `data/` (e.g. `techniques/water.json`). */
export type RawDataFiles = Readonly<Record<string, unknown>>;

export type BuildResult =
  | { readonly ok: true; readonly data: GameData }
  | { readonly ok: false; readonly errors: readonly string[] };

function formatPath(path: readonly PropertyKey[], value: unknown): string {
  let out = '';
  let cursor: unknown = value;
  for (const key of path) {
    if (typeof key === 'number') {
      const item = Array.isArray(cursor) ? cursor[key] : undefined;
      const id = item && typeof item === 'object' && 'id' in item ? String(item.id) : null;
      out += id ? `[${key}:${id}]` : `[${key}]`;
    } else {
      out += out ? `.${String(key)}` : String(key);
    }
    cursor =
      cursor && typeof cursor === 'object' ? (cursor as Record<PropertyKey, unknown>)[key] : null;
  }
  return out || '(root)';
}

function parse<T>(file: string, schema: z.ZodType<T>, value: unknown, errors: string[]): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    errors.push(`${file}: ${formatPath(issue.path, value)}: ${issue.message}`);
  }
  return null;
}

function index<T extends { id: string }>(
  kind: string,
  items: readonly { file: string; item: T }[],
  errors: string[],
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const { file, item } of items) {
    if (out[item.id]) errors.push(`${file}: duplicate ${kind} id "${item.id}"`);
    out[item.id] = item;
  }
  return out;
}

/** Validates every file against its schema and checks cross references between ids. */
export function buildGameData(files: RawDataFiles): BuildResult {
  const errors: string[] = [];
  let rules: Rules | null = null;
  const techniques: { file: string; item: Technique }[] = [];
  const passives: { file: string; item: Passive }[] = [];
  const monsters: { file: string; item: Monster }[] = [];
  const presets: { file: string; item: Preset }[] = [];
  const maps: { file: string; item: GridFile }[] = [];

  for (const [file, value] of Object.entries(files)) {
    if (file === 'rules.json') {
      rules = parse(file, RulesSchema, value, errors);
    } else if (file === 'passives.json') {
      for (const item of parse(file, z.array(PassiveSchema), value, errors) ?? []) {
        passives.push({ file, item });
      }
    } else if (file === 'combatants/player-presets.json') {
      for (const item of parse(file, z.array(PresetSchema), value, errors) ?? []) {
        presets.push({ file, item });
      }
    } else if (/^techniques\/[\w-]+\.json$/.test(file)) {
      for (const item of parse(file, z.array(TechniqueSchema), value, errors) ?? []) {
        techniques.push({ file, item });
      }
    } else if (/^monsters\/[\w-]+\.json$/.test(file)) {
      const item = parse(file, MonsterSchema, value, errors);
      if (item) monsters.push({ file, item });
    } else if (/^maps\/[\w-]+\.grid\.json$/.test(file)) {
      const item = parse(file, GridFileSchema, value, errors);
      if (item) maps.push({ file, item });
    } else {
      errors.push(`${file}: unknown data file (not mapped to any schema)`);
    }
  }

  if (!rules && !errors.some((e) => e.startsWith('rules.json'))) {
    errors.push('rules.json: missing file');
  }

  for (const { file, item } of techniques) {
    if (item.range.min > item.range.max) {
      errors.push(`${file}: ${item.id}.range: min greater than max`);
    }
  }
  for (const { file, item } of maps) {
    const expected = file.replace(/^maps\//, '').replace(/\.grid\.json$/, '');
    if (item.id !== expected) errors.push(`${file}: id "${item.id}" must match file name`);
  }

  const data = {
    techniques: index('technique', techniques, errors),
    passives: index('passive', passives, errors),
    monsters: index('monster', monsters, errors),
    presets: index('preset', presets, errors),
    maps: index('map', maps, errors),
  };

  for (const { file, item } of [...presets, ...monsters]) {
    for (const id of item.techniqueIds) {
      if (!data.techniques[id])
        errors.push(`${file}: ${item.id}.techniqueIds: unknown technique "${id}"`);
    }
    for (const id of item.passiveIds) {
      if (!data.passives[id])
        errors.push(`${file}: ${item.id}.passiveIds: unknown passive "${id}"`);
    }
  }

  if (errors.length > 0 || !rules) return { ok: false, errors };
  return { ok: true, data: { rules, ...data } };
}

export function loadGameData(files: RawDataFiles): GameData {
  const result = buildGameData(files);
  if (!result.ok) throw new Error(`Invalid game data:\n${result.errors.join('\n')}`);
  return result.data;
}
