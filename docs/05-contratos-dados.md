# 05 — Contratos de dados

> Formas de dados compartilhadas entre core, servidor, cliente e arquivos de jogo.
> Os **valores** das técnicas, do monstro e das regras são **PROVISÓRIOS** (destravam a implementação e serão calibrados). As **formas** (tipos e campos) são o contrato: mudá-las exige atualizar este documento.

## 1. Tipos centrais do core

```ts
// packages/combat-core/src/types.ts

export type Element = 'water' | 'earth' | 'fire' | 'air';
export type Facing = 'N' | 'E' | 'S' | 'W';
export type Terrain = 'ground' | 'rock' | 'shallow_water' | 'vegetation';
export type CellEffectKind = 'ice' | 'fire' | 'earth_wall' | 'gust';
export type Team = 'players' | 'enemies' | 'third_party';

export interface Position { readonly x: number; readonly y: number; }

export interface CellEffect {
  readonly kind: CellEffectKind;
  readonly roundsLeft: number;
  readonly sourceId: string;          // combatente que criou
  readonly direction?: Facing;        // só para 'gust'
}

export interface Cell {
  readonly height: number;            // 0..8
  readonly terrain: Terrain;
  readonly blocked: boolean;
  readonly escape: boolean;           // célula de fuga (borda)
  readonly effect?: CellEffect;
}

export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Cell[];    // índice = y * width + x
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
  readonly id: string;                // ex.: 'shielded', 'burning', 'defending'
  readonly roundsLeft: number;
  readonly magnitude: number;
}

export interface Combatant {
  readonly id: string;
  readonly name: string;              // chave i18n
  readonly team: Team;
  readonly element: Element | null;   // monstros podem não ter elemento
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
  readonly usedTechniqueId: string | null;   // para o atraso de CT
}

export type BattlePhase = 'running' | 'victory' | 'defeat' | 'fled';

export interface BattleState {
  readonly id: string;
  readonly seed: number;
  readonly rngState: number;                 // estado atual do PRNG (serializável)
  readonly grid: Grid;
  readonly combatants: readonly Combatant[];
  readonly turn: TurnState | null;
  readonly round: number;
  readonly actedThisRound: readonly string[];
  readonly phase: BattlePhase;
  readonly eventSeq: number;
}
```

### 1.1 Ações

```ts
export type Action =
  | { type: 'move'; actorId: string; to: Position }
  | { type: 'technique'; actorId: string; techniqueId: string; target: Position }
  | { type: 'defend'; actorId: string }
  | { type: 'flee'; actorId: string }
  | { type: 'endTurn'; actorId: string }
  | { type: 'timeout'; actorId: string }       // emitido pelo servidor
  | { type: 'advance' };                       // avança ticks até o próximo turno
```

### 1.2 Resultado e erros

```ts
export type ApplyResult =
  | { ok: true; state: BattleState; events: readonly BattleEvent[] }
  | { ok: false; reason: RejectReason };

export type RejectReason =
  | 'not_your_turn' | 'already_moved' | 'already_acted' | 'unreachable'
  | 'out_of_range' | 'no_line_of_sight' | 'invalid_target' | 'not_enough_energy'
  | 'not_on_escape_cell' | 'battle_over' | 'unknown_technique';
```

### 1.3 Eventos

Todo evento tem `seq` (inteiro crescente na batalha) e `type`.

| `type` | Campos | Significado |
| --- | --- | --- |
| `roundStarted` | `round` | Nova rodada |
| `turnStarted` | `combatantId`, `energyRegen` | Início do turno |
| `moved` | `combatantId`, `path: Position[]`, `facing` | Movimento concluído (cliente anima o caminho) |
| `techniqueUsed` | `combatantId`, `techniqueId`, `target`, `affectedCells` | Conjuração |
| `missed` | `attackerId`, `targetId` | Errou |
| `damaged` | `targetId`, `amount`, `hpAfter`, `source` (`technique`/`terrain`/`reaction`) | Dano |
| `healed` | `targetId`, `amount`, `hpAfter` | Cura |
| `statusApplied` / `statusExpired` | `targetId`, `statusId`, `rounds?` | Estados |
| `cellEffectApplied` / `cellEffectExpired` | `position`, `kind`, `rounds?` | Terreno temporário |
| `pushed` | `combatantId`, `from`, `to` | Empurrão |
| `reaction` | `combatantId`, `reactionId`, `triggeredBy` | Reação disparada |
| `defended` | `combatantId` | Postura defensiva |
| `timedOut` | `combatantId`, `consecutive` | Tempo esgotado |
| `fleeAttempt` | `combatantId`, `chance`, `success` | Tentativa de fuga |
| `defeated` | `combatantId` | Combatente caiu |
| `turnEnded` | `combatantId`, `ctAfter` | Fim do turno |
| `battleEnded` | `result` (`victory`/`defeat`/`fled`), `rounds` | Fim |

## 2. `rules.json` (valores PROVISÓRIOS de `docs/02`)

```json
{
  "movement": { "base": 3, "mobilityDivisor": 10, "jumpUp": 2, "jumpDown": 3,
                "extraCost": { "shallow_water": 1, "ice": 1 }, "waterUsersIgnoreWater": true },
  "ct": { "threshold": 100, "speedBase": 4, "speedMobilityDivisor": 5 },
  "turn": { "timeoutSeconds": 60, "afkTimeoutSeconds": 10, "afkAfterConsecutive": 3, "defendDamageMultiplier": 0.7 },
  "accuracy": { "min": 5, "max": 95, "controlVsMobilityFactor": 0.5 },
  "height": { "rangeBonusMinDiff": 2, "accuracyPerStep": 10, "accuracyStepMinDiff": 2, "maxAccuracyBonus": 20 },
  "flank": { "side": { "accuracy": 15, "damage": 1.10 }, "back": { "accuracy": 30, "damage": 1.25 } },
  "damage": { "resistanceFactor": 0.5, "minDamage": 1, "waterOnShallowWaterBonus": 1.2 },
  "energy": { "maxBase": 40, "maxPerSpirit": 2, "regenBase": 2, "regenSpiritDivisor": 10, "regenFocusDivisor": 10, "focusCostReductionCap": 30 },
  "cellEffects": {
    "ice": { "rounds": 2, "moveExtraCost": 1, "accuracyBonusAgainstOccupant": 10 },
    "fire": { "rounds": 2, "damage": 8, "vegetationExtraRounds": 1 },
    "earth_wall": { "rounds": 3 },
    "gust": { "rounds": 2, "pushCells": 1 }
  },
  "flee": { "base": 30, "perMobility": 2, "perAdjacentEnemy": 10, "min": 10, "max": 90 },
  "disconnect": { "graceRounds": 3, "allDisconnectedPauseSeconds": 300 },
  "arena": { "common": 10, "boss": 16, "masterTrial": 12 },
  "ai": { "profiles": { "aggressive_melee": { "expectedDamage": 1.0, "...": 0 }, "balanced": { "...": 0 } } }
}
```

## 3. Formato da grade (`*.grid.json`)

```json
{
  "version": 1,
  "id": "test-arena",
  "width": 10,
  "height": 10,
  "heights": [[0,0,0,1,1,1,0,0,0,0], "...10 linhas..."],
  "terrain": [["g","g","w","w","g","g","r","r","g","g"], "...10 linhas..."],
  "blocked": [[0,0,0,0,0,0,1,0,0,0], "...10 linhas..."],
  "legend": { "g": "ground", "r": "rock", "w": "shallow_water", "v": "vegetation" },
  "spawns": { "players": [{ "x": 1, "y": 8 }], "enemies": [{ "x": 8, "y": 1 }] }
}
```

- Matrizes indexadas como `[y][x]`. O loader converte para `Grid` do core e marca `escape` na borda externa transitável.
- **Arena de teste da fatia 1 (`test-arena`)** deve ter: 3 níveis de altura (0, 1, 2 e um platô 3), uma faixa de `shallow_water` (rio de 2 células de largura atravessando o mapa), um bosque de `vegetation` (≥ 6 células), 2–3 rochas `blocked` que interrompem linha de visão, e um platô alto acessível por rampa (degraus de 1).

## 4. Técnica (schema)

```ts
export const TechniqueSchema = z.object({
  id: z.string(),                         // 'water.whip'
  element: z.enum(['water','earth','fire','air']).nullable(),  // null: técnica de monstro sem elemento (ADR-015)
  nameKey: z.string(),                    // i18n
  role: z.enum(['attack','defense','control','mobility']),
  target: z.enum(['enemy','ally','self','cell']),
  range: z.object({ min: z.number().int().min(0), max: z.number().int().min(0) }),
  rangeBonusFromHeight: z.boolean(),
  requiresLineOfSight: z.boolean(),
  area: z.discriminatedUnion('shape', [
    z.object({ shape: z.literal('single') }),
    z.object({ shape: z.literal('cross'), radius: z.number().int().min(1) }),
    z.object({ shape: z.literal('line'), length: z.number().int().min(1) }),
    z.object({ shape: z.literal('self') }),
  ]),
  energyCost: z.number().int().min(0),
  ctDelay: z.number().int().min(0),       // atraso extra; > 0 = técnica pesada
  accuracy: z.number().int().min(0).max(100),
  power: z.number().int().min(0),
  powerScaling: z.number().min(0),        // multiplicador do atributo power
  effects: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('damage') }),
    z.object({ kind: z.literal('heal') }),
    z.object({ kind: z.literal('status'), statusId: z.string(), rounds: z.number().int(), magnitude: z.number() }),
    z.object({ kind: z.literal('cellEffect'), effect: z.enum(['ice','fire','earth_wall','gust']) }),
    z.object({ kind: z.literal('dash'), maxCells: z.number().int(), ignoresTerrainCost: z.boolean(),
               straightLine: z.boolean().optional() }),   // straightLine: só em linha reta (fire.surge) — ADR-016
    z.object({ kind: z.literal('push'), cells: z.number().int() }),
  ])),
});
```

### 4.1 Técnicas de água (fatia 1) — PROVISÓRIO

| id | Nome provisório | Papel | Alvo | Alcance | Área | Custo | Atraso CT | Precisão | Poder | Escala | Efeitos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `water.whip` | Chicote d'água | ataque | inimigo | 1–3 | single | 8 | 0 | 90 | 10 | 0,8 | dano; +20% em água rasa |
| `water.shield` | Véu de água | defesa | aliado/si | 0–2 | single | 10 | 0 | 100 | 0 | 0 | status `shielded` 2 rodadas, −30% dano recebido |
| `water.freeze` | Corrente gélida | controle | célula | 2–4 | cross r1 | 14 | 10 | 85 | 6 | 0,4 | dano + `cellEffect: ice` em toda a área |
| `water.glide` | Deslize | mobilidade | célula | 1–4 | single | 6 | 0 | 100 | 0 | 0 | `dash` até 4 células, ignora custo de água/gelo; não gasta o movimento do turno |

### 4.2 Técnicas de fogo (fatia 1) — PROVISÓRIO

| id | Nome provisório | Papel | Alvo | Alcance | Área | Custo | Atraso CT | Precisão | Poder | Escala | Efeitos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fire.blast` | Rajada | ataque | inimigo | 1–4 | single | 8 | 0 | 85 | 12 | 0,9 | dano |
| `fire.wall` | Cortina de chamas | defesa/controle | célula | 1–3 | line 3 | 12 | 0 | 100 | 0 | 0 | `cellEffect: fire` em 3 células em linha perpendicular à direção do usuário |
| `fire.burst` | Explosão | ataque pesado | célula | 2–4 | cross r1 | 20 | 30 | 80 | 16 | 1,0 | dano em área (atinge aliados também) |
| `fire.surge` | Impulso ígneo | mobilidade | célula | 1–3 | single | 10 | 0 | 90 | 6 | 0,5 | `dash` em linha reta até 3 células; se terminar adjacente a inimigo, causa dano nele |

Todas as técnicas de alcance ≥ 2 têm `requiresLineOfSight: true` e `rangeBonusFromHeight: true`, exceto `water.shield` e `water.glide`.

## 5. Passivas e reações (fatia 1) — PROVISÓRIO

```ts
export const PassiveSchema = z.object({
  id: z.string(),
  nameKey: z.string(),
  reaction: z.object({
    trigger: z.enum(['hitByMelee', 'hitByAny', 'enemyEntersAdjacent']),
    effect: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('counterAttack'), damageMultiplier: z.number() }),
      z.object({ kind: z.literal('push'), cells: z.number().int() }),
      z.object({ kind: z.literal('status'), statusId: z.string(), rounds: z.number().int(), magnitude: z.number() }),
    ]),
  }),
});
```

| id | Dono | Gatilho | Efeito |
| --- | --- | --- | --- |
| `water.backflow` (Refluxo) | Usuário de água | atingido corpo a corpo (alcance 1) | empurra o atacante 1 célula para trás |
| `fire.ember` (Brasa) | Usuário de fogo | atingido corpo a corpo | aplica `burning` no atacante: 4 de dano no início do turno, 2 rodadas |
| `monster.counter` (Contra-ataque) | Fera de garra | atingido corpo a corpo | contra-ataque com 50% do dano do ataque básico |

Lembrete: máximo de 1 reação por combatente por rodada; reação não provoca reação.

## 6. Monstro da fatia 1 — PROVISÓRIO

```json
{
  "id": "monster.clawbeast",
  "nameKey": "monster.clawbeast.name",
  "role": "melee",
  "maxHp": 160,
  "attributes": { "power": 12, "control": 10, "resistance": 8, "mobility": 12, "spirit": 5, "focus": 5 },
  "techniqueIds": ["monster.claw", "monster.pounce"],
  "passiveIds": ["monster.counter"],
  "ai": { "profile": "aggressive_melee" }
}
```

| id | Alcance | Área | Custo | Atraso | Precisão | Poder | Escala | Efeito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `monster.claw` | 1 | single | 0 | 0 | 90 | 8 | 0,8 | dano |
| `monster.pounce` | 2–3 | single | 10 | 10 | 80 | 8 | 0,6 | `dash` até o alvo + dano |

Monstros usam energia igual aos jogadores (`maxEnergy = 40 + spirit*2`).

Dados: `packages/game-data/data/monsters/clawbeast.json` e `packages/game-data/data/techniques/monster.json`. As técnicas do monstro têm `element: null`. `monster.claw` (alcance 1) não exige linha de visão nem ganha alcance por altura; `monster.pounce` (alcance 2–3) segue a regra das técnicas de alcance ≥ 2 (`requiresLineOfSight` e `rangeBonusFromHeight` = `true`), com `dash` de até 3 células seguido de `damage`.

## 7. Presets de personagem da fatia 1 — PROVISÓRIO

| id | Elemento | maxHp | power | control | resistance | mobility | spirit | focus | Técnicas | Passiva |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `preset.water` | água | 100 | 10 | 14 | 10 | 12 | 12 | 12 | as 4 de água | `water.backflow` |
| `preset.fire` | fogo | 95 | 14 | 10 | 9 | 13 | 10 | 10 | as 4 de fogo | `fire.ember` |

Schema (`PresetSchema` em `@elemental/shared`): `id`, `nameKey` (i18n, ex.: `preset.water.name`), `element`, `maxHp`, `attributes`, `techniqueIds`, `passiveIds`. Arquivo: `packages/game-data/data/combatants/player-presets.json` (lista).

Notas de preenchimento dos dados (CORE-14):
- `fire.wall` tem papel "defesa/controle"; como `role` aceita um único valor, o dado usa `defense`.
- `nameKey` das técnicas e passivas segue `technique.<id>.name` / `passive.<id>.name`.
- Passivas ficam em `packages/game-data/data/passives.json` (lista).

A batalha de teste da fatia 1 aceita escolher **um preset** (1 jogador contra 1 ou 2 Feras de garra, configurável por query string `?enemies=2` em dev).

## 8. IA por utilidade — contrato

```ts
export interface AiContext { state: BattleState; actorId: string; data: GameData; rng?: RngState; profile?: string; }
export interface Candidate { actions: Action[]; score: number; debug: Record<string, number>; }
export function chooseActions(ctx: AiContext): Action[];   // sequência do turno (ex.: move + technique + endTurn)
```

- Gera candidatos: para cada célula alcançável (incluindo ficar parado) × cada técnica utilizável a partir dali × cada alvo válido, mais "só mover", "defender".
- Pontuação = soma ponderada de considerações normalizadas (0–1). Pesos por `ai.profile` em `rules.json` ou no arquivo do monstro.
- Considerações iniciais (fatia 1): dano esperado (`chance × dano`), chance de abater o alvo, risco (dano esperado que o inimigo pode causar na célula de destino), distância ao alvo preferido, vantagem de altura, ataque pelas costas/lado, evitar célula com `fire`.
- Empate: desempate com o RNG da batalha (determinístico).
- Limite de desempenho: a decisão deve levar < 50 ms numa arena 10 × 10 com 4 combatentes.
- Pesos: `rules.json` → `ai.profiles[perfil][idDaConsideração]` (PROVISÓRIO). O chamador informa o perfil (monstros: `ai.profile` do arquivo do monstro); padrão `balanced`.
- `rng` (opcional) só desempata; padrão = `state.rngState`, sem consumir o RNG da batalha.
- Garantia de validade: a sequência escolhida é simulada com `applyAction` antes de ser devolvida; se falhar, o próximo candidato é tentado. Se a batalha terminar no meio da sequência, devolve-se só o prefixo válido.
- `chooseActionsWithDebug(ctx)` devolve também os candidatos com `score` e `debug` (valor de cada consideração).
- Considerações implementadas (ids usados nos perfis): `expectedDamage` (chance × dano / vida restante, fogo amigo subtrai), `killChance`, `safety` (1 − dano esperado dos inimigos na célula de destino / vida), `protection` (estado `shielded` num aliado ameaçado e ainda sem escudo: magnitude × rodadas × dano esperado dos inimigos / vida; ADR-022), `closeness` (ao inimigo mais próximo), `heightAdvantage`, `flankAttack` (costas 1, lado 0,5), `avoidFire`. Perfis iniciais: `aggressive_melee` e `balanced` (PROVISÓRIO). `dash` com dano até uma célula (`fire.surge`) é avaliado na célula de chegada, com dano nos inimigos adjacentes a ela (como na resolução); `dash` sem dano (`water.glide`) continua avaliado a partir do destino do movimento (ADR-022).

## 9. API pública do `combat-core`

```ts
interface CombatantInput {
  id: string; team: Team; controller: 'player' | 'ai'; position: Position; facing: Facing;
  template: { kind: 'preset' | 'monster'; id: string };   // de onde vêm hp, atributos, técnicas e passivas
}
createBattle(input: { id: string; seed: number; grid: Grid; combatants: CombatantInput[]; data: GameData }): BattleState
applyAction(state: BattleState, action: Action, data: GameData): ApplyResult
getReachableCells(state: BattleState, actorId: string, data: GameData): Position[]
getTechniqueTargets(state: BattleState, actorId: string, techniqueId: string, data: GameData, from?: Position): Position[]
getAffectedCells(state: BattleState, actorId: string, techniqueId: string, target: Position, data: GameData): Position[]
predictTurnOrder(state: BattleState, count: number, data: GameData): string[]   // data: speed vem de rules.json
hasLineOfSight(grid: Grid, from: Position, to: Position): boolean
sliceArena(grid: Grid, center: Position, size: number): Grid
gridFromFile(file: GridFile): Grid                 // *.grid.json validado → Grid (marca células de fuga)
chooseActions(ctx: AiContext): Action[]
```

## 10. Internacionalização

Todas as chaves de texto (`nameKey`, motivos de rejeição, textos da HUD) ficam em `apps/client/src/i18n/pt-BR.json`. Exemplo de chaves: `technique.water.whip.name`, `technique.water.whip.desc`, `reject.out_of_range`, `hud.endTurn`.
