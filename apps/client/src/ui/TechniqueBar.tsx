import { gameData } from '@elemental/game-data';
import { useEffect } from 'react';
import { useStore } from 'zustand';
import { t } from '../i18n/i18n.ts';
import type { ClientStore } from '../store/store.ts';

/** Technique selection for range/area previews (CLI-04). Esc clears the selection. */
export function TechniqueBar({ store }: { store: ClientStore }) {
  const battle = useStore(store, (s) => s.battle);
  const actorId = useStore(store, (s) => s.actorId);
  const selected = useStore(store, (s) => s.selectedTechniqueId);
  const select = useStore(store, (s) => s.selectTechnique);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.getState().selectTechnique(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store]);
  const actor = battle?.combatants.find((c) => c.id === actorId);
  if (!actor) return null;
  return (
    <div
      className="widget"
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
      }}
    >
      <button
        type="button"
        data-testid="technique-none"
        aria-pressed={selected === null}
        onClick={() => store.getState().selectTechnique(null)}
      >
        {t('hud.move')}
      </button>
      {actor.techniqueIds.map((id) => (
        <button
          type="button"
          key={id}
          data-testid={`technique-${id}`}
          aria-pressed={selected === id}
          style={{ fontWeight: selected === id ? 'bold' : 'normal' }}
          onClick={() => select(id)}
        >
          {t(gameData.techniques[id]?.nameKey ?? id)}
        </button>
      ))}
    </div>
  );
}
