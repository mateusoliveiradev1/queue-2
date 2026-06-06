---
phase: 05-gamificacao-coletiva
artifact: user-setup
status: Incomplete
generated: 2026-06-06T20:39:24.657Z
---

# Phase 5 User Setup

Use this setup before treating Phase 5 browser, database, job or production evidence as passed. Missing values must be reported as blockers, not hidden skips.

## Browser And UAT Fixtures

| Variable | Status | Purpose |
|----------|--------|---------|
| `E2E_BASE_URL` | configured | Base URL for the app under browser test. |
| `E2E_READY_USER_EMAIL` | configured | First member of a ready duo with Phase 5 state. |
| `E2E_READY_USER_PASSWORD` | configured | First member of a ready duo with Phase 5 state. |
| `E2E_READY_PARTNER_EMAIL` | configured | Second member of the same ready duo. |
| `E2E_READY_PARTNER_PASSWORD` | configured | Second member of the same ready duo. |
| `E2E_OTHER_DUO_USER_EMAIL` | configured | Different-duo actor for isolation checks. |
| `E2E_OTHER_DUO_USER_PASSWORD` | configured | Different-duo actor for isolation checks. |
| `E2E_PHASE5_ZERADO_SLUG` | missing | Jogando game prepared for partner-confirmed Zerado reward flow. |
| `E2E_PHASE5_DROPADO_SLUG` | missing | Jogando game prepared for neutral Dropado confirmation flow. |

Fixture expectations:

- `E2E_READY_USER_*` and `E2E_READY_PARTNER_*` must belong to exactly the same duo.
- `E2E_OTHER_DUO_USER_*` must belong to a different duo and must not have access to the Phase 5 fixture games.
- `E2E_PHASE5_ZERADO_SLUG` and `E2E_PHASE5_DROPADO_SLUG` must be in `Jogando` for the ready duo before the browser run.
- The two game slugs should be separate records so the `Zerado` and `Dropado` tests do not fight over terminal state.

## Database Evidence

| Variable | Status | Purpose |
|----------|--------|---------|
| `TEST_DATABASE_URL` | configured | Isolated Neon/Postgres database for migration, RLS and concurrency tests. |
| `WORKER_DATABASE_URL` | configured | Pooled connection string authenticated as the least-privileged queue2_worker role. |
| `DIRECT_DATABASE_URL` | configured | Direct owner/migrator connection used only to apply reviewed migrations. |

Worker credential setup:

1. Apply reviewed migrations with `DIRECT_DATABASE_URL`; never use the web runtime connection.
2. In Neon Console, open Roles and reset/provision the password for `queue2_worker` after the role exists.
3. Copy the pooled `queue2_worker` connection string into `WORKER_DATABASE_URL` for the app/cron environment.
4. Verify the worker can read readiness columns and `ops.scheduled_jobs`, but cannot write `app.duos` or `app.duo_members`.

## Job And Cron Evidence

| Variable | Status | Purpose |
|----------|--------|---------|
| `CRON_SECRET` | missing | Bearer secret for gamification maintenance route. |
| `GAMIFICATION_RUNNER_FREQUENCY_MINUTES` | missing | Operational cadence evidence for quest and streak jobs. |

## Verification Commands

```bash
pnpm --filter @queue/web test:e2e -- tests/phase-5-e2e.spec.ts tests/accessibility.spec.ts
pnpm --filter @queue/db test:integration -- gamification-migrations gamification-rls gamification-concurrency performance-hot-paths
pnpm --filter @queue/db drizzle:migrate
gsd-sdk query verify.schema-drift 05
node --experimental-strip-types scripts/performance-explain.ts --phase=5
pnpm phase:5:gate
```

## Missing Variables

### Browser

- E2E_PHASE5_ZERADO_SLUG
- E2E_PHASE5_DROPADO_SLUG

### Database

None.

### Jobs

- CRON_SECRET
- GAMIFICATION_RUNNER_FREQUENCY_MINUTES

## Current Status

Result: BLOCKED - missing external evidence until the variables above are configured and the Phase 5 gate is rerun.
