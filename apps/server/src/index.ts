import { COMBAT_CORE_PACKAGE } from '@elemental/combat-core';
import { GAME_DATA_PACKAGE } from '@elemental/game-data';
import { SHARED_PACKAGE } from '@elemental/shared';

// Placeholder until SRV-01 bootstraps Colyseus.
export const SERVER_DEPENDENCIES = [
  COMBAT_CORE_PACKAGE,
  GAME_DATA_PACKAGE,
  SHARED_PACKAGE,
] as const;
