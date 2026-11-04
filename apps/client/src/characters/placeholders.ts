import { ANIMS, type AnimName, type DrawnView } from './animation.ts';

// Temporary shapes drawn in code (CLI-05, ADR-011): a column + head for humans, a flattened block
// for monsters. Frames follow the sprite contract of docs/10 §3: 64 × 96 canvas, feet at (32, 90).

export const FRAME_W = 64;
export const FRAME_H = 96;
export const ANCHOR = { x: 32, y: 90 } as const;

export type BodyKind = 'human' | 'monster';

export interface Palette {
  readonly body: string;
  readonly dark: string;
  readonly light: string;
}

type Ctx = CanvasRenderingContext2D;

function poly(ctx: Ctx, points: [number, number][], fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (const [i, [x, y]] of points.entries()) {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function shadow(ctx: Ctx, ox: number, rx: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(ox + ANCHOR.x, ANCHOR.y, rx, rx / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function human(ctx: Ctx, ox: number, view: DrawnView, anim: AnimName, frame: number, p: Palette) {
  const fx = ox + ANCHOR.x;
  if (anim === 'defeat') {
    // collapse: the column tilts and ends lying on the ground
    const lie = frame / (ANIMS.defeat.frames - 1);
    shadow(ctx, ox, 14);
    const h = 44 - lie * 30;
    poly(
      ctx,
      [
        [fx - 8, ANCHOR.y],
        [fx + 8 + lie * 14, ANCHOR.y - 2],
        [fx + 8 + lie * 18, ANCHOR.y - h],
        [fx - 8 + lie * 18, ANCHOR.y - h + 2],
      ],
      p.dark,
    );
    return;
  }
  shadow(ctx, ox, 12);
  const step = anim === 'walk' ? ([0, 3, 0, -3][frame] ?? 0) : 0;
  const bob = anim === 'idle' ? frame : 0;
  const lean = anim === 'hit' ? (frame === 0 ? -4 : -2) : 0;
  // legs
  ctx.fillStyle = p.dark;
  ctx.fillRect(fx - 7 + lean, ANCHOR.y - 18 + Math.max(0, step), 5, 18 - Math.max(0, step));
  ctx.fillRect(fx + 2 + lean, ANCHOR.y - 18 + Math.max(0, -step), 5, 18 - Math.max(0, -step));
  // torso: lit side faces the camera on the front view
  const top = ANCHOR.y - 50 + bob;
  poly(
    ctx,
    [
      [fx - 10 + lean, top + 4],
      [fx + 10 + lean, top + 4],
      [fx + 9 + lean, ANCHOR.y - 16],
      [fx - 9 + lean, ANCHOR.y - 16],
    ],
    view === 'front' ? p.body : p.dark,
  );
  poly(
    ctx,
    [
      [fx + 2 + lean, top + 4],
      [fx + 10 + lean, top + 4],
      [fx + 9 + lean, ANCHOR.y - 16],
      [fx + 3 + lean, ANCHOR.y - 16],
    ],
    view === 'front' ? p.light : p.body,
  );
  // head (diamond)
  const hy = top - 6;
  poly(
    ctx,
    [
      [fx + lean, hy - 9],
      [fx + 8 + lean, hy],
      [fx + lean, hy + 9],
      [fx - 8 + lean, hy],
    ],
    p.light,
  );
  if (view === 'front') {
    // eyes look toward the screen-right diagonal (E); S is the mirror
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(fx + 1 + lean, hy - 1, 2, 2);
    ctx.fillRect(fx + 4 + lean, hy, 2, 2);
  }
  // cast: raised arm with a glow growing per frame
  if (anim === 'cast') {
    ctx.fillStyle = p.body;
    ctx.fillRect(fx + 10, top - 6 - frame * 3, 4, 16);
    ctx.fillStyle = `rgba(255,255,210,${0.35 + frame * 0.2})`;
    ctx.beginPath();
    ctx.arc(fx + 12, top - 10 - frame * 3, 4 + frame * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (anim === 'hit' && frame === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(fx - 12 + lean, top - 16, 24, ANCHOR.y - top + 16);
  }
}

function monster(ctx: Ctx, ox: number, view: DrawnView, anim: AnimName, frame: number, p: Palette) {
  const fx = ox + ANCHOR.x;
  const squash = anim === 'defeat' ? frame * 5 : anim === 'idle' ? frame : 0;
  const lunge = anim === 'cast' ? frame * 3 : 0;
  const recoil = anim === 'hit' ? (frame === 0 ? -4 : -2) : 0;
  const dx = lunge + recoil;
  shadow(ctx, ox, 22);
  const h = 22 - squash;
  // flattened block: top face + two sides, isometric like the arena blocks
  poly(
    ctx,
    [
      [fx - 22 + dx, ANCHOR.y - 8],
      [fx + dx, ANCHOR.y + 3],
      [fx + dx, ANCHOR.y + 3 - h],
      [fx - 22 + dx, ANCHOR.y - 8 - h],
    ],
    view === 'front' ? p.body : p.dark,
  );
  poly(
    ctx,
    [
      [fx + dx, ANCHOR.y + 3],
      [fx + 22 + dx, ANCHOR.y - 8],
      [fx + 22 + dx, ANCHOR.y - 8 - h],
      [fx + dx, ANCHOR.y + 3 - h],
    ],
    view === 'front' ? p.light : p.body,
  );
  poly(
    ctx,
    [
      [fx + dx, ANCHOR.y + 3 - h],
      [fx + 22 + dx, ANCHOR.y - 8 - h],
      [fx + dx, ANCHOR.y - 19 - h],
      [fx - 22 + dx, ANCHOR.y - 8 - h],
    ],
    p.light,
  );
  if (view === 'front' && anim !== 'defeat') {
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(fx + 8 + dx, ANCHOR.y - 8 - h / 2, 3, 3);
    ctx.fillRect(fx + 15 + dx, ANCHOR.y - 11 - h / 2, 3, 3);
  }
  if (anim === 'hit' && frame === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(fx - 24 + dx, ANCHOR.y - 44, 48, 48);
  }
}

/** Draws every frame of one animation × view side by side (a strip of FRAME_W × FRAME_H frames). */
export function drawStrip(
  ctx: Ctx,
  kind: BodyKind,
  view: DrawnView,
  anim: AnimName,
  palette: Palette,
): number {
  const frames = ANIMS[anim].frames;
  for (let i = 0; i < frames; i++)
    (kind === 'human' ? human : monster)(ctx, i * FRAME_W, view, anim, i, palette);
  return frames;
}
