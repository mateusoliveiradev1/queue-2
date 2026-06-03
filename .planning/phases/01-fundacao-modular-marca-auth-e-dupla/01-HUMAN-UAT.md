---
status: complete_with_launch_followups
phase: 01-fundacao-modular-marca-auth-e-dupla
source: [01-VERIFICATION.md]
started: 2026-06-03T13:00:54Z
updated: 2026-06-03T17:40:22Z
---

# Phase 1 Human UAT

## Current Test

Phase 1 closure gate

## Tests

### 1. Live Database Phase 1 Gate
expected: All 11 migration, RLS, role, isolation, concurrency and query-plan integration tests pass without skips on an isolated test database.
result: passed
evidence: Neon project `super-paper-33008114`, branch `br-sparkling-sea-acolroj6`; `pnpm --filter @queue/db test:integration` passed 11/11 and `pnpm phase:1:gate` passed its database section. Production branch `br-red-feather-ac0pszrf` was migrated on 2026-06-03; non-destructive validation confirmed 13 product tables, zero rows, forced RLS on `app`/`ops` tables, no unsafe role flags, `auth.rate_limit.last_request` as `bigint`, and runtime DDL denied with rollback.

### 2. Isolated Playwright Phase 1 Gate
expected: All 14 auth, pairing, route-isolation and accessibility tests pass without skips against an isolated configured app environment.
result: passed
evidence: `pnpm phase:1:gate` passed with no skipped checks on 2026-06-03. The gate seeded verified E2E fixtures on Neon test branch `br-sparkling-sea-acolroj6`, started a Playwright-managed local Next server at `http://127.0.0.1:3000`, and passed all 14 Playwright tests.

### 3. Real Verification And Reset Email Lifecycle
expected: Verification and reset emails arrive, valid links work, the old corrected-email link fails, and successful verification signs the user in before pairing.
result: launch_followup
evidence: Auth callbacks, verification resend, email correction surface and password-reset request are covered by unit tests and Playwright. Real provider delivery and inbox link-click evidence were not executed automatically and remain required before production launch.

### 4. Restore Rehearsal
expected: The restore probe disappears after restore, the app reconnects, and the database integration suite passes on the restored branch.
result: launch_followup
evidence: `packages/db/RESTORE.md` is present and validated by `pnpm phase:1:gate`. A real Neon point-in-time restore rehearsal was not executed automatically and remains required before production launch.

### 5. Visual Brand And Feedback Review
expected: Public, pairing and authenticated screens feel intentionally QUEUE/2; /2 icon/loading, calm and special toasts, focus, contrast and reduced motion are coherent on mobile and desktop.
result: accepted_with_followup
evidence: User reviewed the login screen and liked the overall visual direction. `pnpm phase:1:gate` passed axe, focus-rule and reduced-motion checks. Follow-up polish requested for Phase 1.1: make the `/2`/logo entry navigate back to the landing page, reconsider whether the form badge should be the full logo instead of isolated `/2`, and improve the left-side composition/details without waiting for the final Phase 7 landing.

## Summary

total: 5
passed: 3
launch_followups: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- Phase 1.1 candidate: auth/landing visual polish before Phase 2. Scope: login card navigation/logo, left-panel refinement, and a better interim landing while keeping the final public landing in Phase 7.
- Before production launch: run real transactional email lifecycle and Neon restore rehearsal with recorded evidence.
