import * as Phaser from 'phaser';
import { RENDER } from '../config/render.ts';
import { type ClientStore, watch } from '../store/store.ts';
import { CameraController } from './cameraController.ts';
import { cellToScreen, gridBounds } from './iso.ts';

const SIZE = 10;

/** Flat 10 × 10 isometric grid (CLI-02); the store colour still tints it (CLI-01 smoke test). */
export class ArenaScene extends Phaser.Scene {
  private readonly store: ClientStore;
  private grid: Phaser.GameObjects.Graphics | null = null;
  private color = 0xffffff;

  constructor(store: ClientStore) {
    super('arena');
    this.store = store;
  }

  create() {
    this.grid = this.add.graphics();
    const camera = new CameraController(this, gridBounds(SIZE, SIZE, 0, RENDER));
    const unwatch = watch(
      this.store,
      (s) => s.diamondColor,
      (color) => {
        this.color = color;
        this.draw();
      },
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unwatch();
      camera.destroy();
    });
  }

  private draw() {
    const g = this.grid;
    if (!g) return;
    g.clear();
    const hw = RENDER.tileWidth / 2;
    const hh = RENDER.tileHeight / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const { sx, sy } = cellToScreen({ x, y }, 0, RENDER);
        const points = [
          new Phaser.Math.Vector2(sx, sy - hh),
          new Phaser.Math.Vector2(sx + hw, sy),
          new Phaser.Math.Vector2(sx, sy + hh),
          new Phaser.Math.Vector2(sx - hw, sy),
        ];
        g.fillStyle(
          (x + y) % 2 === 0
            ? this.color
            : Phaser.Display.Color.ValueToColor(this.color).darken(15).color,
          1,
        );
        g.fillPoints(points, true);
      }
    }
  }
}
