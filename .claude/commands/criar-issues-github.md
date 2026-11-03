---
description: Cadastra o backlog da fatia 1 no GitHub (labels, milestone e issues) usando o gh
argument-hint: "[owner/repo, opcional — padrão: repositório atual]"
---

Cadastre no GitHub as 47 issues de `docs/06-backlog-fatia-1.md`.

## Pré-requisitos

1. Confirme que o `gh` está autenticado (`gh auth status`). Se não estiver, peça ao dono para rodar `gh auth login` e pare.
2. Repositório alvo: `$ARGUMENTS` se informado; senão, o remoto `origin` atual. Se não houver remoto, pergunte ao dono e pare.
3. **Mostre ao dono um resumo do que será criado** (quantidade de labels, milestone, issues) e **peça confirmação antes de criar qualquer coisa.** Criar issues é visível publicamente se o repositório for público.

## Passos (idempotentes)

1. **Labels** (crie só se não existirem):
   - Epics: `epic:core`, `epic:client`, `epic:server`, `epic:infra`, `epic:ai`, `epic:qa`, `epic:art`
   - Estimativa: `est:1h`, `est:2h`, `est:4h`, `est:8h`
   - Executor: `exec:claude`, `exec:misto`, `exec:humano`
   - Onda: `onda:0` … `onda:5`
2. **Milestone:** `Fatia 1 — Arena isolada` (crie se não existir).
3. **Issues:** para cada issue do backlog, **na ordem do documento**:
   - Antes de criar, procure issue aberta ou fechada com o mesmo ID no título (`gh issue list --search "<ID> in:title" --state all`). Se existir, pule.
   - Título: `<ID> — <título>` (ex.: `CORE-05 — Barra de tempo (CT)`).
   - Corpo em Markdown com: Epic, Estimativa, Executor, Onda, Depende de (com links `#número` das issues já criadas quando possível), Descrição, Critérios de aceite como checklist `- [ ]`, e um rodapé `Fonte: docs/06-backlog-fatia-1.md`.
   - Labels correspondentes e a milestone.
   - Use `gh issue create --body-file` com arquivo temporário (evita problemas de escape).
4. Guarde o mapeamento `ID → número da issue` em `docs/github-issues.md` (tabela) e commite: `chore(INF-02): map backlog to GitHub issues`.
5. Se o dono quiser um quadro, sugira criar um GitHub Project manualmente e adicionar as issues pela milestone (não crie Projects sem pedido explícito).

## Ao final

Informe quantas labels e issues foram criadas, quantas foram puladas por já existirem e o link da milestone.
