# Phase 1: Fundacao Modular, Marca, Auth E Dupla - Research

**Researched:** 2026-06-03
**Mode:** inline gsd-phase-researcher
**Status:** Ready for planning
**Confidence:** HIGH

## RESEARCH COMPLETE

<question>
What do I need to know to plan Phase 1 well?
</question>

<summary>
Phase 1 is the product foundation, not a simple project scaffold. The plan must create a pnpm/Turborepo modular monolith, a Next.js App Router application, Better Auth email/password flows, Postgres schemas and RLS, duo pairing invariants, brand primitives, and objective verification gates. The highest-risk work is not UI complexity; it is preserving the `/2` invariant under concurrency and proving that application authorization and database RLS both block cross-duo access.
</summary>

<canonical_inputs>
- `.planning/ROADMAP.md` - Phase 1 scope, requirement IDs and success criteria.
- `.planning/REQUIREMENTS.md` - AUTH, DUO, BRND, ARCH, DATA, SEC, SAFE and META requirements.
- `.planning/ARCHITECTURE.md` - binding modular monolith contract.
- `.planning/SECURITY.md` - binding security, RLS, least-privilege and recovery contract.
- `.planning/research/STACK.md` - pinned stack and version compatibility.
- `.planning/phases/01-fundacao-modular-marca-auth-e-dupla/01-CONTEXT.md` - product decisions D-01 through D-35.
- `AGENTS.md` - repository and workflow instructions.
</canonical_inputs>

<official_docs_checked>
- Next.js App Router docs: Server Components are the default, Client Components should be narrow, and Server Functions are reachable through POST requests, so every mutation must validate auth and authorization server-side.
- Better Auth docs: email/password can require email verification; verification and reset flows require configured email callbacks; session management supports active session listing and revocation; the Next.js proxy/session-cookie helper is only a redirect aid and not sufficient for authorization.
- Better Auth rate limiting docs: production has a default limiter, sensitive auth paths have stricter defaults, and serverless deployments need persistent/database-backed rate-limit storage rather than process memory.
- Better Auth Drizzle adapter docs: use the Drizzle adapter with `provider: "pg"` and generate/apply auth schema through the Better Auth and Drizzle migration path.
- Drizzle docs: production-friendly flow is TypeScript schema plus generated SQL migrations checked into version control, with migrations applied outside the web runtime.
- Drizzle Neon docs: Neon HTTP is simple for stateless queries, while `@neondatabase/serverless` pool/WebSocket or `pg` are needed when transaction semantics require one connection.
- PostgreSQL RLS docs: RLS defaults to deny when enabled without policies; table owners and `BYPASSRLS` roles bypass policies unless `FORCE ROW LEVEL SECURITY` applies to owners.
- Neon branching docs: branch isolation, preview/test branches and restore-window behavior should be part of the database/recovery plan.
- pnpm workspaces and Turborepo boundaries docs: workspace protocol and boundary checks can enforce package dependency declarations, but QUEUE/2 also needs custom module-boundary and server-only checks.
</official_docs_checked>

<planning_implications>

## 1. Repository and architecture foundation

The repository is currently planning-only. The first executable plan must create the root monorepo before any app, database or UI work can be reliable:

- Root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json`, lint/test scripts and a Node/pnpm version contract.
- `apps/web` as the only app, using Next.js App Router with `src/app` for routing and composition.
- `packages/db`, `packages/ui` and `packages/config` as shared packages only where the architecture contract allows them.
- Automated architecture checks that reject deep module imports, client imports of server-only modules, undeclared workspace dependencies, and business-rule files in route/UI layers.

Plan 1 should keep domain folders minimal but real. It should create public entrypoints and testable pure-domain examples so later phases do not normalize ad hoc utilities.

## 2. Database and RLS foundation

Database work must be planned early because auth and duo flows depend on it. Better Auth owns the `auth` schema. Product state belongs under `app`; audit/rate-limit/job facts belong under `ops`; catalog remains mostly deferred except schema ownership may exist as an empty namespace.

Phase 1 database work should create:

- Schemas: `auth`, `app`, `ops`, optionally `catalog`.
- Roles contract: migrator/owner outside runtime, app runtime without `BYPASSRLS`, worker with limited privileges, read-only tooling.
- Duo tables: profiles, duos, duo_members, pairing_codes, duo_preferences, idempotency keys/audit events as needed for Phase 1.
- Constraints: unique user membership while active, max two duo members, no self-join, code format/expiry/revocation state, short text limits, timezone presence after onboarding.
- RLS: enabled and forced on duo-scoped tables, default-deny, policies based on transaction-local identity and a restricted `SECURITY DEFINER` helper such as `app.has_duo_membership(uid, duo_id)`.
- Tests that verify empty-database migration, upgrade migration, RLS deny-by-default, runtime role limitations, cross-duo read/write denial and concurrent pairing.

The exact "max two members" invariant should not rely on UI or a read-before-write race. Use a transaction with row/advisory locking or a SQL function that atomically claims the pairing code and inserts the second member, backed by constraints and a failure mode that maps to "essa dupla acabou de ser formada."

## 3. Auth implementation

Better Auth should be isolated in `apps/web/src/platform/auth`. Route handlers expose Better Auth endpoints, but route files should not contain business rules. Auth UI should be custom QUEUE/2 screens in Portuguese.

The auth plan must cover:

- Email/password signup, login and logout.
- Email verification required before app access.
- Email correction flow that preserves account, invalidates old verification and sends a new email.
- Password reset request and completion.
- Active session listing and revocation.
- Server-side session validation on protected pages/actions, with proxy only used for UX redirection.
- Database-backed or otherwise persistent rate limiting for auth endpoints in serverless.
- Trusted origins, cookie security, secret handling and email provider server-only isolation.

The project decisions require a specific verified-state UX: unverified users are restricted to verification, valid verification signs in and routes to pairing, login with unverified email opens the verification screen, and expired/used links offer a neutral resend.

## 4. Duo pairing and identity implementation

Duo behavior belongs under `apps/web/src/modules/duo` with domain rules and application use cases. UI and routes call public module entrypoints only.

The duo plan must cover:

- Verified user without duo can create one active six-character pairing code.
- Pairing code expires after 24 hours and can be revoked before use.
- Entering a valid code forms the duo immediately.
- A user already in a duo cannot create or join another duo in Phase 1.
- Pairing attempts have persistent rate limits and neutral state messages: invalid, inactive, attempt limit, or race lost.
- Duo naming is required after pairing and is the first joint action.
- Duo profile page shows duo name, both members and pairing date.
- Timezone is detected from browser and confirmed by the user.
- Shared notification/audio preferences exist but push permission is deferred.
- No owner role in the duo; both members can edit name/timezone.

This phase must not implement solo progress or later gameplay flows. Protected app routes should redirect verified users without duo to `/parear`.

## 5. Brand/UI foundation

The UI work must avoid a generic SaaS auth template. It should implement QUEUE/2 brand primitives in `packages/ui`, then compose them in public/auth/pairing/app shell views.

Phase 1 UI should include:

- Wordmark variants with Archivo Black `QUEUE` and JetBrains Mono acid-lime `/2`.
- `/2` mark for favicon/app/loading contexts.
- OKLCH tokens, fonts, radius, grain treatment and pointer motif.
- Accessible toast system with calm defaults and a moderate pairing-success variant.
- `/login`, `/cadastro`, verification, reset, `/parear`, initial dashboard, profile and duo pages.
- Empty dashboard state with the three-step ritual "descobrir, sortear, zerar" and honest locked next steps.
- Keyboard focus, contrast, touch targets and reduced-motion behavior.

The project wants public pages and auth/pairing pages reachable in Phase 1. Full landing and PWA metadata belong later except `META-02` and the auth/pairing route reachability required here.

## 6. Security, testing and release gate for Phase 1

The final plan must intentionally test the foundation. It is cheaper to block Phase 1 here than to let later domain work inherit broken boundaries.

Required verification scope:

- Unit tests for password checklist, code state mapping, duo invariant policies and pure domain rules.
- Integration tests for migrations, role grants, RLS, transaction-local identity and concurrent pairing.
- App tests for signup, verification, login, reset, session revocation, pairing, naming, route redirects and cross-duo denial.
- Architecture checks wired into `pnpm lint` or a separate `pnpm check:architecture`.
- Security checks for headers, secret leakage, server-only imports, rate limits and error/log redaction.
- Restore strategy document and at least one scripted restore rehearsal plan against a Neon branch or documented local equivalent.

The test strategy should explicitly create two duos and attempt IDOR reads/writes from each session. Application-layer denial is not enough; database-layer denial under the app runtime role is required.

</planning_implications>

<recommended_plan_shape>

## Wave 1

1. Scaffold monorepo, Next app, shared packages and architecture checks.

## Wave 2

2. Build database schemas, migrations, RLS, roles and database tests.
3. Build QUEUE/2 brand primitives and Phase 1 screens/app shell.

## Wave 3

4. Implement Better Auth platform, email verification/reset/session flows and auth gates.

## Wave 4

5. Implement duo pairing, duo identity, profile/settings and route-state enforcement.

## Wave 5

6. Complete security, recovery, E2E and release-gate verification for Phase 1.

</recommended_plan_shape>

<risks>
- Better Auth defaults are not enough for serverless abuse resistance if rate-limit data stays in memory.
- Proxy/middleware redirects can create a false sense of authorization; every protected page/action/route must validate the session and duo membership server-side.
- RLS can be accidentally bypassed if the runtime connects as owner or `BYPASSRLS`; role tests must prove this.
- Max-two-duo membership cannot be enforced by a simple count check outside a lock/transaction.
- Client Components can accidentally pull server-only modules into the browser if imports are not checked.
- Brand scope can sprawl into landing/PWA polish; Phase 1 should implement auth/pairing/app-shell identity and defer full public launch polish to Phase 7.
</risks>

<sources>
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/getting-started/mutating-data
- https://better-auth.com/docs/authentication/email-password
- https://better-auth.com/docs/concepts/session-management
- https://better-auth.com/docs/concepts/rate-limit
- https://better-auth.com/docs/integrations/next
- https://better-auth.com/docs/adapters/drizzle
- https://orm.drizzle.team/docs/migrations
- https://orm.drizzle.team/docs/connect-neon
- https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- https://neon.com/docs/guides/row-level-security
- https://neon.com/docs/introduction/branching
- https://pnpm.io/workspaces
- https://turborepo.dev/docs/reference/boundaries
</sources>

