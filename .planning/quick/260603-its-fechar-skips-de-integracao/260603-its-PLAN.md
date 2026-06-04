---
status: complete
created: 2026-06-03
quick_id: 260603-its
slug: fechar-skips-de-integracao
---

# Quick Task 260603-its: Fechar skips de integracao

## Goal

Fazer o gate `pnpm test:integration` rodar contra `TEST_DATABASE_URL` local sem reaproveitar cache antigo de skip, e confirmar `pnpm catalog:seed-curation -- --dry-run`.

## Scope

1. Carregar `.env.local` para o comando raiz de integração sem imprimir segredos.
2. Desabilitar cache do Turbo no task de integração.
3. Corrigir fixtures de integração que falham em banco persistente de teste.
4. Rodar os gates afetados.

## Non-Goals

- Alterar schema ou migrations.
- Rodar testes em produção.
- Expor valores de conexão ou segredos.

## Verification

- `pnpm test:integration`
- `pnpm catalog:seed-curation -- --dry-run`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm check:architecture`
- `pnpm check:secrets`
