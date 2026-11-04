import { useStore } from 'zustand';
import type { BattleConnection } from '../net/connection.ts';
import type { ClientStore } from '../store/store.ts';
import { BattleHud } from './BattleHud.tsx';
import { DebugPanel } from './DebugPanel.tsx';
import { Lobby } from './Lobby.tsx';
import { TechniqueBar } from './TechniqueBar.tsx';

export function App({
  store,
  connection,
  enemies,
}: {
  store: ClientStore;
  connection: BattleConnection | null;
  enemies: number;
}) {
  const status = useStore(store, (s) => s.connection);
  const battle = useStore(store, (s) => s.battle);
  const inBattle = connection === null || (status === 'connected' && battle !== null);
  return (
    <>
      <DebugPanel store={store} />
      {inBattle ? (
        <>
          <BattleHud
            store={store}
            onLeave={() => void connection?.leave().then(() => store.getState().setBattle(null))}
          />
          <TechniqueBar store={store} />
        </>
      ) : (
        connection && <Lobby store={store} connection={connection} enemies={enemies} />
      )}
    </>
  );
}
