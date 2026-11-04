# MMORPG Elemental

MMORPG 3D isométrico para navegador com combate tático por turnos. Este repositório começa só com a documentação; o código é gerado issue a issue pelo Claude Code.

## Como começar com o Claude Code

1. Crie uma pasta vazia (ou um repositório no GitHub) e copie para ela o conteúdo deste pacote: `CLAUDE.md`, `README.md`, `docs/` e `.claude/`.
2. `git init` (se ainda não for um repositório) e faça o primeiro commit só com a documentação.
3. Pré-requisitos na máquina: Node.js LTS, pnpm, Docker, Git LFS e, opcionalmente, `gh` (GitHub CLI).
4. Abra o Claude Code na pasta e peça:

   > Leia o CLAUDE.md e todos os documentos de docs/. Depois rode /proxima-issue.

5. Repita `/proxima-issue` a cada sessão. Cada execução implementa, testa, marca e commita uma issue.
6. Opcional: `/criar-issues-github` cadastra o backlog no GitHub (pede confirmação antes).

## Setup do ambiente

Pré-requisitos: Node.js (versão em `.nvmrc`, mínimo 22), pnpm 10+ (`corepack enable` ativa a versão de `packageManager`), Docker e Git LFS.

```bash
nvm use               # ou instale a versão de .nvmrc
corepack enable       # ativa o pnpm fixado em package.json
pnpm install
cp .env.example .env  # ajuste se necessário; .env nunca é commitado
```

Banco local (PostgreSQL 18 via Docker):

```bash
docker compose up -d   # sobe o banco (healthcheck incluso)
pnpm db:ping           # imprime a versão do PostgreSQL
```

Verificação (deve passar sempre; o CI em `.github/workflows/ci.yml` roda a mesma sequência):

```bash
pnpm lint && pnpm typecheck && pnpm validate:data && pnpm test && pnpm build
```

### Estrutura

| Pasta | Pacote | Papel |
| --- | --- | --- |
| `packages/shared` | `@elemental/shared` | Schemas Zod e protocolo cliente ↔ servidor |
| `packages/combat-core` | `@elemental/combat-core` | Regras de combate em TypeScript puro (sem Node, Babylon, React ou Colyseus — o Biome bloqueia) |
| `packages/game-data` | `@elemental/game-data` | Dados de jogo em JSON validados |
| `apps/server` | `@elemental/server` | Servidor Colyseus autoritativo |
| `apps/client` | `@elemental/client` | Cliente Vite + Phaser 4 + React (ADR-022) |
| `tools/` | — | Ferramentas (ex.: exportador do Blender) |
| `assets-src/` | — | Fontes de arte (Git LFS) |

Os pacotes se importam pelo nome (`workspace:*`). Em typecheck e testes, a condição de export `@elemental/source` aponta para `src/`, então não é preciso buildar antes; o `pnpm build` gera `dist/` em ordem topológica.

Assets binários usam Git LFS: veja `assets-src/README.md`.

Scripts ainda sem implementação (`dev`, `test:sim`, `db:generate`, `db:migrate`) apenas imprimem a issue que os implementará.

## Onde está cada coisa

- `CLAUDE.md` — contexto e regras para o Claude Code.
- `docs/01-gdd.md` — design do jogo.
- `docs/02-regras-combate.md` — regras e fórmulas do combate.
- `docs/03-escopo-prototipo.md` — escopo do protótipo e das fatias.
- `docs/04-arquitetura.md` — stack, estrutura e protocolo.
- `docs/05-contratos-dados.md` — tipos, schemas e dados.
- `docs/06-backlog-fatia-1.md` — fila de trabalho.
- `docs/07-convencoes.md`, `docs/08-decisoes.md`, `docs/09-pendencias.md`.

## Passos que dependem de você

Escolher assets CC0 (ART-01), modelar a arena no Blender (ART-02), rodar o exportador (ART-03), criar contas de Sentry e deploy (INF-05, INF-06) e conduzir o teste com jogadores (QA-03). O Claude Code prepara instruções e avisa quando chegar nesses pontos.
