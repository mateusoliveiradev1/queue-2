---
phase: 01-fundacao-modular-marca-auth-e-dupla
plan: "03"
subsystem: ui
tags: [brand, nextjs, react, sonner, vitest, accessibility]

requires:
  - phase: 01-01
    provides: "pnpm/Turborepo workspace, Next.js app shell and @queue/ui package"
provides:
  - "QUEUE/2 OKLCH token contract, font contract and reusable brand primitives"
  - "Single-line and stacked QUEUE/2 wordmark variants plus /2 mark and roulette pointer motif"
  - "/2 SVG stroke loading state with reduced-motion fallback"
  - "Sonner-backed accessible QUEUE/2 toast feedback for important actions"
  - "/2 favicon placeholder and App Router loading surface"
  - "Custom public login, signup, email verification, password reset and pairing route surfaces"
  - "Phase 1 authenticated shell, empty dashboard, profile and duo surfaces"
  - "Testing Library smoke coverage for public and authenticated route rendering"
affects: [phase-01, brand, auth, duo, app-shell, testing]

tech-stack:
  added: [sonner, vitest, "@testing-library/react", "@testing-library/jest-dom", jsdom, "@vitejs/plugin-react"]
  patterns:
    - "Shared UI tokens are imported through @queue/ui/tokens.css from app globals."
    - "Future capabilities are represented as disabled or non-interactive locked rows until behavior is wired."
    - "Route smoke tests render App Router page components with Testing Library and verify accessible labels."

key-files:
  created:
    - "packages/ui/src/tokens.css"
    - "packages/ui/src/fonts.ts"
    - "packages/ui/src/brand/wordmark.tsx"
    - "packages/ui/src/brand/mark.tsx"
    - "packages/ui/src/brand/loading.tsx"
    - "packages/ui/src/feedback/toast.tsx"
    - "apps/web/src/app/(public)/login/page.tsx"
    - "apps/web/src/app/(public)/cadastro/page.tsx"
    - "apps/web/src/app/(public)/verificar-email/page.tsx"
    - "apps/web/src/app/(public)/recuperar-senha/page.tsx"
    - "apps/web/src/app/(public)/parear/page.tsx"
    - "apps/web/src/components/app-shell.tsx"
    - "apps/web/src/app/app/page.tsx"
    - "apps/web/src/app/app/perfil/page.tsx"
    - "apps/web/src/app/app/dupla/page.tsx"
    - "apps/web/tests/brand-ui.test.tsx"
    - "apps/web/src/app/icon.svg"
    - "apps/web/src/app/loading.tsx"
    - "apps/web/src/components/status-toast.tsx"
  modified:
    - "packages/ui/package.json"
    - "packages/ui/src/index.ts"
    - "apps/web/package.json"
    - "apps/web/src/app/layout.tsx"
    - "apps/web/src/app/globals.css"
    - "pnpm-lock.yaml"

key-decisions:
  - "Brand primitives live in @queue/ui with no app-domain imports, while app globals import the token CSS contract."
  - "Pairing and auth pages expose stable form names and labels now, but future side effects stay disabled or no-op until auth/duo behavior plans wire validation."
  - "Phase 1 app surfaces use locked, non-interactive next-step rows instead of enabled buttons for future catalog, roulette and Hall capabilities."

patterns-established:
  - "Use QueueWordmark, QueueMark, QueueLoading, RoulettePointer and QueueToaster from @queue/ui for brand consistency."
  - "Use route smoke tests for accessibility labels and static Phase 1 surface contracts."
  - "Keep first authenticated UI calm; reserve spectacle for later match, roulette, achievement and zerada moments."

requirements-completed: [BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, BRND-06, BRND-11, BRND-13, META-02]

duration: 17 min
completed: 2026-06-03
---

# Phase 01 Plan 03: Brand And Route Surfaces Summary

**QUEUE/2 brand primitives, public auth/pairing screens and Phase 1 authenticated shell with smoke-tested accessibility hooks**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-03T10:13:11Z
- **Completed:** 2026-06-03T10:30:18Z
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Built the reusable QUEUE/2 brand system in `@queue/ui`: OKLCH tokens, font contract, wordmarks, `/2` mark, roulette pointer, loader and toast wrapper.
- Added custom Brazilian Portuguese public pages for login, signup, verification, password recovery and pairing.
- Added the Phase 1 authenticated shell with empty dashboard, profile and duo pages that reserve future behavior without enabling fake features.
- Added Vitest/Testing Library smoke tests covering public and authenticated route rendering plus labeled form controls.
- Wired the existing loader and toast primitives into real App Router and important-action contexts, including a restrained special pairing-success toast and `/2` favicon placeholder.

## Task Commits

1. **Task 1: Build brand primitives in packages/ui** - `855b641` (feat)
2. **Task 2: Compose public auth and pairing screens** - `d56b4a6` (feat)
3. **Task 3: Build authenticated shell, empty dashboard, profile and duo surfaces** - `8efd80b` (feat)

**Plan metadata:** committed after this summary is written.

**Post-plan verifier fix:** `8711193`

## Files Created/Modified

- `packages/ui/src/tokens.css` - Shared QUEUE/2 OKLCH tokens, radius, spacing, focus, form, toast and reduced-motion styles.
- `packages/ui/src/fonts.ts` - Archivo Black, Inter Tight and JetBrains Mono font contract.
- `packages/ui/src/brand/*.tsx` - Wordmark variants, `/2` mark, roulette pointer/divider and `/2` SVG stroke loader.
- `packages/ui/src/feedback/toast.tsx` - Sonner-backed toast wrapper with calm and special variants.
- `apps/web/src/app/globals.css` - App global styles importing the shared token contract.
- `apps/web/src/app/layout.tsx` - Root theme/toaster wiring.
- `apps/web/src/app/icon.svg` and `apps/web/src/app/loading.tsx` - `/2` favicon placeholder and route loading surface.
- `apps/web/src/components/status-toast.tsx` - Calm and special important-action toast bridge.
- `apps/web/src/app/(public)/*/page.tsx` - Public login, signup, verification, reset and pairing surfaces.
- `apps/web/src/components/app-shell.tsx` - Phase 1 authenticated navigation shell.
- `apps/web/src/app/app/**/*.tsx` - Empty dashboard, profile and duo surfaces.
- `apps/web/tests/brand-ui.test.tsx` - Route smoke tests and accessible form-control assertions.
- `apps/web/vitest.config.ts`, `apps/web/tests/setup.ts`, `apps/web/package.json` - Web test harness.

## Decisions Made

- Used disabled buttons or non-interactive locked rows for behavior that is not wired in this plan.
- Kept auth form fields and names stable so later Better Auth actions can bind without redesigning the screens.
- Used Testing Library smoke tests over screenshot tests because this plan’s acceptance criteria are route reachability, labels and honest Phase 1 surface contracts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added UI package typecheck support**
- **Found during:** Task 1
- **Issue:** `@queue/ui` had no `tsconfig.json`, `typecheck` script or React/Sonner dependencies, so the required verification command could not run.
- **Fix:** Added UI TypeScript config, package script, React types and Sonner dependency.
- **Files modified:** `packages/ui/package.json`, `packages/ui/tsconfig.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @queue/ui typecheck`
- **Committed in:** `855b641`

**2. [Rule 2 - Missing Critical] Wired global tokens through the root layout**
- **Found during:** Task 2
- **Issue:** Creating `globals.css` alone would not apply the token contract because the root layout did not import it.
- **Fix:** Imported `globals.css` in `apps/web/src/app/layout.tsx` and mounted the branded toaster.
- **Files modified:** `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
- **Verification:** `pnpm --filter @queue/web typecheck`, `pnpm --filter @queue/web build`
- **Committed in:** `d56b4a6`

**3. [Rule 3 - Blocking] Added web smoke-test harness**
- **Found during:** Task 2
- **Issue:** `@queue/web` had no `test` script or Testing Library/Vitest setup, but Task 2 required component or smoke tests before proceeding.
- **Fix:** Added Vitest, Testing Library, jsdom, Vite React plugin, setup file and route smoke tests.
- **Files modified:** `apps/web/package.json`, `apps/web/vitest.config.ts`, `apps/web/tests/setup.ts`, `apps/web/tests/brand-ui.test.tsx`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @queue/web test`
- **Committed in:** `d56b4a6`

**4. [Rule 2 - Missing Critical] Corrected unwired pairing controls**
- **Found during:** Task 3 React best-practices review
- **Issue:** The pairing mode switch used tablist semantics without tab roles, and unwired revocation/join controls appeared enabled.
- **Fix:** Changed the segmented control to a button group and disabled unwired action buttons while keeping copy-to-clipboard active.
- **Files modified:** `apps/web/src/app/(public)/parear/page.tsx`
- **Verification:** `pnpm --filter @queue/web test`, `pnpm --filter @queue/web typecheck`
- **Committed in:** `8efd80b`

---

**Total deviations:** 4 auto-fixed (2 blocking issues, 2 missing critical issues).
**Impact on plan:** All deviations were required to satisfy the plan’s own verification, accessibility and honest-UI constraints. No later product behavior was implemented.

## Issues Encountered

- Running multiple `pnpm` commands in parallel on Windows caused an `EPERM` workspace-state rename race before tests started. Rerunning the command sequentially resolved it.
- Vitest 4 needed an explicit Vite React plugin because the app tsconfig keeps `jsx: preserve` for Next.js. The test file uses `createElement` and the harness compiles imported pages correctly.
- Extra `pnpm --filter @queue/web build` passed, but Next.js warned that Turbopack inferred the parent user directory as workspace root because `C:\Users\Liiiraa\package-lock.json` exists. This is recorded in `deferred-items.md`.

## Known Stubs

The original auth and duo UI placeholders were resolved by Plans 01-04 and 01-05. The empty `0 jogos` dashboard state remains intentional until catalog/library phases provide real queue data.

## Threat Flags

| Flag | File | Description |
| --- | --- | --- |
| threat_flag: public-server-actions | `apps/web/src/app/(public)/login/page.tsx`, `cadastro/page.tsx`, `verificar-email/page.tsx`, `recuperar-senha/page.tsx` | Public forms expose no-op Server Actions only for surface wiring. Later auth plans must replace them with validated, rate-limited Better Auth actions before real effects exist. |
| threat_flag: browser-clipboard | `apps/web/src/app/(public)/parear/page.tsx` | Pairing page uses `navigator.clipboard` for the demo code copy action; no secrets or server data are read. |

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm --filter @queue/ui typecheck` -> passed.
- `pnpm --filter @queue/web test` -> passed, 1 file / 8 tests.
- `pnpm check:architecture` -> passed.
- `pnpm --filter @queue/web typecheck` -> passed.
- `pnpm --filter @queue/web build` -> passed with the deferred Turbopack root warning noted above.
- Acceptance greps confirmed tokens, wordmark variants, loader stroke/reduced-motion support, toast variants, public route files, pairing copy/validity UI, dashboard ritual words, profile sections, duo sections and labeled-control tests.

## Next Phase Readiness

Plans 01-04 and 01-05 wired Better Auth and duo behavior. The verifier closure also connected the branded loader, favicon placeholder and important-action toast feedback to real app contexts.

## Self-Check: PASSED

- Confirmed key created files exist on disk.
- Confirmed task commits `855b641`, `d56b4a6` and `8efd80b` exist in git history.
- Re-ran plan-level verification commands before writing this summary.

---

*Phase: 01-fundacao-modular-marca-auth-e-dupla*
*Completed: 2026-06-03*
