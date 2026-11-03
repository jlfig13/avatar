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
