import { describe, expect, it } from 'vitest';
import { RENDER } from '../src/config/render.ts';
import { clampCenter, fitZoom, wheelZoom } from '../src/game/camera.ts';
import { cellToScreen, depthOf, gridBounds, screenToCell } from '../src/game/iso.ts';

const tile = RENDER;

describe('isometric projection', () => {
  it('follows docs/04 §8: sx = (x − y)·W/2, sy = (x + y)·H/2 − h·D', () => {
    expect(cellToScreen({ x: 0, y: 0 }, 0, tile)).toEqual({ sx: 0, sy: 0 });
    expect(cellToScreen({ x: 3, y: 1 }, 2, tile)).toEqual({ sx: 64, sy: 64 - 32 });
  });

  it('projection and inverse agree for every cell of a 10 × 10 grid with 3 heights', () => {
    const heights = new Map<string, number>();
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++) heights.set(`${x},${y}`, (x * 7 + y * 3) % 3);
    const heightAt = (c: { x: number; y: number }) => heights.get(`${c.x},${c.y}`) ?? 0;
    const grid = { width: 10, height: 10 };
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const h = heightAt({ x, y });
        const centre = cellToScreen({ x, y }, h, tile);
        // points well inside the top face pick the same cell
        for (const [dx, dy] of [
          [-12, 0],
          [12, 0],
          [0, -6],
          [0, 6],
        ] as const) {
          const p = { sx: centre.sx + dx, sy: centre.sy + dy };
          const picked = screenToCell(p, grid, heightAt, 2, tile);
          // a taller neighbour in front may cover the point; otherwise it must be the same cell
          if (picked && (picked.x !== x || picked.y !== y)) {
            expect(depthOf(picked, heightAt(picked), 0)).toBeGreaterThan(depthOf({ x, y }, h, 0));
          } else {
            expect(picked).toEqual({ x, y });
          }
        }
      }
    }
  });

  it('on a flat grid every centre and inner point maps back to its own cell', () => {
    const grid = { width: 10, height: 10 };
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const c = cellToScreen({ x, y }, 0, tile);
        for (const [dx, dy] of [
          [0, 0],
          [-20, 0],
          [20, 0],
          [0, -10],
          [0, 10],
        ] as const) {
          expect(screenToCell({ sx: c.sx + dx, sy: c.sy + dy }, grid, () => 0, 2, tile)).toEqual({
            x,
            y,
          });
        }
      }
    }
  });

  it('returns null outside the grid', () => {
    expect(
      screenToCell({ sx: -5000, sy: 0 }, { width: 10, height: 10 }, () => 0, 2, tile),
    ).toBeNull();
  });

  it('a raised block in front hides the lower cell behind it', () => {
    // (1,1) at height 2 is drawn in front of (0,0)… pick the point of (0,0) that (1,1) covers
    const heightAt = (c: { x: number; y: number }) => (c.x === 1 && c.y === 1 ? 2 : 0);
    const top = cellToScreen({ x: 1, y: 1 }, 2, tile);
    expect(screenToCell(top, { width: 3, height: 3 }, heightAt, 2, tile)).toEqual({ x: 1, y: 1 });
  });

  it('depth orders by (x + y), then height, then layer', () => {
    expect(depthOf({ x: 1, y: 1 }, 0, 0)).toBeGreaterThan(depthOf({ x: 0, y: 1 }, 8, 3));
    expect(depthOf({ x: 1, y: 1 }, 1, 0)).toBeGreaterThan(depthOf({ x: 2, y: 0 }, 0, 3));
    expect(depthOf({ x: 1, y: 1 }, 1, 2)).toBeGreaterThan(depthOf({ x: 1, y: 1 }, 1, 1));
  });
});

describe('camera', () => {
  const bounds = gridBounds(10, 10, 3, tile);

  it('the whole 10 × 10 arena fits at the default zoom on 1366 × 768', () => {
    const zoom = fitZoom(bounds, { width: 1366, height: 768 }, RENDER.zoom);
    expect(zoom).toBeGreaterThanOrEqual(1);
    expect((bounds.right - bounds.left) * zoom).toBeLessThanOrEqual(1366);
    expect((bounds.bottom - bounds.top) * zoom).toBeLessThanOrEqual(768);
  });

  it('zooms in integer steps within limits and clamps the pan', () => {
    expect(wheelZoom(1, -100, RENDER.zoom)).toBe(2);
    expect(wheelZoom(4, -100, RENDER.zoom)).toBe(4);
    expect(wheelZoom(1, 100, RENDER.zoom)).toBe(1);
    expect(clampCenter(99999, -99999, bounds)).toEqual({ x: bounds.right, y: bounds.top });
  });
});
