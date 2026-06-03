---
phase: 01-fundacao-modular-marca-auth-e-dupla
plan: 01-04
subsystem: auth
tags: [better-auth, nextjs, server-actions, sessions, rate-limit, resend, vitest]

requires:
  - phase: 01-02
    provides: "Postgres/Drizzle auth schema and package boundaries"
  - phase: 01-03
    provides: "QUEUE/2 public and authenticated UI surfaces"
provides:
  - "Better Auth email/password runtime with Drizzle Postgres adapter"
  - "Email verification, login, password reset, logout and session revocation server actions"
  - "Protected server-side session gates for authenticated pages"
  - "UX-only Next.js proxy redirect for authenticated route entry"
  - "Auth flow and auth security test coverage"
affects: [auth, security, app-router, profile, future-duo-pairing]

tech-stack:
  added: [better-auth, resend, zod, server-only]
  patterns:
    - "Server auth runtime stays in platform/auth/server.ts with route delegation only"
    - "Auth form behavior uses typed server actions and neutral Portuguese redirects"
    - "Protected pages call requireVerifiedSession; proxy is only a UX shortcut"
    - "Session revocation posts session ids while the server resolves Better Auth tokens"

key-files:
  created:
    - apps/web/src/platform/auth/actions.ts
    - apps/web/proxy.ts
    - apps/web/tests/auth-flow.test.ts
    - apps/web/tests/auth-security.test.ts
    - apps/web/tests/server-only-stub.ts
  modified:
    - apps/web/src/platform/auth/server.ts
    - apps/web/src/platform/auth/session.ts
    - apps/web/src/app/api/auth/[...all]/route.ts
    - apps/web/src/app/(public)/login/page.tsx
    - apps/web/src/app/(public)/cadastro/page.tsx
    - apps/web/src/app/(public)/verificar-email/page.tsx
    - apps/web/src/app/(public)/recuperar-senha/page.tsx
    - apps/web/src/app/app/page.tsx
    - apps/web/src/app/app/dupla/page.tsx
    - apps/web/src/app/app/perfil/page.tsx
    - .env.example

key-decisions:
  - "Better Auth owns auth endpoints through the delegated route handler; product auth flow logic lives in server actions."
  - "Email correction uses Better Auth changeEmail when a session exists and otherwise records a new verification state safely instead of email-only account mutation."
  - "Proxy checks are explicitly UX-only; protected pages/actions perform server-side session validation."
  - "Profile revocation never exposes Better Auth session tokens in HTML; forms submit session ids and the server resolves tokens."

patterns-established:
  - "Auth user-facing errors redirect with neutral estado values and Brazilian Portuguese copy."
  - "Tests import server-only modules through a Vitest-only stub while runtime server-only protections stay enabled."
  - "Persistent auth rate limiting is configured with database storage for serverless deployments."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SAFE-05, SAFE-07, SAFE-08, META-02]

duration: 24m
completed: 2026-06-03
---

# Phase 01 Plan 04: Better Auth, Verification And Session Security Summary

**Better Auth email/password flows with verified-session gates, neutral recovery states and revocable active sessions**

## Performance

- **Duration:** 24m
- **Started:** 2026-06-03T10:39:25Z
- **Completed:** 2026-06-03T11:03:56Z
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Configured Better Auth self-hosted with Drizzle Postgres, required email verification, server-only Resend callbacks, trusted origins, secure cookie policy and persistent database rate limits.
- Replaced placeholder public auth forms with typed server actions for signup, login, verification resend/correction, password reset completion/request and logout.
- Added protected server-side session gates for authenticated pages, profile session list/revoke controls and a UX-only `proxy.ts` redirect.
- Added `auth-flow` and `auth-security` Vitest coverage for auth actions, unverified-user containment, session management, reset flow, rate-limit storage, trusted origins, secure cookies and error redaction.

## Task Commits

1. **Task 1: Configure Better Auth with Drizzle and secure runtime settings** - `b037d77` (feat)
2. **Task 2: Wire auth forms and verification/reset states** - `15ab98d` (feat)
3. **Task 3: Add session, proxy and auth security tests** - `debdc31` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `apps/web/src/platform/auth/server.ts` - Better Auth runtime, Drizzle adapter, secure cookies, trusted origins, verification, reset and session policy.
- `apps/web/src/platform/auth/actions.ts` - Server actions and validation helpers for public auth flows.
- `apps/web/src/platform/auth/session.ts` - Server session validation, verified-session redirects, active-session listing, revoke and logout actions.
- `apps/web/src/platform/auth/email.ts` - Server-only Resend email sender adapter for verification and reset.
- `apps/web/src/platform/auth/rate-limit.ts` - Persistent database-backed auth rate-limit policy.
- `apps/web/src/app/api/auth/[...all]/route.ts` - Delegated Better Auth GET/POST route handler.
- `apps/web/src/app/(public)/*` - Login, signup, verification and recovery pages wired to real server actions and neutral status copy.
- `apps/web/src/app/app/*` - Authenticated pages now call server-side auth gates; profile renders active sessions.
- `apps/web/proxy.ts` - UX-only protected-route redirect optimization.
- `apps/web/tests/auth-flow.test.ts` - Auth flow/action and public state coverage.
- `apps/web/tests/auth-security.test.ts` - Session, proxy, cookie, trusted-origin, rate-limit and redaction coverage.
- `apps/web/tests/server-only-stub.ts` and `apps/web/vitest.config.ts` - Test-only server-only import shim.
- `.env.example`, `apps/web/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` - Auth/email dependency and environment documentation.

## Decisions Made

- Better Auth endpoint behavior stays delegated to `/api/auth/[...all]`; QUEUE/2 auth form policy lives in platform server actions so routes do not accumulate product rules.
- Email correction cannot safely mutate an account by email alone when Better Auth does not issue an unverified signup session. The implementation uses `changeEmail` when a session exists and otherwise records a new verification state with name/email/password validation.
- The proxy checks only for a likely Better Auth session cookie and is documented as UX-only. Protected pages and actions are the source of authorization.
- Profile session revocation submits `sessionId`, not a Better Auth session token; the server lists the current user's sessions and resolves the token internally before revoking.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exposed database client helpers through the public package index**
- **Found during:** Task 1
- **Issue:** Better Auth server config needed Drizzle runtime helpers, and deep-importing `packages/db/src/client.ts` would violate package boundaries.
- **Fix:** Exported `./client` from `packages/db/src/index.ts`.
- **Files modified:** `packages/db/src/index.ts`
- **Verification:** `pnpm --filter @queue/web typecheck`, `pnpm check:architecture`
- **Committed in:** `b037d77`

**2. [Rule 3 - Blocking] Added direct `server-only` dependency to `apps/web`**
- **Found during:** Task 2
- **Issue:** `apps/web` directly imports `server-only`; runtime package resolution failed without a direct dependency.
- **Fix:** Added `server-only@0.0.1` to `apps/web`.
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @queue/web typecheck`, `pnpm --filter @queue/web test -- auth-flow`
- **Committed in:** `15ab98d`

**3. [Rule 2 - Missing Critical] Enabled safe Better Auth email-change support**
- **Found during:** Task 2
- **Issue:** Verification-page email correction required Better Auth change-email support, but the runtime config did not enable it.
- **Fix:** Enabled `user.changeEmail` with `updateEmailWithoutVerification` and added a safe fallback that records a new verification state without email-only account mutation.
- **Files modified:** `apps/web/src/platform/auth/server.ts`, `apps/web/src/platform/auth/actions.ts`
- **Verification:** `pnpm --filter @queue/web test -- auth-flow`, `pnpm --filter @queue/web typecheck`
- **Committed in:** `15ab98d`

**4. [Rule 3 - Blocking] Added Vitest server-only shim for security tests**
- **Found during:** Task 3
- **Issue:** Auth security tests must import server-only modules, but the runtime `server-only` poison pill is intentionally not importable in a test browser context.
- **Fix:** Added a Vitest-only alias to `tests/server-only-stub.ts`.
- **Files modified:** `apps/web/vitest.config.ts`, `apps/web/tests/server-only-stub.ts`
- **Verification:** `pnpm --filter @queue/web test -- auth-security`
- **Committed in:** `debdc31`

---

**Total deviations:** 4 auto-fixed (3 Rule 3, 1 Rule 2)
**Impact on plan:** All fixes were required for correctness, security or testability of the planned auth work. No unrelated product scope was added.

## Issues Encountered

- Better Auth required-email-verification signups do not create an unverified session; the email-correction flow was adjusted to avoid insecure email-only mutation.
- Current Next.js App Router docs require `searchParams` to be awaited, so public auth pages became async and the existing UI tests were updated accordingly.
- `server-only` works as a runtime guard but needs a test-only shim for source-level security tests.
- `roadmap.update-plan-progress` reported 4 completed summaries but left the visible roadmap row at `3/6`; the Phase 1 progress row was corrected manually to `4/6`.

## User Setup Required

External auth/email configuration is required before real email delivery works:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `RESEND_API_KEY`
- `EMAIL_FROM`

These are documented in `.env.example`. No auth gate blocked local implementation or tests.

## Known Stubs

- `apps/web/src/app/app/page.tsx` - Dashboard duo/fila values remain the intentional Phase 01 shell until real pairing/catalog plans provide data.
- `apps/web/src/app/app/dupla/page.tsx` - Duo identity, second member and preferences remain intentional placeholders until pairing and duo-settings plans provide data.

These stubs do not block Plan 01-04 because auth, verification, reset, session gating and revocation now use real server-side auth operations.

## Threat Flags

None beyond the planned auth, session, proxy and email/reset surfaces already covered by the plan threat model and `.planning/SECURITY.md`.

## Verification

- `pnpm --filter @queue/web typecheck` - passed
- `pnpm --filter @queue/web test -- auth-flow` - passed
- `pnpm --filter @queue/web test -- auth-security` - passed
- `pnpm --filter @queue/web test -- brand-ui` - passed
- `pnpm --filter @queue/web test -- auth` - passed
- `pnpm check:architecture` - passed
- Client-component secret scan for `RESEND_API_KEY`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `EMAIL_FROM`, `RAWG_API_KEY`, `AUTH_SECRET` - passed

## Auth Gates

None.

## Next Phase Readiness

- Future duo-pairing and app data plans can depend on `requireVerifiedSession()` for server-side user identity.
- Profile UI already has active-session list/revoke/logout controls and can be extended with display-name mutation later.
- Auth/email secrets still need real deployment values before production verification/reset email delivery.

## Self-Check: PASSED

- Found summary and key implementation/test files.
- Found task commits `b037d77`, `15ab98d` and `debdc31`.
- No missing self-check items.

---
*Phase: 01-fundacao-modular-marca-auth-e-dupla*
*Completed: 2026-06-03*
