import * as Phaser from 'phaser';
import { type ClientStore, watch } from '../store/store.ts';

/** CLI-01 placeholder scene: one isometric diamond whose color comes from the store. */
export class ArenaScene extends Phaser.Scene {
  private readonly store: ClientStore;
  private diamond: Phaser.GameObjects.Graphics | null = null;
  private color = 0xffffff;

  constructor(store: ClientStore) {
    super('arena');
    this.store = store;
  }

  create() {
    this.diamond = this.add.graphics();
    const unwatch = watch(
      this.store,
      (s) => s.diamondColor,
      (color) => {
        this.color = color;
        this.draw();
      },
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unwatch();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.draw, this);
    });
  }

  private draw() {
    if (!this.diamond) return;
    const { width, height } = this.scale.gameSize;
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    this.diamond.clear();
    this.diamond.fillStyle(this.color, 1);
    this.diamond.fillPoints(
      [
        new Phaser.Math.Vector2(cx, cy - 32),
        new Phaser.Math.Vector2(cx + 64, cy),
        new Phaser.Math.Vector2(cx, cy + 32),
        new Phaser.Math.Vector2(cx - 64, cy),
      ],
      true,
    );
  }
}
