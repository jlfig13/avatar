# 08 — Registro de decisões (ADRs)

> Formato: contexto curto, decisão, consequências. Novas decisões entram no fim com o próximo número. Decisões não são apagadas; uma decisão revista recebe nova entrada que a substitui.

## ADR-001 — Universo próprio em vez de fan game
- **Contexto:** o projeto mira publicação; usar IP de terceiros impede distribuição.
- **Decisão:** universo próprio, nomes neutros provisórios; termos do IP original proibidos.
- **Consequências:** lore e nomes finais ficam para documento à parte; o sistema de jogo não depende do IP.

## ADR-002 — 3D isométrico com Babylon.js
- **Contexto:** GDD v1.0 previa 2D/Phaser; o manual de arte, 3D.
- **Decisão:** 3D estilizado, câmera ortográfica isométrica, Babylon.js + TypeScript.
- **Consequências:** personagens modulares em 3D; sprites pré-renderizados só no pós-protótipo.

## ADR-003 — Sem combinação entre elementos
- **Decisão:** cada personagem atua só com o próprio elemento; efeitos de terreno não se fundem (o mais recente substitui).
- **Consequências:** regras de terreno simples; sinergia de grupo vem de posicionamento e papéis.

## ADR-004 — Arena como recorte do mapa
- **Decisão:** a arena tática é um recorte da grade global do mapa no ponto do encontro.
- **Consequências:** a grade lógica global é a fonte da verdade; o mapa precisa ser bom para combate em qualquer ponto.

## ADR-005 — Barra de tempo (CT) individual
- **Decisão:** ordem por CT; mobilidade define velocidade; técnicas pesadas atrasam.
- **Consequências:** ritmo tático estilo FFT; previsão de turnos na HUD.

## ADR-006 — Turno = movimento + 1 ação
- **Decisão:** em qualquer ordem, uma vez cada. Timeout de 60 s → defesa automática; 3 timeouts → 10 s.

## ADR-007 — Protótipo single-player com servidor autoritativo e Colyseus desde já
- **Contexto:** o multiplayer vem depois, mas a lógica precisa ser reaproveitada.
- **Decisão:** combate roda numa sala Colyseus mesmo com 1 jogador.
- **Consequências:** ~30 h a mais na fatia 1; o multiplayer vira "mais jogadores na mesma sala".

## ADR-008 — Core de combate em TypeScript puro, imutável e determinístico
- **Decisão:** `@elemental/combat-core` sem dependências de runtime; `applyAction` puro; RNG com seed.
- **Consequências:** testes fáceis, replay, simulador de balanceamento, mesmo código no cliente para previews.

## ADR-009 — Dados de jogo em JSON validado por Zod
- **Decisão:** técnicas, monstros e números de regra fora do código.
- **Consequências:** balancear sem mexer em código; validação no CI.

## ADR-010 — Monólito modular
- **Decisão:** um processo Node; serviços do GDD como módulos.
- **Consequências:** menos operação para equipe solo; extração futura possível pelas fronteiras dos módulos.

## ADR-011 — Arena da fatia 1 procedural a partir da grade
- **Contexto:** a arte (ART-02) depende do humano e não deve bloquear o desenvolvimento.
- **Decisão:** o cliente gera a geometria da arena a partir do `*.grid.json` quando não há GLB.
- **Consequências:** fatia 1 jogável sem arte; o GLB substitui o visual quando existir.

## ADR-012 — Valores numéricos provisórios
- **Contexto:** o design definiu as regras, não os números.
- **Decisão:** fórmulas e números marcados PROVISÓRIO em `docs/02` e `docs/05` destravam a implementação e ficam em `rules.json`.
- **Consequências:** calibração por simulador (QA-01) e playtest (QA-03); toda mudança registrada aqui.

## ADR-013 — Pacotes do monorepo resolvidos pela fonte em dev e por `dist/` no build (INF-01)
- **Contexto:** os pacotes se importam pelo nome (`workspace:*`); exigir build antes de typecheck/testes deixaria o ciclo lento e frágil.
- **Decisão:** cada pacote exporta a condição `@elemental/source` → `src/index.ts`, usada por `tsc --noEmit` (`customConditions`) e pelo Vitest. O `pnpm build` ignora essa condição e consome `dist/` dos pacotes já compilados (ordem topológica do `pnpm -r`). O isolamento do `combat-core` é garantido pelo Biome (`noRestrictedImports` + `noNodejsModules`).
- **Consequências:** typecheck e testes sem build prévio; build real valida a resolução via `dist/`. Quando o cliente virar app Vite (CLI-01), configurar a mesma condição no Vite.

## ADR-014 — `GameData` em `@elemental/shared` e validação pura no `game-data` (CORE-14)
- **Contexto:** `applyAction` recebe `data: GameData`, mas o `combat-core` não pode depender do `game-data`.
- **Decisão:** os schemas Zod e o tipo `GameData` (inferido dos schemas) ficam em `@elemental/shared`; o core importa só tipos (`import type`), então o Zod não entra no runtime do core. O `game-data` tem `buildGameData(files)` puro (schema + IDs duplicados + referências cruzadas), usado pelo `index.ts` (imports JSON, funciona no navegador e no servidor) e pelo `pnpm validate:data` (lê do disco e acusa JSON malformado e arquivos fora da lista `src/files.ts`). Schemas usam `z.strictObject` para recusar campos desconhecidos (erros de digitação nos dados).
- **Consequências:** um só caminho de validação; o build do `game-data` emite `dist/src` e `dist/data`.

## ADR-015 — Técnicas de monstro sem elemento (CORE-15)
- **Contexto:** o `TechniqueSchema` de `docs/05` §4 exigia `element`, mas os monstros podem não ter elemento (`Combatant.element: Element | null`) e `monster.claw`/`monster.pounce` não têm um.
- **Decisão:** `element` da técnica passa a ser anulável; técnicas de monstro usam `null`. `CombatantInput` (citado em `docs/05` §9 sem forma) foi definido com `template: { kind: 'preset' | 'monster', id }` e `facing` obrigatório.
- **Consequências:** regras ligadas a elemento (ex.: bônus de água em água rasa) simplesmente não se aplicam a técnicas sem elemento. Mudança pendente de confirmação do dono (registrada em `docs/09`).

## ADR-016 — Interpretações da resolução de técnicas (CORE-09)
- **Contexto:** `docs/02` §6 e `docs/05` §4 deixam lacunas que a implementação precisa fechar.
- **Decisão:**
  - `dash` ganha o campo opcional `straightLine` (usado por `fire.surge`, "em linha reta").
  - Dano após `dash`: alvo `enemy` (`monster.pounce`) → o próprio alvo; alvo `cell` (`fire.surge`) → inimigos adjacentes à célula de chegada.
  - `monster.pounce` pousa na célula adjacente ao alvo de menor custo de caminho (empate: N, E, S, O) e termina virado para o alvo.
  - Área atinge todos os combatentes vivos nas células afetadas (aliados inclusive); técnicas de alvo `enemy`/`cell` nunca atingem o próprio usuário.
  - Um teste de acerto por alvo, só em técnicas de alvo `enemy`/`cell`; `ally`/`self` sempre acertam. Efeitos não-dano (estado, empurrão) só valem nos alvos atingidos.
  - `shielded` multiplica o dano recebido por `1 − magnitude` (`water.shield`: 0,3 → −30%), junto com `multDefender`.
  - Estados contam duração em rodadas e expiram no fim da rodada (`statusExpired`), exceto `defending`, que sai no início do próximo turno do dono.
  - `dash` não consome o movimento do turno (`water.glide`) e gasta a ação.
- **Consequências:** comportamento previsível para a IA e os testes; tudo marcado como pendente de confirmação em `docs/09`.

## ADR-017 — Detalhes do terreno temporário (CORE-11)
- **Decisão:** dano de `fire` ao entrar vale para movimento, `dash` e empurrão; o caminho continua, mas quem cai para na célula em que caiu. `gust` só empurra quem **termina** movimento ou `dash` na célula (empurrão não encadeia `gust`). `earth_wall` não é erguido em célula ocupada. Quem cai por fogo no início do próprio turno perde o turno na hora. Efeitos de célula vindos de técnica valem em todas as células afetadas, independentemente de acerto; `gust` usa a direção do usuário.
- **Consequências:** regras determinísticas para IA e cliente; pendentes de confirmação em `docs/09`.

## ADR-018 — Direção de arte anime 3D como alvo de produção, fora da fatia 1
- **Contexto:** o GDD previa "3D estilizado" low-mid poly. O dono definiu como identidade visual um JRPG com acabamento anime 3D (personagens com proporções de anime, materiais toon, texturas pintadas). Não há pacote CC0 que entregue isso pronto, e o pipeline (rosto, cabelo, roupas, materiais, animações) é trabalho grande para uma pessoa com menos de 10 h/semana. A fatia 1 valida o combate, não a arte.
- **Decisão:** anime 3D com câmera isométrica ortográfica é o alvo de produção (`docs/01`, §7). A fatia 1 mantém a ART-01 com escopo e critérios originais, usando assets CC0 como **auxiliares** e placeholders como **temporários**. O pipeline anime fica na nova issue ART-04, fora da fatia 1, iniciada só depois da validação do combate. O sombreado toon e o contorno são implementados no Babylon (o GLB não carrega o Toon BSDF do Blender).
- **Consequências:** a fatia 1 não atrasa por arte; assets são classificados em produção, auxiliares e temporários (`assets-src/09_LICENSES/README.md`); referências visuais de jogos de terceiros servem só como inspiração e nenhum modelo extraído ou fan-made entra no projeto.
## ADR-019 — Detalhes das reações (CORE-12)
- **Decisão:** "corpo a corpo" = atacante a 1 célula do alvo no momento do acerto. Só acertos de dano disparam `hitByMelee`/`hitByAny` (erro não dispara). O contra-ataque usa o ataque básico (primeira técnica do reagente), com teste de acerto normal, e causa `max(minDamage, round(dano × damageMultiplier))`. `Refluxo` empurra o atacante na direção reagente → atacante. `burning` causa `magnitude` de dano no início de cada turno do dono (evento `damaged` com `source: 'reaction'`). A reação conta como usada mesmo se o contra-ataque errar; o reset acontece no fim da rodada. `enemyEntersAdjacent` dispara quando um inimigo termina movimento ou `dash` adjacente, vindo de uma posição não adjacente.
- **Consequências:** sem cadeias (efeitos de reação nunca avaliam gatilhos); pendente de confirmação em `docs/09`.

## ADR-020 — IA por utilidade: pesos em `rules.json` e validação por simulação (IA-01)
- **Decisão:** pesos por perfil em `rules.json` (`ai.profiles`), cada consideração é uma função pura registrada por id. A escolha final é validada simulando as ações com `applyAction` (o mesmo core do servidor), o que garante nunca devolver ação inválida sem duplicar regras de validação na IA. O desempate usa um RNG derivado do estado e não consome o RNG da batalha.
- **Consequências:** a IA não altera a sequência aleatória da batalha; novos perfis/considerações entram por dados + registro.

## ADR-021 — Monstro quadrúpede como placeholder na fatia 1 (ART-01)
- **Contexto:** nenhum quadrúpede animado CC0 passou na verificação: os packs do Quaternius vêm sem arquivo de licença no download e não têm `attack`/`hit` (Farm Animals) ou não têm quadrúpede (Monster Pack); o Kenney não pôde ser verificado. A CLI-04 já prevê placeholder (caixa achatada) com animação procedural.
- **Decisão:** na fatia 1, o `monster.clawbeast` usa o placeholder temporário. A ART-01 fecha com humanoide, animações e natureza KayKit (CC0). Kenney Nature Kit fica descartado; texturas de terreno seguem adiadas (ADR-011).
- **Consequências:** a fatia 1 não depende de modelo de criatura; a escolha do quadrúpede volta junto com a ART-04 (produção) ou quando surgir um pack com licença comprovada no download.

## ADR-021 — Sala de batalha: sessão separada do transporte e reconexão no single-player (SRV-02)
- **Decisão:** a lógica de estado da sala fica em `BattleSession` (estado + ações registradas + `replay`), sem dependência do Colyseus; a `BattleRoom` cuida de transporte, timers e IA. O `snapshot` omite `seed` e `rngState` (o cliente poderia prever rolagens). A seed vem de `crypto.randomInt` no servidor. Na fatia 1 há um único jogador, então a queda dele cai na regra "todos os jogadores caem" de `docs/02` §10: a batalha pausa (timers e IA param) por `disconnect.allDisconnectedPauseSeconds` e, sem retorno, a sala encerra como `abandoned` (telemetria). A regra de "3 rodadas" fica para o multiplayer, quando houver outro jogador ativo. O cliente é `@colyseus/sdk` (sucessor do `colyseus.js` na 0.18).
- **Consequências:** replay por seed + ações em log; testes da sala sem banco (autenticação injetável).
