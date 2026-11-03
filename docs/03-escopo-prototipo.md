# 03 — Escopo do protótipo

> O protótipo é **single-player** e existe para provar uma hipótese: **o ciclo exploração → batalha tática → retorno ao mundo é divertido.** Multiplayer só entra depois dessa validação.

## 1. Objetivo e validação

| Item | Decisão |
| --- | --- |
| Hipótese | O ciclo exploração → batalha → retorno é divertido |
| Critérios de sucesso | Testadores jogam 20+ min sem pedir; pedem para continuar; 60 FPS em notebook médio; batalhas médias de 3–6 min |
| Duração da sessão | 30–45 min |
| Testadores | 5–10 pessoas próximas + comunidade pequena |
| Feedback | Formulário curto após a sessão + telemetria anônima |
| Gate para multiplayer | Critérios de sucesso atingidos com 5+ testadores |
| Se reprovar | Iterar o combate antes de qualquer conteúdo novo |

## 2. Conteúdo do protótipo completo (todas as fatias)

| Item | Decisão |
| --- | --- |
| Elementos | Os 4: água, terra, fogo, ar |
| Técnicas base | 4 por elemento (ataque, defesa, controle, mobilidade/utilidade) = 16 |
| Especializações | 4: gelo e cura (água), relâmpago (fogo), metal (terra). Ar sem especialização |
| Mestres | 1 por especialização; fluxo completo de descoberta em ao menos 1, resumido nos demais |
| Prova prática | Batalha tática com objetivo especial |
| Monstros | 3 tipos comuns (corpo a corpo, à distância, controlador) + 1 chefe |
| IA | Avaliação de utilidade |
| Mapa | Vila + região na fronteira entre as nações do Ar e da Terra; travessia de 8–10 min a pé |
| Terrenos | Água rasa/rio, desníveis e penhascos, vegetação inflamável, rocha |
| Dia/noite | Não |
| Reputação | Não entra |
| Nível máximo | 10 |
| Maestria | Iniciante → Aprendiz → Adepto |
| Atributos | Distribuição manual, reset livre |
| Equipamento | 5 slots: cabeça, corpo, pernas, pés, acessório |
| Obtenção de itens | Drop de monstros e loja na vila |
| Comércio | Troca por materiais, sem moeda |
| Consumíveis | Vida e energia (usar gasta a ação) |
| Derrota | Perda de XP; sem durabilidade |
| Combate | Barra de tempo completa; altura, flanco, linha de visão; terreno temporário |
| Assets | Packs prontos CC0/licenciados, com ajustes |
| Personagem | 2 corpos-base (masculino e feminino) com rig compartilhado |
| Animações | idle, walk, run, cast, hit, defeat |
| Áudio | SFX de técnicas e UI + 1–2 músicas CC0 |
| Plataforma e input | Desktop; clique para mover |
| Interface | React (telas) + Babylon GUI (no mundo) |
| Tutorial | Primeira batalha guiada + dicas contextuais |
| Idioma | Português, com textos externalizados |
| Save | Backend: Node.js + PostgreSQL |
| Hospedagem | Link privado: frontend estático + backend pequeno |

## 3. Fatias jogáveis

Cada fatia termina num build testável. Não começar a fatia seguinte antes de a anterior passar no próprio teste.

| Fatia | Entrega | Prova |
| --- | --- | --- |
| **1. Arena isolada** | Batalha tática completa numa arena de teste, combate rodando no servidor, 2 elementos (água e fogo), 1 monstro com IA por utilidade | O combate por si só é interessante? Batalhas de 3–6 min? |
| 2. Mapa + encontro | Exploração com clique para mover, gatilho de batalha por contato, recorte da arena do mapa, retorno ao mundo, terra e ar, 3 monstros | O ciclo exploração ↔ batalha funciona? |
| 3. Mestre | Vila, rumores, mestre, treino, prova prática, especializações, progressão até nível 10, itens, loja, consumíveis | A progressão motiva? |
| 4. Chefe | Arena 16 × 16, chefe, tutorial guiado, áudio, polimento, teste com 5–10 pessoas | Critérios de sucesso do protótipo |

## 4. O que NÃO entra na fatia 1

Exploração, mapa grande, gatilho de encontro, retorno ao mundo, terra e ar, especializações, mestres, itens, equipamento, loja, consumíveis, progressão de nível, tutorial, áudio, personagem modular, segundo corpo-base, multiplayer real (o servidor já é autoritativo, mas com 1 jogador).

## 5. Pós-protótipo

Multiplayer e sincronização entre jogadores, especializações além das quatro, reputação, durabilidade e reparo, moeda e economia completa, spritesheets pré-renderizados, guildas, eventos, PvP, endgame, monetização.
