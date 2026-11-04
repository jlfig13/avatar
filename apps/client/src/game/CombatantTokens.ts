import type { BattleState, Grid } from '@elemental/combat-core';
import * as Phaser from 'phaser';
import { RENDER } from '../config/render.ts';
import { cellToScreen, depthOf, LAYER } from './iso.ts';

/** Minimal placeholder tokens so targets are visible (replaced by CLI-05 placeholders/sprites). */
export class CombatantTokens {
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly tokens = new Map<string, Phaser.GameObjects.Ellipse>();

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;
  }

  render(state: BattleState | null) {
    const seen = new Set<string>();
    for (const c of state?.combatants ?? []) {
      if (!c.alive || c.fled) continue;
      seen.add(c.id);
      const h = this.grid.cells[c.position.y * this.grid.width + c.position.x]?.height ?? 0;
      const { sx, sy } = cellToScreen(c.position, h, RENDER);
      const token =
        this.tokens.get(c.id) ??
        this.scene.add.ellipse(
          0,
          0,
          28,
          40,
          Phaser.Display.Color.HexStringToColor(RENDER.combatantColors[c.team]).color,
        );
      this.tokens.set(c.id, token);
      token
        .setPosition(sx, sy - 16)
        .setDepth(depthOf(c.position, h, LAYER.character))
        .setStrokeStyle(2, 0x000000, 0.6);
    }
    for (const [id, token] of this.tokens) if (!seen.has(id)) token.setVisible(false);
  }
}
