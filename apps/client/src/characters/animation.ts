import type { Facing } from '@elemental/combat-core';

// CLI-05 — animation state and direction mapping. Pure (unit tested); Phaser only plays the result.

export type AnimName = 'idle' | 'walk' | 'cast' | 'hit' | 'defeat';

export interface AnimSpec {
  readonly frames: number;
  readonly frameMs: number;
  readonly loop: boolean;
}

/** Placeholder timings; real sprites take theirs from the atlas manifest (docs/10 §11). */
export const ANIMS: Readonly<Record<AnimName, AnimSpec>> = {
  idle: { frames: 2, frameMs: 400, loop: true },
  walk: { frames: 4, frameMs: 120, loop: true },
  cast: { frames: 3, frameMs: 140, loop: false },
  hit: { frames: 2, frameMs: 120, loop: false },
  defeat: { frames: 3, frameMs: 180, loop: false },
};

export type DrawnView = 'front' | 'back';

/**
 * docs/10 §4 — logical facing → screen diagonal. E and N are drawn (front 3/4, back 3/4);
 * S and W mirror them horizontally.
 */
export const FACING_VIEW: Readonly<
  Record<Facing, { view: DrawnView; flipX: boolean; screen: { dx: number; dy: number } }>
> = {
  E: { view: 'front', flipX: false, screen: { dx: 1, dy: 1 } },
  S: { view: 'front', flipX: true, screen: { dx: -1, dy: 1 } },
  N: { view: 'back', flipX: false, screen: { dx: 1, dy: -1 } },
  W: { view: 'back', flipX: true, screen: { dx: -1, dy: -1 } },
};

export interface AnimState {
  readonly anim: AnimName;
  readonly startedAt: number;
}

/** One-shot animations (cast, hit) return to idle when they end; defeat holds its last frame. */
export function frameAt(state: AnimState, now: number): { anim: AnimName; frame: number } {
  const spec = ANIMS[state.anim];
  const elapsed = Math.max(0, now - state.startedAt);
  const index = Math.floor(elapsed / spec.frameMs);
  if (spec.loop) return { anim: state.anim, frame: index % spec.frames };
  if (index < spec.frames) return { anim: state.anim, frame: index };
  if (state.anim === 'defeat') return { anim: 'defeat', frame: spec.frames - 1 };
  const idle = ANIMS.idle;
  const after = elapsed - spec.frames * spec.frameMs;
  return { anim: 'idle', frame: Math.floor(after / idle.frameMs) % idle.frames };
}

/** Starting an animation: defeat is final; restarting the same looping animation keeps its phase. */
export function play(current: AnimState | null, anim: AnimName, now: number): AnimState {
  if (current?.anim === 'defeat') return current;
  if (current && current.anim === anim && ANIMS[anim].loop) return current;
  return { anim, startedAt: now };
}
