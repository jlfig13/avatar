import type { GridFile } from '@elemental/shared';
import { describe, expect, it } from 'vitest';
import {
  getCell,
  gridFromFile,
  inBounds,
  manhattan,
  neighbors4,
  sliceArena,
  sliceOrigin,
} from '../src/grid/grid.ts';
import type { Terrain } from '../src/types.ts';
import { makeGrid } from './factories.ts';

const terrains: Terrain[] = ['ground', 'rock', 'shallow_water', 'vegetation'];

// 30 × 30 grid where every cell is distinguishable by its coordinates.
const world = makeGrid(30, 30, ({ x, y }) => ({
  height: (x * 7 + y * 3) % 9,
  terrain: terrains[(x + 2 * y) % 4] as Terrain,
  blocked: (x * y) % 11 === 5,
}));

describe('grid basics', () => {
  const grid = makeGrid(4, 3);
  it('inBounds / getCell', () => {
    expect(inBounds(grid, { x: 3, y: 2 })).toBe(true);
    expect(inBounds(grid, { x: 4, y: 0 })).toBe(false);
    expect(inBounds(grid, { x: 0, y: -1 })).toBe(false);
    expect(getCell(grid, { x: -1, y: 0 })).toBeUndefined();
    expect(getCell(grid, { x: 1, y: 1 })).toBeDefined();
  });
  it('neighbors4 has no diagonals and stays inside the grid', () => {
    expect(neighbors4(grid, { x: 1, y: 1 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 1 },
    ]);
    expect(neighbors4(grid, { x: 0, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
  });
  it('manhattan', () => {
    expect(manhattan({ x: 1, y: 1 }, { x: 4, y: 3 })).toBe(5);
  });
});

describe('sliceArena', () => {
  it('preserves heights, terrain and blocked flags of the source region', () => {
    const arena = sliceArena(world, { x: 15, y: 12 }, 10);
    const origin = sliceOrigin(world, { x: 15, y: 12 }, 10);
    expect(origin).toEqual({ x: 10, y: 7 });
    expect(arena.width).toBe(10);
    expect(arena.height).toBe(10);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const source = getCell(world, { x: x + origin.x, y: y + origin.y });
        const cell = getCell(arena, { x, y });
        expect(cell?.height).toBe(source?.height);
        expect(cell?.terrain).toBe(source?.terrain);
        expect(cell?.blocked).toBe(source?.blocked);
      }
    }
  });

  it('marks escape cells = walkable outer border only', () => {
    const arena = sliceArena(world, { x: 15, y: 15 }, 10);
    arena.cells.forEach((cell, i) => {
      const x = i % 10;
      const y = Math.floor(i / 10);
      const border = x === 0 || y === 0 || x === 9 || y === 9;
      expect(cell.escape).toBe(border && !cell.blocked);
    });
    expect(arena.cells.some((c) => c.blocked && !c.escape)).toBe(true);
  });

  it('shifts a slice near the map edge so it fits', () => {
    expect(sliceOrigin(world, { x: 1, y: 28 }, 10)).toEqual({ x: 0, y: 20 });
    expect(sliceOrigin(world, { x: 29, y: 0 }, 10)).toEqual({ x: 20, y: 0 });
    const arena = sliceArena(world, { x: 29, y: 29 }, 10);
    expect(getCell(arena, { x: 9, y: 9 })?.height).toBe(getCell(world, { x: 29, y: 29 })?.height);
  });

  it('throws when the slice is larger than the map', () => {
    expect(() => sliceArena(makeGrid(8, 8), { x: 4, y: 4 }, 10)).toThrow();
  });
});

describe('gridFromFile', () => {
  const file: GridFile = {
    version: 1,
    id: 'tiny',
    width: 3,
    height: 2,
    heights: [
      [0, 1, 2],
      [3, 4, 5],
    ],
    terrain: [
      ['g', 'w', 'v'],
      ['r', 'g', 'g'],
    ],
    blocked: [
      [0, 0, 0],
      [1, 0, 0],
    ],
    legend: { g: 'ground', r: 'rock', w: 'shallow_water', v: 'vegetation' },
    spawns: { players: [{ x: 0, y: 0 }], enemies: [{ x: 2, y: 1 }] },
  };

  it('reads matrices as [y][x] and marks escape cells', () => {
    const grid = gridFromFile(file);
    expect(getCell(grid, { x: 1, y: 0 })).toEqual({
      height: 1,
      terrain: 'shallow_water',
      blocked: false,
      escape: true,
    });
    expect(getCell(grid, { x: 0, y: 1 })).toMatchObject({
      height: 3,
      terrain: 'rock',
      blocked: true,
      escape: false,
    });
  });
});
