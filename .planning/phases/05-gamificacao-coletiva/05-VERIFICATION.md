---
phase: 05-gamificacao-coletiva
verified: 2026-06-06T13:27:55Z
status: gaps_found
score: 7/13 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Active quests rotate on the duo calendar and scheduled streak maintenance actually runs for every ready duo"
    status: failed
    reason: "The cron route and workers only claim existing ops.scheduled_jobs rows; no production code enqueues or recurs gamification-quest-rotation or gamification-streak-check jobs. Quest windows are also converted from duo-local dates to UTC midnight, so reset instants are wrong outside UTC."
    artifacts:
      - path: "apps/web/src/modules/gamification/application/run-quest-rotation-jobs.ts"
        issue: "Consumer-only worker; duoWindowDate converts every local boundary to T00:00:00.000Z."
      - path: "apps/web/src/modules/gamification/application/run-streak-jobs.ts"
        issue: "Consumer-only worker with no producer or recurring enqueue path."
      - path: "apps/web/src/modules/gamification/infrastructure/gamification-repository.ts"
        issue: "Claims/completes/fails scheduled jobs but exposes no enqueue operation for Phase 5 job types."
    missing:
      - "Create idempotent initial and recurring job production for each ready duo."
      - "Convert weekly, monthly, and seasonal duo-local boundaries to timezone-aware UTC instants."
      - "Exercise the real producer-to-claim-to-completion path in integration tests."
  - truth: "The duo can unlock approximately 50 seeded achievements through real product facts"
    status: failed
    reason: "The catalog contains 50 achievements, but the reward engine can emit only 17 catalog slugs. The remaining 33 predicate keys are stored but never evaluated."
    artifacts:
      - path: "apps/web/src/modules/gamification/domain/achievement-catalog.ts"
        issue: "Defines 50 predicate-backed seeds."
      - path: "apps/web/src/modules/gamification/application/apply-gamification-fact.ts"
        issue: "buildAchievementSlugs hardcodes 12 direct slugs plus five quest completion slugs; it does not evaluate the catalog predicates."
    missing:
      - "Implement and test predicate evaluation for the remaining achievement catalog."
      - "Prove every active achievement has at least one reachable real-fact unlock path."
  - truth: "Real level-ups, quest completions, and achievement unlocks produce non-blocking reward feedback"
    status: failed
    reason: "The dashboard toast is selected only from the recompensa URL query parameter. Real Play server actions discard the returned reward summary, and no production caller writes recompensa= after a mutation."
    artifacts:
      - path: "apps/web/src/app/app/page.tsx"
        issue: "Builds RewardToast solely from params.recompensa."
      - path: "apps/web/src/app/app/phase-4-actions.ts"
        issue: "Collapses successful domain results to a generic state and drops reward data."
      - path: "apps/web/src/modules/gamification/presentation/view-models.ts"
        issue: "toRewardToastView exists but has no production caller."
    missing:
      - "Carry the authoritative reward summary from mutations to the rendered toast."
      - "Remove or authenticate the query-param-only reward signal so feedback cannot be spoofed."
  - truth: "Concurrent distinct facts preserve correct XP level projections and additive quest progress"
    status: failed
    reason: "The engine calculates nextLevel and quest currentValue from pre-update reads. SQL atomically adds XP but overwrites level with the stale computed value, while quest upsert uses GREATEST of absolute values. Concurrent distinct facts can therefore leave a stale level or lose a quest increment."
    artifacts:
      - path: "apps/web/src/modules/gamification/application/apply-gamification-fact.ts"
        issue: "Projection and quest progress use read-modify-write values without locking or atomic recomputation."
      - path: "apps/web/src/modules/gamification/infrastructure/gamification-repository.ts"
        issue: "Projection level is assigned independently from the atomic XP increment; quest progress merges absolute values rather than increments."
      - path: "packages/db/tests/gamification-concurrency.test.ts"
        issue: "Covers duplicate/idempotent facts, not two distinct concurrent facts that jointly cross a level or quest threshold."
    missing:
      - "Make projection level and quest progress updates correct under distinct concurrent facts."
      - "Add database integration tests for concurrent level crossing and additive quest increments."
deferred:
  - truth: "Rarity styling is applied to roulette game reveals and review surfaces"
    addressed_in: "Phase 6 and Phase 7"
    evidence: "Phase 6 success criterion 2 explicitly owns rarity borders in roulette reveals; Phase 7 success criterion 1 introduces the review surfaces."
---

# Phase 5: Gamificacao Coletiva Verification Report

**Phase Goal:** Acoes reais da dupla alimentam XP, niveis, conquistas, quests e streaks.
**Roadmap Contract:** O progresso real da dupla se torna uma economia coletiva auditavel que celebra consistencia sem criar competicao interna.
**Verified:** 2026-06-06T13:27:55Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Dashboard exposes duo XP, level, streak, active quests, and recent achievements from authoritative data. | FAILED | XP, level, streak, and achievements flow from Postgres, but active quest cycles have no production job producer and remain empty unless inserted manually. |
| 2 | XP is shared, non-spendable, versioned, and mapped through 50 thematic levels without individual totals. | VERIFIED | Shared projection/ledger schema, 50-level curve, version metadata, economy audit, and focused tests. |
| 3 | Awards, projections, and quest progress remain idempotent, auditable, and correct under concurrency. | FAILED | Canonical ledger uniqueness is substantive, but distinct concurrent facts can produce stale levels or lost quest increments. |
| 4 | Confirmed Play and Discovery facts reach gamification, with critical Play rewards inside the originating transaction. | VERIFIED | Play repository adapts the same transaction; confirmation, chapter, scheduled-session, terminal, and discovery paths call the public gamification API. |
| 5 | Zerado grants the major reward and Dropado remains neutral. | VERIFIED | Domain/application tests pass and terminal confirmation maps to terminal-zerado/terminal-dropado policies. Browser evidence remains external. |
| 6 | Approximately 50 custom achievements are reachable from real duo behavior. | FAILED | Static reachability trace found 17 reachable catalog slugs and 33 predicate seeds with no evaluator. |
| 7 | Achievements are grouped, filterable by rarity, and use custom SVG iconography rather than emoji. | VERIFIED | Conquistas route, server read model, filters, badge icon component, CSS rarity tokens, and UI tests are wired. |
| 8 | Weekly/monthly/seasonal definitions, collaborative rewards, and challenge presentation exist without punitive competition. | VERIFIED | Quest catalog, challenge board, duo copy, and reward policies are substantive; operational rotation is assessed separately. |
| 9 | Weekly, monthly, and seasonal cycles rotate at the required duo-local boundaries. | FAILED | No job producer exists and local date strings are converted to UTC midnight. |
| 10 | Streak policy provides flame/freezing, 04:00 backup, and one Freeze per ten levels with automatic maintenance. | FAILED | Pure policy and presentation exist, but scheduled maintenance has no producer; visual behavior also lacks browser evidence. |
| 11 | Actual reward outcomes trigger non-blocking celebratory feedback. | FAILED | RewardToast is query-param-driven and mutation reward summaries are discarded by server actions. |
| 12 | Modular boundaries keep business rules out of routes/UI and prevent domain-internal cross-imports. | VERIFIED | `pnpm check:architecture` passed; reward rules live in gamification application/domain modules. |
| 13 | Duo data is protected by server authorization, forced RLS, bounded grants, and explicit gate evidence. | VERIFIED | Migration 0011 contains forced RLS and bounded worker grants; focused security/DB checks and schema-drift check pass. |

**Score:** 7/13 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | Rarity styling on roulette game reveals and review surfaces | Phase 6 and Phase 7 | Phase 6 SC2 explicitly requires rarity borders during roulette reveal; Phase 7 SC1 owns review UI. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/db/src/migrations/0011_gamification_core.sql` | Ledger, projections, achievements, quests, streaks, RLS, grants | VERIFIED | Substantive schema and forced-RLS policies; migration evidence and no schema drift reported. |
| `apps/web/src/modules/gamification/application/apply-gamification-fact.ts` | Canonical reward engine | PARTIAL | Real ledger/quest/streak/level flow, but achievement coverage and distinct-fact concurrency are incomplete. |
| `apps/web/src/modules/gamification/infrastructure/gamification-repository.ts` | Authorized persistence and job access | PARTIAL | Real DB reads/writes and job claims; no Phase 5 job enqueue API and unsafe absolute derived-state updates. |
| `apps/web/src/modules/gamification/domain/level-curve.ts` | 50 named levels and versioned curve | VERIFIED | Focused domain/economy checks pass. |
| `apps/web/src/modules/gamification/domain/achievement-catalog.ts` | Approximately 50 unlockable achievements | PARTIAL | 50 seeds exist, but 33 are unreachable. |
| `apps/web/src/modules/gamification/domain/quest-catalog.ts` | Weekly/monthly/seasonal catalog and windows | PARTIAL | Catalog is substantive; runtime boundary conversion is not timezone-correct. |
| `apps/web/src/modules/gamification/domain/streak-policy.ts` | Duo-day, 04:00 backup, Freeze policy | VERIFIED | Pure policy and tests are substantive. |
| `apps/web/src/modules/gamification/application/run-quest-rotation-jobs.ts` | Durable recurring rotation | ORPHANED | Wired to cron as a consumer, but no producer supplies jobs. |
| `apps/web/src/modules/gamification/application/run-streak-jobs.ts` | Durable streak maintenance | ORPHANED | Wired to cron as a consumer, but no producer supplies jobs. |
| `apps/web/src/app/app/page.tsx` | Dashboard and reward feedback | PARTIAL | Dashboard reads real DB data; active quests are hollow upstream and reward toast is query-param-only. |
| `apps/web/src/app/app/conquistas/page.tsx` | Achievement gallery/filter UI | VERIFIED | Server-authorized read model and components are wired. |
| `apps/web/src/app/app/desafios/page.tsx` | Challenge progress/streak UI | PARTIAL | Real read path, but cycles are absent without manually seeded jobs. |
| `scripts/phase-5-gate.mjs` | Honest phase gate | VERIFIED | Correctly records external browser/job evidence as BLOCKED rather than passing. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Play confirmations | Gamification engine | Transaction adapter | WIRED | Critical facts and rewards share the Play transaction and roll back together. |
| Discovery match | Gamification engine | Public domain entrypoint | WIRED | Match records a non-XP discovery fact. |
| Gamification engine | Postgres | Repository transaction | WIRED | Ledger, quest, streak, unlock, notification, and projection writes are real. |
| Vercel cron route | Quest/streak runners | `runGamificationMaintenance` | WIRED | Authenticated route invokes both consumers. |
| Ready duo lifecycle | `ops.scheduled_jobs` | Initial/recurring enqueue | NOT_WIRED | No producer for either Phase 5 job type exists in production code. |
| Duo-local quest window | Stored UTC timestamps | `duoWindowDate` | INCORRECT | Uses `YYYY-MM-DDT00:00:00.000Z`, ignoring the duo timezone. |
| Mutation reward summary | `RewardToast` | Server action result/navigation state | NOT_WIRED | Server action drops reward data; only manual URL state reaches the toast. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Dashboard band | XP/level/streak/recent achievements | RLS-scoped Postgres read model | Yes | FLOWING |
| Dashboard/challenge quests | Active cycles and progress | `gamification_quest_cycles` / progress tables | Not autonomously | HOLLOW - source tables depend on jobs that are never produced |
| Achievement grid | Catalog and unlocks | Postgres catalog/unlock tables | Partly | FLOWING, but only 17/50 unlock paths are reachable |
| Streak panel | Projection/streak state | Postgres projection/state | Yes for immediate facts | PARTIAL - scheduled gap/reset maintenance is disconnected |
| Reward toast | Reward view model | URL query parameter | No authoritative mutation flow | DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command/check | Result | Status |
|---|---|---|---|
| Focused Phase 5 implementation | 12 targeted Vitest files | 12 files / 63 tests passed | PASS |
| Architecture boundaries | `pnpm check:architecture` | Passed | PASS |
| Web and DB typing | Workspace typechecks | Passed | PASS |
| Migration consistency | `gsd-sdk query verify.schema-drift 05` | `drift_detected: false` | PASS |
| Achievement reachability | Static catalog-to-emitter trace | 17 reachable / 50 catalog entries | FAIL |
| Scheduled job production | Search for non-test insert/enqueue of both Phase 5 job types | No producer found | FAIL |
| Reward feedback production | Search for production `recompensa=` writer or `toRewardToastView` caller | None found | FAIL |
| External browser/job evidence | Existing `pnpm phase:5:gate` artifact | BLOCKED for two E2E slugs, `CRON_SECRET`, and runner frequency | BLOCKED, not counted as pass |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| PLAY-05 | 05-02, 05-03, 05-05, 05-06 | Dashboard shows XP, level, streak, active quests, recent achievements | BLOCKED | Dashboard exists, but active quests are not autonomously produced. |
| GAME-01 | 05-01, 05-02, 05-03, 05-06 | One shared XP total, no individual totals | SATISFIED | Duo projection/ledger only; economy audit passes. |
| GAME-02 | 05-01, 05-02, 05-03, 05-06 | 50 thematic levels | SATISFIED | 50-level catalog with Lv1/Lv50 anchors. |
| GAME-03 | 05-01, 05-02, 05-03, 05-06 | Versioned approximately 1.18 curve | SATISFIED | Versioned curve and tests exist. |
| GAME-04 | 05-01, 05-02, 05-03, 05-06 | Each XP award/deduction applied once and auditable | SATISFIED | Canonical ledger uniqueness and audit metadata are real; derived-state concurrency remains a separate failed plan truth. |
| GAME-05 | 05-01, 05-02, 05-04, 05-06 | Unlock approximately 50 seeded achievements | BLOCKED | 50 seeds, only 17 reachable emitters. |
| GAME-06 | 05-01, 05-04, 05-06 | Seven achievement groups | SATISFIED | Catalog and filters cover all required groups. |
| GAME-07 | 05-01, 05-04, 05-06 | Custom engraved SVG icons, no emoji | SATISFIED | Custom SVG badge component and icon keys. |
| GAME-08 | 05-01, 05-04, 05-06 | Filter achievements by rarity | SATISFIED | Route params and rarity filter are wired. |
| GAME-09 | 05-01, 05-02, 05-05, 05-06 | Three weekly quests reset Monday 00:00 duo timezone | BLOCKED | No producer; timestamp conversion uses UTC midnight. |
| GAME-10 | 05-01, 05-02, 05-05, 05-06 | One monthly quest | BLOCKED | Template exists, but no autonomous cycle production. |
| GAME-11 | 05-01, 05-02, 05-05, 05-06 | Seasonal Spooky/Awards/Anniversary quests | BLOCKED | Templates exist, but no autonomous calendar activation/production. |
| GAME-12 | 05-05, 05-06 | View challenge progress | BLOCKED | Page exists, but real progress has no cycles without manual job rows. |
| GAME-13 | 05-01, 05-02, 05-03, 05-05, 05-06 | Collaborative play streak | SATISFIED | Eligible real facts update shared streak state. |
| GAME-14 | 05-03, 05-05, 05-06 | Animated flame/freezing state | NEEDS HUMAN | Source/CSS/tests exist; browser evidence is blocked. |
| GAME-15 | 05-01, 05-02, 05-05, 05-06 | Earn one Freeze every ten levels | SATISFIED | Level transition policy awards shared freezes. |
| GAME-16 | 05-01, 05-02, 05-05, 05-06 | Backup until 04:00 duo timezone | SATISFIED | Duo-day cutoff policy and tests cover 04:00. |
| GAME-17 | 05-01, 05-03, 05-04, 05-05, 05-06 | Consistent rarity on games, achievements, reviews | PARTIAL / DEFERRED | Achievement rarity exists; roulette game rarity is Phase 6 and reviews are Phase 7. |
| SAFE-03 | 05-01, 05-02, 05-05, 05-06 | Scheduled server jobs for catalog/streak/quest/reminders | BLOCKED | Cron consumer exists, but Phase 5 quest/streak jobs have no producer and deployed cadence/secret evidence is missing. |

No Phase 5 requirement ID from the plan frontmatter was absent from `.planning/REQUIREMENTS.md`, and no additional requirement mapped to Phase 5 was found unclaimed by the plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `run-quest-rotation-jobs.ts` | 241 | Local date forced to UTC midnight | BLOCKER | Violates duo-timezone reset contract. |
| `gamification-repository.ts` | 824 | Consumer-only scheduled job access | BLOCKER | Workers remain idle without manually inserted rows. |
| `apply-gamification-fact.ts` | 505 | Hardcoded achievement emitter list | BLOCKER | 33 catalog achievements cannot unlock. |
| `phase-4-actions.ts` | 444 | Successful mutation result collapsed to generic state | BLOCKER | Reward summary never reaches the toast. |
| `apply-gamification-fact.ts` | 151, 263 | Read-modify-write derived values | BLOCKER | Distinct concurrent facts can stale level or lose quest progress. |
| `gamification-repository.ts` | 313, 582 | Atomic XP with independent level assignment; absolute quest merge | BLOCKER | Persistence does not repair the application-level races. |
| `gamification-jobs.test.ts` | job fixtures | Tests inject claimable jobs directly | WARNING | Processing tests do not verify production job creation. |

### Human Verification Required

These checks remain required after the implementation blockers are fixed:

1. **Real Zerado and Dropado browser flows**

   **Test:** Configure `E2E_PHASE5_ZERADO_SLUG` and `E2E_PHASE5_DROPADO_SLUG`, run the Phase 5 browser suite with both duo members.
   **Expected:** Zerado grants the authoritative reward and celebration once; Dropado remains neutral; both members see consistent state.
   **Why human/external:** The required seeded game fixtures are currently absent.

2. **Deployed job authentication and cadence**

   **Test:** Configure `CRON_SECRET` and `GAMIFICATION_RUNNER_FREQUENCY_MINUTES`, verify queued jobs are created and processed in the deployed environment.
   **Expected:** Each ready duo receives current quest cycles and daily streak maintenance without manual SQL.
   **Why human/external:** Deployment secret, scheduler cadence, and real recurring execution are not locally provable.

3. **Visual and motion review**

   **Test:** Inspect dashboard, achievements, challenges, flame/freezing, and reward feedback on mobile/desktop with reduced motion enabled and disabled.
   **Expected:** Contrast, focus, touch targets, rarity meaning, and motion behavior meet the product/accessibility contract.
   **Why human:** Visual quality and perceived motion cannot be established by source inspection alone.

### Gaps Summary

Phase 5 has a substantial database, security, domain, and UI foundation, and the focused automated checks pass. The phase goal is nevertheless not achieved. The scheduler is a consumer without a producer, quest reset instants ignore duo timezone offsets, most achievement predicates are inert, real mutation rewards do not reach the feedback UI, and distinct concurrent facts can corrupt derived state. Missing browser and deployment evidence remains explicitly blocked and was not counted as passing.

---

_Verified: 2026-06-06T13:27:55Z_
_Verifier: Codex (gsd-verifier)_
