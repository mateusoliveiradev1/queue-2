# Phase 01 Plan 02: User Setup Required

**Generated:** 2026-06-03
**Phase:** 01-fundacao-modular-marca-auth-e-dupla
**Status:** Complete for Phase 1 gate; production restore rehearsal remains before launch

Complete these items for Neon-backed migrations and integration tests to run against real database branches. The implementation and test harness are in place; these items require access to the Neon Console and real connection strings.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [x] | `DATABASE_URL` | Neon Console -> Connect -> pooled app runtime connection string for development | `.env.local` |
| [x] | `DIRECT_DATABASE_URL` | Neon Console -> Connect -> direct migrator connection string for migrations | `.env.local` |
| [x] | `TEST_DATABASE_URL` | Neon Console -> preview/test branch direct connection string | `.env.local` or CI secret |

## Dashboard Configuration

- [x] **Create or identify separate Neon branches**
  - Location: Neon Console -> Project -> Branches
  - Required branches: development, preview/test and production
  - Notes: Preview/test must be isolated from production and safe for integration tests.

- [x] **Create least-privileged database credentials**
  - Location: Neon Console -> Project -> Roles or SQL migration flow
  - Required roles: `queue2_migrator`, `queue2_app_runtime`, `queue2_worker`, `queue2_readonly`
  - Notes: The runtime role must not have `BYPASSRLS`, schema ownership or schema `CREATE` privileges.

- [ ] **Configure production restore window before launch**
  - Location: Neon Console -> Settings -> Instant restore
  - Notes: Pick a history window appropriate for the selected Neon plan and record the rehearsal evidence.

## Verification

After completing setup, verify with:

```bash
pnpm --filter @queue/db typecheck
pnpm --filter @queue/db test:integration
pnpm verify
```

Expected results:

- Typecheck passes.
- Integration tests run against `TEST_DATABASE_URL` instead of skipping.
- Migration, RLS isolation and pairing concurrency tests pass.
- `pnpm phase:1:gate` passes with no skipped checks.

---

**Production launch remains blocked until:** configure/confirm the restore window and complete the `packages/db/RESTORE.md` rehearsal evidence.
