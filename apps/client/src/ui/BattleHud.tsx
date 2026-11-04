import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { t } from '../i18n/i18n.ts';
import type { ClientStore } from '../store/store.ts';

/** Minimal battle HUD for CLI-06 (turn, timer, rejection message); the full HUD is CLI-10. */
export function BattleHud({ store, onLeave }: { store: ClientStore; onLeave: () => void }) {
  const battle = useStore(store, (s) => s.battle);
  const actorId = useStore(store, (s) => s.actorId);
  const rejected = useStore(store, (s) => s.rejected);
  const timer = useStore(store, (s) => s.turnTimer);
  const send = useStore(store, (s) => s.sendIntent);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!rejected) return;
    const id = window.setTimeout(() => store.getState().setRejected(null), 2500);
    return () => window.clearTimeout(id);
  }, [rejected, store]);
  if (!battle) return null;
  const active = battle.combatants.find((c) => c.id === battle.turn?.combatantId);
  const mine = battle.turn?.combatantId === actorId && battle.phase === 'running';
  const seconds =
    timer && timer.combatantId === actorId
      ? Math.max(0, Math.round((timer.deadline - now) / 1000))
      : null;
  return (
    <div
      className="widget"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {battle.phase !== 'running' ? (
        <strong data-testid="battle-result">{t(`hud.result.${battle.phase}`)}</strong>
      ) : (
        <span data-testid="turn-label">
          {mine ? t('hud.yourTurn') : t('hud.waiting', { name: active ? t(active.name) : '…' })}
        </span>
      )}
      {mine && seconds !== null && (
        <span data-testid="turn-timer">{t('hud.timeLeft', { seconds })}</span>
      )}
      {mine && send && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            data-testid="intent-defend"
            disabled={battle.turn?.hasActed}
            onClick={() => send({ kind: 'defend' })}
          >
            {t('hud.defend')}
          </button>
          <button
            type="button"
            data-testid="intent-flee"
            disabled={battle.turn?.hasActed}
            onClick={() => send({ kind: 'flee' })}
          >
            {t('hud.flee')}
          </button>
          <button
            type="button"
            data-testid="intent-endTurn"
            onClick={() => send({ kind: 'endTurn' })}
          >
            {t('hud.endTurn')}
          </button>
        </div>
      )}
      {battle.phase !== 'running' && (
        <button type="button" data-testid="leave" onClick={onLeave}>
          {t('hud.leave')}
        </button>
      )}
      {rejected && (
        <span role="alert" data-testid="rejected" style={{ color: '#ffb3a7' }}>
          {t(`reject.${rejected.reason}`)}
        </span>
      )}
    </div>
  );
}
