import presets from '../data/combatants/player-presets.json' with { type: 'json' };
import passives from '../data/passives.json' with { type: 'json' };
import rules from '../data/rules.json' with { type: 'json' };
import fire from '../data/techniques/fire.json' with { type: 'json' };
import water from '../data/techniques/water.json' with { type: 'json' };
import type { RawDataFiles } from './build.ts';

/**
 * Every data file shipped with the game, keyed by path relative to `data/`.
 * `pnpm validate:data` fails if a file on disk is missing from this list.
 */
export const dataFiles: RawDataFiles = {
  'rules.json': rules,
  'passives.json': passives,
  'techniques/water.json': water,
  'techniques/fire.json': fire,
  'combatants/player-presets.json': presets,
};
