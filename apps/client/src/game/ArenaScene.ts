import { type Grid, gridFromFile } from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';
import * as Phaser from 'phaser';
import { CombatantSprites } from '../characters/CombatantSprites.ts';
import { RENDER } from '../config/render.ts';
import { intentForClick } from '../net/logic.ts';
import { type ClientStore, watch } from '../store/store.ts';
import { arenaShapes, type CellShape, maxHeightOf } from './arenaGeometry.ts';
import { CameraController } from './cameraController.ts';
import { cellToScreen, depthOf, gridBounds, LAYER, screenToCell } from './iso.ts';
import { OverlayLayer } from './OverlayLayer.ts';
import { computeOverlay } from './overlay.ts';

const ARENA_ID = 'test-arena';
const TILED_KEY = 'arena-tiled';

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const vec = (points: readonly { x: number; y: number }[]) =>
  points.map((p) => new Phaser.Math.Vector2(p.x, p.y));

/**
 * CLI-03 — the arena drawn from the logical grid (*.grid.json). If a Tiled map exists at
 * assets/maps/test-arena.tmj it is used for the visuals and the grid stays the logical layer.
 */
export class ArenaScene extends Phaser.Scene {
  private readonly store: ClientStore;
  private readonly tiledMap: object | null;
  readonly grid: Grid;
  private markers: Phaser.GameObjects.Container | null = null;
  /** Combatant sprites (exposed for the event queue, CLI-07, and dev checks). */
  sprites: CombatantSprites | null = null;

  constructor(store: ClientStore, tiledMap: object | null = null) {
    super('arena');
    this.store = store;
    this.tiledMap = tiledMap;
    const file = gameData.maps[ARENA_ID];
    if (!file) throw new Error(`${ARENA_ID} missing from game data`);
    this.grid = gridFromFile(file);
  }

  create() {
    if (!this.tryTiledMap()) this.drawProcedural();
    this.drawMarkers();
    const camera = new CameraController(
      this,
      gridBounds(this.grid.width, this.grid.height, maxHeightOf(this.grid) + 1, RENDER),
    );
    const overlay = new OverlayLayer(this, this.grid);
    const sprites = new CombatantSprites(this, this.grid);
    this.sprites = sprites;
    const maxHeight = maxHeightOf(this.grid);
    const heightAt = (c: { x: number; y: number }) =>
      this.grid.cells[c.y * this.grid.width + c.x]?.height ?? -1;
    // CLI-04 — picking with the inverse projection (respects heights).
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const cell = screenToCell(
        { sx: p.worldX, sy: p.worldY },
        this.grid,
        heightAt,
        maxHeight,
        RENDER,
      );
      this.store.getState().setHoverCell(cell);
    });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.store.getState().setHoverCell(null));
    // CLI-06 — left click: move to a reachable cell or use the selected technique on a valid target.
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (p.button !== 0) return;
      const { battle, actorId, selectedTechniqueId, sendIntent } = this.store.getState();
      const cell = screenToCell(
        { sx: p.worldX, sy: p.worldY },
        this.grid,
        heightAt,
        maxHeight,
        RENDER,
      );
      if (!battle || !cell || !sendIntent) return;
      const intent = intentForClick(battle, actorId, selectedTechniqueId, cell, gameData);
      if (!intent) return;
      sendIntent(intent);
      if (intent.kind === 'technique') this.store.getState().selectTechnique(null);
    });
    const redraw = () => {
      const { battle, actorId, selectedTechniqueId, hoverCell } = this.store.getState();
      sprites.sync(battle);
      if (battle)
        overlay.render(computeOverlay(battle, actorId, selectedTechniqueId, hoverCell, gameData));
    };
    const unwatchers = [
      watch(
        this.store,
        (s) => s.debug.visible,
        (visible) => this.markers?.setVisible(visible),
      ),
      watch(this.store, (s) => s.battle, redraw),
      watch(this.store, (s) => s.selectedTechniqueId, redraw),
      watch(this.store, (s) => s.hoverCell, redraw),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const unwatch of unwatchers) unwatch();
      camera.destroy();
      sprites.destroy();
    });
  }

  /** Uses the Tiled map when present. Not verified with a real map yet (it arrives with ART-02). */
  private tryTiledMap(): boolean {
    if (!this.tiledMap) return false;
    try {
      this.cache.tilemap.add(TILED_KEY, {
        format: Phaser.Tilemaps.Formats.TILED_JSON,
        data: this.tiledMap,
      });
      const map = this.make.tilemap({ key: TILED_KEY });
      const tilesets = map.tilesets.flatMap((ts) => map.addTilesetImage(ts.name) ?? []);
      if (tilesets.length === 0) return false;
      // Tiled iso origin is the top corner of tile (0,0), like our projection minus half a tile.
      map.layers.forEach((layer, i) => {
        map
          .createLayer(layer.name, tilesets, -RENDER.tileWidth / 2, -RENDER.tileHeight / 2)
          ?.setDepth(i);
      });
      return true;
    } catch (error) {
      console.warn('[arena] Tiled map failed, falling back to the grid', error);
      return false;
    }
  }

  private drawProcedural() {
    for (const shape of arenaShapes(this.grid, RENDER)) this.drawCell(shape);
  }

  private drawCell(shape: CellShape) {
    const cell = this.grid.cells[shape.y * this.grid.width + shape.x];
    if (!cell) return;
    const palette = RENDER.terrain[cell.terrain];
    const g = this.add.graphics().setDepth(shape.depth);
    const isWater = cell.terrain === 'shallow_water';
    // Side faces (water sits on a muddy bed drawn with the ground sides).
    const sides = isWater ? RENDER.terrain.ground : palette;
    g.fillStyle(color(sides.left), 1).fillPoints(vec(shape.left), true);
    g.fillStyle(color(sides.right), 1).fillPoints(vec(shape.right), true);
    // Seams between stacked levels.
    g.lineStyle(1, 0x000000, 0.25);
    for (const seam of shape.levelSeams) {
      const [l0, l1] = [shape.left[0], shape.left[1]];
      const r1 = shape.right[1];
      if (!l0 || !l1 || !r1) continue;
      g.lineBetween(l0.x, l0.y + seam, l1.x, l1.y + seam);
      g.lineBetween(l1.x, l1.y + seam, r1.x, r1.y + seam);
    }
    if (isWater) g.fillStyle(color(RENDER.terrain.ground.left), 1).fillPoints(vec(shape.top), true);
    g.fillStyle(color(palette.top), palette.alpha ?? 1).fillPoints(vec(shape.top), true);
    g.lineStyle(1, 0x000000, 0.2).strokePoints(vec(shape.top), true);
    if (cell.terrain === 'vegetation') this.drawShrub(g, shape);
  }

  /** A few darker tufts so the grove reads as vegetation without any image. */
  private drawShrub(g: Phaser.GameObjects.Graphics, shape: CellShape) {
    const centre =
      shape.top[3] && shape.top[1]
        ? { x: (shape.top[3].x + shape.top[1].x) / 2, y: shape.top[0]?.y ?? 0 }
        : null;
    if (!centre) return;
    const cy = centre.y + RENDER.tileHeight / 2;
    g.fillStyle(color(RENDER.terrain.vegetation.left), 1);
    for (const [dx, dy] of [
      [-10, -2],
      [8, -4],
      [0, 4],
    ] as const)
      g.fillCircle(centre.x + dx, cy + dy - 4, 5);
  }

  /** Debug markers on (0,0) and the opposite corner, drawn with the same projection as the cells. */
  private drawMarkers() {
    const corners = [
      { x: 0, y: 0 },
      { x: this.grid.width - 1, y: this.grid.height - 1 },
    ];
    this.markers = this.add.container(0, 0).setVisible(this.store.getState().debug.visible);
    for (const cell of corners) {
      const h = this.grid.cells[cell.y * this.grid.width + cell.x]?.height ?? 0;
      const { sx, sy } = cellToScreen(cell, h, RENDER);
      const dot = this.add.circle(sx, sy, 4, color(RENDER.markerColor));
      const label = this.add
        .text(sx, sy - 18, `(${cell.x},${cell.y})`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: RENDER.markerColor,
        })
        .setOrigin(0.5, 0.5);
      this.markers.add([dot, label]);
    }
    this.markers.setDepth(depthOf({ x: this.grid.width, y: this.grid.height }, 99, LAYER.overlay));
  }
}
