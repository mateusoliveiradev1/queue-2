---
phase: 03-descoberta-e-matches
plan: 04
subsystem: discovery
tags: [nextjs, web-push, push, polling, playwright, vitest, postgres, rls]

requires:
  - phase: 03-descoberta-e-matches
    provides: Discovery persistence, application contracts and authenticated UI from plans 03-01 through 03-03.
provides:
  - Opted-in Match Live push notification path with server-only VAPID private key handling.
  - Same-origin no-store live polling endpoint and accessible in-app refresh state.
  - Phase 3 E2E, accessibility and Discovery RLS verification coverage.
  - Final evidence map for DISC-01 through DISC-12.
affects: [phase-04, phase-05, phase-06, phase-07, discovery, notifications, security]

tech-stack:
  added: [web-push, "@types/web-push"]
  patterns:
    - Server-only push adapter with redacted endpoint audit data.
    - Bounded authenticated polling route for private duo state.
    - Environment-dependent E2E specs that skip explicitly with missing fixture names.

key-files:
  created:
    - apps/web/src/modules/discovery/application/register-push-subscription.ts
    - apps/web/src/modules/discovery/application/send-match-notification.ts
    - apps/web/src/modules/discovery/infrastructure/push-service.ts
    - apps/web/src/app/api/discovery/push/route.ts
    - apps/web/src/app/api/discovery/live/[sessionId]/route.ts
    - apps/web/src/modules/discovery/presentation/live-session-refresh.tsx
    - apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx
    - apps/web/public/discovery-push-sw.js
    - apps/web/tests/discovery-push.test.ts
    - apps/web/tests/phase-3-e2e.spec.ts
    - .planning/phases/03-descoberta-e-matches/03-04-USER-SETUP.md
  modified:
    - .env.example
    - apps/web/package.json
    - pnpm-lock.yaml
    - scripts/check-secrets.mjs
    - apps/web/src/modules/discovery/application/ports.ts
    - apps/web/src/modules/discovery/application/record-discovery-decision.ts
    - apps/web/src/modules/discovery/infrastructure/discovery-repository.ts
    - apps/web/src/modules/discovery/index.ts
    - apps/web/src/modules/discovery/presentation/live-panel.tsx
    - apps/web/src/app/globals.css
    - apps/web/tests/accessibility.spec.ts
    - apps/web/tests/discovery-ui.test.tsx
    - packages/db/tests/discovery-rls.test.ts

key-decisions:
  - "VAPID_PRIVATE_KEY stays in a server-only push adapter; browser code can request only the public VAPID key."
  - "Push subscription endpoint and key material remain owner-scoped under RLS; match notifications read each member subscription through that member's database context."
  - "Phase 3 Playwright and database integration gaps are explicit environment skips, not treated as passing release evidence."

patterns-established:
  - "Opt-in push: Notification permission is requested only from a user click in the Discovery live panel."
  - "No-store live state: private Match Live route validates session, UUID input and duo membership on each request."
  - "Honest browser gates: E2E specs list missing env fixtures before skipping."

requirements-completed: [DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11, DISC-12]

duration: 22 min
completed: 2026-06-04
---

# Phase 03 Plan 04: Match Live Hardening Summary

**Match Live now has explicit push opt-in, server-only Web Push delivery, short-poll refresh and Phase 3 verification coverage across unit, integration and browser specs.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-04T11:19:17Z
- **Completed:** 2026-06-04T11:41:00Z
- **Tasks:** 4
- **Files modified:** 25

## Accomplishments

- Added `web-push` delivery behind verified session, duo membership, bounded input validation and redacted endpoint audit data.
- Added a no-store Match Live polling route plus client refresh UI that stops after expiration and announces new match state accessibly.
- Added Phase 3 Playwright, accessibility, push and RLS coverage with explicit fixture skips for tests requiring Neon/E2E setup.
- Confirmed Discovery still exposes RAWG/source/freshness metadata and did not implement Phase 4 sessions/progress, Phase 6 roulette draws or Phase 7 Hall/reviews.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Add opted-in push subscription and notification path** - `8062310` (`feat`)
2. **Task 2: Add live polling endpoint and UI refresh behavior** - `5e4ea43` (`feat`)
3. **Task 3: Add browser, accessibility and integration coverage** - `d05075a` (`test`)
4. **Task 4: Run final Phase 3 verification and document residual skips** - `b24528f` (`fix`, auto-fix found by final gate) plus the final docs metadata commit containing this summary.

## Files Created/Modified

- `.env.example` - Documents VAPID and Phase 3 E2E fixture variables.
- `apps/web/package.json`, `pnpm-lock.yaml` - Add `web-push` and type dependency.
- `scripts/check-secrets.mjs` - Tracks `VAPID_PRIVATE_KEY` as a known secret name.
- `apps/web/src/modules/discovery/application/register-push-subscription.ts` - Validates and stores push subscriptions through the Discovery repository.
- `apps/web/src/modules/discovery/application/send-match-notification.ts` - Sends match notifications only to enabled subscriptions.
- `apps/web/src/modules/discovery/infrastructure/push-service.ts` - Server-only Web Push adapter and endpoint redaction.
- `apps/web/src/app/api/discovery/push/route.ts` - Authenticated public-key, register and disable endpoints with no-store responses.
- `apps/web/src/app/api/discovery/live/[sessionId]/route.ts` - Authenticated live polling endpoint scoped to current duo.
- `apps/web/src/modules/discovery/presentation/live-session-refresh.tsx` - Client polling and accessible match update state.
- `apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx` - Explicit browser push opt-in and disable controls.
- `apps/web/public/discovery-push-sw.js` - Minimal push notification service worker.
- `apps/web/tests/discovery-push.test.ts` - Push behavior, redaction and config tests.
- `apps/web/tests/phase-3-e2e.spec.ts` - Browser coverage for Discovery deck, reciprocal match, live state and handoff.
- `apps/web/tests/accessibility.spec.ts` - Discovery keyboard, source-link and reduced-motion coverage.
- `packages/db/tests/discovery-rls.test.ts` - Owner-only push subscription RLS coverage.

## Requirement Evidence

| Requirement | Evidence |
|-------------|----------|
| DISC-01 | Decision and match rules in `record-discovery-decision.ts`; E2E covers reciprocal `Quero jogar`. |
| DISC-02 | Live session polling route, push opt-in UI, service worker and notification use case. |
| DISC-03 | Phase 3 E2E covers surprise recommendation as a Discovery entry point. |
| DISC-04 | Phase 3 E2E and accessibility specs cover the three-question mood quiz path. |
| DISC-05 | Autocomplete remains covered by search route/UI tests and Phase 3 E2E. |
| DISC-06 | Discovery filters preserve estimated-time filtering and browser coverage. |
| DISC-07 | Common platform filtering stays wired through Discovery deck filters. |
| DISC-08 | Coop type, mood, year, genre and rarity filters remain in Discovery browser coverage. |
| DISC-09 | Free/Game Pass availability filter remains in Discovery browser coverage. |
| DISC-10 | Cold-start tag-similarity recommendations remain covered by existing Discovery tests. |
| DISC-11 | Collaborative influence thresholds remain covered by existing Discovery tests. |
| DISC-12 | Library handoff is covered in UI/E2E and remains limited to Wishlist, Jogando and Pausado in Phase 3. |

## Verification

- `pnpm install` - passed; workspace already up to date.
- `pnpm --filter @queue/web test -- discovery-push` - passed, 5 tests.
- `pnpm verify` - passed after auto-fix; includes `pnpm check:secrets`, lint, architecture, typecheck, web unit tests and integration test runner.
- `pnpm --filter @queue/web test` - passed through `pnpm verify`, 17 files and 148 tests.
- `pnpm --filter @queue/web typecheck` - passed through `pnpm verify`.
- `pnpm check:architecture` - passed through `pnpm verify`.
- `pnpm check:secrets` - passed through `pnpm verify`; 137 source files and 22 client bundle files checked.
- `pnpm --filter @queue/db test:integration -- discovery` - explicit skip; `TEST_DATABASE_URL` is not configured, 2 files and 7 tests skipped.
- `pnpm --filter @queue/web test:e2e -- tests/phase-3-e2e.spec.ts` - explicit skip; missing `E2E_BASE_URL`, ready duo credentials, other-duo credentials and `E2E_PHASE3_DISCOVERY_QUERY`, 5 tests skipped.
- `pnpm --filter @queue/web test:e2e -- tests/accessibility.spec.ts` - explicit skip; missing E2E URL and fixture credentials, 15 tests skipped.

Skipped external tests are release follow-ups, not passes.

## Boundary Checks

- Future phase scan found no Discovery source imports/entities for roulette draw history, play session tables, checkpoints, scheduled sessions, game reviews or Hall da Moral. Test-only occurrences are negative assertions.
- Zerado/Dropado appear only as disabled or status-display states; active double-confirmation remains Phase 4 scope.
- RAWG/source/freshness remains visible through `DiscoverySourceMetadata` and `sourceMeta` propagation.
- `VAPID_PRIVATE_KEY` appears only in `apps/web/src/modules/discovery/infrastructure/push-service.ts`, which imports `server-only`.
- Client code can request only public VAPID config and browser-owned subscription material is POSTed same-origin without rendering or logging it.

## Decisions Made

- Used explicit push opt-in instead of automatic permission prompts so Discovery remains contextual and accessible.
- Kept push subscription reads owner-scoped under RLS by reading each match member's subscriptions through that member's app-user transaction.
- Kept live state on short polling rather than WebSocket because the phase requires reliable shared updates without adding persistent socket infrastructure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added explicit opt-in UI and service worker**
- **Found during:** Task 1
- **Issue:** The plan listed push server files but a compliant Web Push flow needs browser registration and a service worker, otherwise permission would have no user-controlled path.
- **Fix:** Added `push-opt-in-button.tsx`, `discovery-push-sw.js` and styling in the live panel.
- **Files modified:** `apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx`, `apps/web/public/discovery-push-sw.js`, `apps/web/src/app/globals.css`
- **Verification:** `pnpm --filter @queue/web test -- discovery-push`, `pnpm check:secrets`, `pnpm --filter @queue/web typecheck`
- **Committed in:** `8062310`

**2. [Rule 2 - Security] Preserved owner-only RLS for push subscription delivery**
- **Found during:** Task 1
- **Issue:** Match notifications need both members' enabled subscriptions, but endpoint/auth/p256dh material must remain readable only by the owning member.
- **Fix:** `getEnabledPushSubscriptionsForMatch` derives the two member IDs from the match and reads each subscription under that member's transaction context.
- **Files modified:** `apps/web/src/modules/discovery/infrastructure/discovery-repository.ts`
- **Verification:** `pnpm --filter @queue/web test -- discovery-push`, `pnpm --filter @queue/web typecheck`
- **Committed in:** `8062310`

**3. [Rule 3 - Blocking] Added TypeScript types for Web Push**
- **Found during:** Task 1
- **Issue:** `web-push` required type declarations for strict TypeScript compilation.
- **Fix:** Added `@types/web-push` to `@queue/web` dev dependencies.
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @queue/web typecheck`
- **Committed in:** `8062310`

**4. [Rule 2 - Missing Critical] Documented Phase 3 E2E fixture variables**
- **Found during:** Task 3
- **Issue:** Environment-dependent E2E specs needed explicit fixture names to skip honestly and be runnable later.
- **Fix:** Added ready partner, other-duo and discovery query fixture variables to `.env.example`.
- **Files modified:** `.env.example`
- **Verification:** `pnpm --filter @queue/web test:e2e -- tests/phase-3-e2e.spec.ts`
- **Committed in:** `d05075a`

**5. [Rule 1 - Bug] Removed unused recommendation result import**
- **Found during:** Task 4 final verification
- **Issue:** `pnpm verify` failed lint because `DiscoveryRecommendationResult` was imported but unused.
- **Fix:** Removed the unused import.
- **Files modified:** `apps/web/src/modules/discovery/application/ports.ts`
- **Verification:** `pnpm verify`
- **Committed in:** `b24528f`

---

**Total deviations:** 5 auto-fixed (1 bug, 2 missing critical functionality, 1 security requirement, 1 blocking issue)
**Impact on plan:** All auto-fixes were required for correctness, security or verifiability. No future-phase scope was added.

## Issues Encountered

- `pnpm verify` initially failed on an unused import; fixed in `b24528f` and the gate passed afterward.
- Database integration and browser E2E gates remain environment-dependent in this run. They are documented in `03-04-USER-SETUP.md` and must run with Neon/test fixtures before release sign-off.

## User Setup Required

External setup is required for push secrets and full integration/browser verification. See [03-04-USER-SETUP.md](./03-04-USER-SETUP.md).

## Known Stubs

None. Stub scan found only expected `.env.example` placeholders, input placeholders and real UI states such as `quiz-preview`; no mock/empty data source prevents the plan goal.

## Auth Gates

None.

## Self-Check: PASSED

- Found `.planning/phases/03-descoberta-e-matches/03-04-SUMMARY.md`.
- Found `.planning/phases/03-descoberta-e-matches/03-04-USER-SETUP.md`.
- Found task commits `8062310`, `5e4ea43`, `d05075a` and `b24528f` in git history.
- Final docs metadata commit will include this summary, user setup, STATE and ROADMAP updates.

## Next Phase Readiness

Phase 4 can consume a Discovery handoff that remains limited to Wishlist, Jogando and Pausado, plus Match Live push infrastructure that can be reused for scheduled-session reminders after SAFE-01/SAFE-02 are implemented. Release verification still needs configured `TEST_DATABASE_URL` and E2E fixtures to convert the explicit skips into executed evidence.

---

*Phase: 03-descoberta-e-matches*
*Completed: 2026-06-04*
