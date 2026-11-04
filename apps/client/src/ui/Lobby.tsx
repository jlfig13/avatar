import { gameData } from '@elemental/game-data';
import { type FormEvent, useState } from 'react';
import { useStore } from 'zustand';
import { t } from '../i18n/i18n.ts';
import type { BattleConnection } from '../net/connection.ts';
import type { ClientStore } from '../store/store.ts';

const panel = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: 24,
  background: 'rgba(10, 8, 18, 0.88)',
  border: '1px solid #3a3550',
  minWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
} as const;

/** CLI-06 — invite (first access) and preset choice. */
export function Lobby({
  store,
  connection,
  enemies,
}: {
  store: ClientStore;
  connection: BattleConnection;
  enemies: number;
}) {
  const status = useStore(store, (s) => s.connection);
  const [hasToken, setHasToken] = useState(connection.hasToken);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    const result = await connection.redeem(code.trim());
    if (result === 'ok') setHasToken(true);
    else setError(t(`lobby.error.${result}`));
  };

  if (!hasToken) {
    return (
      <form className="widget" style={panel} onSubmit={redeem}>
        <strong>{t('lobby.title')}</strong>
        <label>
          {t('lobby.inviteLabel')}
          <input
            data-testid="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
        <button type="submit" data-testid="redeem" disabled={code.trim() === ''}>
          {t('lobby.redeem')}
        </button>
        {error && <span role="alert">{error}</span>}
      </form>
    );
  }
  return (
    <div className="widget" style={panel}>
      <strong>{t('lobby.choosePreset')}</strong>
      <span style={{ opacity: 0.7 }}>{t('lobby.enemies', { count: enemies })}</span>
      {Object.values(gameData.presets).map((preset) => (
        <button
          type="button"
          key={preset.id}
          data-testid={`preset-${preset.id}`}
          disabled={status === 'connecting'}
          onClick={() =>
            void connection.join(preset.id, enemies).then(() => setHasToken(connection.hasToken))
          }
        >
          {t(preset.nameKey)}
        </button>
      ))}
      {status === 'connecting' && <span>{t('lobby.connecting')}</span>}
      {status === 'error' && <span role="alert">{t('lobby.connectionError')}</span>}
    </div>
  );
}
