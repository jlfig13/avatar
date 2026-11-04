import { describe, expect, it } from 'vitest';
import { ANIMS, FACING_VIEW, frameAt, play } from '../src/characters/animation.ts';
import { ANCHOR, FRAME_H, FRAME_W } from '../src/characters/placeholders.ts';

describe('animation controller (CLI-05)', () => {
  it('loops idle and walk', () => {
    const walk = { anim: 'walk' as const, startedAt: 0 };
    expect(frameAt(walk, 0)).toEqual({ anim: 'walk', frame: 0 });
    expect(frameAt(walk, ANIMS.walk.frameMs * ANIMS.walk.frames)).toEqual({
      anim: 'walk',
      frame: 0,
    });
    expect(frameAt(walk, ANIMS.walk.frameMs * 2)).toEqual({ anim: 'walk', frame: 2 });
  });

  it('cast and hit play once and return to idle; defeat holds its last frame', () => {
    const castEnd = ANIMS.cast.frames * ANIMS.cast.frameMs;
    expect(frameAt({ anim: 'cast', startedAt: 0 }, castEnd - 1).anim).toBe('cast');
    expect(frameAt({ anim: 'cast', startedAt: 0 }, castEnd).anim).toBe('idle');
    expect(frameAt({ anim: 'hit', startedAt: 0 }, 10_000).anim).toBe('idle');
    expect(frameAt({ anim: 'defeat', startedAt: 0 }, 10_000)).toEqual({
      anim: 'defeat',
      frame: ANIMS.defeat.frames - 1,
    });
  });

  it('defeat is final; replaying a loop keeps its phase; one-shots restart', () => {
    const defeated = play(null, 'defeat', 0);
    expect(play(defeated, 'idle', 500)).toBe(defeated);
    const walking = play(null, 'walk', 100);
    expect(play(walking, 'walk', 900)).toBe(walking);
    expect(play(play(null, 'hit', 0), 'hit', 300)).toEqual({ anim: 'hit', startedAt: 300 });
  });

  it('maps N/E/S/W to the screen diagonals of docs/10 §4 (S and W mirror E and N)', () => {
    expect(FACING_VIEW.E).toEqual({ view: 'front', flipX: false, screen: { dx: 1, dy: 1 } });
    expect(FACING_VIEW.S).toEqual({ view: 'front', flipX: true, screen: { dx: -1, dy: 1 } });
    expect(FACING_VIEW.N).toEqual({ view: 'back', flipX: false, screen: { dx: 1, dy: -1 } });
    expect(FACING_VIEW.W).toEqual({ view: 'back', flipX: true, screen: { dx: -1, dy: -1 } });
  });

  it('uses the sprite contract: 64 × 96 frame, feet anchor (32, 90) → origin (0.5, 90/96)', () => {
    expect([FRAME_W, FRAME_H]).toEqual([64, 96]);
    expect([ANCHOR.x / FRAME_W, ANCHOR.y / FRAME_H]).toEqual([0.5, 90 / 96]);
  });
});
