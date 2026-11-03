import type { GridFile } from '@elemental/shared';
import { describe, expect, it } from 'vitest';
import { gameData } from '../src/index.ts';

// docs/05 §3 — requirements of the slice 1 test arena.
const arena = gameData.maps['test-arena'] as GridFile;
const terrainAt = (x: number, y: number) => arena.legend[arena.terrain[y]?.[x] ?? ''];
const heightAt = (x: number, y: number) => arena.heights[y]?.[x] ?? -1;
const blockedAt = (x: number, y: number) => arena.blocked[y]?.[x] === 1;

describe('test-arena', () => {
  it('is 10 × 10', () => {
    expect([arena.width, arena.height]).toEqual([10, 10]);
  });

  it('has heights 0, 1, 2 and a plateau at 3', () => {
    const heights = new Set(arena.heights.flat());
    for (const h of [0, 1, 2, 3]) expect(heights.has(h)).toBe(true);
    expect(arena.heights.flat().filter((h) => h === 3).length).toBeGreaterThanOrEqual(2);
  });

  it('has a 2-cell-wide shallow-water river crossing the whole map', () => {
    for (let y = 0; y < arena.height; y++) {
      const row = Array.from({ length: arena.width }, (_, x) => terrainAt(x, y));
      const pairs = row.some((t, x) => t === 'shallow_water' && row[x + 1] === 'shallow_water');
      expect(pairs, `row ${y}`).toBe(true);
    }
  });

  it('has a grove of at least 6 vegetation cells', () => {
    expect(
      arena.terrain.flat().filter((s) => arena.legend[s] === 'vegetation').length,
    ).toBeGreaterThanOrEqual(6);
  });

  it('has 2–3 blocked rocks', () => {
    let rocks = 0;
    for (let y = 0; y < arena.height; y++) {
      for (let x = 0; x < arena.width; x++) {
        if (blockedAt(x, y)) {
          expect(terrainAt(x, y)).toBe('rock');
          rocks++;
        }
      }
    }
    expect(rocks).toBeGreaterThanOrEqual(2);
    expect(rocks).toBeLessThanOrEqual(3);
  });

  it('plateau (height 3) is reachable from ground level by steps of 1', () => {
    const start = arena.spawns.players[0] ?? { x: 0, y: 0 };
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    let reachedPlateau = false;
    while (queue.length > 0) {
      const cur = queue.shift() as { x: number; y: number };
      if (heightAt(cur.x, cur.y) === 3) reachedPlateau = true;
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const x = cur.x + dx;
        const y = cur.y + dy;
        const key = `${x},${y}`;
        if (x < 0 || y < 0 || x >= arena.width || y >= arena.height || seen.has(key)) continue;
        if (blockedAt(x, y) || Math.abs(heightAt(x, y) - heightAt(cur.x, cur.y)) > 1) continue;
        seen.add(key);
        queue.push({ x, y });
      }
    }
    expect(reachedPlateau).toBe(true);
  });

  it('has spawns for 1 player and up to 2 enemies', () => {
    expect(arena.spawns.players).toHaveLength(1);
    expect(arena.spawns.enemies).toHaveLength(2);
  });
});
