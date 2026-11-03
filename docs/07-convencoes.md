# 07 — Convenções

## 1. Código

- **Idioma:** código, identificadores, nomes de arquivos, comentários técnicos e commits em inglês. Textos ao jogador em `i18n/pt-BR.json`. Documentação em `docs/` em português.
- **Nomes:** `camelCase` para variáveis e funções; `PascalCase` para tipos, interfaces, classes e componentes React; `SCREAMING_SNAKE_CASE` só para constantes de módulo realmente fixas; arquivos em `camelCase.ts` (componentes React em `PascalCase.tsx`).
- **IDs de dados:** `elemento.nome` em minúsculas (`water.whip`, `monster.clawbeast`).
- **Funções puras por padrão** no `combat-core`. Sem classes com estado mutável no core.
- **Sem `any`.** Use `unknown` + validação. `as` só com comentário justificando.
- **Erros esperados** (ação inválida) retornam valores (`{ ok: false, reason }`); exceções só para erro de programação.
- **Imports:** caminhos relativos dentro do pacote; nome do pacote (`@elemental/...`) entre pacotes. Nada de importar `src/` interno de outro pacote: só o que o `index.ts` exporta.
- **Tamanho:** arquivos acima de ~300 linhas são sinal para dividir.
- **Comentários:** explicar o porquê; referenciar a regra quando implementar uma (`// docs/02 §6.4 — flank`).

## 2. Testes

- Vitest em todos os pacotes; arquivos `*.test.ts` ao lado do código ou em `test/`.
- **Core:** cobertura de toda regra de `docs/02`. Meta de cobertura de linhas do `combat-core`: ≥ 90%.
- **Fábricas de teste:** `packages/combat-core/test/factories.ts` com `makeGrid`, `makeCombatant`, `makeBattle` e dados mínimos, para que cada teste declare só o que importa.
- **Determinismo:** testes que envolvem acaso fixam a seed.
- **Sem dados reais de balanceamento nos testes unitários de regra**: use dados de teste com números redondos. Os dados reais são testados no `validate:data` e no simulador.
- **Servidor:** testes de integração com PostgreSQL real (Docker local / serviço no CI), banco limpo por suíte.

## 3. Git

- **Branch principal:** `main`, sempre verde.
- **Branches:** `<tipo>/<id-da-issue>-<resumo>`, ex.: `feat/CORE-05-ct-bar`.
- **Commits:** Conventional Commits com o ID da issue no escopo:
  - `feat(CORE-05): add CT bar with deterministic tie-break`
  - `test(CORE-07): cover line of sight with height`
  - `fix(SRV-02): reject intents after battle ended`
  - `docs(CORE-09): update damage formula in docs/02`
  - `chore(INF-01): bootstrap pnpm monorepo`
- **Commits pequenos e frequentes.** Um commit por passo lógico.
- **PR por issue** quando o repositório estiver no GitHub; descrição com: issue, o que mudou, como testar, checklist do DoD.

## 4. Fluxo de uma issue (o que o Claude Code deve fazer)

1. Ler a issue em `docs/06`, os documentos que ela cita e o código relacionado.
2. Verificar se as dependências estão marcadas `[x]`. Se não, parar e avisar.
3. Escrever um plano curto (arquivos a criar/alterar, testes a escrever).
4. Escrever os testes que traduzem os critérios de aceite.
5. Implementar até os testes passarem.
6. Rodar `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (e `validate:data` se mexeu em dados).
7. Atualizar docs se a regra mudou; registrar em `docs/08`.
8. Marcar a issue como `[x]` em `docs/06` e os critérios atendidos.
9. Commitar no padrão acima.
10. Resumir para o humano: o que foi feito, como verificar e qual a próxima issue desbloqueada.

## 5. Dados de jogo

- Todo número de balanceamento mora em `packages/game-data/data/`.
- Mudou um número? Registrar o motivo no commit (`balance(QA-01): fire.burst cost 20 → 18, win rate 71% → 64%`).
- Schemas são o contrato: adicionar campo novo exige atualizar `docs/05`.

## 6. Segurança

- Nunca commitar `.env`, tokens, DSNs privados ou chaves.
- Toda mensagem do cliente passa por schema Zod no servidor.
- Tokens: guardar só o hash; nunca logar.
- Dependências: preferir pacotes mantidos e populares; evitar adicionar dependência para algo que cabe em 20 linhas.
