# Phase 3: Descoberta E Matches - Research

**Researched:** 2026-06-04T00:00:00-03:00
**Status:** Ready for planning
**Question:** What do we need to know to plan Phase 3 well?

## Executive Summary

Phase 3 should turn the accepted Phase 2 catalog card into a real duo-owned discovery module. The work should be planned as four connected capabilities:

1. Duo-scoped discovery persistence: member decisions, matches, live sessions, mood quiz answers, match history and optional push subscriptions.
2. Pure discovery domain/application rules: deck eligibility, swipe decisions, match creation, cooldown behavior, surprise selection, mood merge, recommendation reasons and valid library handoff.
3. Recommendation and live orchestration: cold-start tag/platform/time/availability ranking first, collaborative influence gated behind minimum interaction thresholds, and short live-state refresh without pretending to be a permanent realtime system.
4. Authenticated Discovery UI: a large swipe deck, compact mode shortcuts, filters/search/autocomplete, mood quiz, surprise, match celebration, match history and status actions that preserve source/freshness and accessibility.

The main planning constraint is that Phase 3 answers "queremos jogar este jogo?". It must not choose the next game, mutate roulette eligibility directly, or auto-add matches into the library. The future Phase 6 roulette draws from consciously added library games, not raw unseen catalog cards.

## Existing Code Baseline

Phase 2 and 02.1 already provide the substrate Phase 3 needs:

- `apps/web/src/app/app/catalogo/page.tsx` has the current suggested-card pattern that should evolve into the Discovery deck.
- `apps/web/src/modules/catalog` exposes public search/detail APIs with source/freshness, localization and main-flow eligibility.
- `apps/web/src/modules/library` exposes public add/move/status APIs, common-platform logic and qualitative match-score factors.
- `apps/web/src/app/app/phase-2-actions.ts` demonstrates thin server actions that authorize the verified session and delegate to module public APIs.
- `packages/db/src/schema/app.ts`, `packages/db/src/rls/policies.sql` and `packages/db/src/roles.sql` establish the duo-scoped app table, forced-RLS and least-privilege grant pattern.
- `ops.domain_events` already exists for duo-scoped append-only product events and can record discovery decisions/matches if useful for future Hall/timeline work.
- `apps/web/tests/catalog-library-ui.test.tsx`, `apps/web/tests/duo-isolation.test.ts`, `packages/db/tests/library-rls.test.ts` and `packages/db/tests/library-concurrency.test.ts` show the right style for UI, authorization, RLS and concurrency tests.

Important baseline gaps:

- `apps/web` does not currently depend on `motion`, `web-push` or `swr`, even though they appear in the recommended stack. Plans that require these libraries must install them explicitly and update the lockfile.
- There is no `apps/web/src/modules/discovery` module yet, despite the architecture contract listing `discovery` as a first-class module.
- Existing catalog search supports query, limit, main-flow inclusion and platform filters, but Phase 3 needs richer discovery filters and autocomplete-oriented reads.

## Discovery Data Model Recommendations

Use `app` for duo-scoped product state.

Recommended tables:

- `app.discovery_member_decisions`
  - `duo_id`, `user_id`, `catalog_game_id`, `decision`, `decided_at`, `cooldown_until`, `live_session_id null`, `source_mode`, timestamps.
  - Decision check: `want`, `not_now`, `skip`.
  - Unique current decision per `(duo_id, user_id, catalog_game_id)` or append-only history plus a current read model. For v1 planning, one current row plus events is simpler and enough.
  - `want` is durable positive consent. `not_now` has cooldown. `skip` should not count as a negative preference and should only remove the current card for that member/session.
- `app.discovery_matches`
  - `duo_id`, `catalog_game_id`, `matched_at`, `created_from`, `first_user_id`, `second_user_id`, recommendation reason snapshot, library action fields.
  - Unique `(duo_id, catalog_game_id)` so concurrent reciprocal approvals cannot duplicate a match.
  - Match creation must happen in the same transaction as the approving decision.
- `app.discovery_live_sessions`
  - `duo_id`, `started_by_user_id`, `status`, `started_at`, `expires_at`, optional `ended_at`.
  - Keep sessions short and expirable. They are a shared moment, not persistent chat or websocket infrastructure.
- `app.discovery_mood_quiz_answers`
  - `duo_id`, `user_id`, `question_key`, `answer_key`, `answered_at`, `session_key` or `quiz_round`.
  - A full duo result requires both members. A one-member answer can produce preview only.
- `app.discovery_push_subscriptions`
  - `duo_id`, `user_id`, endpoint, p256dh/auth keys, enabled flag, timestamps.
  - Only create after opt-in. Push is a notification enhancement, not the authority for match state.

All duo-scoped tables need `duo_id`, forced RLS, membership policies, indexes on `(duo_id, user_id, decided_at)`, `(duo_id, catalog_game_id)`, live expiration and match history order. Runtime grants should follow Phase 2 column-level restrictions where possible.

## Domain And Application Rule Recommendations

Create `apps/web/src/modules/discovery` with the standard shape:

- `domain/discovery-policy.ts`
  - decision enum, cooldown rules, skip semantics, match eligibility and valid source modes.
- `domain/recommendation-policy.ts`
  - cold-start scoring, reason labels, variety band and collaborative threshold gate.
- `domain/mood-quiz.ts`
  - three locked axes: energy, commitment and vibe.
  - merge both members conservatively; conflicting answers find middle ground/flexible games.
- `application/ports.ts`
  - repository contracts and typed result unions.
- `application/get-discovery-deck.ts`
  - current deck cards, filters, reasons, library status and source/freshness state.
- `application/record-discovery-decision.ts`
  - records `Quero jogar`, `Agora nao` or `Pular`, creates a match when reciprocal `want` exists, records event snapshot and returns celebration data.
- `application/get-match-history.ts`
  - polished match history with current library status and add/move actions.
- `application/start-live-session.ts`, `get-live-session.ts`
  - short live session lifecycle and polling payload.
- `application/answer-mood-quiz.ts`
  - stores answers and returns preview/full duo recommendation state.
- `application/get-discovery-search.ts`
  - autocomplete and filtered discovery reads.
- `application/get-surprise-recommendation.ts`
  - compatible unseen game selection.

Routes and Client Components should import only from `modules/discovery/index.ts`. Discovery can consume catalog/library public contracts, but cannot deep-import their internals.

## Recommendation Findings

Cold-start recommendation is the v1 default:

- Required gates for default deck:
  - catalog `mainFlowEligible` and confirmed 2-player campaign/story coop.
  - not already evaluated by the current member unless explicitly searching/history recovery.
  - common platform prioritized and enabled by default.
  - library status shown if already present, not duplicated.
- Positive factors:
  - common platform.
  - reliable estimated time when it matches filter/mood.
  - verified free/Game Pass availability when requested.
  - genre/tag similarity from recent positive decisions and library games.
  - editorial rarity/mood labels.
- Negative/soft factors:
  - `not_now` blocks or lowers strength until cooldown expires.
  - no common platform blocks or heavily lowers default-flow ranking.
  - `skip` removes only the current card and should not poison future ranking.
- Variety:
  - keep precision dominant, but reserve a small controlled band for compatible surprises so the deck does not collapse into one genre.
- Collaborative filtering:
  - do not use broad collaborative signals until enough interaction volume exists.
  - Recommended threshold for planning: at least 20 distinct games with decisions inside current duo and at least 100 cross-duo positive decision facts before any collaborative factor can affect ranking.
  - Before threshold, expose the capability as disabled/very-low-weight and test that cold-start reasons remain deterministic.

Recommendation reasons should be compact strings such as `PC em comum`, `campanha 2p`, `curto para hoje`, `Game Pass verificado`, `puzzle que voces costumam curtir`. Do not emit fake percentages.

## Live, Push And Transport Findings

Phase 3 does not need a persistent websocket system.

Recommended v1 path:

- Server actions for decisions and quiz answers.
- Route Handler or server action for polling a live-session payload every few seconds while the live screen is open.
- `SWR` is optional but useful for client revalidation if installed. If not installed, a small client polling hook can be implemented without adding a package, but the plan should avoid inventing a broad realtime abstraction.
- Match creation remains server/database authoritative. The client only refreshes the result.
- Push notification uses `web-push` only after explicit browser opt-in. If push subscription setup becomes too large, it should be its own task in the live/push plan, but DISC-02 requires at least a working opted-in path for match notifications.
- Do not ask for push permission on page load. Ask after the user enters Match Live or receives a clear explanation of match alerts.

The web-push library expects VAPID configuration server-side. Add envs such as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`; keep private key out of client bundles. Client code may receive only the public key.

## UI And Interaction Findings

The main screen should be `/app/descobrir` or equivalent authenticated Discovery route, added to `AppShell`.

Recommended composition:

- Header with compact mode actions above the deck: `Live`, `Surpresa`, `Quiz`, `Busca`.
- Always-visible quick filters: estimated time, common platform, availability.
- `Mais filtros` drawer: coop type, mood, year, genre and rarity.
- Center deck card:
  - large cover as primary visual signal.
  - title, genres/platforms, source/freshness and short reasons.
  - three primary actions: `Quero jogar`, `Agora nao`, `Pular`.
  - if already in library, show current status and valid moves.
- Match celebration:
  - celebrate first, then offer add/move to Wishlist/Jogando/Pausado.
  - no auto-add.
- Match history:
  - attractive cards, match date, reason snapshot, current library status and actions.
  - not Hall, not reviews, not deep stats.

Motion guidance:

- `motion` supports drag gestures and physics-based drag in React, including axis locking, momentum, constraints and drag lifecycle callbacks.
- `useReducedMotion` can switch expensive x/y/physics transitions to simpler opacity/state changes and reacts to system preference changes.
- The plan should include keyboard equivalents for all swipe actions, visible focus, touch target sizing and reduced-motion tests.

## Search, Autocomplete And Filter Findings

Catalog reads should be extended instead of duplicated:

- Add discovery-specific search input with:
  - query/autocomplete limit.
  - main-flow only/default eligibility.
  - common platform filter.
  - time estimate bands.
  - availability filter.
  - genre/year/editorial rarity/mood filters.
  - already-seen inclusion flag for search/history only.
- Autocomplete should debounce on the client and call a same-origin Route Handler or server action that validates query length, bounds limit and never exposes RAWG secrets.
- Selecting a suggestion should open the discovery card/detail context with decision and library actions, not a separate generic catalog clone.

## Security And Data Risks

- Cross-duo leakage is the highest risk. Every discovery table is private duo state and must use `duo_id`, forced RLS, app membership policies and integration tests.
- Reciprocal approvals are a concurrency risk. The mutation should lock or upsert deterministically so two users approving at the same time create exactly one match and one celebration/event.
- Client-supplied `duoId`, `userId`, recommendation score, match flag or library status cannot be trusted. Derive membership from verified session and database identity.
- Push subscriptions are sensitive endpoints and keys. Store endpoint/key material server-side, allow disable/delete, never log full endpoint/auth values, and avoid sending push before explicit opt-in.
- Search/autocomplete can be abused. Bound query length/limit and reuse persistent rate-limit patterns if a public-ish Route Handler is added.
- Catalog text, recommendation reasons and future user-entered fields should render as text, never HTML.
- Recommendation ranking should remain explainable enough for tests. Snapshot reasons at match time so history does not change when ranking weights change.

## Suggested Plan Slices

1. **Discovery schema, RLS and pure rules.** Add `discovery` module foundation, app tables, policies, grants, decision/match/mood/recommendation policies and database isolation/concurrency tests.
2. **Discovery application services and server actions.** Implement deck reads, decisions/match creation, live session lifecycle, quiz, surprise, search/autocomplete and library handoff using catalog/library public APIs.
3. **Discovery deck, filters and match UX.** Add authenticated route/navigation, motion dependency, swipe deck, accessible keyboard/touch controls, filters, search UI, quiz/surprise/live panels, match celebration and match history.
4. **Push, E2E and accessibility hardening.** Add opted-in push subscription/send path for Match Live, browser tests for double swipe/match/live/history/library move, reduced-motion coverage and responsive visual checks.

Wave dependency should be strict: UI depends on stable application contracts, and live/push hardening depends on match persistence. If execution needs smaller scope, split Plan 3 into deck/filters and Plan 4 into live/push/E2E, but do not drop any DISC requirement.

## Sources

- `.planning/ARCHITECTURE.md` - binding module and database ownership rules.
- `.planning/SECURITY.md` - binding RLS, authorization, secret and every-phase security gates.
- `.planning/phases/03-descoberta-e-matches/03-CONTEXT.md` - phase decisions D-01 through D-37.
- `.planning/phases/02-catalogo-e-biblioteca/02-03-SUMMARY.md` and Phase 02.1 artifacts - accepted catalog/library/localization baseline.
- `apps/web/src/modules/catalog`, `apps/web/src/modules/library`, `packages/db/src/schema/app.ts`, `packages/db/src/rls/policies.sql` - current implementation patterns.
- Motion reduced-motion docs: https://motion.dev/docs/react-use-reduced-motion
- Motion drag docs: https://motion.dev/docs/react-drag
- Next.js App Router forms and Server Actions docs: https://nextjs.org/docs/app/guides/forms
- web-push package/README: https://www.npmjs.com/package/web-push
- PostgreSQL Row Security docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## RESEARCH COMPLETE

Phase 3 is ready for detailed planning.
