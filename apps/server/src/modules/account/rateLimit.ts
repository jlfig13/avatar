/** Fixed-window attempt counter per key (e.g. client IP). In memory: fine for a single process. */
export interface RateLimiter {
  /** Records an attempt; false when the key exceeded `max` attempts in the current window. */
  hit(key: string): boolean;
}

export function createRateLimiter(options: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { start: number; count: number }>();
  return {
    hit(key) {
      const t = now();
      const current = windows.get(key);
      if (!current || t - current.start >= options.windowMs) {
        windows.set(key, { start: t, count: 1 });
        if (windows.size > 10_000) {
          for (const [k, w] of windows) if (t - w.start >= options.windowMs) windows.delete(k);
        }
        return true;
      }
      current.count += 1;
      return current.count <= options.max;
    },
  };
}
