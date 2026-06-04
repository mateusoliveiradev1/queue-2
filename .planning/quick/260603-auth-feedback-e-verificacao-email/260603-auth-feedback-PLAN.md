---
status: completed
created: 2026-06-03
quick_id: 260603-auth-feedback
slug: auth-feedback-e-verificacao-email
---

# Quick Task 260603-auth-feedback: Auth feedback e verificacao de email

## Goal

Melhorar feedback visual dos formularios publicos de auth e deixar claro o caminho para reenviar confirmacao de email sem limpar contas de teste por engano.

## Scope

1. Adicionar estado pending acessivel nos botoes de login, cadastro e fluxos publicos de auth.
2. Confirmar/reusar o fluxo existente de reenvio de verificacao.
3. Validar build/typecheck/secret scan.
4. Registrar limitacao do remetente temporario Resend sem dominio proprio.

## Non-Goals

- Expor ou commitar API keys.
- Apagar usuarios de producao sem confirmacao explicita.
- Trocar remetente para dominio proprio antes do dominio estar comprado/verificado.

## Verification

- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
