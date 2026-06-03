# QUEUE/2 Database Restore Rehearsal

Phase 1 requires a restore strategy that is executable before production launch. Development, preview/test and production must use separate Neon branches. Restore rehearsals never run directly against production data or reuse unsanitized production data in a lower environment.

## Required Branches

- `development`: day-to-day development data.
- `preview-test`: isolated CI, integration test and migration rehearsal data.
- `production`: launch branch with the restore history window selected for the production Neon plan.
- `restore-rehearsal-YYYYMMDD`: disposable branch created only for a recorded rehearsal.

## Neon Restore Rehearsal Checklist

1. Confirm the source is the isolated `preview-test` branch or a sanitized production-derived branch approved for rehearsal.
2. Record the source branch, Neon project, current restore history window and the exact UTC restore point.
3. Create `restore-rehearsal-YYYYMMDD` from the source branch at that restore point.
4. Use the branch's direct migrator connection string as `TEST_DATABASE_URL`. Never use the pooled app runtime URL for migrations.
5. Run `pnpm --filter @queue/db test:integration` and confirm migration, RLS isolation, role privilege and pairing concurrency tests pass without skips.
6. Confirm `queue2_app_runtime` remains non-owner, has no `BYPASSRLS`, cannot create or alter schema objects and is subject to forced RLS.
7. Review hot-query plans on representative data with `EXPLAIN (ANALYZE, BUFFERS)`, including pairing-code lookup and duo membership lookup. Record the indexes used and investigate unexpected sequential scans.
8. Create a disposable restore probe on the rehearsal branch, record its timestamp, then restore the branch to a point before the probe.
9. Confirm the probe is absent after restore, rerun `pnpm --filter @queue/db test:integration`, and verify the app can reconnect using the restored branch.
10. Delete the rehearsal branch only after the evidence record is complete and reviewed.

Example hot-query review:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id
FROM app.pairing_codes
WHERE code = 'Q2K7M9'
  AND revoked_at IS NULL
  AND claimed_at IS NULL
LIMIT 1;

EXPLAIN (ANALYZE, BUFFERS)
SELECT duo_id
FROM app.duo_members
WHERE user_id = 'review-user'
LIMIT 1;
```

## Local Fallback Checklist

This fallback is useful before a Neon project exists, but it does not replace a Neon restore rehearsal before production launch.

1. Create two disposable local Postgres databases: one source and one restore target.
2. Point `TEST_DATABASE_URL` at the source database and run `pnpm --filter @queue/db test:integration`.
3. Seed representative duo, pairing and audit data in the source database.
4. Create a logical backup with `pg_dump` using a reviewed migrator credential.
5. Restore the backup into the empty restore target with `pg_restore`.
6. Point `TEST_DATABASE_URL` at the restore target and rerun the integration suite.
7. Repeat the hot-query `EXPLAIN (ANALYZE, BUFFERS)` review and record any index or plan differences.
8. Delete both disposable local databases after the evidence record is complete.

## Production Restore Notes

- Neon instant restore is point-in-time restore for root branches within the configured history window.
- A restore overwrites the target branch; it is not a merge.
- Existing connections can be interrupted during restore and must reconnect.
- Neon creates a backup branch for the pre-restore state, which should be retained until the incident is reviewed.
- Secret rotation, session revocation and incident communication may still be required after a security-related restore.

## Restore Rehearsal Evidence

Record this evidence before launch:

| Field | Value |
|-------|-------|
| Rehearsal date and operator | |
| Neon project and source branch | |
| Restore target branch | |
| Restore point and history window | |
| Migration files applied | |
| Integration command and result | |
| Runtime role privilege result | |
| RLS and concurrency result | |
| Query plans and indexes reviewed | |
| Restore probe verification | |
| App reconnect verification | |
| Cleanup confirmation | |

Phase 1 treats this document as the runbook and evidence template. A successful recorded rehearsal remains a production launch requirement.
