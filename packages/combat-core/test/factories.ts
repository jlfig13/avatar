import type { GameData, Rules, Technique } from '@elemental/shared';
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

/** Test rules: same shape as rules.json, round numbers chosen for readable expectations. */
export const testRules: Rules = {
  movement: {
    base: 3,
    mobilityDivisor: 10,
    jumpUp: 2,
    jumpDown: 3,
    extraCost: { shallow_water: 1, ice: 1 },
    waterUsersIgnoreWater: true,
  },
  ct: { threshold: 100, speedBase: 4, speedMobilityDivisor: 5 },
  turn: {
    timeoutSeconds: 60,
    afkTimeoutSeconds: 10,
    afkAfterConsecutive: 3,
    defendDamageMultiplier: 0.5,
  },
  accuracy: { min: 5, max: 95, controlVsMobilityFactor: 0.5 },
  height: {
    rangeBonusMinDiff: 2,
    accuracyPerStep: 10,
    accuracyStepMinDiff: 2,
    maxAccuracyBonus: 20,
  },
  flank: { side: { accuracy: 10, damage: 1.5 }, back: { accuracy: 20, damage: 2 } },
  damage: { resistanceFactor: 0.5, minDamage: 1, waterOnShallowWaterBonus: 1.5 },
  energy: {
    maxBase: 40,
    maxPerSpirit: 2,
    regenBase: 2,
    regenSpiritDivisor: 10,
    regenFocusDivisor: 10,
    focusCostReductionCap: 30,
  },
  cellEffects: {
    ice: { rounds: 2, moveExtraCost: 1, accuracyBonusAgainstOccupant: 10 },
    fire: { rounds: 2, damage: 10, vegetationExtraRounds: 1 },
    earth_wall: { rounds: 3 },
    gust: { rounds: 2, pushCells: 1 },
  },
  flee: { base: 30, perMobility: 2, perAdjacentEnemy: 10, min: 10, max: 90 },
  disconnect: { graceRounds: 3, allDisconnectedPauseSeconds: 300 },
  arena: { common: 10, boss: 16, masterTrial: 12 },
  ai: { profiles: { balanced: { expectedDamage: 1 } } },
};

export function makeTechnique(overrides: Partial<Technique> & { id: string }): Technique {
  return {
    element: 'water',
    nameKey: `technique.${overrides.id}.name`,
    role: 'attack',
    target: 'enemy',
    range: { min: 1, max: 3 },
    rangeBonusFromHeight: false,
    requiresLineOfSight: false,
    area: { shape: 'single' },
    energyCost: 10,
    ctDelay: 0,
    accuracy: 100,
    power: 10,
    powerScaling: 1,
    effects: [{ kind: 'damage' }],
    ...overrides,
  };
}

export function makeData(overrides: Partial<GameData> = {}): GameData {
  return {
    rules: testRules,
    techniques: {},
    passives: {},
    monsters: {},
    presets: {},
    maps: {},
    ...overrides,
  };
}

export const emptyData: GameData = makeData();

/** Recursively freezes a value so any mutation in the code under test throws. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
