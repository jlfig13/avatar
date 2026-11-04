import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPreviewBattle } from './battle/sandbox.ts';
import { startDebugProbe } from './debug/probe.ts';
import { createGame } from './game/createGame.ts';
import { findTiledMap, TILED_ARENA_URL } from './game/tiledMap.ts';
import { BattleConnection } from './net/connection.ts';
import { createClientStore } from './store/store.ts';
import { App } from './ui/App.tsx';

const store = createClientStore();
const gameRoot = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!gameRoot || !uiRoot) throw new Error('index.html is missing #game or #ui');

const params = new URLSearchParams(window.location.search);
const enemies = Math.min(2, Math.max(1, Number(params.get('enemies') ?? 1) || 1));
// ?offline=1 — previews on a local battle, without a server (development only).
const offline = params.get('offline') === '1';
let connection: BattleConnection | null = null;
if (offline) {
  store.getState().setBattle(createPreviewBattle(params.get('preset') ?? 'preset.water', enemies));
} else {
  connection = new BattleConnection(store);
  store.getState().setIntentSink((intent) => connection?.send(intent));
  void connection.resume();
}

const tiledMap = await findTiledMap(TILED_ARENA_URL);
if (!tiledMap)
  console.info(`[arena] ${TILED_ARENA_URL} not found: drawing the arena from the grid`);
const game = createGame(gameRoot, store, tiledMap);
startDebugProbe(game, store);
// Dev-only hook for automated checks (Playwright) and console debugging.
if (import.meta.env.DEV) Object.assign(window, { __elementalGame: game, __elementalStore: store });

createRoot(uiRoot).render(
  <StrictMode>
    <App store={store} connection={connection} enemies={enemies} />
  </StrictMode>,
);
