---
status: completed
created: 2026-06-03
quick_id: 260603-pairing-auto-refresh
slug: auto-refresh-pareamento
---

# Quick Task 260603-pairing-auto-refresh: Auto refresh no pareamento

## Goal

Fazer a conta que criou o codigo sair automaticamente do estado de espera quando a segunda pessoa entrar na dupla.

## Scope

1. Adicionar revalidacao client-side leve na tela `/parear` enquanto ha codigo ativo.
2. Usar o redirect de servidor existente para levar o criador para `/app/dupla`.
3. Exibir feedback textual de que a tela atualiza sozinha.
4. Cobrir o comportamento em teste de UI.

## Non-Goals

- Alterar regras de pareamento, SQL ou limite de tentativas.
- Introduzir WebSocket/SSE agora.

## Verification

- `pnpm --filter @queue/web test`
- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
