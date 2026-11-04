import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';
import { createPreviewBattle } from '../src/battle/sandbox.ts';
import { t } from '../src/i18n/i18n.ts';
import { hasSeqGap, httpBaseFrom, intentForClick, stateFromDto } from '../src/net/logic.ts';

describe('network helpers (CLI-06)', () => {
  const state = createPreviewBattle('preset.fire');

  it('a click on a reachable cell is a move; elsewhere nothing', () => {
    expect(intentForClick(state, 'player', null, { x: 1, y: 7 }, gameData)).toEqual({
      kind: 'move',
      to: { x: 1, y: 7 },
    });
    expect(intentForClick(state, 'player', null, { x: 9, y: 0 }, gameData)).toBeNull();
  });

  it('with a technique selected, a click on a valid target is a technique intent', () => {
    const near = {
      ...state,
      combatants: state.combatants.map((c) =>
        c.id === 'enemy1' ? { ...c, position: { x: 3, y: 8 } } : c,
      ),
    };
    expect(intentForClick(near, 'player', 'fire.blast', { x: 3, y: 8 }, gameData)).toEqual({
      kind: 'technique',
      techniqueId: 'fire.blast',
      target: { x: 3, y: 8 },
    });
    expect(intentForClick(near, 'player', 'fire.blast', { x: 1, y: 7 }, gameData)).toBeNull();
  });

  it('nothing happens outside the player turn or after the move was used', () => {
    const enemyTurn = {
      ...state,
      turn: { combatantId: 'enemy1', hasMoved: false, hasActed: false, usedTechniqueId: null },
    };
    expect(intentForClick(enemyTurn, 'player', null, { x: 1, y: 7 }, gameData)).toBeNull();
    const moved = {
      ...state,
      turn: { combatantId: 'player', hasMoved: true, hasActed: false, usedTechniqueId: null },
    };
    expect(intentForClick(moved, 'player', null, { x: 1, y: 7 }, gameData)).toBeNull();
  });

  it('detects gaps in event seq', () => {
    expect(hasSeqGap(10, 11)).toBe(false);
    expect(hasSeqGap(10, 13)).toBe(true);
    expect(hasSeqGap(0, 1)).toBe(false);
  });

  it('derives the HTTP base from the WebSocket URL and rebuilds the core state from the DTO', () => {
    expect(httpBaseFrom('ws://localhost:2567')).toBe('http://localhost:2567');
    expect(httpBaseFrom('wss://game.example/')).toBe('https://game.example');
    const { seed: _s, rngState: _r, ...dto } = state;
    expect(stateFromDto(dto)).toEqual({ ...state, seed: 0, rngState: 0 });
  });

  it('translates every rejection reason', () => {
    const reasons = [
      'not_your_turn',
      'already_moved',
      'already_acted',
      'unreachable',
      'out_of_range',
      'no_line_of_sight',
      'invalid_target',
      'not_enough_energy',
      'not_on_escape_cell',
      'battle_over',
      'unknown_technique',
      'invalid_intent',
      'paused',
    ];
    for (const reason of reasons) expect(t(`reject.${reason}`)).not.toBe(`reject.${reason}`);
  });
});
