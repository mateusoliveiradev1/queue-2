---
status: complete
completed: 2026-06-03
quick_id: 260603-cra
commit: 9dbf0ba
---

# Quick Task 260603-cra: Automatizar refresh do catalogo - Summary

## Outcome

Catalog refresh now has a production automation path instead of relying on repeated manual commands.

## Changes

- Added `/api/jobs/catalog/refresh`, a protected Node runtime route for Vercel Cron.
- Added a catalog refresh service that runs RAWG sync, reapplies QUEUE/2 curation seeds and validates catalog health.
- Added a catalog health check for published PT-BR descriptions and verified availability rows.
- Added `vercel.json` daily schedule and `pnpm catalog:refresh` for local/debug triggering.
- Documented `CRON_SECRET`, production automation behavior and manual force-run expectations.
- Extended secret scanning to include `CRON_SECRET`.

## Verification

- `pnpm --filter @queue/web test -- catalog-refresh`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check:architecture`
- `pnpm check:secrets`
- `pnpm lint`
- `pnpm test:integration` with explicit DB integration skips because `TEST_DATABASE_URL` is not configured
- `pnpm --filter @queue/web build`
- `pnpm catalog:seed-curation -- --dry-run`

## Notes

- Vercel Cron runs automatically only on production deployments after `CRON_SECRET`, `RAWG_API_KEY` and database env vars are configured.
- Local development still needs a running Next server if `pnpm catalog:refresh` is used to force-trigger the route.
