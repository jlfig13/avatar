import type { GridFile } from '@elemental/shared';
import type { Cell, Facing, Grid, Position } from '../types.ts';

// docs/02 §3 — integer coordinates, origin top-left, x grows east, y grows south.

export const inBounds = (grid: Grid, pos: Position): boolean =>
  pos.x >= 0 && pos.y >= 0 && pos.x < grid.width && pos.y < grid.height;

export function getCell(grid: Grid, pos: Position): Cell | undefined {
  return inBounds(grid, pos) ? grid.cells[pos.y * grid.width + pos.x] : undefined;
}

export const DIRECTIONS: Readonly<Record<Facing, Position>> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export const step = (pos: Position, facing: Facing, cells = 1): Position => ({
  x: pos.x + DIRECTIONS[facing].x * cells,
  y: pos.y + DIRECTIONS[facing].y * cells,
});

/** 4-neighbourhood (no diagonals), only cells inside the grid. Order: N, E, S, W. */
export function neighbors4(grid: Grid, pos: Position): Position[] {
  return (['N', 'E', 'S', 'W'] as const).map((f) => step(pos, f)).filter((p) => inBounds(grid, p));
}

export const manhattan = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isBorder = (grid: Grid, x: number, y: number): boolean =>
  x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1;

/** docs/02 §2 — escape cells = every walkable cell on the outer border. */
function markEscape(grid: Grid): Grid {
  const cells = grid.cells.map((cell, i) => {
    const x = i % grid.width;
    const y = Math.floor(i / grid.width);
    const isEscape = isBorder(grid, x, y) && !cell.blocked;
    return cell.escape === isEscape ? cell : { ...cell, escape: isEscape };
  });
  return { ...grid, cells };
}

/** docs/05 §3 — converts a validated *.grid.json into the core Grid (matrices are [y][x]). */
export function gridFromFile(file: GridFile): Grid {
  const cells: Cell[] = [];
  for (let y = 0; y < file.height; y++) {
    for (let x = 0; x < file.width; x++) {
      const symbol = file.terrain[y]?.[x];
      const terrain = symbol === undefined ? undefined : file.legend[symbol];
      const height = file.heights[y]?.[x];
      if (terrain === undefined || height === undefined) {
        throw new Error(`gridFromFile(${file.id}): missing data at ${x},${y}`);
      }
      cells.push({ height, terrain, blocked: file.blocked[y]?.[x] === 1, escape: false });
    }
  }
  return markEscape({ width: file.width, height: file.height, cells });
}

/** Top-left corner of a size × size slice centred on `center`, shifted to fit inside the grid. */
export function sliceOrigin(grid: Grid, center: Position, size: number): Position {
  const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);
  const half = Math.floor(size / 2);
  return {
    x: clamp(center.x - half, grid.width - size),
    y: clamp(center.y - half, grid.height - size),
  };
}

/**
 * docs/04 §9 — cuts a size × size arena from the global grid. Copies heights, terrain and
 * blocked flags; temporary effects are not copied; escape cells are recomputed on the new border.
 * Coordinates of the result are local (0..size-1); use sliceOrigin to map back to the world.
 */
export function sliceArena(grid: Grid, center: Position, size: number): Grid {
  if (size < 1 || size > grid.width || size > grid.height) {
    throw new Error(`sliceArena: size ${size} does not fit in ${grid.width}x${grid.height}`);
  }
  const origin = sliceOrigin(grid, center, size);
  const cells: Cell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const source = getCell(grid, { x: origin.x + x, y: origin.y + y });
      if (!source) throw new Error('sliceArena: unreachable out-of-bounds cell');
      cells.push({
        height: source.height,
        terrain: source.terrain,
        blocked: source.blocked,
        escape: false,
      });
    }
  }
  return markEscape({ width: size, height: size, cells });
}
