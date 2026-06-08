---
phase: 06
slug: roleta-e-economia
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, Playwright, packages/db integration tests |
| **Config file** | `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `packages/db/vitest.integration.config.ts` |
| **Quick run command** | `pnpm --filter @queue/web test -- roulette` |
| **Full suite command** | `pnpm verify` plus `pnpm phase:6:gate` after the gate exists |
| **Estimated runtime** | ~120 seconds locally without browser/DB cold starts |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed in the task.
- **After every plan wave:** Run all focused roulette web tests plus relevant DB integration tests when `TEST_DATABASE_URL` is available.
- **Before `$gsd-verify-work`:** `pnpm phase:6:gate` must pass or report explicit external blockers only.
- **Max feedback latency:** 180 seconds for focused checks; browser/DB gate may run at phase close.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ROUL-02, ROUL-06, ROUL-07, ROUL-08, ROUL-10, SAFE-06 | T-06-01 / T-06-02 / T-06-03 | Result, boost, pity and active-round invariants live in DB/domain, not UI | unit + db | `pnpm --filter @queue/web test -- roulette-domain && pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls` | W0 | pending |
| 06-02-01 | 02 | 2 | ROUL-02, ROUL-06, ROUL-07, ROUL-08, ROUL-10, SAFE-06 | T-06-02 / T-06-04 | Concurrent starts converge to one persisted round and one cost/history effect | unit + db | `pnpm --filter @queue/web test -- roulette-application && pnpm --filter @queue/db test:integration -- roulette-concurrency` | W0 | pending |
| 06-03-01 | 03 | 3 | ROUL-01, ROUL-03, ROUL-04, ROUL-05 | T-06-05 | Browser renders persisted result with accessible motion/audio alternatives | component + e2e | `pnpm --filter @queue/web test -- roulette-ui && pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` | W0 | pending |
| 06-04-01 | 04 | 4 | ROUL-09, ROUL-10, SAFE-06 | T-06-06 | Lock/discard resolves the invitation once and respects Play replacement rules | unit + e2e | `pnpm --filter @queue/web test -- roulette-application play-application && pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts` | W0 | pending |
| 06-05-01 | 05 | 5 | ROUL-01..ROUL-10, SAFE-06 | T-06-01..T-06-06 | Phase gate records all evidence and external blockers honestly | gate | `pnpm phase:6:gate` | W0 | pending |

*Status: pending / green / red / blocked.*

---

## Wave 0 Requirements

- [ ] `apps/web/tests/roulette-domain.test.ts` - policy coverage for eligibility, weights, pity, boost, cooldown and 60-slot reel.
- [ ] `apps/web/tests/roulette-application.test.ts` - use case coverage for start/resume/lock/discard/refund.
- [ ] `apps/web/tests/roulette-ui.test.tsx` - route component and reduced-motion/audio controls.
- [ ] `apps/web/tests/phase-6-e2e.spec.ts` - two-member browser flow and other-duo denial.
- [ ] `packages/db/tests/roulette-migrations.test.ts` - schema, constraints and empty-db upgrade.
- [ ] `packages/db/tests/roulette-rls.test.ts` - forced RLS and cross-duo denial.
- [ ] `packages/db/tests/roulette-concurrency.test.ts` - one active round and exactly-once boost/pity/history.
- [ ] `scripts/phase-6-gate.mjs` - deterministic gate with explicit fixture blockers.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio feel and editorial cadence | ROUL-03, ROUL-04 | Automated tests can prove controls and duration, not taste | Run browser flow with audio on/off and verify tick/drumroll/fanfare are opt-in, restrained and muteable. |
| Visual polish of Legendary particles/seal | ROUL-05 | Pixel checks can catch absence/overlap, but final polish is product judgment | Capture desktop/mobile screenshots for common and Legendary results with normal and reduced motion. |
| Economy number tuning | ROUL-06, ROUL-07, ROUL-08 | Exact weights/cap need product review after simulation | Review simulation output for base/boost/pity/cooldown/weekend distribution before locking constants. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all MISSING references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 180s for focused checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 and plan map are complete.

**Approval:** pending

