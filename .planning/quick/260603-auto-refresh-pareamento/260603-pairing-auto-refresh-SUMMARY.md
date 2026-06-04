---
status: completed
completed: 2026-06-03
quick_id: 260603-pairing-auto-refresh
slug: auto-refresh-pareamento
---

# Quick Task 260603-pairing-auto-refresh: Summary

## Outcome

A conta que criou um codigo de pareamento agora revalida automaticamente a tela enquanto espera a segunda pessoa:

- `PairingAutoRefresh` chama `router.refresh()` a cada 3 segundos, no foco da janela e quando a aba volta a ficar visivel;
- quando a segunda pessoa entra, a revalidacao encontra `routeState === "naming"` e o redirect server-side existente leva o criador para `/app/dupla?estado=dupla-formada`;
- a tela informa que atualiza sozinha enquanto aguarda;
- teste de UI cobre a mensagem e o polling.

## Verification

- `pnpm --filter @queue/web test` -- 109 passed
- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets` -- 96 source files and 21 client bundle files checked
