import type { GameData } from '@elemental/shared';
import type { BattleState, Cell, Combatant, Grid, Position } from '../src/types.ts';

// Minimal test data with round numbers: each test declares only what matters.

export function makeCell(overrides: Partial<Cell> = {}): Cell {
  return { height: 0, terrain: 'ground', blocked: false, escape: false, ...overrides };
}

export function makeGrid(
  width = 10,
  height = 10,
  cellAt: (pos: Position) => Partial<Cell> = () => ({}),
): Grid {
  const cells: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) cells.push(makeCell(cellAt({ x, y })));
  }
  return { width, height, cells };
}

export function makeCombatant(overrides: Partial<Combatant> & { id: string }): Combatant {
  return {
    name: `test.${overrides.id}`,
    team: 'players',
    element: null,
    controller: 'player',
    position: { x: 0, y: 0 },
    facing: 'S',
    hp: 100,
    maxHp: 100,
    energy: 50,
    maxEnergy: 50,
    attributes: { power: 10, control: 10, resistance: 10, mobility: 10, spirit: 10, focus: 0 },
    techniqueIds: [],
    passiveIds: [],
    ct: 0,
    status: [],
    reactionUsedThisRound: false,
    consecutiveTimeouts: 0,
    alive: true,
    fled: false,
    ...overrides,
  };
}

export function makeBattle(overrides: Partial<BattleState> = {}): BattleState {
  const combatants = overrides.combatants ?? [
    makeCombatant({ id: 'p1', position: { x: 1, y: 1 } }),
    makeCombatant({ id: 'e1', team: 'enemies', controller: 'ai', position: { x: 5, y: 5 } }),
  ];
  return {
    id: 'battle-test',
    seed: 1,
    rngState: 1,
    grid: makeGrid(),
    combatants,
    turn: {
      combatantId: combatants[0]?.id ?? 'p1',
      hasMoved: false,
      hasActed: false,
      usedTechniqueId: null,
    },
    round: 1,
    actedThisRound: [],
    phase: 'running',
    eventSeq: 0,
    ...overrides,
  };
}

export const emptyData: GameData = {};

/** Recursively freezes a value so any mutation in the code under test throws. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
