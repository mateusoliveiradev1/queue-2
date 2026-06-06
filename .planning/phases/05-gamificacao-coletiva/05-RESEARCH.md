# Phase 05 Research: Gamificacao Coletiva

**Phase:** 05 - Gamificacao Coletiva
**Generated:** 2026-06-06
**Mode:** inline research, selected by user during `$gsd-plan-phase 5`

## RESEARCH COMPLETE

## Executive Summary

Phase 5 should introduce a first-class `gamification` module that owns shared XP, level projection, achievements, quests, streaks, Streak Freeze, reward notifications and the dashboard/challenge/achievement read models. The existing Phase 4 `play` module already records confirmed sessions, chapters, terminal status requests, scheduled attendance, push subscriptions and jobs. It also created `app.duo_xp_awards` as a minimal append-only XP ledger and `app.duos.xp`, `level`, `streak` projection columns.

The key implementation move is to graduate that minimal ledger into an auditable shared economy without letting the UI, routes or the `play` module become the owner of gamification rules. Confirmed facts from Play, Discovery and Library should call a narrow gamification public contract or emit domain events that the gamification application layer consumes in the same transaction when the reward is critical. For immediate effects such as session XP, chapter XP and `Zerado`, the confirming action must fail if the critical gamification effect cannot be applied.

The highest risks are duplication, farmable XP, timezone mistakes, cross-duo leakage and copy/visual quality. PostgreSQL should enforce idempotency, duo isolation, source uniqueness, quest window uniqueness and unlock uniqueness. Pure domain tests should cover economy rules, level thresholds, quest eligibility, streak cutoff at 04:00, freeze consumption and anti-farm caps. Browser tests should prove the experience feels collective: no individual XP totals, no internal ranking, no shame copy and reduced-motion equivalents for flame/freezing/celebration states.

## Scope Findings

- Mapped requirements are `PLAY-05`, `GAME-01` through `GAME-17`, and `SAFE-03`.
- `05-CONTEXT.md` contains 44 trackable decisions. The plans must explicitly carry all D-IDs, especially the product-copy decisions for 50 level names, hidden achievements, guilt-free streaks and challenge reset behavior.
- Phase 5 depends on Phase 4. It should not rebuild Play; it should consume confirmed Play facts and harden existing XP side effects.
- Phase 6 owns spending XP, roulette boosts, pity and weekend multipliers. Phase 5 can show rarity and prepare reward types, but must not add spendable cosmetics, inventory or boost purchase flows.
- Phase 7 owns Hall, reviews, broad duo stats and launch polish. Phase 5 can celebrate `Zerado` as a major milestone, but not build the full Hall/replay surface.

## Current Codebase Patterns

### Reusable assets

- `apps/web/src/modules/play` already follows the modular shape: `domain`, `application`, `infrastructure`, `presentation` and public `index.ts`.
- `packages/db/src/schema/app.ts` already includes `app.duos.xp`, `level`, `streak`, `app.duo_xp_awards`, play session/chapter/scheduled/terminal tables and forced-RLS policy mirrors.
- `packages/db/src/schema/ops.ts` already includes `ops.domain_events`, `ops.idempotency_keys` and `ops.scheduled_jobs`.
- `apps/web/src/modules/play/infrastructure/play-repository.ts` inserts XP awards for live sessions, scheduled sessions and chapters, but current repository snippets show award insertion only; Phase 5 must ensure `app.duos.xp`, `level` and `streak` are updated as transactional projections.
- `/app` currently renders `PlayingNowDashboard` before the status metrics. The Phase 5 dashboard band should mount immediately below `PlayingNowDashboard`, preserving the Principal/Jogando Agora hero as the first commitment surface.
- `AppShell` navigation currently has Fila, Catalogo, Descobrir, Biblioteca, Dupla and Perfil. Phase 5 needs `/app/conquistas` and `/app/desafios`.
- `packages/ui/src/tokens.css` already exposes rarity color tokens, and `packages/ui/src/feedback/toast.tsx` exposes the QUEUE/2 special toast pattern.
- `scripts/phase-4-gate.mjs` is the closest model for a phase gate that passes local checks while reporting missing DB/E2E/cron evidence as named blockers.

### Existing constraints to preserve

- Business rules do not belong in `page.tsx`, route handlers, Server Actions or React components.
- Domain files cannot import Next.js, React, Drizzle, Better Auth, browser APIs or external SDKs.
- Duo-scoped tables require `duo_id`, forced RLS, grants and cross-duo tests.
- Missing `TEST_DATABASE_URL`, browser fixtures, cron or push configuration remains blocked evidence, not a passing result.
- Optimistic UI may show pending/syncing, but XP, level, achievements, quests and streak are server-authoritative.

## Recommended Architecture

Add `apps/web/src/modules/gamification` with:

- `domain/`
  - XP source policy, source caps and anti-farm rules.
  - Level curve version, 50 level thresholds and polished PT-BR level names.
  - Achievement catalog, groups, rarities, hidden/visible behavior and unlock predicates.
  - Quest catalog, weekly/monthly/seasonal window rules and progress predicates.
  - Streak day calculation, 04:00 cutoff, freeze earning/consumption and guilt-free copy states.
  - Reward notification/celebration intensity policy.
- `application/`
  - `getGamificationDashboard`
  - `applyGamificationFact`
  - `getAchievements`
  - `getChallenges`
  - `runQuestRotationJobs`
  - `runStreakJobs`
  - `rebuildGamificationProjections`
  - `getXpLedger`
- `infrastructure/`
  - Server-only Postgres repository behind application ports.
  - Transaction helpers for immediate reward effects.
  - Scheduled job claim/rotation functions using `ops.scheduled_jobs`.
  - Optional seed/copy validation helper for level names, achievements and quest catalogs.
- `presentation/`
  - Dashboard band, XP/level/streak cards, active quest summary, recent achievement list, ledger drawer/section.
  - Achievement grid with rarity filters and custom SVG badge icons.
  - Challenge page with weekly/monthly/seasonal sections.
  - Streak flame/freezing presentation with reduced-motion equivalent.
- `index.ts`
  - Narrow public entrypoint. Play/Discovery should import only public application contracts or domain event types.

## Database Model Guidance

Suggested tables or equivalent shapes:

- `app.gamification_xp_ledger`
  - Authoritative append-only ledger or migration-compatible successor to `app.duo_xp_awards`.
  - `duo_id`, `ledger_key`, `source_type`, `source_id`, `amount`, `reason`, `metadata`, `created_by_user_id`, `created_at`.
  - Unique `(duo_id, ledger_key)` and `(duo_id, source_type, source_id)` where source uniqueness is required.
- `app.gamification_projection_rebuilds` or `ops.gamification_reconciliation_runs`
  - Records rebuild/adjustment runs and explicit correction records without erasing history.
- `app.gamification_achievements`
  - Seeded catalog rows or deterministic catalog mirror with slug, group, rarity, visibility, title, copy, icon key and predicate metadata.
- `app.gamification_achievement_unlocks`
  - `duo_id`, `achievement_slug`, source fact, unlocked_at; unique `(duo_id, achievement_slug)`.
- `app.gamification_quest_templates`
  - Weekly/monthly/seasonal templates, season key, eligibility metadata, reward metadata and active date rules.
- `app.gamification_quest_cycles`
  - Per-duo quest window, window start/end in duo timezone, reset kind and selected quest slugs; unique `(duo_id, quest_slug, cycle_key)`.
- `app.gamification_quest_progress`
  - Progress counters, completed_at, reward ledger key and source facts.
- `app.gamification_streak_events`
  - Duo-day activity facts, freeze earned/consumed facts and rebuildable streak state.
- `app.gamification_reward_notifications`
  - Optional persistent reward feed for level-ups, achievements and quest completions, or extend existing `play_notifications` into an owner-safe product notification model if ownership is clarified.

Existing `app.duos.xp`, `app.duos.level` and `app.duos.streak` should remain transactional projections. Phase 5 should either migrate `app.duo_xp_awards` into the new ledger or keep it as the initial ledger while adding reason metadata, source coverage and projection update functions. Normal product flows should not require a background job to see XP/level changes.

## Reward And Event Integration

Recommended confirmed facts:

| Fact | Source owner | Phase 5 effect |
|------|--------------|----------------|
| confirmed live session | `play` | XP if minimum duration passes, streak activity, quest progress, session achievements |
| confirmed offline session | `play` | streak/progress and possible XP only if policy allows; avoid farming very short sessions |
| completed chapter | `play` | one-time XP, quest progress, story achievements |
| confirmed scheduled attendance | `play` | one-time XP, streak activity, commitment achievements |
| confirmed `Zerado` | `play`/`library` | major XP, achievements, quest progress and special celebration |
| confirmed `Dropado` | `play`/`library` | neutral fact, optional non-shaming rare/comedy achievement, no punishment |
| discovery match | `discovery` | achievement/quest progress, no recurring XP by itself |
| quest completion | `gamification` | XP reward, possible special badge, notification |

Critical immediate rewards should run in the same transaction as the confirmed fact. Non-critical derived notifications can be repaired by reconciliation, but the authoritative ledger/projection must not silently lose XP or unlocks.

## XP And Level Strategy

- Keep XP shared at duo level only. No table, view model or UI copy should expose individual totals.
- Define a versioned level curve with approximately `1.18` growth and exactly 50 named levels.
- Store or export the curve version so future economy adjustments can be audited.
- Compute projections from the authoritative ledger and update `app.duos.xp` and `app.duos.level` in the same transaction as new ledger rows.
- Use adjustment records for corrections instead of deleting ledger history.
- Treat the 50 level names as product copy. The implementation should include a static reviewed list and tests that assert uniqueness, anchors `Lv1 Casuais` and `Lv50 Lendas do Coop`, no placeholder strings and natural PT-BR.

## Achievements Guidance

- Seed approximately 50 achievements across Story, Coop-Sincronia, Compromisso, Descoberta, Streak, Roleta and Comedia.
- Weight Story, Coop-Sincronia, Compromisso and Streak more heavily than Roleta/Comedia in Phase 5.
- Most achievements should be visible. A smaller hidden set is acceptable for rare or surprising moments.
- Rarity affects styling and celebration intensity only. It must not imply member ranking.
- Icons should be custom engraved-style SVG components/assets with no emoji. Tests should reject emoji in achievement icon/copy sources.
- Store unlock facts once per duo and expose filters by rarity on `/app/conquistas`.

## Quest And Streak Guidance

- Weekly quests: three active quests, reset Monday 00:00 in the duo timezone.
- Monthly quest: one active monthly quest per duo window.
- Seasonal quests: explicit seeds for Spooky, Awards and Anniversary, calendar-activated without a complex campaign engine.
- User actions progress quests inside authoritative transactions. Jobs create/reset windows and expire old state.
- Streak activity must use real confirmed duo facts only. Page views, navigation and weak interactions do not count.
- Duo day closes at 04:00 in the duo timezone. Activity from 00:00 to 03:59 counts toward the previous duo day.
- Streak Freeze is earned every ten levels and consumed automatically when a day would be lost.
- Incomplete challenges should disappear/reset without visible failure marks.

## UI And UX Guidance

- `/app` should keep `PlayingNowDashboard` as the hero, then render a gamification band with XP, level, streak, three active quests and recent achievements.
- The XP history should be a discreet product-language ledger, not an admin table.
- `/app/conquistas` should support rarity filters, grouped badges, visible/hidden states and responsive dense grids.
- `/app/desafios` should show weekly, monthly and seasonal progress, reset/freshness copy and completed rewards without guilt.
- Level-up and achievement feedback should use QUEUE/2 special toasts and inline state rather than blocking modals.
- Reduced-motion users need static intensity states for flame/freezing/level-up/achievement celebration.
- Rarity visuals should use existing rarity tokens and avoid a one-note neon arcade look.

## Operational Research

- Phase 4 already records reminder readiness as environment-gated. Phase 5 should reuse `ops.scheduled_jobs` and the Phase 4 gate pattern rather than promise job precision without configured runner evidence.
- Quest rotation and streak checks should be idempotent jobs. Duplicate or overlapping invocations must not duplicate quest cycles, XP, freeze consumption or notifications.
- `SAFE-03` covers catalog synchronization, streak checks, quest rotation and reminders. Phase 5 gate should include job coverage for quest rotation and streak checks while preserving the existing catalog/play reminder paths.

## Recommended Plan Shape

Use six plans:

1. Gamification schema, RLS, module skeleton, level curve, seed catalogs and pure policies.
2. Reward engine, projection updates, Play/Discovery integration and reconciliation.
3. Dashboard gamification band, XP ledger surface and reward toast states.
4. `/app/conquistas`, achievement grid, rarity filters and custom engraved SVG badges.
5. `/app/desafios`, quest rotation jobs, streak 04:00 cutoff and Streak Freeze.
6. Phase 5 gate: local checks, DB/RLS/concurrency, browser/accessibility, query review, job evidence and economy/copy audit.

This order lets database/domain invariants land before the user-facing surfaces and keeps the final plan focused on release evidence rather than feature work.

## Verification Priorities

- Unit tests for level thresholds, projection math, source caps, XP idempotency, achievement predicates, quest windows, streak cutoff and freeze consumption.
- Integration tests for RLS, ledger/projection atomicity, duplicate facts, quest rotation idempotency, streak job idempotency and cross-duo isolation.
- UI tests for dashboard band, ledger copy, achievement rarity filters, hidden achievement states, challenge progress, flame/freezing reduced motion and no individual XP.
- E2E tests with two ready duo users plus other-duo actor for cross-duo denial and partner-confirmed `Zerado` reward behavior.
- Gate artifact that honestly records missing `TEST_DATABASE_URL`, E2E fixtures, cron/worker configuration or push/toast browser evidence as blockers.

## Open Questions For Execution

- Whether to keep `app.duo_xp_awards` as the canonical ledger table or migrate to a gamification-named ledger. The plan should allow either, but must require rebuildability, source coverage and projection updates.
- Whether reward notifications should extend `app.play_notifications` or move into a product-wide/gamification-owned notification feed. The chosen path must preserve ownership and not make Play own Phase 5 reward semantics.
- How many seasonal quests ship in initial seeds. Context locks Spooky, Awards and Anniversary as acceptable explicit seeds; execution should avoid a generic campaign engine.

