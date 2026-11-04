import type { Terrain } from '@elemental/combat-core';
import render from './render.json';

// docs/01 §7 — PROVISÓRIO render values (tile 64 × 32, height step 16); see docs/09.
// Visual-only settings (not game balance): colours of the procedural arena (ADR-011).
export interface TerrainColors {
  readonly top: string;
  readonly left: string;
  readonly right: string;
  readonly alpha?: number;
}

export interface RenderConfig {
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly heightStep: number;
  readonly zoom: { readonly min: number; readonly max: number };
  readonly terrain: Readonly<Record<Terrain, TerrainColors>>;
  readonly markerColor: string;
  readonly highlight: Readonly<
    Record<
      'reachable' | 'inRange' | 'noLineOfSight' | 'target' | 'area' | 'hover',
      { fill: string; alpha: number; line: string }
    >
  >;
  readonly characterPalettes: Readonly<
    Record<string, { body: string; dark: string; light: string }>
  > & {
    readonly neutral: { body: string; dark: string; light: string };
  };
}

export const RENDER: RenderConfig = render;
