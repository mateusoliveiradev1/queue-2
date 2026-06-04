---
status: completed
created: 2026-06-03
quick_id: 260603-auth-login
slug: auth-login-verificacao-resend
---

# Quick Task 260603-auth-login: Login e verificacao de email

## Goal

Corrigir o caminho de recuperacao para contas nao verificadas no login e liberar uma conta de teste explicita sem limpar o banco.

## Scope

1. Melhorar deteccao de erro de email nao verificado no login.
2. Expor link direto de reenvio de verificacao na tela de login.
3. Validar build/typecheck/secret scan.
4. Marcar apenas o email de teste informado como verificado no banco de producao.

## Non-Goals

- Apagar usuarios ou limpar tabelas de auth.
- Burlar verificacao de email globalmente em producao.
- Resolver envio para qualquer destinatario sem dominio verificado no Resend.

## Verification

- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
