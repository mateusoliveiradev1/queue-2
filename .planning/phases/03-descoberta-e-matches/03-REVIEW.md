---
phase: 03-descoberta-e-matches
reviewed: 2026-06-04T16:53:07Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/web/src/app/app/descobrir/actions.ts
  - apps/web/src/app/app/descobrir/page.tsx
  - apps/web/src/modules/catalog/application/ports.ts
  - apps/web/src/modules/catalog/application/search-catalog.ts
  - apps/web/src/modules/catalog/infrastructure/catalog-repository.ts
  - apps/web/src/modules/discovery/application/get-discovery-deck.ts
  - apps/web/src/modules/discovery/application/ports.ts
  - apps/web/src/modules/discovery/index.ts
  - apps/web/src/modules/discovery/infrastructure/discovery-repository.ts
  - apps/web/src/modules/discovery/presentation/discovery-card.tsx
  - apps/web/src/modules/discovery/presentation/discovery-deck.tsx
  - apps/web/src/modules/discovery/presentation/discovery-search.tsx
  - apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx
  - apps/web/tests/discovery-application.test.ts
  - apps/web/tests/discovery-ui.test.tsx
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-04T16:53:07Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Re-review adversarial das correcoes do commit `91be013`, com foco nos riscos anteriores CR-01 a CR-04 e WR-01, WR-02, WR-03 e WR-05, alem de regressoes nas mesmas areas. Nao encontrei bloqueadores atuais nos fluxos corrigidos de match concorrente, UUID em entradas de rota/action, submit por gesto/teclado, redirects com query string, origem de decisao por busca/surpresa, ou tratamento de erro no opt-in de push. Ainda restam tres warnings: o modo Surpresa nao respeita filtros ativos de ponta a ponta, a inversao `application -> presentation` continua no modulo, e leituras de catalogo descartam `rawg_updated_at`.

Verificacoes executadas:
- `pnpm --filter @queue/web check:architecture`
- `pnpm --filter @queue/web test -- discovery-application.test.ts discovery-ui.test.tsx`

## Warnings

### WR-01: WARNING - Surpresa ignora filtros ativos e pode forcar carta fora dos filtros

**File:** `apps/web/src/app/app/descobrir/actions.ts:122` (tambem `apps/web/src/modules/discovery/application/get-discovery-deck.ts:85`)
**Issue:** `getSurpriseRecommendationAction` chama `getSurpriseRecommendation` apenas com `userId`, embora a pagina preserve filtros em `returnTo`. Em seguida, `getDiscoveryDeckUseCase` prioriza `preferredCatalogGameId` quando a carta existe em `eligibleCards`, mesmo que esse jogo tenha sido removido por `rankDiscoveryRecommendations` por nao cumprir filtros como tempo, disponibilidade, genero ou ano. Resultado: o botao Surpresa pode exibir uma carta incompativel com os filtros ativos, e a mensagem "surpresa indisponivel com esses filtros" nao representa o criterio real usado.
**Fix:**
```ts
const filters = getDiscoveryFiltersFromPath(returnTo);
const result = await getSurpriseRecommendation({
  userId: session.user.id,
  filters
});

const hasRecommendedPreferred = recommendationResult.recommendations.some(
  (recommendation) => recommendation.catalogGameId === input.preferredCatalogGameId
);
const rankedCatalogGameIds = prioritizePreferredCatalogGameId(
  recommendationResult.recommendations.map((recommendation) => recommendation.catalogGameId),
  input.preferredCatalogGameId,
  hasRecommendedPreferred
);
```
Mover a normalizacao de filtros para um helper compartilhado entre `page.tsx` e `actions.ts`, ou enviar os filtros como campos hidden validados, e adicionar teste cobrindo Surpresa com filtro restritivo.

### WR-02: WARNING - Use cases ainda dependem de mapeadores da camada presentation

**File:** `apps/web/src/modules/discovery/application/get-discovery-deck.ts:7` (tambem `apps/web/src/modules/catalog/application/search-catalog.ts:4`)
**Issue:** a rota agora importa componentes pelo entrypoint publico de discovery, mas a inversao interna de camada permanece: use cases em `application` importam `../presentation/view-models`. Isso viola o contrato em `.planning/ARCHITECTURE.md` (`presentation -> application -> domain`) e deixa regras de aplicacao acopladas a formatos de UI. O gate atual nao pega isso: `pnpm --filter @queue/web check:architecture` passou.
**Fix:** mover `buildDiscoveryDeckCards`, `toRecommendationFacts`, `getReadableGameState` e `toCatalogGameCardView` para uma camada sem dependencia de presentation, por exemplo `application/view-models` ou `application/mappers`, ou fazer os use cases retornarem DTOs de aplicacao e deixar a camada presentation mapear. Atualizar `scripts/check-architecture.mjs` para bloquear imports `*/application/* -> ../presentation/*`.

### WR-03: WARNING - Leituras do catalogo descartam `rawg_updated_at`

**File:** `apps/web/src/modules/catalog/infrastructure/catalog-repository.ts:117`
**Issue:** os SELECTs de `searchGames` e `getGameBySlug` nao incluem `game.rawg_updated_at`, mas `mapGame` le `row.rawg_updated_at` em `catalog-repository.ts:736`. Como a coluna nao vem no resultado, `rawgUpdatedAt` sai sempre `null` nas leituras do repositorio, degradando metadados de fonte/frescor exigidos para dados externos RAWG e podendo quebrar telas ou regras que dependam desse campo.
**Fix:**
```sql
SELECT
  game.id,
  game.rawg_id,
  ...
  game.rawg_url,
  game.rawg_updated_at,
  game.source,
  game.source_url,
  game.source_updated_at,
  ...
```
Aplicar a inclusao em `searchGames` e `getGameBySlug`, e adicionar teste de repositorio garantindo que `rawgUpdatedAt` sobreviva ao round-trip.

---

_Reviewed: 2026-06-04T16:53:07Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
