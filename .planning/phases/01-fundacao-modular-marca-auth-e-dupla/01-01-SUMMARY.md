---
phase: 01-fundacao-modular-marca-auth-e-dupla
plan: "01"
subsystem: infra
tags: [pnpm, turborepo, nextjs, typescript, architecture-checks]

requires: []
provides:
  - "pnpm workspace with apps/* and packages/* boundaries"
  - "Next.js App Router shell at apps/web"
  - "Shared public packages for db, ui and config"
  - "Automated architecture boundary checker"
affects: [phase-01, architecture, security, auth, duo, database]

tech-stack:
  added: [pnpm, turborepo, nextjs, react, typescript, server-only]
  patterns:
    - "Root scripts delegate graph-aware work to Turborepo"
    - "Shared packages expose public package exports only"
    - "Architecture validation scans source with the TypeScript AST"

key-files:
  created:
    - "package.json"
    - "pnpm-workspace.yaml"
    - "turbo.json"
    - "tsconfig.base.json"
    - "apps/web/src/app/layout.tsx"
    - "apps/web/src/app/page.tsx"
    - "apps/web/src/modules/duo/index.ts"
    - "apps/web/src/platform/server-only.ts"
    - "packages/db/src/index.ts"
    - "packages/ui/src/index.ts"
    - "scripts/check-architecture.mjs"
  modified: []

key-decisions:
  - "Architecture checks run through the root pnpm script via Turborepo and the @queue/web package."
  - "The initial db package is explicitly server-only before any database schema is introduced."
  - "pnpm build approval for sharp is recorded in pnpm-workspace.yaml to keep installs non-interactive."

patterns-established:
  - "Use workspace:* for every local @queue/* dependency."
  - "Expose module and package contracts through index.ts or package exports, not deep paths."
  - "Use scripts/check-architecture.mjs as the modular boundary gate before later auth and database work."

requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, SAFE-05]

duration: 8 min
completed: 2026-06-03
---

# Phase 01 Plan 01: Modular Monorepo Foundation Summary

**pnpm/Turborepo monorepo with a Next.js app shell, public shared packages and executable architecture boundary enforcement**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-03T03:51:48Z
- **Completed:** 2026-06-03T03:59:56Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments

- Created the QUEUE/2 root workspace with `apps/*` and `packages/*`, Turbo task graph and root verification scripts.
- Scaffolded the only app at `apps/web` and the shared `@queue/db`, `@queue/ui` and `@queue/config` packages with public exports.
- Added a substantive architecture checker that rejects cross-module deep imports, client/server leaks, domain impurity and local dependency version leaks.

## Task Commits

1. **Task 1: Create pnpm/Turborepo workspace** - `29a318a` (chore)
2. **Task 2: Scaffold the Next.js app and shared packages** - `c02e0ad` (feat)
3. **Task 3: Add automated architecture boundary checks** - `71b0add` (feat)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `.gitignore` - ignores dependencies, build outputs, logs and local environment files.
- `package.json` - private root workspace scripts and pinned Turbo/TypeScript tooling.
- `pnpm-workspace.yaml` - workspace package globs and non-interactive `sharp` build approval.
- `pnpm-lock.yaml` - locked root, Next.js, React and workspace dependencies.
- `turbo.json` - first-class `build`, `lint`, `typecheck`, `test`, `test:integration` and `check:architecture` tasks.
- `tsconfig.base.json` - strict shared compiler baseline for the monorepo.
- `apps/web/*` - minimal Next.js App Router shell, metadata, root page, duo public entrypoint and server-only marker.
- `packages/config/*` - public exports for shared ESLint and TypeScript configuration.
- `packages/ui/*` - QUEUE/2 brand constants and color tokens without domain imports.
- `packages/db/*` - server-only database package entrypoint prepared for future schemas.
- `scripts/check-architecture.mjs` - deterministic source and workspace boundary checker.

## Decisions Made

- Architecture validation uses the TypeScript compiler API to parse imports instead of string-only scanning.
- The checker is routed through `pnpm check:architecture` by Turborepo, with `@queue/web` executing the root script.
- `packages/db` imports `server-only` immediately so future database code starts behind the server boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Approved Next.js sharp build dependency for pnpm 11**
- **Found during:** Task 2 (Scaffold the Next.js app and shared packages)
- **Issue:** `pnpm install` exited with `ERR_PNPM_IGNORED_BUILDS` because pnpm 11 required explicit approval for `sharp`.
- **Fix:** Added `allowBuilds.sharp: true` to `pnpm-workspace.yaml`, then reran `pnpm install`.
- **Files modified:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Verification:** `pnpm install` completed successfully and ran the `sharp` install check.
- **Committed in:** `c02e0ad`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** Required for reproducible non-interactive dependency installation. No architecture or product scope changed.

## Issues Encountered

- pnpm's build-approval gate blocked the first dependency install. Resolved through the documented workspace approval described above.

## Verification

- `pnpm --version` -> `11.5.1`
- `pnpm install` -> passed after explicit `sharp` build approval.
- `pnpm --filter @queue/web typecheck` -> passed.
- `pnpm check:architecture` -> passed on the clean scaffold.
- Temporary forbidden import fixture -> `pnpm check:architecture` failed non-zero on the expected deep-import rule, then passed again after fixture removal.
- `pnpm typecheck` -> passed.
- `pnpm verify` -> passed for currently available package tasks.
- Client component scan -> no Client Components present.
- Route/UI forbidden server import scan -> no route or UI forbidden imports found.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The monorepo foundation is ready for Plan 01-02 to add database schemas, migrations, RLS and role verification on top of the enforced module and server-only boundaries.

## Self-Check: PASSED

- Confirmed key created files exist on disk.
- Confirmed task commits `29a318a`, `c02e0ad` and `71b0add` exist in git history.
- Re-ran task and plan acceptance checks before writing this summary.

---
*Phase: 01-fundacao-modular-marca-auth-e-dupla*
*Completed: 2026-06-03*
