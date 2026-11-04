import { describe, expect, it } from 'vitest';
import { chooseActions, chooseActionsWithDebug } from '../src/ai/chooseActions.ts';
import { applyAction } from '../src/apply.ts';
import { nextInt, type RngState, seedRng } from '../src/rng.ts';
import type { BattleState, Cell, Combatant, Facing, Team, Terrain } from '../src/types.ts';
import { makeBattle, makeCombatant, makeData, makeGrid, makeTechnique } from './factories.ts';

const techniques = {
  't.claw': makeTechnique({ id: 't.claw', range: { min: 1, max: 1 }, energyCost: 0 }),
  't.bolt': makeTechnique({
    id: 't.bolt',
    range: { min: 2, max: 4 },
    requiresLineOfSight: true,
    rangeBonusFromHeight: true,
    accuracy: 80,
  }),
  't.burst': makeTechnique({
    id: 't.burst',
    target: 'cell',
    range: { min: 2, max: 4 },
    area: { shape: 'cross', radius: 1 },
    energyCost: 20,
  }),
  't.wall': makeTechnique({
    id: 't.wall',
    target: 'cell',
    area: { shape: 'line', length: 3 },
    effects: [{ kind: 'cellEffect', effect: 'fire' }],
  }),
  't.glide': makeTechnique({
    id: 't.glide',
    target: 'cell',
    range: { min: 1, max: 4 },
    effects: [{ kind: 'dash', maxCells: 4, ignoresTerrainCost: true }],
  }),
  't.surge': makeTechnique({
    id: 't.surge',
    target: 'cell',
    range: { min: 1, max: 3 },
    effects: [
      { kind: 'dash', maxCells: 3, ignoresTerrainCost: false, straightLine: true },
      { kind: 'damage' },
    ],
  }),
  't.pounce': makeTechnique({
    id: 't.pounce',
    range: { min: 2, max: 3 },
    effects: [{ kind: 'dash', maxCells: 3, ignoresTerrainCost: false }, { kind: 'damage' }],
  }),
  't.shield': makeTechnique({
    id: 't.shield',
    target: 'ally',
    range: { min: 0, max: 2 },
    effects: [{ kind: 'status', statusId: 'shielded', rounds: 2, magnitude: 0.3 }],
  }),
};
const data = makeData({ techniques });
const ids = Object.keys(techniques);

function applyAll(state: BattleState, actions: ReturnType<typeof chooseActions>) {
  let current = state;
  for (const action of actions) {
    const result = applyAction(current, action, data);
    if (!result.ok) return { ok: false as const, reason: result.reason, action };
    current = result.state;
  }
  return { ok: true as const, state: current };
}

function randomState(seed: number): BattleState {
  let rng: RngState = seedRng(seed);
  const int = (min: number, max: number) => {
    const [v, n] = nextInt(rng, min, max);
    rng = n;
    return v;
  };
  const terrains: Terrain[] = ['ground', 'ground', 'shallow_water', 'vegetation'];
  const cells: Cell[] = Array.from({ length: 100 }, () => {
    const blocked = int(1, 12) === 1;
    const effectRoll = int(1, 10);
    const effect =
      effectRoll === 1
        ? { kind: 'fire' as const, roundsLeft: 2, sourceId: 'x' }
        : effectRoll === 2
          ? { kind: 'ice' as const, roundsLeft: 2, sourceId: 'x' }
          : undefined;
    return {
      height: int(0, 3),
      terrain: blocked ? 'rock' : (terrains[int(0, 3)] as Terrain),
      blocked,
      escape: false,
      ...(effect && !blocked ? { effect } : {}),
    };
  });
  const free = cells.map((c, i) => (c.blocked ? -1 : i)).filter((i) => i >= 0);
  const facings: Facing[] = ['N', 'E', 'S', 'W'];
  const combatants: Combatant[] = [];
  const teams: Team[] = ['players', 'players', 'enemies', 'enemies'];
  for (let k = 0; k < 4; k++) {
    const index = free.splice(int(0, free.length - 1), 1)[0] ?? 0;
    combatants.push(
      makeCombatant({
        id: `c${k}`,
        team: teams[k] as Team,
        element: int(0, 1) ? 'water' : 'fire',
        position: { x: index % 10, y: Math.floor(index / 10) },
        facing: facings[int(0, 3)] as Facing,
        hp: int(1, 100),
        energy: int(0, 50),
        techniqueIds: ids.filter(() => int(0, 1) === 1),
        attributes: {
          power: int(5, 15),
          control: int(5, 15),
          resistance: int(5, 15),
          mobility: int(5, 25),
          spirit: 10,
          focus: int(0, 20),
        },
      }),
    );
  }
  const actor = combatants[int(0, 3)]?.id ?? 'c0';
  return makeBattle({
    seed,
    rngState: seed,
    grid: { width: 10, height: 10, cells },
    combatants,
    turn: {
      combatantId: actor,
      hasMoved: int(0, 3) === 0,
      hasActed: int(0, 5) === 0,
      usedTechniqueId: null,
    },
  });
}

describe('chooseActions', () => {
  const duel = () =>
    makeBattle({
      combatants: [
        makeCombatant({
          id: 'm1',
          team: 'enemies',
          controller: 'ai',
          position: { x: 2, y: 2 },
          techniqueIds: ['t.claw', 't.bolt'],
        }),
        makeCombatant({ id: 'p1', position: { x: 6, y: 2 } }),
      ],
      turn: { combatantId: 'm1', hasMoved: false, hasActed: false, usedTechniqueId: null },
    });

  it('always ends the turn and prefers an attack when one is possible', () => {
    const actions = chooseActions({ state: duel(), actorId: 'm1', data });
    expect(actions.at(-1)).toEqual({ type: 'endTurn', actorId: 'm1' });
    expect(actions.some((a) => a.type === 'technique')).toBe(true);
  });

  it('with a fixed seed always chooses the same sequence', () => {
    const runs = Array.from({ length: 5 }, () =>
      JSON.stringify(chooseActions({ state: duel(), actorId: 'm1', data })),
    );
    expect(new Set(runs).size).toBe(1);
    const tiesA = JSON.stringify(chooseActions({ state: duel(), actorId: 'm1', data, rng: 7 }));
    expect(JSON.stringify(chooseActions({ state: duel(), actorId: 'm1', data, rng: 7 }))).toBe(
      tiesA,
    );
  });

  it('exposes per-candidate debug values', () => {
    const { candidates } = chooseActionsWithDebug({ state: duel(), actorId: 'm1', data });
    expect(candidates.length).toBeGreaterThan(10);
    expect(candidates[0]?.debug).toHaveProperty('expectedDamage');
  });

  it('never returns an invalid action (500 random valid states)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const state = randomState(seed);
      const actorId = state.turn?.combatantId ?? '';
      const actions = chooseActions({ state, actorId, data });
      const result = applyAll(state, actions);
      expect(result, `seed ${seed}: ${JSON.stringify(actions)}`).toMatchObject({ ok: true });
    }
  });

  it('decides in < 50 ms on a 10 × 10 arena with 4 combatants', () => {
    const states = Array.from({ length: 20 }, (_, i) => randomState(1000 + i));
    for (const s of states.slice(0, 3))
      chooseActions({ state: s, actorId: s.turn?.combatantId ?? '', data });
    let worst = 0;
    for (const s of states) {
      const start = performance.now();
      chooseActions({
        state: {
          ...s,
          turn: {
            ...(s.turn ?? { combatantId: 'c0', usedTechniqueId: null }),
            hasMoved: false,
            hasActed: false,
          },
        },
        actorId: s.turn?.combatantId ?? '',
        data,
      });
      worst = Math.max(worst, performance.now() - start);
    }
    expect(worst).toBeLessThan(50);
  });
});
