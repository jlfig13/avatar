import { gameData } from '@elemental/game-data';
import { describe, expect, it } from 'vitest';
import { createPreviewBattle } from '../src/battle/sandbox.ts';
import { computeOverlay } from '../src/game/overlay.ts';

const kinds = (o: ReturnType<typeof computeOverlay>) => [...o.cells.values()];

describe('grid overlay previews (CLI-04)', () => {
  it('without a technique shows reachable cells and the hovered cell', () => {
    const state = createPreviewBattle('preset.water');
    const overlay = computeOverlay(state, 'player', null, { x: 9, y: 0 }, gameData);
    expect(kinds(overlay).filter((k) => k === 'reachable').length).toBeGreaterThan(5);
    expect(overlay.cells.get('9,0')).toBe('hover');
  });

  it('hovering a valid target shows the affected cells of the technique', () => {
    const base = createPreviewBattle('preset.water');
    // put the enemy within water.freeze range (2–4) of the player at (1,8)
    const state = {
      ...base,
      combatants: base.combatants.map((c) =>
        c.id === 'enemy1' ? { ...c, position: { x: 3, y: 8 } } : c,
      ),
    };
    const overlay = computeOverlay(state, 'player', 'water.freeze', { x: 3, y: 8 }, gameData);
    expect(overlay.cells.get('3,8')).toBe('area');
    expect(overlay.cells.get('3,9')).toBe('area');
    expect(overlay.cells.get('4,8')).toBe('area');
    expect(kinds(overlay)).not.toContain('reachable');
  });

  it('marks cells without line of sight differently', () => {
    // test-arena rock at (2,7) sits between the player (1,8)… use fire.blast from (2,9) toward (2,5)
    const base = createPreviewBattle('preset.fire');
    const state = {
      ...base,
      combatants: base.combatants.map((c) =>
        c.id === 'player'
          ? { ...c, position: { x: 2, y: 9 } }
          : c.id === 'enemy1'
            ? { ...c, position: { x: 2, y: 6 } }
            : c,
      ),
    };
    const overlay = computeOverlay(state, 'player', 'fire.blast', null, gameData);
    expect(overlay.cells.get('2,6')).toBe('noLineOfSight');
    expect(kinds(overlay)).toContain('inRange');
  });

  it('shows nothing interactive when it is not the player turn', () => {
    const base = createPreviewBattle('preset.water');
    const state = {
      ...base,
      turn: { combatantId: 'enemy1', hasMoved: false, hasActed: false, usedTechniqueId: null },
    };
    expect(kinds(computeOverlay(state, 'player', null, null, gameData))).toEqual([]);
  });
});
