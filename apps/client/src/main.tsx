import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startDebugProbe } from './debug/probe.ts';
import { createGame } from './game/createGame.ts';
import { findTiledMap, TILED_ARENA_URL } from './game/tiledMap.ts';
import { createClientStore } from './store/store.ts';
import { App } from './ui/App.tsx';

const store = createClientStore();
const gameRoot = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!gameRoot || !uiRoot) throw new Error('index.html is missing #game or #ui');

const tiledMap = await findTiledMap(TILED_ARENA_URL);
if (!tiledMap)
  console.info(`[arena] ${TILED_ARENA_URL} not found: drawing the arena from the grid`);
const game = createGame(gameRoot, store, tiledMap);
startDebugProbe(game, store);
createRoot(uiRoot).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
