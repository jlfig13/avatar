import type { GameData } from '@elemental/shared';
import { loadGameData } from './build.ts';
import { dataFiles } from './files.ts';

export { type BuildResult, buildGameData, loadGameData, type RawDataFiles } from './build.ts';
export { dataFiles } from './files.ts';

/** All game data, validated at import time. */
export const gameData: GameData = loadGameData(dataFiles);

export const GAME_DATA_PACKAGE = '@elemental/game-data';
export type { GameData } from '@elemental/shared';
