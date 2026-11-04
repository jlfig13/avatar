import * as Phaser from 'phaser';
import type { ClientStore } from '../store/store.ts';
import { ArenaScene } from './ArenaScene.ts';

/** Phaser owns the canvas and the render loop (docs/04 §8). */
export function createGame(parent: HTMLElement, store: ClientStore): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#14121c',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [new ArenaScene(store)],
  });
}
