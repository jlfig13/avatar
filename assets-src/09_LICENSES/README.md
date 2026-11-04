# 09_LICENSES — licenças de assets de terceiros

Registro de origem e licença de **todo** asset de terceiros usado no jogo (ART-01).

## Regras

1. **Um asset só entra no repositório depois de ter linha no `LICENSES.csv`.**
2. A licença verificada é a do **download específico** (o arquivo `License.txt` ou equivalente que vem no pacote), não só a página da loja ou do autor.
3. Proibido qualquer asset cuja licença impeça uso comercial (ex.: CC BY-NC, "free for personal use"). Licenças aceitas: CC0; CC BY (exige crédito no jogo); licenças comerciais compradas, com o comprovante guardado fora do repositório.
4. Guarde uma cópia do arquivo de licença do pacote nesta pasta: `<autor>-<pacote>-LICENSE.txt`.
5. Assets modificados continuam com a linha do original; anote a modificação na coluna `usage`.
6. **Proibido usar modelos extraídos de jogos ou fan-made** (ex.: The Models Resource, recriações de personagens de outras franquias), mesmo como base. Imagens de outros jogos servem só como referência de estilo e não entram no repositório.

## Classes de asset (ADR-018)

| Classe | O que é | Exemplo |
| --- | --- | --- |
| Produção | Arte original em pixel art no padrão do personagem de referência (ART-04, ADR-022) | Personagem final desenhado no Aseprite |
| Auxiliar | Asset CC0 usado para teste de projeção, animação ou câmera | Tiles isométricos CC0 de teste |
| Temporário | Forma simples gerada no código | Losango do jogador, bloco do monstro |

Na fatia 1 só existem assets **auxiliares** e **temporários**. Informe a classe na coluna `usage` (ex.: `auxiliary: rig test`).

## Colunas do `LICENSES.csv`

| Coluna | Conteúdo | Exemplo |
| --- | --- | --- |
| `asset` | Pacote e, se útil, arquivo usado | `Isometric Tiles / grass_01.png` |
| `author` | Autor ou estúdio | `Kenney` |
| `source_url` | Página oficial do download (sem parâmetros de rastreio) | `https://kenney.nl/assets/nature-kit` |
| `license` | Identificador da licença | `CC0-1.0` |
| `date` | Data do download e da verificação (AAAA-MM-DD) | `2026-11-03` |
| `usage` | Onde é usado e o que foi alterado | `test-arena props; recolored` |

## Checklist de verificação de um pacote

- [ ] Licença lida no arquivo do download, cópia salva nesta pasta.
- [ ] Uso comercial permitido; exigência de atribuição anotada.
- [ ] Formato utilizável (PNG; spritesheet com JSON de atlas ou grade regular; `.aseprite` é um bônus).
- [ ] Para personagens: animações necessárias (idle, walk, run, cast, hit, defeat ou próximas) em pelo menos 4 direções.
- [ ] Estilo visual compatível com o conjunto principal.

## Candidatos avaliados (verificação de 2026-11-04)

> **ADR-022 (2026-11-04):** a direção passou a ser 2D em pixel art. Os packs KayKit 3D abaixo tinham licença válida, mas **deixaram de ser usados** e saíram do `LICENSES.csv`; as cópias de licença ficam arquivadas nesta pasta. Os candidatos 2D (Newc42, LPC, PtDesigns, 0x72) seguem sem aprovação: ver `docs/09-pendencias.md`.

Downloads feitos pela página oficial (tier gratuito, "pague quanto quiser" com US$ 0) e inspecionados fora do repositório. Nenhum binário foi versionado. Só os aprovados estão no `LICENSES.csv`.

| Necessidade | Candidato | Fonte | Licença (no download) | Formatos | Situação |
| --- | --- | --- | --- | --- | --- |
| Humanoide | KayKit Adventurers 2.0 (Free) | <https://kaylousberg.itch.io/kaykit-adventurers> | CC0 1.0; comercial ok; crédito opcional ("Kay Lousberg, www.kaylousberg.com") | GLB, glTF, FBX, OBJ | **Licença ok; não usado (ADR-022).** 6 personagens (Barbarian, Knight, Mage, Ranger, Rogue, Rogue_Hooded), rig `Rig_Medium` de 23 ossos |
| Animações do humanoide | KayKit Character Animations 1.1 (Free) | <https://kaylousberg.itch.io/kaykit-character-animations> | CC0 1.0; comercial ok; crédito opcional | GLB (8 Rig_Medium + 6 Rig_Large + 2 manequins), FBX | **Licença ok; não usado (ADR-022).** Rig idêntico ao Adventurers (ver teste abaixo) |
| Natureza | KayKit Forest Nature Pack 1.0 (Free) | <https://kaylousberg.itch.io/kaykit-forest> | CC0 1.0; comercial ok; crédito opcional | glTF + .bin (105), FBX, OBJ; 1 atlas `forest_texture.png` 1024² | **Licença ok; não usado (ADR-022).** 14 árvores, 6 árvores secas, 22 arbustos, 43 pedras, 20 gramas |
| Natureza (alternativa) | Kenney Nature Kit | <https://kenney.nl/assets/nature-kit> | — | — | **Descartado (ADR-021):** o site `kenney.nl` recusa acesso automatizado (403 do próprio servidor) e o KayKit Forest já cobre a necessidade |
| Animações (alternativa) | Quaternius Universal Animation Library (Standard) | <https://quaternius.itch.io/universal-animation-library> | CC0 1.0 (licença verificada) | GLB, FBX; rig próprio de 65 ossos, 43 animações | **Não necessário:** o KayKit cobre todas as animações; usar exigiria retarget. Fora do CSV |
| Quadrúpede | Quaternius Farm Animals Animated (`lowpoly-animated-animals`) | <https://quaternius.itch.io/lowpoly-animated-animals> | **Sem arquivo de licença no download** (só a página diz CC0) | FBX, OBJ, .blend (sem GLB) | **Reprovado:** licença não comprovada no download; animações só idle/walk/run/jump/death, sem attack nem hit |
| Quadrúpede | Quaternius Monster Pack Animated (`lowpoly-animated-monsters`) | <https://quaternius.itch.io/lowpoly-animated-monsters> | **Sem arquivo de licença no download** | FBX, OBJ, .blend | **Reprovado:** nenhuma criatura quadrúpede (Bat, Dragon voador, Skeleton, Slime) e licença não comprovada |
| Quadrúpede | — | — | — | — | **Decidido (ADR-021):** placeholder temporário (caixa achatada) na fatia 1; reavaliar na ART-04 |
| Terreno (avaliado a pedido do dono) | Newc42 Pixel Art Isometric Map Tileset | <https://newc-42.itch.io/pixel-art-isometric-map-tileset> | **Sem arquivo de licença no download** (só a página diz CC0, sem atribuição) | 1 spritesheet PNG 432×384, 1 .aseprite, unitypackage (69 tiles 2D, 6 biomas) | **Reprovado:** licença não comprovada no download; sprites 2D em pixel art com perspectiva já desenhada, incompatíveis com a arena 3D e com o GDD ("sem pixel art", ADR-018). Serve só como referência de paleta de biomas |
| Referência de estilo 2D | Liberated Pixel Cup (LPC) | <https://opengameart.org> | CC-BY-SA 3.0 / GPL 3.0 (declarado; não verificado) | PNG | **Só referência, não aprovado:** CC-BY-SA exige crédito e mantém a mesma licença em derivados, e não está entre as licenças aceitas (regra 3) |
| Referência de estilo 2D | PtDesigns (tiles isométricos) | <https://ptdesigns.itch.io> | CC0 declarado na página; não verificado no download | PNG | **Só referência, não aprovado:** pixel art 2D fora da direção atual (ADR-018); reavaliar só se a proposta 2D virar ADR |
| Referência de estilo 2D | 0x72 DungeonTileset II | <https://0x72.itch.io/dungeontileset-ii> | CC0 declarado na página; não verificado no download | PNG | **Só referência, não aprovado:** mesmo motivo do PtDesigns |
| Texturas de terreno | — | — | — | — | **Adiado:** a arena da fatia 1 usa cor por terreno (ADR-011, ADR-021) |

### Teste de rig (Adventurers × Character Animations) — histórico, antes da ADR-022

Leitura do JSON dos GLB (skins, nós e canais de animação):

- Os 6 personagens do Adventurers e todos os arquivos `Rig_Medium_*.glb` do Character Animations têm 1 skin com os mesmos 23 ossos: `root, hips, spine, chest, head, upperarm/lowerarm/wrist/hand/handslot (.l/.r), upperleg/lowerleg/foot/toes (.l/.r)`.
- Todos os canais de animação apontam para ossos que existem no personagem, e a hierarquia (pai de cada osso) é idêntica. **Compatível sem retarget.**
- Mapeamento sugerido para CLI-04: `idle` → `Idle_A`; `walk` → `Walking_A`; `run` → `Running_A`; `cast` → `Ranged_Magic_Spellcasting` ou `Ranged_Magic_Shoot`; `hit` → `Hit_A`; `defeat` → `Death_A` (+ `Death_A_Pose`). Arquivos: `Rig_Medium_General`, `Rig_Medium_MovementBasic` e `Rig_Medium_CombatRanged`.

### Estilo de natureza

KayKit Forest usa low poly com sombreamento chapado e um único atlas de cores em gradiente (1024²), na mesma paleta saturada dos personagens KayKit. Por isso foi escolhido. A comparação com o Kenney Nature Kit não foi feita (site inacessível). Pela ADR-018 esses assets são auxiliares; o visual final vem da ART-04.
