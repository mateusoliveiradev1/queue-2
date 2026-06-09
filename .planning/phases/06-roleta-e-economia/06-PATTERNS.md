# Phase 6: Roleta E Economia - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 39
**Analogs found:** 38 / 39

## File Classification

Rows marked as read-only references are implementation context only and must not appear in a plan's `files_modified` list unless a later checker-approved revision explicitly changes ownership.

| Planned File Or Reference | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/db/src/schema/app.ts` | model | CRUD/event-driven audit | `packages/db/src/schema/app.ts` gamification/play tables | exact |
| `packages/db/src/rls/policies.sql` | config | CRUD/authorization | `packages/db/src/rls/policies.sql` gamification/play policies | exact |
| `packages/db/src/migrations/0015_roulette_core.sql` | migration | CRUD/event-driven audit | `packages/db/src/migrations/0011_gamification_core.sql` | exact |
| `packages/db/src/migrations/meta/_journal.json` | config | batch | existing `_journal.json` entries | exact |
| `packages/db/tests/roulette-migrations.test.ts` | test | batch/CRUD | `packages/db/tests/gamification-migrations.test.ts` | exact |
| `packages/db/tests/roulette-rls.test.ts` | test | request-response/CRUD | `packages/db/tests/gamification-rls.test.ts` | exact |
| `packages/db/tests/roulette-concurrency.test.ts` | test | concurrent CRUD | `packages/db/tests/gamification-concurrency.test.ts` | exact |
| `apps/web/src/modules/roulette/index.ts` | service | request-response | `apps/web/src/modules/play/index.ts` | role-match |
| `apps/web/src/modules/roulette/domain/roulette-policy.ts` | utility/model | transform | `apps/web/src/modules/gamification/domain/gamification-policy.ts` | role-match |
| `apps/web/src/modules/roulette/application/ports.ts` | service contract | request-response/CRUD | `apps/web/src/modules/gamification/application/ports.ts` | role-match |
| `apps/web/src/modules/roulette/application/get-roulette-state.ts` | service | request-response/CRUD | `apps/web/src/modules/library/application/get-library-queue.ts` | role-match |
| `apps/web/src/modules/roulette/application/start-roulette-round.ts` | service | request-response/transactional CRUD | `apps/web/src/modules/gamification/application/apply-gamification-fact.ts` | role-match |
| `apps/web/src/modules/roulette/application/replay-roulette-round.ts` | service | request-response | `apps/web/src/modules/discovery/application/record-discovery-decision.ts` | partial |
| `apps/web/src/modules/roulette/application/lock-roulette-result-as-principal.ts` | service | request-response/CRUD | `apps/web/src/modules/library/application/move-library-game.ts` | exact |
| `apps/web/src/modules/roulette/application/discard-roulette-result.ts` | service | event-driven/CRUD | `apps/web/src/modules/gamification/application/apply-gamification-fact.ts` | role-match |
| `apps/web/src/modules/roulette/application/get-roulette-history.ts` | service | request-response/CRUD | `apps/web/src/modules/library/application/get-library-queue.ts` | role-match |
| `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts` | service | transactional CRUD | `apps/web/src/modules/gamification/infrastructure/gamification-repository.ts` | role-match |
| `apps/web/src/modules/roulette/presentation/view-models.ts` | utility | transform | `apps/web/src/modules/gamification/presentation/view-models.ts` | role-match |
| `apps/web/src/modules/roulette/presentation/roulette-reel.tsx` | component | event-driven/client animation | `apps/web/src/modules/discovery/presentation/discovery-deck.tsx` | partial |
| `apps/web/src/modules/roulette/presentation/roulette-audio-control.tsx` | component | event-driven/browser API | none | no analog |
| `apps/web/src/modules/roulette/presentation/result-panel.tsx` | component | request-response/event-driven | `apps/web/src/modules/discovery/presentation/match-celebration.tsx` | role-match |
| `apps/web/src/modules/roulette/presentation/compact-history.tsx` | component | request-response | `apps/web/src/modules/play/presentation/notification-center.tsx` | role-match |
| `apps/web/src/modules/roulette/presentation/replacement-required.tsx` | component | request-response | `apps/web/src/modules/discovery/presentation/match-celebration.tsx` | role-match |
| `apps/web/src/app/app/roleta/page.tsx` | route | request-response | `apps/web/src/app/app/descobrir/page.tsx` | exact |
| `apps/web/src/app/app/roleta/actions.ts` | route | request-response/server action | `apps/web/src/app/app/descobrir/actions.ts` | exact |
| `apps/web/src/components/app-shell.tsx` | component | request-response/navigation | `apps/web/src/components/app-shell.tsx` existing nav | exact |
| `apps/web/src/app/app/page.tsx` | route | request-response | `apps/web/src/app/app/page.tsx` dashboard status/reward pattern | exact |
| `apps/web/src/app/app/phase-6-status.ts` | utility | transform | `apps/web/src/app/app/phase-2-status.ts` | exact |
| `apps/web/src/app/globals.css` | config | presentation | existing discovery/play/gamification CSS blocks | role-match |
| `apps/web/src/modules/play/domain/play-policy.ts` | read-only reference | transform | existing replacement policy section reused unchanged (`getFourthGameDecision`, `autoPause: false`) | exact |
| `apps/web/src/modules/play/application/ports.ts` | service contract | CRUD/notifications | existing notification and activation ports | exact |
| `apps/web/src/modules/play/infrastructure/play-repository.ts` | service | transactional CRUD | existing notification insert path | exact |
| `apps/web/tests/roulette-domain.test.ts` | test | transform | `apps/web/tests/gamification-domain.test.ts` | exact |
| `apps/web/tests/roulette-application.test.ts` | test | request-response/CRUD | `apps/web/tests/gamification-application.test.ts` | exact |
| `apps/web/tests/roulette-ui.test.tsx` | test | event-driven/client UI | `apps/web/tests/discovery-ui.test.tsx` | role-match |
| `apps/web/tests/phase-6-e2e.spec.ts` | test | browser request-response | `apps/web/tests/phase-4-e2e.spec.ts` and `phase-5-e2e.spec.ts` | exact |
| `apps/web/tests/accessibility.spec.ts` | test | browser accessibility | existing authenticated/Phase 4/Phase 5 blocks | exact |
| `scripts/phase-6-gate.mjs` | utility | batch | `scripts/phase-5-gate.mjs` | exact |
| `package.json` | config | batch | existing `phase:*:gate` scripts | exact |

## Pattern Assignments

### Database Schema, Migration And RLS

**Applies to:** `packages/db/src/schema/app.ts`, `packages/db/src/rls/policies.sql`, `packages/db/src/migrations/0015_roulette_core.sql`, `packages/db/src/migrations/meta/_journal.json`

**Analogs:** `duo_library_games`, `play_active_games`, `duo_xp_awards`, gamification streak/economy tables, play notification tables.

**Schema pattern** (`packages/db/src/schema/app.ts` lines 149-185):

```typescript
export const duoLibraryGames = appSchema.table(
  "duo_library_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    catalogGameId: uuid("catalog_game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("wishlist"),
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    statusUpdatedByUserId: text("status_updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_duo_library_games_duo_catalog_uidx").on(
      table.duoId,
      table.catalogGameId
    ),
    index("app_duo_library_games_duo_status_idx").on(
      table.duoId,
      table.status,
      table.updatedAt
    ),
    index("app_duo_library_games_catalog_idx").on(table.catalogGameId),
    check(
      "app_duo_library_games_status_chk",
      sql`${table.status} IN ('wishlist', 'jogando', 'pausado', 'zerado', 'dropado')`
    )
  ]
);
```

Copy this shape for `roulette_rounds`, `roulette_boost_balances`, `roulette_pity_state`, `roulette_cooldowns`, `roulette_round_entries` and history/ledger tables: `duoId`, FK to owned records, actor fields, `metadata`, timestamps, check constraints and hot-path indexes.

**One-active invariant pattern** (`packages/db/src/schema/app.ts` lines 437-475):

```typescript
export const playActiveGames = appSchema.table(
  "play_active_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(),
    position: smallint("position").notNull(),
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_active_games_library_uidx").on(table.libraryGameId),
    uniqueIndex("app_play_active_games_one_principal_uidx")
      .on(table.duoId)
      .where(sql`${table.role} = 'principal'`),
    uniqueIndex("app_play_active_games_duo_position_uidx").on(table.duoId, table.position),
    index("app_play_active_games_duo_order_idx").on(
      table.duoId,
      table.position,
      table.updatedAt
    ),
    check("app_play_active_games_role_chk", sql`${table.role} IN ('principal', 'secondary')`),
    check("app_play_active_games_position_chk", sql`${table.position} BETWEEN 1 AND 3`)
  ]
);
```

Use a partial unique index on `roulette_rounds(duo_id)` where status is active/revealing/pending invitation. This is the DB invariant for D-16 and D-29, not just app logic.

**Append-only ledger pattern** (`packages/db/src/schema/app.ts` lines 948-994):

```typescript
export const duoXpAwards = appSchema.table(
  "duo_xp_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    awardKey: text("award_key").notNull(),
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    amount: integer("amount").notNull(),
    reasonCode: varchar("reason_code", { length: 80 }).notNull().default("play-award"),
    awardedByUserId: text("awarded_by_user_id").references(() => authUsers.id, {
      onDelete: "set null"
    }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_duo_xp_awards_key_uidx").on(table.duoId, table.awardKey),
    uniqueIndex("app_duo_xp_awards_source_uidx").on(
      table.duoId,
      table.sourceType,
      table.sourceId
    ),
    index("app_duo_xp_awards_duo_awarded_idx").on(table.duoId, table.awardedAt),
    check("app_duo_xp_awards_amount_positive_chk", sql`${table.amount} > 0`)
  ]
);
```

Copy this for `roulette_boost_ledger` and `roulette_history_events`, except allow signed balance deltas where needed with a non-zero check. Use unique `(duo_id, ledger_key)` and source uniqueness for boost spend/refund idempotency.

**Migration header/comments/grants pattern** (`packages/db/src/migrations/0011_gamification_core.sql` lines 1-31, 569-605):

```sql
-- QUEUE/2 Phase 5 gamification core.
-- Owner module: gamification. Shared XP economy, achievement unlocks, quest
-- windows/progress, streak state, reward notifications, adjustments and
-- projection rebuild audit records. XP remains duo-scoped only.

COMMENT ON TABLE app.duo_xp_awards IS
  'Owner module: play/gamification. Append-only shared XP ledger; unique award/source keys prevent replayed rewards and preserve audit history.';

GRANT SELECT, INSERT ON app.gamification_streak_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_streak_events TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_streak_state TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (current_streak, longest_streak, available_freezes, last_activity_duo_day, updated_at)
  ON app.gamification_streak_state TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_streak_state TO queue2_readonly;
```

Migration `0015_roulette_core.sql` should use an owner-module header, table/column comments for audit-sensitive data, least-privileged grants, no destructive runtime grants, and a `_journal.json` entry matching the existing incrementing shape (`idx`, `version`, `when`, `tag`, `breakpoints`) from `_journal.json` lines 97-102.

**RLS pattern** (`packages/db/src/rls/policies.sql` lines 609-622, 723-737):

```sql
ALTER TABLE app.duo_xp_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duo_xp_awards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duo_xp_awards_select_members ON app.duo_xp_awards;
DROP POLICY IF EXISTS app_duo_xp_awards_insert_members ON app.duo_xp_awards;
CREATE POLICY app_duo_xp_awards_select_members ON app.duo_xp_awards
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_duo_xp_awards_insert_members ON app.duo_xp_awards
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      awarded_by_user_id IS NULL
      OR awarded_by_user_id = app.current_user_id()
```

```sql
ALTER TABLE app.gamification_streak_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_streak_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_streak_state_select_members ON app.gamification_streak_state;
DROP POLICY IF EXISTS app_gamification_streak_state_insert_members ON app.gamification_streak_state;
DROP POLICY IF EXISTS app_gamification_streak_state_update_members ON app.gamification_streak_state;
CREATE POLICY app_gamification_streak_state_select_members ON app.gamification_streak_state
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_streak_state_insert_members ON app.gamification_streak_state
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_streak_state_update_members ON app.gamification_streak_state
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
```

Apply this to every duo-scoped roulette table. Actor columns must either equal `app.current_user_id()` or be nullable/system-generated.

### Roulette Domain Policy

**Applies to:** `apps/web/src/modules/roulette/domain/roulette-policy.ts`

**Analogs:** `library-policy.ts`, `gamification-policy.ts`, `play-policy.ts`.

**Status and limit constants** (`apps/web/src/modules/library/domain/library-policy.ts` lines 1-18):

```typescript
export const LIBRARY_STATUSES = [
  "wishlist",
  "jogando",
  "pausado",
  "zerado",
  "dropado"
] as const;

export const PHASE_2_ACTIVE_STATUSES = ["wishlist", "jogando", "pausado"] as const;
export const PHASE_4_CONFIRMATION_STATUSES = ["zerado", "dropado"] as const;
export const JOGANDO_LIMIT = 3;
```

Roulette policy should define `ROULETTE_ELIGIBLE_STATUSES = ["wishlist", "pausado"]`, `ROULETTE_MINIMUM_ELIGIBLE_GAMES = 3`, `ROULETTE_REEL_SLOT_COUNT = 60`, `ROULETTE_BOOST_COST = 100`, pity threshold and cap constants in the same pure style.

**Pure policy return union** (`apps/web/src/modules/library/domain/library-policy.ts` lines 106-129):

```typescript
export function getLibraryMovePolicy(input: {
  status: string;
  currentJogandoCount: number;
  alreadyJogando?: boolean;
}): LibraryMovePolicyResult {
  if (!isLibraryStatus(input.status)) {
    return { ok: false, reason: "invalid-status" };
  }

  if (futureStatusSet.has(input.status)) {
    return {
      ok: false,
      reason: "future-confirmation-required",
      status: input.status as FutureConfirmationStatus
    };
  }
```

Roulette should expose pure functions such as `getEligiblePoolPolicy`, `selectRouletteResult`, `buildVisualReel`, `applyPityTransition`, `applyBoostCost`, `applyCooldownWeights` and return typed `{ ok: false; reason: ... }` unions.

**Rarity style tokens** (`apps/web/src/modules/gamification/domain/gamification-policy.ts` lines 19-31, 174-203):

```typescript
export const GAMIFICATION_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary"
] as const;

export const REWARD_NOTIFICATION_INTENSITIES = [
  "quiet",
  "standard",
  "special",
  "legendary"
] as const;
```

```typescript
> = {
  common: {
    borderToken: "var(--rarity-common)",
    accentToken: "var(--ink-muted)",
    celebrationIntensity: "quiet"
  },
  rare: {
    borderToken: "var(--rarity-rare)",
    accentToken: "var(--rarity-rare)",
    celebrationIntensity: "standard"
  },
  epic: {
    borderToken: "var(--rarity-epic)",
    accentToken: "var(--rarity-epic)",
    celebrationIntensity: "special"
  },
  legendary: {
    borderToken: "var(--rarity-legendary)",
    accentToken: "var(--rarity-legendary)",
    celebrationIntensity: "legendary"
  }
};
```

Use these same rarity names and CSS tokens. Do not invent casino-specific rarity colors.

**Replacement policy** (`apps/web/src/modules/play/domain/play-policy.ts` lines 271-289):

```typescript
export function getFourthGameDecision(
  activeGames: ActivePlayGame[]
): PolicyResult<FourthGameDecision | { allowed: true }> {
  if (activeGames.length >= JOGANDO_PLAY_LIMIT) {
    return {
      ok: true,
      value: {
        allowed: false,
        availableActions: ["pause", "replace", "cancel"],
        autoPause: false
      }
    };
  }
```

Use this exact behavior for the roulette lock branch: no automatic pause; return current games and explicit choices.

### Application Use Cases And Public Entrypoints

**Applies to:** `apps/web/src/modules/roulette/index.ts`, all `apps/web/src/modules/roulette/application/*.ts`

**Analogs:** `play/index.ts`, `library/index.ts`, `apply-gamification-fact.ts`, `move-library-game.ts`, `activate-playing-game.ts`, `record-discovery-decision.ts`.

**Public entrypoint pattern** (`apps/web/src/modules/library/index.ts` lines 1-15, 145-153):

```typescript
import "server-only";

import { addGameToWishlistUseCase } from "./application/add-game-to-wishlist";
import { getLibraryGameDetailUseCase } from "./application/get-library-game-detail";
import { getLibraryGameStatusesUseCase } from "./application/get-library-game-statuses";
import { getLibraryOverviewUseCase } from "./application/get-library-overview";
import { getLibraryQueueUseCase } from "./application/get-library-queue";
import { moveLibraryGameUseCase } from "./application/move-library-game";
import { updateMemberPlatformsUseCase } from "./application/update-member-platforms";
import { libraryRepository } from "./infrastructure/library-repository";
import {
  activatePlayingGame,
  deactivatePlayingGame
} from "../play";
```

```typescript
export function moveLibraryGame(input: {
  userId: string;
  catalogGameId: string;
  status: string;
}) {
  return moveLibraryGameUseCase(input, libraryRepository, {
    activatePlayingGame,
    deactivatePlayingGame
  });
}
```

Roulette index should be server-only, import use cases and `rouletteRepository`, and wire cross-domain collaborators from public entrypoints only (`library`, `play`, optionally `gamification`). Do not deep-import other modules.

**Transactional membership/economy use case pattern** (`apps/web/src/modules/gamification/application/apply-gamification-fact.ts` lines 37-75, 109-132):

```typescript
export async function applyGamificationFact(
  input: GamificationFactInput,
  repository?: GamificationRepository
): Promise<GamificationApplyFactResult> {
  if (!input.actorUserId) {
    return { ok: false, reason: "actor-required" };
  }

  const resolvedRepository =
    repository ?? (await import("../infrastructure/gamification-repository")).gamificationRepository;

  return resolvedRepository.withUserTransaction(input.actorUserId, (transaction) =>
    applyGamificationFactToTransaction(input, transaction)
  );
}

export async function applyGamificationFactToTransaction(
  input: GamificationFactInput,
  transaction: GamificationRepositoryTransaction
): Promise<GamificationApplyFactResult> {
  const membership = input.actorUserId
    ? await transaction.resolveMembership(input.actorUserId)
    : null;

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  if (membership.duoId !== input.duoId) {
    return { ok: false, reason: "duo-mismatch" };
  }

  const projection = await transaction.lockProjection(input.duoId);
```

```typescript
  if (eligibility.ok) {
    const award = await transaction.insertXpLedgerAward({
      duoId: input.duoId,
      awardKey: eligibility.awardKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      amount: eligibility.amount,
      reasonCode: eligibility.reasonCode,
      awardedByUserId: input.actorUserId,
      metadata: {
        ...(input.metadata ?? {}),
        scope: eligibility.scope
      }
    });

    if (!award) {
      duplicate = true;

      return {
        ok: true,
        duplicate,
        summary: emptyRewardSummary(projection)
      };
    }
```

`startRouletteRound` should mirror this: require actor, resolve membership, lock roulette state rows, return existing active/pending round before spending, insert boost ledger with idempotency, persist result/history once, and treat duplicate ledger/round rows as resumable outcomes.

**Library-to-Play handoff pattern** (`apps/web/src/modules/library/application/move-library-game.ts` lines 48-91):

```typescript
  if (policy.status === "jogando" && playCoordinator) {
    const activation = await playCoordinator.activatePlayingGame({
      userId: input.userId,
      catalogGameId: input.catalogGameId
    });

    if (!activation.ok) {
      if (activation.reason === "replacement-required") {
        return {
          ok: false,
          reason: "replacement-required",
          replacement: activation.replacement
            ? {
                availableActions: activation.replacement.availableActions,
                autoPause: activation.replacement.autoPause,
                currentGames: activation.replacement.currentGames.map((game) => ({
                  libraryGameId: game.libraryGameId,
                  name: game.catalogGame.name,
                  role: game.role,
                  position: game.position
                }))
              }
            : undefined
        };
      }
```

`lockRouletteResultAsPrincipal` should call a public Play/Library contract and preserve this replacement-required result. It must then mark the roulette invitation completed only after the Principal handoff succeeds.

**Active play activation pattern** (`apps/web/src/modules/play/application/activate-playing-game.ts` lines 22-33, 65-80, 92-118):

```typescript
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return {
        ok: false,
        reason: "membership-required"
      };
    }

    await transaction.lockActivePlaySet({ duoId: membership.duoId });
```

```typescript
    if (!fourthDecision.ok || fourthDecision.value.allowed === false) {
      const currentGames = await transaction.readCurrentPlayGames({
        duoId: membership.duoId
      });

      return {
        ok: false,
        reason: "replacement-required",
        replacement: {
          availableActions: ["pause", "replace", "cancel"],
          autoPause: false,
          currentGames
        }
      };
    }
```

```typescript
    const activeGames = await transaction.activatePlayingLibraryGame({
      duoId: membership.duoId,
      actorUserId: input.userId,
      libraryGameId: libraryGame.id,
      role: assignment.value.role,
      position: assignment.value.position
    });
```

Use the same lock-before-decision structure for roulette lock/discard flows.

**Cross-module gateway pattern** (`apps/web/src/modules/discovery/application/record-discovery-decision.ts` lines 159-170, 173-220):

```typescript
export async function handoffDiscoveryMatchToLibrary(
  input: DiscoveryLibraryHandoffInput
): Promise<DiscoveryLibraryHandoffResult> {
  const [{ discoveryRepository }, library] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../../library")
  ]);

  return handoffDiscoveryMatchToLibraryUseCase(input, discoveryRepository, {
    addGameToWishlist: library.addGameToWishlist,
    moveLibraryGame: library.moveLibraryGame
  });
}
```

```typescript
  const moveExisting = await input.library.moveLibraryGame(input.input);

  if (moveExisting.ok) {
    return {
      ok: true,
      state: {
        kind: "library-updated",
        catalogGameId: input.input.catalogGameId,
        status: input.input.status
      }
    };
  }
```

Roulette should use explicit collaborator interfaces for Library/Play/notifications and import public module entrypoints in `index.ts`, not inside domain files.

### Ports And Infrastructure Repository

**Applies to:** `apps/web/src/modules/roulette/application/ports.ts`, `apps/web/src/modules/roulette/infrastructure/roulette-repository.ts`, Play notification integration files.

**Analogs:** `gamification/application/ports.ts`, `play/application/ports.ts`, `gamification-repository.ts`, `play-repository.ts`, `packages/db/src/client.ts`.

**Port shape** (`apps/web/src/modules/gamification/application/ports.ts` lines 9-23, 100-115, 359-383):

```typescript
export type GamificationDuoId = string;
export type GamificationUserId = string;
export type GamificationUuid = string;

export type GamificationMembershipContext = {
  duoId: GamificationDuoId;
  userId: GamificationUserId;
  partnerUserId: GamificationUserId;
  memberUserIds: [GamificationUserId, GamificationUserId] | GamificationUserId[];
};

export type GamificationFactInput = {
  duoId: GamificationDuoId;
  actorUserId: GamificationUserId | null;
  sourceType: GamificationFactSourceType;
```

```typescript
export type GamificationApplyFactResult =
  | {
      ok: true;
      duplicate: boolean;
      summary: GamificationRewardSummary;
    }
  | {
      ok: false;
      reason:
        | "actor-required"
        | "membership-required"
        | "duo-mismatch"
        | "projection-not-found"
        | "unconfirmed-fact"
        | "invalid-adjustment";
    };
```

```typescript
  readDuoTimezone(duoId: GamificationDuoId): Promise<string>;
  readProjection(duoId: GamificationDuoId): Promise<GamificationProjectionRecord | null>;
  lockProjection(duoId: GamificationDuoId): Promise<GamificationProjectionRecord | null>;
  countXpAwardsForDuoDay(input: {
    duoId: GamificationDuoId;
    sourceType: GamificationFactSourceType;
    duoDay: string;
    timezone: string;
  }): Promise<number>;
  insertXpLedgerAward(input: {
    duoId: GamificationDuoId;
    awardKey: string;
    sourceType: GamificationFactSourceType;
    sourceId: GamificationUuid;
    amount: number;
    reasonCode: string;
    awardedByUserId: GamificationUserId | null;
    metadata?: Record<string, unknown>;
  }): Promise<GamificationXpLedgerRecord | null>;
```

Roulette ports should define `RouletteMembershipContext`, round records, eligible game records, balance/pity/cooldown records, explicit result unions, and a transaction interface with `lockRouletteState`, `readActiveRound`, `readEligibleLibraryGames`, `insertBoostLedgerEntry`, `insertRound`, `insertHistoryEvent`, `updatePityState`, `applyCooldown`, `markRoundLocked`, `markRoundDiscarded`.

**DB authorization transaction pattern** (`packages/db/src/client.ts` lines 38-64):

```typescript
export async function withAppUserTransaction<T>(
  pool: QueueDbPool,
  userId: string,
  callback: (client: QueueDbClient) => Promise<T>
): Promise<T> {
  if (!userId.trim()) {
    throw new Error("A non-empty userId is required for database authorization context.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await setTransactionUserId(client, userId);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setTransactionUserId(client: QueueDbClient, userId: string): Promise<void> {
  await client.query("select set_config('queue2.user_id', $1, true)", [userId]);
}
```

Every roulette repository mutation/read uses this. Do not accept client-supplied `duoId` as authoritative.

**Repository factory pattern** (`apps/web/src/modules/gamification/infrastructure/gamification-repository.ts` lines 1-8, 212-240, 1948-1976):

```typescript
import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";
```

```typescript
  return {
    withUserTransaction: (userId, callback) =>
      withAppUserTransaction(resolvedRuntimePool, userId, (client) =>
        callback(createGamificationTransaction(client))
      ),
    ensureGamificationJobs: (now) =>
      ensureGamificationJobs(resolveWorkerPool(), now),
```

```typescript
function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function getDefaultGamificationRepository(): GamificationRepository {
  defaultGamificationRepository ??= createGamificationRepository({
    runtimePool: getRuntimePool(),
    workerPoolFactory: getWorkerPool
  });
  return defaultGamificationRepository;
}
```

Roulette repository should be server-only, injectable for tests, lazy-create pools, and expose a `createRouletteTransaction(client)` mapper.

**Row lock and idempotent insert pattern** (`apps/web/src/modules/gamification/infrastructure/gamification-repository.ts` lines 342-367, 738-763):

```typescript
  await client.query(
    `
      INSERT INTO app.gamification_streak_state (duo_id)
      SELECT id
      FROM app.duos
      WHERE id = $1
      ON CONFLICT (duo_id) DO NOTHING
    `,
    [duoId]
  );

  const result = await client.query<ProjectionRow>(
    `
      SELECT
        duo.id AS duo_id,
        duo.xp,
        duo.level,
        duo.streak,
        streak.available_freezes,
        GREATEST(duo.updated_at, streak.updated_at) AS updated_at
      FROM app.duos AS duo
      INNER JOIN app.gamification_streak_state AS streak
        ON streak.duo_id = duo.id
      WHERE duo.id = $1
      FOR UPDATE OF duo, streak
    `,
```

```typescript
  const result = await client.query<XpLedgerRow>(
    `
      INSERT INTO app.duo_xp_awards (
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        reason_code,
        awarded_by_user_id,
        metadata
      )
      VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8::jsonb)
      ON CONFLICT DO NOTHING
      RETURNING
        id,
```

Use the same pattern for balance/pity state initialization, row locks and idempotent round/economy/history writes.

**Advisory lock and notification pattern** (`apps/web/src/modules/play/infrastructure/play-repository.ts` lines 1479-1506, 2265-2284):

```typescript
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `play-active:${input.duoId}`
  ]);

  for (const game of input.games) {
    await client.query(
      `
        INSERT INTO app.play_active_games (
          duo_id,
          library_game_id,
          role,
          position,
          added_by_user_id,
          updated_by_user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $5, now())
        ON CONFLICT (library_game_id) DO UPDATE
```

```typescript
  const result = await client.query<NotificationRow>(
    `
      INSERT INTO app.play_notifications (
        duo_id,
        recipient_user_id,
        actor_user_id,
        notification_type,
        action_ref_type,
        action_ref_id,
        title,
        body,
        updated_at
      )
```

Roulette can use a `roulette:${duoId}` advisory lock in addition to row locks for one-active-round convergence. If using Central da Dupla, extend `PLAY_NOTIFICATION_TYPES` and the DB check constraint for a roulette operational notification type, then reuse `insertNotificationItem`.

### Routes, Server Actions And App Shell

**Applies to:** `apps/web/src/app/app/roleta/page.tsx`, `apps/web/src/app/app/roleta/actions.ts`, `apps/web/src/components/app-shell.tsx`, `apps/web/src/app/app/page.tsx`, `apps/web/src/app/app/phase-6-status.ts`

**Analogs:** `descobrir/page.tsx`, `descobrir/actions.ts`, `biblioteca/page.tsx`, dashboard `page.tsx`, `phase-2-status.ts`.

**Server action imports/auth/validation pattern** (`apps/web/src/app/app/descobrir/actions.ts` lines 1-23):

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  answerMoodQuiz,
  getSurpriseRecommendation,
  handoffDiscoveryMatchToLibrary,
  isDiscoveryDecision,
  isDiscoverySourceMode,
  recordDiscoveryDecision,
  startLiveSession
} from "../../../modules/discovery";
import { requireAuthoritativeVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
```

**Server action flow pattern** (`apps/web/src/app/app/descobrir/actions.ts` lines 337-360, 457-470):

```typescript
  const session = await measureStage("auth", quizTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { returnTo, energy, commitment, vibe } = await measureStage(
    "validation",
    quizTimingContext,
    async () => ({
      returnTo: getSafeReturnTo(formData, "/app/descobrir"),
      energy: getFormString(formData, "energy"),
      commitment: getFormString(formData, "commitment"),
      vibe: getFormString(formData, "vibe")
    })
  );
```

```typescript
  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  if (!result.ok) {
    redirect(withState(returnTo, "surpresa-indisponivel"));
  }

  redirect(
    withState(
      withParam(returnTo, "surpresa", result.card.catalogGameId),
      "surpresa-pronta"
    )
  );
```

`roleta/actions.ts` should have separate server actions for start, replay, lock, discard, replacement choice and audio preference. Use zod UUID/idempotency validation, safe `returnTo`, `aria-busy` compatible enhanced actions, `revalidatePath("/app/roleta")`, and redirect states.

**Route composition pattern** (`apps/web/src/app/app/descobrir/page.tsx` lines 1-24, 113-135):

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  DiscoveryDeck,
  DiscoveryFilters,
  DiscoverySearch,
  getDiscoveryDeck,
  getLiveSession,
  getMatchHistory,
  getMoodQuizStatus,
  LivePanel,
  MatchCelebration,
  MatchHistory,
  MoodQuiz
} from "../../../modules/discovery";
import { getDuoDashboard } from "../../../modules/duo";
import { requireVerifiedSession } from "../../../platform/auth/session";
```

```typescript
  const hasActiveLive = liveSession.ok;
  const livePanelHref = getLivePanelHref(returnTo, liveSession);
  const shouldShowMoodQuiz =
    !moodQuizStatus.ok || !moodQuizStatus.currentUserAnswered;
  const statusMessage = getDiscoveryStatusMessage(state);

  return measureStage("render", discoveryTimingContext, async () => (
    <AppShell currentPage="descobrir">
```

`roleta/page.tsx` should be a server route that composes public roulette APIs only. Load duo dashboard, roulette state/history and current play/replacement data in `Promise.all`, redirect `/parear` when duo missing, and render the playable surface immediately.

**App shell navigation pattern** (`apps/web/src/components/app-shell.tsx` lines 4-21, 41-62, 75-99):

```typescript
type AppShellPage =
  | "dashboard"
  | "catalogo"
  | "descobrir"
  | "biblioteca"
  | "conquistas"
  | "desafios"
  | "perfil"
  | "dupla";

const navigation = [
  { href: "/app", label: "Fila", page: "dashboard" },
  { href: "/app/catalogo", label: "Catalogo", page: "catalogo" },
  { href: "/app/descobrir", label: "Descobrir", page: "descobrir" },
  { href: "/app/biblioteca", label: "Biblioteca", page: "biblioteca" },
```

```typescript
            {navigation.map((item) => {
              const isActive = currentPage === item.page;

              return (
                <a
                  aria-current={isActive ? "page" : undefined}
                  className="queue2-focusable"
                  data-active={isActive ? "true" : "false"}
                  href={item.href}
                  key={item.href}
                >
                  {isActive ? (
                    <RoulettePointer
                      aria-hidden="true"
                      className="app-nav-pointer"
                      label=""
```

Add `"roleta"` to `AppShellPage` and insert `{ href: "/app/roleta", label: "Roleta", page: "roleta" }` after Biblioteca, matching the UI spec order. Update mobile CSS if nine items clip.

**Dashboard state pattern** (`apps/web/src/app/app/page.tsx` lines 128-151):

```typescript
  const state = getSearchParam(params?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const rewardState = getSearchParam(params?.recompensa);
  const rewardStatus = getPhase5RewardStatus(rewardState, {
    duoId: duo.id,
    userId: session.user.id
  });

  return measureStage("render", dashboardTimingContext, async () => (
    <AppShell
      currentPage="dashboard"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
```

For successful roulette lock, route to `/app?estado=roleta-principal` or equivalent. Add `phase-6-status.ts` using the switch style from `phase-2-status.ts` lines 1-20 and merge the dashboard status message lookup without breaking existing Phase 2 states.

### Roulette UI Components And Styling

**Applies to:** `presentation/roulette-reel.tsx`, `roulette-audio-control.tsx`, `result-panel.tsx`, `compact-history.tsx`, `replacement-required.tsx`, `view-models.ts`, `apps/web/src/app/globals.css`

**Analogs:** `DiscoveryDeck`, `MatchCelebration`, `NotificationCenter`, `GamificationDashboardBand`, `ActionFeedback`, `@queue/ui` mark/tokens.

**Brand pointer and divider** (`packages/ui/src/brand/mark.tsx` lines 50-84):

```typescript
export function RoulettePointer({
  tone = "primary",
  label = "Ponteiro da roleta",
  className,
  style,
  ...props
}: RoulettePointerProps) {
  const color = tone === "primary" ? "var(--primary)" : "var(--accent)";
  const classes = ["queue2-roulette-pointer", className].filter(Boolean).join(" ");

  return (
    <span
      aria-label={label}
      className={classes}
      role="img"
      style={{
        alignItems: "center",
        color,
        display: "inline-flex",
        height: 24,
        justifyContent: "center",
        width: 24,
        ...style
      }}
```

Use this pointer as the fixed center marker. The reel should not create a new pointer SVG.

**Token and reduced-motion base** (`packages/ui/src/tokens.css` lines 1-18, 122-130):

```css
:root {
  --bg: oklch(0.16 0.025 285);
  --surface: oklch(0.21 0.03 285);
  --surface-raised: oklch(0.26 0.035 285);
  --ink: oklch(0.96 0.015 95);
  --ink-muted: oklch(0.72 0.02 95);
  --primary: oklch(0.86 0.22 128);
  --primary-ink: oklch(0.16 0.025 285);
  --accent: oklch(0.62 0.27 305);
  --danger: oklch(0.68 0.22 25);
  --rarity-common: oklch(0.70 0.02 280);
  --rarity-rare: oklch(0.78 0.16 220);
  --rarity-epic: oklch(0.65 0.25 340);
  --rarity-legendary: oklch(0.82 0.18 80);
```

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
```

Use existing tokens. New roulette CSS should use the UI spec's 4/8/16/24/32/48/64 spacing for new classes even though older tokens include 6/12.

**Motion and keyboard pattern** (`apps/web/src/modules/discovery/presentation/discovery-deck.tsx` lines 1-5, 98-138, 151-178):

```typescript
"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
```

```typescript
  function submitDecision(decision: Reaction) {
    const form =
      decision === "want"
        ? wantFormRef.current
        : decision === "not_now"
          ? notNowFormRef.current
          : skipFormRef.current;

    setReaction(decision);
    form?.requestSubmit();
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (shouldReduceMotion) {
      return;
    }
```

```typescript
    <div
      className="discovery-deck"
      onKeyDown={handleKeyDown}
      role="group"
      tabIndex={0}
      aria-label="Deck de descoberta. Use os botoes ou setas direita, esquerda e baixo."
    >
      <div className="discovery-deck-stack" aria-live="polite">
        {nextCards.map((card, index) => (
          <article
            aria-hidden="true"
            className="discovery-card discovery-card-preview"
```

Roulette reel should be a client component with `useReducedMotion`, a polite live region, a keyboard-accessible main control, exactly 60 `aria-hidden` decorative slots, and only the persisted result announced.

**Action feedback pattern** (`apps/web/src/components/action-feedback.tsx` lines 44-68, 73-96):

```typescript
export function ActionFeedback({
  state,
  copy,
  id,
  className
}: ActionFeedbackProps) {
  const isIdle = state === "idle";
  const message = getActionFeedbackCopy(state, copy);
  const classNames = ["action-feedback", className].filter(Boolean).join(" ");

  return (
    <div
      aria-atomic={isIdle ? undefined : "true"}
      aria-live={isIdle ? undefined : state === "failed" ? "assertive" : "polite"}
      className={classNames}
      data-state={state}
      id={id}
      role={isIdle ? undefined : "status"}
    >
```

```typescript
export function ActionFeedbackButton({
  state,
  labels,
  tone = "primary",
  className,
  disabled,
  ...buttonProps
}: ActionFeedbackButtonProps) {
  const isPending = state === "syncing" || state === "retrying";
```

Use this for start, lock, discard and replacement forms so `aria-busy` and live copy are consistent.

**Result/handoff form pattern** (`apps/web/src/modules/discovery/presentation/match-celebration.tsx` lines 151-205):

```typescript
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhancedAction) {
      return;
    }

    event.preventDefault();

    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setState((current) => (current === "failed" ? "retrying" : "syncing"));

    try {
      const result = await enhancedAction(new FormData(event.currentTarget));

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setState(result.ok ? "confirmed" : "failed");
    } catch {
      setState("failed");
    } finally {
      pendingRef.current = false;
    }
  }
```

Use this for the result panel and replacement-required branch. Copy must match UI-SPEC exactly: "A fila apontou para este. Voces travam como Principal?"

**Compact list pattern** (`apps/web/src/modules/play/presentation/notification-center.tsx` lines 15-38):

```typescript
  return (
    <section className="notification-center" aria-labelledby="central-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="central-title">
          Central da Dupla
        </h2>
        <p className="support-copy">Pendencias e eventos operacionais da sessao.</p>
      </div>
      <span className="notification-badge" aria-label={`${unreadCount} notificacoes nao lidas`}>
        {unreadCount}
      </span>
      {items.length ? (
        <ol
          aria-label="Pendencias recentes da Central da Dupla"
          className="notification-list"
          tabIndex={0}
        >
```

Compact history should be an ordered list with rarity text, boost/pity flags and outcome. It must not become Hall da Moral.

### Testing And Gate Patterns

**Applies to:** all roulette test files, `scripts/phase-6-gate.mjs`, `package.json`

**Analogs:** gamification/play/domain/application/DB/E2E/accessibility/gate files.

**Domain tests and boundary tests** (`apps/web/tests/gamification-domain.test.ts` lines 49-97, 370-384):

```typescript
describe("gamification XP policy", () => {
  it("keeps XP as one shared duo economy without individual XP rules", () => {
    expect(XP_MODEL_SCOPE).toBe("duo");
    expect(
      Object.values(XP_SOURCE_RULES).every((rule) => rule.awardScope === "duo")
    ).toBe(true);
    expect(Object.keys(XP_SOURCE_RULES)).not.toContain("member");
    expect(Object.keys(XP_SOURCE_RULES)).not.toContain("individual");
  });
```

```typescript
describe("gamification module boundary", () => {
  it("keeps domain files free of framework, database, auth and infrastructure imports", () => {
    for (const domainFile of domainFiles) {
      const source = readFileSync(domainFile, "utf8");

      expect(source).not.toMatch(/from "(next|react|drizzle-orm|better-auth|server-only|@queue\/db)/);
      expect(source).not.toMatch(/from "\.\.\/infrastructure/);
    }
  });
```

`roulette-domain.test.ts` should cover eligible statuses/minimum, 60 slots, weighted selection, pity, boost cost/cap/refund policy, weekend math, cooldown and boundary imports.

**Application fake repository tests** (`apps/web/tests/gamification-application.test.ts` lines 30-62, 64-94):

```typescript
describe("gamification application contract", () => {
  it("applies a replayed XP fact once when the ledger reports a duplicate", async () => {
    const insertXpLedgerAward = vi
      .fn<GamificationRepositoryTransaction["insertXpLedgerAward"]>()
      .mockResolvedValueOnce(xpAwardRecord())
      .mockResolvedValueOnce(null);
```

```typescript
  it("reads projections inside the app user transaction context", async () => {
    const { pool, calls } = fakeGamificationReadPool();
    const repository = createGamificationRepository(pool);

    await expect(
      repository.withUserTransaction("member-1", (transaction) =>
        transaction.readProjection("duo-1")
      )
    ).resolves.toEqual(
      expect.objectContaining({
        duoId: "duo-1",
        xp: 180,
        streak: 2,
        availableFreezes: 1
      })
    );
    expect(calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        "BEGIN",
        expect.stringContaining("set_config('queue2.user_id'"),
        expect.stringContaining("FROM app.duos AS duo"),
        "COMMIT"
      ])
    );
  });
```

Use fake `RouletteRepositoryTransaction` tests for duplicate start, active round resume, boost refund before result persistence, post-persistence resume, pity exactly once, lock/discard idempotency and replacement-required branch.

**DB migration/RLS/concurrency tests** (`packages/db/tests/gamification-migrations.test.ts` lines 41-62, 138-166; `gamification-rls.test.ts` lines 41-82; `gamification-concurrency.test.ts` lines 41-68):

```typescript
  test("applies Phase 5 gamification schema to an empty database and can be rerun", async () => {
    await applyFoundationMigration(pool);
    await applyFoundationMigration(pool);

    const result = await pool.query<{ object_name: string; exists: boolean }>(`
      SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists
      FROM (VALUES
        ('app.gamification_achievement_catalog'),
        ('app.gamification_achievement_unlocks'),
        ('app.gamification_quest_templates'),
        ('app.gamification_quest_cycles'),
        ('app.gamification_quest_progress'),
        ('app.gamification_streak_events'),
        ('app.gamification_streak_state'),
        ('app.gamification_reward_notifications'),
        ('app.gamification_adjustments'),
        ('ops.gamification_projection_rebuilds')
      ) AS expected(object_name)
    `);
```

```typescript
  test("members can read their duo gamification state but not another duo", async () => {
    const first = await createReadyDuo(pool, "game-read-a");
    const second = await createReadyDuo(pool, "game-read-b");

    await withRuntimeUser(pool, first.ownerUserId, async (client) => {
      await insertStreakState(client, first.duoId);
      await insertStreakEvent(client, first.duoId, first.ownerUserId);
      await insertRewardNotification(client, first.duoId, first.ownerUserId);
      await insertAdjustment(client, first.duoId, first.ownerUserId);
    });

    await expect(readGamificationCounts(pool, first.partnerUserId)).resolves.toEqual({
      awards: 1,
      unlocks: 1,
```

```typescript
  test("replayed XP awards converge to a single ledger row", async () => {
    const duo = await createReadyDuo(pool, "game-xp-idempotency");
    const sourceId = randomUUID();
    const awardKey = `quest:${sourceId}`;

    const results = await Promise.allSettled([
      insertQuestXpAward(pool, duo.ownerUserId, duo.duoId, sourceId, awardKey),
      insertQuestXpAward(pool, duo.partnerUserId, duo.duoId, sourceId, awardKey)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(readXpAwardCount(pool, duo.ownerUserId, duo.duoId, awardKey)).resolves.toBe(1);
  });
```

Roulette DB tests must prove forced RLS, least grants, indexes/comments, one active round partial unique index, concurrent starts converge, balance/pity/history update once, and cross-duo reads/writes fail.

**Browser E2E pattern** (`apps/web/tests/phase-4-e2e.spec.ts` lines 8-23, 36-67, 145-152):

```typescript
const readyActor = actorFromEnv("E2E_READY_USER");
const partnerActor = actorFromEnv("E2E_READY_PARTNER");
const otherDuoActor = actorFromEnv("E2E_OTHER_DUO_USER");
const principalSlug = process.env.E2E_PHASE4_PRINCIPAL_SLUG ?? "";
const secondarySlug = process.env.E2E_PHASE4_SECONDARY_SLUG ?? "";
const phase4MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
```

```typescript
test.describe("Phase 4 Jogando Agora dashboard", () => {
  test.skip(
    phase4MissingEnv.length > 0,
    `BLOCKED setup - missing Phase 4 active-game fixture: ${phase4MissingEnv.join(", ")}`
  );

  test("desktop viewport prioritizes Principal and exposes ordering controls", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app");
```

```typescript
  test("other-duo actor cannot see the ready duo's operational play state", async ({ page }) => {
    // Covers SAFE-01 and SAFE-02 at the browser evidence layer.
    await page.setViewportSize(desktopViewport);
    await login(page, otherDuoActor);
    await page.goto(`/app/jogo/${principalSlug}`);

    await expect(page.getByRole("heading", { name: /proxima sessao/i })).toHaveCount(0);
```

`phase-6-e2e.spec.ts` should use ready, partner and other-duo actors; test start/resume same result, replay not redraw, lock as Principal, discard, replacement branch, reduced motion, mobile non-overlap and cross-duo denial. Missing fixtures must be BLOCKED, not pass.

**Accessibility pattern** (`apps/web/tests/accessibility.spec.ts` lines 171-190, 427-443, 493-515):

```typescript
  for (const route of [
    "/app",
    "/app/perfil",
    "/app/dupla",
    "/app/catalogo",
    "/app/descobrir",
    "/app/biblioteca",
    "/app/conquistas",
    "/app/desafios"
  ]) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await login(page, readyActor);
      await page.goto(route);
      await expectNoAxeViolations(page);
```

Add `/app/roleta` to authenticated accessibility and add Phase 6-specific reduced-motion/mobile tests for reel controls, result focus, mute, lock/discard and no overlap.

**Gate script pattern** (`scripts/phase-5-gate.mjs` lines 18-55, 57-112, 192-228; `package.json` lines 26-30):

```javascript
const e2eFixtureVars = [
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
```

```javascript
const commands = [
  {
    name: "Architecture",
    command: pnpmBin,
    args: ["check:architecture"]
  },
  {
    name: "Web typecheck",
    command: pnpmBin,
    args: ["--filter", "@queue/web", "typecheck"]
  },
```

```javascript
function runCommand(commandConfig) {
  if (commandConfig.skipWhen) {
    console.log(`\n[phase:5:gate] ${commandConfig.name}`);
    console.log(`[phase:5:gate] skipped (${commandConfig.skipReason})`);

    return {
      command: [commandConfig.command, ...commandConfig.args].join(" "),
      durationMs: 0,
      name: commandConfig.name,
      skipped: true,
      status: 0
    };
  }
```

`phase-6-gate.mjs` should run architecture, web/db typecheck, roulette domain/application/UI tests, DB integration tests, Playwright E2E/accessibility, migration application and an economy simulation/audit artifact. Add `"phase:6:gate": "node scripts/phase-6-gate.mjs"` beside existing scripts.

## Shared Patterns

### Auth And Server Authority

**Source:** `apps/web/src/app/app/descobrir/actions.ts`, `apps/web/src/app/app/descobrir/page.tsx`

Apply to all route and action files:

```typescript
const session = await measureStage("auth", quizTimingContext, () =>
  requireAuthoritativeVerifiedSession()
);
```

```typescript
const session = await measureStage("auth", discoveryTimingContext, () =>
  requireVerifiedSession()
);
```

Actions use `requireAuthoritativeVerifiedSession`; server pages use `requireVerifiedSession`. Browser-supplied `duoId`, result, pity, boost balance, replacement target and weekend context are not authoritative.

### Module Boundaries

**Source:** `.planning/ARCHITECTURE.md`, `apps/web/src/modules/library/index.ts`, `apps/web/tests/gamification-domain.test.ts`

Routes compose public module APIs. Domain files must stay free of Next.js, React, Drizzle, Better Auth, browser APIs, `server-only`, `@queue/db` and infrastructure imports.

### Transaction And Idempotency

**Source:** `packages/db/src/client.ts`, `apps/web/src/modules/gamification/infrastructure/gamification-repository.ts`

Use `withAppUserTransaction`, `set_config('queue2.user_id', ...)`, row locks/advisory locks and `ON CONFLICT DO NOTHING`. A repeated start request must return the same active/pending round or the same persisted round, not spend again.

### RLS And Duo Isolation

**Source:** `packages/db/src/rls/policies.sql`

Every roulette table has `duo_id`, `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, member select policies and actor/recipient checks. Test both app-layer and DB-layer cross-duo denial.

### UI Accessibility

**Source:** `packages/ui/src/tokens.css`, `apps/web/src/components/action-feedback.tsx`, `apps/web/src/modules/discovery/presentation/discovery-deck.tsx`

Use existing tokens, `RoulettePointer`, 44px controls, `aria-live`, reduced motion, decorative `aria-hidden` reel slots and fixed dimensions/aspect ratios. Do not expose 60 covers as focusable items.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/modules/roulette/presentation/roulette-audio-control.tsx` | component | event-driven/browser API | No existing Web Audio opt-in controller exists. Use UI-SPEC audio contract, browser-only client component, explicit user gesture, visible mute, persisted preference, and no autoplay. |

The weighted 60-slot reel has no exact existing implementation, but `DiscoveryDeck` provides the closest Motion/reduced-motion/client-event pattern and `gamification-policy.ts` provides the pure rarity-token style.

## Metadata

**Analog search scope:** `apps/web/src/modules`, `apps/web/src/app`, `apps/web/src/components`, `apps/web/tests`, `packages/db/src`, `packages/db/tests`, `packages/ui/src`, `scripts`
**Files scanned:** 382
**Pattern extraction date:** 2026-06-08
