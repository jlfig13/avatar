# Arena de teste no Tiled (ART-02)

Passo a passo para montar a `test-arena` no Tiled. O mapa é só **dado de grade**: altura, terreno, bloqueio e ponto de início, desenhados com tiles coloridos provisórios. Não é a arte da arena. O resultado vira `*.grid.json` pelo exportador da ART-03.

**O que você precisa:** Tiled 1.10 ou mais novo e Node ≥ 22, que o projeto já usa. **Tempo estimado:** 1 a 2 h.

**Pronto quando:** existe `assets-src/07_MAPS/arenas/test-arena.tmj`, com a arena 10 × 10 igual ao `packages/game-data/data/maps/test-arena.grid.json` (4 terrenos e alturas de 0 a 3).

---

## 1. Instalar o Tiled

1. Baixe em <https://www.mapeditor.org>. No itch.io o valor é opcional: pode escolher US$ 0.
2. Instale e abra uma vez para conferir que funciona.

## 2. Gerar o tileset provisório

Na raiz do repositório:

```bash
node tools/tiled/makeArenaTileset.mjs
```

O comando cria `assets-src/07_MAPS/tilesets/arena_placeholder.png`, que não vai para o Git. São 11 losangos de 64 × 32:

| Tile | Desenho | Camada onde usar | Significado |
| --- | --- | --- | --- |
| 0 | `G` verde | `terrain` | chão (`ground`) |
| 1 | `R` cinza | `terrain` | rocha (`rock`) |
| 2 | `W` azul | `terrain` | água rasa (`shallow_water`) |
| 3 | `V` verde-escuro | `terrain` | vegetação (`vegetation`) |
| 4–7 | `0` `1` `2` `3` | `height` | altura da célula |
| 8 | `X` vermelho | `blocked` | célula bloqueada |
| 9 | `P` azul | `spawns` | início do jogador |
| 10 | `E` laranja | `spawns` | início de inimigo |

As propriedades de cada tile já estão em `arena_placeholder.tsj`. Não edite esse arquivo.

## 3. Criar o mapa

1. **File → New → New Map…**
2. Preencha:
   - **Orientation:** `Isometric`
   - **Tile layer format:** `CSV`
   - **Tile render order:** `Right Down`
   - **Map size:** `Fixed`, largura `10`, altura `10`
   - **Tile size:** largura `64`, altura `32` (tile do `docs/01` §7)
3. **OK**, depois **File → Save As…** e salve como `assets-src/07_MAPS/arenas/test-arena.tmj`. Escolha o tipo *JSON map files (\*.tmj)*.

## 4. Adicionar o tileset

1. **Map → Add External Tileset…**
2. Escolha `assets-src/07_MAPS/tilesets/arena_placeholder.tsj`.
3. O tileset precisa ser **externo**. Não use "Embed tileset".

## 5. Criar as 4 camadas

No painel **Layers**, renomeie a camada inicial e crie as outras em **Layer → New → Tile Layer**. Os nomes têm de ser **exatamente** estes, de baixo para cima:

1. `terrain`
2. `height`
3. `blocked`
4. `spawns`

## 6. Pintar

As coordenadas da célula sob o cursor aparecem no canto inferior esquerdo do Tiled, como `x, y`. É o mesmo sistema do `grid.json`: `(0, 0)` é o canto de cima do losango, `x` cresce para baixo-direita e `y` para baixo-esquerda.

Ferramentas: **Stamp Brush** (`B`) para célula a célula, **Bucket Fill** (`F`) para preencher áreas e **Eraser** (`E`) para apagar. Antes de pintar, selecione a camada certa no painel Layers.

### 6.1 Camada `terrain`: as 100 células

1. Selecione o tile `G` e use o balde para encher tudo de chão.
2. **Rio:** tile `W` nas colunas `x = 4` e `x = 5`, de `y = 0` até `y = 9` (20 células).
3. **Bosque:** tile `V` em `x = 1, 2, 3` nas linhas `y = 4` e `y = 5` (6 células).
4. **Rochas:** tile `R` em `(6, 3)`, `(7, 4)` e `(2, 7)`.

Gabarito da camada (linha = `y`, coluna = `x`):

```
y\x 0 1 2 3 4 5 6 7 8 9
 0  G G G G W W G G G G
 1  G G G G W W G G G G
 2  G G G G W W G G G G
 3  G G G G W W R G G G
 4  G V V V W W G R G G
 5  G V V V W W G G G G
 6  G G G G W W G G G G
 7  G G R G W W G G G G
 8  G G G G W W G G G G
 9  G G G G W W G G G G
```

### 6.2 Camada `height`: só o que for maior que 0

Célula vazia nesta camada vale altura **0**, então só pinte as células com altura 1, 2 ou 3.

```
y\x 0 1 2 3 4 5 6 7 8 9
 0  . . . . . . . 1 1 1
 1  . . . . . . . 1 1 1
 2  1 1 . . . . . . 1 1
 3  1 1 . . . . 1 . . .
 4  . . . . . . . 1 . .
 5  . . . . . . . . . .
 6  . . . . . . 1 2 3 3
 7  . . 1 . . . 1 2 3 3
 8  . . . . . . . . . .
 9  . . . . . . . . . .
```

O platô do canto de baixo (`x = 6..9`, `y = 6..7`) é a rampa: 1 → 2 → 3.

### 6.3 Camada `blocked`: 3 células

Tile `X` em `(6, 3)`, `(7, 4)` e `(2, 7)`, nas mesmas células das rochas.

### 6.4 Camada `spawns`: inícios

- `P` (jogador) em `(1, 8)`.
- `E` (inimigo) em `(8, 1)` e `(7, 2)`.

## 7. Conferir e salvar

1. Esconda e mostre cada camada pelo ícone de olho e compare com os gabaritos acima.
2. Não gire nem espelhe tiles (teclas `X`, `Y`, `Z`): o exportador lê o tile pelo número.
3. **Ctrl+S.** O arquivo `test-arena.tmj` é texto e pode ser commitado. O `.png` do tileset não vai para o Git.

## 8. Entregar

Envie o `test-arena.tmj` ao Claude Code, ou faça commit dele. O exportador da ART-03 (`tools/tiled/export-grid.ts`) converte o arquivo em `*.grid.json`, valida com `pnpm validate:data` e compara com o `test-arena.grid.json` atual. A ART-02 fica pronta quando os dois baterem.

## Regras do formato (para a ART-03)

| Camada | Tiles aceitos | Vira no `grid.json` |
| --- | --- | --- |
| `terrain` | 0–3 (propriedade `terrain`) | `terrain[y][x]`; célula vazia é erro |
| `height` | 4–7 (propriedade `height`) | `heights[y][x]`; vazio = 0 |
| `blocked` | 8 (propriedade `blocked`) | `blocked[y][x] = 1`; vazio = 0 |
| `spawns` | 9 e 10 (propriedade `spawn`) | `spawns.players[]` / `spawns.enemies[]` |

O exportador lê a propriedade do tile, não a posição dele no tileset. Um tile na camada errada é erro de exportação.
