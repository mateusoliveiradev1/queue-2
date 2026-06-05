---
phase: "04-jogando-agora-sessoes-e-agendamento"
plan: "03"
subsystem: play
tags: [sessions, progress, chapters, terminal-confirmation, xp, nextjs, postgres]
requires:
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-01 play persistence foundation"
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-02 active Jogando Agora dashboard"
provides:
  - "Live/offline play sessions with duo confirmation gates"
  - "Game detail progress panels for coop time, chapters and subjective percent"
  - "Zerado/Dropado terminal request flow with partner confirmation"
  - "Focused unit and UI regression coverage for Phase 04.3"
affects: [play, game-detail, library-status, performance-metrics]
requirements-completed:
  - PLAY-06
  - PLAY-07
  - PLAY-08
  - PLAY-09
  - PLAY-12
  - PLAY-13
  - SESS-01
  - SESS-02
  - SESS-03
  - SESS-04
  - SESS-05
  - SAFE-04
duration: 30m
completed: 2026-06-05
---

# Phase 04 Plan 03: Sessions, Progress and Terminal Confirmation Summary

**Shared play progress is now confirmation-gated and visible on game detail.**

## Accomplishments

- Added play use cases for live sessions, ending into pending confirmation, duo confirmation, offline `Jogamos Hoje`, subjective percent, chapters and terminal requests.
- Expanded the play repository contract with server-transaction reads/writes for session detail, progress, chapters, terminal requests and idempotent XP awards.
- Replaced the game-detail `Jornada da dupla` placeholder with live session controls, offline presets, progress comparison, chapter controls and `Zerado`/`Dropado` confirmation UI.
- Added safe performance action keys and mutation budgets for session, progress, chapter and terminal mutations.
- Added focused coverage for session lifecycle, terminal confirmation policy and the new play progress UI.

## Task Commit

1. **Tasks 1-4: Sessions, Jogamos Hoje, progress layers, chapters and terminal confirmation** - `ae69f02` (`feat(04-03): add play sessions and progress flows`)

## Files Created/Modified

- `apps/web/src/modules/play/application/start-live-session.ts` - Starts a server-timestamped live session or returns the active-session blocker.
- `apps/web/src/modules/play/application/end-live-session.ts` - Ends live sessions into pending confirmation and emits confirmation notifications.
- `apps/web/src/modules/play/application/confirm-play-session.ts` - Applies progress and live XP only after both duo members confirm.
- `apps/web/src/modules/play/application/log-offline-session.ts` - Creates bounded offline `Jogamos Hoje` sessions pending confirmation.
- `apps/web/src/modules/play/application/update-play-progress.ts` - Stores subjective percent as a bounded independent progress layer.
- `apps/web/src/modules/play/application/manage-play-chapters.ts` - Creates chapters and awards chapter XP once through the award ledger.
- `apps/web/src/modules/play/application/request-terminal-status.ts` - Requests, cancels and confirms `zerado`/`dropado` terminal states.
- `apps/web/src/modules/play/presentation/*.tsx` - New live session, offline, progress, chapter and terminal panels.
- `apps/web/src/app/app/jogo/[slug]/page.tsx` - Composes play detail and mutations through the play public entrypoint.
- `apps/web/src/app/app/phase-4-actions.ts` - Adds authoritative server actions and revalidation for play journey mutations.
- `apps/web/tests/play-sessions.test.ts`, `apps/web/tests/play-progress-ui.test.tsx`, `apps/web/tests/play-terminal-status.test.ts` - New 04-03 regression coverage.

## Decisions Made

- Play remains the owner of session confirmation, progress effects, chapter awards and terminal confirmation. Raw library moves to `zerado`/`dropado` remain locked behind the older `future-confirmation-required` policy.
- The terminal confirmation transaction updates the library row and removes active play roles atomically after partner confirmation. This avoids exposing an unconfirmed public library status move while preserving one transaction for request confirmation and active-queue removal.
- Offline `Jogamos Hoje` records no XP on confirmation in this plan; only live confirmation and chapter completion grant Phase 4 XP.
- Performance telemetry for new play mutations uses allowlisted static action keys and no game, duo or URL labels.

## Deviations from Plan

- `apps/web/tests/phase-4-e2e.spec.ts` was not expanded for live/offline browser flows because the existing Phase 4 E2E suite still lacks authenticated ready-duo fixtures and skips before reaching route assertions.

**Total deviations:** 1 environment-gated browser coverage item.
**Impact on plan:** Product code and unit/UI coverage are complete; real browser evidence remains blocked by named E2E fixture variables.

## Issues Encountered

- Previous subagents hit usage limits, so this plan was completed inline.
- `TEST_DATABASE_URL` is not configured, so play RLS/concurrency integration tests skipped with explicit output.
- Phase 4 E2E fixtures are not configured, so `tests/phase-4-e2e.spec.ts` skipped with explicit missing variable output.

## Verification

- `pnpm --filter @queue/web test -- play-sessions play-progress-ui` - passed, 8 tests.
- `pnpm --filter @queue/web test -- play-terminal-status library-application` - passed, 14 tests.
- `pnpm --filter @queue/web test -- play-sessions play-terminal-status play-progress-ui play-application play-dashboard-ui performance-metrics` - passed, 45 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/db test:integration -- play-concurrency play-rls` - skipped because `TEST_DATABASE_URL` is not configured.
- `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts` - skipped because Phase 4 E2E fixture environment variables are missing.

## User Setup Required

Real browser and database evidence for this plan needs `TEST_DATABASE_URL`, `E2E_BASE_URL`, ready duo credentials, partner credentials, other-duo credentials, `E2E_PHASE4_PRINCIPAL_SLUG` and `E2E_PHASE4_SECONDARY_SLUG`.

## Next Phase Readiness

Plan 04-04 can build timeline, milestones, Momentos and spoiler behavior on top of confirmed session/progress reads now exposed by the play module.

---
*Phase: 04-jogando-agora-sessoes-e-agendamento*
*Completed: 2026-06-05*
