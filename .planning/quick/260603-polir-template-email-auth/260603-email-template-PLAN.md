---
status: completed
created: 2026-06-03
quick_id: 260603-email-template
slug: polir-template-email-auth
---

# Quick Task 260603-email-template: Polir template de email auth

## Goal

Substituir o HTML cru dos emails transacionais de auth por um template responsivo, legivel e alinhado a QUEUE/2.

## Scope

1. Melhorar o HTML dos emails de verificacao e reset.
2. Manter texto plain-text seguro e funcional.
3. Garantir quebra de linha para URLs longas no fallback.
4. Adicionar teste de regressao para estrutura do template.
5. Corrigir regressao pequena encontrada no gate: RAWG sync nao deve apagar tempo curado quando nao recebeu novo tempo estimado.

## Non-Goals

- Trocar dominio/remetente do Resend.
- Instalar React Email agora.
- Alterar logica de auth ou tokens.

## Verification

- `pnpm --filter @queue/web test`
- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
