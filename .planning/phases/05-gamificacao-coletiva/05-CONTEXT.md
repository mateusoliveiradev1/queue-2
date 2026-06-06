# Phase 5: Gamificacao Coletiva - Context

**Gathered:** 2026-06-06T00:43:35.5731360-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns real duo activity into an auditable collective gamification system. It delivers shared XP, 50 thematic levels, achievements, quests, streaks, Streak Freeze, rarity styling, reward celebrations, a discreet XP ledger surface, dashboard summary, `/app/conquistas`, `/app/desafios`, and the scheduled rotation jobs needed for weekly, monthly and seasonal challenges.

The phase owns the gamification domain and its integration with confirmed Play, Discovery, Library and scheduled job facts. It does not add individual XP, competitive ranking, a store, an equipable inventory, spendable cosmetics, roulette boost spending, Hall/review replay, or public launch polish.

</domain>

<decisions>
## Implementation Decisions

### Cadencia de XP e niveis

- **D-01:** XP should feel moderate with strong milestones. The duo should receive meaningful progress from real confirmed actions, but the economy must not become noisy or farmable.
- **D-02:** The 50-level curve should follow the planned approximate `1.18` multiplier. Early levels may receive small simulation-driven adjustments if the first sessions feel too slow.
- **D-03:** Level-up feedback uses a QUEUE/2 special toast plus a dashboard detail/state. It should feel elevated without forcing a blocking overlay.
- **D-04:** XP is not spent during Phase 5. Spending shared XP remains reserved for Phase 6 roulette boost/economy work.

### Conquistas iniciais

- **D-05:** Achievement tone mixes ritual weight with duo inside-joke energy. The copy should feel like QUEUE/2, not generic SaaS badges or throwaway jokes.
- **D-06:** Most achievements are visible so the duo knows what to pursue. A smaller set may be hidden for rare, funny or surprising moments.
- **D-07:** The initial achievement catalog should weight real play more heavily: Story, Coop-Sincronia, Compromisso and Streak are primary. Roleta and Comedia are seasoning, not the center of Phase 5.
- **D-08:** Rarity changes visual treatment and celebration intensity. It does not create competition or ranking between members.
- **D-09:** Achievement icons must be custom engraved-style SVG badges without emoji, matching the project visual contract.

### Quests e rotacao

- **D-10:** Quests are a light habit guide, not a demanding chore list. They should encourage healthy duo behavior without guilt.
- **D-11:** Weekly quests are personalized by the duo's current state, using simple and explainable eligibility. Avoid opaque behavior-model personalization in v1.
- **D-12:** Seasonal quests in v1 are few and explicit. Spooky, Awards and Anniversary can exist as calendar-activated seeds without a complex campaign engine.
- **D-13:** Normal quests award XP when completed. Monthly and seasonal quests may have a larger final milestone when that fits the challenge.
- **D-14:** Jobs create/reset quest windows and expire old state. Real user actions complete progress and award rewards inside the authoritative transaction.

### Streak sem culpa

- **D-15:** Streak is maintained by real confirmed duo actions: confirmed sessions, completed chapters, completed quests, confirmed scheduled attendance and equivalent confirmed facts. Navigation, page views and weak interactions do not count.
- **D-16:** The duo day closes at 04:00 in the duo timezone. Activity between 00:00 and 03:59 counts toward the previous duo day.
- **D-17:** Streak Freeze is consumed automatically when a day would be lost and a freeze is available.
- **D-18:** The streak visual can use an energetic flame and freezing state, but copy and alerts must avoid guilt, pressure or shame. Reduced-motion users need an equivalent low-motion state.
- **D-19:** The duo earns one Streak Freeze every ten levels.

### Dashboard da gamificacao

- **D-20:** Gamification appears as a band immediately below the Principal/Jogando Agora hero. It supports the current game commitment and must not replace the hero.
- **D-21:** The first dashboard view shows XP, level, streak, three active quests and recent achievements.
- **D-22:** Phase 5 uses dedicated routes `/app/conquistas` and `/app/desafios`, matching the roadmap. The dashboard remains a summary surface.
- **D-23:** The user-facing XP history is a discreet ledger explaining why the duo gained XP in product language. It should not expose technical ledger details as an administrative table.

### Eventos que contam

- **D-24:** Gamification is driven by confirmed duo facts: confirmed sessions, completed chapters, completed quests, confirmed terminal status, real matches and other authoritative domain facts.
- **D-25:** Discovery matches may count toward achievements or quest progress, but they do not grant recurring XP by themselves.
- **D-26:** `Zerado` is a major collective milestone in Phase 5. A partner-confirmed completion should produce meaningful XP, achievement/progress and celebration.
- **D-27:** `Dropado` never punishes the duo, removes XP or breaks streak by itself. It may be recorded neutrally and may unlock a rare/humorous achievement if the copy stays non-shaming.

### Processamento das recompensas

- **D-28:** XP, level projection and immediate achievements for session/chapter/quest/zerado facts are applied in the same transaction as the confirmed action.
- **D-29:** If a critical immediate reward cannot be applied, the confirming action should fail with it. The product must not confirm a session or `Zerado` while silently losing XP, level or achievement effects.
- **D-30:** `app.duos.xp`, `app.duos.level` and `app.duos.streak` are transactional projections of authoritative ledgers/facts. The ledger remains rebuildable audit truth.
- **D-31:** Reconciliation/rebuild paths may recompute projections from the ledger/facts, but normal UX should be immediate.

### Nomes dos 50 niveis

- **D-32:** The 50 levels use unique names, not generic bands. This is high-priority product copy, not filler.
- **D-33:** The naming direction is progression of coop intimacy: casual beginnings toward legendary partnership, with a QUEUE/2 voice.
- **D-34:** Names should be natural PT-BR with subtle cultural references, avoiding dated memes and heavy slang.
- **D-35:** `Lv1 Casuais` and `Lv50 Lendas do Coop` are locked anchors. Intermediate names are left to planning/implementation, but must be excellent.
- **D-36:** The level-name list must be shaped, critiqued, audited and polished using the project's Impeccable discipline for copy quality.

### Anti-farm e justica

- **D-37:** Anti-farm should rely on invisible, natural limits: idempotency, source caps and eligibility from confirmed facts. Do not expose the product as an anti-farm rulebook.
- **D-38:** Very short confirmed sessions may count as progress, but session XP requires a minimum duration.
- **D-39:** Manual chapters need lightweight spam protection: valid title, reasonable caps per game/day and XP only once per completed chapter.
- **D-40:** If abuse or balance errors are detected later, correct through ledger/projection reconciliation and explicit adjustment records. Do not erase history.

### Recompensas de desafios

- **D-41:** Normal challenges give XP and progress. Special challenges may unlock a unique duo badge/achievement.
- **D-42:** Unique rewards in Phase 5 are permanent achievements/badges. There is no equipable inventory, shop, cosmetic loadout or spendable cosmetic system.
- **D-43:** Seasonal challenges may leave a dated permanent seal in the duo's history when completed.
- **D-44:** Incomplete challenges do not leave visible failure marks. They can reset without becoming shame or historical debt.

### the agent's Discretion

- Choose exact XP amounts, minimum session duration, level thresholds, quest weights, seed counts, cap values, database table names, route/component structure, and copy variants as long as the decisions above hold.
- Choose the exact implementation split between a new `gamification` module and integration hooks from existing modules, preserving public entrypoints and the architecture contract.
- Choose the safest reconciliation strategy and adjustment record shape, but keep ledger/fact auditability intact.
- Choose the exact visual composition of dashboard bands, achievement cards, quest cards, rarity borders and reduced-motion alternatives while preserving QUEUE/2 quality, accessibility and no nested-card clutter.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 5 goal, requirements, success criteria and boundaries before Phase 6/7.
- `.planning/REQUIREMENTS.md` - PLAY-05, GAME-01 through GAME-17 and SAFE-03.
- `.planning/PROJECT.md` - Deep Gamification, Core Product Principle, Playing Now relationship, scheduled jobs, visual quality and no-competition constraints.
- `AGENTS.md` - Repository operating rules, GSD workflow requirement, frontend quality bar and binding architecture/security pointers.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith boundaries, public module entrypoints, dependency direction and rule that business logic does not live in routes/UI.
- `.planning/SECURITY.md` - Server authorization, RLS, least privilege, duo isolation, idempotency, jobs and every-phase release gates.
- `.planning/research/STACK.md` - Next.js App Router, Neon Postgres, Drizzle, Vercel Cron/jobs, Tailwind, Motion, Vitest and Playwright stack guidance.

### Prior decisions

- `.planning/phases/04-jogando-agora-sessoes-e-agendamento/04-CONTEXT.md` - Confirmed play/session/chapter/schedule facts, XP awards, terminal confirmation and notification/job boundaries that Phase 5 consumes.
- `.planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-CONTEXT.md` - Production performance and server-authoritative mutation feedback constraints for heavier dashboard/gamification writes.
- `.planning/phases/03.2-biblioteca-escalavel-e-backlog-operacional/03.2-CONTEXT.md` - Operational library/archive boundary and `Zerado`/`Dropado` relationship to active queue.
- `.planning/phases/03-descoberta-e-matches/03-CONTEXT.md` - Discovery matches and match handoff facts that can feed achievements/quests without recurring XP farming.

### Current code integration points

- `packages/db/src/schema/app.ts` - Existing `app.duos.xp`, `level`, `streak`, `play_*` tables and `app.duo_xp_awards` ledger.
- `packages/db/src/schema/ops.ts` - Existing `ops.domain_events`, `ops.idempotency_keys` and `ops.scheduled_jobs` foundations for derived facts, idempotency and rotations.
- `packages/db/src/rls/policies.sql` - RLS patterns to extend to gamification tables and scheduled jobs.
- `apps/web/src/modules/play/domain/play-policy.ts` - Current XP constants and confirmed-action policy for live sessions, scheduled sessions and chapters.
- `apps/web/src/modules/play/application/ports.ts` - Existing play repository contracts and XP award record/input shapes.
- `apps/web/src/modules/play/infrastructure/play-repository.ts` - Current transactional XP award insertion and scheduled reminder job pattern.
- `apps/web/src/app/app/page.tsx` - Dashboard surface where the gamification band appears below Principal.
- `apps/web/src/modules/play/presentation/playing-now-dashboard.tsx` - Existing Principal/Jogando Agora surface that gamification must support without overtaking.
- `apps/web/src/components/app-shell.tsx` - Authenticated shell and navigation that must gain `/app/conquistas` and `/app/desafios` access if not already present.
- `packages/ui/src/feedback/toast.tsx` - QUEUE/2 toast behavior to use for level-up and special celebrations.
- `packages/ui/src/tokens.css` and `packages/ui/src/index.ts` - Rarity and brand token contracts for achievement/quest/rank visuals.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `app.duo_xp_awards` already stores append-only XP facts with unique `award_key` and source uniqueness. Phase 5 should extend this into a broader gamification ledger/projection model rather than replace it.
- `app.duos.xp`, `level` and `streak` already exist as columns and should become transactional projections of gamification facts.
- `ops.scheduled_jobs` already supports due job claiming with `FOR UPDATE SKIP LOCKED`, retries and job keys. Quest rotation should reuse or extend this pattern.
- `packages/ui` already exposes brand, rarity tokens and special toast primitives suitable for level-up and achievement celebrations.
- Existing play use cases already apply XP for live sessions, scheduled attendance and chapters after confirmation. Phase 5 should coordinate with these flows instead of duplicating reward logic in routes.

### Established Patterns

- Authenticated routes require verified sessions and ready duo state before private app surfaces render.
- Routes compose module public APIs; business rules belong in domain/application modules, not React components or route handlers.
- Duo-scoped data uses server authorization plus forced RLS. Gamification ledgers, quest progress, achievement unlocks and streak data must follow the same isolation model.
- Optimistic UI may communicate pending/syncing, but XP, achievements, quests and streak remain server-authoritative.
- Missing DB/browser/job evidence is recorded honestly as blocker evidence, not as passing proof.

### Integration Points

- Introduce a `gamification` domain/module with public entrypoints for dashboard summary, XP awards/projections, level curve, achievements, quests, streak, rotation jobs and reward notifications.
- Extend `packages/db` with achievement catalog/unlocks, quest catalog/cycles/progress, streak freeze state, reward/adjustment records and indexes/RLS.
- Wire confirmed Play and Discovery facts into gamification through public contracts or domain events, preserving module boundaries.
- Update `/app` to render the gamification band below `PlayingNowDashboard`.
- Add `/app/conquistas` and `/app/desafios` surfaces with responsive, accessible grids/lists and rarity visuals.
- Add focused unit, integration and browser tests for XP idempotency, level projection, quest rotation by duo timezone, streak 04:00 cutoff, freeze consumption, cross-duo isolation and no duplicate rewards.

</code_context>

<specifics>
## Specific Ideas

- Gamification should feel like the duo's shared ritual getting recognized, not like individual performance tracking.
- Level names must be unusually polished: 50 unique PT-BR names, with Impeccable-style shape/critique/audit/polish before accepting the list.
- `Zerado` needs to feel like a major collective milestone already in Phase 5, while the full Hall memory/replay remains Phase 7.
- Reward copy should avoid guilt, shame, pressure and competition. The product celebrates consistency and shared history.
- Challenges can create permanent badges/seals, but not an inventory, store or equipable cosmetic system.

</specifics>

<deferred>
## Deferred Ideas

- Spending XP on roulette boost belongs to Phase 6.
- Roulette pity, weekend multiplier and result economy belong to Phase 6.
- Hall da Moral, reviews, replay timeline, broad duo stats and completed-game memory shelves belong to Phase 7.
- Equipable cosmetics, store, inventory, titles as configurable profile loadout and cosmetic economy are outside Phase 5.
- Public leaderboards, individual XP, member-versus-member stats and punitive streak systems remain out of scope.

</deferred>

---

*Phase: 5-Gamificacao Coletiva*
*Context gathered: 2026-06-06T00:43:35.5731360-03:00*
