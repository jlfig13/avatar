import { describe, expect, it } from 'vitest';
import { findTiledMap } from '../src/game/tiledMap.ts';

const reply = (status: number, body: string) =>
  (async () => new Response(body, { status })) as unknown as typeof fetch;

describe('optional Tiled map', () => {
  it('ignores a missing file, an HTML fallback page and non-map JSON', async () => {
    expect(await findTiledMap('x', reply(404, 'nope'))).toBeNull();
    expect(await findTiledMap('x', reply(200, '<!doctype html><html></html>'))).toBeNull();
    expect(await findTiledMap('x', reply(200, '{"hello":1}'))).toBeNull();
  });

  it('accepts a Tiled JSON map', async () => {
    const map = { orientation: 'isometric', layers: [], tilesets: [] };
    expect(await findTiledMap('x', reply(200, JSON.stringify(map)))).toEqual(map);
  });
});
