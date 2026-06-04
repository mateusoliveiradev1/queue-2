---
status: completed
created: 2026-06-03
quick_id: 260603-pairing-feedback
slug: polir-feedback-pareamento
---

# Quick Task 260603-pairing-feedback: Polir feedback de pareamento

## Goal

Aplicar na tela `/parear` o mesmo feedback de submit ja usado em login/cadastro, especialmente ao criar codigo da dupla.

## Scope

1. Trocar submits simples por `PendingSubmitButton`.
2. Cobrir criar codigo, entrar com codigo e revogar convite.
3. Manter regras de pareamento e redirects intactos.
4. Atualizar testes de UI para garantir o padrao.

## Verification

- `pnpm --filter @queue/web test`
- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
