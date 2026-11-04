import type { Grid } from '@elemental/combat-core';
import * as Phaser from 'phaser';
import { RENDER } from '../config/render.ts';
import { cellShape } from './arenaGeometry.ts';
import { depthOf, LAYER } from './iso.ts';
import { type Overlay, parseKey } from './overlay.ts';

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

/**
 * One Graphics per cell, at the cell's own depth (overlay layer), so taller blocks in front still
 * cover the highlight correctly.
 */
export class OverlayLayer {
  private readonly graphics = new Map<string, Phaser.GameObjects.Graphics>();
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;
  }

  render(overlay: Overlay) {
    for (const [k, g] of this.graphics) {
      if (!overlay.cells.has(k)) g.clear().setVisible(false);
    }
    for (const [k, kind] of overlay.cells) {
      const { x, y } = parseKey(k);
      const h = this.grid.cells[y * this.grid.width + x]?.height ?? 0;
      const g =
        this.graphics.get(k) ??
        this.scene.add.graphics().setDepth(depthOf({ x, y }, h, LAYER.overlay));
      this.graphics.set(k, g);
      const style = RENDER.highlight[kind];
      const top = cellShape(x, y, h, RENDER).top.map((p) => new Phaser.Math.Vector2(p.x, p.y));
      g.clear().setVisible(true);
      g.fillStyle(color(style.fill), style.alpha).fillPoints(top, true);
      g.lineStyle(kind === 'noLineOfSight' ? 1 : 2, color(style.line), 0.9).strokePoints(top, true);
      if (kind === 'noLineOfSight') {
        // diagonal hatch so "no line of sight" reads even without colour
        const [t, r, b, l] = top;
        if (t && r && b && l) {
          g.lineBetween((t.x + l.x) / 2, (t.y + l.y) / 2, (r.x + b.x) / 2, (r.y + b.y) / 2);
          g.lineBetween(t.x, t.y, b.x, b.y);
        }
      }
    }
  }
}
