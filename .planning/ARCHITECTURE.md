# Architecture Contract: QUEUE/2

**Status:** Binding for v1
**Defined:** 2026-06-03

## Intent

QUEUE/2 is a modular monolith. It deploys as one Next.js application, but each business domain owns its rules, public contracts and infrastructure adapters. Modularity is not measured by the number of packages. It is measured by whether a domain can evolve without importing or rewriting another domain's internals.

This contract is a quality gate. Plans and implementation must not weaken these boundaries for convenience.

## Repository Shape

```text
apps/
`-- web/
    |-- src/app/                  # routing, layouts and composition only
    |-- src/modules/
    |   |-- duo/
    |   |-- catalog/
    |   |-- library/
    |   |-- discovery/
    |   |-- play/
    |   |-- gamification/
    |   |-- roulette/
    |   `-- hall/
    |-- src/platform/             # auth, jobs, integrations and runtime adapters
    `-- tests/
packages/
|-- db/                           # schema, migrations, RLS, SQL functions and seeds
|-- ui/                           # brand, primitives and feedback with no domain logic
`-- config/                       # shared TypeScript, lint and tooling configuration
```

The initial repository intentionally has one application. Microfrontends and package-per-feature are not permitted unless a future requirement creates a real independent deployment or reuse boundary.

## Domain Module Shape

Each module follows this structure where applicable:

```text
src/modules/<domain>/
|-- domain/                       # entities, value objects, policies and pure rules
|-- application/                  # use cases, ports and orchestration
|-- infrastructure/               # Drizzle queries, external adapters and persistence
|-- presentation/                 # route-facing UI and view models
|-- events/                       # public domain event contracts
`-- index.ts                      # the only public entrypoint
```

Small modules may omit empty folders, but they must preserve the dependency direction.

## Dependency Rules

```text
app composition -> module public entrypoint
presentation -> application -> domain
infrastructure -> application ports + domain
platform adapters -> module public contracts
module A -> module B public contract or domain event only
```

Forbidden dependencies:

- `domain/` importing Next.js, React, Drizzle, Better Auth, browser APIs or external SDKs.
- One module deep-importing another module's `domain`, `application`, `infrastructure` or `presentation` folders.
- `packages/ui` importing application or domain code.
- `packages/db` importing from `apps/web`.
- Client Components importing database, auth secrets, server-only modules or external secret-bearing SDKs.
- Business rules inside `page.tsx`, `route.ts`, Server Actions or React components.
- A generic `utils` or `services` dumping ground that hides domain ownership.

## Public Contracts

- Every module exposes a narrow `index.ts` public API.
- Cross-domain synchronous calls use explicit application contracts.
- Cross-domain derived effects use versioned domain events and the transactional outbox.
- Public event payloads contain IDs and stable facts, not ORM records.
- Changes to a public contract require tests for the caller and provider.
- Shared types live with the owning module unless they are genuinely platform-wide.

## Database Ownership

Code modules own domain behavior; PostgreSQL schemas create coarse operational boundaries:

| Schema | Ownership |
|--------|-----------|
| `auth` | Better Auth tables only |
| `catalog` | External game catalog and sourced metadata |
| `app` | Duo-scoped product state |
| `ops` | Domain events, jobs, audit records and operational data |

Rules:

- Every table has an explicit owner module.
- Every invariant that PostgreSQL can enforce uses a constraint, index or transaction.
- Application code does not bypass RLS to simplify queries.
- Read models may be derived, but authoritative facts remain reconstructible.

## Enforcement

The repository must fail validation when a boundary is violated:

- `pnpm` workspace dependencies use `workspace:` references.
- Package `exports` expose only supported public paths.
- TypeScript and lint rules reject forbidden deep imports and client/server leaks.
- Turborepo runs `lint`, `typecheck`, `test`, `test:integration` and architecture checks through the dependency graph.
- `server-only` markers protect database, auth, jobs and integration modules.
- Integration tests exercise module public contracts, not internal implementation details.

Turborepo boundary rules may be used as an additional signal, but they are not the only enforcement mechanism.

## Definition Of Modular

The architecture is considered modular only when all statements are true:

1. A route composes use cases but contains no business decision.
2. A domain rule can be tested without Next.js, Neon, Drizzle or Better Auth.
3. A module cannot import another module's internals.
4. Replacing an external integration changes an adapter, not domain rules.
5. Database changes identify an owner module and preserve cross-module contracts.
6. Automated checks reject violations before merge or deployment.

## Change Policy

- New modules require a clear business capability and public API.
- New shared packages require at least two real consumers or a deployment/tooling boundary.
- Direct cross-module database writes are prohibited; the owning module performs its mutation.
- Exceptions require a documented architecture decision and a removal plan.

---
*Last updated: 2026-06-03 after architecture hardening*
