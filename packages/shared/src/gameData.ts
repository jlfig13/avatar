import type { Monster, Passive, Preset } from './schemas/combatants.ts';
import type { GridFile } from './schemas/grid.ts';
import type { Rules } from './schemas/rules.ts';
import type { Technique } from './schemas/technique.ts';

/** Validated game data, indexed by id. Built by @elemental/game-data. */
export interface GameData {
  readonly rules: Rules;
  readonly techniques: Readonly<Record<string, Technique>>;
  readonly passives: Readonly<Record<string, Passive>>;
  readonly monsters: Readonly<Record<string, Monster>>;
  readonly presets: Readonly<Record<string, Preset>>;
  readonly maps: Readonly<Record<string, GridFile>>;
}
