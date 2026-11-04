import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPreviewBattle } from './battle/sandbox.ts';
import { startDebugProbe } from './debug/probe.ts';
import { createGame } from './game/createGame.ts';
import { findTiledMap, TILED_ARENA_URL } from './game/tiledMap.ts';
import { createClientStore } from './store/store.ts';
import { App } from './ui/App.tsx';

const store = createClientStore();
// Until CLI-06 connects to the server, previews run on a local battle (?preset=preset.fire&enemies=2).
const params = new URLSearchParams(window.location.search);
store
  .getState()
  .setBattle(
    createPreviewBattle(params.get('preset') ?? 'preset.water', Number(params.get('enemies') ?? 1)),
  );
const gameRoot = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!gameRoot || !uiRoot) throw new Error('index.html is missing #game or #ui');

const tiledMap = await findTiledMap(TILED_ARENA_URL);
if (!tiledMap)
  console.info(`[arena] ${TILED_ARENA_URL} not found: drawing the arena from the grid`);
const game = createGame(gameRoot, store, tiledMap);
startDebugProbe(game, store);
// Dev-only hook for automated checks (Playwright) and console debugging.
if (import.meta.env.DEV) Object.assign(window, { __elementalGame: game, __elementalStore: store });
createRoot(uiRoot).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
