# Phase 2: Catalogo E Biblioteca - Context

**Gathered:** 2026-06-03T16:29:02-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns the empty duo queue into a real shared library backed by sourced catalog data. It delivers a catalog flow, game detail, member platform registration, common-platform visibility, Wishlist/Jogando/Pausado organization, and an explainable compatibility score for the duo.

The phase must preserve the prototype's original direction: QUEUE/2 is not a generic game catalog. The main flow should feel like the foundation of a Tinder-like coop discovery ritual where games appear automatically for the duo. The actual two-person swipe approval and match moment remain Phase 3, but Phase 2 must not plan a plain database-table catalog that would fight that later experience.

The main catalog flow is restricted to games confirmed as 2-player campaign/story coop games that the duo can reasonably "zerar juntos". Games without that confirmation do not enter the main recommendation/deck flow.

</domain>

<decisions>
## Implementation Decisions

### Prototipo e fluxo de catalogo

- **D-01:** The original prototype direction is a Tinder-like automatic game flow: games appear for the duo to evaluate, and later both members must want the game for a match. Phase 2 must keep this product shape visible.
- **D-02:** Phase 2 uses a hybrid catalog: a prominent automatic/suggested game card anchors the page, with a supporting grid/list for browsing and search. Phase 3 turns the prominent card flow into real swipe/match behavior.
- **D-03:** The catalog is not a general-purpose game database. The main flow only includes games confirmed as coop campaign/story games for exactly the duo use case: two people playing through the game together.
- **D-04:** Games that are only maybe coop, party-only, PvP-only, local-only without clear story/campaign fit, or not confirmed for 2-player campaign/story completion stay out of the main recommendation/deck flow.
- **D-05:** If the app cannot confidently confirm that a game is campaign/story coop for two, it should not recommend that game in the main flow. The plan may include a secondary non-primary path only if it does not complicate v1.

### RAWG, fonte e frescor

- **D-06:** RAWG attribution and freshness are discreet but always present wherever RAWG data or images are used.
- **D-07:** Cards and detail surfaces should show source/freshness as metadata, not as loud badges that make the UI feel like a report.
- **D-08:** Estimated time and availability are never invented. If no reliable source exists, the UI says this honestly, e.g. "Sem fonte confiavel ainda" or "Nao verificado".
- **D-09:** Game Pass or free availability is treated as game metadata with source and last verification date, not as a personal platform setting.

### Detalhe do jogo

- **D-10:** The game detail in Phase 2 includes essential catalog data plus duo context: cover, description, genres, release information, platforms, source/freshness, common platforms, library status, and compatibility/match score when available.
- **D-11:** The library game detail should prepare future play-session concepts without pretending Phase 4 exists. It shows status, platforms, compatibility and a short "jornada da dupla" area that starts making sense once the game is in Jogando.
- **D-12:** Do not fill the detail page with dead sections for sessions, checkpoints, progress or milestones in Phase 2.

### Plataformas da dupla

- **D-13:** Each member records simple playable platforms, such as PC, PlayStation, Xbox, Switch and Steam Deck. Storefronts and services are not personal platform choices in this phase.
- **D-14:** The duo can see which platforms both members have in common.
- **D-15:** A game without any platform in common should not be recommended in the main automatic flow, but either member may still add it manually to Wishlist if the duo wants to track it.

### Biblioteca e estados

- **D-16:** Phase 2 makes Wishlist, Jogando and Pausado usable.
- **D-17:** Zerado and Dropado appear as future states but remain blocked until Phase 4 implements the required double confirmation.
- **D-18:** The library is shared. Any member can add a game or move it between Wishlist, Jogando and Pausado, and that changes the duo library for both.
- **D-19:** Moving a game to Jogando already respects the future limit of up to three games in Jogando.
- **D-20:** Phase 2 does not need full Principal/secondary drag-and-drop ordering. That richer dashboard behavior belongs to Phase 4.
- **D-21:** The library layout is responsive hybrid: mobile uses tabs/list; desktop can use a denser view by status.

### Match score na Fase 2

- **D-22:** In Phase 2, match score means practical compatibility, not emotional preference. It is based on confirmed 2-player campaign/story coop, common platform, and sourced availability/time when present.
- **D-23:** The score should be explainable with short factors such as "PC em comum", "coop campanha 2p" and "tempo nao verificado".
- **D-24:** Avoid fake numeric precision such as "82% match" before Phase 3 preference signals exist.

### the agent's Discretion

- Choose the exact wording, empty states, metadata placement, card density, platform enum labels and compatibility factor names, as long as they preserve the decisions above, Portuguese-BR product language, accessibility, RAWG attribution, and the modular/security contracts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 2 goal, requirements, success criteria and dependency on Phase 01.1.
- `.planning/REQUIREMENTS.md` - CAT-01 through CAT-07 and LIB-01 through LIB-05 are the phase requirements; DISC-01/DISC-02 clarify that real two-person match belongs to Phase 3.
- `.planning/PROJECT.md` - Product ritual, prototype intent, `/2` constraint, routes, RAWG decisions, platform/discovery notes and library state list.
- `AGENTS.md` - Repository operating instructions, GSD workflow rule and project constraints.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith shape, domain public entrypoints, dependency rules and database ownership.
- `.planning/SECURITY.md` - Server authorization, RLS, secret handling, external integration safety and every-phase security gates.

### Stack and implementation baseline

- `.planning/research/STACK.md` - Required stack: Next.js App Router, Drizzle, Neon Postgres, Better Auth, Tailwind, Turborepo, RAWG server-only constraints and testing tools.

### Prior phase context

- `.planning/phases/01-fundacao-modular-marca-auth-e-dupla/01-CONTEXT.md` - Duo ownership, authenticated app shell, route gating and the decision that catalog/library were intentionally deferred from Phase 1.
- `.planning/phases/01.1-polimento-auth-e-landing-intermediaria/01.1-CONTEXT.md` - Public/auth polish boundaries and confirmation that Phase 01.1 did not change security or database behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `apps/web/src/components/app-shell.tsx` - Authenticated shell currently has navigation for Fila, Dupla and Perfil; Phase 2 likely adds Biblioteca/Catalogo navigation while preserving accessible names.
- `packages/ui/src` - Brand primitives, toast and QUEUE/2 visual language should be reused instead of adopting a generic SaaS/shadcn look.
- `apps/web/src/modules/duo` - Existing module shape shows the expected public `index.ts`, application/domain/infrastructure/presentation split.
- `packages/db/src/schema/app.ts` - Existing duo-scoped app schema and constraints are the base for library tables and member platform storage.
- `packages/db/src/rls/policies.sql` - RLS policies already enforce duo membership for app/ops data and should be extended for duo-scoped library data.

### Established Patterns

- Routes require verified sessions through `requireVerifiedSession()` and should compose module public APIs, not hold business rules.
- Domain behavior belongs in module use cases and pure rules; infrastructure adapters own Drizzle/Postgres queries.
- Duo data is authoritative on the server and protected both by application authorization and database RLS.
- Phase 1 surfaces use honest locked states for future capabilities; Phase 2 should unlock real library/catalog behavior without faking later sessions or matches.

### Integration Points

- New domain modules likely belong under `apps/web/src/modules/catalog` and `apps/web/src/modules/library`.
- Catalog source data likely belongs in the `catalog` Postgres schema; duo library/status/platform choices likely belong in the `app` schema.
- RAWG access must live behind a server-only adapter under platform/integrations or catalog infrastructure, never in Client Components.
- The authenticated dashboard at `apps/web/src/app/app/page.tsx` currently states the queue is empty and should become the entry point into real catalog/library behavior after Phase 2.

</code_context>

<specifics>
## Specific Ideas

- The prototype reference is "como o Tinder": games appear automatically, and later the two members both need to want the game for the match.
- Phase 2 should visibly prepare that ritual through a strong suggested game card, not a cold table of rows.
- The product should prioritize games the duo can complete together: coop campaign/story for two people.
- The practical compatibility score should read like useful product language, not a fake percentage.

</specifics>

<deferred>
## Deferred Ideas

- Real double-like swipe and match live behavior belongs to Phase 3 (`DISC-01`, `DISC-02`).
- Full Principal/secondary ordering, drag-to-reorder, sessions, checkpoints, progress and milestones belong to Phase 4.
- Double confirmation for Zerado and Dropado belongs to Phase 4.

</deferred>

---

*Phase: 2-Catalogo E Biblioteca*
*Context gathered: 2026-06-03T16:29:02-03:00*
