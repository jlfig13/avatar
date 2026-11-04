# @elemental/server

Servidor autoritativo (Colyseus) do MMORPG Elemental. Visão geral em `docs/04-arquitetura.md`.

## Rodar

```bash
docker compose up -d      # PostgreSQL local (raiz do repositório)
pnpm db:migrate           # aplica as migrações
pnpm db:seed              # cria os convites de INVITE_CODES (idempotente)
pnpm dev                  # sobe o servidor em ws://localhost:2567
```

Rotas HTTP: `GET /health` e `POST /auth/redeem { inviteCode }` → `{ accountId, token }` (o token só é mostrado uma vez). A sala `battle` exige o token (`client.auth.token`) e as opções `{ presetId, enemies }`.

## Módulos

- `modules/account` — convites, conta anônima por token (só o hash SHA-256 é guardado), limite de tentativas por IP, `onAuth`.
- `modules/combat` — `BattleSession` (estado + ações + replay) e `BattleRoom` (intenções, timer de turno, IA, reconexão).
- `modules/telemetry` — `battle_started` / `battle_ended` em `telemetry_events` (falhas só geram log).
- `src/sim` — simulador de balanceamento (`pnpm test:sim`).

## Consultas de telemetria (SRV-06)

Duração média e taxa de vitória das batalhas encerradas:

```sql
select
  count(*)                                                          as battles,
  round(avg((payload->>'durationSeconds')::numeric), 1)             as avg_duration_s,
  round(avg((payload->>'rounds')::numeric), 1)                      as avg_rounds,
  round(100.0 * avg(((payload->>'result') = 'victory')::int), 1)    as win_rate_pct
from telemetry_events
where type = 'battle_ended';
```

Por preset (junta início e fim pela sessão):

```sql
select
  s.payload->>'presetId'                                            as preset,
  (s.payload->>'enemies')::int                                      as enemies,
  count(*)                                                          as battles,
  round(avg((e.payload->>'durationSeconds')::numeric), 1)           as avg_duration_s,
  round(100.0 * avg(((e.payload->>'result') = 'victory')::int), 1)  as win_rate_pct
from telemetry_events s
join telemetry_events e on e.session_id = s.session_id and e.type = 'battle_ended'
where s.type = 'battle_started'
group by 1, 2
order by 1, 2;
```
