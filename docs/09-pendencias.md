# 09 — Pendências e valores a calibrar

> Quando o Claude Code esbarrar em algo indefinido, ele adiciona uma linha aqui (em "Novas dúvidas") e pergunta ao dono do projeto. Não decidir sozinho.

## Perguntas de design em aberto

| Pendência | Quando resolver |
| --- | --- |
| Nomes e descrições finais das 8 técnicas da fatia 1 (hoje provisórios) | Antes do QA-03 |
| Definição das outras 8 técnicas base (terra e ar) e das 4 especializações | Antes da fatia 2 |
| Justificativa narrativa dos mestres de nações fora do mapa (gelo, cura, relâmpago) | Documento de lore |
| Ar sem especialização no protótipo, num mapa da Nação do Ar | Antes da fatia 3 |
| Penalidade quando todos desconectam: derrota cheia ou reduzida | Multiplayer |
| Derrota causada por PvP também tira XP? | PvP |
| Endgame: evolução após a maestria máxima | Pós-protótipo |
| Modelo de monetização (princípio fixo: nada que venda poder no PvP) | Pós-protótipo |
| Nomes finais e lore do universo | Documento à parte |

## Valores a calibrar (todos em `rules.json` ou nos dados)

| Valor | Valor provisório | Como calibrar |
| --- | --- | --- |
| Turno de 60 s versus meta de batalhas de 3–6 min | 60 s | QA-01 (2026-11-04): duração estimada 3:05 (fogo) e 3:40 (água) contra 1 monstro, com 20 s por turno de jogador. Confirmar no QA-03 com tempo real |
| Tamanho das arenas | 10 / 16 / 12 | Playtest |
| Raio de entrada do grupo | 8 células | Fatia 2 |
| Chance de fuga | 30 + 2×mob − 10×adj | QA-01 |
| Energia máxima e regeneração | 40 + 2×esp; 2 + esp/10 + conc/10 | QA-01 (uso por técnica) |
| Dano, precisão e custo das técnicas | `docs/05` §4 | QA-01 (2026-11-04): `water.whip` power 10 → 14; `monster.claw` power 10 → 8. Vitória contra 1 monstro: fogo 68–69%, água 65–68% (1.000 batalhas, seeds 1 e 10001) |
| Vida dos presets e do monstro | água 100, fogo 95, Fera 90 | QA-01 (2026-11-04): água 140, fogo 122, Fera de garra 160. Contra 2 monstros: 0% (sem meta) |
| Bônus de flanco e altura | `docs/02` §6.3–6.4 | QA-01 + playtest |
| Duração dos efeitos de terreno | 2–3 rodadas | Playtest |
| Perda de XP na derrota | 5% do próximo nível | Fatia 3 |
| Atraso entre ações da IA | 400 ms | Playtest |
| Pesos dos perfis de IA (`ai.profiles` em `rules.json`) | definidos em IA-01/IA-02 | QA-01 (2026-11-04): nova consideração `protection` (peso 1,0 no `balanced`, ADR-026). Pesos dos perfis mantidos; playtest |

## Riscos registrados

- **Escopo × tempo:** 210 h só na fatia 1 a menos de 10 h/semana. Cortes possíveis se a estimativa estourar: IA por regras antes da utilidade; adiar Playwright e deploy para a fatia 2.
- **Batalhas longas:** turnos de 60 s podem estourar a meta de 3–6 min.
- **Perda de XP + PvP de terceiro lado:** pode gerar frustração; revisar no multiplayer.

## Novas dúvidas

| Data | Issue | Dúvida | Resposta |
| --- | --- | --- | --- |
| 2026-11-03 | CORE-15 | `TechniqueSchema.element` era obrigatório, mas técnicas de monstro não têm elemento. Adotado `element: null` (ADR-015). Confirmar. | Pendente |
| 2026-11-03 | CORE-08 | `docs/02` §6.4 não define flanco para atacante na diagonal exata do alvo (ex.: alcance 2 em diagonal). Adotado: componente dominante do vetor alvo→atacante; diagonal exata = lado. Confirmar. | Pendente |
| 2026-11-04 | ART-01 | Humanoide, animações e natureza aprovados (KayKit, CC0). **Quadrúpede sem candidato:** os packs animados do Quaternius vêm sem arquivo de licença no download e não têm attack/hit (Farm Animals) ou não têm quadrúpede (Monster Pack); Kenney inacessível (o site devolve 403 a acesso automatizado). Decidir: aceitar a licença da página do Quaternius, procurar outro pack ou manter o placeholder (caixa) do monstro na fatia 1. | Resolvido (dono, 2026-11-04): placeholder do monstro na fatia 1; Kenney descartado; texturas adiadas (ADR-021). |
| 2026-11-04 | CORE-09 | Interpretações da resolução de técnicas (linha reta do `fire.surge`, alvo do dano após dash, aterrissagem do `pounce`, fogo amigo em área, quando rolar acerto, `shielded`, duração de estados). Ver ADR-016. Confirmar. | Pendente |
| 2026-11-04 | CORE-11 | Detalhes de terreno: fogo ao entrar também em dash/empurrão, quem cai para na célula, `earth_wall` não em célula ocupada, morte por fogo no início do turno passa a vez (ADR-017). Confirmar. | Pendente |
| 2026-11-04 | CORE-12 | Detalhes das reações: definição de corpo a corpo, contra-ataque com teste de acerto e 50% do dano final, dano de `burning` no início do turno (ADR-019). Confirmar. | Pendente |
| 2026-11-04 | SRV-05 | `INVITE_CODES` não define quantos usos tem cada convite. Adotado: 1 uso por padrão, com sintaxe opcional `CODIGO:N` (ex.: `ALPHA-001:5`). Confirmar. | Pendente |
| 2026-11-04 | SRV-04 | O limite por IP usa o endereço do socket; atrás de proxy no deploy (INF-06) vira o IP do proxy. Decidir se confiamos em `X-Forwarded-For` do provedor. | Pendente (INF-06) |
| 2026-11-04 | ART-04 | Proposta do dono: direção 2D em pixel art (Phaser 4 + Tiled + Aseprite), com personagem de referência 64×96 px, 8 direções, idle/caminhada e paleta inspirada em Breath of Fire IV. Decisão: **manter 3D (ADR-002/018) na fatia 1**; fazer o personagem de referência como estudo de estilo na ART-04 e, se convencer, abrir nova ADR depois da fatia 1. LPC (CC-BY-SA/GPL), PtDesigns e 0x72 DungeonTileset II ficam só como referência, não aprovados (ver `assets-src/09_LICENSES/README.md`). | Resolvido (dono, 2026-11-04): direção 2D pixel art com Phaser 4 adotada (ADR-022). |
| 2026-11-04 | QA-01 | Simulador (1.000 batalhas, IA × IA): fogo × 1 monstro 96,8% de vitória; água × 1 35,6%; contra 2 monstros ≈ 0–2%. Meta é 60–75% contra 1. Também: a IA nunca usa `water.shield` (nenhuma consideração valoriza defesa) e o dano do `fire.surge` não entra na estimativa (alvo = inimigos adjacentes à chegada). Calibrar números e/ou considerações. | Calibrado (2026-11-04, ADR-026): IA passou a usar `water.shield` e a estimar o dano do `fire.surge`; vida e dano ajustados (`docs/05`). Resultado: fogo × 1 68–69%, água × 1 65–68%, 3–3,7 min; × 2 = 0%. **Para o dono decidir:** meta para 2 monstros (hoje inviável sem mudar regra ou preset — ver relatório QA-01). |
| 2026-11-04 | CLI-02 | Valores PROVISÓRIOS da ADR-022: tile 64 × 32 px, degrau de altura 16 px, sprite 64 × 96 px, 4 direções no combate e 8 na exploração. Confirmar com o personagem de referência (ART-04). | Aprovado como PROVISÓRIO (dono, 2026-11-04): vale até a ART-04 validar com um personagem animado e uma pequena área jogável; ART-02 não trata como definitivo. 8 direções não exigem 8 conjuntos exclusivos: avaliar espelhamento das opostas. |
| 2026-11-04 | ART-01 | Packs 2D: LPC é CC-BY-SA/GPL (fora das licenças aceitas); PtDesigns e 0x72 têm CC0 só declarado na página; Newc42 veio sem arquivo de licença no download. Decidir se aceita licença declarada só na página ou se a fatia 1 segue só com formas temporárias. | Resolvido (dono, 2026-11-04): fatia 1 só com formas temporárias; nenhum pack entra sem licença verificada no download e arquivada em `09_LICENSES`; prioridade a CC0 com evidência; LPC fora enquanto CC-BY-SA/GPL não for aceita. ART-01 segue procurando sem bloquear a fatia. |
| 2026-11-04 | ART-04 | Trabalho futuro (depois da fatia 1, ADR-024): sistema de personagem de `docs/10` §18 (componentes modulares, expressões, `run`/`dodge`/`recover`/`celebrate` e variações de ataque, customização, recoloração multicanal, biblioteca de efeitos, manifesto de aparência, reuso em NPCs). Criar issues próprias com estimativa usando os números medidos pela ART-04. | Futuro |
| 2026-11-04 | QA-01 | QA-01: 2 monstros = 0% de vitória; recalibrar na fatia 2. | Pendente (fatia 2) |
| 2026-11-04 | CLI-03 | O caminho do mapa Tiled (`assets/maps/test-arena.tmj`) está implementado, mas não foi verificado com um mapa real: só o desenho procedural foi testado. Verificar quando a ART-02 entregar o mapa (origem da camada e alinhamento com a grade). | Pendente (ART-02) |
| 2026-11-04 | CLI-04 | Nomes de exibição de `monster.claw` e `monster.pounce` não existem em `docs/05`; usei "Garra" e "Bote" (provisórios, em `pt-BR.json`). Confirmar junto com os nomes finais das técnicas. | Pendente |
| 2026-11-04 | CLI-05 | Personagens e monstro usam placeholders gerados em código no contrato de sprite (64 × 96, âncora (32, 90), `setOrigin(0.5, 90/96)`, E/N desenhados e S/W espelhados). Falta o passo humano: atlas do Aseprite (ART-01/ART-04) e o schema do manifesto (`docs/10` §11) para o cliente carregá-los no lugar dos placeholders. | Pendente (humano) |
| 2026-11-07 | ART-04 | Ferramenta de apoio à produção de sprites: adotar o [perfectpixel-studio](https://github.com/gykim80/perfectpixel-studio) (MIT; app desktop Wails + Go + React; chave de API Gemini/OpenRouter/fal.ai/BytePlus) para gerar rascunhos de personagem (8 direções, 5 geradas + 3 espelhadas; exporta PNG, JSON compatível com Aseprite e `manifest.json`). Ponto em aberto: o README não cita imagem de referência como entrada (só texto) nem a resolução dos frames. Plano: (1) humano roda localmente e gera 1 personagem de teste; (2) Claude escreve script que converte a exportação para o contrato de sprite (64 × 96, âncora (32, 90), paleta do elemento) e para o manifesto `docs/10` §11; (3) retoque final no Aseprite. Saída de IA é rascunho, não arte final (`docs/01` §7: arte original); registrar modelo, prompt e licença em `assets-src/09_LICENSES`. | Pendente (humano: teste local) |
