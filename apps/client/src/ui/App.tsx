import type { ClientStore } from '../store/store.ts';
import { DebugPanel } from './DebugPanel.tsx';
import { TechniqueBar } from './TechniqueBar.tsx';

export function App({ store }: { store: ClientStore }) {
  return (
    <>
      <DebugPanel store={store} />
      <TechniqueBar store={store} />
    </>
  );
}
