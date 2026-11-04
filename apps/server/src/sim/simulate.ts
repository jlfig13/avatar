import {
  applyAction,
  type BattleEvent,
  type BattleState,
  type CombatantInput,
  chooseActions,
  createBattle,
  gridFromFile,
} from '@elemental/combat-core';
import type { GameData } from '@elemental/shared';

// QA-01 — AI × AI balance simulator. Pure: no IO, deterministic per seed.

/** Report-only estimate from the issue: player turns × 20 s + AI turns × 3 s. */
export const PLAYER_TURN_SECONDS = 20;
export const AI_TURN_SECONDS = 3;
/** Safety net against stalemates (counted as 'stalemate'). */
export const MAX_TURNS = 300;

export interface SimConfig {
  readonly presetId: string;
  readonly enemies: number;
  readonly mapId?: string;
  readonly monsterId?: string;
}

export interface BattleReport {
  readonly seed: number;
  readonly presetId: string;
  readonly enemies: number;
  readonly result: 'victory' | 'defeat' | 'fled' | 'stalemate';
  readonly rounds: number;
  readonly playerTurns: number;
  readonly aiTurns: number;
  readonly durationSeconds: number;
  readonly techniqueUses: Record<string, number>;
  readonly techniqueDamage: Record<string, number>;
}

function setup(config: SimConfig, seed: number, data: GameData): BattleState {
  const map = data.maps[config.mapId ?? 'test-arena'];
  if (!map) throw new Error(`map ${config.mapId} not found`);
  const [playerSpawn] = map.spawns.players;
  if (!playerSpawn || map.spawns.enemies.length < config.enemies)
    throw new Error('not enough spawns');
  const combatants: CombatantInput[] = [
    {
      id: 'player',
      team: 'players',
      controller: 'ai',
      position: playerSpawn,
      facing: 'N',
      template: { kind: 'preset', id: config.presetId },
    },
    ...map.spawns.enemies.slice(0, config.enemies).map(
      (position, i): CombatantInput => ({
        id: `enemy${i + 1}`,
        team: 'enemies',
        controller: 'ai',
        position,
        facing: 'S',
        template: { kind: 'monster', id: config.monsterId ?? 'monster.clawbeast' },
      }),
    ),
  ];
  return createBattle({ id: `sim-${seed}`, seed, grid: gridFromFile(map), combatants, data });
}

export function simulateBattle(config: SimConfig, seed: number, data: GameData): BattleReport {
  let state = setup(config, seed, data);
  const monsterProfile =
    data.monsters[config.monsterId ?? 'monster.clawbeast']?.ai.profile ?? 'balanced';
  const uses: Record<string, number> = {};
  const damage: Record<string, number> = {};
  let playerTurns = 0;
  let aiTurns = 0;
  let current: string | null = null;
  const track = (events: readonly BattleEvent[]) => {
    for (const e of events) {
      if (e.type === 'techniqueUsed') {
        current = e.techniqueId;
        uses[e.techniqueId] = (uses[e.techniqueId] ?? 0) + 1;
      } else if (e.type === 'damaged' && e.source === 'technique' && current) {
        damage[current] = (damage[current] ?? 0) + e.amount;
      }
    }
  };
  const apply = (action: Parameters<typeof applyAction>[1]) => {
    const result = applyAction(state, action, data);
    if (!result.ok) throw new Error(`seed ${seed}: ${action.type} rejected (${result.reason})`);
    state = result.state;
    track(result.events);
  };

  for (let turns = 0; state.phase === 'running' && turns < MAX_TURNS; turns++) {
    apply({ type: 'advance' });
    const actorId = state.turn?.combatantId;
    if (!actorId || state.phase !== 'running') continue;
    const actor = state.combatants.find((c) => c.id === actorId);
    const isPlayer = actor?.team === 'players';
    if (isPlayer) playerTurns++;
    else aiTurns++;
    const actions = chooseActions({
      state,
      actorId,
      data,
      profile: isPlayer ? 'balanced' : monsterProfile,
    });
    for (const action of actions) {
      if (state.phase !== 'running') break;
      apply(action);
    }
  }
  const result = state.phase === 'running' ? 'stalemate' : state.phase;
  return {
    seed,
    presetId: config.presetId,
    enemies: config.enemies,
    result,
    rounds: state.round,
    playerTurns,
    aiTurns,
    durationSeconds: playerTurns * PLAYER_TURN_SECONDS + aiTurns * AI_TURN_SECONDS,
    techniqueUses: uses,
    techniqueDamage: damage,
  };
}

export interface ConfigSummary {
  readonly presetId: string;
  readonly enemies: number;
  readonly battles: number;
  readonly results: Record<BattleReport['result'], number>;
  readonly winRate: number;
  readonly avgRounds: number;
  readonly avgPlayerTurns: number;
  readonly avgAiTurns: number;
  readonly avgDurationSeconds: number;
  readonly techniques: {
    id: string;
    uses: number;
    usesPerBattle: number;
    damage: number;
    damagePerUse: number;
  }[];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function summarize(reports: readonly BattleReport[]): ConfigSummary[] {
  const groups = new Map<string, BattleReport[]>();
  for (const r of reports) {
    const key = `${r.presetId}|${r.enemies}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map((group) => {
    const first = group[0] as BattleReport;
    const results = { victory: 0, defeat: 0, fled: 0, stalemate: 0 };
    for (const r of group) results[r.result]++;
    const ids = [...new Set(group.flatMap((r) => Object.keys(r.techniqueUses)))].sort();
    return {
      presetId: first.presetId,
      enemies: first.enemies,
      battles: group.length,
      results,
      winRate: results.victory / group.length,
      avgRounds: mean(group.map((r) => r.rounds)),
      avgPlayerTurns: mean(group.map((r) => r.playerTurns)),
      avgAiTurns: mean(group.map((r) => r.aiTurns)),
      avgDurationSeconds: mean(group.map((r) => r.durationSeconds)),
      techniques: ids.map((id) => {
        const uses = group.reduce((a, r) => a + (r.techniqueUses[id] ?? 0), 0);
        const damage = group.reduce((a, r) => a + (r.techniqueDamage[id] ?? 0), 0);
        return {
          id,
          uses,
          usesPerBattle: uses / group.length,
          damage,
          damagePerUse: uses ? damage / uses : 0,
        };
      }),
    };
  });
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmt = (v: number) => v.toFixed(2);
const minutes = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function toMarkdown(
  summaries: readonly ConfigSummary[],
  meta: { battles: number; firstSeed: number; elapsedMs: number },
): string {
  const lines = [
    '# Relatório do simulador de balanceamento (QA-01)',
    '',
    `Batalhas por configuração: ${meta.battles} · seeds a partir de ${meta.firstSeed} · tempo: ${(meta.elapsedMs / 1000).toFixed(1)} s`,
    `Duração estimada = turnos do jogador × ${PLAYER_TURN_SECONDS} s + turnos de IA × ${AI_TURN_SECONDS} s. Jogador: IA \`balanced\`.`,
    '',
    '| Preset | Inimigos | Vitória | Derrota | Fuga | Empate | Rodadas | Turnos jogador | Turnos IA | Duração |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...summaries.map(
      (s) =>
        `| ${s.presetId} | ${s.enemies} | ${pct(s.winRate)} | ${s.results.defeat} | ${s.results.fled} | ${s.results.stalemate} | ${fmt(s.avgRounds)} | ${fmt(s.avgPlayerTurns)} | ${fmt(s.avgAiTurns)} | ${minutes(s.avgDurationSeconds)} |`,
    ),
  ];
  for (const s of summaries) {
    lines.push(
      '',
      `## ${s.presetId} × ${s.enemies}`,
      '',
      '| Técnica | Usos | Usos/batalha | Dano total | Dano/uso |',
      '| --- | --- | --- | --- | --- |',
      ...s.techniques.map(
        (t) =>
          `| ${t.id} | ${t.uses} | ${fmt(t.usesPerBattle)} | ${t.damage} | ${fmt(t.damagePerUse)} |`,
      ),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function toCsv(reports: readonly BattleReport[]): string {
  const ids = [...new Set(reports.flatMap((r) => Object.keys(r.techniqueUses)))].sort();
  const header = [
    'seed',
    'preset',
    'enemies',
    'result',
    'rounds',
    'playerTurns',
    'aiTurns',
    'durationSeconds',
    ...ids.flatMap((id) => [`uses:${id}`, `damage:${id}`]),
  ];
  const rows = reports.map((r) =>
    [
      r.seed,
      r.presetId,
      r.enemies,
      r.result,
      r.rounds,
      r.playerTurns,
      r.aiTurns,
      r.durationSeconds,
      ...ids.flatMap((id) => [r.techniqueUses[id] ?? 0, r.techniqueDamage[id] ?? 0]),
    ].join(','),
  );
  return `${[header.join(','), ...rows].join('\n')}\n`;
}
