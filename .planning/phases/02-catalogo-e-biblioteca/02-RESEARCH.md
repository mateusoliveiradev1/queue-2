# Phase 2: Catalogo E Biblioteca - Research

**Researched:** 2026-06-03T18:19:59-03:00
**Status:** Ready for planning
**Question:** What do we need to know to plan Phase 2 well?

## Executive Summary

Phase 2 should be planned as three connected capabilities:

1. A server-only catalog integration that stores sourced RAWG metadata in the `catalog` schema.
2. Duo-scoped platform and library state in the `app` schema, protected by the same transaction-local identity and forced RLS pattern from Phase 1.
3. Authenticated product surfaces that make the catalog feel like the start of the discovery ritual: a strong suggested game card, practical browse/search, game detail and a shared library.

The most important planning constraint is that RAWG data is not enough to prove the Phase 2 main-flow rule: "confirmed 2-player campaign/story coop". The schema needs an explicit eligibility/curation layer. RAWG can provide names, covers, descriptions, release dates, genres, platforms, playtime-like metadata and update timestamps, but QUEUE/2 must own the product decision that a game is allowed into the main automatic flow.

## Existing Code Baseline

The repository already contains the Phase 1 modular foundation:

- `apps/web/src/modules/duo` uses the expected domain/application/infrastructure/presentation split and exposes only `index.ts` publicly.
- Runtime database access goes through `withAppUserTransaction`, which sets `queue2.user_id` transaction-locally before queries.
- `packages/db/src/schema/app.ts` defines duo identity tables and should be extended carefully for duo-scoped Phase 2 state.
- `packages/db/src/rls/policies.sql` enables and forces RLS on existing duo-scoped tables.
- `packages/db/src/roles.sql` grants least-privilege access with column-level restrictions already used for `app.duos`.
- `apps/web/src/app/app/page.tsx` is still an honest empty queue page. Phase 2 should turn it into a real entry point without faking Phase 3 matches or Phase 4 sessions.
- `apps/web/src/components/app-shell.tsx` currently supports `Fila`, `Dupla` and `Perfil`; Phase 2 should add catalog/library navigation in a way that keeps accessible labels and the authenticated shell coherent.

## RAWG Integration Findings

RAWG requires an API key on requests and documents game/catalog fields that are useful for Phase 2: descriptions, genres, release dates, platform data, images/screenshots, stores, average playtime and update timestamps. The key must stay server-side behind a `server-only` adapter.

RAWG attribution is not optional. RAWG's API terms require attributing RAWG as the source of data and/or images and adding an active hyperlink from every page where RAWG data is used. Their public API page also states that backlinks are required on pages where the data is used.

RAWG plan/rate limits matter for implementation shape. The free plan documentation lists a monthly request limit and the terms reserve the right to change restrictions. Phase 2 should not call RAWG directly from every browser navigation. It should cache/synchronize selected data into Postgres and expose server-mediated reads.

RAWG also states that API data may change or be unavailable. This supports the existing product requirement that source and freshness must be visible, and that the UI must honestly show "Sem fonte confiavel ainda" or "Nao verificado" for estimated time or availability when no reliable sourced data exists.

## Catalog Data Model Recommendations

Use the `catalog` schema for external/source-owned facts:

- `catalog.games`
  - `id`, `rawg_id`, `slug`, `name`, `description`, `released_at`, `background_image_url`, `rawg_url`, `rawg_updated_at`, `synced_at`
  - source/freshness fields: `source`, `source_url`, `source_updated_at`, `synced_at`
  - eligibility fields owned by QUEUE/2: `coop_campaign_confirmed`, `coop_player_count_min`, `coop_player_count_max`, `coop_confirmation_source`, `coop_confirmation_checked_at`
- `catalog.game_platforms`
  - normalized platform facts from RAWG mapped to QUEUE/2 platform enum labels.
- `catalog.game_genres`
  - simple normalized genre names for cards/detail/filtering.
- `catalog.game_time_estimates`
  - neutral estimated completion time, source, source URL, checked date, confidence/status. Do not imply HLTB if there is no official allowed source.
- `catalog.game_availability`
  - availability type such as `free` or `game-pass`, platform/service, source URL and last verification date.

Do not let RAWG tags alone decide main-flow eligibility. If a future sync detects likely coop from RAWG tags, store it as a candidate signal, not as confirmed eligibility, until the product-controlled confirmation field is set.

## Duo-Scoped Library Model Recommendations

Use the `app` schema for user/duo product state:

- `app.member_platforms`
  - `duo_id`, `user_id`, `platform`, timestamps.
  - Composite uniqueness on `user_id, platform`.
  - RLS: user can only select/update their own platform rows, but duo members can read both members' platform rows to compute common platforms.
- `app.duo_library_games`
  - `duo_id`, `catalog_game_id`, `status`, `added_by_user_id`, `status_updated_by_user_id`, timestamps.
  - One row per duo/game.
  - Status check: `wishlist`, `jogando`, `pausado`, `zerado`, `dropado`.
  - Phase 2 use cases only allow moving into `wishlist`, `jogando`, and `pausado`.
  - `zerado` and `dropado` can exist as blocked/future states for display or migration compatibility, but mutations to them should return a future-state result until Phase 4 double confirmation exists.
  - Partial unique/index guard for at most three `jogando` rows per duo. PostgreSQL cannot express "at most three" with a simple check constraint, so enforce through a transaction with a lock on the duo row or a security-definer function, plus a database test for concurrent moves.
- Optional `ops.domain_events`
  - Emit append-only events for library additions/status moves if useful for later timeline/replay. Do not block Phase 2 on a full outbox processor.

## Domain Module Shape

Plan two modules, not one vague service:

- `catalog`
  - Owns external game metadata, RAWG adapter, sync/search/detail reads and source/freshness presentation models.
  - Public API examples: `getCatalogHome`, `searchCatalogGames`, `getCatalogGameDetail`, `syncRawgGame`.
- `library`
  - Owns duo platform choices, common platforms, library status mutations, match-score rules and library/detail reads.
  - Public API examples: `getLibraryOverview`, `updateMemberPlatforms`, `addGameToWishlist`, `moveLibraryGame`, `getLibraryGameDetail`.

The `library` module may consume the `catalog` module public contract or stable catalog IDs. It must not deep-import catalog internals. Shared compatibility rules that are library-owned should live in `library/domain`, with catalog facts passed as inputs.

## Match Score Research

Phase 2 score should be a qualitative compatibility model, not a fake preference percentage.

Recommended output shape:

- Label: `Forte`, `Boa`, `Incerta`, `Bloqueada`.
- Factors:
  - `coop campanha 2p confirmado`
  - `plataforma em comum: PC`
  - `tempo sem fonte confiavel`
  - `disponibilidade nao verificada`
  - `fora do fluxo principal: sem plataforma comum`
- Domain rule:
  - confirmed campaign/story coop is required for main-flow recommendation.
  - common platform improves/permits recommendation.
  - missing time or availability lowers confidence but does not fabricate a number.
  - no common platform blocks recommendation but does not block manual Wishlist addition.

This leaves Phase 3 room to add preference signals from swipes and matches without migrating away from an honest Phase 2 model.

## UI Planning Notes

Phase 2 should unlock real daily-use screens:

- `/app/catalogo` - hybrid catalog home with one prominent suggested game card and supporting browse/search grid.
- `/app/biblioteca` - shared library grouped/filterable by Wishlist, Jogando and Pausado; Zerado/Dropado visible as locked future states.
- `/app/jogo/[slug]` - game detail for catalog/library context.
- `/app` - dashboard should point to the real catalog/library and summarize first library state instead of saying the queue is empty.

Visual direction:

- Keep utility screens calm and dense enough for repeated use.
- Use covers as the main color source.
- Show RAWG attribution/freshness as quiet metadata on cards/detail surfaces.
- Avoid dead "sessions/checkpoints/progress" panels in detail. Use a small `jornada da dupla` area that is honest about what Phase 2 knows.
- Mobile should use tabs/list; desktop can show denser status columns.

Accessibility requirements:

- Keyboard navigation for cards, filters and status actions.
- Touch targets for platform toggles and status controls.
- Alt/fallback treatment for cover images.
- Reduced-motion equivalent for any suggested-card transition.

## Security And Data Risks

- Cross-duo leakage risk is high because library rows are duo-scoped. Every library query and mutation must authorize through session, set database user identity and rely on forced RLS.
- Member platform writes must not let one member edit the other's platform choices.
- RAWG key leakage risk requires server-only adapter, no client-side API calls and secret scanning coverage.
- Stored XSS risk exists for RAWG text and any future manual notes. Descriptions should be rendered as text/sanitized content, not trusted HTML.
- Rate/egress risk exists if search hits RAWG directly. Cache/sync in Postgres and rate-limit external search/sync endpoints.
- Jogando limit is a concurrency risk. Use a transaction and database test for simultaneous moves that attempt to create a fourth active game.

## Suggested Plan Slices

1. Catalog schema, RAWG adapter and sync/search/detail data contract.
2. Library/platform schema, RLS, domain rules and server use cases.
3. Catalog, library and game-detail UI surfaces with Portuguese product copy, attribution and focused tests.

The first two slices should complete before UI wiring because the UI depends on stable source/freshness fields, common-platform logic and library mutations.

## Sources

- `.planning/ARCHITECTURE.md` - binding module and database ownership rules.
- `.planning/SECURITY.md` - binding RLS, authorization, secret and every-phase security gates.
- `.planning/phases/02-catalogo-e-biblioteca/02-CONTEXT.md` - phase decisions D-01 through D-24.
- `packages/db/src/schema/app.ts`, `packages/db/src/rls/policies.sql`, `apps/web/src/modules/duo` - existing code patterns.
- RAWG API page: https://rawg.io/apidocs
- RAWG API terms: https://rawg.io/tos_api

## Research Complete

Phase 2 is ready for detailed planning.
