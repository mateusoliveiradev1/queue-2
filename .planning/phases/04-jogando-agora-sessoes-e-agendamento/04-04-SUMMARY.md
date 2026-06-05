---
phase: "04-jogando-agora-sessoes-e-agendamento"
plan: "04"
subsystem: play
tags: [timeline, milestones, momentos, spoilers, nextjs, postgres]
requires:
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-01 play persistence foundation"
  - phase: "04-jogando-agora-sessoes-e-agendamento"
    provides: "Plan 04-03 sessions and progress flows"
provides:
  - "Game timeline read model for confirmed sessions, chapters, milestones and Momentos"
  - "Deterministic milestone classification with duo timezone and sourced estimate thresholds"
  - "Inline Momentos with optional session association and per-viewer spoiler reveal state"
  - "Game detail timeline UI with focused unit and UI regression coverage"
affects: [play, game-detail, catalog-detail, performance-metrics]
requirements-completed:
  - PLAY-10
  - PLAY-11
  - SESS-06
  - SESS-07
  - SESS-08
  - SESS-09
  - SESS-10
duration: 35m
completed: 2026-06-05
---

# Phase 04 Plan 04: Timeline, Momentos and Spoilers Summary

**Game detail now shows the duo's play journey without turning it into Hall/review scope.**

## Accomplishments

- Added a play timeline read model that merges confirmed sessions, completed chapters, derived milestones and Momentos in chronological order.
- Added pure milestone classification for first session, night session, marathon, sourced 50%/100% estimate thresholds and contextual non-shaming reminders.
- Added Momento creation and spoiler reveal use cases with bounded plain text, same-game session validation and per-viewer reveal rows.
- Rendered a compact Portuguese `Linha do tempo` section on game detail, including a session-aware Momento form and spoiler-safe reveal UI.
- Added safe performance telemetry coverage for the new `play.timeline` action key.

## Task Commit

1. **Tasks 1-3: Timeline read model, Momentos/spoilers and game-detail UI** - `94d34dc` (`feat(04-04): add play timeline and momentos`)

## Files Created/Modified

- `apps/web/src/modules/play/domain/milestone-policy.ts` - Pure milestone classification and Portuguese milestone copy.
- `apps/web/src/modules/play/application/get-game-timeline.ts` - Timeline read use case through the play repository boundary.
- `apps/web/src/modules/play/application/manage-momentos.ts` - Momento create and local spoiler reveal use cases.
- `apps/web/src/modules/play/application/ports.ts` - Timeline, Momento and repository contract types.
- `apps/web/src/modules/play/infrastructure/play-repository.ts` - Bounded timeline/session/chapter/Momento queries and spoiler reveal persistence.
- `apps/web/src/modules/play/presentation/*.tsx` - Timeline, milestone badge, Momento form and spoiler reveal components.
- `apps/web/src/app/app/jogo/[slug]/page.tsx` - Composes timeline read model and actions into game detail.
- `apps/web/src/app/app/phase-4-actions.ts` - Adds timeline server actions and revalidation.
- `apps/web/src/app/globals.css` - Timeline and Momento responsive styling.
- `apps/web/tests/play-timeline.test.ts`, `apps/web/tests/play-timeline-ui.test.tsx` - New regression coverage.

## Decisions Made

- Timeline milestones are derived from authoritative confirmed session facts instead of stored marker rows, keeping display deterministic and idempotent.
- Estimated-time milestones only appear when the catalog detail exposes a sourced available estimate in minutes.
- Spoiler reveal state is local to the viewer through `app.play_spoiler_reveals`; revealing a Momento never changes the partner's view.
- Momentos remain plain React-rendered text with no HTML execution path, and optional session association is validated against the same duo/game.

## Deviations from Plan

- `apps/web/tests/phase-4-e2e.spec.ts` was not expanded for timeline/spoiler browser coverage because the suite still skips before route assertions without authenticated ready-duo fixtures and Phase 4 slugs.

**Total deviations:** 1 environment-gated browser coverage item.
**Impact on plan:** Product code and unit/UI coverage are complete; real browser evidence remains blocked by named E2E fixture variables.

## Issues Encountered

- Previous subagents hit usage limits, so this plan was completed inline.
- Phase 4 E2E fixtures are not configured, so `tests/phase-4-e2e.spec.ts` skipped with explicit missing variable output.

## Verification

- `pnpm --filter @queue/web test -- play-timeline play-timeline-ui play-application performance-metrics` - passed, 36 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm --filter @queue/db typecheck` - passed.
- `pnpm check:architecture` - passed.
- `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts` - skipped 3 tests because Phase 4 E2E fixture environment variables are missing.

## User Setup Required

Real browser evidence for this plan needs `E2E_BASE_URL`, ready duo credentials, partner credentials, other-duo credentials, `E2E_PHASE4_PRINCIPAL_SLUG` and `E2E_PHASE4_SECONDARY_SLUG`.

## Next Phase Readiness

Plan 04-05 can build scheduling, attendance, reminders, product push and Central da Dupla on top of the existing play persistence and notification/job tables.

---
*Phase: 04-jogando-agora-sessoes-e-agendamento*
*Completed: 2026-06-05*
