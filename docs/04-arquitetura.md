# 04 — Arquitetura técnica

## 1. Princípios

1. **Servidor autoritativo.** O servidor decide todo resultado de jogo. O cliente envia intenções e anima eventos.
2. **Um único motor de regras.** `@elemental/combat-core` é TypeScript puro e roda no servidor (execução real), no cliente (previews de alcance e caminho) e nos testes/simulador.
3. **Determinismo.** Mesmo estado inicial + mesma seed + mesmas ações = mesmo resultado. Permite replay, testes e reprodução de bugs.
4. **Dados fora do código.** Técnicas, monstros e regras numéricas ficam em JSON validado por Zod.
5. **Monólito modular.** Um processo Node no servidor; os serviços do GDD viram módulos com fronteiras claras. Extrair para serviços só se houver necessidade real.
6. **Simplicidade para equipe solo.** Preferir menos peças. Nada de Redis, filas ou microserviços no protótipo.

## 2. Stack

| Área | Escolha | Observação |
| --- | --- | --- |
| Runtime | Node.js LTS atual (≥ 22) | Fixar em `.nvmrc` e `engines` |
| Linguagem | TypeScript, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | `tsconfig.base.json` compartilhado |
| Monorepo | pnpm workspaces | Sem Turborepo/Nx no início; scripts recursivos do pnpm bastam |
| Cliente | Vite + Babylon.js + React + Zustand | Canvas Babylon e overlay React separados |
| Servidor | Colyseus (salas) + HTTP do próprio Colyseus/Express para rotas REST simples | Combate executa numa sala Colyseus |
| Banco | PostgreSQL + Drizzle ORM + drizzle-kit | Docker Compose local |
| Validação | Zod | Dados de jogo e mensagens do cliente |
| Testes | Vitest (unit/integração), Playwright (E2E) | Simulador próprio para balanceamento |
| Qualidade | Biome (lint + format) | CI no GitHub Actions |
| Erros | Sentry (cliente e servidor) | DSN por variável de ambiente; desligado se vazio |
| Deploy | Cliente em CDN estática; servidor no Fly.io ou Render; Postgres gerenciado | WebSocket precisa estar habilitado |
| Assets | Git LFS (`*.blend`, `*.glb`, `*.ktx2`, `*.png`, `*.wav`, `*.ogg`) | Atenção à cota do GitHub |

Versões: usar a **última versão estável** de cada dependência no momento da instalação e registrar em `package.json`. Não usar versões beta/RC.

## 3. Estrutura do monorepo

```
elemental/
├── CLAUDE.md
├── README.md
├── package.json                 # scripts raiz (dev, test, lint, build...)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── biome.json
├── .nvmrc
├── .gitattributes               # regras do Git LFS
├── .env.example
├── docker-compose.yml           # PostgreSQL local
├── .github/workflows/ci.yml
├── .claude/commands/            # comandos personalizados do Claude Code
├── docs/                        # esta documentação
│
├── packages/
│   ├── shared/                  # @elemental/shared
│   │   └── src/
│   │       ├── schemas/         # Zod: dados de jogo, grade, mensagens de rede
│   │       ├── protocol.ts      # tipos das mensagens cliente ↔ servidor
│   │       └── index.ts
│   │
│   ├── combat-core/             # @elemental/combat-core (TS puro, sem dependências de runtime além de shared)
│   │   ├── src/
│   │   │   ├── types.ts         # BattleState, Combatant, Cell, Action, BattleEvent
│   │   │   ├── rng.ts           # PRNG com seed (ex.: mulberry32 ou sfc32)
│   │   │   ├── grid/            # grade, recorte, vizinhança, altura
│   │   │   ├── pathfinding/     # A*
│   │   │   ├── ct/              # barra de tempo
│   │   │   ├── turn/            # fluxo do turno, validação de ações
│   │   │   ├── targeting/       # alcance, área, linha de visão
│   │   │   ├── modifiers/       # altura, flanco, terreno
│   │   │   ├── techniques/      # resolução de técnicas, energia, estados
│   │   │   ├── terrain/         # efeitos temporários
│   │   │   ├── reactions/
│   │   │   ├── outcome/         # vitória, derrota, fuga
│   │   │   ├── ai/              # IA por utilidade
│   │   │   ├── apply.ts         # applyAction(state, action) → { state, events }
│   │   │   ├── createBattle.ts  # cria o estado inicial
│   │   │   └── index.ts         # API pública do pacote
│   │   └── test/
│   │
│   └── game-data/               # @elemental/game-data
│       ├── data/
│       │   ├── rules.json       # números PROVISÓRIOS de docs/02
│       │   ├── techniques/water.json
│       │   ├── techniques/fire.json
│       │   ├── monsters/*.json
│       │   ├── combatants/player-presets.json
│       │   └── maps/test-arena.grid.json
│       ├── src/index.ts         # carrega e valida tudo; exporta objetos tipados
│       └── scripts/validate.ts  # pnpm validate:data
│
├── apps/
│   ├── server/                  # @elemental/server
│   │   ├── src/
│   │   │   ├── index.ts         # bootstrap Colyseus + rotas HTTP
│   │   │   ├── config.ts        # env validado por Zod
│   │   │   ├── modules/
│   │   │   │   ├── account/     # conta anônima, convites, tokens
│   │   │   │   ├── character/   # personagens (fatia 1: preset)
│   │   │   │   ├── combat/      # BattleRoom, adaptação core ↔ rede
│   │   │   │   └── telemetry/   # registro de eventos
│   │   │   └── db/
│   │   │       ├── schema.ts    # Drizzle
│   │   │       ├── client.ts
│   │   │       └── migrations/
│   │   └── test/
│   │
│   └── client/                  # @elemental/client
│       ├── index.html
│       ├── public/assets/       # GLB, texturas, áudio (LFS)
│       └── src/
│           ├── main.tsx         # monta canvas + overlay React
│           ├── engine/          # Babylon: cena, câmera, luzes, loaders
│           ├── battle/          # renderização da arena, grade, unidades, efeitos, fila de eventos
│           ├── net/             # cliente Colyseus, envio de intenções
│           ├── store/           # Zustand
│           ├── ui/              # React: HUD, painéis, debug
│           ├── i18n/pt-BR.json  # todos os textos
│           └── debug/
│
├── tools/
│   └── blender/export_grid.py   # exportador Blender → *.grid.json (ART-03)
│
└── assets-src/                  # fontes de arte (.blend etc.), LFS
    └── 09_LICENSES/             # licença e origem de cada asset de terceiros
```

Dependências permitidas entre pacotes:

```
client ──► combat-core ──► shared
client ──► game-data   ──► shared
server ──► combat-core, game-data, shared
combat-core ──► shared (apenas tipos/schemas)
```

`combat-core` **não** depende de `game-data`: recebe os dados prontos por parâmetro. Isso permite testar com dados mínimos.

## 4. Fluxo de uma batalha (fatia 1)

```
Cliente                         Servidor (BattleRoom)                 combat-core
  │  conectar (token)  ───────────►  onAuth: valida token
  │                                  onCreate: createBattle(arena, combatentes, seed) ──► BattleState
  │  ◄────────────── snapshot        (estado completo serializado)
  │                                  loop: avança CT até o próximo turno ──► eventos
  │  ◄────────────── events [turnStarted]
  │  intent {move}  ─────────────►   valida com Zod → applyAction ──────► {state, events}
  │  ◄────────────── events [moved, ...]
  │  intent {technique} ─────────►   applyAction ─────────────────────► {state, events}
  │  ◄────────────── events [techniqueUsed, damaged, reaction, ...]
  │  intent {endTurn} ───────────►   applyAction → avança CT → turno do monstro
  │                                  IA: chooseAction(state) → applyAction ─► eventos
  │  ◄────────────── events [...]
  │                                  battleEnded → telemetria → fecha sala
```

O cliente mantém uma **fila de eventos** e anima um por vez (mover → cast → efeito → dano). Enquanto a fila não esvazia, o input fica bloqueado.

## 5. Protocolo cliente ↔ servidor

Todas as mensagens são validadas com Zod em `@elemental/shared/protocol`.

### 5.1 Cliente → servidor (`intent`)

```ts
type Intent =
  | { kind: 'move'; to: { x: number; y: number } }
  | { kind: 'technique'; techniqueId: string; target: { x: number; y: number } }
  | { kind: 'defend' }
  | { kind: 'flee' }
  | { kind: 'endTurn' };
```

Cada mensagem leva `clientSeq` (inteiro crescente) para o cliente casar respostas.

### 5.2 Servidor → cliente

| Mensagem | Conteúdo | Quando |
| --- | --- | --- |
| `snapshot` | `BattleStateDTO` completo + `lastEventSeq` | Ao entrar e ao reconectar |
| `events` | `{ fromSeq, events: BattleEvent[] }` | Após cada ação ou avanço de turno |
| `rejected` | `{ clientSeq, reason }` | Intenção inválida |
| `turnTimer` | `{ combatantId, deadline }` (epoch ms) | Início de turno de jogador |

Eventos têm `seq` crescente. Se o cliente detectar lacuna de `seq`, pede `snapshot`.

O estado sincronizado do Colyseus (`Schema`) é mínimo: `phase`, `activeCombatantId`, `round`. O estado completo vive no core, no servidor.

## 6. Banco de dados (fatia 1)

```ts
// apps/server/src/db/schema.ts (Drizzle) — resumo
invites:          code (pk, text), maxUses (int), uses (int), createdAt
accounts:         id (uuid pk), inviteCode (fk invites), tokenHash (text, único), createdAt, lastSeenAt
characters:       id (uuid pk), accountId (fk), name, element ('water'|'earth'|'fire'|'air'), level, xp, attributes (jsonb), createdAt
telemetry_events: id (bigserial pk), accountId (uuid null), sessionId (uuid), type (text), payload (jsonb), createdAt
```

- Token: string aleatória de 32 bytes, entregue ao cliente uma vez; no banco guarda-se só o hash SHA-256.
- Convites iniciais via seed (`pnpm db:seed`, idempotente) a partir de `INVITE_CODES` no `.env`: `CODIGO` (1 uso) ou `CODIGO:N` (N usos).
- Telemetria (fatia 1): `battle_started`, `battle_ended` (resultado, duração em s, rodadas, turnos do jogador, timeouts).

## 7. Variáveis de ambiente

| Variável | Onde | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | server | `postgres://elemental:elemental@localhost:5432/elemental` |
| `PORT` | server | `2567` |
| `CORS_ORIGIN` | server | `http://localhost:5173` |
| `INVITE_CODES` | server (seed) | `ALPHA-001,ALPHA-002` |
| `SENTRY_DSN` | server | vazio = desligado |
| `VITE_SERVER_URL` | client | `ws://localhost:2567` |
| `VITE_SENTRY_DSN` | client | vazio = desligado |

`apps/server/src/config.ts` valida o ambiente com Zod e falha na inicialização se faltar algo obrigatório.

## 8. Cliente: organização interna

- **Babylon** é dono do canvas e do loop de render. **React** só renderiza UI sobre o canvas (`position: absolute`, `pointer-events` controlado).
- **Zustand** é a ponte: a camada de rede grava estado/eventos; React lê para a HUD; o código Babylon assina mudanças.
- **Câmera:** `ArcRotateCamera` em modo ortográfico (`camera.mode = ORTHOGRAPHIC_CAMERA`), alpha = −π/4 (azimute 45°), beta tal que a elevação seja ≈ 35,26°, zoom por ajuste de `orthoTop/Bottom/Left/Right` com limites.
- **Arena sem GLB:** se o GLB da arena não existir, o cliente gera a geometria a partir do `*.grid.json` (caixas por célula com altura e cor por terreno). Isso desbloqueia a fatia 1 antes da arte.
- **Debug:** painel com FPS, draw calls, malhas ativas e memória, ligado com a tecla `F3`.

## 9. Mapas e grade

- A **grade lógica global** do mapa é a fonte da verdade para regras. A geometria 3D é só visual.
- Formato `*.grid.json` em `docs/05`, seção 3.
- Mapas são montados no Blender; cada célula é marcada por custom properties; `tools/blender/export_grid.py` gera o `*.grid.json`. Na fatia 1 a arena de teste é escrita à mão/gerada por script.
- O recorte de arena (`sliceArena(grid, center, size)`) copia alturas, terrenos e bloqueios da região e marca as células de fuga na borda.

## 10. Qualidade e CI

- `ci.yml` em todo PR e push na `main`: `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm validate:data` → `pnpm test` → `pnpm build`.
- Serviço PostgreSQL no CI para os testes de integração do servidor.
- Playwright roda num job separado (pode ser não bloqueante até estabilizar).
