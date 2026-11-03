import { z } from 'zod';
import { ElementSchema } from './technique.ts';

// docs/05 §5
export const PassiveSchema = z.strictObject({
  id: z.string(),
  nameKey: z.string(),
  reaction: z.strictObject({
    trigger: z.enum(['hitByMelee', 'hitByAny', 'enemyEntersAdjacent']),
    effect: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('counterAttack'), damageMultiplier: z.number() }),
      z.strictObject({ kind: z.literal('push'), cells: z.number().int() }),
      z.strictObject({
        kind: z.literal('status'),
        statusId: z.string(),
        rounds: z.number().int(),
        magnitude: z.number(),
      }),
    ]),
  }),
});

export const AttributesSchema = z.strictObject({
  power: z.number().int().min(0),
  control: z.number().int().min(0),
  resistance: z.number().int().min(0),
  mobility: z.number().int().min(0),
  spirit: z.number().int().min(0),
  focus: z.number().int().min(0),
});

// docs/05 §6
export const MonsterSchema = z.strictObject({
  id: z.string(),
  nameKey: z.string(),
  role: z.string(),
  maxHp: z.number().int().min(1),
  attributes: AttributesSchema,
  techniqueIds: z.array(z.string()),
  passiveIds: z.array(z.string()),
  ai: z.strictObject({ profile: z.string() }),
});

// docs/05 §7
export const PresetSchema = z.strictObject({
  id: z.string(),
  nameKey: z.string(),
  element: ElementSchema,
  maxHp: z.number().int().min(1),
  attributes: AttributesSchema,
  techniqueIds: z.array(z.string()),
  passiveIds: z.array(z.string()),
});

export type Passive = z.infer<typeof PassiveSchema>;
export type Monster = z.infer<typeof MonsterSchema>;
export type Preset = z.infer<typeof PresetSchema>;
