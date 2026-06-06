---
phase: 05-gamificacao-coletiva
plan: "10"
subsystem: security
tags: [hmac, server-actions, redirects, reward-feedback, playwright]
requires:
  - phase: 05-03
    provides: RewardToast and server-derived reward view models
  - phase: 05-06
    provides: Phase 5 security and browser gate targets
provides:
  - Five-minute HMAC-signed reward feedback tokens
  - Play reward propagation through validated internal redirects
  - Server-side subject verification before reward toast rendering
  - Negative spoofing and positive terminal reward E2E scenarios
affects: [play-actions, dashboard, game-detail, phase-5-e2e]
tech-stack:
  added: []
  patterns:
    - server-only signed view envelope with opaque user-duo subject
    - internal redirect built from validated game slug
    - query parameters treated as untrusted until server verification
key-files:
  created:
    - apps/web/src/app/app/phase-5-reward-token.ts
    - apps/web/tests/gamification-reward-toast.test.tsx
  modified:
    - apps/web/src/app/app/phase-5-status.ts
    - apps/web/src/app/app/phase-4-actions.ts
    - apps/web/src/app/app/page.tsx
    - apps/web/src/app/app/jogo/[slug]/page.tsx
    - apps/web/tests/gamification-security.test.ts
    - apps/web/tests/phase-5-e2e.spec.ts
key-decisions:
  - "Reward URLs carry only a signed presentation view, never raw user/duo IDs or authoritative projection state."
  - "Only the four Play confirmations that can produce rewards redirect with reward feedback: session, chapter, scheduled attendance and terminal status."
  - "Legacy free-form recompensa values are ignored; the current authenticated user and ready duo must match the token subject."
patterns-established:
  - "Short-lived feedback tokens use domain-separated HMACs for signature and opaque subject."
  - "Server actions preserve authoritative reward summaries but pages consume only verified view models."
requirements-completed: [PLAY-05, GAME-05]
duration: 5min
completed: 2026-06-06
---

# Phase 05 Plan 10: Signed Reward Feedback Summary

**Short-lived, subject-bound reward feedback from authoritative Play mutations without trusting query-string labels.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-06T20:43:00Z
- **Completed:** 2026-06-06T20:48:22Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added a server-only HMAC-SHA-256 reward envelope with a five-minute maximum lifetime, structural validation and constant-time signature/subject comparisons.
- Removed the static reward label map so `?recompensa=level-up` and malformed or cross-subject tokens produce no feedback.
- Preserved rewards from confirmed sessions, chapter completion, scheduled attendance and terminal confirmation, then redirected only to validated game slugs or `/app`.
- Verified tokens after authentication and ready-duo resolution on both dashboard and game-detail pages.
- Reworked Phase 5 E2E coverage to assert spoof rejection and a real terminal reward redirect that remains usable with reduced motion.

## Task Commits

1. **Task 1 RED: Define signed reward token security** - `cc7800f` (test)
2. **Task 1 GREEN: Sign short-lived reward feedback** - `7b6a86c` (feat)
3. **Task 2 RED: Define verified reward toast flow** - `c515462` (test)
4. **Task 2 GREEN: Carry verified rewards through Play redirects** - `bee56f9` (feat)
5. **Task 3: Cover reward spoofing and real redirects** - `f1ae8bd` (test)

**Plan metadata:** recorded in the final docs commit after state updates.

## Verification

- `pnpm --filter @queue/web test -- gamification-reward-toast.test.tsx gamification-security.test.ts` - 2 files / 9 tests passed.
- `pnpm --filter @queue/web test -- gamification-dashboard-ui.test.tsx play-dashboard-ui.test.tsx catalog-library-ui.test.tsx` - 3 files / 19 tests passed.
- `pnpm --filter @queue/web test -- play-security.test.ts performance-metrics.test.ts` - 2 files / 21 tests passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/web check:architecture` - passed.
- `pnpm --filter @queue/web test:e2e -- phase-5-e2e.spec.ts` - command passed with 6 skipped because the authenticated Phase 5 fixtures are not configured.

## Decisions Made

- The token serializes only `RewardToastViewModel`, issue/expiry timestamps, version and an opaque HMAC subject.
- The signature and subject use separate domain prefixes even though both derive from `BETTER_AUTH_SECRET`.
- Redirects always include the mutation state, include `recompensa` only for a visible reward, and never accept an arbitrary return URL from form data.
- Validation remains entirely server-side; the client `RewardToast` receives a verified view and remains presentation-only.

## Deviations from Plan

None. The implementation followed the planned signed-envelope and validated-redirect design.

## Issues Encountered

- The positive browser flow cannot execute locally without `E2E_BASE_URL`, ready/partner/other-duo credentials and the two Phase 5 terminal fixture slugs. The six scenarios are defined and skipped honestly rather than treated as passing evidence.

## User Setup Required

Authenticated browser fixtures remain required as documented in `.planning/phases/05-gamificacao-coletiva/05-USER-SETUP.md`.

## Next Phase Readiness

Reward feedback is no longer forgeable through query labels. Local implementation and regression gates are green; production-like browser evidence remains an external verification blocker.

## Self-Check: PASSED

- Found the server-only HMAC module, Play action wiring, both page verifiers and focused tests.
- Found task commits `cc7800f`, `7b6a86c`, `c515462`, `bee56f9` and `f1ae8bd`.
- Confirmed legacy spoof rejection, token expiry/subject/tamper tests, typecheck and architecture checks.

---
*Phase: 05-gamificacao-coletiva*
*Completed: 2026-06-06*
