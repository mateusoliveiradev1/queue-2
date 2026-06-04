---
status: completed
completed: 2026-06-03
quick_id: 260603-pairing-feedback
slug: polir-feedback-pareamento
---

# Quick Task 260603-pairing-feedback: Summary

## Outcome

A tela `/parear` agora usa o mesmo feedback de submit dos fluxos de login/cadastro:

- criar codigo da dupla usa spinner, `aria-busy`, bloqueio de duplo clique e label `Criando codigo...`;
- entrar com codigo usa label `Entrando...`;
- revogar convite usa label `Revogando...`;
- testes de UI garantem que os submits de pareamento permanecam com `PendingSubmitButton`.

## Verification

- `pnpm --filter @queue/web test` -- 108 passed
- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets` -- 95 source files and 20 client bundle files checked
