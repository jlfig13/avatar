import { CONSIDERATIONS } from '@elemental/combat-core';
import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';

describe('AI profiles in rules.json', () => {
  it('only reference known considerations and cover every monster profile + balanced', () => {
    const profiles = gameData.rules.ai.profiles;
    for (const weights of Object.values(profiles)) {
      for (const id of Object.keys(weights)) expect(CONSIDERATIONS, id).toHaveProperty(id);
    }
    for (const monster of Object.values(gameData.monsters))
      expect(profiles).toHaveProperty(monster.ai.profile);
    expect(profiles).toHaveProperty('balanced');
  });
});

describe('AI performance with real data', () => {
  it('decides in < 50 ms on test-arena with 4 combatants (all considerations)', async () => {
    const { chooseActions, createBattle, gridFromFile } = await import('@elemental/combat-core');
    const arena = gameData.maps['test-arena'];
    if (!arena) throw new Error('missing arena');
    const state = createBattle({
      id: 'perf',
      seed: 9,
      grid: gridFromFile(arena),
      data: gameData,
      combatants: [
        {
          id: 'p1',
          team: 'players',
          controller: 'player',
          position: { x: 1, y: 8 },
          facing: 'N',
          template: { kind: 'preset', id: 'preset.fire' },
        },
        {
          id: 'p2',
          team: 'players',
          controller: 'player',
          position: { x: 2, y: 8 },
          facing: 'N',
          template: { kind: 'preset', id: 'preset.water' },
        },
        {
          id: 'e1',
          team: 'enemies',
          controller: 'ai',
          position: { x: 8, y: 1 },
          facing: 'S',
          template: { kind: 'monster', id: 'monster.clawbeast' },
        },
        {
          id: 'e2',
          team: 'enemies',
          controller: 'ai',
          position: { x: 7, y: 2 },
          facing: 'S',
          template: { kind: 'monster', id: 'monster.clawbeast' },
        },
      ],
    });
    const decide = (actorId: string) => {
      const withTurn = {
        ...state,
        turn: { combatantId: actorId, hasMoved: false, hasActed: false, usedTechniqueId: null },
      };
      chooseActions({
        state: withTurn,
        actorId,
        data: gameData,
        profile: actorId.startsWith('e') ? 'aggressive_melee' : 'balanced',
      });
    };
    for (const id of ['p1', 'e1']) decide(id); // warm-up (JIT)
    let worst = 0;
    for (const actorId of ['p1', 'p2', 'e1', 'e2', 'p1', 'e1']) {
      const withTurn = {
        ...state,
        turn: { combatantId: actorId, hasMoved: false, hasActed: false, usedTechniqueId: null },
      };
      const start = performance.now();
      chooseActions({
        state: withTurn,
        actorId,
        data: gameData,
        profile: actorId.startsWith('e') ? 'aggressive_melee' : 'balanced',
      });
      worst = Math.max(worst, performance.now() - start);
    }
    expect(worst).toBeLessThan(50);
  });
});
