# 06 — Backlog da Fatia 1: arena isolada

> **Meta da fatia:** uma batalha tática completa, jogável no navegador, executada no servidor (sala Colyseus), com 1 personagem (preset de água ou de fogo) contra 1–2 monstros controlados por IA de utilidade, numa arena de teste 10 × 10 com altura, água, vegetação e obstáculos.
>
> **Total:** 47 issues · 214 h estimadas · ~35 semanas a 8 h/semana com 30% de margem.
>
> **Como usar:** execute com `/proxima-issue`. Marque `[x]` no título ao concluir. Siga as ondas: uma onda só começa quando as dependências das suas issues estão prontas (issues da mesma onda podem ser feitas em qualquer ordem que respeite dependências).
>
> **Executor:** `Claude` = o Claude Code faz sozinho · `Misto` = o Claude Code prepara e o humano conclui um passo · `Humano` = o Claude Code só prepara instruções.

## Resumo por epic

| Epic | Label | Issues | Horas |
| --- | --- | --- | --- |
| Core de combate | `epic:core` | 15 | 65 |
| Cliente | `epic:client` | 11 | 56 |
| Servidor | `epic:server` | 7 | 28 |
| Infraestrutura | `epic:infra` | 6 | 19 |
| IA | `epic:ai` | 2 | 16 |
| Qualidade | `epic:qa` | 3 | 16 |
| Arte e dados | `epic:art` | 3 | 14 |
| **Total** | | **47** | **214** |

## Ondas de execução

| Onda | Issues | Resultado ao final |
| --- | --- | --- |
| 0 — Fundação | INF-01, INF-02, INF-03, INF-04, CORE-01, CORE-02, CORE-14, CORE-15, ART-01 | Monorepo, CI, banco local, tipos e dados validados |
| 1 — Regras base | CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08 | Grade, caminho, barra de tempo, turno, alcance, altura, flanco |
| 2 — Técnicas | CORE-09, CORE-10, CORE-11, CORE-12, CORE-13 | Batalha completa resolvível só no core (testes) |
| 3 — IA e servidor | IA-01, IA-02, QA-01, SRV-01, SRV-05, SRV-04, SRV-02, SRV-03, SRV-06, SRV-07 | Batalha roda no servidor; simulador mede balanceamento |
| 4 — Cliente | CLI-01, CLI-02, CLI-11, CLI-03, CLI-04, CLI-06, CLI-05, CLI-07, CLI-08, CLI-09, CLI-10 | Batalha jogável no navegador |
| 5 — Entrega | ART-02, ART-03, QA-02, INF-05, INF-06, QA-03 | Arena com arte, E2E, Sentry, deploy e teste com pessoas |

---

## Onda 0 — Fundação

### [x] INF-01 — Monorepo pnpm com TypeScript estrito e Biome
- **Epic:** infra · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** —
- **Descrição:** criar a estrutura de `docs/04-arquitetura.md`, seção 3: `apps/client`, `apps/server`, `packages/combat-core`, `packages/shared`, `packages/game-data`, `tools/`, `assets-src/`. `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. `biome.json`. Scripts raiz da seção 5 do `CLAUDE.md` (os que dependem de pacotes ainda vazios podem ser no-op).
- **Critérios de aceite:**
  - [x] `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm typecheck` e `pnpm test` passam com pacotes vazios (cada um com 1 teste trivial).
  - [x] Pacotes importam uns aos outros pelo nome (`@elemental/shared` etc.) via `workspace:*`.
  - [x] `.nvmrc`, `.gitignore` (inclui `.env`, `dist`, `node_modules`), `.env.example` e `README.md` com instruções de setup.
  - [x] Regra no Biome (ou script) que falha se `combat-core` importar `babylonjs`, `react`, `colyseus`, `node:*`.

### [ ] INF-02 — CI no GitHub Actions
- **Epic:** infra · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** INF-01
- **Descrição:** `.github/workflows/ci.yml` conforme `docs/04`, seção 10, com cache do pnpm.
- **Critérios de aceite:**
  - [x] Roda em PR e push na `main`: install (frozen lockfile) → lint → typecheck → validate:data → test → build.
  - [ ] Um erro de tipo proposital faz o job falhar (verificar e reverter). — *verificado localmente (`pnpm typecheck` sai com código 1); falta confirmar no GitHub Actions no primeiro PR para a `main`.*

### [x] INF-03 — Git LFS para assets binários
- **Epic:** infra · **Estimativa:** 1 h · **Executor:** Claude · **Depende de:** INF-01
- **Descrição:** `.gitattributes` com `*.blend *.glb *.gltf *.ktx2 *.png *.jpg *.wav *.ogg *.mp3 *.fbx` em LFS. Pastas `assets-src/` e `apps/client/public/assets/` com `README.md` explicando o uso.
- **Critérios de aceite:**
  - [x] `git lfs track` lista os padrões.
  - [x] README explica como instalar o Git LFS e que `.blend` vai em `assets-src/`, exports em `apps/client/public/assets/`.

### [x] INF-04 — PostgreSQL local com Docker Compose
- **Epic:** infra · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** INF-01
- **Descrição:** `docker-compose.yml` com PostgreSQL (versão estável atual), volume nomeado, healthcheck e credenciais de desenvolvimento iguais às do `.env.example`.
- **Critérios de aceite:**
  - [x] `docker compose up -d` sobe o banco saudável.
  - [x] Um script `pnpm db:ping` (no server) conecta e imprime a versão do Postgres.

### [x] CORE-01 — Tipos base e `applyAction` imutável
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** INF-01
- **Descrição:** implementar os tipos de `docs/05`, seções 1 e 1.1–1.3, e o esqueleto de `applyAction(state, action, data) → ApplyResult` com despacho por `action.type` (handlers ainda devolvem `rejected` onde não implementados). Utilitários de atualização imutável (`updateCombatant`, `updateCell`). Contador `eventSeq`.
- **Critérios de aceite:**
  - [x] Teste confirma que o estado de entrada não é alterado (`Object.freeze` profundo em teste ou comparação por snapshot).
  - [x] Todo evento emitido recebe `seq` crescente.
  - [x] Ação com `actorId` que não é o do turno retorna `not_your_turn`.

### [x] CORE-02 — RNG determinístico com seed
- **Epic:** core · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** CORE-01
- **Descrição:** PRNG pequeno e rápido (mulberry32 ou sfc32) com estado serializável em `BattleState.rngState`. Funções puras: `next(state) → [valor, novoEstado]`, `nextInt(state, min, max)`, `pick`.
- **Critérios de aceite:**
  - [x] Mesma seed gera a mesma sequência em 1.000 chamadas.
  - [x] Distribuição de `nextInt(1,100)` em 100.000 amostras dentro de ±2% do esperado por faixa de 10.
  - [x] Nenhum `Math.random` no pacote (checagem no lint/teste).

### [x] CORE-14 — Schemas Zod e dados de técnicas de água e fogo
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-01
- **Descrição:** schemas de `docs/05` (técnica, passiva, monstro, preset, `rules.json`, grade) em `@elemental/shared`. Arquivos em `packages/game-data/data/` com os valores PROVISÓRIOS das seções 2, 4, 5 e 7. `packages/game-data/src/index.ts` carrega, valida e exporta `GameData` tipado. Script `pnpm validate:data`.
- **Critérios de aceite:**
  - [x] As 8 técnicas, 3 passivas e 2 presets carregam sem erro.
  - [x] Um arquivo inválido (campo faltando) falha o `validate:data` com mensagem indicando arquivo e campo.
  - [x] IDs referenciados (técnicas em presets/monstros) são verificados: ID inexistente falha a validação.

### [x] CORE-15 — Dados do monstro corpo a corpo
- **Epic:** core · **Estimativa:** 1 h · **Executor:** Claude · **Depende de:** CORE-14
- **Descrição:** `monster.clawbeast`, `monster.claw`, `monster.pounce` e `monster.counter` conforme `docs/05`, seção 6.
- **Critérios de aceite:**
  - [x] Monstro carrega dos dados e pode ser passado a `createBattle`.

### [ ] ART-01 — Selecionar packs CC0 e registrar licenças
- **Epic:** art · **Estimativa:** 2 h · **Executor:** Misto · **Depende de:** —
- **Descrição:** o Claude Code cria `assets-src/09_LICENSES/README.md` e o modelo `LICENSES.csv` (asset, autor, origem/URL, licença, data, uso). O humano escolhe os packs (sugestões a avaliar: Quaternius, Kenney, KayKit — conferir licença de cada um) para: 1 humanoide com animações idle/walk/run/cast/hit/defeat (ou próximas), 1 criatura quadrúpede, props de natureza (pedras, árvores, arbustos) e texturas de terreno.
- **Critérios de aceite:**
  - [ ] Cada asset usado tem linha no `LICENSES.csv`.
  - [ ] Nenhum asset com licença que proíba uso comercial.
- **Parada do Claude Code:** depois de criar os modelos, avisar o humano e seguir para outras issues; não baixar assets por conta própria.

---

## Onda 1 — Regras base

### [x] CORE-03 — Grade, carregamento de `*.grid.json` e recorte de arena
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-01, CORE-14
- **Descrição:** conversão `*.grid.json` → `Grid` (no `game-data`, usando tipos do core); funções de grade no core: `getCell`, `inBounds`, `neighbors4`, `manhattan`, `sliceArena(grid, center, size)` com marcação de células de fuga. Criar `packages/game-data/data/maps/test-arena.grid.json` conforme `docs/05`, seção 3.
- **Critérios de aceite:**
  - [x] Recorte 10 × 10 de uma grade 30 × 30 preserva alturas, terrenos e bloqueios da origem (teste com grade gerada).
  - [x] Células de fuga = borda externa transitável.
  - [x] Recorte perto da borda do mapa é deslocado para caber (sem células fora do mapa).
  - [x] `test-arena` atende aos requisitos da seção 3 de `docs/05`.

### [x] CORE-04 — Pathfinding A* com custos de altura e terreno
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-03
- **Descrição:** A* em 4 direções com regras de `docs/02`, seção 3.1 (custos, subida/descida, ocupação). `getReachableCells` (todas as células alcançáveis com os pontos de movimento) e `findPath`.
- **Critérios de aceite:**
  - [x] Desvia de obstáculo; não sobe 3 níveis num passo; desce até 3.
  - [x] Água rasa custa 2 para fogo e 1 para água.
  - [x] Pode atravessar aliado mas não parar nele; inimigo bloqueia.
  - [x] `getReachableCells` numa arena 10 × 10 leva < 2 ms (benchmark simples no teste).

### [x] CORE-05 — Barra de tempo (CT)
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-01
- **Descrição:** ação `advance` soma ticks até alguém atingir o limiar; desempate determinístico; ajuste de `ct` no fim do turno com `ctDelay`; controle de rodada; `predictTurnOrder`.
- **Critérios de aceite:**
  - [x] Com 3 combatentes de mobilidade 10, 15 e 20, a ordem dos 6 primeiros turnos bate com uma tabela calculada à mão no teste.
  - [x] Técnica com `ctDelay: 30` atrasa o próximo turno do usuário em relação a quem não usou.
  - [x] Evento `roundStarted` quando todos os vivos agiram.

### [x] CORE-06 — Fluxo do turno: movimento + 1 ação, defender e timeout
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-04, CORE-05
- **Descrição:** handlers de `move`, `defend`, `endTurn`, `timeout` e controle de `hasMoved`/`hasActed`. Início de turno: regeneração de energia (stub até CORE-10), remoção do `defending` anterior. `timeout` aplica `defend` e incrementa `consecutiveTimeouts`; qualquer ação manual zera.
- **Critérios de aceite:**
  - [x] Pode mover e agir em qualquer ordem, uma vez cada; segunda tentativa retorna `already_moved`/`already_acted`.
  - [x] Destino fora do alcançável retorna `unreachable`.
  - [x] `facing` atualizado na direção do último passo.
  - [x] Defender reduz dano recebido em 30% até o próximo turno do defensor.

### [x] CORE-07 — Alcance, área e linha de visão
- **Epic:** core · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CORE-03
- **Descrição:** `getTechniqueTargets`, `getAffectedCells` (single, cross, line, self) e `hasLineOfSight` com o algoritmo de `docs/02`, seção 6.2. Bônus de alcance por altura (seção 6.3).
- **Critérios de aceite:**
  - [x] Rocha entre atacante e alvo bloqueia técnica com `requiresLineOfSight`.
  - [x] Atacante 2 níveis acima ganha +1 de alcance em técnica com `rangeBonusFromHeight`.
  - [x] `line` sai perpendicular à direção do usuário, centrada no alvo (testes por direção N/E/S/W).
  - [x] Área não inclui células fora da grade.

### [x] CORE-08 — Modificadores de altura e de flanco/costas
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-07
- **Descrição:** funções puras `heightAccuracyBonus`, `flankPosition(attacker, target)` (`front`/`side`/`back`) e multiplicadores, lendo `rules.json`.
- **Critérios de aceite:**
  - [x] Ataque pelas costas aplica +30% de precisão e ×1,25 de dano (valores vindos de `rules.json`, não do código).
  - [x] Tabela de testes cobre as 4 direções do alvo × 4 posições do atacante.

---

## Onda 2 — Técnicas

### [x] CORE-09 — Resolução de técnicas: acerto, dano, cura, estados, dash
- **Epic:** core · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CORE-07, CORE-08, CORE-14
- **Descrição:** handler `technique`: validações (energia, alcance, LoS, alvo), fórmulas de `docs/02`, seções 6.5 e 6.6, efeitos `damage`, `heal`, `status`, `dash`, `push`, aplicação a todos os alvos da área (inclusive aliados em `fire.burst`), derrota ao chegar a 0 de vida.
- **Critérios de aceite:**
  - [x] As 8 técnicas da fatia 1 e as 2 do monstro funcionam conforme `docs/05` (1 teste por técnica).
  - [x] Com seed fixa, o resultado de acerto/dano é sempre o mesmo.
  - [x] `water.whip` em alvo sobre `shallow_water` causa 20% a mais.
  - [x] `water.glide` não consome o movimento do turno.

### [x] CORE-10 — Energia: máximo, regeneração e custo efetivo
- **Epic:** core · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** CORE-09
- **Descrição:** fórmulas de `docs/02`, seção 6.7, lidas de `rules.json`.
- **Critérios de aceite:**
  - [x] Regeneração no início do turno bate com a fórmula e não passa do máximo.
  - [x] Técnica sem energia suficiente retorna `not_enough_energy`.

### [x] CORE-11 — Terreno elemental temporário
- **Epic:** core · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CORE-03, CORE-09
- **Descrição:** efeitos `ice` e `fire` completos (custos, dano ao entrar/iniciar turno, bônus de precisão, duração, regra de vegetação e de água rasa); `earth_wall` e `gust` implementados e testados mesmo sem técnicas que os usem na fatia 1. Substituição pelo mais recente. Expiração no fim da rodada com eventos.
- **Critérios de aceite:**
  - [x] Gelo seguido de fogo na mesma célula resulta em fogo.
  - [x] Fogo não é aplicado em água rasa; em vegetação dura 3 rodadas.
  - [x] Entrar em célula com fogo durante o movimento causa dano (o caminho continua).
  - [x] Gelo custa +1 de movimento e é considerado pelo A*.

### [ ] CORE-12 — Reações (1 por rodada)
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-09
- **Descrição:** gatilhos e efeitos das passivas de `docs/05`, seção 5. Controle de `reactionUsedThisRound`, reset no início da rodada. Reação não dispara reação.
- **Critérios de aceite:**
  - [ ] Segunda reação na mesma rodada não dispara.
  - [ ] Contra-ataque do monstro não ativa a "Brasa" do jogador (sem cadeia).
  - [ ] Reações não disparam se o reagente foi derrotado pelo ataque.

### [ ] CORE-13 — Fim de batalha e fuga
- **Epic:** core · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CORE-06
- **Descrição:** handler `flee` (só em célula de fuga, gasta a ação, chance de `docs/02`, seção 9); checagens de vitória, derrota e fuga após cada ação; evento `battleEnded`; ações após o fim retornam `battle_over`.
- **Critérios de aceite:**
  - [ ] Falha na fuga consome a ação do turno.
  - [ ] Fuga fora de célula de fuga retorna `not_on_escape_cell`.
  - [ ] Teste de batalha completa (script de ações) termina em vitória com eventos esperados.

---

## Onda 3 — IA e servidor

### [ ] IA-01 — Framework de avaliação de utilidade
- **Epic:** ai · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CORE-06, CORE-09
- **Descrição:** `chooseActions` conforme `docs/05`, seção 8: geração de candidatos, pontuação por considerações ponderadas, escolha com desempate pelo RNG. Saída com `debug` por candidato (para log e para o painel de debug do cliente).
- **Critérios de aceite:**
  - [ ] Com seed fixa, escolhe sempre a mesma sequência.
  - [ ] Nunca devolve ação inválida (teste com 500 estados aleatórios válidos).
  - [ ] Decisão < 50 ms numa arena 10 × 10 com 4 combatentes.

### [ ] IA-02 — Considerações iniciais da IA
- **Epic:** ai · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** IA-01, CORE-08, CORE-11
- **Descrição:** considerações de dano esperado, chance de abate, risco na célula de destino, distância, altura, flanco e evitar fogo. Pesos do perfil `aggressive_melee` em dados.
- **Critérios de aceite:**
  - [ ] Com dano esperado igual, prefere célula mais alta.
  - [ ] Prefere atacar pelas costas quando possível.
  - [ ] Não termina o movimento em célula com fogo se houver alternativa equivalente.
  - [ ] Usa `monster.pounce` quando o alvo está a 2–3 células e não alcançável a pé.

### [ ] QA-01 — Simulador de balanceamento IA × IA
- **Epic:** qa · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** IA-02, CORE-13
- **Descrição:** `pnpm test:sim` roda N batalhas com seeds sequenciais, jogador também controlado por uma IA genérica (perfil `balanced`), para cada preset × quantidade de inimigos. Gera relatório em Markdown e CSV em `reports/` (ignorado no git).
- **Critérios de aceite:**
  - [ ] Relatório de 1.000 batalhas em menos de 1 min.
  - [ ] Métricas: taxa de vitória, rodadas médias, turnos médios do jogador, duração estimada (turnos do jogador × 20 s + turnos de IA × 3 s), dano por técnica, frequência de uso de cada técnica.
  - [ ] Parâmetros por linha de comando (`--battles`, `--preset`, `--enemies`).

### [ ] SRV-01 — Servidor Colyseus base (monólito modular)
- **Epic:** server · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** INF-01
- **Descrição:** bootstrap do Colyseus, `config.ts` com Zod, estrutura de `modules/`, rota `GET /health`, logs estruturados (pino ou o logger padrão), CORS configurável.
- **Critérios de aceite:**
  - [ ] `/health` responde `{ status: 'ok' }`.
  - [ ] Uma sala de teste aceita conexão de um cliente de teste (`colyseus.js`) em teste automatizado.
  - [ ] Servidor não sobe se faltar variável obrigatória.

### [ ] SRV-05 — Drizzle: schema inicial e migrações
- **Epic:** server · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** INF-04
- **Descrição:** schema de `docs/04`, seção 6; `drizzle.config.ts`; scripts `db:generate`, `db:migrate`, `db:seed` (convites de `INVITE_CODES`).
- **Critérios de aceite:**
  - [ ] Migração cria as 4 tabelas do zero num banco vazio.
  - [ ] `db:seed` é idempotente.

### [ ] SRV-04 — Conta anônima por token + código de convite
- **Epic:** server · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** SRV-05
- **Descrição:** `POST /auth/redeem { inviteCode }` → cria conta e devolve token (uma vez); guarda só o hash. `onAuth` das salas valida o token. Limite simples de tentativas por IP.
- **Critérios de aceite:**
  - [ ] Sem convite válido: 403. Convite esgotado: 403.
  - [ ] Conexão à sala sem token ou com token inválido é recusada.
  - [ ] Token nunca aparece em log.

### [ ] SRV-02 — Sala de batalha
- **Epic:** server · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** SRV-01, CORE-06, CORE-14
- **Descrição:** `BattleRoom` conforme `docs/04`, seções 4 e 5: cria estado com `test-arena`, preset escolhido e monstros; seed aleatória do servidor; valida intenções com Zod; chama `applyAction`; envia `events`, `rejected`, `snapshot`, `turnTimer`; timer de 60 s/10 s (AFK) que gera a ação `timeout`; reconexão com `allowReconnection` dentro de 3 rodadas; registra seed e ações para replay em log.
- **Critérios de aceite:**
  - [ ] Intenção inválida é rejeitada com o motivo do core.
  - [ ] Timer esgotado aplica defesa e passa o turno.
  - [ ] Reconectar recebe `snapshot` com `lastEventSeq` correto.
  - [ ] Replay: seed + lista de ações registradas reproduz o mesmo estado final (teste).

### [ ] SRV-03 — Turnos da IA no servidor
- **Epic:** server · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** SRV-02, IA-01
- **Descrição:** quando o turno é de um combatente `ai`, a sala chama `chooseActions` e aplica a sequência, com pequeno atraso configurável entre ações (padrão 400 ms) para o cliente acompanhar.
- **Critérios de aceite:**
  - [ ] Turno do monstro acontece sem input do cliente.
  - [ ] Atraso configurável por variável (0 nos testes).

### [ ] SRV-06 — Telemetria de batalha
- **Epic:** server · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** SRV-02, SRV-05
- **Descrição:** gravar `battle_started` e `battle_ended` em `telemetry_events` com os campos de `docs/04`, seção 6. Falha de gravação não derruba a batalha.
- **Critérios de aceite:**
  - [ ] Cada batalha gera 2 linhas.
  - [ ] Consulta SQL de exemplo em `docs/` ou `apps/server/README.md` para duração média e taxa de vitória.

### [ ] SRV-07 — Testes de integração da sala
- **Epic:** server · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** SRV-02, SRV-03
- **Descrição:** teste que sobe o servidor em memória (ou porta aleatória), conecta um cliente de teste e joga uma batalha inteira com ações scriptadas até o fim.
- **Critérios de aceite:**
  - [ ] Batalha completa passa no CI com PostgreSQL de serviço.

---

## Onda 4 — Cliente

### [ ] CLI-01 — App Vite com canvas Babylon, overlay React e Zustand
- **Epic:** client · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** INF-01
- **Descrição:** estrutura de `docs/04`, seção 8. `main.tsx` monta o canvas em tela cheia e o overlay React por cima. Store Zustand inicial. Carregamento de `i18n/pt-BR.json` com função `t(key)`.
- **Critérios de aceite:**
  - [ ] Botão React altera algo na cena via store (ex.: cor de uma caixa).
  - [ ] Redimensionar a janela ajusta o canvas sem distorção.

### [ ] CLI-02 — Câmera isométrica ortográfica
- **Epic:** client · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** CLI-01
- **Descrição:** câmera conforme `docs/04`, seção 8: azimute 45°, elevação ≈ 35,26°, zoom com roda do mouse dentro de limites, sem rotação livre (rotação em passos de 90° com Q/E é opcional e fica desligada).
- **Critérios de aceite:**
  - [ ] Arena 10 × 10 inteira visível no zoom padrão em 1366 × 768.
  - [ ] Cubos de 1 × 1 aparecem com faces iguais (sem perspectiva).

### [ ] CLI-11 — Painel de debug de desempenho
- **Epic:** client · **Estimativa:** 2 h · **Executor:** Claude · **Depende de:** CLI-01
- **Descrição:** painel React ligado/desligado com F3: FPS, draw calls, malhas ativas, memória JS (quando disponível) e o último log de decisão da IA.
- **Critérios de aceite:**
  - [ ] F3 alterna o painel; valores atualizam a cada 500 ms.

### [ ] CLI-03 — Arena a partir da grade (procedural, com GLB opcional)
- **Epic:** client · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CLI-02, CORE-03
- **Descrição:** carregar `test-arena.grid.json` e gerar a geometria: uma coluna por célula com a altura correta, cor/material por terreno, água semitransparente, rochas como blocos. Se existir `assets/maps/test-arena.glb`, usar o GLB e manter a grade só como camada lógica.
- **Critérios de aceite:**
  - [ ] Células do arquivo alinham com a geometria (marcador de debug em `(0,0)` e `(9,9)`).
  - [ ] Funciona sem nenhum GLB no repositório.

### [ ] CLI-04 — Overlay da grade: movimento, alcance e área
- **Epic:** client · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CLI-03, CORE-07
- **Descrição:** usando o `combat-core` no cliente para previews: destacar células alcançáveis, alvos válidos da técnica selecionada e área afetada sob o cursor. Picking de célula pelo mouse. Cores distintas por tipo de destaque, legíveis sobre todos os terrenos.
- **Critérios de aceite:**
  - [ ] Passar o mouse numa célula-alvo mostra as células afetadas pela técnica.
  - [ ] Células sem linha de visão aparecem diferenciadas.

### [ ] CLI-06 — Conexão com a sala e envio de intenções
- **Epic:** client · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CLI-01, SRV-02, SRV-04
- **Descrição:** tela simples de convite (primeiro acesso) que chama `/auth/redeem` e guarda o token no `localStorage`; tela de escolha de preset (água/fogo); conexão à `BattleRoom`; envio de intenções com `clientSeq`; tratamento de `rejected`, lacuna de `seq` e reconexão.
- **Critérios de aceite:**
  - [ ] Clique em célula alcançável envia `move` e recebe eventos.
  - [ ] Mensagem `rejected` mostra o motivo traduzido.
  - [ ] Recarregar a página durante a batalha reconecta e recebe `snapshot`.

### [ ] CLI-05 — Personagem e monstro com animações
- **Epic:** client · **Estimativa:** 4 h · **Executor:** Misto · **Depende de:** CLI-03, ART-01
- **Descrição:** carregar os GLB escolhidos em ART-01 e mapear animações para `idle`, `walk`, `cast`, `hit`, `defeat`. Enquanto não houver assets, usar placeholders (cápsula para humano, caixa achatada para monstro) com animação procedural simples. Seta/indicador de `facing`.
- **Critérios de aceite:**
  - [ ] Animações trocam conforme o estado (parado, andando, conjurando, atingido, derrotado).
  - [ ] Funciona com placeholders sem nenhum asset.

### [ ] CLI-07 — Fila de eventos animados
- **Epic:** client · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CLI-05, CLI-06
- **Descrição:** fila que consome `BattleEvent` em ordem e executa uma animação por evento (andar pelo caminho, cast, projétil/efeito, número de dano flutuante, empurrão, derrota). Input bloqueado até a fila esvaziar. Velocidade de animação ajustável (1×, 2×).
- **Critérios de aceite:**
  - [ ] Turno com técnica + reação anima na ordem correta.
  - [ ] Estado visual final igual ao estado do servidor (checagem em modo debug que compara e loga divergência).

### [ ] CLI-08 — Efeitos visuais das 8 técnicas
- **Epic:** client · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CLI-07
- **Descrição:** sistemas de partículas do Babylon para cada técnica de água e fogo e para as do monstro, com paleta por elemento. Limite global de partículas simultâneas.
- **Critérios de aceite:**
  - [ ] Cada técnica tem efeito distinguível das outras.
  - [ ] FPS ≥ 60 no painel de debug durante `fire.burst` em notebook médio.

### [ ] CLI-09 — Visual dos terrenos temporários
- **Epic:** client · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CLI-07, CORE-11
- **Descrição:** visual para `ice`, `fire`, `earth_wall`, `gust` aplicados e expirando, a partir de `cellEffectApplied`/`cellEffectExpired`. Indicador de rodadas restantes no hover.
- **Critérios de aceite:**
  - [ ] Célula muda de visual ao receber efeito e volta ao expirar.

### [ ] CLI-10 — HUD de combate
- **Epic:** client · **Estimativa:** 8 h · **Executor:** Claude · **Depende de:** CLI-06
- **Descrição:** ordem da barra de tempo (próximos 8 turnos, via `predictTurnOrder`), retratos/nomes, vida e energia do jogador e do alvo sob o cursor, painel de técnicas com custo e motivo de indisponibilidade, botões Mover/Defender/Fugir/Encerrar turno, timer do turno (60 s / 10 s), log de combate textual, tela de vitória/derrota/fuga. Todos os textos via i18n.
- **Critérios de aceite:**
  - [ ] Timer zerado mostra a defesa automática no log.
  - [ ] Técnica sem energia aparece desabilitada com o motivo.
  - [ ] Atalhos de teclado 1–4 selecionam técnicas; Esc cancela seleção.

---

## Onda 5 — Entrega

### [ ] ART-02 — Arena de teste no Blender
- **Epic:** art · **Estimativa:** 4 h · **Executor:** Humano · **Depende de:** ART-01
- **Descrição:** o Claude Code escreve `assets-src/07_MAPS/arenas/README.md` com o passo a passo: escala 1 unidade = 1 célula, origem em `(0,0)`, custom properties por célula (`cell_x`, `cell_y`, `height`, `terrain`, `blocked`), como reproduzir o layout do `test-arena.grid.json`, como exportar o GLB. O humano modela.
- **Critérios de aceite:**
  - [ ] Arena 10 × 10 com os 4 terrenos e 3 níveis de altura, coerente com o `grid.json`.

### [ ] ART-03 — Exportador Blender → `*.grid.json`
- **Epic:** art · **Estimativa:** 8 h · **Executor:** Misto · **Depende de:** ART-02, CORE-03
- **Descrição:** o Claude Code escreve `tools/blender/export_grid.py` (API `bpy`) que lê as custom properties e gera o arquivo no formato de `docs/05`, seção 3, mais um teste de formato em Node que valida a saída contra o schema. O humano roda no Blender.
- **Critérios de aceite:**
  - [ ] Exportação gera grade válida pelo schema (`pnpm validate:data`).
  - [ ] Instruções de uso no cabeçalho do script.

### [ ] QA-02 — E2E com Playwright
- **Epic:** qa · **Estimativa:** 4 h · **Executor:** Claude · **Depende de:** CLI-10, INF-02
- **Descrição:** fluxo: abrir o jogo, resgatar convite de teste, escolher preset, iniciar batalha, mover, usar técnica, encerrar turno, ver o turno do monstro. Usar atributos `data-testid` na UI React; para cliques na arena, expor uma API de teste (`window.__elementalTest.clickCell(x,y)`) só em modo de teste.
- **Critérios de aceite:**
  - [ ] Fluxo passa no CI (job separado, pode ser não bloqueante no início).

### [ ] INF-05 — Sentry no cliente e no servidor
- **Epic:** infra · **Estimativa:** 2 h · **Executor:** Misto · **Depende de:** CLI-01, SRV-01
- **Descrição:** integração com DSN por variável; desligado se vazio; contexto com `battleId` e `seed`. O humano cria o projeto no Sentry e fornece os DSNs.
- **Critérios de aceite:**
  - [ ] Erro forçado (rota/atalho de debug) aparece no painel com stack trace.

### [ ] INF-06 — Deploy
- **Epic:** infra · **Estimativa:** 8 h · **Executor:** Misto · **Depende de:** SRV-02, CLI-06
- **Descrição:** o Claude Code prepara `Dockerfile` do servidor, configuração do provedor (`fly.toml` ou `render.yaml`), build estático do cliente, workflow de deploy manual (`workflow_dispatch`) e `docs/deploy.md` com o passo a passo. O humano cria as contas, o Postgres gerenciado e os segredos.
- **Critérios de aceite:**
  - [ ] Link privado abre o jogo e uma batalha roda de ponta a ponta.
  - [ ] Migrações rodam no deploy.

### [ ] QA-03 — Teste de jogo da fatia com 3–5 pessoas
- **Epic:** qa · **Estimativa:** 4 h · **Executor:** Humano · **Depende de:** INF-06
- **Descrição:** o Claude Code prepara `docs/playtest-fatia-1.md` com roteiro da sessão, formulário (5–8 perguntas, nota de diversão 1–5) e as consultas SQL de telemetria. O humano conduz.
- **Critérios de aceite:**
  - [ ] Resultados registrados contra os critérios: batalhas de 3–6 min, vontade de continuar, FPS.
  - [ ] Decisões de calibração registradas em `docs/08-decisoes.md` e valores atualizados em `rules.json`.

---

## Fora da fatia 1 (não conta nas 47 issues)

### [ ] ART-04 — Pipeline de personagem anime 3D
- **Epic:** art · **Estimativa:** a definir · **Executor:** Misto · **Depende de:** QA-03 (combate validado), ART-01
- **Descrição:** padronizar o acabamento anime 3D (ADR-018): proporções, rosto, cabelo em mechas, roupas, rig compartilhado e exportação GLB; material toon no Babylon (sombreado em faixas + contorno seletivo); peça de teste com 1 personagem e 1 criatura na câmera isométrica. O Claude Code escreve o material/shader, o carregamento e o guia de exportação; o humano modela e ajusta no Blender.
- **Critérios de aceite:**
  - [ ] 1 personagem e 1 criatura com material toon renderizados na arena, com as animações de `docs/03`.
  - [ ] Guia em `assets-src/README.md` (ou documento próprio) com o padrão de modelagem, materiais e exportação.
  - [ ] FPS ≥ 60 no painel de debug em notebook médio com 4 combatentes em cena.
  - [ ] Todo asset de terceiros usado registrado no `LICENSES.csv`.
