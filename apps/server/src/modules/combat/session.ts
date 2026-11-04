import {
  type Action,
  type ApplyResult,
  applyAction,
  type BattleState,
  type CombatantInput,
  type CreateBattleInput,
  createBattle,
  gridFromFile,
} from '@elemental/combat-core';
import type { BattleJoinOptions, GameData } from '@elemental/shared';

export const PLAYER_ID = 'player';
export const ARENA_ID = 'test-arena';

/** The client never sees the RNG seed/state (it could predict rolls). */
export type BattleStateDto = Omit<BattleState, 'seed' | 'rngState'>;

export function toDto(state: BattleState): BattleStateDto {
  const { seed: _seed, rngState: _rng, ...dto } = state;
  return dto;
}

/** Slice 1 battle: test-arena, the chosen preset vs 1–2 clawbeasts. */
export function createSetup(
  id: string,
  options: BattleJoinOptions,
  seed: number,
  data: GameData,
): CreateBattleInput {
  if (!data.presets[options.presetId]) throw new Error(`unknown preset ${options.presetId}`);
  const map = data.maps[ARENA_ID];
  const playerSpawn = map?.spawns.players[0];
  if (!map || !playerSpawn) throw new Error(`${ARENA_ID} missing`);
  const enemies = map.spawns.enemies.slice(0, options.enemies);
  const combatants: CombatantInput[] = [
    {
      id: PLAYER_ID,
      team: 'players',
      controller: 'player',
      position: playerSpawn,
      facing: 'N',
      template: { kind: 'preset', id: options.presetId },
    },
    ...enemies.map(
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
  return { id, seed, grid: gridFromFile(map), combatants, data };
}

/** Authoritative battle state for one room; every accepted action is recorded for replay. */
export class BattleSession {
  state: BattleState;
  readonly actions: Action[] = [];
  readonly setup: CreateBattleInput;
  private readonly data: GameData;

  constructor(setup: CreateBattleInput, data: GameData) {
    this.setup = setup;
    this.data = data;
    this.state = createBattle(setup);
  }

  apply(action: Action): ApplyResult {
    const result = applyAction(this.state, action, this.data);
    if (result.ok) {
      this.state = result.state;
      this.actions.push(action);
    }
    return result;
  }

  get activeCombatant() {
    const id = this.state.turn?.combatantId;
    return id ? this.state.combatants.find((c) => c.id === id) : undefined;
  }

  snapshot() {
    return { state: toDto(this.state), lastEventSeq: this.state.eventSeq };
  }
}

/** Replay: the same setup (seed) + the recorded actions rebuild the same final state. */
export function replay(
  setup: CreateBattleInput,
  actions: readonly Action[],
  data: GameData,
): BattleState {
  let state = createBattle(setup);
  for (const action of actions) {
    const result = applyAction(state, action, data);
    if (!result.ok) throw new Error(`replay diverged at ${action.type}: ${result.reason}`);
    state = result.state;
  }
  return state;
}
