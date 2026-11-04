# 10 — Visão do sistema de personagem do jogador (personagem humano modular)

> **Documento de visão de longo prazo.** Descreve o sistema completo de aparência do personagem do jogador. **Não é escopo da fatia 1.**
> A execução está dividida em duas fases (ADR-024):
> - **Fase de validação: ART-04** (`docs/06`). Personagem de referência, medição de parâmetros e de custo de produção. Os critérios de aceite estão na issue, não aqui.
> - **Fase posterior:** o sistema modular completo (§18), em issues próprias depois da fatia 1 (`docs/09`).
>
> Valores numéricos são **PROVISÓRIOS** até a ART-04 registrar o resultado em `docs/08` (ADR-022).

## 1. Objetivo

Personagem humano modular, personalizável e animável para o jogo 2D isométrico em pixel art (Phaser 4 + Tiled + Aseprite, PNG + JSON). O combate do personagem usa movimentos corporais e domínio elemental, **sem armas convencionais** (ADR-024, `docs/01` §5).

O sistema completo deve permitir:

- trocar cabelo, rosto, roupas e acessórios como componentes independentes;
- recolorir peças por paleta;
- representação consistente nas 8 direções de exploração e nas 4 direções lógicas de combate;
- reutilizar animações corporais;
- aplicar efeitos elementais separados do corpo;
- exportar de forma organizada para o Phaser 4;
- expandir o sistema para NPCs e criaturas humanoides.

## 2. Direção artística e originalidade

Protagonista humano jovem e aventureiro, com proporções estilizadas de JRPG, silhueta fácil de reconhecer, roupas funcionais para exploração, materiais variados e gestos expressivos.

**Restrições de originalidade.** Não usar como modelo direto personagens, uniformes, nações, símbolos, tatuagens, marcas, penteados, silhuetas, coreografias de combate ou paletas identificáveis de outras franquias. Referências de gênero e de qualidade podem orientar o nível de detalhe, mas não a identidade visual. Material gerado ou coletado que reproduza uma propriedade de terceiros não entra no repositório, nem como evidência.

## 3. Parâmetros técnicos e perspectiva

| Propriedade | Valor (PROVISÓRIO) |
| --- | --- |
| Canvas de cada quadro | 64 × 96 px |
| Tile isométrico | 64 × 32 px (2:1) |
| Degrau de altura | 16 px |
| Exploração | 8 direções |
| Combate | 4 direções lógicas (`N/E/S/W`) |
| Fonte / exportação | `.aseprite` → PNG + JSON |
| Âncora | Centro dos pés em (32, 90) (ADR-025) |

- A conversão de coordenada lógica para tela é do cliente (`docs/04` §8), não dos sprites. O desenho não simula câmera girando em volta do personagem.
- **Âncora:** centro dos pés no pixel (32, 90) do canvas, deixando 6 px abaixo para o pé mais próximo da câmera, que em isométrico aparece abaixo do ponto de apoio. No Phaser, `setOrigin(0.5, 90 / 96)`. Idêntica em todos os quadros, sem oscilação vertical e coerente com o chão. A postura não desloca a posição lógica. Os efeitos têm âncoras próprias. A âncora fica registrada nos metadados.

## 4. Direções

**Exploração (8):** `N` 0°, `NE` 45°, `E` 90°, `SE` 135°, `S` 180°, `SW` 225°, `W` 270°, `NW` 315°. Os ângulos são do plano lógico do mundo; a orientação na tela segue a projeção da ADR-022. Cada direção tem desenho próprio quando necessário. Não usar rotação automática de sprite no lugar do desenho direcional.

**Combate (4):** `N/E/S/W` são eixos do mundo, projetados nas **diagonais** da tela. Não confundir com as vistas frontal, lateral e traseira de uma câmera convencional. Deve ficar demonstrada a correspondência entre direção lógica, coordenada do mundo, orientação na tela e sprite usado.

**Direção lógica → tela.** Consequência direta da projeção da ADR-022 (`sx = (x − y) · 32`, `sy = (x + y) · 16`) e do `facingOf` do `combat-core` (`N` diminui y, `E` aumenta x, `S` aumenta y, `W` diminui x). Não é regra nova.

| Lógica | Vetor na grade | Na tela | Vista desenhada | Uso | Par de espelho |
| --- | --- | --- | --- | --- | --- |
| `SE` | (+1, +1) | ↓ baixo | **Frente pura** (ombros retos) | Exploração | — (eixo de simetria) |
| `NW` | (−1, −1) | ↑ cima | **Costas pura** (ombros retos) | Exploração | — (eixo de simetria) |
| `E` | (+1, 0) | ↘ baixo-direita | Frente 3/4 | Exploração e combate | `S` |
| `S` | (0, +1) | ↙ baixo-esquerda | Frente 3/4 | Exploração e combate | `E` |
| `N` | (0, −1) | ↗ cima-direita | Costas 3/4 | Exploração e combate | `W` |
| `W` | (−1, 0) | ↖ cima-esquerda | Costas 3/4 | Exploração e combate | `N` |
| `NE` | (+1, −1) | → direita | Perfil | Exploração | `SW` |
| `SW` | (−1, +1) | ← esquerda | Perfil | Exploração | `NE` |

- O eixo vertical da tela (`SE`–`NW`) é o eixo de simetria: espelhar na horizontal troca `E`↔`S`, `N`↔`W` e `NE`↔`SW`; `SE` e `NW` espelham em si mesmas.
- Desenhos mínimos se o espelhamento passar no teste: **5** nas 8 direções (`SE`, `NW`, `E`, `N`, `NE`) e **2** nas 4 de combate (`E`, `N`). Se falhar numa direção, ela ganha desenho próprio.
- A volumetria vem das vistas 3/4 e de perfil. `SE` e `NW` ficam com ombros retos; a câmera de cima aparece só num leve encurtamento (topo da cabeça e dos ombros visível).

**Espelhamento horizontal:** pode reduzir trabalho, mas **não é presumido**. Testar por direção e por animação. Não pode inverter elementos assimétricos importantes (acessórios, símbolos, detalhes de roupa) nem gerar gestos incoerentes. Registrar onde funciona e onde exige desenho próprio.

## 5. Componentes modulares (fase posterior)

Todos os componentes usam o mesmo canvas, escala, âncora, perspectiva e ordem de desenho. Trocar uma peça não reconstrói o personagem.

| Grupo | Componentes |
| --- | --- |
| Cabeça | Formato, cabelos curto/médio/longo/preso, franja, acessórios de cabeça; versões para as 8 direções |
| Rosto | Formato, olhos, sobrancelhas, boca, marcas faciais originais; expressões normal, determinado, concentrado, feliz, bravo, surpreso, triste, cansado |
| Tronco | Túnica de viagem, jaqueta leve, colete utilitário, roupa de exploração, armaduras leves de tecido e acolchoada, vestimenta de combate; áreas recoloríveis |
| Braços e mãos | Braços, antebraços, mãos, luvas, braceletes, ataduras, proteções; poses de mão aberta, punho, braço flexionado/estendido, projeção, concentração |
| Pernas e pés | Calças, proteções, botas, calçados de exploração |
| Costas | Capas, mantos, mochilas, bolsas, adornos, com camadas separadas para partes atrás e à frente do corpo |

Os componentes visuais se relacionam com os 5 slots de equipamento do protótipo (`docs/03`: cabeça, corpo, pernas, pés, acessório). Não existe slot de arma.

## 6. Recoloração

Objetivo: personalizar roupas e acessórios sem produzir uma spritesheet por combinação de cores. Priorizar **paletas indexadas e troca de paleta pré-processada no carregamento**; shader no Phaser fica como alternativa futura (§19). Não aplicar alteração de matiz sobre o sprite inteiro.

| Canal | Regra |
| --- | --- |
| Pele | Preservada |
| Cabelo | Independente |
| Roupa principal / secundária | Recoloríveis |
| Detalhes | Paleta própria |
| Acessórios | Independentes |
| Energia elemental | Paleta própria |

**Paletas elementais:** só a cor-base de cada elemento fica definida (fogo quente, água fria, terra terrosa, ar claro). As paletas finais saem da ART-04, mantendo contraste luz/sombra, contorno legível, separação de materiais, leitura sobre fundos claros e escuros e identidade própria (§2). A tabela da versão original da especificação ficou de fora por repetir associações de cor de outra franquia.

## 7. Combate sem armas

Sem espadas, arcos, lanças ou escudos. O combate usa movimentos corporais, artes marciais originais, gestos de projeção, concentração de energia, defesa e esquiva.

- **Postura de prontidão:** centro de gravidade equilibrado, joelhos flexionados, braços preparados, mãos livres, silhueta legível.
- **Gestos:** empurrão com as mãos, projeção frontal, movimento circular dos braços, pisão no chão, concentração, liberação de energia, postura defensiva, esquiva lateral. Cada gesto é reconhecível mesmo sem efeito.

**Animações (quadros PROVISÓRIOS).** Os nomes seguem os contratos existentes (`docs/03`, eventos `hit`/`defeated` do `docs/05`):

| Animação | Quadros | Fase |
| --- | --- | --- |
| `idle` | 4 | ART-04 (8 direções) |
| `walk` | 6 | ART-04 (8 direções) |
| `combatReady` | 4 | ART-04 (4 direções) |
| `cast` | 8 | ART-04 (4 direções) |
| `hit` | 2 | ART-04 (4 direções) |
| `defeat` | a definir | ART-04 (4 direções) |
| `run` | 6 | Posterior (prevista no `docs/03` para o protótipo) |
| `concentrate`, `attackPush`, `attackSweep` | 6 cada | Posterior |
| `dodge` | 4 | Posterior |
| `recover` | 4 | Posterior |
| `celebrate` | 6 | Posterior |

## 8. Efeitos elementais

Os efeitos são assets próprios, nunca desenhados dentro do sprite do corpo. Cada efeito define ponto de emissão, momento de ativação, duração, direção e deslocamento.

Exemplos visuais (não definem regra de jogo): fogo (concentração, chamas projetadas, explosão, rastro de calor); água (fluxo, ondas, cristais de gelo); terra (fragmentos, elevação do solo, impacto); ar (rajadas, espirais, ondas de pressão).

**Sincronização** por marcadores de animação: `castStart`, `energyCharge`, `effectSpawn`, `projectileRelease`, `impact`, `effectEnd`. O cliente sincroniza o efeito sem duplicar a spritesheet do corpo.

## 9. Arquivos-fonte (Aseprite)

Um arquivo editável por componente, por exemplo `character_head_base.aseprite`, `character_hair_short.aseprite`, `character_face_expressions.aseprite`, `character_torso_base.aseprite`, `character_arms_base.aseprite`, `character_legs_base.aseprite`, `character_back_accessories.aseprite`. Ficam em `assets-src/` (Git LFS).

Prefixos de camada: `[B]` corpo-base, `[M]` componente modular, `[A]` acessório, `[S]` sombra, `[FX]` efeito.

**Sobreposição dinâmica por direção.** No Aseprite a ordem das camadas é a mesma em todos os quadros. Por isso, peças que trocam de plano conforme a direção (capa, mochila, cabelo longo, braço distante) têm **duas camadas**, uma atrás e outra na frente do corpo, e em cada direção o artista desenha na que se aplica. O cliente compõe sempre na mesma ordem; a alternância vem de qual camada tem pixels naquela direção.

Ordem das camadas, de baixo para cima:

`[S] Shadow` · `[A] Back (behind)` · `[M] Hair (back)` · `[M] Arm (far)` · `[B] Legs` · `[B] Feet` · `[M] Torso` · `[M] Arms` · `[M] Hands` · `[M] Head` · `[M] Hair` · `[A] Back (front)` · `[A] Accessories`

| Grupo de direções | Atrás do corpo | Na frente do corpo |
| --- | --- | --- |
| Frente (`SE`, `E`, `S`) | Capa e mochila em `[A] Back (behind)`; parte de trás do cabelo longo em `[M] Hair (back)` | Franja e mechas laterais em `[M] Hair` |
| Costas (`NW`, `N`, `W`) | — | Capa e mochila em `[A] Back (front)`; cabelo inteiro, cobrindo a nuca, em `[M] Hair` |
| Perfil (`NE`, `SW`) | Lado de trás da capa em `[A] Back (behind)`; braço distante em `[M] Arm (far)` | Braço próximo em `[M] Arms`; mechas do lado visível em `[M] Hair` |

Nas vistas 3/4, o braço do lado oposto à câmera também vai em `[M] Arm (far)` quando ficar parcialmente atrás do tronco. Camadas vazias numa direção não custam nada na exportação.

## 10. Spritesheets

- Fundo transparente, quadros de tamanho uniforme (múltiplos de 64 × 96), ordem documentada, animação, direção e âncora identificadas.
- Não misturar animações no mesmo conjunto lógico (separação física ou por atlas com tags).
- Sequências nomeadas por animação e direção (`idle_N`, `idle_NE` … `idle_NW`). A cobertura de direções é registrada **por animação**; nem toda animação precisa das 8.

## 11. Metadados

- O **JSON nativo do Aseprite** é preservado como metadado do atlas (quadros e tags de animação/direção).
- Um **manifesto complementar em `camelCase`** (`docs/07`) descreve o que o cliente precisa: id do personagem, canvas, tile, âncora, projeção e, por animação e direção, arquivo, quadros, duração, loop, pontos de encaixe, pontos de emissão, ordem de composição e canais de recoloração.
- O manifesto tem schema **Zod** e é validado em `pnpm validate:data`.

Exemplo ilustrativo (o schema definitivo nasce na ART-04):

```json
{
  "schemaVersion": 1,
  "characterId": "protagonistBase",
  "canvas": { "width": 64, "height": 96 },
  "tile": { "width": 64, "height": 32 },
  "anchor": { "x": 32, "y": 90, "type": "feetCenter" },
  "projection": "isometric2to1",
  "atlas": "protagonist_base.json",
  "animations": {
    "idle": {
      "loop": true,
      "directions": {
        "N": { "tag": "idle_N", "frameDurationMs": 150 }
      }
    }
  }
}
```

## 12. Integração com Phaser 4

| Módulo do cliente | Responsabilidade |
| --- | --- |
| Character Renderer | Carregar o corpo, compor componentes, aplicar paletas, posicionar e ordenar camadas |
| Animation Controller | Escolher animação e direção, controlar quadros, transições e marcadores |
| Elemental Effects | Carregar efeitos, sincronizar com animações, posicionar e controlar duração |
| Character Configuration | Cabelo, roupas, acessórios, cores e aparência |

A lógica de jogo não depende de classes do Phaser, e o `combat-core` continua independente da engine (`CLAUDE.md`, regra 4).

## 13. Critérios de qualidade

- **Visual:** proporções, perspectiva, silhueta, coerência das 8 e das 4 direções, sem oscilação entre quadros, contorno e paleta consistentes, transparência correta.
- **Modular:** trocar cabelo, roupa ou acessório sem deslocar rosto, membros ou âncora; sobreposição correta; recoloração sem afetar a pele.
- **Animação:** ordem e ciclos corretos, pés alinhados, sem quadros duplicados por engano, sem misturar corrida, ataque e efeito.
- **Técnica:** PNG com transparência, dimensões corretas, metadados válidos, fontes presentes, pivôs consistentes, carregamento correto no Phaser 4.

## 14. Evidências

Em `docs/evidence/art-04/` (Git LFS), referenciadas em `docs/08`: captura da área jogável, GIF da movimentação, 8 direções, 4 orientações de combate, espelhamento, recoloração e um efeito elemental. A demonstração de troca de componentes fica para a fase posterior.

## 15. Estimativa de esforço

Cinco categorias; a categoria 3 traz duas estimativas separadas:

| Categoria | Escopo |
| --- | --- |
| 1. Personagem novo | Corpo-base, aparência, componentes, direções e animações |
| 2. Animação adicional | Nova animação para personagem existente |
| 3. Criaturas | 3a humanoide e 3b não humanoide, estimadas separadamente |
| 4. Tilemap novo | Ambiente completo com tiles e elementos novos |
| 5. Variação de ambiente | Nova composição reutilizando tiles existentes |

Para cada categoria: horas de desenho, animação, integração e revisão; dependências; reutilização possível; principais fatores de aumento de esforço. Separar criação original de reaproveitamento.

## 16. Entregáveis da visão completa

Personagem original; corpo-base em 8 direções; 4 direções de combate; animações de exploração e de combate; sistema modular; 2–3 combinações de personagem; expressões; paletas de recoloração com demonstração no cliente; ao menos um efeito independente; manifesto e atlas; fontes Aseprite; spritesheets PNG; área jogável; evidências; guia de exportação; parâmetros confirmados; estimativa nas cinco categorias. **Na ART-04 vale apenas o subconjunto dos critérios de aceite da issue.**

## 17. Critérios de aceite da fase de validação

Estão na issue ART-04 em `docs/06-backlog-fatia-1.md` (fonte única).

## 18. Escopo posterior à fatia 1

Não é condição para concluir a ART-04. Cada item vira issue própria, com estimativa e critérios independentes (`docs/09`).

| Área | Funcionalidades futuras |
| --- | --- |
| Modularidade | Cabelo, rosto, tronco, braços, pernas, pés e acessórios intercambiáveis |
| Expressões | Normal, determinado, concentrado, feliz, bravo, surpreso, triste, cansado |
| Animações | `run`, `dodge`, `recover`, `celebrate` e variações de ataque |
| Customização | Combinações de roupas, cabelos e acessórios |
| Recoloração | Múltiplos canais e paletas personalizáveis |
| Efeitos | Biblioteca de técnicas e efeitos elementais |
| Configuração | Manifesto completo de aparência e composição do personagem |
| Escalabilidade | Reuso do sistema para NPCs e personagens humanoides |

## 19. Compatibilidade técnica

- Manifesto em `camelCase` (`docs/07`), JSON nativo do Aseprite preservado como atlas, validação Zod em `pnpm validate:data`.
- Recoloração inicial por troca de paleta pré-processada; shader como alternativa futura.
- Custo da composição em camadas medido no protótipo, principalmente capas, cabelos e efeitos que passam à frente e atrás do corpo.
- `combat-core` independente do Phaser 4.

## 20. Parâmetros provisórios a validar

Canvas 64 × 96, tile 64 × 32, degrau de 16 px, quadros por animação, cobertura de direções por animação, viabilidade do espelhamento, estratégia de recoloração e custo médio de personagens, criaturas e ambientes. Resultado registrado pela ART-04 em `docs/08`.
