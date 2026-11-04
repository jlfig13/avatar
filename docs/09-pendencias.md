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

## Riscos registrados

- **Escopo × tempo:** 214 h só na fatia 1 a menos de 10 h/semana. Cortes possíveis se a estimativa estourar: IA por regras antes da utilidade; adiar Playwright e deploy para a fatia 2.
- **Batalhas longas:** turnos de 60 s podem estourar a meta de 3–6 min.
- **Perda de XP + PvP de terceiro lado:** pode gerar frustração; revisar no multiplayer.

## Novas dúvidas

| Data | Issue | Dúvida | Resposta |
| --- | --- | --- | --- |
| 2026-11-03 | CORE-15 | `TechniqueSchema.element` era obrigatório, mas técnicas de monstro não têm elemento. Adotado `element: null` (ADR-015). Confirmar. | Pendente |
| 2026-11-03 | CORE-08 | `docs/02` §6.4 não define flanco para atacante na diagonal exata do alvo (ex.: alcance 2 em diagonal). Adotado: componente dominante do vetor alvo→atacante; diagonal exata = lado. Confirmar. | Pendente |
| 2026-11-04 | ART-01 | Validação dos packs (KayKit Adventurers, KayKit Character Animations, KayKit Forest Nature Pack, Kenney Nature Kit, Quaternius UAL) e busca de quadrúpede CC0 animado não executadas: a rede do ambiente bloqueia `kaylousberg.itch.io`, `kenney.nl` e `quaternius.itch.io` (403). Liberar os domínios ou baixar manualmente. Quadrúpede segue sem candidato. | Pendente |
| 2026-11-04 | CORE-09 | Interpretações da resolução de técnicas (linha reta do `fire.surge`, alvo do dano após dash, aterrissagem do `pounce`, fogo amigo em área, quando rolar acerto, `shielded`, duração de estados). Ver ADR-016. Confirmar. | Pendente |
| 2026-11-04 | CORE-11 | Detalhes de terreno: fogo ao entrar também em dash/empurrão, quem cai para na célula, `earth_wall` não em célula ocupada, morte por fogo no início do turno passa a vez (ADR-017). Confirmar. | Pendente |
