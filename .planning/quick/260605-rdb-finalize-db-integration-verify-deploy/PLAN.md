---
quick_id: 260605-rdb
slug: finalize-db-integration-verify-deploy
status: complete
created: 2026-06-05T03:00:52.000Z
---

# Finalize DB Integration Verify And Deploy

## Goal

Ensure `pnpm verify` runs DB integration tests with the configured root `.env.local` `TEST_DATABASE_URL`, then commit, push and deploy the completed work.

## Tasks

- Confirm DB integration tests run with real `TEST_DATABASE_URL` evidence instead of setup skips.
- Update the verification command so future `pnpm verify` runs load `.env.local` for Turbo integration tasks.
- Run `pnpm verify`.
- Commit, push and deploy after verification passes.
