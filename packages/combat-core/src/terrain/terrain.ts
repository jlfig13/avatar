import type { GameData } from '@elemental/shared';
import type { BattleEventBody } from '../events.ts';
import { getCell } from '../grid/grid.ts';
import { samePosition, updateGridCell } from '../state.ts';
import { applyDamage } from '../techniques/hp.ts';
import type { BattleState, CellEffectKind, Facing, Position } from '../types.ts';

// docs/02 §8 — temporary elemental terrain. The most recent effect replaces the previous one.

type Result = { state: BattleState; events: BattleEventBody[] };

export function applyCellEffect(
  state: BattleState,
  pos: Position,
  kind: CellEffectKind,
  sourceId: string,
  data: GameData,
  direction?: Facing,
): Result {
  const cell = getCell(state.grid, pos);
  if (!cell || cell.blocked) return { state, events: [] };
  if (kind === 'fire' && cell.terrain === 'shallow_water') return { state, events: [] };
  const occupied = state.combatants.some(
    (c) => c.alive && !c.fled && samePosition(c.position, pos),
  );
  // A wall under a combatant would trap it inside a blocked cell (ADR-017).
  if (kind === 'earth_wall' && occupied) return { state, events: [] };
  const { cellEffects } = data.rules;
  let rounds = cellEffects[kind].rounds;
  if (kind === 'fire' && cell.terrain === 'vegetation')
    rounds += cellEffects.fire.vegetationExtraRounds;
  const effect =
    kind === 'gust' && direction
      ? { kind, roundsLeft: rounds, sourceId, direction }
      : { kind, roundsLeft: rounds, sourceId };
  const next = updateGridCell(state, pos, (c) => ({ ...c, effect }));
  return { state: next, events: [{ type: 'cellEffectApplied', position: pos, kind, rounds }] };
}

/** Fire damage for a combatant standing on / entering a burning cell (no-op elsewhere). */
export function fireDamageAt(
  state: BattleState,
  combatantId: string,
  pos: Position,
  data: GameData,
): Result {
  if (getCell(state.grid, pos)?.effect?.kind !== 'fire') return { state, events: [] };
  return applyDamage(state, combatantId, data.rules.cellEffects.fire.damage, 'terrain');
}

/** End of round: every cell effect loses one round and expires at 0. */
export function tickCellEffects(state: BattleState): Result {
  const events: BattleEventBody[] = [];
  let changed = false;
  const cells = state.grid.cells.map((cell, i) => {
    if (!cell.effect) return cell;
    changed = true;
    const roundsLeft = cell.effect.roundsLeft - 1;
    if (roundsLeft > 0) return { ...cell, effect: { ...cell.effect, roundsLeft } };
    const position = { x: i % state.grid.width, y: Math.floor(i / state.grid.width) };
    events.push({ type: 'cellEffectExpired', position, kind: cell.effect.kind });
    const { effect: _expired, ...rest } = cell;
    return rest;
  });
  if (!changed) return { state, events };
  return { state: { ...state, grid: { ...state.grid, cells } }, events };
}
