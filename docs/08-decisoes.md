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
