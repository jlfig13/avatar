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
| Produção | Acabamento anime 3D aprovado (ART-04) | Personagem final com material toon |
| Auxiliar | Asset CC0 usado para geometria, rig, animação ou teste de câmera | Humanoide e criatura CC0 da fatia 1 |
| Temporário | Forma simples gerada no código | Cápsula do jogador, caixa do monstro |

Na fatia 1 só existem assets **auxiliares** e **temporários**. Informe a classe na coluna `usage` (ex.: `auxiliary: rig test`).

## Colunas do `LICENSES.csv`

| Coluna | Conteúdo | Exemplo |
| --- | --- | --- |
| `asset` | Pacote e, se útil, arquivo usado | `Nature Kit / rock_largeA.glb` |
| `author` | Autor ou estúdio | `Kenney` |
| `source_url` | Página oficial do download (sem parâmetros de rastreio) | `https://kenney.nl/assets/nature-kit` |
| `license` | Identificador da licença | `CC0-1.0` |
| `date` | Data do download e da verificação (AAAA-MM-DD) | `2026-11-03` |
| `usage` | Onde é usado e o que foi alterado | `test-arena props; recolored` |

## Checklist de verificação de um pacote

- [ ] Licença lida no arquivo do download, cópia salva nesta pasta.
- [ ] Uso comercial permitido; exigência de atribuição anotada.
- [ ] Formato utilizável (GLB/GLTF preferido; FBX aceitável).
- [ ] Para personagens: rig e animações necessárias presentes (idle, walk, run, cast, hit, defeat ou próximas).
- [ ] Estilo visual compatível com o conjunto principal.

## Candidatos em avaliação (ainda NÃO aprovados)

Nenhum destes está no `LICENSES.csv` até passar no checklist acima.

| Necessidade | Candidato | Fonte | Situação |
| --- | --- | --- | --- |
| Humanoide | KayKit Adventurers | <https://kaylousberg.itch.io/kaykit-adventurers> | Candidato principal. **Não verificado (2026-11-04):** download bloqueado pela política de rede do ambiente (`kaylousberg.itch.io` → 403). Licença, formatos e rig pendentes |
| Animações do humanoide | KayKit Character Animations | <https://kaylousberg.itch.io/kaykit-character-animations> | Candidato principal. **Não verificado (2026-11-04):** download bloqueado (403). Teste de compatibilidade de rig com Adventurers não executado |
| Natureza | KayKit Forest Nature Pack **ou** Kenney Nature Kit | <https://kaylousberg.itch.io/kaykit-forest> · <https://kenney.nl/assets/nature-kit> | **Não verificado (2026-11-04):** ambos os hosts bloqueados (403). Comparação de estilo não feita; sem recomendação |
| Animações (alternativa) | Quaternius Universal Animation Library | <https://quaternius.itch.io/universal-animation-library> | Só se faltar animação no KayKit; exige retarget. **Não verificado (2026-11-04):** `quaternius.itch.io` bloqueado (403) |
| Quadrúpede | — | — | **Pendente:** nenhum candidato validado; pesquisa nas fontes oficiais bloqueada (403). Ver `docs/09-pendencias.md` |
| Texturas de terreno | Kenney ou KayKit | — | Baixa prioridade: a arena da fatia 1 usa cor por terreno (ADR-011) |

### Tentativa de validação de 2026-11-04

Download autorizado pelo dono para inspeção, mas a política de rede do ambiente de nuvem recusou a conexão (HTTP 403 no `CONNECT`) para `kaylousberg.itch.io`, `kenney.nl` e `quaternius.itch.io`. Nada foi baixado nem verificado; nenhuma licença foi copiada e o `LICENSES.csv` continua vazio. Para concluir: liberar esses domínios em *Network access → Allowed domains* do ambiente (ver <https://code.claude.com/docs/en/cloud-environments#network-access>) e repetir a validação, ou baixar os pacotes manualmente e salvar a licença de cada um nesta pasta.
