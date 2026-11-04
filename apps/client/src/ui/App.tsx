import { useStore } from 'zustand';
import { t } from '../i18n/i18n.ts';
import type { ClientStore } from '../store/store.ts';
import { DebugPanel } from './DebugPanel.tsx';

export function App({ store }: { store: ClientStore }) {
  const color = useStore(store, (s) => s.diamondColor);
  const cycle = useStore(store, (s) => s.cycleDiamondColor);
  return (
    <>
      <DebugPanel store={store} />
      <div className="widget" style={{ position: 'absolute', top: 12, left: 12 }}>
        <button type="button" onClick={cycle} data-testid="cycle-color">
          {t('debug.cycleColor')}
        </button>
        <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>
          #{color.toString(16).padStart(6, '0')}
        </span>
      </div>
    </>
  );
}
