# Phase 3: Descoberta E Matches - Context

**Gathered:** 2026-06-04T00:40:35.0014956-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns the Phase 2 suggested catalog card into the real QUEUE/2 discovery ritual. It delivers a Tinder-like but product-owned deck where each duo member can evaluate games independently, discover matches when both explicitly approve the same game, use a short shared Match Live session, request compatible surprises, answer a three-question duo mood quiz, search with autocomplete, filter discovery results, and move discovered games into valid library statuses.

The phase is about deciding whether the duo wants games in its shared pool. It does not implement the Phase 4 playing-now/session/progress system, the Phase 6 roulette/case-opening draw, or the Phase 7 Hall/reviews/story timeline. Phase 3 forms a consented pool for later choice rituals; it does not automatically choose the next game.

</domain>

<decisions>
## Implementation Decisions

### Ritual de descoberta

- **D-01:** Discovery uses a central game deck as the main experience. The deck is the default surface for deciding whether a game belongs in the duo's shared queue ritual.
- **D-02:** The visual and interaction direction is Tinder-like in the swipe mechanic, not a Tinder clone. It should use large cards, swipe gestures, clear actions and match celebration, but keep QUEUE/2 identity, source/freshness metadata, recommendation reasons and the tone of "vamos escolher nosso proximo coop".
- **D-03:** `Live`, `Surpresa`, `Quiz` and `Busca` appear as compact actions above the deck. They are mode shortcuts around the deck, not separate products competing for attention.
- **D-04:** Match Live is a short shared session. Both members can enter the same live discovery moment, approve games at their own rhythm, and get an immediate celebration when a match happens.
- **D-05:** Games already evaluated by a member do not repeat in the default deck. They may remain available through search, history or explicit recovery flows.
- **D-06:** Discovery animations are a quality contract for this phase, not optional polish. Swipe, card reaction, card transition, mode changes, match celebration and history interactions should feel fluid, premium and intentional.
- **D-07:** Motion must remain accessible. The planner must include reduced-motion behavior for users with `prefers-reduced-motion`, preserve keyboard/touch accessibility, and avoid visual overload or generic neon arcade treatment.

### Regra de match

- **D-08:** Each discovery card exposes three primary decisions: `Quero jogar`, `Agora nao` and `Pular`.
- **D-09:** A match happens only when both duo members choose `Quero jogar` for the same game.
- **D-10:** `Agora nao` is a temporary negative signal with cooldown. It means the member is not interested in that game for the current moment, not that the game is permanently banned.
- **D-11:** `Pular` is judgment-free. It only changes the current card and does not count as approval or rejection.
- **D-12:** When a match happens, the app celebrates first and then offers to add the game to the queue. A match does not automatically add the game to the library.
- **D-13:** The match moment should feel like a small shared event. It may use visual celebration and in-app feedback, but it must preserve product restraint and accessibility.

### Mood, filtros e raridade

- **D-14:** The mood quiz asks three questions about energy, commitment and vibe, not a duplicate of technical filters. Example intent: time/energy available, light vs intense commitment, and whether the duo wants to laugh, think, focus or similar mood axes.
- **D-15:** The mood quiz is duo-owned. Each member should answer the same three questions when possible.
- **D-16:** A complete quiz result combines both members' answers. If only one member answered, the result may appear as a preview, but not as the full duo recommendation.
- **D-17:** Conflicting mood answers use a conservative intersection. The recommendation should look for a middle ground or flexible games instead of forcing one member's mood onto the other.
- **D-18:** The always-visible quick filters are estimated time, common platform and availability.
- **D-19:** Common platform is detected automatically from Phase 2 platform data and is enabled by default. The duo may turn it off to explore, but the main recommendation flow should prioritize games they can actually play together.
- **D-20:** Advanced filters such as coop type, mood, year, genre and rarity live in a `Mais filtros` drawer.
- **D-21:** Rarity in Phase 3 is QUEUE/2 editorial rarity. It is curated product metadata for achados, classics, epics or similar product-owned categories, not raw popularity and not collaborative usage statistics.

### Recomendacao e explicabilidade

- **D-22:** Cold-start recommendations use tag similarity plus practical compatibility: confirmed two-player campaign/story coop, common platform, sourced estimated time or availability, genres/tags and editorial mood signals.
- **D-23:** Collaborative filtering only influences recommendations after a clear minimum volume of interaction data exists across duos and within the current duo. Before that, it remains disabled or has very low weight.
- **D-24:** Recommendation cards show short reasons, for example `PC em comum`, `campanha 2p`, `curto para hoje`, `Game Pass verificado` or `ambos curtiram puzzle`. The explanation should be useful and compact, not a report.
- **D-25:** Negative signals have separate intensity. `Agora nao` weighs temporarily, `Pular` does not weigh, and lack of common platform blocks or heavily reduces main-flow recommendation strength.
- **D-26:** Ranking prioritizes precision with a small amount of variety. Most cards should follow the strongest compatibility/preference signals, while a controlled fraction prevents the duo from getting stuck in a narrow bubble.

### Destino do jogo descoberto

- **D-27:** A discovered or matched game can be moved to `Wishlist`, `Jogando` or `Pausado` when valid under existing library rules. `Zerado` and `Dropado` remain blocked until Phase 4 double-confirmation behavior exists.
- **D-28:** After adding or moving a game, the user stays in Discovery and receives confirmation with links/actions to open the game or the library.
- **D-29:** If a discovered game already exists in the duo library, Discovery shows the current status and allows valid status moves instead of duplicating the library entry.
- **D-30:** Matches have their own polished history. The history should show matched games with attractive cards, match date, short recommendation reasons, current library status and actions to add or move.
- **D-31:** Match history is intentionally not the Phase 7 Hall. It must not include reviews, deep stats, replay timeline or full duo story surfaces.
- **D-32:** Match Live uses immediate in-app celebration. Push notification is used only when the user has opted in.
- **D-33:** `Surpresa` picks a game that neither member has seen and that is compatible with the duo, respecting main-flow eligibility and common platform by default.
- **D-34:** Search with autocomplete is a fast entry into Discovery. Suggestions appear while typing; selecting a game opens the discovery card/detail with swipe and queue actions rather than duplicating the Phase 2 catalog.

### Relacao com a roleta futura

- **D-35:** Phase 3 discovery forms the consented game pool. It answers "queremos jogar este jogo?".
- **D-36:** Phase 6 roulette later answers "qual destes jogos vamos jogar agora?". The roulette should draw from eligible library games, especially consciously added Wishlist/matched games, not from raw unseen catalog entries.
- **D-37:** Games that were only seen, skipped, or temporarily cooled down by `Agora nao` do not enter the future roulette pool unless the duo consciously adds them to the library.

### the agent's Discretion

- Choose exact cooldown duration, collaborative-filtering thresholds, rarity labels, mood question copy, autocomplete debounce, card animation timings, push copy, match history layout density and SQL/table names as long as they preserve the decisions above.
- Choose whether the first implementation uses polling, short revalidation, server actions, route handlers or another stack-consistent mechanism for live state. The user decision is product behavior, not a specific transport.
- Keep all business rules in domain/application modules and all persistence behind module public APIs. Routes and React components should compose behavior, not own match/recommendation rules.
- Preserve the established Phase 2 source/freshness and compatibility language rather than inventing unsourced precision.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 3 goal, dependency on Phase 02.1, DISC requirements and success criteria.
- `.planning/REQUIREMENTS.md` - DISC-01 through DISC-12 are the mapped requirements for this phase.
- `.planning/PROJECT.md` - Product ritual, `/2` constraint, discovery modes, filters, recommendation notes, library states and future roulette shape.
- `AGENTS.md` - Repository operating instructions, GSD workflow rule, architecture contract pointer and project constraints.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith boundaries, domain public entrypoints, database ownership and forbidden dependency rules.
- `.planning/SECURITY.md` - Server authorization, RLS, least privilege, external integration safety, push/notification considerations and every-phase security gates.

### Stack and implementation baseline

- `.planning/research/STACK.md` - Required stack: Next.js App Router, Drizzle, Neon Postgres, Better Auth, Tailwind, motion, SWR/polling where useful, web-push and testing tools.

### Prior phase context and closure

- `.planning/phases/02-catalogo-e-biblioteca/02-CONTEXT.md` - Locked Phase 2 decisions for Tinder-like catalog direction, main-flow coop eligibility, platform compatibility, library states and qualitative match score.
- `.planning/phases/02-catalogo-e-biblioteca/02-03-SUMMARY.md` - Catalog UI closure confirming the suggested-card flow can become Phase 3 real discovery/matching.
- `.planning/phases/02.1-localizacao-e-qualidade-do-catalogo/02.1-CONTEXT.md` - Locked localization/source/freshness decisions that Discovery must preserve.
- `.planning/phases/02.1-localizacao-e-qualidade-do-catalogo/02.1-VERIFICATION.md` - Evidence that Phase 02.1 is complete and ready to support Phase 3.

### Current code integration points

- `apps/web/src/components/app-shell.tsx` - Authenticated navigation currently includes catalog/library but no discovery entry.
- `apps/web/src/app/app/catalogo/page.tsx` - Existing suggested-card and browse/search catalog surface that Phase 3 should evolve from without duplicating a generic catalog.
- `apps/web/src/app/app/phase-2-actions.ts` - Existing server actions for add/move library behavior and safe return handling.
- `apps/web/src/modules/catalog/index.ts` - Public catalog module entrypoint that routes/pages should use.
- `apps/web/src/modules/catalog/application/search-catalog.ts` - Existing search use case with query, limit and platform filters.
- `apps/web/src/modules/catalog/application/ports.ts` - Catalog records and repository contracts that discovery/recommendation inputs may need to extend.
- `apps/web/src/modules/catalog/domain/catalog-policy.ts` - Existing eligibility, source, time and availability policy functions.
- `apps/web/src/modules/catalog/presentation/catalog-card.tsx` - Existing card UI pattern and source/freshness density baseline.
- `apps/web/src/modules/catalog/presentation/view-models.ts` - Existing catalog card/detail view-model shape and description/source mapping.
- `apps/web/src/modules/catalog/presentation/source-metadata.tsx` - Compact metadata pattern for card-level attribution/freshness.
- `apps/web/src/modules/catalog/presentation/source-freshness-panel.tsx` - Detail-level source/freshness pattern to preserve when opening discovery detail.
- `apps/web/src/modules/library/index.ts` - Public library module entrypoint for add/move/status behavior.
- `apps/web/src/modules/library/domain/library-policy.ts` - Existing status rules, Jogando limit and locked Zerado/Dropado behavior.
- `apps/web/src/modules/library/domain/match-score.ts` - Existing qualitative compatibility factors that recommendations should build on, not replace with fake precision.
- `apps/web/src/modules/library/application/ports.ts` - Library records and result types for valid queue destination behavior.
- `apps/web/src/modules/library/presentation/library-status-controls.tsx` - Existing status controls that discovered-game actions should remain consistent with.
- `apps/web/src/modules/library/presentation/view-models.ts` - Library overview/detail view models for current status display.
- `packages/db/src/schema/app.ts` - Duo-scoped app schema and library/member platform ownership.
- `packages/db/src/schema/catalog.ts` - Catalog schema, game facts, platforms, genres, time estimates, availability and localization.
- `packages/db/src/migrations/0004_catalog_source.sql` - Phase 2 catalog source migration and runtime/worker privilege baseline.
- `packages/db/src/migrations/0005_library_duo_state.sql` - Duo library state, member platforms, RLS and Jogando limit migration.
- `packages/db/src/migrations/0006_catalog_localizations.sql` - Published PT-BR localization contract that Discovery cards/details must respect.
- `packages/db/src/migrations/0007_catalog_sync_ops.sql` - Catalog sync ops persistence that may inform recommendation freshness/audit patterns.
- `packages/db/src/rls/policies.sql` - RLS patterns for duo-scoped app data and ops data.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `apps/web/src/app/app/catalogo/page.tsx` already anchors the catalog with a prominent suggested game card. Phase 3 should turn that product shape into a real deck rather than building a disconnected generic discovery page.
- `apps/web/src/modules/catalog/domain/catalog-policy.ts` already defines main-flow eligibility, source attribution, estimated time and availability state. Discovery should reuse or extend those policies for deck eligibility and filter behavior.
- `apps/web/src/modules/library/domain/match-score.ts` already exposes qualitative match factors such as common platforms and reliable time/availability. Recommendation reasons can build on this pattern.
- `apps/web/src/modules/library/domain/library-policy.ts` already blocks invalid statuses, enforces Jogando limits and keeps Zerado/Dropado gated for later double confirmation.
- `apps/web/src/app/app/phase-2-actions.ts` already demonstrates safe server-action composition for adding and moving games, with verified session and safe return URLs.
- `packages/ui/src/brand` and existing app styles provide QUEUE/2 brand primitives. The deck should use the brand system, not default SaaS/shadcn visuals or a Tinder clone.

### Established Patterns

- Authenticated pages call `requireVerifiedSession()` and redirect users who are not in a ready duo state.
- Routes and UI compose module public APIs. Business rules live in domain/application code, and infrastructure owns database access.
- Duo-scoped product state is protected server-side and by forced RLS. Discovery preferences, matches, live sessions and match history must follow the same duo isolation pattern.
- Catalog source/freshness stays visible and text-based. Discovery cannot hide RAWG attribution or make unsourced claims about time/availability.
- Compatibility explanations avoid fake numeric precision. Use short human-readable factors instead of pretending a percentage is scientifically exact.

### Integration Points

- Add a `discovery` domain module or equivalent modular boundary under `apps/web/src/modules` with public entrypoints for deck reads, swipe decisions, live session state, quiz answers, recommendation reasons and match history.
- Add duo-scoped persistence for member discovery decisions, matches, mood quiz responses, live session membership/state and match history. All tables need RLS, constraints and indexes reviewed against `.planning/SECURITY.md`.
- Extend catalog search/read contracts for discovery filters and autocomplete without exposing RAWG secrets or bypassing published localization reads.
- Reuse library add/move policies when a matched/discovered game is sent to Wishlist, Jogando or Pausado.
- Add UI routes/navigation for Discovery in the authenticated app shell while preserving existing Catalog and Library entry points.
- Add tests for domain rules, recommendation eligibility, RLS isolation, no duplicate library entries, live-match race conditions, reduced motion, keyboard/touch controls and mobile text fit.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly confirmed this is where the app should feel "aquilo que parece um Tinder".
- The correct interpretation is "inspired by swipe, with QUEUE/2 identity", not "make a Tinder clone".
- The deck should feel premium and fluid: swipe physics, card reaction, transition to next card, match celebration, polished match history and accessible reduced-motion alternatives.
- The product language should keep the central distinction clear: Discovery decides whether the duo wants a game; the future roulette decides which eligible queued game becomes next.
- The future roulette is the Phase 6 case-opening/CS-like moment, not part of Phase 3 implementation.

</specifics>

<deferred>
## Deferred Ideas

- Phase 4 implements playing-now, sessions, progress, scheduling, push reminders for sessions, double confirmation for Zerado/Dropado and timeline/moments.
- Phase 6 implements the CS-like roulette/case-opening draw with 60 covers, pointer, sound, rarity, pity, XP boost and result persistence.
- Phase 7 implements Hall/reviews/deep stats/replay timeline. Match history in Phase 3 should remain focused and not become the Hall.
- Full collaborative-filtering influence may remain low or disabled until enough data exists; the implementation should still define the threshold and behavior clearly.

</deferred>

---

*Phase: 3-Descoberta E Matches*
*Context gathered: 2026-06-04T00:40:35.0014956-03:00*
