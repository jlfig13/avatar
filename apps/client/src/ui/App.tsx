import type { ClientStore } from '../store/store.ts';
import { DebugPanel } from './DebugPanel.tsx';

export function App({ store }: { store: ClientStore }) {
  return <DebugPanel store={store} />;
}
