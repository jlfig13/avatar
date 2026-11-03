import { z } from 'zod';

// docs/05 §4
export const ElementSchema = z.enum(['water', 'earth', 'fire', 'air']);
export const CellEffectKindSchema = z.enum(['ice', 'fire', 'earth_wall', 'gust']);

export const TechniqueAreaSchema = z.discriminatedUnion('shape', [
  z.strictObject({ shape: z.literal('single') }),
  z.strictObject({ shape: z.literal('cross'), radius: z.number().int().min(1) }),
  z.strictObject({ shape: z.literal('line'), length: z.number().int().min(1) }),
  z.strictObject({ shape: z.literal('self') }),
]);

export const TechniqueEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('damage') }),
  z.strictObject({ kind: z.literal('heal') }),
  z.strictObject({
    kind: z.literal('status'),
    statusId: z.string(),
    rounds: z.number().int(),
    magnitude: z.number(),
  }),
  z.strictObject({ kind: z.literal('cellEffect'), effect: CellEffectKindSchema }),
  z.strictObject({
    kind: z.literal('dash'),
    maxCells: z.number().int(),
    ignoresTerrainCost: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('push'), cells: z.number().int() }),
]);

export const TechniqueSchema = z.strictObject({
  id: z.string(),
  /** null for monster techniques without an element (docs/05 §4, ADR-015) */
  element: ElementSchema.nullable(),
  nameKey: z.string(),
  role: z.enum(['attack', 'defense', 'control', 'mobility']),
  target: z.enum(['enemy', 'ally', 'self', 'cell']),
  range: z.strictObject({ min: z.number().int().min(0), max: z.number().int().min(0) }),
  rangeBonusFromHeight: z.boolean(),
  requiresLineOfSight: z.boolean(),
  area: TechniqueAreaSchema,
  energyCost: z.number().int().min(0),
  ctDelay: z.number().int().min(0),
  accuracy: z.number().int().min(0).max(100),
  power: z.number().int().min(0),
  powerScaling: z.number().min(0),
  effects: z.array(TechniqueEffectSchema),
});

export type Technique = z.infer<typeof TechniqueSchema>;
export type TechniqueArea = z.infer<typeof TechniqueAreaSchema>;
export type TechniqueEffect = z.infer<typeof TechniqueEffectSchema>;
