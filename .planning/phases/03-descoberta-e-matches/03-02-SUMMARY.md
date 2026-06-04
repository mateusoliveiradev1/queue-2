---
phase: 03-descoberta-e-matches
plan: "02"
subsystem: discovery
tags: [nextjs, postgres, rls, zod, rate-limit, vitest]

requires:
  - phase: 03-descoberta-e-matches
    provides: Discovery persistence, RLS, decision policies, mood rules and recommendation ranking from 03-01.
provides:
  - Discovery deck and autocomplete application services with catalog source/freshness metadata and library status.
  - Transactional decision recording with idempotent match creation and domain events.
  - Explicit library handoff for Wishlist, Jogando and Pausado through library public APIs.
  - Match history, Match Live payload, mood quiz result and unseen surprise contracts.
  - Authenticated, bounded discovery search Route Handler with persistent rate limiting.
affects: [03-03, 03-04, phase-4-jogando-agora, phase-6-roleta]

tech-stack:
  added: []
  patterns:
    - Discovery application use cases accept injectable catalog/repository gateways for focused tests.
    - Runtime wrappers import catalog, library and repository public entrypoints dynamically to keep tests free of server-only runtime.
    - Autocomplete endpoints use zod validation plus database-backed per-user rate limit.

key-files:
  created:
    - apps/web/src/modules/discovery/application/get-discovery-deck.ts
    - apps/web/src/modules/discovery/application/record-discovery-decision.ts
    - apps/web/src/modules/discovery/application/get-match-history.ts
    - apps/web/src/modules/discovery/application/start-live-session.ts
    - apps/web/src/modules/discovery/application/get-live-session.ts
    - apps/web/src/modules/discovery/application/answer-mood-quiz.ts
    - apps/web/src/modules/discovery/application/get-surprise-recommendation.ts
    - apps/web/src/modules/discovery/application/search-discovery-games.ts
    - apps/web/src/modules/discovery/infrastructure/discovery-repository.ts
    - apps/web/src/modules/discovery/presentation/view-models.ts
    - apps/web/src/app/app/descobrir/actions.ts
    - apps/web/src/app/api/discovery/search/route.ts
    - apps/web/tests/discovery-application.test.ts
    - apps/web/tests/discovery-search.test.ts
  modified:
    - apps/web/src/modules/discovery/application/ports.ts
    - apps/web/src/modules/discovery/index.ts
    - apps/web/src/platform/rate-limit/persistent.ts

key-decisions:
  - "Discovery autocomplete uses a persistent database-backed per-user rate limit before catalog search."
  - "Discovery cold-start tag signals reuse catalog genre labels until a dedicated catalog tag source exists."
  - "Discovery application use cases expose injectable dependencies while public wrappers load server-only dependencies at runtime."

patterns-established:
  - "Discovery server actions parse FormData, derive userId from requireVerifiedSession and redirect only to safe /app paths."
  - "Match creation is handled inside withAppUserTransaction with unique match conflict handling and ops.domain_events."
  - "Search and surprise build deck cards from catalog public card views plus discovery read state."

requirements-completed: [DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11, DISC-12]

duration: 19 min
completed: 2026-06-04
---

# Phase 03 Plan 02: Discovery Application Services Summary

**Server-authoritative Discovery services for deck reads, swipes, matches, live state, quiz, surprise, autocomplete and safe library handoff.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-06-04T04:24:13Z
- **Completed:** 2026-06-04T04:43:28Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments

- Added deck/search read models that combine catalog card metadata, discovery decision state, recommendation reasons and current library status.
- Implemented transactional decision recording with reciprocal `want` match creation, unique conflict protection, reason snapshots and `ops.domain_events`.
- Added explicit handoff to Wishlist, Jogando and Pausado through library public APIs without auto-adding matches.
- Added Match Live session lifecycle/payload, mood quiz preview/full result handling, unseen surprise selection and bounded autocomplete route.
- Covered application behavior with focused Vitest suites for deck filtering, search bounds, handoff, live scoping, quiz preview and surprise eligibility.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement discovery repository and deck read models** - `3b9cd3d` (feat)
2. **Task 2: Implement decision, match and library handoff use cases** - `9d79a06` (feat)
3. **Task 3: Implement live, quiz, surprise and autocomplete services** - `369c618` (feat)

Additional correctness commit:

- **Tag signal fix:** `99a8477` (fix)

**Plan metadata:** pending final commit

## Files Created/Modified

- `apps/web/src/modules/discovery/application/get-discovery-deck.ts` - Deck use case with seen-card exclusion and recommendation ordering.
- `apps/web/src/modules/discovery/application/record-discovery-decision.ts` - Decision validation, library handoff orchestration and public wrappers.
- `apps/web/src/modules/discovery/application/get-match-history.ts` - Match history use case.
- `apps/web/src/modules/discovery/application/start-live-session.ts` - Match Live start use case.
- `apps/web/src/modules/discovery/application/get-live-session.ts` - Match Live polling payload use case.
- `apps/web/src/modules/discovery/application/answer-mood-quiz.ts` - Mood quiz persistence/result plus recommendation cards.
- `apps/web/src/modules/discovery/application/get-surprise-recommendation.ts` - Surprise recommendation from games neither member has seen.
- `apps/web/src/modules/discovery/application/search-discovery-games.ts` - Autocomplete/search validation and read model.
- `apps/web/src/modules/discovery/infrastructure/discovery-repository.ts` - Server-only discovery persistence using `withAppUserTransaction`.
- `apps/web/src/modules/discovery/presentation/view-models.ts` - Discovery card view models and catalog-card to recommendation-fact mapping.
- `apps/web/src/modules/discovery/application/ports.ts` - Application contracts for deck, decisions, live, quiz, surprise and search.
- `apps/web/src/modules/discovery/index.ts` - Public discovery entrypoint.
- `apps/web/src/app/app/descobrir/actions.ts` - Verified-session Discovery Server Actions.
- `apps/web/src/app/api/discovery/search/route.ts` - Bounded authenticated autocomplete Route Handler.
- `apps/web/src/platform/rate-limit/persistent.ts` - Persistent discovery search limiter.
- `apps/web/tests/discovery-application.test.ts` - Deck, decision and handoff coverage.
- `apps/web/tests/discovery-search.test.ts` - Search bounds, route security, surprise, quiz and live-scope coverage.

## Decisions Made

- Autocomplete is authenticated and rate-limited with persistent database storage before any catalog search runs.
- Genre labels are reused as lightweight cold-start tag signals because the current catalog public card contract does not expose a dedicated tag table.
- Public discovery wrappers load server-only catalog/library/repository dependencies dynamically; tests exercise injected use cases instead of importing server-only runtime.

## Verification

- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web test -- discovery-application` - passed, 8 tests.
- `pnpm --filter @queue/web test -- discovery-search` - passed, 5 tests.
- `pnpm check:architecture` - passed.
- Source check for actions/route validation and authorization - passed: `requireVerifiedSession()`, `z.object`, `safeParse`, `persistentDiscoverySearchLimiter`, decision/source validators and `getSafeReturnTo` are present.

## Acceptance Criteria

- Default deck excludes games the current member already evaluated: covered by `discovery-application`.
- Search/autocomplete can intentionally include already seen games: covered by `discovery-application`.
- Deck cards include library status and valid action state without duplicating library rows: covered by `discovery-application`.
- Cross-module reads use public exports or plain IDs, not deep imports: `pnpm check:architecture` passed.
- Match creation is idempotent under repeated/concurrent approvals: repository uses unique match conflict handling and `discovery-application` asserts the conflict path.
- Match result does not add to library until explicit handoff: repository does not insert library rows; handoff use case calls library APIs only after user action.
- Existing library row is moved instead of duplicated: covered by `discovery-application`.
- Server actions derive `userId` from `requireVerifiedSession()` and use safe return paths: covered by source assertion.
- Autocomplete rejects too-short/too-long queries and caps result count: covered by `discovery-search`.
- Live payload never leaks another duo's session or matches: repository live queries are scoped by current membership duo and covered by source assertion.
- Surprise excludes games seen by either member: covered by `discovery-search`.
- Mood quiz full result requires both members; otherwise returns preview: repository merges stored member answers and preview behavior is covered by `discovery-search`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added persistent rate limiting to discovery autocomplete**
- **Found during:** Task 3 (Implement live, quiz, surprise and autocomplete services)
- **Issue:** The plan required a repeatable autocomplete Route Handler. Without persistent rate limiting, search could be abused despite bounded input.
- **Fix:** Added `DISCOVERY_SEARCH_RATE_LIMIT_POLICY`, `persistentDiscoverySearchLimiter` and route-level 429 responses with `Retry-After`.
- **Files modified:** `apps/web/src/platform/rate-limit/persistent.ts`, `apps/web/src/app/api/discovery/search/route.ts`, `apps/web/tests/discovery-search.test.ts`
- **Verification:** `pnpm --filter @queue/web test -- discovery-search`, `pnpm --filter @queue/web typecheck`, `pnpm check:architecture`
- **Committed in:** `369c618`

**2. [Rule 2 - Missing Critical] Populated cold-start tag signals from catalog genres**
- **Found during:** Stub scan after Task 3
- **Issue:** Recommendation tag inputs were structurally present but empty, weakening the planned tag/practical compatibility signal.
- **Fix:** Reused catalog genre labels as lightweight tag facts and positive tag profile until a dedicated catalog tag source exists.
- **Files modified:** `apps/web/src/modules/discovery/presentation/view-models.ts`, `apps/web/src/modules/discovery/infrastructure/discovery-repository.ts`
- **Verification:** `pnpm --filter @queue/web test -- discovery-application`, `pnpm --filter @queue/web test -- discovery-search`, `pnpm --filter @queue/web typecheck`
- **Committed in:** `99a8477`

---

**Total deviations:** 2 auto-fixed (2 missing critical/security)
**Impact on plan:** Both fixes tightened correctness/security within planned Discovery contracts. No architecture change or new feature scope was introduced.

## Issues Encountered

None - all verification commands passed.

## Known Stubs

None - no TODO/FIXME/placeholder stubs remain in plan-created Discovery services. Empty card/recommendation arrays are used only as valid empty-state responses, such as no mood answers or no surprise candidate.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-descoberta-e-matches/03-02-SUMMARY.md`.
- Task commits found: `3b9cd3d`, `9d79a06`, `369c618`, `99a8477`.
- Key created files found: `apps/web/src/modules/discovery/infrastructure/discovery-repository.ts`, `apps/web/src/app/api/discovery/search/route.ts`, `apps/web/src/app/app/descobrir/actions.ts`, `apps/web/tests/discovery-application.test.ts`, `apps/web/tests/discovery-search.test.ts`.
- Plan verification commands passed after the final code commit.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Ready for `03-03`: authenticated Discovery UI can now compose stable server contracts for deck, filters, search/autocomplete, swipe actions, match celebration, live payload, mood quiz, surprise and library handoff.

---
*Phase: 03-descoberta-e-matches*
*Completed: 2026-06-04*
