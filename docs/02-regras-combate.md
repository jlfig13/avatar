# 02 — Regras de combate e instâncias

> Duas camadas neste documento:
> - **DECIDIDO:** regra fechada pelo dono do projeto. Não mudar sem aprovação.
> - **PROVISÓRIO:** fórmula ou número inicial proposto para destravar a implementação. Fica em `packages/game-data/data/rules.json`, nunca no código, e será calibrado nos testes (`QA-01`, `QA-03`).
>
> No escopo da fatia 1 entram as seções 3 a 9. As seções 1, 2 e 10 descrevem o comportamento completo para orientar a arquitetura; elas só são implementadas em fatias posteriores.

## 1. Início do encontro — DECIDIDO (fatia 2+)

| Regra | Decisão |
| --- | --- |
| Gatilho PvE | Contato com monstro visível no mapa. O jogador pode evitá-lo |
| Inimigos | Cada monstro visível representa um **bando fixo** (ex.: 1 líder + 2 lacaios), definido nos dados |
| Participantes | Quem inicia + membros do grupo dentro de um raio (raio PROVISÓRIO: 8 células) |
| Gatilho PvP | Apenas em zonas PvP marcadas no mapa |

## 2. Instância — DECIDIDO (fatia 2+, parte multiplayer pós-protótipo)

| Regra | Decisão |
| --- | --- |
| Entrada tardia | Só membros do grupo, no início da rodada seguinte, por célula de borda livre |
| Personagem no mundo | Fica visível e parado no ponto do encontro; em zona PvP, pode ser atacado |
| Ataque a quem está em batalha | O atacante entra como **terceiro lado** na rodada seguinte, pela borda, hostil a todos |
| Arena | Recorte da grade global centrado no encontro; tamanho fixo por tipo de encontro |
| Tamanhos (PROVISÓRIO) | Comum 10 × 10 · Chefe 16 × 16 · Prova de mestre 12 × 12 |
| Bordas | Limite invisível; ninguém sai da grade. Células da borda marcadas como **células de fuga** |
| Células de fuga (PROVISÓRIO) | Todas as células transitáveis da borda externa |

**Fatia 1:** a arena é um mapa de teste fixo de 10 × 10; não há gatilho no mundo.

## 3. Grade e terreno

- Coordenadas inteiras `(x, y)`, origem no canto superior esquerdo, `x` cresce para leste, `y` para sul.
- Cada célula tem: `height` (inteiro, 0–8), `terrain` (`ground`, `rock`, `shallow_water`, `vegetation`), `blocked` (obstáculo fixo) e, opcionalmente, um `effect` temporário (seção 8).
- **Vizinhança:** 4 direções (sem diagonais) para movimento, alcance e área. Distância = Manhattan.
- **Ocupação:** no máximo 1 combatente por célula.

### 3.1 Movimento — PROVISÓRIO

| Regra | Valor inicial |
| --- | --- |
| Pontos de movimento por turno | `3 + floor(mobility / 10)` |
| Custo base por célula | 1 |
| Custo extra: `shallow_water` | +1 (usuários de água: +0) |
| Custo extra: efeito `ice` | +1 |
| Subida máxima por passo (`jump`) | 2 níveis de altura |
| Descida máxima por passo | 3 níveis |
| Atravessar célula ocupada | Aliado: pode passar, não parar. Inimigo: bloqueia |

Pathfinding: A* sobre a grade com esses custos (`CORE-04`).

## 4. Barra de tempo (CT) — DECIDIDO + PROVISÓRIO

DECIDIDO: ordem individual pela barra de tempo; Mobilidade define a velocidade de recarga; técnicas pesadas atrasam o próximo turno.

PROVISÓRIO:

- Cada combatente tem `ct` (começa em 0) e `speed = 4 + floor(mobility / 5)`.
- A cada **tick**, todo combatente vivo soma `speed` ao `ct`.
- Quando `ct >= 100`, o combatente ganha o turno. Empate: maior `speed`; depois menor `id` (ordem lexicográfica) para determinismo.
- Ao terminar o turno: `ct = ct - 100 - delay`, onde `delay` é o atraso da técnica usada (0 se não usou técnica; ver `ctDelay` nos dados).
- **Rodada:** uma rodada termina quando todos os combatentes vivos tiveram 1 turno desde o início da rodada anterior. Rodadas contam durações (efeitos, reações, desconexão).
- A HUD mostra a previsão dos próximos 8 turnos (simulação dos ticks sem aplicar ações).

## 5. Turno — DECIDIDO

- **Movimento + 1 ação, em qualquer ordem** (pode agir e depois andar, ou andar e depois agir; cada um no máximo uma vez).
- Ações: usar técnica, usar consumível (fatia 3+), defender, tentar fuga, passar.
- **Defender:** reduz o dano recebido até o próximo turno (PROVISÓRIO: −30%).
- **Tempo limite:** 60 s por turno de jogador. Ao esgotar, aplica **Defender** automaticamente e passa a vez.
- **AFK:** 3 timeouts seguidos reduzem o tempo do jogador para 10 s até ele agir de novo (qualquer ação manual zera o contador).
- Monstros agem pela IA sem tempo limite (o servidor executa).

## 6. Técnicas: alcance, área, linha de visão, acerto e dano

### 6.1 Alcance e área

- Toda técnica define `range: { min, max }` (Manhattan) e `area` (`single`, `cross` com raio, `line` com comprimento, `self`).
- Alvo de célula ou de combatente, conforme `target` da técnica (`enemy`, `ally`, `self`, `cell`).

### 6.2 Linha de visão — DECIDIDO (regra) + PROVISÓRIO (algoritmo)

- Obstáculos bloqueiam técnicas à distância (`requiresLineOfSight: true`). Técnicas de alcance 1 não exigem.
- Algoritmo: linha de Bresenham entre os centros das células de origem e alvo, desconsiderando as duas pontas. Bloqueia se alguma célula do caminho for `blocked`, tiver efeito `earth_wall`, ou tiver `height` maior que `max(alturaOrigem, alturaAlvo) + 1`.
- Combatentes **não** bloqueiam linha de visão (fatia 1).

### 6.3 Altura — DECIDIDO (regra) + PROVISÓRIO (números)

`dh = alturaAtacante - alturaAlvo`

| Situação | Efeito |
| --- | --- |
| `dh >= 2` | +1 de alcance máximo em técnicas com `rangeBonusFromHeight: true`; +10% de precisão |
| `dh <= -2` | −10% de precisão |
| Bônus máximo de precisão por altura | ±20% (`dh` limitado a ±4) |

### 6.4 Flanco e costas — DECIDIDO (regra) + PROVISÓRIO (números)

Cada combatente tem `facing` (`N`, `E`, `S`, `W`), atualizado para a direção do último movimento ou para o alvo da última técnica.

| Posição do atacante em relação ao alvo | Precisão | Dano |
| --- | --- | --- |
| Frente | +0% | ×1,00 |
| Lado | +15% | ×1,10 |
| Costas | +30% | ×1,25 |

Para áreas, usa-se a direção da origem da técnica até cada alvo.

### 6.5 Acerto — PROVISÓRIO

```
precisao = technique.accuracy + (atacante.control - alvo.mobility) * 0.5 + bonusAltura + bonusFlanco
chance   = clamp(precisao, 5, 95)   // em %
acerto   = rng.nextInt(1, 100) <= chance
```

Técnicas de efeito em si mesmo, em aliados ou em célula vazia sempre acertam.

### 6.6 Dano — PROVISÓRIO

```
base   = technique.power + atacante.power * technique.powerScaling
mult   = multFlanco * multTerreno * multDefender
dano   = max(1, round(base * mult - alvo.resistance * 0.5))
```

- `multTerreno`: +20% se a técnica é de água e o alvo está em `shallow_water` (DECIDIDO: água amplia técnicas de água).
- `multDefender`: 0,7 se o alvo está defendendo.
- Cura usa a mesma base, sem `resistance` e sem flanco.
- Não há crítico na fatia 1.

### 6.7 Energia — DECIDIDO + PROVISÓRIO

- DECIDIDO: começa com o valor atual do mundo (na fatia 1: cheia) e regenera um pouco por turno; Espírito e Concentração ajustam a regeneração.
- PROVISÓRIO: `energiaMax = 40 + spirit * 2`; regeneração no início do turno = `2 + floor(spirit / 10) + floor(focus / 10)`.
- Custo efetivo de técnica = `ceil(technique.energyCost * (1 - min(focus, 30) / 100))`.
- Sem energia suficiente, a técnica não pode ser escolhida.

## 7. Reações — DECIDIDO + PROVISÓRIO

- Só existem por **técnicas ou passivas específicas** (campo `reaction` nos dados). Não há ataque de oportunidade genérico.
- **Máximo de 1 reação por combatente por rodada.**
- Reação dispara depois que a ação que a provocou é resolvida, e não provoca nova reação (sem cadeia).
- Fatia 1 tem três reações (ver `docs/05`, seção 6): contra-ataque do monstro, "Refluxo" (água) e "Brasa" (fogo).

## 8. Terreno elemental temporário — DECIDIDO + PROVISÓRIO

DECIDIDO: técnicas podem aplicar efeitos às células; na mesma célula, **o efeito mais recente substitui o anterior**; não há combinação entre efeitos.

| Efeito | Origem típica | Comportamento (PROVISÓRIO) | Duração |
| --- | --- | --- | --- |
| `ice` | Água | Movimento custa +1; −10% de esquiva (soma 10 à precisão de quem ataca o ocupante) | 2 rodadas |
| `fire` | Fogo | Quem entra na célula ou começa o turno nela sofre 8 de dano. Em `vegetation`, dura +1 rodada | 2 rodadas |
| `earth_wall` | Terra (fatia 2) | Célula bloqueada; bloqueia linha de visão | 3 rodadas |
| `gust` | Ar (fatia 2) | Quem termina o movimento na célula é empurrado 1 célula na direção do vento | 2 rodadas |

- Efeito não pode ser aplicado em célula `blocked`.
- Efeito `fire` em célula `shallow_water` não é aplicado.
- A duração diminui ao fim de cada rodada.

## 9. Fim da batalha — DECIDIDO + PROVISÓRIO

| Situação | Regra |
| --- | --- |
| Vitória | Todos os inimigos derrotados |
| Derrota | Todos os jogadores derrotados |
| Retirada | Em uma célula de fuga, gastar a **ação** num teste. Sucesso: sai da batalha. Falha: perde a ação |
| Chance de fuga (PROVISÓRIO) | `clamp(30 + mobility * 2 - 10 * inimigosAdjacentes, 10, 90)` % |
| Retorno ao mundo (fatia 2) | Vitória: posição final na arena mapeada ao mundo. Retirada: na célula de fuga usada |
| Derrota PvE (fatia 2) | Volta ao último ponto seguro, com perda de XP. Durabilidade fica fora do protótipo |
| Perda de XP (PROVISÓRIO) | 5% do XP necessário para o próximo nível, sem perder nível |
| Recompensas | XP igual para quem terminou a batalha; loot individual por jogador |

## 10. Desconexão — DECIDIDO (implementar no SRV-02 de forma básica; completo no multiplayer)

| Situação | Regra |
| --- | --- |
| Um jogador cai | Turno dele vira Defender automático e passa **na hora** (sem esperar 60 s) |
| Reconexão | Retoma o controle se voltar em até 3 rodadas; recebe snapshot completo do estado |
| Não voltou em 3 rodadas | Sai da batalha como retirada |
| Todos os jogadores caem | Batalha pausa (PROVISÓRIO: 5 min); sem retorno, conta como derrota |

## 11. Fluxo de uma batalha

1. Criar estado: recorte da grade + combatentes + seed do RNG.
2. Avançar ticks até alguém atingir `ct >= 100`.
3. Início do turno: regenerar energia; aplicar dano de `fire` na célula; reduzir defesa anterior.
4. Combatente envia ações (movimento e/ou ação) ou a IA decide.
5. Resolver cada ação → eventos → reações elegíveis.
6. Fim do turno: ajustar `ct`; checar fim de rodada (durações).
7. Checar vitória, derrota ou retirada.
8. Voltar ao passo 2.
