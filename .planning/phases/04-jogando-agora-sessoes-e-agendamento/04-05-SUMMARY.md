---
phase: "04-jogando-agora-sessoes-e-agendamento"
plan: "05"
subsystem: play
tags: [scheduling, reminders, notifications, web-push, nextjs, postgres]
requires:
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-01 play persistence foundation"
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-03 sessions and progress flows"
provides:
  - "Scheduled session create/update/cancel and attendance confirmation flows"
  - "30-minute reminder job enqueueing, protected runner route and local trigger script"
  - "Product web push opt-in/disable flow using server-only VAPID material"
  - "Central da Dupla operational notification surface in the authenticated shell"
affects: [play, game-detail, duo-settings, notifications, jobs, product-push]
requirements-completed:
  - SESS-11
  - SESS-12
  - SESS-13
  - SESS-14
  - SAFE-01
  - SAFE-02
  - SAFE-04
duration: 45m
completed: 2026-06-05
---

# Phase 04 Plan 05: Scheduling, Reminders and Central Summary

**The duo can now schedule future sessions, confirm attendance and receive operational reminders without turning Central da Dupla into chat or social scope.**

## Accomplishments

- Added scheduled session use cases for current `Jogando` games, using duo timezone input, UTC persistence and 30-minute reminder due timestamps.
- Added attendance confirmation with one confirmation per member and one-time 100 XP award after both members confirm.
- Added a `CRON_SECRET`-protected play reminder route plus `pnpm play:reminders` local trigger script.
- Added retryable reminder push delivery: Central notices are emitted on the first visible attempt, while push failures keep the job retryable without duplicating visible effects.
- Added product push registration/disable API, server-only VAPID push adapter, service worker and explicit user-action opt-in UI.
- Added Central da Dupla to authenticated app surfaces with unread badge and Phase 4 operational notification items.

## Task Commit

1. **Tasks 1-3: Scheduling, reminder jobs, push preferences and Central da Dupla** - `e9722dc` (`feat(04-05): add play scheduling and notifications`)

## Files Created/Modified

- `apps/web/src/modules/play/application/schedule-play-session.ts` - Scheduled session create/update/cancel use cases and timezone parsing.
- `apps/web/src/modules/play/application/confirm-scheduled-session.ts` - Attendance confirmation and one-time scheduled-session XP effect.
- `apps/web/src/modules/play/application/run-reminder-jobs.ts` - Bounded reminder processing, stale-job detection, push retry behavior and visible-effect guards.
- `apps/web/src/modules/play/application/register-product-push.ts` - Product push registration and disable validation.
- `apps/web/src/modules/play/application/get-duo-notifications.ts` - Central da Dupla read use case.
- `apps/web/src/modules/play/infrastructure/play-repository.ts` - Scheduled sessions, attendance, notifications, push subscriptions and reminder job repository operations.
- `apps/web/src/modules/play/infrastructure/push-service.ts` - Server-only VAPID web-push adapter with redacted failure logs.
- `apps/web/src/app/api/jobs/play/reminders/route.ts`, `scripts/play-reminders.ts` - Protected job endpoint and local trigger.
- `apps/web/src/app/api/play/notifications/route.ts`, `apps/web/public/product-push-sw.js` - Product push API and service worker.
- `apps/web/src/modules/play/presentation/*.tsx` - Scheduling form, notification center and push preferences UI.
- `apps/web/src/app/app/**/*.tsx`, `apps/web/src/components/app-shell.tsx`, `apps/web/src/app/globals.css` - App composition and styling.
- `apps/web/tests/play-scheduling.test.ts`, `apps/web/tests/play-reminder-jobs.test.ts`, `apps/web/tests/play-notifications-ui.test.tsx` - New focused regression coverage.

## Decisions Made

- Scheduling reads the duo timezone server-side and stores the scheduled start as UTC plus a timezone snapshot for display.
- Reminder job keys include both scheduled session id and exact reminder due timestamp; stale jobs complete silently when a session is rescheduled or cancelled.
- The play reminder claim query filters `job_type = 'play-session-reminder'` so this endpoint cannot claim unrelated scheduled job types.
- `vercel.json` was not changed because exact 30-minute reminders should not be promised without a compatible runner frequency; the endpoint and local script are ready behind `CRON_SECRET`.
- Push opt-in is only triggered by explicit user action. Disabling push affects the browser subscription only; schedules and Central da Dupla continue to work.
- Central da Dupla remains an operational notification surface for Phase 4 events, not chat, comments, mentions or broad preference management.

## Deviations from Plan

- `vercel.json` was not configured for play reminders because the current deployment plan cannot honestly guarantee minute-level reminder precision. The UI and summary record the runner readiness requirement instead.
- Browser E2E coverage was not expanded for scheduling/push because the existing Phase 4 suite still skips before assertions without authenticated ready-duo fixtures and game slugs.

**Total deviations:** 2 environment/operations-gated items.
**Impact on plan:** Product code, unit/UI coverage and protected job endpoint are complete; exact delivery evidence remains blocked by scheduler and fixture setup.

## Issues Encountered

- `TEST_DATABASE_URL` is not configured locally, so play DB integration coverage remains an explicit skip.
- Phase 4 E2E fixtures are not configured, so `tests/phase-4-e2e.spec.ts` skipped with explicit missing variable output.
- The reminder trigger script intentionally fails without `CRON_SECRET`; this verified the package script path and guard without sending a request.

## Verification

- `pnpm lint` - passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm --filter @queue/web test -- play-application play-sessions play-terminal-status play-timeline play-progress-ui play-scheduling play-reminder-jobs play-notifications-ui discovery-push` - passed, 47 tests.
- `pnpm check:architecture` - passed.
- `pnpm check:secrets` - passed.
- `git diff --check` - passed with Windows CRLF warnings only.
- `pnpm --filter @queue/db test:integration -- play-concurrency` - skipped 3 tests because `TEST_DATABASE_URL` is not configured.
- `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts` - skipped 3 tests because Phase 4 E2E fixture environment variables are missing.
- `pnpm play:reminders` - reached the expected missing-`CRON_SECRET` guard.

## User Setup Required

- Configure `CRON_SECRET` and a compatible scheduler/runner before claiming exact 30-minute reminder delivery.
- Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` before real browser push delivery.
- Provide `TEST_DATABASE_URL`, `E2E_BASE_URL`, ready duo credentials, partner credentials, other-duo credentials, `E2E_PHASE4_PRINCIPAL_SLUG` and `E2E_PHASE4_SECONDARY_SLUG` for integration/browser evidence.

## Next Phase Readiness

Plan 04-06 can focus on final Phase 4 gate evidence, security/performance review and explicit reminder readiness status.

---
*Phase: 04-jogando-agora-sessoes-e-agendamento*
*Completed: 2026-06-05*
