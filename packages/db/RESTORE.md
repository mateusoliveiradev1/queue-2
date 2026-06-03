# QUEUE/2 Database Restore Rehearsal

Phase 1 requires a restore strategy that can be tested before production launch. Neon branches are the rehearsal mechanism: development, preview/test and production must use separate branches, and restore tests must never run against production data directly.

## Required Branches

- `development`: day-to-day development data.
- `preview-test`: isolated branch for CI, local integration tests and migration rehearsals.
- `production`: launch branch with an appropriate instant-restore history window for the selected Neon plan.

## Rehearsal Procedure

1. In Neon, create a restore rehearsal branch from the branch you want to validate.
2. Use the direct connection string from that branch as `TEST_DATABASE_URL`.
3. Run `pnpm --filter @queue/db test:integration`.
4. Confirm the migration test applies `0001_foundation.sql` and can rerun it as an upgrade placeholder.
5. Confirm the RLS test proves one duo cannot read or write another duo's data under `queue2_app_runtime`.
6. Confirm the pairing concurrency test leaves the duo with exactly two members after simultaneous claims.
7. Delete the rehearsal branch after recording the result.

## Production Restore Notes

- Neon instant restore is point-in-time restore for root branches within the configured history window.
- A restore overwrites the target branch; it is not a merge.
- Existing connections can be interrupted during restore and must reconnect.
- Neon creates a backup branch for the pre-restore state, which should be retained until the incident is reviewed.

## Launch Gate Evidence

Record the rehearsal date, source branch, restore target branch, history window, test command output and cleanup confirmation before launch. Phase 1 treats this document as the runbook hook; a later release gate must attach the actual rehearsal evidence.
