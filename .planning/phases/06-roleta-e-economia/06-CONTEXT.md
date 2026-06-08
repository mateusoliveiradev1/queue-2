# Phase 6: Roleta E Economia - Context

**Gathered:** 2026-06-08T13:12:25.8193339-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns the duo's curated backlog into an authoritative roulette ritual for choosing the next game. It delivers `/app/roleta`, an eligible pool from real library state, a 60-cover horizontal reel, server-persisted result selection before reveal, rarity weights, pity, boost balance, weekend economy effects, optional audio, reduced-motion reveal, compact history, and the handoff that can lock the result as `Jogando Principal`.

The phase owns roulette/economy behavior and its public integration with Library, Play, Gamification, Central da Dupla and authenticated app navigation. It does not add new discovery modes, Hall da Moral replay, full memory shelves, public launch polish, individual economy, leaderboards, cosmetics, store or solo progress.

</domain>

<decisions>
## Implementation Decisions

### Pool elegivel da roleta

- **D-01:** Roulette pulls from the duo's curated backlog, not from unseen surprise discovery. Discovery curates candidates first; roulette decides among real backlog commitments.
- **D-02:** The default eligible statuses are `Wishlist` and `Pausado`. `Jogando`, `Zerado` and `Dropado` are excluded. Matches enter the pool only after becoming library items.
- **D-03:** The reel always presents 60 covers, but if fewer than 60 eligible games exist, repeated covers are visual only. The real result is selected once on the server from the eligible game set.
- **D-04:** A round requires at least 3 eligible games. With fewer than 3, the UI shows a useful blocked state with CTAs to Biblioteca, Descobrir and Catalogo.
- **D-05:** Base odds use rarity weights. Common appears more often, Rare less often, Epic/Legendary much less often. This makes pity meaningful and keeps rarity more than decorative.
- **D-06:** A recently drawn game that was not locked as Principal enters a light cooldown for a few rounds. It becomes less likely, not impossible.
- **D-07:** A revealed result that is not accepted becomes a pending invitation. It does not move library status automatically.

### Economia do boost e pity

- **D-08:** Boost spending uses a separate spendable boost balance. Lifetime duo XP and visible level never decrease when a boost is used.
- **D-09:** The boost balance is a partial mirror of XP earned from real duo actions. It stays connected to collective progress without becoming individual currency.
- **D-10:** Spending 100 boost balance improves rarity weights for that round. It does not guarantee Epic; pity remains the real guarantee.
- **D-11:** Pity is visible with clear progress but no heavy math. Show a simple count/language such as Epic guarantee approaching, not the full formula.
- **D-12:** After 10 results without Epic or higher, pity forces a qualified Epic/Legendary server selection. The visual reel may still mix rarities for suspense.
- **D-13:** The 20% weekend multiplier affects boost balance generation or effective boost cost. It must not inflate lifetime XP or level progression from Phase 5.
- **D-14:** The boost balance has a moderate cap to prevent indefinite stockpiling and keep the ritual active.
- **D-15:** If a boosted round fails before a result is persisted, the boost is refunded automatically. If the result was persisted, the round exists and must be resumable.
- **D-16:** Each duo can have only one active roulette round at a time while a reveal or pending invitation exists. This protects cost, pity, history and handoff idempotency.

### Ritual da revelacao

- **D-17:** The 5.5 second reveal should feel like controlled editorial tension: dry ticks, heavier cadence near the pointer, and a short fanfare. Avoid generic arcade/casino excess.
- **D-18:** Audio is opt-in after explicit interaction, respects duo audio preferences, and has an easy mute control. Tick, drumroll and fanfare are part of v1.
- **D-19:** Reduced-motion users receive a staged reveal without the long moving reel: preparation, already-persisted authoritative selection, then short reveal transitions.
- **D-20:** Legendary results use contained particles plus a strong seal/border. The static rarity seal carries the main impact, and reduced-motion/static alternatives are required.
- **D-21:** The result is persisted before animation and shared between members. Either member opening later sees the same round and can resume or replay the reveal.
- **D-22:** Replay is allowed only as a short replay of the already-persisted result. It must be clear that replay is not a new draw.
- **D-23:** Mobile uses a horizontal full-bleed reel with fixed central pointer and controls below. The roulette must not shrink into a small decorative card.
- **D-24:** If the tab goes background or connection drops, the UI resumes from authoritative server state. It must never ask for a new spin when a round already exists.
- **D-25:** Result copy is a commitment invitation, not a prize claim or command. Direction: "A fila apontou para este. Voces travam como Principal?"

### Depois do resultado

- **D-26:** Any duo member can lock the result as `Jogando Principal`; the action records visible authorship/audit information. A second confirmation is not required for this handoff.
- **D-27:** If the duo already has three `Jogando` games, locking the result asks the member to choose a replacement/pause or cancel. Nothing is paused automatically.
- **D-28:** Locking the result closes the round, marks the invitation as completed, records the handoff, and routes to `Jogando Agora` with the new Principal highlighted.
- **D-29:** A new roulette round cannot start until the pending invitation is resolved by locking or discarding it. No short automatic expiration is used.
- **D-30:** Discarding a result is non-punitive and recorded in history. The game remains in `Wishlist`/`Pausado`, and a valid persisted boost spend is not refunded.
- **D-31:** Central da Dupla gets a light operational notification when a result is locked or discarded. Push is allowed only when existing preferences already permit it.
- **D-32:** Phase 6 includes compact roulette history on `/app/roleta`: recent rounds, result rarity, boost/pity usage, and whether the result became Principal or was discarded. Full Hall/replay storytelling remains Phase 7.

### the agent's Discretion

- Choose exact rarity weights, boost balance earning fraction, boost balance cap, cooldown duration, pity copy, and weekend balance math through planning/simulation, as long as the decisions above hold.
- Choose exact database table names, route/component split, status names, idempotency keys, locks and transaction structure while preserving module boundaries and RLS.
- Choose exact audio assets, animation implementation, replay microcopy, and Legendary particle style while preserving editorial tension, accessibility and reduced-motion alternatives.
- Choose exact compact history layout and notification wording, but do not expand into Hall da Moral replay or broad stats.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 6 goal, requirements, success criteria and dependency on Phase 5.
- `.planning/REQUIREMENTS.md` - ROUL-01 through ROUL-10 and SAFE-06.
- `.planning/PROJECT.md` - Roulette Case Opening, Deep Gamification, Core Product Principle, Screens, visual quality, no-competition rule and source/freshness constraints.
- `AGENTS.md` - Repository operating rules, GSD workflow requirement, frontend quality bar and binding architecture/security pointers.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith contract, public module entrypoints, dependency direction and rule that business logic does not live in routes/UI.
- `.planning/SECURITY.md` - Duo isolation, server-authoritative mutations, RLS, append-only roulette history, idempotency, concurrency and every-phase security gates.
- `.planning/research/STACK.md` - Next.js App Router, Neon Postgres, Drizzle, Motion, Web Audio, Vitest, Playwright, Turborepo and Vercel stack guidance.

### Prior decisions

- `.planning/phases/05-gamificacao-coletiva/05-CONTEXT.md` - Shared XP, level projections, quest/streak economy, no individual XP, reward idempotency and Phase 6 deferred boost spending.
- `.planning/phases/04-jogando-agora-sessoes-e-agendamento/04-CONTEXT.md` - Principal/secondary play model, `Jogando` limit, explicit replacement flow, Central da Dupla and no automatic pause.
- `.planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-CONTEXT.md` - Production performance, server-authoritative mutation feedback and no weakening RLS/authorization for speed.

### Current code integration points

- `packages/db/src/schema/app.ts` - Existing `duo_library_games`, `play_active_games`, `duo_xp_awards`, gamification tables and projected `app.duos.xp/level/streak`.
- `packages/db/src/rls/policies.sql` - RLS patterns to extend for roulette history, boost balance, pity state and duo-scoped round records.
- `apps/web/src/modules/gamification/domain/gamification-policy.ts` - Current XP source rules, rarity tokens, reward intensities and no-spend lifetime XP behavior to respect.
- `apps/web/src/modules/gamification/application/ports.ts` - Gamification repository contracts for XP ledger/projection and reward notifications.
- `apps/web/src/modules/play/domain/play-policy.ts` - Principal/secondary rules, `Jogando` limit, replacement behavior and notification boundaries.
- `apps/web/src/modules/play/application/ports.ts` - Play public contracts for current play, notifications and Principal handoff integration.
- `apps/web/src/modules/library/domain/library-policy.ts` - Library statuses, active/archive grouping and `Jogando` limit semantics.
- `apps/web/src/modules/library/application/move-library-game.ts` - Existing library-to-play coordinator pattern that roulette handoff should reuse or mirror through public contracts.
- `apps/web/src/app/app/page.tsx` - Dashboard/Jogando Agora surface where successful roulette handoff should land.
- `apps/web/src/components/app-shell.tsx` - Authenticated navigation that likely needs a `/app/roleta` entry.
- `packages/ui/src/brand/mark.tsx` - Existing `RoulettePointer` and `RouletteDivider` primitives.
- `packages/ui/src/tokens.css` - Brand and rarity token contract for reel items, seals, borders and reduced-motion styling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `RoulettePointer` and `RouletteDivider` already exist in `@queue/ui` and should anchor the central pointer motif.
- `packages/ui/src/tokens.css` already exposes rarity color tokens for Common/Rare/Epic/Legendary.
- `app.duo_xp_awards`, gamification projections and reward notifications provide the existing audit/projection model; Phase 6 should add spendable boost balance without reducing lifetime XP.
- `play_active_games` and Play policies already enforce one Principal, up to two secondaries and no automatic fourth-game pause.
- `NotificationCenter` and Central da Dupla patterns can carry light operational roulette notifications.

### Established Patterns

- Routes compose public module APIs; roulette rules belong in a new `roulette` domain/application module.
- Server actions and UI feedback can be fast, but result, boost cost, pity, history and handoff are server-authoritative.
- Duo-scoped data uses server authorization plus forced RLS; roulette state must follow the same isolation and concurrency patterns.
- Missing DB/browser evidence remains a blocker, not passing proof.
- Visual spectacle is reserved for meaningful moments and must support reduced motion, accessible controls, contrast and touch targets.

### Integration Points

- Add `apps/web/src/modules/roulette` with public entrypoints for eligible pool, round creation, reveal state, boost/pity economy, invitation resolution and compact history.
- Add `/app/roleta` route and authenticated navigation entry.
- Extend `packages/db` with roulette round/history, pity state, boost balance/ledger, cooldown facts and indexes/RLS.
- Integrate accepted results with Play through public contracts so locking as Principal respects existing replacement behavior.
- Integrate light notifications through Play/Central da Dupla public contracts or a shared event path without deep imports.
- Add tests for eligible pool filtering, 60-cover visual reel vs single server result, pity after 10 non-Epic+ results, boost idempotency/refund, one active round per duo, cross-duo isolation, reduced motion, mobile layout and handoff to Jogando Agora.

</code_context>

<specifics>
## Specific Ideas

- Roulette is a ritual of decision over the duo's real backlog, not a replacement for Discovery.
- The result copy should invite commitment: "A fila apontou para este. Voces travam como Principal?"
- The reveal should feel like QUEUE/2 editorial tension, with covers as the main color source and glow reserved for rarity/result meaning.
- The compact history exists for trust in pity/boost/economy; emotional replay and shelves belong to Hall da Moral later.

</specifics>

<deferred>
## Deferred Ideas

- Full Hall da Moral replay, broad timeline storytelling and memory shelves remain Phase 7.
- New discovery/surprise recommendation modes remain Discovery scope, not roulette scope.
- Store, cosmetics, inventory, equipable loadouts, individual currency and leaderboards remain out of scope.

</deferred>

---

*Phase: 6-Roleta E Economia*
*Context gathered: 2026-06-08T13:12:25.8193339-03:00*
