import * as Phaser from 'phaser';
import type { ClientStore } from '../store/store.ts';

export const DEBUG_SAMPLE_MS = 500;

type DrawCounter = { calls: number };

/** Counts WebGL draw calls by wrapping drawArrays/drawElements once (debug only, negligible cost). */
function instrumentWebGl(game: Phaser.Game): DrawCounter | null {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
  const gl = renderer.gl;
  const counter: DrawCounter = { calls: 0 };
  const drawArrays = gl.drawArrays.bind(gl);
  const drawElements = gl.drawElements.bind(gl);
  gl.drawArrays = (...args: Parameters<typeof gl.drawArrays>) => {
    counter.calls++;
    drawArrays(...args);
  };
  gl.drawElements = (...args: Parameters<typeof gl.drawElements>) => {
    counter.calls++;
    drawElements(...args);
  };
  return counter;
}

function heapMb(): number | null {
  // `as`: performance.memory is a non-standard Chromium extension.
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round((memory.usedJSHeapSize / 1024 / 1024) * 10) / 10 : null;
}

/** Samples FPS, game objects, draw calls and memory every 500 ms into the store (docs/04 §8). */
export function startDebugProbe(game: Phaser.Game, store: ClientStore): () => void {
  const counter = instrumentWebGl(game);
  let lastFrame = game.loop.frame;
  let lastCalls = 0;
  let sample = 0;
  const timer = window.setInterval(() => {
    const frames = Math.max(1, game.loop.frame - lastFrame);
    lastFrame = game.loop.frame;
    let drawCalls: number | null = null;
    if (counter) {
      drawCalls = Math.round((counter.calls - lastCalls) / frames);
      lastCalls = counter.calls;
    } else if (game.renderer instanceof Phaser.Renderer.Canvas.CanvasRenderer) {
      drawCalls = game.renderer.drawCount;
    }
    const gameObjects = game.scene
      .getScenes(true)
      .reduce((total, scene) => total + scene.children.length, 0);
    sample++;
    store.getState().setDebugStats({
      sample,
      fps: Math.round(game.loop.actualFps),
      gameObjects,
      drawCalls,
      memoryMb: heapMb(),
    });
  }, DEBUG_SAMPLE_MS);
  return () => window.clearInterval(timer);
}
