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
| Turno de 60 s versus meta de batalhas de 3–6 min | 60 s | QA-01 (duração estimada) + QA-03 |
| Tamanho das arenas | 10 / 16 / 12 | Playtest |
| Raio de entrada do grupo | 8 células | Fatia 2 |
| Chance de fuga | 30 + 2×mob − 10×adj | QA-01 |
| Energia máxima e regeneração | 40 + 2×esp; 2 + esp/10 + conc/10 | QA-01 (uso por técnica) |
| Dano, precisão e custo das técnicas | `docs/05` §4 | QA-01 (taxa de vitória 60–75% contra 1 monstro como alvo inicial) |
| Bônus de flanco e altura | `docs/02` §6.3–6.4 | QA-01 + playtest |
| Duração dos efeitos de terreno | 2–3 rodadas | Playtest |
| Perda de XP na derrota | 5% do próximo nível | Fatia 3 |
| Atraso entre ações da IA | 400 ms | Playtest |
| Pesos dos perfis de IA (`ai.profiles` em `rules.json`) | definidos em IA-01/IA-02 | QA-01 + playtest |

## Riscos registrados

- **Escopo × tempo:** 214 h só na fatia 1 a menos de 10 h/semana. Cortes possíveis se a estimativa estourar: IA por regras antes da utilidade; adiar Playwright e deploy para a fatia 2.
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
| 2026-11-04 | QA-01 | Simulador (1.000 batalhas, IA × IA): fogo × 1 monstro 96,8% de vitória; água × 1 35,6%; contra 2 monstros ≈ 0–2%. Meta é 60–75% contra 1. Também: a IA nunca usa `water.shield` (nenhuma consideração valoriza defesa) e o dano do `fire.surge` não entra na estimativa (alvo = inimigos adjacentes à chegada). Calibrar números e/ou considerações. | Pendente (balanceamento) |
| 2026-11-04 | CLI-02 | Valores PROVISÓRIOS da ADR-022: tile 64 × 32 px, degrau de altura 16 px, sprite 64 × 96 px, 4 direções no combate e 8 na exploração. Confirmar com o personagem de referência (ART-04). | Pendente |
| 2026-11-04 | ART-01 | Packs 2D: LPC é CC-BY-SA/GPL (fora das licenças aceitas); PtDesigns e 0x72 têm CC0 só declarado na página; Newc42 veio sem arquivo de licença no download. Decidir se aceita licença declarada só na página ou se a fatia 1 segue só com formas temporárias. | Pendente |
