---
phase: 07-paridade-visual-e-ux-com-prototipo
plan: "02"
subsystem: public-entry
tags: [phase-7, landing, auth, pairing, visual-parity, accessibility]
requires:
  - phase: 07-paridade-visual-e-ux-com-prototipo
    plan: "01"
    provides: Authenticated shell primitives and Phase 7 visual tokens
provides:
  - Brand-first public landing with monumental QUEUE/2 hierarchy
  - Compact login and signup cards with Entrar/Criar conta tabs
  - Compact recovery, verification and pairing surfaces
  - Public Phase 7 screenshot evidence for anonymous routes
affects: [public-routes, auth-ui, pairing-ui, visual-regression]
tech-stack:
  added: []
  patterns:
    - Compact public auth card shell with explicit auth tabs
    - Protected pairing route is tested as an unauthenticated redirect unless an authenticated fixture is configured
key-files:
  created:
    - .planning/phases/07-paridade-visual-e-ux-com-prototipo/evidence/screenshots/phase-7-public-auth-login-mobile-chromium.png
  modified:
    - apps/web/src/app/page.tsx
    - apps/web/src/app/(public)/login/page.tsx
    - apps/web/src/app/(public)/cadastro/page.tsx
    - apps/web/src/app/(public)/parear/page.tsx
    - apps/web/src/app/(public)/recuperar-senha/page.tsx
    - apps/web/src/app/(public)/verificar-email/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/tests/brand-ui.test.tsx
    - apps/web/tests/phase-7-visual.spec.ts
key-decisions:
  - "The public landing is product-first, not a SaaS feature tour: QUEUE/2, A fila e nossa., short lede and two direct CTAs."
  - "/login and /cadastro remain separate routes but share visual tabs for cross-navigation."
  - "/parear keeps its existing verified-session guard; anonymous Playwright evidence verifies redirect to /login instead of capturing a fake pairing page."
patterns-established:
  - "Public auth surfaces use `public-shell--compact`, `public-auth-card` and `auth-tabs`."
  - "Pairing code text wraps with `overflow-wrap: anywhere` to avoid mobile horizontal overflow."
  - "Public visual evidence captures only anonymous routes that render without authenticated product fixtures."
requirements-completed:
  - BRND-02
  - BRND-04
  - BRND-05
  - BRND-06
  - BRND-07
  - BRND-08
  - BRND-09
  - BRND-10
  - BRND-11
  - BRND-12
  - BRND-13
  - META-01
  - META-02
  - SAFE-05
duration: 15 min
completed: 2026-06-10
---

# Phase 07 Plan 02: Public Entry Summary

**The public entry points now use one compact QUEUE/2 visual system while preserving auth and pairing authority.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-10T00:34:00-03:00
- **Completed:** 2026-06-10T00:49:00-03:00
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Rebuilt `/` around a dominant QUEUE/2 wordmark, the official tagline `A fila e nossa.`, short ritual copy and two direct CTAs.
- Replaced the old public auth composition on `/login` and `/cadastro` with compact centered cards, small brand mark and `Entrar`/`Criar conta` tabs.
- Brought `/parear`, `/recuperar-senha` and `/verificar-email` into the same compact visual language without changing server actions, token handling or auth redirects.
- Updated Phase 7 public screenshot evidence for landing, login, cadastro, recovery and verification at desktop and mobile sizes.
- Adjusted the Playwright public visual scaffold so `/parear` is validated as a protected unauthenticated redirect instead of running axe against Next.js redirect metadata.

## Task Commits

1. **Task 1: Public landing first viewport** - `16437c8` (`feat`)
2. **Task 2: Compact login and signup** - `7d6816c` (`feat`)
3. **Task 3: Compact pairing, recovery and verification** - `ce3c515` (`feat`)
4. **Visual evidence/test alignment** - `f32fbc8` (`test`)

## Verification

- `pnpm --filter @queue/web test -- brand-ui` - passed.
- `pnpm --filter @queue/web test -- auth-flow auth-security` - passed.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm check:secrets` - passed; skipped the missing client bundle at `apps\web\.next\static`.
- `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "Phase 7 public visual scaffold"` with `E2E_BASE_URL=http://127.0.0.1:3000` and `E2E_START_SERVER=1` - passed, 8 tests.
- `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "pairing"` with local `E2E_BASE_URL` and `E2E_START_SERVER=1` - passed, 1 test.

## Browser Evidence

- Public local evidence passed for `/`, `/login`, `/cadastro`, `/recuperar-senha` and `/verificar-email`, including axe, overflow, overlap and touch-target checks.
- `/parear` is not captured as an anonymous public screenshot because the route requires `requireVerifiedSession()` and redirects anonymous users to `/login`.
- Authenticated Phase 7 browser evidence remains blocked until `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` are configured for the same local or preview runtime.

## Deviations from Plan

- The plan expected direct public pairing visual evidence, but the implementation correctly preserves `/parear` as a verified-session route. The scaffold now records the unauthenticated redirect and leaves real pairing-page visual evidence to authenticated fixtures.

## Issues Encountered

- Running axe against `/parear` without a session flagged Next.js redirect metadata (`meta-refresh`) instead of the pairing UI. The test now avoids treating a protected redirect page as visual evidence.

## User Setup Required

- Configure a verified unpaired E2E user for `/parear` if future release evidence must include the rendered pairing card itself.
- Configure `E2E_READY_USER_EMAIL` and `E2E_READY_USER_PASSWORD` before accepting authenticated Phase 7 screenshots as release evidence.

## Next Phase Readiness

Ready for `07-03`: public entry and auth surfaces now share the same compact visual system, so the next plan can refine authenticated route-specific content without revisiting the public shell.

---
*Phase: 07-paridade-visual-e-ux-com-prototipo*
*Completed: 2026-06-10*
