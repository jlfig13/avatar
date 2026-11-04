/**
 * Looks for the optional Tiled map. Dev servers answer unknown paths with index.html (200),
 * so only a response that parses as a Tiled JSON map counts.
 */
export async function findTiledMap(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<object | null> {
  try {
    const response = await fetcher(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const text = await response.text();
    const data: unknown = JSON.parse(text);
    const isMap =
      typeof data === 'object' && data !== null && 'layers' in data && 'tilesets' in data;
    return isMap ? data : null;
  } catch {
    return null;
  }
}

export const TILED_ARENA_URL = 'assets/maps/test-arena.tmj';
