---
phase: 04
plan: 06
artifact: user-setup
updated: 2026-06-05
---

# Phase 4 User Setup

This file lists the exact external setup required to turn Phase 4 blocked evidence into passing evidence. Do not place secret values in planning files.

## Database Integration

Required:

- `TEST_DATABASE_URL`

Use an isolated Neon branch or local Postgres database. The Phase 4 DB checks apply migrations from empty state and run:

- `pnpm --filter @queue/db test:integration -- play-rls play-concurrency performance-hot-paths`

The database evidence remains blocked until this value exists.

## Browser E2E and Accessibility

Required:

- `E2E_BASE_URL`
- `E2E_READY_USER_EMAIL`
- `E2E_READY_USER_PASSWORD`
- `E2E_READY_PARTNER_EMAIL`
- `E2E_READY_PARTNER_PASSWORD`
- `E2E_OTHER_DUO_USER_EMAIL`
- `E2E_OTHER_DUO_USER_PASSWORD`
- `E2E_PHASE4_PRINCIPAL_SLUG`
- `E2E_PHASE4_SECONDARY_SLUG`

Fixture meaning:

- Ready user and ready partner must belong to the same verified duo.
- Other-duo user must be verified and belong to a different duo.
- Principal slug must be the current Principal `Jogando` game for the ready duo.
- Secondary slug must be a current secondary `Jogando` game for the ready duo.

Run:

- `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts tests/accessibility.spec.ts`

## Reminder Runner

Required:

- `CRON_SECRET`
- A scheduler or runner that calls `/api/jobs/play/reminders` with `Authorization: Bearer <CRON_SECRET>`

Optional local trigger:

- `pnpm play:reminders -- --url http://localhost:3000/api/jobs/play/reminders`

Exact 30-minute reminder copy is allowed only when `04-REMINDER-READINESS.md` says `Result: PASSED`.

## Product Push

Required for real push delivery:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

The browser receives only `VAPID_PUBLIC_KEY`. The private key and subject remain server-only.

## Full Gate

Run:

- `pnpm phase:4:gate`

Expected current local result without external fixtures:

- Local type/security/unit/architecture checks should pass.
- DB integration and browser evidence should be reported as blocked with exact missing variable names.
- Reminder readiness should be blocked until cron/push environment and compatible runner frequency are configured.
