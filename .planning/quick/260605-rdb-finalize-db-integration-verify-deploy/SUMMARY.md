---
quick_id: 260605-rdb
slug: finalize-db-integration-verify-deploy
status: complete
completed: 2026-06-05T03:01:30.000Z
---

# Summary

Updated root `pnpm verify` so Turbo runs through `scripts/with-env-local.mjs` and receives the configured root `.env.local` `TEST_DATABASE_URL`. This makes `@queue/db` integration tests run as real database tests instead of explicit setup skips.

## Verification

- `pnpm test:integration` - passed; `@queue/db` ran 12 integration test files and 32 tests with 0 skips.
- `pnpm verify` - passed; `@queue/db:test:integration` again ran 12 files and 32 tests with 0 skips.

## Notes

- The remaining Phase 03.3 blocker is authenticated browser/performance fixture evidence, not DB integration setup.
- The `pg` SSL mode warning remains informational for the current driver version and did not fail the suite.
