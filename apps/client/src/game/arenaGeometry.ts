import type { Grid } from '@elemental/combat-core';
import type { RenderConfig } from '../config/render.ts';
import { cellToScreen, depthOf, LAYER } from './iso.ts';

// Procedural arena geometry (docs/04 §8, ADR-011): one stacked block per height level. Pure.

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CellShape {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly depth: number;
  readonly top: readonly Point[];
  readonly left: readonly Point[];
  readonly right: readonly Point[];
  /** y of the seam between stacked levels (for outlines) */
  readonly levelSeams: readonly number[];
}

type Tile = Pick<RenderConfig, 'tileWidth' | 'tileHeight' | 'heightStep'>;

/** Top face + side faces of the column under cell (x, y); the column has height + 1 levels (base slab). */
export function cellShape(x: number, y: number, height: number, tile: Tile): CellShape {
  const { sx, sy } = cellToScreen({ x, y }, height, tile);
  const hw = tile.tileWidth / 2;
  const hh = tile.tileHeight / 2;
  const drop = (height + 1) * tile.heightStep;
  const top = [
    { x: sx, y: sy - hh },
    { x: sx + hw, y: sy },
    { x: sx, y: sy + hh },
    { x: sx - hw, y: sy },
  ];
  const left = [
    { x: sx - hw, y: sy },
    { x: sx, y: sy + hh },
    { x: sx, y: sy + hh + drop },
    { x: sx - hw, y: sy + drop },
  ];
  const right = [
    { x: sx, y: sy + hh },
    { x: sx + hw, y: sy },
    { x: sx + hw, y: sy + drop },
    { x: sx, y: sy + hh + drop },
  ];
  const levelSeams = Array.from({ length: height }, (_, i) => (i + 1) * tile.heightStep);
  return {
    x,
    y,
    height,
    depth: depthOf({ x, y }, height, LAYER.ground),
    top,
    left,
    right,
    levelSeams,
  };
}

/** Every cell of the grid, in draw order (back to front). */
export function arenaShapes(grid: Grid, tile: Tile): CellShape[] {
  const shapes: CellShape[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y * grid.width + x];
      if (cell) shapes.push(cellShape(x, y, cell.height, tile));
    }
  }
  return shapes.sort((a, b) => a.depth - b.depth);
}

export const maxHeightOf = (grid: Grid): number =>
  grid.cells.reduce((m, c) => Math.max(m, c.height), 0);
