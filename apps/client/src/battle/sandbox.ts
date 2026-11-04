import {
  type BattleState,
  type CombatantInput,
  createBattle,
  gridFromFile,
} from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';

export const PLAYER_ID = 'player';

/**
 * Local battle used only for UI previews until the client connects to the server (CLI-06).
 * Combat results always come from the server; this state never resolves actions.
 */
export function createPreviewBattle(presetId: string, enemies = 1): BattleState {
  const map = gameData.maps['test-arena'];
  const spawn = map?.spawns.players[0];
  if (!map || !spawn) throw new Error('test-arena missing');
  const combatants: CombatantInput[] = [
    {
      id: PLAYER_ID,
      team: 'players',
      controller: 'player',
      position: spawn,
      facing: 'N',
      template: { kind: 'preset', id: presetId },
    },
    ...map.spawns.enemies.slice(0, enemies).map(
      (position, i): CombatantInput => ({
        id: `enemy${i + 1}`,
        team: 'enemies',
        controller: 'ai',
        position,
        facing: 'S',
        template: { kind: 'monster', id: 'monster.clawbeast' },
      }),
    ),
  ];
  const state = createBattle({
    id: 'preview',
    seed: 1,
    grid: gridFromFile(map),
    combatants,
    data: gameData,
  });
  return {
    ...state,
    round: 1,
    turn: { combatantId: PLAYER_ID, hasMoved: false, hasActed: false, usedTechniqueId: null },
  };
}
