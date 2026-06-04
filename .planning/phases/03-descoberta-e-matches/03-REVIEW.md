---
phase: 03-descoberta-e-matches
reviewed: 2026-06-04T16:59:38Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/web/src/app/app/descobrir/actions.ts
  - apps/web/src/app/app/descobrir/discovery-route-params.ts
  - apps/web/src/app/app/descobrir/page.tsx
  - apps/web/src/modules/catalog/infrastructure/catalog-repository.ts
  - apps/web/src/modules/discovery/application/get-discovery-deck.ts
  - apps/web/tests/discovery-application.test.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-04T16:59:38Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Re-review adversarial das correcoes do commit `c039807`, com foco nos antigos WR-01 e WR-03 e em regressoes nos seis arquivos em escopo. O antigo WR-01 foi corrigido: `getSurpriseRecommendationAction` agora deriva filtros de `returnTo` via `getDiscoveryFiltersFromPath(returnTo)`, e `getDiscoveryDeckUseCase` so prioriza a carta preferida quando ela tambem aparece nas recomendacoes filtradas. O antigo WR-03 tambem foi corrigido: `searchGames` e `getGameBySlug` selecionam `game.rawg_updated_at`, e `mapGame` preserva o campo em `rawgUpdatedAt`.

Permanece um warning arquitetural: a camada de aplicacao de discovery ainda importa mapeadores de `presentation`, contrariando o contrato de dependencia em `.planning/ARCHITECTURE.md`. O gate atual de arquitetura ainda nao captura essa violacao.

Verificacoes executadas:
- `pnpm --filter @queue/web test -- discovery-application.test.ts`
- `pnpm --filter @queue/web check:architecture`
- `rg` para artefatos de debug, funcoes perigosas, `as any`, comparacoes frouxas e imports `application -> presentation`

## Warnings

### WR-01: WARNING - Use case de discovery ainda depende da camada presentation

**File:** `apps/web/src/modules/discovery/application/get-discovery-deck.ts:7`
**Issue:** `getDiscoveryDeckUseCase`, em `application`, importa `buildDiscoveryDeckCards`, `getReadableGameState` e `toRecommendationFacts` de `../presentation/view-models`. Isso inverte a direcao definida em `.planning/ARCHITECTURE.md` (`presentation -> application -> domain`) e acopla regra de aplicacao a formatos de UI. O problema permanece apesar de `pnpm --filter @queue/web check:architecture` passar.
**Fix:** mover esses mapeadores para uma camada sem dependencia de UI, por exemplo `application/view-models` ou `application/mappers`, ou fazer o use case retornar DTOs de aplicacao para a camada `presentation` mapear. Atualizar `scripts/check-architecture.mjs` para bloquear imports de `*/application/*` para `../presentation/*`.

---

_Reviewed: 2026-06-04T16:59:38Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
