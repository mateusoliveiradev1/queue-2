---
phase: 05-gamificacao-coletiva
artifact: user-setup
status: Incomplete
---

# Phase 5 User Setup

Use this setup before treating Phase 5 browser, database, job or production evidence as passed. Missing values must be reported as blockers, not hidden skips.

## Browser And UAT Fixtures

Create three authenticated product users backed by real QUEUE/2 data:

| Variable | Purpose |
|----------|---------|
| `E2E_BASE_URL` | Base URL for the local, preview or production app under test. |
| `E2E_READY_USER_EMAIL` | First member of a ready duo with Phase 5 gamification state. |
| `E2E_READY_USER_PASSWORD` | Password for the first ready duo member. |
| `E2E_READY_PARTNER_EMAIL` | Second member of the same ready duo. |
| `E2E_READY_PARTNER_PASSWORD` | Password for the same-duo partner. |
| `E2E_OTHER_DUO_USER_EMAIL` | Member of a different duo for isolation checks. |
| `E2E_OTHER_DUO_USER_PASSWORD` | Password for the other-duo member. |
| `E2E_PHASE5_ZERADO_SLUG` | Jogando game slug prepared for a partner-confirmed `Zerado` flow. |
| `E2E_PHASE5_DROPADO_SLUG` | Jogando game slug prepared for a partner-confirmed `Dropado` neutral-flow check. |

Fixture expectations:

- `E2E_READY_USER_*` and `E2E_READY_PARTNER_*` must belong to exactly the same duo.
- `E2E_OTHER_DUO_USER_*` must belong to a different duo and must not have access to the Phase 5 fixture games.
- `E2E_PHASE5_ZERADO_SLUG` and `E2E_PHASE5_DROPADO_SLUG` must be in `Jogando` for the ready duo before the browser run.
- The two game slugs should be separate records so the `Zerado` and `Dropado` tests do not fight over terminal state.

## Database Evidence

| Variable | Purpose |
|----------|---------|
| `TEST_DATABASE_URL` | Isolated Neon/Postgres test database where migrations can be applied and RLS/concurrency tests can mutate data safely. |

Run the Phase 5 DB targets only against a disposable test branch. If `TEST_DATABASE_URL` is missing, the Phase 5 gate records `BLOCKED - missing TEST_DATABASE_URL`.

## Job And Cron Evidence

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Bearer secret required by `/api/jobs/gamification/maintenance`. |
| `GAMIFICATION_MAINTENANCE_URL` | Optional absolute URL for `pnpm gamification:maintenance`; defaults to local route when omitted. |
| `GAMIFICATION_RUNNER_FREQUENCY_MINUTES` | Optional runner cadence evidence for quest rotation and streak checks. |

The gate does not write secret values to artifacts. It records only whether each variable was present.

## Verification Commands

```bash
pnpm --filter @queue/web test:e2e -- tests/phase-5-e2e.spec.ts tests/accessibility.spec.ts
pnpm --filter @queue/db test:integration -- gamification-rls gamification-concurrency performance-hot-paths
node --experimental-strip-types scripts/performance-explain.ts --phase=5
pnpm phase:5:gate
```

## Current Status

Result: BLOCKED - missing external evidence until the variables above are configured and the Phase 5 gate is rerun.
