# Security And Data Contract: QUEUE/2

**Status:** Binding for v1
**Defined:** 2026-06-03
**Target assurance:** Defense in depth with OWASP ASVS 5.0 Level 2 as the release baseline

## Honest Guarantee

No software can be guaranteed 100% secure and no database design is permanently perfect. QUEUE/2 instead commits to measurable controls, adversarial tests, least privilege, recoverability and a release gate that blocks known high-risk failures.

## Protected Assets

- User accounts, sessions and password-reset flows.
- Duo membership and the promise that a duo has exactly two members.
- Private duo backlog, sessions, notes, spoilers, reviews and statistics.
- Shared XP, levels, quests, streaks, pity and roulette history.
- RAWG, email, push, auth and database credentials.
- Catalog provenance, audit history and operational jobs.

## Trust Boundaries

```text
Browser
  -> Next.js server boundary
     -> Better Auth session validation
     -> input validation + authorization
     -> domain transaction
     -> least-privileged Postgres role + RLS
        -> external integrations through server-only adapters
```

The browser is always untrusted. A `userId`, `duoId`, score, XP amount, confirmation or roulette result supplied by the client is never authoritative.

## Primary Abuse Cases

- Attacker guesses or brute-forces a pairing code to enter another duo.
- One member or a forged request attempts to create solo progress or impersonate the partner's confirmation.
- User changes a `duoId` or record ID to read or mutate another duo's private data.
- Replayed or concurrent requests duplicate XP, boost, pity, quests, sessions or scheduled rewards.
- Malicious text attempts stored XSS through notes, reviews, names or external catalog data.
- Compromised integration input attempts injection, secret exposure or unsafe redirects.
- Misconfigured database credentials bypass RLS or allow migrations from the web runtime.
- Operational failure loses jobs, corrupts derived totals or requires database restore.

## Application Security Controls

- Every Server Action, Route Handler, cron endpoint and server-side mutation validates input and re-authorizes the current session.
- Proxy or middleware may redirect for UX, but is never the only authorization gate.
- Better Auth security checks remain enabled. Trusted origins are allowlisted, secrets are strong and rotatable, and production cookies are secure, HTTP-only and narrowly scoped.
- Persistent rate limits protect auth, password reset, pairing codes, search, external integrations and economy-sensitive actions.
- User-generated text is treated as untrusted, rendered safely and never executed as HTML.
- Security headers include an explicit Content Security Policy, HSTS in production, frame protection, content-type protection and a restrictive referrer policy.
- Secrets exist only in server-side environment configuration and are excluded from browser bundles, logs and error responses.
- Logs are structured, redact sensitive values and retain security-relevant events such as session revocation, pairing attempts and privileged job failures.
- Dependency, secret and static analysis checks run before deployment.

## Database Security Controls

### Roles

Use separate credentials and responsibilities:

| Role | Purpose | Restrictions |
|------|---------|--------------|
| owner/migrator | Apply reviewed migrations | Never used by the web runtime |
| app runtime | Handle authenticated product requests | Non-owner, no `BYPASSRLS`, least privilege |
| worker | Execute approved jobs and integrations | Separate credential, limited functions and tables |
| read-only tooling | Diagnostics when required | No mutation privileges |

### RLS

- Every duo-scoped table contains `duo_id`.
- RLS is enabled and forced on duo-scoped tables.
- Policies default deny and use tested membership helpers.
- The web runtime never connects as a table owner or role with `BYPASSRLS`.
- `SECURITY DEFINER` functions use schema-qualified references, a safe fixed `search_path` and restricted `EXECUTE` privileges.
- Session identity is set transaction-locally so pooled connections cannot leak authorization context.

### Integrity

- Primary keys, foreign keys, `NOT NULL`, unique constraints, check constraints and partial unique indexes enforce every practical invariant.
- Exactly two duo members, one Principal, at most three Jogando games, one confirmation per member and one idempotency key per effect are protected against concurrent requests.
- XP ledger, domain events, roulette history and audit records are append-only from normal application flows.
- Critical mutations use transactions, explicit locks where needed and idempotency keys.
- Derived totals and read models can be rebuilt from authoritative facts.

### Migrations And Recovery

- Applied migrations are immutable and reviewed as code.
- Migrations must apply to an empty database and upgrade the previous schema in integration tests.
- Schema migrations use a direct database connection, not a pooled transaction connection.
- Development, preview/test and production use separate Neon branches and never share unsanitized production data.
- Production enables an appropriate Neon restore window or backup strategy for the selected plan.
- A restore procedure is documented and tested before production launch.
- Hot queries, foreign keys and RLS predicates receive indexes and query-plan review.

## Verification Gates

### Phase 1 Gate

Phase 1 cannot complete until:

- Cross-duo read and write attempts fail at both application and database layers.
- Concurrent pairing cannot create a third member.
- The app runtime role cannot bypass RLS or perform migrations.
- Architecture checks reject forbidden imports and client/server leaks.
- Auth, reset, session revocation, pairing rate limits and secure cookie configuration are tested.
- Empty-database and upgrade migration tests pass.

### Phase 1 Verification Procedure

Run `pnpm phase:1:gate` from the repository root. The command orchestrates:

- Architecture boundaries, TypeScript analysis, lint/static analysis and unit/component tests.
- Database migration, forced-RLS, runtime-role privilege, cross-duo isolation and pairing concurrency tests through `TEST_DATABASE_URL`.
- A production Next.js build followed by source and built-client secret scanning.
- Production dependency audit for unresolved high or critical findings.
- Playwright auth, pairing, route-isolation, session-revocation and accessibility checks against an isolated test deployment.
- Static validation that the security contract, numbered migrations and restore rehearsal runbook remain present.

The command exits nonzero on a real failure. Missing external test environments are reported as explicit skips and remain release blockers until the skipped checks are executed. A skip is not evidence that a control passed.

### Known Critical Or High Findings

None recorded as of the Phase 1 gate implementation on 2026-06-03. This statement does not replace the live database, browser, dependency and deployed-environment checks required by the gate.

### Every Phase Gate

Every phase that adds a table, endpoint, mutation or integration must:

- Update the threat model when a trust boundary changes.
- Add authorization, RLS and concurrency tests where relevant.
- Add or review constraints, indexes and idempotency behavior.
- Pass lint, typecheck, unit, integration and architecture checks.
- Resolve known critical or high security findings before completion.

### Release Gate

Production launch is blocked until:

- OWASP ASVS 5.0 Level 2 controls applicable to QUEUE/2 are reviewed and recorded.
- Dependency, secret and static analysis scans pass without unresolved critical or high findings.
- Restore procedure, secret rotation and incident-response steps are tested.
- Security headers, cookie behavior, error redaction and logging are verified in the deployed environment.
- A final adversarial test covers IDOR/cross-duo access, injection, replay, concurrency and privilege escalation paths.

## Incident Readiness

- Rotate auth, database and integration secrets independently.
- Revoke sessions and push subscriptions when compromise is suspected.
- Preserve audit records and logs needed to investigate access or economy anomalies.
- Rebuild derived totals from ledgers and events when corruption is suspected.
- Document the user communication and remediation path before production.

## Primary Sources

- https://owasp.org/www-project-application-security-verification-standard/ - ASVS 5.0 release baseline.
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html - PostgreSQL RLS behavior and owner bypass.
- https://www.postgresql.org/docs/current/sql-createfunction.html - safe `SECURITY DEFINER` functions.
- https://www.postgresql.org/docs/current/explicit-locking.html - locking and concurrency.
- https://neon.com/docs/guides/row-level-security - RLS with Neon.
- https://neon.com/docs/introduction/branch-restore - Neon restore capabilities.
- https://better-auth.com/docs/reference/security - Better Auth security guidance.
- https://better-auth.com/docs/concepts/rate-limit - Better Auth rate limiting.
- https://turborepo.dev/docs/reference/boundaries - Turborepo boundary checks.

---
*Last updated: 2026-06-03 after Phase 1 gate implementation*
