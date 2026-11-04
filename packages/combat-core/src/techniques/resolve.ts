import type { GameData, Technique } from '@elemental/shared';
import { accept, type BattleEventBody, reject, type StepResult } from '../events.ts';
import { facingOf, manhattan } from '../grid/grid.ts';
import { isHostile } from '../pathfinding/pathfinding.ts';
import { rollInt } from '../rng.ts';
import { requireCombatant, samePosition, updateCombatant } from '../state.ts';
import { areaCells, checkTarget } from '../targeting/targeting.ts';
import { applyCellEffect } from '../terrain/terrain.ts';
import { resetTimeouts } from '../turn/handlers.ts';
import type { Action, BattleState, Combatant, Position } from '../types.ts';
import { damageAmount, effectiveCost, healAmount, hitChance } from './formulas.ts';
import { applyDamage, applyHeal } from './hp.ts';
import { dashPathToCell, dashPathToEnemy, push, travel } from './movement.ts';

type TechniqueAction = Extract<Action, { type: 'technique' }>;

const isActive = (c: Combatant) => c.alive && !c.fled;

/**
 * Combatants hit by the technique. After a dash to a cell (fire.surge) the damage goes to enemies
 * adjacent to the landing cell; otherwise it is everyone in the affected cells (allies included —
 * docs/05 §4.2 fire.burst). Enemy/cell techniques never hit their own user.
 */
function victimsOf(
  state: BattleState,
  userId: string,
  technique: Technique,
  affected: readonly Position[],
  dashed: boolean,
): Combatant[] {
  const user = requireCombatant(state, userId);
  if (dashed && technique.target === 'cell') {
    return state.combatants.filter(
      (c) => isActive(c) && isHostile(user, c) && manhattan(c.position, user.position) === 1,
    );
  }
  const selfAllowed = technique.target === 'ally' || technique.target === 'self';
  return state.combatants.filter(
    (c) =>
      isActive(c) &&
      (selfAllowed || c.id !== userId) &&
      affected.some((p) => samePosition(p, c.position)),
  );
}

/** docs/02 §6.5 — techniques on oneself, allies or empty cells always hit. */
const needsRoll = (technique: Technique, user: Combatant, victim: Combatant) =>
  (technique.target === 'enemy' || technique.target === 'cell') && victim.id !== user.id;

export function handleTechnique(
  state: BattleState,
  action: TechniqueAction,
  data: GameData,
): StepResult {
  const turn = state.turn;
  if (!turn) throw new Error('no active turn');
  if (turn.hasActed) return reject('already_acted');
  const user = requireCombatant(state, action.actorId);
  const technique = data.techniques[action.techniqueId];
  if (!technique || !user.techniqueIds.includes(action.techniqueId))
    return reject('unknown_technique');
  const cost = effectiveCost(technique, user, data);
  if (user.energy < cost) return reject('not_enough_energy');
  const check = checkTarget(state, user, technique, action.target, data);
  if (check !== 'ok') return reject(check);

  const dash = technique.effects.find((e) => e.kind === 'dash');
  let dashPath: Position[] | null = null;
  if (dash) {
    dashPath =
      technique.target === 'enemy'
        ? dashPathToEnemy(state, user, dash, action.target, data)
        : dashPathToCell(state, user, dash, action.target, data);
    if (!dashPath) return reject('unreachable');
  }

  // Pay, face the target (docs/02 §6.4) and spend the action. A dash never spends the movement.
  let next = resetTimeouts(state, user.id);
  const facing = facingOf(user.position, action.target, user.facing);
  next = updateCombatant(next, user.id, (c) => ({ ...c, energy: c.energy - cost, facing }));
  next = { ...next, turn: { ...turn, hasActed: true, usedTechniqueId: technique.id } };
  const affected = areaCells(next.grid, technique, user.position, facing, action.target);
  const events: BattleEventBody[] = [
    {
      type: 'techniqueUsed',
      combatantId: user.id,
      techniqueId: technique.id,
      target: action.target,
      affectedCells: affected,
    },
  ];
  const take = (result: { state: BattleState; events: BattleEventBody[] }) => {
    next = result.state;
    events.push(...result.events);
  };

  if (dashPath) {
    take(travel(next, user.id, dashPath, data));
    if (technique.target === 'enemy' && requireCombatant(next, user.id).alive) {
      const landed = requireCombatant(next, user.id);
      const toward = facingOf(landed.position, action.target, landed.facing);
      next = updateCombatant(next, user.id, (c) => ({ ...c, facing: toward }));
    }
  }

  // One accuracy roll per victim; every other effect applies to the victims that were hit.
  const caster = requireCombatant(next, user.id);
  const rolls = technique.effects.some((e) => e.kind === 'damage');
  const hits: string[] = [];
  for (const victim of victimsOf(next, user.id, technique, affected, dashPath !== null)) {
    if (rolls && needsRoll(technique, caster, victim)) {
      const [roll, rolled] = rollInt(next, 1, 100);
      next = rolled;
      if (roll > hitChance(next.grid, technique, caster, victim, data)) {
        events.push({ type: 'missed', attackerId: caster.id, targetId: victim.id });
        continue;
      }
    }
    hits.push(victim.id);
  }

  for (const effect of technique.effects) {
    if (effect.kind === 'cellEffect') {
      // Terrain goes on every affected cell regardless of hits (docs/02 §8).
      for (const cell of affected) {
        take(applyCellEffect(next, cell, effect.effect, caster.id, data, caster.facing));
      }
      continue;
    }
    for (const id of hits) {
      const victim = requireCombatant(next, id);
      if (!victim.alive) continue;
      switch (effect.kind) {
        case 'damage':
          take(
            applyDamage(
              next,
              id,
              damageAmount(next.grid, technique, caster, victim, data),
              'technique',
            ),
          );
          break;
        case 'heal':
          take(applyHeal(next, id, healAmount(technique, caster)));
          break;
        case 'status':
          next = updateCombatant(next, id, (c) => ({
            ...c,
            status: [
              ...c.status.filter((s) => s.id !== effect.statusId),
              { id: effect.statusId, roundsLeft: effect.rounds, magnitude: effect.magnitude },
            ],
          }));
          events.push({
            type: 'statusApplied',
            targetId: id,
            statusId: effect.statusId,
            rounds: effect.rounds,
          });
          break;
        case 'push':
          take(
            push(
              next,
              id,
              facingOf(caster.position, victim.position, caster.facing),
              effect.cells,
              data,
            ),
          );
          break;
        case 'dash':
          break;
      }
    }
  }
  return accept(next, events);
}
