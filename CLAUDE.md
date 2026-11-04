# CLAUDE.md — MMORPG Elemental

> Este arquivo é lido automaticamente pelo Claude Code. Ele é o ponto de entrada do projeto.
> Leia-o inteiro antes de qualquer ação. Depois, leia os documentos de `docs/` citados na tarefa.

## 1. O que é este projeto

MMORPG 3D isométrico para navegador, em **universo próprio** (não é fan game), com quatro elementos (água, terra, fogo, ar). Cada personagem domina **um único elemento**, aprende técnicas e especializações com mestres, explora o mundo em tempo real e luta em **batalhas táticas por turnos** numa arena recortada do próprio mapa.

- **Referências:** Ragnarok Online (leitura de mundo isométrico) e Final Fantasy Tactics (combate tático).
- **Objetivo do projeto:** publicação. Hoje estamos no **protótipo**, que é single-player e roda com servidor autoritativo.
- **Equipe:** 1 desenvolvedor (o dono do repositório), com apoio de IA. Menos de 10 h por semana.
- **Idioma do jogo e da documentação:** português do Brasil. **Código, identificadores, nomes de arquivos e mensagens de commit em inglês.** Textos exibidos ao jogador sempre externalizados (nunca hardcoded).

## 2. Mapa da documentação

| Arquivo | Conteúdo | Quando ler |
| --- | --- | --- |
| `docs/01-gdd.md` | Game Design Document v1.1 (visão, sistemas, mundo, arte) | Contexto geral; dúvidas de design |
| `docs/02-regras-combate.md` | Regras de combate, instâncias, fórmulas e valores iniciais | Qualquer issue `CORE-*`, `IA-*`, `SRV-02/03` |
| `docs/03-escopo-prototipo.md` | O que entra e o que não entra no protótipo e em cada fatia | Antes de criar qualquer funcionalidade |
| `docs/04-arquitetura.md` | Stack, monorepo, módulos, protocolo cliente-servidor, banco | Qualquer issue técnica |
| `docs/05-contratos-dados.md` | Tipos, schemas, formatos de arquivo, dados das 8 técnicas e do monstro | `CORE-01`, `CORE-14`, `CORE-15`, `SRV-*`, `CLI-*` |
| `docs/06-backlog-fatia-1.md` | 47 issues da fatia 1 com critérios de aceite e ordem de execução | Sempre: é a fila de trabalho |
| `docs/07-convencoes.md` | Padrões de código, testes, commits, branches e PRs | Sempre |
| `docs/08-decisoes.md` | Registro de decisões (ADRs) e o porquê de cada uma | Antes de propor mudar algo estrutural |
| `docs/09-pendencias.md` | Perguntas em aberto e valores a calibrar | Quando esbarrar em algo indefinido |

## 3. Regras de trabalho (obrigatórias)

1. **A fila de trabalho é `docs/06-backlog-fatia-1.md`.** Execute uma issue por vez, na ordem das ondas, respeitando dependências. Use o comando `/proxima-issue`.
2. **Não invente regra de jogo.** Se algo não está em `docs/02` ou `docs/05`, não decida sozinho: use o valor marcado como `PROVISÓRIO` se houver; se não houver, pare, registre a dúvida em `docs/09-pendencias.md` e pergunte ao dono.
3. **Valores numéricos de balanceamento nunca ficam no código.** Ficam nos arquivos de dados (`packages/game-data/data/*.json`) ou em `packages/game-data/data/rules.json`. O código lê os valores.
4. **O pacote `@elemental/combat-core` é TypeScript puro.** Proibido importar Babylon.js, React, Colyseus, Node APIs (`fs`, `crypto` etc.) ou qualquer coisa com efeito colateral. Ele roda igual no servidor, no cliente e nos testes.
5. **Estado de batalha é imutável.** Toda mudança acontece por `applyAction(state, action) → { state, events }`. Nada de mutar o estado recebido.
6. **Toda aleatoriedade usa o RNG com seed do core.** `Math.random()` é proibido em `combat-core`, `server` (lógica de jogo) e `game-data`.
7. **O servidor é autoritativo.** O cliente envia **intenções**; o servidor valida no core e devolve **eventos**. O cliente nunca calcula resultado de combate por conta própria (pode calcular *previews* de alcance para UI, usando o mesmo core).
8. **Testes primeiro no core.** Toda regra de `combat-core` nasce com teste Vitest. Bug corrigido = teste que reproduz o bug.
9. **Escopo fechado.** Não adicione funcionalidades fora da issue atual. Ideias novas vão para `docs/09-pendencias.md`.
10. **Terminologia.** Nunca use termos de Avatar ("dobra", "dobrador", "subdobra", "Avatar"). Use "domínio elemental", "técnica", "especialização", "usuário de água/terra/fogo/ar".
11. **Mudou regra? Atualize o doc.** Se uma implementação exigir mudar uma regra documentada, atualize o documento correspondente no mesmo PR e registre em `docs/08-decisoes.md`.
12. **Segurança.** Nunca commitar segredos. Variáveis sensíveis só em `.env` (ignorado) com `.env.example` versionado. Validar toda entrada do cliente no servidor com schema Zod.

## 4. Definição de pronto (DoD) de cada issue

Uma issue só está pronta quando **todos** os itens abaixo forem verdade:

- [ ] Todos os critérios de aceite da issue atendidos e verificados.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam localmente (e no CI, quando existir).
- [ ] Para issues de gameplay: comportamento verificável no build de dev (`pnpm dev`).
- [ ] Se mudou alguma regra: `docs/` atualizado e decisão registrada em `docs/08-decisoes.md`.
- [ ] Status da issue atualizado em `docs/06-backlog-fatia-1.md` (`[ ]` → `[x]`).
- [ ] Commit(s) no padrão Conventional Commits com o ID da issue (ver `docs/07-convencoes.md`).

## 5. Comandos do projeto (depois de INF-01)

```bash
pnpm install          # instala tudo
pnpm dev              # sobe cliente (Vite) + servidor (Colyseus) em paralelo
pnpm test             # Vitest em todos os pacotes
pnpm test:sim         # simulador de balanceamento (QA-01)
pnpm lint             # Biome check
pnpm format           # Biome format --write
pnpm typecheck        # tsc --noEmit em todos os pacotes
pnpm build            # build de produção
pnpm validate:data    # valida os JSON de game-data contra os schemas
pnpm db:generate      # gera migração Drizzle
pnpm db:migrate       # aplica migrações
docker compose up -d  # PostgreSQL local
```

## 6. Comandos personalizados do Claude Code

- `/proxima-issue` — escolhe a próxima issue desbloqueada do backlog, planeja, implementa, testa e marca como feita.
- `/criar-issues-github` — cadastra o backlog no GitHub (issues, labels de epic e milestone da fatia) usando `gh`.

## 7. Issues que exigem o humano

Algumas issues não podem ser concluídas só pelo Claude Code (estão marcadas como **Executor: Humano** ou **Misto** no backlog): escolher packs de arte, modelar a arena no Blender, criar contas de deploy, configurar Sentry e conduzir o teste com jogadores. Para essas, o Claude Code prepara tudo o que puder (scripts, instruções passo a passo, placeholders) e **para**, avisando exatamente o que o humano precisa fazer.

## 8. Estado atual

- Etapas de design concluídas: GDD v1.1, regras de combate, escopo do protótipo, backlog técnico da fatia 1.
- Código: ondas 0–3 da fatia 1 prontas (infra, core de combate completo, IA, simulador e servidor Colyseus com conta, sala, telemetria). Pendente na onda 0: confirmar o CI no GitHub (INF-02). Próxima: onda 4 (cliente), começando por CLI-01.
