// Camera rules (docs/04 §8): no rotation, integer zoom steps within limits. Pure helpers.

export interface Bounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Largest integer zoom that shows the whole bounds (with a margin), clamped to the limits. */
export function fitZoom(
  bounds: Bounds,
  viewport: { width: number; height: number },
  limits: { min: number; max: number },
  margin = 32,
): number {
  const w = bounds.right - bounds.left + margin * 2;
  const h = bounds.bottom - bounds.top + margin * 2;
  const zoom = Math.floor(Math.min(viewport.width / w, viewport.height / h));
  return clampZoom(zoom, limits);
}

export const clampZoom = (zoom: number, limits: { min: number; max: number }): number =>
  Math.min(limits.max, Math.max(limits.min, Math.round(zoom)));

/** One integer step per wheel notch: wheel up (deltaY < 0) zooms in. */
export const wheelZoom = (
  zoom: number,
  deltaY: number,
  limits: { min: number; max: number },
): number => (deltaY === 0 ? zoom : clampZoom(zoom + (deltaY < 0 ? 1 : -1), limits));

/** Keeps the camera centre inside the bounds. */
export function clampCenter(x: number, y: number, bounds: Bounds): { x: number; y: number } {
  return {
    x: Math.min(bounds.right, Math.max(bounds.left, x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, y)),
  };
}
