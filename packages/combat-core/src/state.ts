import type { BattleState, Cell, Combatant, Grid, Position } from './types.ts';

// Immutable update helpers. Nothing here mutates its input.

export const cellIndex = (grid: Grid, pos: Position): number => pos.y * grid.width + pos.x;

export function getCombatant(state: BattleState, id: string): Combatant | undefined {
  return state.combatants.find((c) => c.id === id);
}

export function requireCombatant(state: BattleState, id: string): Combatant {
  const combatant = getCombatant(state, id);
  if (!combatant) throw new Error(`Unknown combatant: ${id}`);
  return combatant;
}

export function updateCombatant(
  state: BattleState,
  id: string,
  update: (combatant: Combatant) => Combatant,
): BattleState {
  let found = false;
  const combatants = state.combatants.map((c) => {
    if (c.id !== id) return c;
    found = true;
    return update(c);
  });
  if (!found) throw new Error(`Unknown combatant: ${id}`);
  return { ...state, combatants };
}

export function updateCell(grid: Grid, pos: Position, update: (cell: Cell) => Cell): Grid {
  const index = cellIndex(grid, pos);
  const current = grid.cells[index];
  if (!current) throw new Error(`Cell out of bounds: ${pos.x},${pos.y}`);
  const cells = grid.cells.slice();
  cells[index] = update(current);
  return { ...grid, cells };
}

export function updateGridCell(
  state: BattleState,
  pos: Position,
  update: (cell: Cell) => Cell,
): BattleState {
  return { ...state, grid: updateCell(state.grid, pos, update) };
}

export const samePosition = (a: Position, b: Position): boolean => a.x === b.x && a.y === b.y;
