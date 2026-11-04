import { gridFromFile } from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';
import { RENDER } from '../src/config/render.ts';
import { arenaShapes, cellShape, maxHeightOf } from '../src/game/arenaGeometry.ts';
import { cellToScreen } from '../src/game/iso.ts';

const arena = gameData.maps['test-arena'];
if (!arena) throw new Error('test-arena missing');
const grid = gridFromFile(arena);

describe('procedural arena geometry', () => {
  it('draws one shape per cell of test-arena, back to front', () => {
    const shapes = arenaShapes(grid, RENDER);
    expect(shapes).toHaveLength(100);
    for (let i = 1; i < shapes.length; i++)
      expect(shapes[i]?.depth).toBeGreaterThanOrEqual(shapes[i - 1]?.depth ?? 0);
    expect(maxHeightOf(grid)).toBe(3);
  });

  it('the top face is centred on the projected cell (markers (0,0) and (9,9) align)', () => {
    for (const [x, y] of [
      [0, 0],
      [9, 9],
    ] as const) {
      const h = grid.cells[y * 10 + x]?.height ?? 0;
      const shape = cellShape(x, y, h, RENDER);
      const centre = cellToScreen({ x, y }, h, RENDER);
      const cx = (shape.top[1]?.x ?? 0) / 2 + (shape.top[3]?.x ?? 0) / 2;
      const cy = (shape.top[0]?.y ?? 0) / 2 + (shape.top[2]?.y ?? 0) / 2;
      expect({ cx, cy }).toEqual({ cx: centre.sx, cy: centre.sy });
    }
  });

  it('stacks one level per height step and keeps a base slab at height 0', () => {
    const flat = cellShape(2, 2, 0, RENDER);
    const tall = cellShape(2, 2, 3, RENDER);
    expect(flat.levelSeams).toEqual([]);
    expect(tall.levelSeams).toEqual([16, 32, 48]);
    // the bottom of every column sits on the same ground plane
    expect(tall.left[3]?.y).toBe(flat.left[3]?.y);
  });
});
