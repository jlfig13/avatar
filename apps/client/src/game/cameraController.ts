import * as Phaser from 'phaser';
import { RENDER } from '../config/render.ts';
import { type Bounds, clampCenter, fitZoom, wheelZoom } from './camera.ts';

/** Integer zoom with the mouse wheel; pan by dragging with the right or middle button. */
export class CameraController {
  private readonly scene: Phaser.Scene;
  private bounds: Bounds;
  private drag: { x: number; y: number; sx: number; sy: number } | null = null;

  constructor(scene: Phaser.Scene, bounds: Bounds) {
    this.scene = scene;
    this.bounds = bounds;
    const input = scene.input;
    input.mouse?.disableContextMenu();
    input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        this.camera.setZoom(wheelZoom(this.camera.zoom, dy, RENDER.zoom));
      },
    );
    input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown() || p.middleButtonDown()) {
        this.drag = { x: p.x, y: p.y, sx: this.camera.midPoint.x, sy: this.camera.midPoint.y };
      }
    });
    input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!this.drag) return;
      const zoom = this.camera.zoom;
      const target = clampCenter(
        this.drag.sx - (p.x - this.drag.x) / zoom,
        this.drag.sy - (p.y - this.drag.y) / zoom,
        this.bounds,
      );
      this.camera.centerOn(Math.round(target.x), Math.round(target.y));
    });
    input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.drag = null;
    });
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.reset, this);
    this.reset();
  }

  private get camera() {
    return this.scene.cameras.main;
  }

  /** Default view: integer zoom that shows the whole arena, centred. */
  reset() {
    const { width, height } = this.scene.scale.gameSize;
    this.camera.setZoom(fitZoom(this.bounds, { width, height }, RENDER.zoom));
    this.camera.centerOn(
      Math.round((this.bounds.left + this.bounds.right) / 2),
      Math.round((this.bounds.top + this.bounds.bottom) / 2),
    );
  }

  setBounds(bounds: Bounds) {
    this.bounds = bounds;
    this.reset();
  }

  destroy() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.reset, this);
  }
}
