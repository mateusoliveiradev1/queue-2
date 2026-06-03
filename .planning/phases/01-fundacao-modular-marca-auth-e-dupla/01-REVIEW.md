---
phase: 01-fundacao-modular-marca-auth-e-dupla
reviewed: 2026-06-03T09:34:51-03:00
depth: standard
files_reviewed: 96
files_reviewed_list:
  - .env.example
  - .gitignore
  - apps/web/next.config.ts
  - apps/web/next-env.d.ts
  - apps/web/package.json
  - apps/web/playwright.config.ts
  - apps/web/proxy.ts
  - apps/web/src/app/(public)/cadastro/page.tsx
  - apps/web/src/app/(public)/login/page.tsx
  - apps/web/src/app/(public)/parear/page.tsx
  - apps/web/src/app/(public)/recuperar-senha/page.tsx
  - apps/web/src/app/(public)/verificar-email/page.tsx
  - apps/web/src/app/api/auth/[...all]/route.ts
  - apps/web/src/app/app/dupla/page.tsx
  - apps/web/src/app/app/page.tsx
  - apps/web/src/app/app/perfil/page.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/page.tsx
  - apps/web/src/components/app-shell.tsx
  - apps/web/src/components/copy-pairing-code.tsx
  - apps/web/src/components/timezone-input.tsx
  - apps/web/src/modules/duo/application/create-pairing-code.ts
  - apps/web/src/modules/duo/application/get-duo-dashboard.ts
  - apps/web/src/modules/duo/application/join-duo.ts
  - apps/web/src/modules/duo/application/ports.ts
  - apps/web/src/modules/duo/application/update-duo-settings.ts
  - apps/web/src/modules/duo/domain/duo-policy.ts
  - apps/web/src/modules/duo/domain/pairing-code.ts
  - apps/web/src/modules/duo/index.ts
  - apps/web/src/modules/duo/infrastructure/duo-repository.ts
  - apps/web/src/modules/duo/presentation/view-models.ts
  - apps/web/src/platform/auth/actions.ts
  - apps/web/src/platform/auth/client.ts
  - apps/web/src/platform/auth/email.ts
  - apps/web/src/platform/auth/rate-limit.ts
  - apps/web/src/platform/auth/server.ts
  - apps/web/src/platform/auth/session.ts
  - apps/web/src/platform/rate-limit/persistent.ts
  - apps/web/src/platform/server-only.ts
  - apps/web/src/security/headers.ts
  - apps/web/tests/accessibility.spec.ts
  - apps/web/tests/auth-flow.test.ts
  - apps/web/tests/auth-security.test.ts
  - apps/web/tests/brand-ui.test.tsx
  - apps/web/tests/duo-domain.test.ts
  - apps/web/tests/duo-flow.test.ts
  - apps/web/tests/duo-isolation.test.ts
  - apps/web/tests/phase-1-e2e.spec.ts
  - apps/web/tests/security-headers.test.ts
  - apps/web/tests/server-only-stub.ts
  - apps/web/tests/setup.ts
  - apps/web/tsconfig.json
  - apps/web/vitest.config.ts
  - package.json
  - packages/config/eslint/index.js
  - packages/config/package.json
  - packages/config/typescript/base.json
  - packages/db/drizzle.config.ts
  - packages/db/package.json
  - packages/db/RESTORE.md
  - packages/db/src/client.ts
  - packages/db/src/index.ts
  - packages/db/src/migrations/0001_foundation.sql
  - packages/db/src/migrations/0002_pairing_runtime.sql
  - packages/db/src/rls/membership.sql
  - packages/db/src/rls/policies.sql
  - packages/db/src/roles.sql
  - packages/db/src/schema/app.ts
  - packages/db/src/schema/auth.ts
  - packages/db/src/schema/index.ts
  - packages/db/src/schema/ops.ts
  - packages/db/src/testing/migrate-empty.ts
  - packages/db/src/testing/rls-test-context.ts
  - packages/db/tests/migrations.test.ts
  - packages/db/tests/pairing-concurrency.test.ts
  - packages/db/tests/rls-isolation.test.ts
  - packages/db/tests/role-privileges.test.ts
  - packages/db/tests/setup.integration.ts
  - packages/db/tsconfig.json
  - packages/db/vitest.integration.config.ts
  - packages/ui/package.json
  - packages/ui/src/brand/loading.tsx
  - packages/ui/src/brand/mark.tsx
  - packages/ui/src/brand/wordmark.tsx
  - packages/ui/src/feedback/toast.tsx
  - packages/ui/src/fonts.ts
  - packages/ui/src/index.ts
  - packages/ui/src/tokens.css
  - packages/ui/tsconfig.json
  - pnpm-workspace.yaml
  - scripts/check-architecture.mjs
  - scripts/check-secrets.mjs
  - scripts/phase-1-gate.mjs
  - tsconfig.base.json
  - turbo.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
resolved_findings:
  critical: 2
  warning: 5
  total: 7
status: clean
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-03T09:34:51-03:00
**Depth:** standard
**Files Reviewed:** 96
**Status:** clean

## Summary

The initial review found two release-blocking data/security defects and five correctness or test-reliability issues. All seven were fixed in `b279c0a` and `a287d8d`; the follow-up review is clean.

## Resolution

- Better Auth and the custom pairing limiter now share a bigint epoch-millisecond `auth.rate_limit.last_request` contract through immutable migration `0003_review_hardening.sql`.
- Runtime and worker roles can update only `app.duos.name`, `timezone` and `updated_at`; progression and pairing-state columns are no longer directly writable.
- Pairing creation validates timezone, revoke rejects forged non-UUID IDs before repository access, and race-lost classification references the exact active code row observed by the claimant.
- Session-revocation E2E coverage revokes all non-current sessions, and role DDL probes run in independent transactions.
- Local unit, typecheck, lint, production build and Phase 1 gate checks pass. Live database and Playwright checks remain explicit external-environment skips.

## Resolved Critical Issues

### CR-01: Better Auth rate-limit storage uses the wrong database type

**File:** `packages/db/src/schema/auth.ts:91`

**Issue:** Better Auth 1.6.14 defines database-backed rate-limit `lastRequest` as a numeric bigint timestamp, but the Drizzle schema and foundation migration store `last_request` as `timestamptz`. Better Auth writes numbers to this field, while the custom pairing limiter writes and reads `Date` values. This shared table contract can fail at runtime and leaves auth endpoints without the persistent limits required by `SEC-04`, `SAFE-07` and `SAFE-08`.

**Fix:** Add an immutable migration that converts `auth.rate_limit.last_request` to bigint milliseconds, change the Drizzle field to `bigint(..., { mode: "number" })`, and update the pairing limiter SQL to use epoch milliseconds.

### CR-02: Runtime role can directly mutate progression columns

**File:** `packages/db/src/roles.sql:37`

**Issue:** `GRANT SELECT, UPDATE ON app.duos` gives the web runtime and worker unrestricted column-level update access to `xp`, `level`, `streak`, `paired_at`, timestamps and identity fields for any duo visible through RLS. This bypasses the intended domain transaction and append-only progression model, contradicting the least-privilege and rebuildable-facts contract.

**Fix:** Revoke table-wide `UPDATE` and grant only the columns needed in Phase 1, such as `name`, `timezone` and `updated_at`. Keep `paired_at` changes inside the restricted security-definer pairing function, and add future progression grants only through reviewed functions.

## Resolved Warnings

### WR-01: Pairing creation accepts an invalid timezone and can crash its own page

**File:** `apps/web/src/modules/duo/application/create-pairing-code.ts:66`

**Issue:** The create-code use case stores any non-empty client-provided timezone without calling the existing `isValidTimezone` rule. A tampered or mistyped value is persisted, then `/parear` calls `Intl.DateTimeFormat` through `formatPairingCodeExpiry`, which throws for an invalid time zone.

**Fix:** Validate the timezone before repository access, return a typed invalid-timezone result, and add a test for the create-code path.

### WR-02: Revoking a tampered pairing-code id can return a server error

**File:** `apps/web/src/app/(public)/parear/page.tsx:232`

**Issue:** `pairingCodeId` comes from a hidden client field and is passed directly to a PostgreSQL UUID parameter. A forged non-UUID value can produce an invalid-input database error instead of the neutral inactive-code response required for pairing failures.

**Fix:** Validate the identifier before calling the repository and map invalid values to `code-inactive`.

### WR-03: Race-lost classification can match an unrelated historical code

**File:** `packages/db/src/migrations/0002_pairing_runtime.sql:36`

**Issue:** When no active code is claimable, the function reports `pairing_code_formed` if any previously claimed row has the same six-character code. Because codes can be reused after claim, an expired or unrelated code collision can produce the concurrent-race message and reveal that the code was historically used.

**Fix:** Tie the race-lost state to the specific active claim attempt, for example by retaining a globally unique code record or by selecting and locking the current candidate before updating it.

### WR-04: Session-revocation E2E test can revoke the wrong session

**File:** `apps/web/tests/phase-1-e2e.spec.ts:125`

**Issue:** Earlier serial tests create owner sessions that remain active after browser contexts close. Selecting the first `Encerrar sessao` button is not guaranteed to target the newly opened secondary context, so the final assertion can fail or pass against the wrong session.

**Fix:** Revoke all non-current sessions before checking the secondary context, or expose a deterministic fixture/session marker for the test environment.

### WR-05: Role privilege test does not actually exercise the ALTER attempt

**File:** `packages/db/tests/role-privileges.test.ts:92`

**Issue:** The preceding denied `CREATE TABLE` aborts the transaction. The `ALTER TABLE` statement then fails only because the transaction is aborted, and the assertion explicitly accepts that message. The test therefore does not prove that the runtime role lacks alter/migration capability.

**Fix:** Run the create and alter probes in separate transactions and require an ownership or permission-denied error for each.

---

_Reviewed: 2026-06-03T09:34:51-03:00_
_Reviewer: Codex (inline gsd-code-reviewer fallback)_
_Depth: standard_
