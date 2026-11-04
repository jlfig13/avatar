import { useEffect } from 'react';
import { useStore } from 'zustand';
import { t } from '../i18n/i18n.ts';
import type { ClientStore } from '../store/store.ts';

const dash = (value: number | null | undefined, suffix = '') =>
  value === null || value === undefined ? '—' : `${value}${suffix}`;

/** CLI-11 — performance panel toggled with F3. */
export function DebugPanel({ store }: { store: ClientStore }) {
  const debug = useStore(store, (s) => s.debug);
  const toggle = useStore(store, (s) => s.toggleDebug);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        event.preventDefault(); // the browser's own "find" shortcut
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  if (!debug.visible) return null;
  const { stats } = debug;
  return (
    <div
      className="widget"
      data-testid="debug-panel"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.7)',
        font: '12px monospace',
        lineHeight: 1.5,
        minWidth: 220,
      }}
    >
      <div>
        {t('debug.fps')}: <span data-testid="debug-fps">{dash(stats?.fps)}</span>
      </div>
      <div>
        {t('debug.gameObjects')}: {dash(stats?.gameObjects)}
      </div>
      <div>
        {t('debug.drawCalls')}: {dash(stats?.drawCalls)}
      </div>
      <div>
        {t('debug.memory')}: {dash(stats?.memoryMb, ' MB')}
      </div>
      <div style={{ opacity: 0.6 }}>
        {t('debug.sample')}: <span data-testid="debug-sample">{dash(stats?.sample)}</span>
      </div>
      <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', maxWidth: 320 }}>
        {t('debug.lastAiDecision')}: {debug.lastAiDecision ?? '—'}
      </div>
    </div>
  );
}
