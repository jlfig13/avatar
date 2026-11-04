import type { RenderConfig } from '../config/render.ts';

// docs/04 §8 — isometric 2:1 projection. Pure functions (unit tested).

export interface Cell {
  readonly x: number;
  readonly y: number;
}
export interface ScreenPoint {
  readonly sx: number;
  readonly sy: number;
}

type Tile = Pick<RenderConfig, 'tileWidth' | 'tileHeight' | 'heightStep'>;

/** Centre of the top face of cell (x, y) standing at height h. */
export function cellToScreen(cell: Cell, h: number, tile: Tile): ScreenPoint {
  return {
    sx: ((cell.x - cell.y) * tile.tileWidth) / 2,
    sy: ((cell.x + cell.y) * tile.tileHeight) / 2 - h * tile.heightStep,
  };
}

/** Cell whose top face at height h contains the point (no bounds check). */
export function screenToCellAtHeight(point: ScreenPoint, h: number, tile: Tile): Cell {
  const v = (point.sy + h * tile.heightStep) / tile.tileHeight;
  const u = point.sx / tile.tileWidth;
  // `+ 0` normalizes -0 to 0.
  return { x: Math.round(v + u) + 0, y: Math.round(v - u) + 0 };
}

/**
 * Picking with heights: tries every height (highest first, docs/04 §8) and keeps the candidate
 * whose top face is drawn in front (largest depth), which is the one the player actually sees.
 */
export function screenToCell(
  point: ScreenPoint,
  grid: { readonly width: number; readonly height: number },
  heightAt: (cell: Cell) => number,
  maxHeight: number,
  tile: Tile,
): Cell | null {
  let best: Cell | null = null;
  let bestDepth = Number.NEGATIVE_INFINITY;
  for (let h = maxHeight; h >= 0; h--) {
    const cell = screenToCellAtHeight(point, h, tile);
    if (cell.x < 0 || cell.y < 0 || cell.x >= grid.width || cell.y >= grid.height) continue;
    if (heightAt(cell) !== h) continue;
    const depth = depthOf(cell, h, 0);
    if (depth > bestDepth) {
      best = cell;
      bestDepth = depth;
    }
  }
  return best;
}

/** Layers drawn inside one cell, back to front. */
export const LAYER = { ground: 0, object: 1, character: 2, overlay: 3 } as const;

/** docs/04 §8 — draw order: (x + y), then height, then layer. */
export function depthOf(cell: Cell, h: number, layer: number): number {
  return ((cell.x + cell.y) * 16 + h) * 4 + layer;
}

/** Screen-space bounds of a width × height grid whose tallest column is maxHeight. */
export function gridBounds(width: number, height: number, maxHeight: number, tile: Tile) {
  const halfW = tile.tileWidth / 2;
  const halfH = tile.tileHeight / 2;
  return {
    left: -(height - 1) * halfW - halfW,
    right: (width - 1) * halfW + halfW,
    top: -halfH - maxHeight * tile.heightStep,
    bottom: (width + height - 2) * halfH + halfH + maxHeight * tile.heightStep,
  };
}
