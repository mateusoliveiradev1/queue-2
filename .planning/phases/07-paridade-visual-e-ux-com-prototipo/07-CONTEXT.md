# Phase 07: Paridade Visual E UX Com Prototipo - Context

**Gathered:** 2026-06-09T21:04:50.9472964-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns the public and authenticated QUEUE/2 experience into a high-fidelity visual match for the Lovable prototype direction: editorial/brutalist composition, top horizontal shell, monumental brand moments, compact public auth surfaces, strong empty states, disciplined lime accents, dry panels, and route-wide visual polish.

The phase is presentation and UX parity work. It may change app shell, route composition, page-level CSS, UI primitives, copy, loading surroundings, visual states, responsive layout, accessibility gates and evidence capture. It must not change schema, migrations, RLS, authorization, authentication rules, domain rules, server authority, XP/economy behavior, roulette selection, discovery behavior or Phase 1-6 product functionality except where a UI accessibility fix requires route/presentation adjustments.

</domain>

<spec_lock>
## Visual Requirements Locked Via SPEC.md

The phase uses `.planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md` as the locked visual spec. It does not contain a numbered `## Requirements` section; its **Principles**, **Route Targets**, **Non-Goals** and **Acceptance Evidence** are binding.

Downstream agents MUST read `07-VISUAL-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope from the visual spec:** public landing, login, signup, recovery, verification, pairing, authenticated shell, `/app`, `/app/biblioteca`, `/app/descobrir`, `/app/roleta`, `/app/desafios`, `/app/hall`, `/app/dupla` and `/app/perfil` visual/UX parity with the prototype direction.

**Out of scope from the visual spec:** schema, migrations, RLS, authorization, domain rules, removing Phase 1-6 functionality, sacrificing accessibility, and turning the product into a generic neon arcade UI.

</spec_lock>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 7 goal, requirements and success criteria for prototype parity.
- `.planning/REQUIREMENTS.md` - BRND-02, BRND-04, BRND-05, BRND-06, BRND-07, BRND-08, BRND-09, BRND-10, BRND-11, BRND-12, BRND-13, META-01, META-02, SAFE-04 and SAFE-05.
- `.planning/PROJECT.md` - QUEUE/2 brand meaning, visual identity, design tokens, UI/UX direction, no-competition principle and route list.
- `.planning/phases/07-paridade-visual-e-ux-com-prototipo/07-VISUAL-SPEC.md` - Locked visual spec for principles, route targets, non-goals and acceptance evidence.
- `AGENTS.md` - Repository operating rules, frontend quality bar and GSD workflow requirement.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith contract; UI/routes must not absorb business rules or deep-import internals.
- `.planning/SECURITY.md` - Server authorization, RLS and safety contracts that Phase 7 must preserve while changing UI.
- `.planning/research/STACK.md` - Next.js App Router, Tailwind/CSS token guidance, Motion, Playwright, axe and Vercel stack context.

### Prior decisions that constrain Phase 7

- `.planning/phases/06-roleta-e-economia/06-CONTEXT.md` - Roulette visual ritual, reduced-motion reveal, audio opt-in, no casino/store/ranking vocabulary and result handoff boundaries.
- `.planning/phases/05-gamificacao-coletiva/05-CONTEXT.md` - Collective gamification, no individual ranking, dashboard gamification band and reward feedback boundaries.
- `.planning/phases/04-jogando-agora-sessoes-e-agendamento/04-CONTEXT.md` - Playing Now hero, Principal/secondary model, Central da Dupla and operational notification patterns.

### External design process reference

- `https://github.com/pbakaus/impeccable/blob/main/README.md` - Impeccable commands and anti-pattern framing for AI-generated frontend design.
- `https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md` - Impeccable skill scope covering layout, typography, UX copy, responsive behavior, accessibility, hardening and polish.

### Current code integration points

- `apps/web/src/components/app-shell.tsx` - Current sidebar and bottom-nav shell to replace with top horizontal navigation.
- `apps/web/src/app/globals.css` - Current global route styles, panels, cards, shell, public pages, app sections and responsive rules.
- `packages/ui/src/tokens.css` - Existing QUEUE/2 tokens, focus ring, buttons, inputs, toast and reduced-motion baseline.
- `packages/ui/src/brand/wordmark.tsx` - Existing wordmark primitive for monumental landing and compact shell brand.
- `packages/ui/src/brand/mark.tsx` - Existing `/2` mark, roulette pointer and divider primitives.
- `packages/ui/src/brand/loading.tsx` - Existing `/2` SVG stroke loading system to preserve.
- `apps/web/src/app/page.tsx` - Current public home to transform into prototype-like landing.
- `apps/web/src/app/(public)/login/page.tsx` - Public login route for compact card/tabs treatment.
- `apps/web/src/app/(public)/cadastro/page.tsx` - Public signup route for compact card/tabs treatment.
- `apps/web/src/app/(public)/parear/page.tsx` - Pairing route with create/join tabs and pairing-code emphasis.
- `apps/web/src/app/(public)/recuperar-senha/page.tsx` - Recovery route for shared compact auth system.
- `apps/web/src/app/(public)/verificar-email/page.tsx` - Verification route for shared compact auth system.
- `apps/web/src/app/app/page.tsx` - Authenticated Home anchor route.
- `apps/web/src/app/app/biblioteca/page.tsx` - Biblioteca route with filters, platform controls and queue cards.
- `apps/web/src/app/app/descobrir/page.tsx` - Descobrir route with deck, orbit controls, trays and support modes.
- `apps/web/src/app/app/roleta/page.tsx` - Roleta route with reveal, controls, result panel and history.
- `apps/web/src/app/app/desafios/page.tsx` - Desafios utility route.
- `apps/web/src/app/app/dupla/page.tsx` - Dupla utility/settings route.
- `apps/web/src/app/app/perfil/page.tsx` - Perfil utility/settings route.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `QueueWordmark`, `QueueMark`, `RoulettePointer` and `RouletteDivider` in `@queue/ui` already express the core brand and should anchor the new shell, landing and active states.
- `packages/ui/src/tokens.css` already contains the intended graphite/off-white/lime/violet/rarity tokens, sharp radius, focus ring, button/input base styles and reduced-motion reset.
- `packages/ui/src/brand/loading.tsx` provides the `/2` loading state that must be preserved.
- Current route components already compose domain public APIs; Phase 7 can mostly reshape presentation and CSS without touching application/domain modules.

### Established Patterns

- Authenticated routes use `AppShell`, so shell changes can propagate broadly if designed carefully.
- Public auth pages already share `public-shell`, `public-grid`, `public-intro`, `auth-panel`, `PublicBrandLink`, `PublicRitualStrip`, `PendingSubmitButton` and `StatusToast`; this is a good base for the compact public system.
- Current global CSS leans on `surface-band`, `metric`, `ritual-step`, `empty-state`, route-specific classes and responsive media rules. Phase 7 should refine or replace the visual language while preserving semantic structure and accessibility.
- Server state remains authoritative; visual polish must not invent local authority for rewards, roulette, library movement, auth or duo state.

### Integration Points

- Replace `app-sidebar`/`app-bottom-nav` composition in `AppShell` with a top shell that includes brand, primary routes, right-side profile/sign-out affordance and mobile horizontal rail.
- Rework `/app` as the internal prototype anchor with status strip, large empty/current-state panel, CTAs and low tiles.
- Rework public home into a short brand-first landing while keeping authenticated redirect behavior.
- Rework public auth route layout without changing Better Auth actions, server actions, rate limiting, verification or pairing security behavior.
- Rework Biblioteca, Descobrir and Roleta first folds while keeping their existing filters/actions/trays accessible and compact.
- Rework Desafios, Dupla and Perfil as dry utility surfaces with strong hierarchy, compact controls and no text overflow.
- Add or update Phase 7 visual gates around Playwright screenshots, mobile screenshots, axe/reduced-motion checks, text overflow, overlap, focus and touch target assertions.

</code_context>

<specifics>
## Specific Ideas

- The prototype prints are the primary visual reference. The planner should not reinterpret the work into a different design language.
- Home `/app` should resemble the provided print structure: `LV 4`, `XP 1500`, `STREAK 0D` style status, a large `NADA NA FILA / AINDA` panel, CTAs `DESCOBRIR`, `ROLETA`, `BIBLIOTECA`, and low rectangular route tiles.
- Public landing should put `QUEUE/2` first, with `A fila e nossa.` and a short line rather than feature-heavy copy.
- Hall can appear as a prepared route in the nav, but resenhas and full Hall replay stay Phase 8.
- Empty-state copy should feel like QUEUE/2: short, dry, confident, PT-BR and not generic onboarding prose.

</specifics>

<deferred>
## Deferred Ideas

- Resenhas, full Hall da Moral shelf, replay timeline and completed-game memory experience belong to Phase 8.
- Full launch metadata, OG image, complete PWA/icon set and final public launch hardening remain Phase 8 unless already directly required by the Phase 7 visual spec.

</deferred>

---

*Phase: 07-Paridade Visual E UX Com Prototipo*
*Context gathered: 2026-06-09T21:04:50.9472964-03:00*
