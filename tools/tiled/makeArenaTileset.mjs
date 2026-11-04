// Generates the placeholder isometric tileset used to paint arenas in Tiled (ART-02).
// Output: assets-src/07_MAPS/tilesets/arena_placeholder.png (11 tiles of 64x32, one row).
// Usage: node tools/tiled/makeArenaTileset.mjs
// Tile ids and their properties are defined in arena_placeholder.tsj next to the image.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const TW = 64;
const TH = 32;
// id order must match arena_placeholder.tsj
const TILES = [
  { color: [139, 168, 98], glyph: 'G' }, // 0 terrain ground
  { color: [130, 130, 138], glyph: 'R' }, // 1 terrain rock
  { color: [86, 148, 206], glyph: 'W' }, // 2 terrain shallow_water
  { color: [62, 112, 58], glyph: 'V' }, // 3 terrain vegetation
  { color: [236, 236, 236], glyph: '0' }, // 4 height 0
  { color: [214, 206, 170], glyph: '1' }, // 5 height 1
  { color: [196, 168, 110], glyph: '2' }, // 6 height 2
  { color: [170, 120, 72], glyph: '3' }, // 7 height 3
  { color: [200, 60, 60], glyph: 'X' }, // 8 blocked
  { color: [70, 130, 220], glyph: 'P' }, // 9 spawn players
  { color: [220, 90, 60], glyph: 'E' }, // 10 spawn enemies
];
// 3x5 bitmap font
const FONT = {
  G: ['111', '100', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  W: ['101', '101', '101', '111', '101'],
  V: ['101', '101', '101', '101', '010'],
  X: ['101', '101', '010', '101', '101'],
  P: ['110', '101', '110', '100', '100'],
  E: ['111', '100', '110', '100', '111'],
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
};

const width = TW * TILES.length;
const px = new Uint8Array(width * TH * 4);
const put = (x, y, c, a = 255) => {
  const i = (y * width + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = a;
};
TILES.forEach((t, n) => {
  const ox = n * TW;
  for (let y = 0; y < TH; y++)
    for (let x = 0; x < TW; x++) {
      const d = Math.abs(x + 0.5 - TW / 2) / (TW / 2) + Math.abs(y + 0.5 - TH / 2) / (TH / 2);
      if (d > 1) continue;
      const edge = d > 0.9;
      put(ox + x, y, edge ? t.color.map((v) => Math.round(v * 0.55)) : t.color);
    }
  const g = FONT[t.glyph];
  const ink = t.glyph >= '0' && t.glyph <= '3' ? [40, 30, 20] : [255, 255, 255];
  for (let gy = 0; gy < 5; gy++)
    for (let gx = 0; gx < 3; gx++)
      if (g[gy][gx] === '1')
        for (let sy = 0; sy < 2; sy++)
          for (let sx = 0; sx < 2; sx++) put(ox + 29 + gx * 2 + sx, 11 + gy * 2 + sy, ink);
});

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const raw = Buffer.alloc((width * 4 + 1) * TH);
for (let y = 0; y < TH; y++)
  Buffer.from(px.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(TH, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'assets-src', '07_MAPS', 'tilesets', 'arena_placeholder.png');
writeFileSync(out, png);
console.log(`wrote ${out} (${width}x${TH}, ${TILES.length} tiles)`);
