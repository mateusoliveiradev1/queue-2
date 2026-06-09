---
phase: 06
slug: roleta-e-economia
status: executing
nyquist_compliant: true
wave_0_complete: executed
wave_0_plan: 06-00-PLAN.md
created: 2026-06-08
revised: 2026-06-09
---

# Phase 06 - Validation Strategy

Per-phase validation contract for feedback sampling during execution. Nyquist compliance is satisfied because every required test/gate scaffold was assigned to `06-00-PLAN.md` and later filled by the Phase 6 execution plans.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest, Playwright, packages/db integration tests |
| Config file | `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `packages/db/vitest.integration.config.ts` |
| Quick run command | `pnpm --filter @queue/web test -- roulette` |
| Full suite command | `pnpm phase:6:gate` |
| Feedback latency target | 180 seconds for focused checks; DB/browser evidence may close at phase gate |

## Wave 0 Plan Mapping

| Wave 0 Requirement | Planned In | Execution Status | Purpose |
|---|---|---|---|
| `apps/web/tests/roulette-domain.test.ts` | `06-00-PLAN.md` Task 1 | executed | Policy coverage for eligibility, weights, pity, boost, cooldown and 60-slot reel. |
| `apps/web/tests/roulette-application.test.ts` | `06-00-PLAN.md` Task 1 | executed | Use case coverage for start/resume/lock/discard/refund. |
| `packages/db/tests/roulette-migrations.test.ts` | `06-00-PLAN.md` Task 1 | executed | Schema, constraints and empty-db upgrade coverage. |
| `packages/db/tests/roulette-rls.test.ts` | `06-00-PLAN.md` Task 1 | executed | Forced RLS and cross-duo denial coverage. |
| `packages/db/tests/roulette-concurrency.test.ts` | `06-00-PLAN.md` Task 1 | executed | One active round and exactly-once boost/pity/history coverage. |
| `apps/web/tests/roulette-ui.test.tsx` | `06-00-PLAN.md` Task 2 | executed | Route component, reduced-motion, audio and result UI coverage. |
| `apps/web/tests/phase-6-e2e.spec.ts` | `06-00-PLAN.md` Task 2 | executed | Two-member browser flow and other-duo denial coverage. |
| `scripts/roulette-economy-simulation.mjs` | `06-00-PLAN.md` Task 3 | executed | Deterministic base/boost/pity/cooldown/weekend simulation coverage. |
| `scripts/phase-6-gate.mjs` | `06-00-PLAN.md` Task 3 | executed | Final phase gate command with explicit external blockers and evidence artifacts. |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Wave 0 Status |
|---|---|---:|---|---|---|---|---|---|
| 06-00-01 | 00 | 0 | ROUL-02, ROUL-06, ROUL-07, ROUL-08, ROUL-10, SAFE-06 | T-06-00-01 | Domain, DB and concurrency tests exist before implementation. | unit + db | `pnpm --filter @queue/web test -- roulette-domain && pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency` | executed |
| 06-00-02 | 00 | 0 | ROUL-01, ROUL-03, ROUL-04, ROUL-05, ROUL-09 | T-06-00-02 | UI and E2E tests exist before route/handoff implementation. | component + e2e | `pnpm --filter @queue/web test -- roulette-ui && pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` | executed |
| 06-00-03 | 00 | 0 | ROUL-01..ROUL-10, SAFE-06 | T-06-00-03 | Gate and simulation scaffolds exist before closeout. | gate | `node scripts/roulette-economy-simulation.mjs && pnpm phase:6:gate` | executed |
| 06-01-01 | 01 | 1 | ROUL-02, ROUL-06, ROUL-07, ROUL-08, ROUL-10, SAFE-06 | T-06-01-01 | RLS and DB invariants protect result/economy facts. | db | `pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency` | depends on 06-00 |
| 06-02-01 | 02 | 1 | ROUL-01, ROUL-02, ROUL-06, ROUL-07, ROUL-08, ROUL-10 | T-06-02-01 | Pure policies keep result/economy authority outside UI. | unit | `pnpm --filter @queue/web test -- roulette-domain` | depends on 06-00 |
| 06-03-01 | 03 | 2 | ROUL-02, ROUL-06, ROUL-07, ROUL-08, ROUL-10, SAFE-06 | T-06-03-01 | Concurrent starts converge to one persisted round and one cost/history effect. | unit + db | `pnpm --filter @queue/web test -- roulette-application && pnpm --filter @queue/db test:integration -- roulette-concurrency` | depends on 06-00 |
| 06-04-01 | 04 | 3 | ROUL-01, ROUL-02 | T-06-04-01 | Route actions validate session and ignore client-owned result/economy facts. | component | `pnpm --filter @queue/web test -- roulette-ui` | depends on 06-00 |
| 06-05-01 | 05 | 4 | ROUL-01, ROUL-03, ROUL-04, ROUL-05 | T-06-05-01 | Browser renders persisted result with accessible motion/audio alternatives. | component + e2e | `pnpm --filter @queue/web test -- roulette-ui && pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` | depends on 06-00 |
| 06-06-01 | 06 | 3 | ROUL-09, ROUL-10, SAFE-06 | T-06-06-01 | Existing Play replacement policy is reused unchanged; no automatic pause. | unit | `pnpm --filter @queue/web test -- play-application` | depends on 06-00 |
| 06-07-01 | 07 | 4 | ROUL-09, ROUL-10, SAFE-06 | T-06-07-01 | Lock/discard resolves invitations once and writes audit history. | unit | `pnpm --filter @queue/web test -- roulette-application` | depends on 06-00 |
| 06-08-01 | 08 | 5 | ROUL-09, ROUL-10, SAFE-06 | T-06-08-01 | Route/UI/dashboard/notifications consume authoritative lock/discard results. | unit + e2e | `pnpm --filter @queue/web test -- roulette-ui roulette-application play-application && pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` | depends on 06-00 |
| 06-09-01 | 09 | 6 | ROUL-01..ROUL-10, SAFE-06 | T-06-09-01 | Focused tests and simulation cover every requirement and D-ID. | unit + db + e2e + simulation | `pnpm --filter @queue/web test -- roulette-domain roulette-application roulette-ui && pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency && node scripts/roulette-economy-simulation.mjs` | depends on 06-00 |
| 06-10-01 | 10 | 7 | ROUL-01..ROUL-10, SAFE-06 | T-06-10-01 | Gate writes honest local pass/fail and external blocker evidence. | gate | `pnpm phase:6:gate` | depends on 06-00 |
| 06-11-01 | 11 | 8 | ROUL-01..ROUL-10, SAFE-06 | T-06-11-01 | Final execution closes coverage or records exact blockers. | gate | `pnpm phase:6:gate` | depends on 06-00 |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio feel and editorial cadence | ROUL-03, ROUL-04 | Automated tests can prove controls and duration, not taste. | Run browser flow with audio on/off and verify tick/drumroll/fanfare are opt-in, restrained and muteable. |
| Visual polish of Legendary particles/seal | ROUL-05 | Pixel checks can catch absence/overlap, but final polish is product judgment. | Capture desktop/mobile screenshots for common and Legendary results with normal and reduced motion. |
| Economy number tuning evidence | ROUL-06, ROUL-07, ROUL-08 | Product acceptance depends on simulation output readability. | Review `06-ECONOMY-SIMULATION.md` generated by `scripts/roulette-economy-simulation.mjs`. |

## Validation Sign-Off

- [x] All Wave 0 requirements are assigned to `06-00-PLAN.md`.
- [x] Every implementation plan references automated verification commands.
- [x] Sampling continuity has no three consecutive tasks without automated verify.
- [x] No watch-mode flags are specified.
- [x] Research open questions have selected answers in `06-RESEARCH.md`.
- [x] `nyquist_compliant: true` reflects executed Wave 0 scaffolds and completed focused coverage.

**Approval:** Wave 0 files were created by `06-00-PLAN.md`; Phase 6 gate evidence is generated by `06-10-PLAN.md`.
