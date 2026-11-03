import type { GameData } from '@elemental/shared';
import { seedRng } from './rng.ts';
import { cellIndex } from './state.ts';
import type { BattleState, Combatant, Facing, Grid, Position, Team } from './types.ts';

/** docs/05 §9 — a combatant to place in a new battle, built from a preset or a monster. */
export interface CombatantInput {
  readonly id: string;
  readonly team: Team;
  readonly controller: 'player' | 'ai';
  readonly position: Position;
  readonly facing: Facing;
  readonly template: { readonly kind: 'preset' | 'monster'; readonly id: string };
}

export interface CreateBattleInput {
  readonly id: string;
  readonly seed: number;
  readonly grid: Grid;
  readonly combatants: readonly CombatantInput[];
  readonly data: GameData;
}

/** docs/02 §6.7 — energiaMax = maxBase + spirit * maxPerSpirit. */
export const maxEnergyFor = (spirit: number, data: GameData): number =>
  data.rules.energy.maxBase + spirit * data.rules.energy.maxPerSpirit;

function buildCombatant(input: CombatantInput, data: GameData): Combatant {
  const { kind, id } = input.template;
  const template = kind === 'preset' ? data.presets[id] : data.monsters[id];
  if (!template) throw new Error(`createBattle: unknown ${kind} "${id}"`);
  const maxEnergy = maxEnergyFor(template.attributes.spirit, data);
  return {
    id: input.id,
    name: template.nameKey,
    team: input.team,
    element: 'element' in template ? template.element : null,
    controller: input.controller,
    position: input.position,
    facing: input.facing,
    hp: template.maxHp,
    maxHp: template.maxHp,
    // docs/02 §6.7 — slice 1 starts with full energy.
    energy: maxEnergy,
    maxEnergy,
    attributes: template.attributes,
    techniqueIds: template.techniqueIds,
    passiveIds: template.passiveIds,
    ct: 0,
    status: [],
    reactionUsedThisRound: false,
    consecutiveTimeouts: 0,
    alive: true,
    fled: false,
  };
}

/** Creates the initial battle state. Invalid input is a programming error and throws. */
export function createBattle(input: CreateBattleInput): BattleState {
  const { grid, data } = input;
  const ids = new Set<string>();
  const occupied = new Set<number>();
  for (const c of input.combatants) {
    if (ids.has(c.id)) throw new Error(`createBattle: duplicate combatant id "${c.id}"`);
    ids.add(c.id);
    const { x, y } = c.position;
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
      throw new Error(`createBattle: ${c.id} placed outside the grid`);
    }
    const index = cellIndex(grid, c.position);
    if (grid.cells[index]?.blocked)
      throw new Error(`createBattle: ${c.id} placed on a blocked cell`);
    if (occupied.has(index)) throw new Error(`createBattle: ${c.id} placed on an occupied cell`);
    occupied.add(index);
  }
  return {
    id: input.id,
    seed: input.seed,
    rngState: seedRng(input.seed),
    grid,
    combatants: input.combatants.map((c) => buildCombatant(c, data)),
    turn: null,
    round: 0,
    actedThisRound: [],
    phase: 'running',
    eventSeq: 0,
  };
}
