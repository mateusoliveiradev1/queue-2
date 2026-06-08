# Phase 06 Research: Roleta E Economia

**Phase:** 06 - Roleta E Economia
**Generated:** 2026-06-08
**Mode:** inline research, selected by user during `$gsd-plan-phase 6`

## RESEARCH COMPLETE

## Executive Summary

Phase 6 should introduce a first-class `roulette` module that owns the duo-scoped draw ritual, boost balance, pity state, cooldown, compact history and the pending result invitation. The existing `library`, `play` and `gamification` modules already provide the surrounding product state: curated backlog statuses, `Jogando Principal` handoff rules, shared XP ledger/projection and rarity tokens. Roulette should not become a discovery engine or an XP owner; it consumes eligible library items and derives its spendable boost balance from confirmed shared XP facts without decrementing lifetime XP.

The central implementation move is to persist the selected result, economy effects and history before any animation begins. The browser receives a resumable authoritative round and renders either the 5.5 second reel or the reduced-motion staged reveal. Replays can only replay the persisted outcome. This keeps the spectacle honest: no client-supplied result, no duplicated boost spend, no duplicated pity progress and no cross-duo leakage.

The highest risks are concurrency, economy correctness and visual/accessibility quality. PostgreSQL should enforce one active roulette round per duo, idempotency keys, append-only balance ledger entries, unique history/effect rows and forced RLS. Pure domain tests should cover eligible pool filtering, weighted selection, pity, boost math, weekend multiplier, cooldown and 60-cover reel generation. Integration tests should prove concurrent spin requests converge to one persisted round/effect. Browser tests should prove the reel, result resume, mute, reduced-motion and lock-as-Principal flows work for both duo members.

## Scope Findings

- Mapped requirements are `ROUL-01` through `ROUL-10` and `SAFE-06`.
- `06-CONTEXT.md` contains 32 trackable decisions. Plans must carry all D-IDs, especially D-03, D-08, D-12, D-15, D-16, D-19, D-21, D-24, D-26 and D-29 because they define server authority, economy idempotency and handoff behavior.
- Phase 6 depends on Phase 5. It should use shared XP facts/projection as inputs, but must not spend or reduce lifetime XP/level.
- Phase 6 owns `/app/roleta`, compact roulette history and the handoff to `Jogando Principal`. It should not build Hall da Moral replay, broad duo stats, store/cosmetics or new discovery modes.
- The current app has no `roulette` module yet. The plan should create the domain boundary rather than placing rules in `page.tsx` or Server Actions.
- The phase has frontend/UI scope and currently lacks `06-UI-SPEC.md`; the workflow should stop before PLAN generation until `$gsd-ui-phase 6` runs or planning is explicitly re-run with `--skip-ui`.

## Current Codebase Patterns

### Reusable assets

- `apps/web/src/modules/play` and `apps/web/src/modules/gamification` are the closest module patterns: public `index.ts`, pure domain policy files, application ports and server-only infrastructure repositories.
- `packages/db/src/schema/app.ts` already has `duo_library_games`, `play_active_games`, `play_notifications`, `duo_xp_awards`, gamification achievements/quests/streaks and `app.duos.xp/level/streak` projections.
- `packages/db/src/rls/policies.sql` uses forced RLS and membership policies for every duo-scoped table. Roulette tables should mirror this.
- `apps/web/src/modules/play/application/activate-playing-game.ts` already returns a `replacement-required` branch when the duo has three active `Jogando` games. Roulette lock-as-Principal should reuse or mirror this behavior through a public Play/Library contract.
- `apps/web/src/modules/library/application/move-library-game.ts` is the existing cross-module coordinator pattern for library-to-play handoff.
- `apps/web/src/components/app-shell.tsx` owns authenticated navigation and should add a `Roleta` entry once the route exists.
- `packages/ui/src/brand/mark.tsx` exposes `RoulettePointer` and `RouletteDivider`; these should anchor the central pointer motif.
- `packages/ui/src/tokens.css` exposes `--rarity-common`, `--rarity-rare`, `--rarity-epic` and `--rarity-legendary`, plus global reduced-motion behavior.

### Existing constraints to preserve

- Business rules do not belong in routes, Server Actions or React components.
- Domain files cannot import Next.js, React, Drizzle, Better Auth, browser APIs or external SDKs.
- Duo-scoped tables require `duo_id`, forced RLS, reviewed grants, indexes and cross-duo tests.
- Missing `TEST_DATABASE_URL`, browser fixtures or production evidence remains blocked evidence, not a passing result.
- UI may animate or optimistically show pending state, but result, boost spend/refund, pity, cooldown, history and handoff are server-authoritative.
- Audio must be opt-in after explicit interaction and easy to mute.

## Recommended Architecture

Add `apps/web/src/modules/roulette` with:

- `domain/`
  - Eligible pool policy for `wishlist` and `pausado`, minimum pool size and excluded statuses.
  - Rarity model, base weights, boost weights, pity threshold, cooldown discount and weekend multiplier.
  - Server selection policy that accepts deterministic random inputs in tests.
  - Visual reel policy that creates 60 display slots while keeping the selected result single and authoritative.
  - Round state policy for active, revealing, pending invitation, locked, discarded and replay states.
  - Economy policy for spendable boost balance, cap, cost, refund and weekend calculation.
- `application/`
  - `getRouletteState`
  - `startRouletteRound`
  - `replayRouletteRound`
  - `resolveRouletteResult`
  - `lockRouletteResultAsPrincipal`
  - `discardRouletteResult`
  - `getRouletteHistory`
- `infrastructure/`
  - Server-only Postgres repository with user transactions, membership resolution, row locks and idempotency handling.
  - Transaction helpers for boost ledger, pity state, active round uniqueness, history and handoff effects.
  - Optional adapter to consume gamification XP ledger facts into boost balance if not computed directly from the ledger.
- `presentation/`
  - Server route view model for `/app/roleta`.
  - Client reel component for the 5.5 second animation and reduced-motion equivalent.
  - Audio controller component that only starts after user interaction and respects stored audio preference.
  - Result panel, pending invitation actions, replacement-required branch and compact history.
- `index.ts`
  - Narrow public entrypoint for route composition and tests. Do not export infrastructure internals.

## Database Model Guidance

Suggested tables or equivalent shapes:

- `app.roulette_boost_balances`
  - `duo_id`, `balance`, `cap`, `updated_at`.
  - One row per duo. Non-negative check and cap check.
- `app.roulette_boost_ledger`
  - Append-only balance facts: `duo_id`, `ledger_key`, `source_type`, `source_id`, `amount_delta`, `reason_code`, `actor_user_id`, `metadata`, `created_at`.
  - Unique `(duo_id, ledger_key)` and source uniqueness where applicable.
- `app.roulette_pity_state`
  - `duo_id`, `draws_since_epic_or_higher`, `last_epic_or_higher_at`, `updated_at`.
  - One row per duo; non-negative checks.
- `app.roulette_rounds`
  - `duo_id`, `idempotency_key`, `status`, `result_library_game_id`, `result_catalog_game_id`, `result_rarity`, `boost_spent`, `boost_ledger_id`, `pity_before`, `pity_after`, `weekend_multiplier_applied`, `selected_at`, `revealed_at`, `resolved_at`, actor fields and metadata snapshots.
  - Partial unique index for one active/pending round per duo where status is `active`, `revealing` or `pending_invitation`.
  - Unique `(duo_id, idempotency_key)` to make repeated start requests converge.
- `app.roulette_round_entries`
  - Optional persisted 60-slot visual reel snapshot. If not persisted, store enough seed/snapshot metadata to reconstruct the same 60-slot list for both members and replay.
- `app.roulette_cooldowns`
  - `duo_id`, `library_game_id`, `round_id`, `remaining_rounds` or `cooldown_until_round`, updated after discarded non-locked results.
- `app.roulette_history_events`
  - Append-only audit trail for started, revealed, replayed, locked, discarded and refunded events.

All new tables must have `duo_id`, forced RLS, grants, comments, hot-path indexes and integration tests. Critical writes should use a single transaction that locks the duo roulette state and economy rows before computing outcome.

## Selection And Economy Guidance

Recommended starting constants for planning and simulation:

- Minimum eligible games: 3.
- Display slots: exactly 60.
- Base rarity weights: common 70, rare 22, epic 7, legendary 1.
- Boosted weights: common 55, rare 28, epic 14, legendary 3.
- Pity threshold: after 10 results without Epic or Legendary, force the next qualified result to Epic/Legendary if the eligible pool contains such a candidate.
- Cooldown: discounted probability for the last 3 discarded/non-locked results; not impossible.
- Boost cost: 100 boost balance.
- Boost cap: plan should simulate a moderate cap, for example 500 or 600, then lock it in domain tests.
- Boost earning: derive from confirmed XP facts as a partial mirror, for example 20% of eligible XP awards, with weekend multiplier applied to generated boost balance or effective cost, never to lifetime XP.

The exact numbers are agent discretion from `06-CONTEXT.md`, but the plan must require a deterministic simulation/test matrix before locking them. The domain should accept injected random seed/roll values so tests can assert exact outcomes without brittle randomness.

Pity should update exactly once per persisted result:

- Epic/Legendary result resets `draws_since_epic_or_higher` to 0.
- Common/Rare result increments it by 1.
- A discarded result still counts as a result because it was persisted and revealed.
- Failed pre-persistence boosted start refunds automatically and does not update pity/history.
- Failed post-persistence start is resumable and does not refund by default.

## Roulette Round Flow

Recommended server flow for `startRouletteRound`:

1. Validate session and resolve duo membership.
2. Begin transaction and lock the duo roulette state rows, balance row, pity state and active round partial index path.
3. If an active/pending round exists, return it without a new draw or cost.
4. Read eligible library games from `wishlist` and `pausado`; reject with useful blocked state if fewer than 3 exist.
5. If boost requested, reserve/spend 100 boost balance with idempotent ledger entry.
6. Compute weights from base rarity, boost, cooldown, pity and weekend context.
7. Select one authoritative result and persist round/result/history before returning.
8. Persist or reconstruct a deterministic 60-slot visual reel snapshot that includes the result aligned for the client reveal.
9. Return a view model for the browser animation.

Recommended resolve flow:

- `lockRouletteResultAsPrincipal` verifies membership, round status, result ownership and pending invitation.
- It calls a public Play/Library handoff contract to move the selected game to `jogando` and Principal, preserving replacement-required behavior if three active games exist.
- If replacement is required, return current games and actions; do not auto-pause anything.
- On success, mark the round locked/completed, write history/audit, mark relevant notifications actioned and redirect to `/app` or `/app?estado=roleta-principal`.
- `discardRouletteResult` marks the invitation discarded, records history, applies cooldown and leaves library status unchanged.

## UI And UX Guidance

- `/app/roleta` should be the first screen, not a landing page. It should show the playable roulette ritual, balance/pity context, blocked state or pending result immediately.
- Mobile should use a horizontal full-bleed reel with a fixed central pointer and controls below. The reel should not be a tiny card.
- Desktop can use a wide reel band with side metadata, but avoid nested cards and casino-like excess.
- The 60 covers should be stable-size slots with fixed aspect ratio to avoid layout shift. Repeated covers are allowed visually when the eligible pool has fewer than 60 games.
- The 5.5 second motion uses `cubic-bezier(.15,.85,.25,1)` and tick cadence that grows heavier near the pointer.
- Reduced-motion mode should skip long motion and show staged steps: "A fila esta escolhendo", "Resultado guardado", "Revelado".
- Legendary should use a contained particle/seal effect with static fallback; the rarity seal/border carries meaning even without motion.
- Audio uses tick, drumroll and fanfare only after interaction. Persist or respect duo audio preference and expose a mute control.
- Result copy should use the commitment invitation direction: "A fila apontou para este. Voces travam como Principal?"
- Compact history should show recent rounds, result rarity, boost/pity usage and locked/discarded outcome. It should not become Hall da Moral.

## Security And Concurrency Research

- Treat the browser as untrusted for result, `duoId`, boost spend, pity count, weekend context, lock target and replacement decision.
- Use server-side membership resolution plus RLS for all reads/writes.
- Use transaction-local user context and existing `withAppUserTransaction` patterns.
- One active/pending round per duo is a database invariant, not only application logic.
- Replayed/concurrent start requests must converge by idempotency key or existing active round lookup.
- Boost spend, pity update, cooldown, history and round status should be written in one transaction.
- Cross-duo tests should attempt to read/write another duo's rounds, balance, pity and history.
- Append-only history and boost ledger rows support repudiation/audit.
- The web runtime role must not receive migrator privileges or `BYPASSRLS`.

## Recommended Plan Shape

Use five plans:

1. Roulette data model, RLS, module skeleton, pure selection/economy policies and repository contracts.
2. Authoritative round creation, boost/pity/cooldown/idempotency transactions and state read model.
3. `/app/roleta` route, 60-cover reel, audio, reduced motion, result panel and compact history.
4. Lock/discard result handoff to `Jogando Principal`, replacement-required branch, notifications and dashboard routing.
5. Phase 6 gate: DB/RLS/concurrency, unit/application/UI tests, browser E2E, accessibility/reduced-motion, economy simulation and performance review.

This order lands database/domain invariants before the visual ritual, then integrates the handoff, then proves the full flow.

## Verification Priorities

- Unit tests for eligible status filtering, minimum pool, 60 display slots, weighted selection, pity, boost, weekend multiplier, cooldown and replay state.
- Application tests with fake repositories for idempotent start, active round resume, boost refund pre-persistence, post-persistence resume, lock/discard rules and replacement-required branch.
- DB integration tests for migrations, forced RLS, role privileges, one active round per duo, concurrent start convergence and boost/pity/history exactly once.
- UI tests for reel layout, central pointer, rarity borders, Legendary static/particle states, mute control, reduced-motion path, blocked state and compact history.
- E2E tests with two duo users plus other-duo actor for start, resume same result, replay not redraw, lock as Principal, discard and cross-duo denial.
- Gate artifact that records missing `TEST_DATABASE_URL`, E2E fixtures, audio/browser evidence or production deployment evidence as blockers rather than passing proof.

## Validation Architecture

Phase 6 validation should combine fast deterministic unit tests with slower DB/browser gates:

| Layer | Coverage | Command |
|-------|----------|---------|
| Domain | Eligibility, 60-slot reel, weighted selection, pity, boost, weekend and cooldown | `pnpm --filter @queue/web test -- roulette-domain` |
| Application | Idempotent start, active round resume, resolve lock/discard, replacement branch | `pnpm --filter @queue/web test -- roulette-application` |
| DB integration | Migration, RLS, role grants, concurrency, one active round, boost/pity/history once | `pnpm --filter @queue/db test:integration -- roulette` |
| Component/UI | Reel, audio mute, reduced motion, result panel, history, no overlap | `pnpm --filter @queue/web test -- roulette-ui` |
| Browser E2E | Two-member flow, resume same result, lock Principal, discard, other-duo denial | `pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts tests/accessibility.spec.ts` |
| Full gate | Source, DB, browser, accessibility, economy simulation and performance evidence | `pnpm phase:6:gate` |

Wave 0 should create failing/stub tests before broad implementation when a plan introduces schema or cross-module contracts. No three consecutive tasks should lack an automated verification command. Missing DB/browser fixtures must create explicit BLOCKED output in the final gate.

## Open Questions For Execution

- Whether boost balance is materialized from XP facts at award time or rebuilt periodically from `duo_xp_awards`. The plan should prefer materialized ledger entries for explicit spend/refund audit, with rebuild checks.
- Whether the 60-slot reel snapshot is persisted as rows or reconstructed from a stored deterministic seed. Persist rows are simpler for replay/audit; stored seed is smaller but must be deterministic across code changes.
- Whether lock-as-Principal should call a new Play public contract directly or route through an enhanced Library coordinator. The chosen API must not deep-import Play internals.
- Exact rarity weights, boost cap and cooldown duration need simulation before implementation, but must remain understandable in UI copy.

