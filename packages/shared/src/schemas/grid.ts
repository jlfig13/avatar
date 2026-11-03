import { z } from 'zod';

// docs/05 §3 — *.grid.json. Matrices are indexed [y][x].
export const TerrainSchema = z.enum(['ground', 'rock', 'shallow_water', 'vegetation']);
export const PositionSchema = z.strictObject({ x: z.number().int(), y: z.number().int() });

export const GridFileSchema = z
  .strictObject({
    version: z.literal(1),
    id: z.string(),
    width: z.number().int().min(1),
    height: z.number().int().min(1),
    heights: z.array(z.array(z.number().int().min(0).max(8))),
    terrain: z.array(z.array(z.string().length(1))),
    blocked: z.array(z.array(z.union([z.literal(0), z.literal(1)]))),
    legend: z.record(z.string().length(1), TerrainSchema),
    spawns: z.strictObject({
      players: z.array(PositionSchema),
      enemies: z.array(PositionSchema),
    }),
  })
  .superRefine((grid, ctx) => {
    for (const key of ['heights', 'terrain', 'blocked'] as const) {
      const rows = grid[key];
      if (rows.length !== grid.height) {
        ctx.addIssue({ code: 'custom', path: [key], message: `expected ${grid.height} rows` });
      }
      rows.forEach((row, y) => {
        if (row.length !== grid.width) {
          ctx.addIssue({ code: 'custom', path: [key, y], message: `expected ${grid.width} cells` });
        }
      });
    }
    grid.terrain.forEach((row, y) => {
      row.forEach((symbol, x) => {
        if (!(symbol in grid.legend)) {
          ctx.addIssue({
            code: 'custom',
            path: ['terrain', y, x],
            message: `symbol "${symbol}" missing from legend`,
          });
        }
      });
    });
    const spawns = [...grid.spawns.players, ...grid.spawns.enemies];
    spawns.forEach((pos) => {
      const inside = pos.x >= 0 && pos.y >= 0 && pos.x < grid.width && pos.y < grid.height;
      if (!inside) {
        ctx.addIssue({
          code: 'custom',
          path: ['spawns'],
          message: `spawn ${pos.x},${pos.y} outside grid`,
        });
      } else if (grid.blocked[pos.y]?.[pos.x] === 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['spawns'],
          message: `spawn ${pos.x},${pos.y} is blocked`,
        });
      }
    });
  });

export type GridFile = z.infer<typeof GridFileSchema>;
