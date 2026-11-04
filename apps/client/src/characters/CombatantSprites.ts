import type { BattleState, Combatant, Grid } from '@elemental/combat-core';
import * as Phaser from 'phaser';
import { RENDER } from '../config/render.ts';
import { cellToScreen, depthOf, LAYER } from '../game/iso.ts';
import { ANIMS, type AnimName, type AnimState, FACING_VIEW, frameAt, play } from './animation.ts';
import {
  ANCHOR,
  type BodyKind,
  drawStrip,
  FRAME_H,
  FRAME_W,
  type Palette,
} from './placeholders.ts';

const VIEWS = ['front', 'back'] as const;
const ANIM_NAMES = Object.keys(ANIMS) as AnimName[];

const bodyKind = (c: Combatant): BodyKind => (c.name.startsWith('monster.') ? 'monster' : 'human');
const paletteId = (c: Combatant) =>
  bodyKind(c) === 'monster' ? 'monster' : (c.element ?? 'neutral');

interface View {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly facing: Phaser.GameObjects.Graphics;
  anim: AnimState;
  lastKey: string;
}

/**
 * CLI-05 — combatants drawn as sprites anchored at the feet (docs/10 §3, ADR-025:
 * setOrigin(0.5, 90/96)). Until real atlases exist (ART-01/ART-04) the frames are placeholders
 * generated in code with the same 64 × 96 contract, so swapping in Aseprite sheets only changes
 * where the textures come from.
 */
export class CombatantSprites {
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly views = new Map<string, View>();

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
  }

  private textureKey(kind: BodyKind, palette: string, view: string, anim: AnimName) {
    return `ph_${kind}_${palette}_${view}_${anim}`;
  }

  private ensureTextures(kind: BodyKind, palette: string) {
    const colors: Palette = RENDER.characterPalettes[palette] ?? RENDER.characterPalettes.neutral;
    for (const view of VIEWS) {
      for (const anim of ANIM_NAMES) {
        const key = this.textureKey(kind, palette, view, anim);
        if (this.scene.textures.exists(key)) continue;
        const frames = ANIMS[anim].frames;
        const texture = this.scene.textures.createCanvas(key, FRAME_W * frames, FRAME_H);
        if (!texture) continue;
        drawStrip(texture.getContext(), kind, view, anim, colors);
        for (let i = 0; i < frames; i++) texture.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
        texture.refresh();
      }
    }
  }

  private heightAt(x: number, y: number) {
    return this.grid.cells[y * this.grid.width + x]?.height ?? 0;
  }

  /** Places every combatant on its cell, facing its direction; defeated ones play `defeat`. */
  sync(state: BattleState | null) {
    const now = this.scene.time.now;
    const seen = new Set<string>();
    for (const c of state?.combatants ?? []) {
      if (c.fled) continue;
      seen.add(c.id);
      const kind = bodyKind(c);
      const palette = paletteId(c);
      this.ensureTextures(kind, palette);
      let view = this.views.get(c.id);
      if (!view) {
        const sprite = this.scene.add.sprite(
          0,
          0,
          this.textureKey(kind, palette, 'front', 'idle'),
          0,
        );
        sprite.setOrigin(ANCHOR.x / FRAME_W, ANCHOR.y / FRAME_H);
        view = {
          sprite,
          facing: this.scene.add.graphics(),
          anim: { anim: 'idle', startedAt: now },
          lastKey: '',
        };
        this.views.set(c.id, view);
      }
      const h = this.heightAt(c.position.x, c.position.y);
      const { sx, sy } = cellToScreen(c.position, h, RENDER);
      view.sprite
        .setPosition(sx, sy)
        .setDepth(depthOf(c.position, h, LAYER.character))
        .setData('facing', c.facing);
      view.sprite.setData('kind', kind).setData('palette', palette);
      this.drawFacing(view.facing, sx, sy, c);
      view.facing.setDepth(depthOf(c.position, h, LAYER.object));
      if (!c.alive) view.anim = play(view.anim, 'defeat', now);
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.sprite.destroy();
        view.facing.destroy();
        this.views.delete(id);
      }
    }
  }

  /** Starts an animation on one combatant (used by the event queue, CLI-07). */
  play(id: string, anim: AnimName) {
    const view = this.views.get(id);
    if (view) view.anim = play(view.anim, anim, this.scene.time.now);
  }

  current(id: string): AnimName | null {
    const view = this.views.get(id);
    return view ? frameAt(view.anim, this.scene.time.now).anim : null;
  }

  /** A small wedge at the feet pointing to the facing's screen diagonal. */
  private drawFacing(g: Phaser.GameObjects.Graphics, sx: number, sy: number, c: Combatant) {
    const { dx, dy } = FACING_VIEW[c.facing].screen;
    const tip = { x: sx + dx * 22, y: sy + dy * 11 };
    const side = { x: -dy * 5, y: dx * 2.5 };
    g.clear();
    if (!c.alive) return;
    g.fillStyle(0xffffff, 0.85);
    g.fillTriangle(
      tip.x,
      tip.y,
      sx + dx * 12 + side.x,
      sy + dy * 6 + side.y,
      sx + dx * 12 - side.x,
      sy + dy * 6 - side.y,
    );
  }

  private tick() {
    const now = this.scene.time.now;
    for (const view of this.views.values()) {
      const facing = view.sprite.getData('facing') as keyof typeof FACING_VIEW;
      const map = FACING_VIEW[facing] ?? FACING_VIEW.S;
      const { anim, frame } = frameAt(view.anim, now);
      const key = this.textureKey(
        view.sprite.getData('kind') as BodyKind,
        view.sprite.getData('palette') as string,
        map.view,
        anim,
      );
      const frameKey = `${key}:${frame}`;
      if (frameKey !== view.lastKey) {
        view.sprite.setTexture(key, frame);
        view.lastKey = frameKey;
      }
      view.sprite.setFlipX(map.flipX);
    }
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
  }
}
