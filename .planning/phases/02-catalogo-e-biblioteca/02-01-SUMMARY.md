---
phase: 02-catalogo-e-biblioteca
plan: "01"
subsystem: catalog
tags: [postgres, drizzle, rawg, catalog, server-only]

requires:
  - phase: 01.1-polimento-auth-e-landing-intermediaria
    provides: Authenticated shell and visual baseline for Phase 2 surfaces
provides:
  - Sourced catalog schema with RAWG attribution, freshness and explicit coop eligibility
  - Server-only RAWG adapter and Postgres catalog repository
  - Catalog domain policies, use cases and presentation view models
affects: [catalog, library, discovery, ui, database]

tech-stack:
  added: []
  patterns:
    - Server-only integration adapter under module infrastructure
    - Pure catalog policy helpers tested without framework or database imports
    - Catalog facts remain non-duo-scoped while QUEUE/2 owns main-flow eligibility

key-files:
  created:
    - packages/db/src/schema/catalog.ts
    - packages/db/src/migrations/0004_catalog_source.sql
    - packages/db/tests/catalog-schema.test.ts
    - apps/web/src/modules/catalog/application/ports.ts
    - apps/web/src/modules/catalog/infrastructure/rawg-client.ts
    - apps/web/src/modules/catalog/infrastructure/catalog-repository.ts
    - apps/web/src/modules/catalog/domain/catalog-policy.ts
    - apps/web/src/modules/catalog/application/get-catalog-game.ts
    - apps/web/src/modules/catalog/application/search-catalog.ts
    - apps/web/src/modules/catalog/presentation/view-models.ts
    - apps/web/src/modules/catalog/index.ts
    - apps/web/tests/catalog-domain.test.ts
    - .planning/phases/02-catalogo-e-biblioteca/02-USER-SETUP.md
  modified:
    - .env.example
    - packages/db/src/schema/index.ts
    - packages/db/src/roles.sql

key-decisions:
  - "Catalog data is stored as external non-duo facts in the catalog schema; library/private state waits for the app schema."
  - "Main-flow eligibility is an explicit QUEUE/2 curation field and never inferred directly from RAWG tags."
  - "RAWG synchronization fails as a server-side configuration error when RAWG_API_KEY is missing."

patterns-established:
  - "Catalog use cases accept a repository port; the module public index injects infrastructure."
  - "RAWG attribution and freshness are returned as quiet metadata view models."

requirements-completed: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05]

duration: 8 min
completed: 2026-06-03
---

# Phase 02 Plan 01: Catalog Source Foundation Summary

**RAWG-backed catalog foundation with sourced metadata, conservative coop eligibility and server-only synchronization boundaries**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-03T21:30:00Z
- **Completed:** 2026-06-03T21:38:08Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Added `catalog.games`, platform, genre, time estimate and availability schema with ownership comments, indexes and least-privilege grants.
- Added a server-only RAWG adapter with API key enforcement, bounded page sizes and typed normalization into catalog repository inputs.
- Added catalog domain policies, search/detail use cases and view models for RAWG attribution, freshness, honest missing time/availability and main-flow eligibility.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add catalog schema and migration** - `24189d7` (feat)
2. **Task 2: Build server-only RAWG adapter and catalog repository** - `313bfb6` (feat)
3. **Task 3: Add catalog domain policies and public API** - `399434c` (feat)

**Plan metadata:** pending metadata commit

## Files Created/Modified

- `packages/db/src/schema/catalog.ts` - Drizzle catalog schema for sourced game facts.
- `packages/db/src/migrations/0004_catalog_source.sql` - Idempotent catalog SQL migration, indexes, comments and grants.
- `packages/db/tests/catalog-schema.test.ts` - Integration checks for catalog table shape and runtime read-only privileges.
- `apps/web/src/modules/catalog/infrastructure/rawg-client.ts` - Server-only RAWG fetch/normalize adapter.
- `apps/web/src/modules/catalog/infrastructure/catalog-repository.ts` - Postgres catalog read and sync/upsert repository.
- `apps/web/src/modules/catalog/domain/catalog-policy.ts` - Pure source, freshness, eligibility, time and availability policies.
- `apps/web/src/modules/catalog/application/*.ts` - Search and detail use cases over repository ports.
- `apps/web/src/modules/catalog/presentation/view-models.ts` - Portuguese-BR presentation models for cards/detail.
- `apps/web/src/modules/catalog/index.ts` - Catalog public entrypoint.
- `apps/web/tests/catalog-domain.test.ts` - Domain/use-case tests that avoid database, React, Next.js and RAWG infrastructure imports.
- `.env.example` - Documents server-only `RAWG_API_KEY`.
- `.planning/phases/02-catalogo-e-biblioteca/02-USER-SETUP.md` - Human setup checklist for RAWG API access.

## Decisions Made

- Catalog tables are intentionally non-duo-scoped because they store external facts; duo library state starts in the next plan.
- The runtime role receives catalog `SELECT` only. Catalog writes are reserved for worker/migrator-capable execution.
- RAWG playtime is treated as an unverified neutral estimate, not as HLTB or definitive completion time.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope change.

## Issues Encountered

- Auxiliary PowerShell `rg` quoting failed twice during a non-required import scan. Re-ran the check with simpler patterns; required tests and architecture gates were unaffected.
- `TEST_DATABASE_URL` is not configured locally, so catalog integration tests produced the explicit skip output required by the plan.

## User Setup Required

**External services require manual configuration.** See [02-USER-SETUP.md](./02-USER-SETUP.md) for:

- `RAWG_API_KEY` source and destination
- RAWG account/API access confirmation
- Verification commands

## Next Phase Readiness

Plan 02-02 can build duo platform and library state on top of stable catalog IDs, source/freshness fields and the catalog public contract.

---
*Phase: 02-catalogo-e-biblioteca*
*Completed: 2026-06-03*
