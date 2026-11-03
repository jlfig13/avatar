---
description: Executa a próxima issue desbloqueada do backlog da fatia 1 (ou a issue informada)
argument-hint: "[ID da issue, opcional — ex.: CORE-05]"
---

Você vai executar **uma** issue do backlog do MMORPG Elemental.

## 1. Escolher a issue

- Se foi informado um ID em `$ARGUMENTS`, use essa issue.
- Senão, abra `docs/06-backlog-fatia-1.md` e escolha a **primeira issue não marcada (`[ ]`) da onda mais baixa** cujas dependências estejam todas marcadas `[x]`. Prefira issues com Executor `Claude`; se só restarem `Misto`/`Humano` desbloqueadas, faça a parte do Claude Code e pare no passo humano.
- Se nenhuma estiver desbloqueada, diga quais issues bloqueiam o avanço e pare.

## 2. Preparar

1. Releia o `CLAUDE.md` (regras de trabalho e definição de pronto).
2. Leia a issue inteira e **todos** os documentos de `docs/` que ela cita.
3. Leia o código existente relacionado.
4. Se algo necessário não estiver definido em `docs/02` ou `docs/05` (nem como PROVISÓRIO), registre a dúvida em `docs/09-pendencias.md` (seção "Novas dúvidas"), pergunte ao dono e **pare**.

## 3. Planejar

Mostre um plano curto antes de codar:
- arquivos a criar e alterar;
- testes que traduzem cada critério de aceite;
- riscos ou pontos de dúvida.

Siga sem esperar aprovação se o plano não contrariar nenhum documento; espere aprovação se for mudar regra, contrato de dados (`docs/05`) ou arquitetura (`docs/04`).

## 4. Implementar

- Testes primeiro para regras do `combat-core`.
- Respeite as regras do `CLAUDE.md`: core puro e imutável, RNG com seed, números em `game-data`, textos em i18n, validação Zod no servidor.
- Não implemente nada fora do escopo da issue. Ideias vão para `docs/09-pendencias.md`.

## 5. Verificar

Rode e corrija até passar:

```bash
pnpm lint && pnpm typecheck && pnpm validate:data && pnpm test && pnpm build
```

(Até INF-01 estar pronta, rode o que existir.) Para issues de gameplay, descreva como verificar no `pnpm dev`.

## 6. Fechar

1. Marque `[x]` no título da issue e em cada critério atendido em `docs/06-backlog-fatia-1.md`.
2. Se mudou alguma regra ou contrato, atualize o documento correspondente e adicione um ADR em `docs/08-decisoes.md`.
3. Commit(s) no padrão de `docs/07-convencoes.md` (ex.: `feat(CORE-05): ...`).
4. Responda ao dono com:
   - o que foi feito (2–4 linhas);
   - como verificar;
   - pendências ou passos humanos, se houver;
   - a próxima issue desbloqueada.
