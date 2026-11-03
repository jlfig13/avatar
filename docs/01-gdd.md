# 01 — Game Design Document v1.1

> Fonte da verdade do design. Unifica o GDD v1.0 e o Manual de Direção de Arte. Onde divergiam, valem as decisões da seção 0.
> Nomes de nações, lugares e técnicas são **provisórios e neutros**. Lore e nomes finais ficarão em documento à parte.

## 0. Decisões da versão 1.1

| Tema | v1.0 (antes) | v1.1 (decisão) |
| --- | --- | --- |
| Universo | Fan game de Avatar | Universo próprio; nomes neutros provisórios |
| Objetivo | Não definido | Jogo para publicação |
| Equipe | Não definida | Solo, com apoio de IA |
| Visual | GDD: 2D isométrico; Manual: 3D | 3D estilizado com câmera isométrica ortográfica |
| Motor | GDD: Phaser 4 + Tiled; Manual: Babylon.js | Babylon.js + TypeScript |
| Personagens | Spritesheets ou 3D | Jogador e NPCs próximos em 3D em tempo real; sprites pré-renderizados só no pós-protótipo |
| Arena tática | Sem regra | Recorte do mapa atual com grade lógica sobreposta |
| Combinações entre elementos | Sinergias entre jogadores | **Removidas.** Cada personagem atua apenas com o seu elemento |
| Monetização | Não definida | Decidida após o protótipo. Princípio fixo: nada que venda poder no PvP |
| Terminologia | "Dobra", "subdobra", "dobrador" | "Domínio elemental", "especialização", "usuário de [elemento]" |
| Protótipo | Multiplayer desde o início | Single-player primeiro; multiplayer após validação |

## 1. Visão geral

MMORPG 3D isométrico para navegador, em mundo próprio dividido entre quatro nações elementais. Cada personagem domina um único elemento — água, terra, fogo ou ar — e evolui aprendendo técnicas e especializações com mestres espalhados pelo mundo.

| Item | Definição |
| --- | --- |
| Gênero | MMORPG 3D isométrico |
| Combate | Híbrido: exploração em tempo real + batalhas táticas por turnos |
| Plataforma | Navegador desktop (Chrome, Edge, Firefox) |
| Multiplayer | Mundo compartilhado e persistente (após o protótipo) |

Pilares: mundo persistente; progressão individual com especialização profunda; combate tático com posicionamento; exploração em tempo real; mestres espalhados pelo mundo; especializações raras; economia, grupos e guildas; PvE e PvP.

## 2. Sistema elemental

O elemento de origem é escolhido na criação do personagem e é **permanente**. Não existe segundo elemento nem combinação entre elementos de jogadores diferentes.

| Elemento | Identidade | Especializações |
| --- | --- | --- |
| Água | Adaptação, controle, recuperação, mobilidade | Gelo · Cura · Manipulação avançada de água · Controle de fluidos em seres vivos (restrita) |
| Terra | Defesa, resistência, controle territorial, impacto | Metal · Areia · Lava · Cristal |
| Fogo | Pressão ofensiva, velocidade, dano | Relâmpago · Combustão · Chama azul · Concentração de energia |
| Ar | Mobilidade, evasão, controle de espaço, interrupção | Projeção espiritual · Vácuo · Manipulação sonora · Mobilidade aérea |

Regras de balanceamento:

- Cada elemento tem opções ofensivas, defensivas e de controle.
- Cada especialização tem vantagens **e** limitações.
- Técnicas raras têm utilidades específicas, não apenas números maiores.
- Nenhuma especialização pode se tornar obrigatória. Um usuário de água sem gelo continua competitivo.

## 3. Progressão

A classe não é escolhida: ela surge da combinação de elemento, técnicas, atributos e equipamentos.

| Dimensão | O que representa | O que libera |
| --- | --- | --- |
| Nível geral | Evolução do personagem | Pontos de atributo, equipamentos, regiões, missões |
| Maestria elemental | Experiência prática com o elemento | Novas técnicas por estágio |
| Técnicas | Habilidades aprendidas | Treino, missões, desafios; algumas exigem demonstração |
| Especializações | Ramos avançados do elemento | Aprendidas com mestres |
| Reputação | Relação com regiões e organizações | Treinadores, missões, comércio (fora do protótipo) |

Estágios de maestria: Iniciante → Aprendiz → Adepto → Especialista → Mestre → Grão-mestre.

### 3.1 Arquétipos (funções, não classes)

- **Controlador:** imobilização, redução de mobilidade, controle de terreno, interrupção.
- **Combatente:** dano direto, pressão, combos.
- **Guardião:** proteção de aliados, defesa, bloqueio de áreas.
- **Especialista:** técnicas raras, manipulação de campo.
- **Suporte:** recuperação, fortalecimento, remoção de efeitos negativos.

### 3.2 Builds

Uma build = 1 elemento + 1 especialização principal (quando houver) + estilo + técnicas ativas e passivas + atributos + equipamentos. O jogador salva várias e só troca em locais apropriados, nunca em batalha. (Builds salvas ficam fora da fatia 1.)

### 3.3 Atributos

| Atributo | Chave no código | Efeito |
| --- | --- | --- |
| Poder elemental | `power` | Intensidade das técnicas (dano/cura) |
| Controle | `control` | Precisão e estabilidade de efeitos |
| Resistência | `resistance` | Redução de dano recebido |
| Mobilidade | `mobility` | Movimento e velocidade da barra de tempo |
| Espírito | `spirit` | Energia máxima e regeneração |
| Concentração | `focus` | Eficiência de energia e duração de efeitos |

Controle, proteção, mobilidade e suporte precisam ter valor estratégico equivalente ao dano.

### 3.4 Mestres e especializações

Especializações são **descobertas**, não ficam numa árvore visível. Fluxo: ouvir rumor → encontrar o mestre → atender requisitos → treinar (missões) → prova prática (batalha tática com objetivo especial) → desbloquear. Treinar nunca é apenas comprar.

## 4. Mundo

| Nação (provisório) | Geografia |
| --- | --- |
| Nação da Água | Costas, regiões geladas, lagos, vilarejos |
| Nação da Terra | Grandes cidades, montanhas, desertos, minas, ruínas |
| Nação do Fogo | Ilhas, vulcões, cidades industriais, fortificações |
| Nação do Ar | Templos, montanhas, ilhas elevadas, áreas espirituais |

O mundo segue funcionando enquanto jogadores estão em batalhas instanciadas.

## 5. Combate híbrido (resumo)

Exploração em tempo real alterna com batalha tática por turnos. A arena é um **recorte do mapa** onde o encontro aconteceu, com uma **grade lógica** sobreposta ao terreno 3D. Regras completas em `docs/02-regras-combate.md`.

## 6. Multiplayer, economia e interface

- **Multiplayer (pós-protótipo):** grupos, guildas, chat, comércio, eventos, chefes de mundo, arenas PvP. Batalhas em instâncias separadas. PvP balanceado à parte.
- **Economia:** no protótipo, troca por materiais (sem moeda). Economia completa no pós-protótipo. Equipamento nunca substitui maestria.
- **Interface:** 2D sobre o mundo 3D. Telas complexas em React; elementos presos ao mundo (barras flutuantes, marcadores) em Babylon GUI.

| Tela | Elementos |
| --- | --- |
| HUD de exploração | Vida, energia, nível, XP, atalhos, minimapa, indicadores de interação |
| HUD de combate | Ordem da barra de tempo, grade, alcance, área, painel de técnicas, dados dos combatentes, terreno, efeitos ativos, timer |
| Personagem | Atributos, técnicas, especializações, equipamentos, inventário, maestria |

## 7. Direção de arte

3D estilizado visto por câmera isométrica ortográfica: volume, iluminação, sombras suaves. Sem realismo fotográfico, sem pixel art.

| Área | Padrão |
| --- | --- |
| Câmera | Ortográfica, azimute 45°, elevação ≈ 35,26°, zoom limitado |
| Personagens | Low-mid poly, altura-base 1,7 unidade, rig humanoide compartilhado, PBR simplificado, texturas 512²–2048² |
| Modularidade | Corpo, cabeça, cabelo, rosto, roupas e acessórios separados |
| Cenários | Módulos 3D: terreno 1 × 1, construções de 1/2/4 unidades, vegetação instanciada, colisão simplificada |
| Efeitos | Partículas, shaders e sprites 2D, independentes dos personagens |
| Paletas | Distintas por elemento |
| Formatos | `.blend` (fonte) → GLB; texturas KTX2; Git LFS |
| Desempenho | LOD, instanciamento, atlas, compressão, limite de partículas, sombras seletivas, carregamento por zona |

Pipeline por asset: concept → modelagem → texturas → rig/animação → exportação GLB → validação no motor.

**Protótipo:** assets prontos CC0/licenciados com ajustes (ver `docs/03`).

## 8. Princípios de design

1. Um personagem domina apenas um elemento.
2. Especializações são aprendidas com mestres.
3. Builds devem permitir diversidade.
4. O combate premia estratégia.
5. A exploração é dinâmica.
6. O mundo recompensa cooperação.
7. Equipamento não invalida habilidade.
8. Progressão significativa, sem repetição excessiva.
9. PvP balanceado separadamente do PvE.
10. O mundo segue funcionando enquanto jogadores estão em instâncias.
