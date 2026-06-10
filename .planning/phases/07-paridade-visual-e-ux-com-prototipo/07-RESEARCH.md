# Phase 07: Paridade Visual e UX com Prototipo - Research

**Researched:** 2026-06-09  
**Domain:** Visual parity, responsive UX hardening, accessible Next.js App Router UI  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Every item in this section is copied from `.planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md`; the copied constraints are binding for planning. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

### Locked Decisions

## Implementation Decisions

### Navegacao autenticada horizontal

- **D-01:** The authenticated app shell uses a global top navbar on all internal routes that use `AppShell`, replacing the current sidebar-first feel.
- **D-02:** Desktop top nav exposes exactly seven primary routes: `Home`, `Biblioteca`, `Descobrir`, `Roleta`, `Desafios`, `Hall` and `Dupla`.
- **D-03:** `Perfil` and `Sair` live on the right side of the top bar. `Catalogo` and `Conquistas` remain accessible through strong contextual links or tiles, not as primary top-nav items.
- **D-04:** Mobile uses a sticky top area with a horizontally scrollable route rail for the same primary routes. Do not keep bottom nav as the primary pattern, and do not hide the main routes behind a drawer.
- **D-05:** The active route uses a lime slash/pointer motif plus a thin underline. Avoid heavy filled pills that make the nav feel like a SaaS tab bar.
- **D-06:** The top nav should have high composition fidelity to the prototype prints: dry top bar, space, mono/uppercase labels, lime only for active/emphasis, and no generic SaaS menu styling. Do not copy measurements blindly if that breaks content or responsiveness.
- **D-07:** The global navbar stays visually separate from route controls. Filters, tabs, search and route-specific actions belong in a second row or body area.
- **D-08:** The authenticated top nav is sticky with a discreet solid or minimally blurred background and a fine border.
- **D-09:** `Hall` appears in the navbar in Phase 7, but if the full Hall content is not implemented yet it shows an honest prepared state such as `HALL EM BREVE /` or `ESTANTE VAZIA / POR ENQUANTO`. Do not implement reviews, shelf replay or full Hall behavior in Phase 7.

### Landing e auth compactos

- **D-10:** The public landing follows the prototype with a monumental `QUEUE/2` first viewport, direct tagline, two primary CTAs, and the three-step ritual visible immediately below the fold. Do not turn it into a long SaaS landing.
- **D-11:** Landing copy is brand-first and minimal: visual H1 `QUEUE/2`, official tagline `A fila e nossa.`, short supporting line in the direction of `Descubram, sorteiem e zerem coops juntos.`, and direct CTAs. The three-step section carries the explanation.
- **D-12:** Use the Impeccable repository as a design process reference for `shape`, `critique`, `clarify`, `typeset`, `layout`, `harden`, `audit` and `polish`, especially for landing copy and visual discipline. Do not import Impeccable's own aesthetic; QUEUE/2 and the prototype prints remain the visual source of truth.
- **D-13:** `/login` and `/cadastro` remain separate routes, but each presents visual tabs for `Entrar` and `Criar conta` as cross-navigation.
- **D-14:** Secondary public auth screens (`/recuperar-senha`, `/verificar-email`) and `/parear` use the same compact public system: centered dry card, small brand mark, strong heading, direct form, clear accessible errors/states. `/parear` keeps create/join tabs and a prominent pairing code.

### Ritmo das rotas internas

- **D-15:** Apply the redesign through a shared visual system plus route-specific adjustments, not a blind global CSS skin. Shared primitives should cover headers, width, panels, tiles and empty states; each route still follows its target from the visual spec.
- **D-16:** `/app` is the authenticated visual anchor. Its first viewport should closely echo the print: small `LV / XP / STREAK` status line, a large empty/current-state hero, CTAs for `Descobrir`, `Roleta` and `Biblioteca`, and low rectangular tiles below.
- **D-17:** Biblioteca, Descobrir and Roleta use a strong first fold that communicates the route ritual. Filters, search, tabs and controls remain compact below or in a secondary band, not above the main experience.
- **D-18:** Desafios, Dupla and Perfil stay utilitarian and dry, but with strong hierarchy and prototype fidelity: fine borders, low rectangles, mono/uppercase labels, large numbers where meaningful, disciplined lime, compact aligned controls and no text overflow. They should feel like QUEUE/2 product UI, not generic settings screens.

### Estados vazios e copy editorial

- **D-19:** Empty states use short brutalist copy plus a clear action. Direction examples: `NADA NA FILA / AINDA`, `NADA AQUI AINDA /`, `BACKLOG VAZIO /`, `ESTANTE VAZIA / POR ENQUANTO`.
- **D-20:** Preserve the current `/2` SVG stroke loading system. Phase 7 may adjust the surrounding visual treatment, but must not replace it with a generic spinner. Reduced motion remains required.
- **D-21:** The highest-priority empty states are Home, Biblioteca, Roleta and Hall.
- **D-22:** Copy for incomplete features, especially Hall and Resenhas, must be honest and short. Use `em breve` or `por enquanto` language and avoid CTAs that imply an active flow.
- **D-23:** Empty states usually expose one primary action and at most one secondary action. The Home `/app` hero may use the three CTAs from the print: `Descobrir`, `Roleta` and `Biblioteca`.

### Disciplina visual dos componentes

- **D-24:** Reduce generic cards and keep dry panels like the prints: fine borders, low rectangles, fewer containers, more negative space. Cards are allowed for repeated items or real tools such as game lists, challenge cards, achievements or sessions. Do not nest cards inside cards.
- **D-25:** Lime is disciplined and violet is rare. Lime belongs to `/2`, active nav, CTAs, slashes, key numbers and selected states. Violet is only secondary contrast or special event emphasis.
- **D-26:** Typography uses strong headings, mono labels/numbers and legible body text. Use large uppercase display type only when hierarchy warrants it; do not use hero-scale text inside compact panels.
- **D-27:** Phase 7 gates must explicitly catch visual regressions: text overflow, incoherent overlap, broken contrast, invisible focus, small touch targets, mobile layout issues, screenshots, axe findings and reduced-motion behavior.

### the agent's Discretion

- Choose exact final landing subtitle, empty-state wording, tile labels and route helper copy through Impeccable-style `clarify` and `polish`, as long as copy stays short, direct, PT-BR and faithful to the prototype direction.
- Choose exact breakpoints, max-widths, sticky offsets, scroll rail behavior, spacing and border treatments as long as screenshots prove no overflow or overlap on desktop/mobile.
- Choose exact contextual placement for `Catalogo` and `Conquistas` links/tiles, provided they remain discoverable without entering the global top nav.
- Choose whether shared visual primitives live as CSS classes, UI package components or local app components according to existing architecture boundaries.

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

- Resenhas, full Hall da Moral shelf, replay timeline and completed-game memory experience belong to Phase 8.
- Full launch metadata, OG image, complete PWA/icon set and final public launch hardening remain Phase 8 unless already directly required by the Phase 7 visual spec.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRND-02 | User sees the `/2` brand mark in app icon, favicon and loading contexts. [VERIFIED: .planning/REQUIREMENTS.md] | Preserve `QueueMark` and `QueueLoading`, and keep `/2` visible in shell, landing, loading and app affordances. [VERIFIED: packages/ui/src/brand/mark.tsx; packages/ui/src/brand/loading.tsx] |
| BRND-04 | User sees Archivo Black for display, Inter Tight for body and JetBrains Mono for numerals and `/2`. [VERIFIED: .planning/REQUIREMENTS.md] | Keep existing `queue2Fonts` primitives and tokenized font families; validate route CSS does not override them with generic system-only display styling. [VERIFIED: packages/ui/src/brand/wordmark.tsx; packages/ui/src/tokens.css] |
| BRND-05 | User sees the roulette pointer motif as a recurring divider, current-game indicator or list marker. [VERIFIED: .planning/REQUIREMENTS.md] | Use existing `RoulettePointer` / `RouletteDivider` in active nav, section dividers and key empty/current-state markers. [VERIFIED: packages/ui/src/brand/mark.tsx; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] |
| BRND-06 | User sees a `/2` SVG stroke loading state instead of a generic spinner. [VERIFIED: .planning/REQUIREMENTS.md] | Do not replace `QueueLoading`; only restyle its surroundings and preserve reduced-motion behavior. [VERIFIED: packages/ui/src/brand/loading.tsx; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] |
| BRND-07 | User experiences calm utility screens and heightened spectacle only for meaningful moments. [VERIFIED: .planning/REQUIREMENTS.md] | Keep Desafios, Dupla and Perfil dry/utilitarian, and reserve spectacle for Roleta, match, achievement and level-up contexts. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md; .planning/phases/05-gamificacao-coletiva/05-CONTEXT.md; .planning/phases/06-roleta-e-economia/06-CONTEXT.md] |
| BRND-08 | User gets the same product capabilities on mobile and desktop with an adaptive composition. [VERIFIED: .planning/REQUIREMENTS.md] | Replace bottom-primary nav with sticky mobile top rail exposing the same seven primary routes as desktop. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] |
| BRND-09 | User can navigate core flows with keyboard, visible focus, readable contrast and adequate touch targets. [VERIFIED: .planning/REQUIREMENTS.md] | Reuse token focus ring and 44px-class button/input baselines; add Playwright checks for focus visibility, overlap and target size. [VERIFIED: packages/ui/src/tokens.css; apps/web/tests/accessibility.spec.ts; CITED: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html] |
| BRND-10 | User with reduced-motion preference receives an equivalent low-motion experience. [VERIFIED: .planning/REQUIREMENTS.md] | Preserve reduced-motion CSS reset and test Roleta/Descobrir/loading with Playwright `page.emulateMedia({ reducedMotion: "reduce" })`. [VERIFIED: packages/ui/src/tokens.css; apps/web/tests/accessibility.spec.ts; CITED: https://playwright.dev/docs/api/class-page] |
| BRND-11 | User sees appropriate single-line and stacked QUEUE/2 logo variants on dark and light backgrounds. [VERIFIED: .planning/REQUIREMENTS.md] | Reuse `QueueWordmark` variants rather than drawing new text logos per route. [VERIFIED: packages/ui/src/brand/wordmark.tsx] |
| BRND-12 | User sees global grain, sharp 4px or pill radii, and scanlines only inside the roulette experience. [VERIFIED: .planning/REQUIREMENTS.md] | Audit `globals.css` and `tokens.css` so grain is global/subtle, sharp radii remain tokenized, and scanline selectors stay roulette-scoped. [VERIFIED: apps/web/src/app/globals.css; packages/ui/src/tokens.css] |
| BRND-13 | User receives accessible QUEUE/2-styled toast feedback for important actions, with high-impact variants reserved for matches, achievements and level-ups. [VERIFIED: .planning/REQUIREMENTS.md] | Keep Sonner behavior through the UI package and do not convert routine visual route states into high-impact toasts. [VERIFIED: packages/ui/package.json; packages/ui/src/tokens.css; .planning/phases/05-gamificacao-coletiva/05-CONTEXT.md] |
| META-01 | Visitor sees a short scrollytelling landing with monumental `/2` hero, mini-roulette, three-step ritual, dashboard preview, Hall teaser and CTA. [VERIFIED: .planning/REQUIREMENTS.md] | Phase 7 must at minimum satisfy the locked first viewport, two CTAs and three-step ritual; broader launch metadata and final Hall experience remain Phase 8 unless directly required by the visual spec. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md] |
| META-02 | Visitor can reach custom QUEUE/2 login, signup and pairing pages. [VERIFIED: .planning/REQUIREMENTS.md] | Recompose `/login`, `/cadastro`, `/parear`, `/recuperar-senha` and `/verificar-email` into compact centered public surfaces without changing server actions. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; apps/web/src/app/(public)/cadastro/page.tsx; apps/web/src/app/(public)/parear/page.tsx] |
| SAFE-04 | Failed scheduled work can be retried without duplicating user-visible effects. [VERIFIED: .planning/REQUIREMENTS.md] | Do not touch job schemas, idempotency, economy or scheduled work logic; run existing reliability/security checks if any route uses status from jobs. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; .planning/SECURITY.md] |
| SAFE-05 | Secrets such as RAWG, email, auth and privileged database credentials never reach the browser. [VERIFIED: .planning/REQUIREMENTS.md] | Keep public visual work free of server secrets and run `pnpm check:secrets` plus bundle/source review for new environment references. [VERIFIED: package.json; .planning/SECURITY.md] |
</phase_requirements>

## Summary

Phase 7 is a visual parity and UX hardening phase, not a domain or data phase: the planner should schedule route composition, CSS/system primitives, public auth layout, authenticated shell replacement, route-level empty/current states and browser evidence while excluding schema, migrations, RLS, authorization, auth rules, XP/economy, roulette selection and discovery behavior changes. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]

The primary implementation pressure is replacing the current sidebar/bottom-nav shell with a sticky horizontal top shell and mobile route rail, then reworking public landing/auth and key internal first folds so the product stops reading as a generic SaaS dashboard. [VERIFIED: apps/web/src/components/app-shell.tsx; VERIFIED: apps/web/src/app/globals.css; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

Testing must be planned as part of the work, not as cleanup: existing tests assert old navigation and public landing behavior, and Phase 7 acceptance requires screenshots, mobile checks, reduced-motion checks, axe, focus, contrast, target-size, overflow and overlap evidence. [VERIFIED: apps/web/tests/accessibility.spec.ts; VERIFIED: apps/web/tests/brand-ui.test.tsx; VERIFIED: apps/web/tests/roulette-ui.test.tsx; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]

**Primary recommendation:** Plan Phase 7 as a presentation-only redesign with Wave 0 test/evidence harness updates, then shared shell/public-system work, then route-by-route visual parity, then a browser evidence gate that proves responsive layout, accessibility and security preservation. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: apps/web/playwright.config.ts; VERIFIED: apps/web/vitest.config.ts]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Public landing visual parity | Browser / Client | Frontend Server (SSR) | The visible composition and responsive behavior live in React/CSS, while the route remains an App Router server page with authenticated redirect behavior. [VERIFIED: apps/web/src/app/page.tsx; CITED: https://nextjs.org/docs/app/api-reference/functions/redirect] |
| Public login/signup/recovery/verification/pairing UX | Frontend Server (SSR) | Browser / Client | The pages submit existing server actions and must keep auth logic on the server; the browser owns layout, focus and error presentation. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; VERIFIED: apps/web/src/app/(public)/cadastro/page.tsx; VERIFIED: apps/web/src/app/(public)/parear/page.tsx; VERIFIED: .planning/SECURITY.md] |
| Authenticated horizontal app shell | Browser / Client | Frontend Server (SSR) | `AppShell` owns navigation composition for protected pages, while each route still receives server-derived session/duo state before rendering. [VERIFIED: apps/web/src/components/app-shell.tsx; VERIFIED: .planning/ARCHITECTURE.md] |
| Route first-fold redesign | Browser / Client | API / Backend | Visual hierarchy, panels, empty states and controls are presentation concerns; backing data and mutations stay in existing domain/application APIs. [VERIFIED: apps/web/src/app/app/page.tsx; VERIFIED: apps/web/src/app/app/biblioteca/page.tsx; VERIFIED: apps/web/src/app/app/descobrir/page.tsx; VERIFIED: .planning/ARCHITECTURE.md] |
| Roleta visual polish and reduced motion | Browser / Client | API / Backend | Reveal visuals and reduced-motion equivalents are client/presentation work; result selection, persistence, cost, pity and history remain server-authoritative. [VERIFIED: apps/web/src/app/app/roleta/page.tsx; VERIFIED: .planning/phases/06-roleta-e-economia/06-CONTEXT.md] |
| Hall prepared route | Frontend Server (SSR) | Browser / Client | The route can be added as a prepared/empty App Router page, but full Hall data/reviews/replay remain out of scope. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md] |
| Visual evidence and accessibility gate | Browser / Client | Test Runner | Playwright, axe and screenshot checks exercise rendered pages in Chromium and should not require new application domain code. [VERIFIED: apps/web/playwright.config.ts; CITED: https://playwright.dev/docs/accessibility-testing; CITED: https://playwright.dev/docs/screenshots] |
| Security preservation | API / Backend | Database / Storage | Visual work must not move authorization, secrets, RLS or business rules into UI/routes; the existing server/database contracts remain authoritative. [VERIFIED: .planning/SECURITY.md; VERIFIED: .planning/ARCHITECTURE.md; VERIFIED: AGENTS.md] |

## Project Constraints (from AGENTS.md)

- QUEUE/2 is a public responsive web product for fixed duos, and every product experience belongs to exactly two players. [VERIFIED: AGENTS.md]
- Gamification must reinforce the duo and must not create individual competitive progress. [VERIFIED: AGENTS.md]
- The v1 roadmap scope remains in v1; phase boundaries organize construction but do not remove planned functionality. [VERIFIED: AGENTS.md]
- The production base is Next.js App Router on Vercel, with the Lovable prototype used only as visual reference. [VERIFIED: AGENTS.md]
- The repository uses `pnpm` workspaces and Turborepo for web, database, UI and shared configuration packages. [VERIFIED: AGENTS.md]
- The modular monolith forbids deep imports between domain internals and forbids business rules in routes/UI. [VERIFIED: AGENTS.md]
- Duo data must not leak across duos; server authorization and RLS must be verified. [VERIFIED: AGENTS.md]
- Secrets such as `RAWG_API_KEY`, email credentials, auth secrets and privileged connections stay server-side. [VERIFIED: AGENTS.md]
- RAWG attribution, data freshness and source disclosure remain required where external game data is shown. [VERIFIED: AGENTS.md]
- UI must look intentional and specific to QUEUE/2, not like a SaaS template or generic neon arcade. [VERIFIED: AGENTS.md]
- Accessibility requirements include contrast, focus, touch targets and reduced-motion support. [VERIFIED: AGENTS.md]
- The main experience is in Brazilian Portuguese. [VERIFIED: AGENTS.md]
- `.planning/ARCHITECTURE.md` and `.planning/SECURITY.md` are binding before changing module boundaries, schema, auth, authorization, server actions, route handlers, jobs or integrations. [VERIFIED: AGENTS.md]
- Known critical or high security findings block phase completion. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

Use the existing pinned project stack; do not introduce a new component library, routing layer or animation framework for this visual parity phase. [VERIFIED: package.json; VERIFIED: apps/web/package.json; .planning/research/STACK.md]

| Library | Project Version | Latest Verified | Purpose | Why Standard |
|---------|-----------------|-----------------|---------|--------------|
| Next.js | 16.2.7 | 16.2.9, modified 2026-06-10 [VERIFIED: npm registry] | App Router, server pages, metadata, redirects and route composition. [VERIFIED: apps/web/package.json; CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] | It is the binding framework in project constraints and production architecture. [VERIFIED: AGENTS.md; .planning/research/STACK.md] |
| React | 19.2.7 | 19.2.7, modified 2026-06-08 [VERIFIED: npm registry] | Component layer for route UI and shell composition. [VERIFIED: apps/web/package.json] | It is already installed and compatible with the pinned Next.js app. [VERIFIED: apps/web/package.json; .planning/research/STACK.md] |
| TypeScript | 5.9.3 | 5.9.3 in project stack [VERIFIED: package.json; .planning/research/STACK.md] | Static typing for route props, shell navigation models and tests. [VERIFIED: package.json] | It supports architecture checks and typed shared UI contracts. [VERIFIED: package.json; .planning/ARCHITECTURE.md] |
| Tailwind CSS / CSS tokens | Tailwind 4.3.0 | 4.3.0, modified 2026-06-09 [VERIFIED: npm registry] | Token-backed styling, route CSS and visual system classes. [VERIFIED: apps/web/package.json; packages/ui/src/tokens.css] | Existing tokens and global CSS already implement QUEUE/2 color, radius, focus and motion baselines. [VERIFIED: packages/ui/src/tokens.css; apps/web/src/app/globals.css] |
| Motion | 12.40.0 | 12.40.0 [VERIFIED: npm registry] | Existing product animation and reduced-motion-aware spectacle. [VERIFIED: apps/web/package.json] | It is already part of the stack for roulette/match/level-up style moments; Phase 7 should not add another animation runtime. [VERIFIED: .planning/research/STACK.md; apps/web/package.json] |
| `@queue/ui` | workspace package | local workspace [VERIFIED: packages/ui/package.json] | Brand primitives, tokens, toasts, loading and shared UI contracts. [VERIFIED: packages/ui/package.json; packages/ui/src/brand/wordmark.tsx; packages/ui/src/brand/loading.tsx] | It contains existing QUEUE/2-specific primitives, so planners should reuse it before creating local duplicates. [VERIFIED: packages/ui/src/brand/mark.tsx; packages/ui/src/brand/wordmark.tsx] |

### Supporting

| Library | Project Version | Latest Verified | Purpose | When to Use |
|---------|-----------------|-----------------|---------|-------------|
| `@playwright/test` | 1.60.0 | 1.60.0 [VERIFIED: npm registry] | Browser screenshots, responsive checks, reduced-motion checks and rendered-page assertions. [VERIFIED: apps/web/package.json; apps/web/playwright.config.ts] | Use for Phase 7 evidence on landing, auth, app shell and internal routes. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md; CITED: https://playwright.dev/docs/screenshots] |
| `@axe-core/playwright` | 4.10.2 | 4.11.3 [VERIFIED: npm registry] | Automated accessibility scans in Playwright. [VERIFIED: apps/web/package.json; apps/web/tests/accessibility.spec.ts] | Use for public and key authenticated route accessibility gates; keep current project version unless a separate dependency bump is planned. [VERIFIED: apps/web/package.json; CITED: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md] |
| Vitest | 4.1.8 | 4.1.8 [VERIFIED: npm registry] | Unit/source tests for shell model, brand primitives and CSS/source guards. [VERIFIED: apps/web/package.json; apps/web/vitest.config.ts] | Use for fast checks that old nav patterns, spinner regressions or wrong route lists do not return. [VERIFIED: apps/web/tests/brand-ui.test.tsx; apps/web/tests/roulette-ui.test.tsx] |
| Testing Library | 16.3.2 | 16.3.2 [VERIFIED: npm registry] | Component render assertions for AppShell and public UI. [VERIFIED: apps/web/package.json] | Use when a DOM assertion is faster and less brittle than a full browser flow. [VERIFIED: apps/web/tests/brand-ui.test.tsx] |
| Sonner | 2.0.7 | 2.0.7 [VERIFIED: npm registry] | Toast behavior backing QUEUE/2-styled feedback. [VERIFIED: packages/ui/package.json] | Use existing toast path; do not create a custom notification engine for Phase 7. [VERIFIED: packages/ui/src/tokens.css; .planning/REQUIREMENTS.md] |
| Impeccable reference | external docs | README and skill source reviewed [CITED: https://github.com/pbakaus/impeccable/blob/main/README.md; CITED: https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md] | Design process checklist for AI-generated frontend work. [CITED: https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md] | Use as process vocabulary for `shape`, `critique`, `clarify`, `typeset`, `layout`, `harden`, `audit` and `polish`, not as visual style. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing CSS/tokens and `@queue/ui` | A new component library or default shadcn visual system | Rejected for Phase 7 because the project explicitly avoids a generic SaaS look and already has QUEUE/2 primitives. [VERIFIED: AGENTS.md; VERIFIED: packages/ui/src/tokens.css] |
| Playwright screenshots and targeted assertions | Golden screenshot snapshots for every route | Golden screenshots can be useful later, but Playwright warns visual comparisons vary by host OS/browser rendering; Phase 7 should prioritize evidence screenshots plus semantic layout/a11y assertions. [CITED: https://playwright.dev/docs/test-snapshots; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md] |
| Existing Motion dependency | CSS-only custom animation system | Rejected for roulette/spectacle changes because Motion is already installed and project-approved; custom animation logic increases reduced-motion risk. [VERIFIED: apps/web/package.json; .planning/research/STACK.md] |
| Existing Better Auth/server actions | Client-only auth form logic | Rejected because security contracts require server-side authorization, validation and secret isolation. [VERIFIED: .planning/SECURITY.md; VERIFIED: apps/web/src/app/(public)/login/page.tsx] |

**Installation:**

No new runtime dependency is required for the recommended Phase 7 plan. [VERIFIED: package.json; apps/web/package.json]

```bash
# Prefer no dependency install for Phase 7 visual parity.
pnpm install
```

**Version verification:**

```bash
npm view next version time.modified
npm view react version time.modified
npm view tailwindcss version time.modified
npm view motion version
npm view @playwright/test version
npm view @axe-core/playwright version
npm view vitest version
npm view @testing-library/react version
npm view sonner version
```

The registry check showed Next.js latest is newer than the pinned project version, but Phase 7 should not bundle a Next.js upgrade into visual parity unless the planner creates an explicit dependency-update task with its own verification scope. [VERIFIED: npm registry; VERIFIED: apps/web/package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Public visitor / authenticated user
  |
  v
Next.js App Router pages and layouts
  |-- public landing: redirect authenticated users -> /app
  |-- public auth pages: render compact UI -> existing server actions
  |-- protected /app routes: require verified session and duo state
  |
  v
Presentation layer
  |-- AppShell top nav + mobile route rail
  |-- shared QUEUE/2 visual primitives and CSS tokens
  |-- route first-fold compositions and empty states
  |
  v
Existing application/domain public APIs
  |-- duo/auth/library/discovery/play/gamification/roulette modules
  |-- no new business decisions in routes or components
  |
  v
Server/database contracts
  |-- Better Auth sessions
  |-- Neon Postgres with RLS and least-privileged access
  |-- jobs/idempotency/economy remain unchanged

Validation flow:
route implementation -> Vitest source/component guards -> Playwright desktop/mobile/reduced-motion screenshots -> axe/accessibility/layout assertions -> existing verify/security checks
```

This diagram reflects existing App Router, modular monolith and server/database boundaries; Phase 7 should only change the presentation layer unless an accessibility issue requires a route-level presentation adjustment. [VERIFIED: .planning/ARCHITECTURE.md; VERIFIED: .planning/SECURITY.md; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

### Recommended Project Structure

```text
apps/web/src/
├── app/
│   ├── page.tsx                         # public landing, authenticated redirect preserved
│   ├── (public)/login/page.tsx          # compact auth route
│   ├── (public)/cadastro/page.tsx       # compact auth route
│   ├── (public)/parear/page.tsx         # compact pairing route with create/join tabs
│   └── app/
│       ├── page.tsx                     # authenticated visual anchor
│       ├── biblioteca/page.tsx          # route first-fold redesign
│       ├── descobrir/page.tsx           # deck-first redesign
│       ├── roleta/page.tsx              # ritual visual polish, server result unchanged
│       ├── desafios/page.tsx            # dry utility layout
│       ├── hall/page.tsx                # prepared empty route only
│       ├── dupla/page.tsx               # dry utility layout
│       └── perfil/page.tsx              # compact settings/session layout
├── components/
│   └── app-shell.tsx                    # top nav and mobile horizontal rail
└── tests/
    ├── phase-7-visual.spec.ts           # new browser evidence suite
    ├── accessibility.spec.ts            # update old nav expectations
    ├── brand-ui.test.tsx                # update landing/shell guards
    └── roulette-ui.test.tsx             # update nav/source guards

packages/ui/src/
├── brand/                               # preserve wordmark, mark, pointer, loading
└── tokens.css                           # focus, radii, colors, reduced motion, toast
```

The structure above maps to existing files and the one missing Phase 7 route `/app/hall`; it keeps shared brand primitives in `@queue/ui` and app-specific composition in `apps/web`. [VERIFIED: apps/web/src/components/app-shell.tsx; VERIFIED: packages/ui/src/brand/wordmark.tsx; VERIFIED: packages/ui/src/brand/loading.tsx; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

### Pattern 1: Server-First Route Composition

**What:** Keep protected pages as server-rendered route compositions that fetch/authorize existing server state, then pass that state into visual components. [VERIFIED: apps/web/src/app/app/page.tsx; VERIFIED: .planning/ARCHITECTURE.md]

**When to use:** Use for `/app`, Biblioteca, Descobrir, Roleta, Desafios, Hall, Dupla and Perfil visual changes. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]

**Example:**

```tsx
// Source: existing App Router protected route pattern.
// Verified against apps/web/src/app/app/page.tsx and Next redirect docs.
import { AppShell } from "@/components/app-shell";
import { requireVerifiedSession } from "@/lib/auth/session";

export default async function AppHomePage() {
  const session = await requireVerifiedSession();
  const duoState = await loadExistingDuoState(session.user.id);

  return (
    <AppShell currentPage="dashboard">
      <HomeVisualAnchor state={duoState} />
    </AppShell>
  );
}
```

The planner should treat the example as a shape reference; exact imports must follow existing module public entrypoints in the codebase. [VERIFIED: .planning/ARCHITECTURE.md; CITED: https://nextjs.org/docs/app/api-reference/functions/redirect]

### Pattern 2: Shared Visual System, Route-Specific Targets

**What:** Build a small set of shared classes/components for shell, route width, section headers, dry panels, low tiles, empty states and CTA rows, then tune each route to its locked target. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]

**When to use:** Use this for all affected routes so Phase 7 avoids both duplication and a blind global CSS skin. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

**Example:**

```tsx
// Source: Phase 7 locked navigation decisions and existing @queue/ui brand primitives.
const primaryNavigation = [
  { href: "/app", label: "Home", page: "dashboard" },
  { href: "/app/biblioteca", label: "Biblioteca", page: "biblioteca" },
  { href: "/app/descobrir", label: "Descobrir", page: "descobrir" },
  { href: "/app/roleta", label: "Roleta", page: "roleta" },
  { href: "/app/desafios", label: "Desafios", page: "desafios" },
  { href: "/app/hall", label: "Hall", page: "hall" },
  { href: "/app/dupla", label: "Dupla", page: "dupla" },
] as const;
```

The current `AppShell` includes `Catalogo`, `Conquistas` and `Perfil` as primary nav items, so tests and implementation must change together. [VERIFIED: apps/web/src/components/app-shell.tsx; VERIFIED: apps/web/tests/brand-ui.test.tsx; VERIFIED: apps/web/tests/roulette-ui.test.tsx]

### Pattern 3: Evidence-First Visual Gates

**What:** Capture desktop/mobile screenshots, run axe, emulate reduced motion and assert layout geometry for overlap/target-size failures. [VERIFIED: apps/web/tests/accessibility.spec.ts; CITED: https://playwright.dev/docs/accessibility-testing; CITED: https://playwright.dev/docs/screenshots]

**When to use:** Use for landing, login, cadastro, `/app`, Biblioteca, Descobrir, Roleta, Desafios, Dupla and Perfil, plus `/app/hall` if added. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]

**Example:**

```ts
// Source: Playwright and axe-core official docs; aligned with apps/web/tests/accessibility.spec.ts.
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing is accessible and stable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "test-results/phase-7/landing-mobile.png", fullPage: true });
});
```

Playwright supports reduced-motion emulation, screenshots and element geometry APIs, and axe-core supports Playwright scans with WCAG tags. [CITED: https://playwright.dev/docs/api/class-page; CITED: https://playwright.dev/docs/screenshots; CITED: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md]

### Anti-Patterns to Avoid

- **Blind global CSS skin:** A single broad restyle risks breaking route-specific rituals and old functionality; use shared primitives plus route-specific targets. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- **Moving business rules into UI:** Routes and components must not decide XP, roulette results, duo permissions or discovery behavior. [VERIFIED: .planning/ARCHITECTURE.md; VERIFIED: .planning/phases/06-roleta-e-economia/06-CONTEXT.md]
- **Keeping the old bottom nav primary:** Phase 7 explicitly requires sticky top mobile rail and forbids hiding primary routes behind a drawer. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- **Treating axe as complete evidence:** Axe is necessary but not sufficient for overlap, overflow, target size, visual hierarchy and reduced-motion equivalence. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md; CITED: https://playwright.dev/docs/accessibility-testing]
- **Scope-creeping Hall:** Phase 7 can show a prepared Hall state, but reviews, replay timeline, shelf memory and full Hall behavior belong to Phase 8. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md]
- **Bundling dependency upgrades:** Registry checks show some packages have newer versions than project pins, but Phase 7 should not mix visual parity with framework/dependency upgrades without a separate task. [VERIFIED: npm registry; VERIFIED: apps/web/package.json]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brand wordmark and `/2` mark | Per-route text logos or ad hoc SVG copies | `QueueWordmark`, `QueueMark`, `RoulettePointer`, `RouletteDivider` | Existing primitives encode QUEUE/2 typography, mark and pointer motifs. [VERIFIED: packages/ui/src/brand/wordmark.tsx; packages/ui/src/brand/mark.tsx] |
| Loading indicator | Generic spinner or custom CSS loader | `QueueLoading` | Phase 7 explicitly preserves the `/2` SVG stroke loading system and reduced-motion behavior. [VERIFIED: packages/ui/src/brand/loading.tsx; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] |
| Auth and pairing behavior | Client-only auth/pairing state machine | Existing server actions and Better Auth integration | Security contracts keep auth, sessions, validation and secrets on the server. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; VERIFIED: apps/web/src/app/(public)/parear/page.tsx; VERIFIED: .planning/SECURITY.md] |
| Accessibility scanning | Custom DOM scanner | `@axe-core/playwright` plus existing geometry helpers | axe-core provides Playwright integration and existing tests already have overlap/target helpers. [VERIFIED: apps/web/tests/accessibility.spec.ts; CITED: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md] |
| Screenshot capture | Browser-specific manual screenshots only | Playwright `page.screenshot()` in a phase evidence suite | Playwright has official screenshot support and project config already targets Chromium. [VERIFIED: apps/web/playwright.config.ts; CITED: https://playwright.dev/docs/screenshots] |
| Touch target policy | New arbitrary target threshold | Existing QUEUE/2 44px controls plus WCAG 2.2 minimum awareness | WCAG 2.2 target-size minimum is 24 CSS px with spacing exceptions, while the project token baseline uses larger 44px controls. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html; VERIFIED: packages/ui/src/tokens.css] |
| Route metadata/redirects | Manual browser redirects in client components | Next.js App Router metadata and server redirect utilities | Next supports metadata on server route files and server redirects; keeping this server-side avoids client auth flicker. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata; CITED: https://nextjs.org/docs/app/api-reference/functions/redirect] |

**Key insight:** The hard part of Phase 7 is not inventing new UI mechanics; it is replacing the product's visual grammar while preserving server authority, duo scope, route capabilities, accessibility and existing Phase 1-6 behavior. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: .planning/ARCHITECTURE.md; VERIFIED: .planning/SECURITY.md]

## Runtime State Inventory

Phase 7 is a visual refactor/presentation migration without a product rename or storage key rename; runtime-state checks still matter because visual work must not require data migrations or service re-registration. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None for Phase 7; schema, migrations, RLS, domain rules, XP/economy, roulette selection and discovery behavior are out of scope. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | No data migration; preserve existing reads/mutations. [VERIFIED: .planning/SECURITY.md] |
| Live service config | None identified for visual parity; no external service configuration change is required by the locked scope. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | No API patch or service UI change; keep deployment/env configuration unchanged. [VERIFIED: .planning/SECURITY.md] |
| OS-registered state | None identified; Phase 7 does not register Windows services, scheduled tasks or local daemons. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: package.json] | No OS re-registration. [VERIFIED: package.json] |
| Secrets/env vars | Existing `.env.local` contains E2E/test variables and server-side credentials, but Phase 7 needs no new secret names. [VERIFIED: environment audit; .planning/SECURITY.md] | Do not expose secrets in client code, screenshots or public env names; run `pnpm check:secrets`. [VERIFIED: package.json; .planning/SECURITY.md] |
| Build artifacts | No generated artifact rename required; a prior command left `apps/web/next-env.d.ts` modified in the worktree before this research file was written. [VERIFIED: git status] | Do not revert unrelated worktree changes; planner can ignore this artifact unless implementation touches it. [VERIFIED: git status; AGENTS.md] |

**Nothing found in category:** All five runtime categories were checked for Phase 7 scope, and no runtime migration is required. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: environment audit]

## Common Pitfalls

### Pitfall 1: Treating Phase 7 as "CSS Polish"

**What goes wrong:** The shell, public auth, route first folds, empty states and tests are only partially updated, so the product still feels like the old SaaS dashboard. [VERIFIED: apps/web/src/components/app-shell.tsx; apps/web/src/app/globals.css; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]  
**Why it happens:** The current sidebar, bottom nav, public grid and card-heavy surfaces are spread across shared shell, global CSS and individual routes. [VERIFIED: apps/web/src/components/app-shell.tsx; apps/web/src/app/globals.css]  
**How to avoid:** Plan shell, public system, shared route primitives and per-route target passes as separate work items with screenshots. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**Warning signs:** Old `app-sidebar`, `app-bottom-nav`, three-CTA landing, generic card nests or old route names remain in tests/screenshots. [VERIFIED: apps/web/src/components/app-shell.tsx; apps/web/src/app/page.tsx; apps/web/tests/brand-ui.test.tsx]

### Pitfall 2: Updating AppShell Without Updating Tests

**What goes wrong:** Tests continue asserting `Catalogo`, `Conquistas` and `Perfil` as primary navigation, or mobile bottom nav as the expected pattern. [VERIFIED: apps/web/tests/brand-ui.test.tsx; apps/web/tests/roulette-ui.test.tsx; apps/web/tests/accessibility.spec.ts]  
**Why it happens:** Phase 7 changes locked navigation semantics, not just labels. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**How to avoid:** Make Wave 0 update source/component/browser expectations to the seven primary top-nav routes and contextual Catalogo/Conquistas access. [VERIFIED: apps/web/src/components/app-shell.tsx; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**Warning signs:** A test says Roleta must sit between Biblioteca and Conquistas, or mobile checks query `.app-bottom-nav`. [VERIFIED: apps/web/tests/roulette-ui.test.tsx; apps/web/tests/accessibility.spec.ts]

### Pitfall 3: Accidentally Weakening Security While Reworking Forms

**What goes wrong:** Auth routes become visually compact but move validation, state or error handling into client-only code. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; apps/web/src/app/(public)/cadastro/page.tsx; .planning/SECURITY.md]  
**Why it happens:** Visual tab/cross-nav work can look like a form rewrite. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**How to avoid:** Keep existing server actions, status toasts, rate-limit/security audit behavior and accessible errors; only change composition and presentation. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; apps/web/src/app/(public)/parear/page.tsx; .planning/SECURITY.md]  
**Warning signs:** New client components read auth secrets, submit directly to external auth APIs, or bypass existing actions. [VERIFIED: .planning/SECURITY.md; SAFE-05 in .planning/REQUIREMENTS.md]

### Pitfall 4: Hall Scope Creep

**What goes wrong:** Planning expands into reviews, side-by-side scoring, shelf replay or timeline work. [VERIFIED: .planning/REQUIREMENTS.md]  
**Why it happens:** Phase 7 adds `Hall` to top nav, which can be misread as full Hall implementation. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**How to avoid:** Add `/app/hall` only as an honest prepared empty state unless existing content already exists. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**Warning signs:** Tasks mention review schema, review forms, Hall shelf persistence or replay timeline. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

### Pitfall 5: Accessibility Regressions Hidden by Visual Fidelity

**What goes wrong:** Monumental type, uppercase labels, sticky rails and compact cards create overlap, overflow, unreadable focus or small hit targets. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]  
**Why it happens:** Prototype fidelity can be over-applied to responsive content without browser evidence. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
**How to avoid:** Use fixed evidence viewports, focus walks, target-size checks, reduced-motion checks and screenshots on every major route. [VERIFIED: apps/web/tests/accessibility.spec.ts; CITED: https://playwright.dev/docs/api/class-page; CITED: https://playwright.dev/docs/screenshots]  
**Warning signs:** Text uses viewport-scaled font sizing, negative letter spacing, clipped rail labels or CTAs below 44px in project controls. [VERIFIED: packages/ui/src/tokens.css; AGENTS.md]

## Code Examples

Verified patterns from local source and official docs:

### Top Navigation Model

```tsx
// Source: Phase 7 D-02/D-03 and existing AppShell integration point.
type AppShellPage =
  | "dashboard"
  | "biblioteca"
  | "descobrir"
  | "roleta"
  | "desafios"
  | "hall"
  | "dupla"
  | "perfil";

const primaryNavigation = [
  { href: "/app", label: "Home", page: "dashboard" },
  { href: "/app/biblioteca", label: "Biblioteca", page: "biblioteca" },
  { href: "/app/descobrir", label: "Descobrir", page: "descobrir" },
  { href: "/app/roleta", label: "Roleta", page: "roleta" },
  { href: "/app/desafios", label: "Desafios", page: "desafios" },
  { href: "/app/hall", label: "Hall", page: "hall" },
  { href: "/app/dupla", label: "Dupla", page: "dupla" },
] as const;
```

This model keeps `Perfil` as an account-side destination and removes `Catalogo`/`Conquistas` from the global primary list. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: apps/web/src/components/app-shell.tsx]

### Public Auth Cross-Tabs

```tsx
// Source: Phase 7 D-13; preserve separate /login and /cadastro routes.
const authTabs = [
  { href: "/login", label: "Entrar", active: currentRoute === "/login" },
  { href: "/cadastro", label: "Criar conta", active: currentRoute === "/cadastro" },
] as const;
```

The tabs are visual cross-navigation, not a client-side auth state machine. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; VERIFIED: apps/web/src/app/(public)/login/page.tsx; VERIFIED: apps/web/src/app/(public)/cadastro/page.tsx]

### Browser Evidence Helper

```ts
// Source: Playwright screenshots, reduced motion and axe Playwright docs.
async function capturePhase7Evidence(page, name: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const axeResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(axeResults.violations).toEqual([]);
  await page.screenshot({ path: `test-results/phase-7/${name}.png`, fullPage: true });
}
```

This helper should be paired with route-specific checks for active nav, text overflow, touch targets and no incoherent overlap. [VERIFIED: apps/web/tests/accessibility.spec.ts; CITED: https://playwright.dev/docs/accessibility-testing; CITED: https://playwright.dev/docs/screenshots]

## State of the Art

| Old Approach | Current Phase 7 Approach | When Changed | Impact |
|--------------|--------------------------|--------------|--------|
| Sidebar-first desktop shell and bottom mobile nav. [VERIFIED: apps/web/src/components/app-shell.tsx] | Sticky top nav with seven primary routes and mobile horizontal rail. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | Phase 7 context gathered 2026-06-09. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | AppShell, route tests and accessibility checks must be updated together. [VERIFIED: apps/web/tests/accessibility.spec.ts] |
| Public landing with feature-heavy two-column hero and three CTAs. [VERIFIED: apps/web/src/app/page.tsx] | Monumental QUEUE/2 first viewport, official tagline, two CTAs and three-step ritual below the fold. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | Phase 7 context gathered 2026-06-09. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | META-01 planning should target short scrollytelling without turning into a SaaS landing. [VERIFIED: .planning/REQUIREMENTS.md] |
| Public auth pages as larger intro-plus-form grids. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; apps/web/src/app/globals.css] | Compact centered public system with dry card, strong heading, accessible errors and auth cross-tabs. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | Phase 7 context gathered 2026-06-09. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] | Auth server actions stay intact while visual hierarchy changes. [VERIFIED: .planning/SECURITY.md] |
| Route cards and panels that can read as SaaS dashboard UI. [VERIFIED: apps/web/src/app/globals.css] | Dry panels, fine borders, low rectangles, mono labels, disciplined lime and route-specific first folds. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md] | Phase 7 visual spec locked 2026-06-09. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md] | Planner should allocate per-route visual tasks rather than a single global theme pass. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md] |
| Manual visual review without route evidence artifacts. [VERIFIED: existing phase 7 research audit] | Playwright screenshots, axe, reduced motion, overlap, overflow and target-size checks. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md; CITED: https://playwright.dev/docs/accessibility-testing] | Phase 7 acceptance evidence locked 2026-06-09. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md] | Phase gate should produce artifacts the user can inspect. [VERIFIED: apps/web/playwright.config.ts] |
| Tailwind utility theme variables for all design token needs. [CITED: https://tailwindcss.com/docs/theme] | Existing `:root` CSS variables remain valid for plain CSS classes; use Tailwind `@theme` only when new utility generation is needed. [VERIFIED: packages/ui/src/tokens.css; CITED: https://tailwindcss.com/docs/theme] | Tailwind 4 docs current at research time. [CITED: https://tailwindcss.com/docs/theme] | Planner should avoid a token migration unless implementation needs new generated Tailwind utilities. [VERIFIED: packages/ui/src/tokens.css] |

**Deprecated/outdated for this phase:**

- `app-sidebar` as the primary authenticated navigation pattern is outdated for Phase 7. [VERIFIED: apps/web/src/components/app-shell.tsx; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- `.app-bottom-nav` as the mobile primary navigation pattern is outdated for Phase 7. [VERIFIED: apps/web/src/components/app-shell.tsx; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- Nine primary nav items including `Catalogo`, `Conquistas` and `Perfil` are outdated for Phase 7. [VERIFIED: apps/web/src/components/app-shell.tsx; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- Generic spinner loading is forbidden by Phase 7 and BRND-06. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- Long SaaS-style landing composition is forbidden by Phase 7. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

## Assumptions Log

All claims in this research were verified against local project files, npm registry output, official documentation, Context7 CLI output or cited project references; no `[ASSUMED]` claims were used. [VERIFIED: research audit]

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None | — | — |

## Open Questions

1. **Prototype image assets are not present in the repository.**  
   What we know: the locked visual spec and context define the prototype direction, but a file search found no local PNG/JPG/WebP/Figma/prototype screenshot assets. [VERIFIED: rg audit; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]  
   What's unclear: whether the planner should require live inspection of `https://queue2.lovable.app/` or rely only on the locked visual spec. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
   Recommendation: plan from `07-VISUAL-SPEC.md` as binding and optionally capture live prototype references before implementation if access is available. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

2. **Hall URL changed relative to older product language.**  
   What we know: Phase 7 context and visual spec name `/app/hall`, while broader product docs discuss Hall da Moral as a future feature family. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md; .planning/PROJECT.md; .planning/REQUIREMENTS.md]  
   What's unclear: whether any old copy should mention "Hall da Moral" on the prepared state. [VERIFIED: .planning/PROJECT.md]  
   Recommendation: implement `/app/hall` as the route and keep the visible copy short/honest, such as `ESTANTE VAZIA / POR ENQUANTO`, without adding Phase 8 behavior. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

3. **META-01 is broader than the Phase 7 landing lock.**  
   What we know: META-01 mentions mini-roulette, dashboard preview and Hall teaser, while Phase 7 context locks a monumental first viewport, two CTAs and three-step ritual, with final launch metadata and complete Hall work deferred. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
   What's unclear: how much of META-01 beyond the first viewport and three-step ritual should be implemented before Phase 8. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]  
   Recommendation: satisfy the Phase 7 visual spec first and keep any teaser sections short, non-functional and faithful to the locked scope. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js, pnpm scripts, test runners | Yes | 24.15.0 [VERIFIED: environment audit] | None needed. [VERIFIED: package.json] |
| pnpm | Workspace scripts and dependency execution | Yes | 11.5.1 [VERIFIED: environment audit] | None needed. [VERIFIED: package.json] |
| npm | Registry verification and Context7 CLI fallback | Yes | 11.12.1 [VERIFIED: environment audit] | Use pnpm for project scripts if npm is not needed. [VERIFIED: package.json] |
| Playwright CLI | Browser evidence and screenshots | Yes | 1.60.0 [VERIFIED: environment audit] | None needed for Chromium evidence. [VERIFIED: apps/web/package.json] |
| Chromium browser for Playwright | Desktop/mobile browser verification | Yes | Chrome for Testing 148.0.7778.96 installed under Playwright cache [VERIFIED: environment audit] | Run `pnpm --filter @queue/web exec playwright install chromium` if cache is missing on another machine. [VERIFIED: environment audit] |
| `.env.local` E2E ready users | Authenticated route screenshots | Present in file, not process env | Values not printed for safety [VERIFIED: environment audit] | Load `.env.local` in phase gate the same way existing scripts do. [VERIFIED: scripts/phase-6-gate.mjs] |
| `TEST_DATABASE_URL` | Integration/e2e auth fixtures | Present in `.env.local`, not process env | Value not printed for safety [VERIFIED: environment audit] | Use existing env-loading pattern before DB-backed tests. [VERIFIED: scripts/phase-6-gate.mjs] |
| `E2E_PHASE6_ELIGIBLE_SLUGS` | Phase 6 full roulette flow reuse | Missing in `.env.local` | — [VERIFIED: environment audit] | Phase 7 visual evidence can use route screenshots and seeded existing states; only require this var if reusing the Phase 6 full-result flow. [VERIFIED: scripts/phase-6-gate.mjs] |
| Context7 CLI (`ctx7`) | Library documentation lookup | Yes via `npx --yes ctx7@latest` | latest resolved during research [VERIFIED: Context7 CLI] | Official docs/web search if CLI fails. [VERIFIED: documentation lookup] |

**Missing dependencies with no fallback:**

- None identified for research and planning. [VERIFIED: environment audit]

**Missing dependencies with fallback:**

- `E2E_PHASE6_ELIGIBLE_SLUGS` is missing in `.env.local`; Phase 7 can avoid depending on Phase 6 result-flow setup unless the planner chooses to rerun the full roulette gate. [VERIFIED: environment audit; scripts/phase-6-gate.mjs]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit/source framework | Vitest 4.1.8. [VERIFIED: apps/web/package.json; VERIFIED: apps/web/vitest.config.ts] |
| Browser framework | Playwright 1.60.0. [VERIFIED: apps/web/package.json; VERIFIED: apps/web/playwright.config.ts] |
| Accessibility scanner | `@axe-core/playwright` 4.10.2 installed; latest verified 4.11.3. [VERIFIED: apps/web/package.json; VERIFIED: npm registry] |
| Config files | `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`. [VERIFIED: apps/web/vitest.config.ts; apps/web/playwright.config.ts] |
| Quick run command | `pnpm --filter @queue/web test -- brand-ui roulette-ui` for existing fast guards, then add Phase 7-specific names after Wave 0. [VERIFIED: package.json; apps/web/package.json] |
| Browser run command | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts` after the file exists. [VERIFIED: apps/web/playwright.config.ts] |
| Full suite command | `pnpm verify`. [VERIFIED: package.json] |
| Phase gate command | Add `pnpm phase:7:gate` following the `scripts/phase-6-gate.mjs` pattern. [VERIFIED: scripts/phase-6-gate.mjs; package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| BRND-02 | `/2` mark appears in loading and shell/landing contexts. [VERIFIED: .planning/REQUIREMENTS.md] | unit/source + browser smoke | `pnpm --filter @queue/web test -- brand-ui` | Existing, update required. [VERIFIED: apps/web/tests/brand-ui.test.tsx] |
| BRND-04 | Fonts remain Archivo Black, Inter Tight and JetBrains Mono for intended roles. [VERIFIED: .planning/REQUIREMENTS.md] | source/component | `pnpm --filter @queue/web test -- brand-ui` | Existing, update required. [VERIFIED: apps/web/tests/brand-ui.test.tsx] |
| BRND-05 | Pointer motif appears in nav/section/current markers. [VERIFIED: .planning/REQUIREMENTS.md] | unit/source + browser | `pnpm --filter @queue/web test -- roulette-ui && pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts` | Partial existing; browser file missing. [VERIFIED: apps/web/tests/roulette-ui.test.tsx] |
| BRND-06 | No generic spinner replaces `/2` loader. [VERIFIED: .planning/REQUIREMENTS.md] | source/component | `pnpm --filter @queue/web test -- brand-ui` | Existing, update required. [VERIFIED: apps/web/tests/brand-ui.test.tsx] |
| BRND-07 | Calm utility screens and spectacle only for meaningful moments. [VERIFIED: .planning/REQUIREMENTS.md] | browser screenshot + source audit | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts` | Missing; Wave 0. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md] |
| BRND-08 | Mobile and desktop expose same core capabilities through adaptive top/nav rail. [VERIFIED: .planning/REQUIREMENTS.md] | browser responsive | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "navigation"` | Missing; Wave 0. [VERIFIED: apps/web/tests/accessibility.spec.ts] |
| BRND-09 | Keyboard focus, contrast, touch targets and no overlap hold. [VERIFIED: .planning/REQUIREMENTS.md] | Playwright + axe | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "accessibility"` | Partial existing; update required. [VERIFIED: apps/web/tests/accessibility.spec.ts] |
| BRND-10 | Reduced-motion user receives equivalent low-motion experience. [VERIFIED: .planning/REQUIREMENTS.md] | Playwright reduced-motion | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "reduced motion"` | Partial existing; update required. [VERIFIED: apps/web/tests/accessibility.spec.ts] |
| BRND-11 | Logo variants remain appropriate on dark/light contexts. [VERIFIED: .planning/REQUIREMENTS.md] | component/source | `pnpm --filter @queue/web test -- brand-ui` | Existing, update required. [VERIFIED: apps/web/tests/brand-ui.test.tsx] |
| BRND-12 | Grain/radius/scanline scope remains correct. [VERIFIED: .planning/REQUIREMENTS.md] | source guard + browser visual | `pnpm --filter @queue/web test -- brand-ui && pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts` | Partial existing; browser file missing. [VERIFIED: apps/web/src/app/globals.css; apps/web/tests/brand-ui.test.tsx] |
| BRND-13 | Toasts remain accessible and high-impact variants stay reserved. [VERIFIED: .planning/REQUIREMENTS.md] | unit/source | `pnpm --filter @queue/web test -- brand-ui` | Existing, update required. [VERIFIED: apps/web/tests/brand-ui.test.tsx] |
| META-01 | Landing shows monumental brand-first first viewport and short ritual structure. [VERIFIED: .planning/REQUIREMENTS.md] | browser screenshot + component/source | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "landing"` | Missing; Wave 0. [VERIFIED: apps/web/src/app/page.tsx] |
| META-02 | Login, signup and pairing pages remain reachable and custom. [VERIFIED: .planning/REQUIREMENTS.md] | browser route smoke + axe | `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts --grep "public auth"` | Missing; Wave 0. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; apps/web/src/app/(public)/parear/page.tsx] |
| SAFE-04 | Scheduled work retry semantics are not changed. [VERIFIED: .planning/REQUIREMENTS.md] | source/security regression | `pnpm check:architecture && pnpm verify` | Existing commands. [VERIFIED: package.json] |
| SAFE-05 | Secrets do not reach browser. [VERIFIED: .planning/REQUIREMENTS.md] | secret scan + source review | `pnpm check:secrets` | Existing command. [VERIFIED: package.json] |

### Sampling Rate

- **Per task commit:** `pnpm --filter @queue/web test -- brand-ui roulette-ui` plus route-specific Playwright grep for touched surface. [VERIFIED: apps/web/package.json; apps/web/playwright.config.ts]
- **Per wave merge:** `pnpm --filter @queue/web exec playwright test tests/phase-7-visual.spec.ts` plus `pnpm check:architecture` and `pnpm check:secrets`. [VERIFIED: package.json; apps/web/playwright.config.ts]
- **Phase gate:** `pnpm verify` and a new `pnpm phase:7:gate` that captures evidence artifacts before `$gsd-verify-work`. [VERIFIED: package.json; scripts/phase-6-gate.mjs]

### Wave 0 Gaps

- [ ] `apps/web/tests/phase-7-visual.spec.ts` — covers landing, auth pages, AppShell nav, desktop/mobile screenshots, reduced motion, no overlap, target size and route empty states. [VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]
- [ ] `apps/web/tests/accessibility.spec.ts` — update old sidebar/bottom-nav expectations to the new top shell and mobile rail. [VERIFIED: apps/web/tests/accessibility.spec.ts]
- [ ] `apps/web/tests/brand-ui.test.tsx` — update public landing and AppShell assertions from old CTA/nav model to Phase 7 decisions. [VERIFIED: apps/web/tests/brand-ui.test.tsx]
- [ ] `apps/web/tests/roulette-ui.test.tsx` — update source guards that expect old nav order and Conquistas primary placement. [VERIFIED: apps/web/tests/roulette-ui.test.tsx]
- [ ] `scripts/phase-7-gate.mjs` and root `phase:7:gate` script — mirror the existing phase-gate pattern but focus on visual evidence, screenshots, axe and preservation checks. [VERIFIED: scripts/phase-6-gate.mjs; package.json]

## Security Domain

### Applicable ASVS Categories

OWASP ASVS is a basis for testing technical security controls in web applications, and the project requires ASVS Level 2 assurance before launch. [CITED: https://owasp.org/www-project-application-security-verification-standard/; VERIFIED: AGENTS.md; VERIFIED: .planning/SECURITY.md]

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Preserve Better Auth/self-hosted server actions and do not move auth decisions to client UI. [VERIFIED: .planning/SECURITY.md; apps/web/src/app/(public)/login/page.tsx] |
| V3 Session Management | Yes | Preserve server-side session verification, logout and session revocation flows while changing layout. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; apps/web/src/app/app/perfil/page.tsx; .planning/SECURITY.md] |
| V4 Access Control | Yes | Protected pages must continue to require server-authorized session/duo state and RLS-backed data access. [VERIFIED: .planning/SECURITY.md; .planning/ARCHITECTURE.md] |
| V5 Input Validation | Yes | Existing server actions and validation remain the authority for auth, pairing, profile and route mutations. [VERIFIED: apps/web/src/app/(public)/parear/page.tsx; .planning/SECURITY.md] |
| V6 Cryptography | Yes by preservation | Do not add custom crypto or expose auth/DB/email/RAWG secrets in browser code. [VERIFIED: SAFE-05 in .planning/REQUIREMENTS.md; .planning/SECURITY.md] |
| V8 Data Protection / Error Handling | Yes | Accessible errors must avoid leaking secrets and must preserve existing redaction/audit behavior. [VERIFIED: .planning/SECURITY.md; apps/web/src/app/(public)/login/page.tsx] |
| V14 Configuration | Yes by regression | Keep CSP/security headers and server-only environment variable patterns intact. [VERIFIED: .planning/SECURITY.md; package.json] |

### Known Threat Patterns for Phase 7 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-duo data disclosure through visually recomposed routes | Information Disclosure | Keep data loading through existing authorized server/domain APIs and do not pass arbitrary duo IDs from client UI. [VERIFIED: .planning/SECURITY.md; .planning/ARCHITECTURE.md] |
| Client-side privilege or auth bypass in compact forms | Elevation of Privilege | Preserve server actions, Better Auth session checks and existing route redirects. [VERIFIED: apps/web/src/app/(public)/login/page.tsx; CITED: https://nextjs.org/docs/app/api-reference/functions/redirect] |
| Secret exposure via public env, screenshots or bundle text | Information Disclosure | Do not add `NEXT_PUBLIC_*` secrets; run `pnpm check:secrets`; avoid printing `.env.local` values in evidence. [VERIFIED: SAFE-05 in .planning/REQUIREMENTS.md; package.json] |
| XSS through user-controlled names or game metadata in redesigned panels | Tampering / Information Disclosure | Keep React escaping, avoid `dangerouslySetInnerHTML`, and treat user-generated text as untrusted. [VERIFIED: AGENTS.md; .planning/SECURITY.md] |
| Visual-only disabled states that still submit duplicate actions | Tampering / Repudiation | Preserve existing pending/submit controls and server idempotency for auth, pairing, roulette and jobs. [VERIFIED: apps/web/src/app/(public)/parear/page.tsx; .planning/phases/06-roleta-e-economia/06-CONTEXT.md; SAFE-04 in .planning/REQUIREMENTS.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md` — locked phase boundary, decisions, discretion and deferred work. [VERIFIED: local file]
- `.planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md` — visual principles, route targets, non-goals and acceptance evidence. [VERIFIED: local file]
- `AGENTS.md` — project constraints, architecture/security rules and workflow guidance. [VERIFIED: local file]
- `.planning/REQUIREMENTS.md` — Phase 7 requirement IDs and descriptions. [VERIFIED: local file]
- `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/ARCHITECTURE.md`, `.planning/SECURITY.md`, `.planning/research/STACK.md` — roadmap, product direction, binding architecture/security and stack context. [VERIFIED: local files]
- Prior contexts `04-CONTEXT.md`, `05-CONTEXT.md`, `06-CONTEXT.md` — playing now, collective gamification and roulette constraints. [VERIFIED: local files]
- `apps/web/src/components/app-shell.tsx`, `apps/web/src/app/page.tsx`, public/auth route pages, app route pages, `apps/web/src/app/globals.css`, `packages/ui/src/tokens.css`, `packages/ui/src/brand/*`, test files and phase gate scripts — current implementation integration points. [VERIFIED: codebase grep/read]
- npm registry — package latest/version checks for Next.js, React, Tailwind, Motion, Playwright, axe-core, Vitest, Testing Library, Sonner and related tools. [VERIFIED: npm registry]
- Context7 CLI `/vercel/next.js` — App Router redirects and metadata documentation lookup. [VERIFIED: Context7 CLI]
- Context7 CLI `/microsoft/playwright.dev` — Playwright screenshots, reduced motion and geometry documentation lookup. [VERIFIED: Context7 CLI]
- Next.js metadata docs — server metadata and Server Component constraints. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata]
- Next.js redirect docs — redirect behavior in Server Components, Route Handlers and Server Actions. [CITED: https://nextjs.org/docs/app/api-reference/functions/redirect]
- Playwright accessibility docs — axe integration pattern. [CITED: https://playwright.dev/docs/accessibility-testing]
- Playwright screenshot docs — `page.screenshot` and full-page screenshot support. [CITED: https://playwright.dev/docs/screenshots]
- Playwright page API docs — `emulateMedia({ reducedMotion })`. [CITED: https://playwright.dev/docs/api/class-page]
- axe-core Playwright README — `AxeBuilder`, `withTags` and Playwright usage. [CITED: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md]
- WCAG 2.2 target-size minimum understanding doc — target-size baseline and intent. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html]
- Tailwind theme docs — `@theme` variables and generated utility relationship. [CITED: https://tailwindcss.com/docs/theme]
- OWASP ASVS project page — ASVS as a technical security verification basis. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Secondary (MEDIUM confidence)

- Impeccable README and skill source — design process vocabulary and scope for critique/hardening/polish; used only as process reference because Phase 7 explicitly says not to import its aesthetic. [CITED: https://github.com/pbakaus/impeccable/blob/main/README.md; CITED: https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md; VERIFIED: .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]

### Tertiary (LOW confidence)

- None. [VERIFIED: research audit]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions were verified against `package.json`, workspace package files and npm registry output; recommendation is to reuse existing pinned stack. [VERIFIED: package.json; apps/web/package.json; npm registry]
- Architecture: HIGH — phase scope, module boundaries and security constraints are explicit in local binding docs and current route code. [VERIFIED: .planning/ARCHITECTURE.md; .planning/SECURITY.md; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
- Pitfalls: HIGH — pitfalls are derived from current code/tests plus locked Phase 7 decisions and visual acceptance evidence. [VERIFIED: apps/web/src/components/app-shell.tsx; apps/web/tests/accessibility.spec.ts; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md]
- External docs: HIGH for official docs and Context7 lookups; MEDIUM for Impeccable process guidance because it is used as a project-requested process reference, not as a normative web standard. [VERIFIED: Context7 CLI; CITED: https://playwright.dev/docs/accessibility-testing; CITED: https://github.com/pbakaus/impeccable/blob/main/README.md]

**Research date:** 2026-06-09  
**Valid until:** 2026-07-09 for project-specific decisions; recheck npm/doc versions before dependency updates. [VERIFIED: npm registry; .planning/phases/07-paridade-visual-e-ux-com-prototipo/07-CONTEXT.md]
