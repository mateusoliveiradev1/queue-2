---
phase: 06-roleta-e-economia
artifact: user-setup
generated: 2026-06-09T17:28:02.261Z
result: BLOCKED - missing external evidence
---

# Phase 6 User Setup

Use this setup before treating Phase 6 database, browser or migration evidence as complete. Missing variables are blockers, not passing evidence. Secret values are never written to this artifact.

## Database And Migration Evidence

| Variable | Status | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | missing | Direct test/integration database connection for `drizzle:generate` and `drizzle:migrate`; the gate maps it to `DIRECT_DATABASE_URL` for Drizzle Kit. |
| `TEST_DATABASE_URL` | configured | Isolated Neon/Postgres branch for roulette migration, RLS, concurrency and performance-hot-path evidence. |

## Authenticated E2E Fixtures

| Variable | Status | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | configured | Local or deployed app URL for browser checks. |
| `E2E_READY_USER_EMAIL` | configured | Ready duo member 1 credentials. |
| `E2E_READY_USER_PASSWORD` | configured | Ready duo member 1 credentials. |
| `E2E_READY_PARTNER_EMAIL` | configured | Ready duo member 2 credentials. |
| `E2E_READY_PARTNER_PASSWORD` | configured | Ready duo member 2 credentials. |
| `E2E_OTHER_DUO_USER_EMAIL` | configured | Different-duo actor for isolation checks. |
| `E2E_OTHER_DUO_USER_PASSWORD` | configured | Different-duo actor for isolation checks. |
| `E2E_PHASE6_ELIGIBLE_SLUGS` | missing | Comma-separated Wishlist/Pausado slugs eligible for the ready duo roulette. |

Fixture expectations:

- `E2E_READY_USER_*` and `E2E_READY_PARTNER_*` must belong to exactly the same ready duo.
- `E2E_OTHER_DUO_USER_*` must belong to a different duo and must not see the ready duo roulette state.
- `E2E_PHASE6_ELIGIBLE_SLUGS` must list comma-separated Wishlist/Pausado game slugs for the ready duo.
- The ready duo needs enough eligible games to satisfy ROUL-01 and at least one scenario with a pending result for lock/discard browser evidence.

## Verification Commands

```bash
pnpm phase:6:gate
node --experimental-strip-types scripts/performance-explain.ts --phase=6
pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency performance-hot-paths
pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts tests/accessibility.spec.ts
```

## Missing Variables

### Database

- DATABASE_URL

### Browser

- E2E_PHASE6_ELIGIBLE_SLUGS

## Result: BLOCKED - missing external evidence
