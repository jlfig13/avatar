// docs/05 §1 — core types. Shapes are the contract; changing them requires updating docs/05.

export type Element = 'water' | 'earth' | 'fire' | 'air';
export type Facing = 'N' | 'E' | 'S' | 'W';
export type Terrain = 'ground' | 'rock' | 'shallow_water' | 'vegetation';
export type CellEffectKind = 'ice' | 'fire' | 'earth_wall' | 'gust';
export type Team = 'players' | 'enemies' | 'third_party';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface CellEffect {
  readonly kind: CellEffectKind;
  readonly roundsLeft: number;
  readonly sourceId: string;
  readonly direction?: Facing;
}

export interface Cell {
  readonly height: number;
  readonly terrain: Terrain;
  readonly blocked: boolean;
  readonly escape: boolean;
  readonly effect?: CellEffect;
}

export interface Grid {
  readonly width: number;
  readonly height: number;
  /** index = y * width + x */
  readonly cells: readonly Cell[];
}

export interface Attributes {
  readonly power: number;
  readonly control: number;
  readonly resistance: number;
  readonly mobility: number;
  readonly spirit: number;
  readonly focus: number;
}

export interface StatusEffect {
  readonly id: string;
  readonly roundsLeft: number;
  readonly magnitude: number;
}

export interface Combatant {
  readonly id: string;
  /** i18n key */
  readonly name: string;
  readonly team: Team;
  readonly element: Element | null;
  readonly controller: 'player' | 'ai';
  readonly position: Position;
  readonly facing: Facing;
  readonly hp: number;
  readonly maxHp: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly attributes: Attributes;
  readonly techniqueIds: readonly string[];
  readonly passiveIds: readonly string[];
  readonly ct: number;
  readonly status: readonly StatusEffect[];
  readonly reactionUsedThisRound: boolean;
  readonly consecutiveTimeouts: number;
  readonly alive: boolean;
  readonly fled: boolean;
}

export interface TurnState {
  readonly combatantId: string;
  readonly hasMoved: boolean;
  readonly hasActed: boolean;
  /** used for the CT delay at end of turn */
  readonly usedTechniqueId: string | null;
}

export type BattlePhase = 'running' | 'victory' | 'defeat' | 'fled';

export interface BattleState {
  readonly id: string;
  readonly seed: number;
  /** current PRNG state (serializable) */
  readonly rngState: number;
  readonly grid: Grid;
  readonly combatants: readonly Combatant[];
  readonly turn: TurnState | null;
  readonly round: number;
  readonly actedThisRound: readonly string[];
  readonly phase: BattlePhase;
  readonly eventSeq: number;
}

// docs/05 §1.1
export type Action =
  | { readonly type: 'move'; readonly actorId: string; readonly to: Position }
  | {
      readonly type: 'technique';
      readonly actorId: string;
      readonly techniqueId: string;
      readonly target: Position;
    }
  | { readonly type: 'defend'; readonly actorId: string }
  | { readonly type: 'flee'; readonly actorId: string }
  | { readonly type: 'endTurn'; readonly actorId: string }
  | { readonly type: 'timeout'; readonly actorId: string }
  | { readonly type: 'advance' };

export type ActorAction = Exclude<Action, { type: 'advance' }>;

// docs/05 §1.2
export type RejectReason =
  | 'not_your_turn'
  | 'already_moved'
  | 'already_acted'
  | 'unreachable'
  | 'out_of_range'
  | 'no_line_of_sight'
  | 'invalid_target'
  | 'not_enough_energy'
  | 'not_on_escape_cell'
  | 'battle_over'
  | 'unknown_technique';
