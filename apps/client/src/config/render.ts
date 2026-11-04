import render from './render.json';

// docs/01 §7 — PROVISÓRIO render values (tile 64 × 32, height step 16); see docs/09.
export interface RenderConfig {
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly heightStep: number;
  readonly zoom: { readonly min: number; readonly max: number };
}

export const RENDER: RenderConfig = render;
