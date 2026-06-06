import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";
import {
  claimPairingCode,
  createDuoWithPairingCode,
  insertAuthUser,
  makeTestUserId,
  withRuntimeUser
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("gamification RLS isolation", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const migratedPool = await createMigratedIntegrationPool();

    if (!migratedPool) {
      throw new Error(missingTestDatabaseMessage);
    }

    pool = migratedPool;
  });

  afterAll(async () => {
    await pool.end();
  });

  test("members can read their duo gamification state but not another duo", async () => {
    const first = await createReadyDuo(pool, "game-read-a");
    const second = await createReadyDuo(pool, "game-read-b");
    const achievementSlug = await insertAchievementSeed(pool, "game-read-achievement");
    const questSlug = await insertQuestSeed(pool, "game-read-quest");

    await withRuntimeUser(pool, first.ownerUserId, async (client) => {
      const questCycleId = await insertQuestCycle(client, first.duoId, questSlug);
      const awardId = await insertQuestXpAward(client, first.duoId, questCycleId, first.ownerUserId);

      await insertAchievementUnlock(client, first.duoId, achievementSlug, first.ownerUserId);
      await insertQuestProgress(client, first.duoId, questCycleId, awardId);
      await insertStreakState(client, first.duoId);
      await insertStreakEvent(client, first.duoId, first.ownerUserId);
      await insertRewardNotification(client, first.duoId, first.ownerUserId);
      await insertAdjustment(client, first.duoId, first.ownerUserId);
    });
    await insertProjectionRebuild(pool, first.duoId);

    await expect(readGamificationCounts(pool, first.partnerUserId)).resolves.toEqual({
      awards: 1,
      unlocks: 1,
      questCycles: 1,
      questProgress: 1,
      streakEvents: 1,
      streakStates: 1,
      rewardNotifications: 1,
      adjustments: 1,
      rebuilds: 1
    });
    await expect(readGamificationCounts(pool, second.ownerUserId)).resolves.toEqual({
      awards: 0,
      unlocks: 0,
      questCycles: 0,
      questProgress: 0,
      streakEvents: 0,
      streakStates: 0,
      rewardNotifications: 0,
      adjustments: 0,
      rebuilds: 0
    });
  });

  test("cross-duo gamification writes fail under runtime role and RLS", async () => {
    const first = await createReadyDuo(pool, "game-cross-a");
    const second = await createReadyDuo(pool, "game-cross-b");
    const achievementSlug = await insertAchievementSeed(pool, "game-cross-achievement");
    const questSlug = await insertQuestSeed(pool, "game-cross-quest");
    const secondQuestCycleId = await withRuntimeUser(pool, second.ownerUserId, (client) =>
      insertQuestCycle(client, second.duoId, questSlug)
    );
    const secondAwardId = await withRuntimeUser(pool, second.ownerUserId, (client) =>
      insertQuestXpAward(client, second.duoId, secondQuestCycleId, second.ownerUserId)
    );

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertAchievementUnlock(client, second.duoId, achievementSlug, first.ownerUserId)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertQuestXpAward(client, second.duoId, randomUUID(), first.ownerUserId)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertQuestCycle(client, second.duoId, questSlug)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertQuestProgress(client, second.duoId, secondQuestCycleId, secondAwardId)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertStreakEvent(client, second.duoId, first.ownerUserId)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertRewardNotification(client, second.duoId, first.ownerUserId)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
  });
});

async function createReadyDuo(pool: pg.Pool, label: string) {
  const ownerUserId = makeTestUserId(`${label}-owner`);
  const partnerUserId = makeTestUserId(`${label}-partner`);
  const duo = await createDuoWithPairingCode(pool, ownerUserId);
  await insertAuthUser(pool, partnerUserId);
  await claimPairingCode(pool, partnerUserId, duo.pairingCode);

  return {
    ...duo,
    partnerUserId
  };
}

async function readGamificationCounts(pool: pg.Pool, userId: string) {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{
      awards: string;
      unlocks: string;
      quest_cycles: string;
      quest_progress: string;
      streak_events: string;
      streak_states: string;
      reward_notifications: string;
      adjustments: string;
      rebuilds: string;
    }>(`
      SELECT
        (SELECT count(*) FROM app.duo_xp_awards) AS awards,
        (SELECT count(*) FROM app.gamification_achievement_unlocks) AS unlocks,
        (SELECT count(*) FROM app.gamification_quest_cycles) AS quest_cycles,
        (SELECT count(*) FROM app.gamification_quest_progress) AS quest_progress,
        (SELECT count(*) FROM app.gamification_streak_events) AS streak_events,
        (SELECT count(*) FROM app.gamification_streak_state) AS streak_states,
        (SELECT count(*) FROM app.gamification_reward_notifications) AS reward_notifications,
        (SELECT count(*) FROM app.gamification_adjustments) AS adjustments,
        (SELECT count(*) FROM ops.gamification_projection_rebuilds) AS rebuilds
    `);
    const row = result.rows[0]!;

    return {
      awards: Number(row.awards),
      unlocks: Number(row.unlocks),
      questCycles: Number(row.quest_cycles),
      questProgress: Number(row.quest_progress),
      streakEvents: Number(row.streak_events),
      streakStates: Number(row.streak_states),
      rewardNotifications: Number(row.reward_notifications),
      adjustments: Number(row.adjustments),
      rebuilds: Number(row.rebuilds)
    };
  });
}

async function insertAchievementSeed(pool: pg.Pool, label: string): Promise<string> {
  const slug = `${label}-${randomUUID()}`;

  await pool.query(
    `
      INSERT INTO app.gamification_achievement_catalog (
        slug,
        group_key,
        rarity,
        visibility,
        title,
        description,
        icon_key,
        predicate
      )
      VALUES ($1, 'story', 'rare', 'visible', 'Primeira marca', 'A dupla registrou um marco real.', 'badge-story-first', '{}'::jsonb)
    `,
    [slug]
  );

  return slug;
}

async function insertQuestSeed(pool: pg.Pool, label: string): Promise<string> {
  const slug = `${label}-${randomUUID()}`;

  await pool.query(
    `
      INSERT INTO app.gamification_quest_templates (
        slug,
        quest_type,
        title,
        description,
        goal_value,
        xp_reward,
        eligibility,
        schedule_metadata
      )
      VALUES ($1, 'weekly', 'Sessao da semana', 'Confirmem uma sessao coop real.', 1, 80, '{}'::jsonb, '{}'::jsonb)
    `,
    [slug]
  );

  return slug;
}

async function insertAchievementUnlock(
  client: pg.PoolClient,
  duoId: string,
  achievementSlug: string,
  userId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_achievement_unlocks (
        duo_id,
        achievement_slug,
        source_type,
        source_id,
        unlocked_by_user_id
      )
      VALUES ($1, $2, 'live-session', $3, $4)
    `,
    [duoId, achievementSlug, randomUUID(), userId]
  );
}

async function insertQuestCycle(
  client: pg.PoolClient,
  duoId: string,
  questSlug: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO app.gamification_quest_cycles (
        duo_id,
        quest_slug,
        quest_type,
        cycle_key,
        window_start_at,
        window_end_at,
        timezone
      )
      VALUES (
        $1,
        $2,
        'weekly',
        $3,
        date_trunc('week', now()),
        date_trunc('week', now()) + interval '7 days',
        'America/Sao_Paulo'
      )
      RETURNING id
    `,
    [duoId, questSlug, `week:${randomUUID()}`]
  );

  return result.rows[0]!.id;
}

async function insertQuestXpAward(
  client: pg.PoolClient,
  duoId: string,
  questCycleId: string,
  userId: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO app.duo_xp_awards (
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        reason_code,
        awarded_by_user_id
      )
      VALUES ($1, $2, 'quest', $3, 80, 'quest-complete', $4)
      RETURNING id
    `,
    [duoId, `quest:${questCycleId}`, questCycleId, userId]
  );

  return result.rows[0]!.id;
}

async function insertQuestProgress(
  client: pg.PoolClient,
  duoId: string,
  questCycleId: string,
  rewardAwardId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_quest_progress (
        duo_id,
        quest_cycle_id,
        current_value,
        completed_at,
        reward_award_id,
        last_source_type,
        last_source_id
      )
      VALUES ($1, $2, 1, now(), $3, 'live-session', $4)
    `,
    [duoId, questCycleId, rewardAwardId, randomUUID()]
  );
}

async function insertStreakState(client: pg.PoolClient, duoId: string): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_streak_state (
        duo_id,
        current_streak,
        longest_streak,
        available_freezes,
        last_activity_duo_day
      )
      VALUES ($1, 3, 3, 1, current_date)
    `,
    [duoId]
  );
}

async function insertStreakEvent(
  client: pg.PoolClient,
  duoId: string,
  userId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_streak_events (
        duo_id,
        event_key,
        event_type,
        duo_day,
        source_type,
        source_id,
        actor_user_id,
        delta_days,
        freeze_delta
      )
      VALUES ($1, $2, 'activity', current_date, 'live-session', $3, $4, 1, 0)
    `,
    [duoId, `activity:${randomUUID()}`, randomUUID(), userId]
  );
}

async function insertRewardNotification(
  client: pg.PoolClient,
  duoId: string,
  userId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_reward_notifications (
        duo_id,
        actor_user_id,
        notification_type,
        intensity,
        title,
        body
      )
      VALUES ($1, $2, 'achievement', 'special', 'Conquista da dupla', 'A fila reconheceu um marco real.')
    `,
    [duoId, userId]
  );
}

async function insertAdjustment(
  client: pg.PoolClient,
  duoId: string,
  userId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_adjustments (
        duo_id,
        adjustment_key,
        amount_delta,
        reason_code,
        actor_user_id
      )
      VALUES ($1, $2, 25, 'manual-reconciliation', $3)
    `,
    [duoId, `adjustment:${randomUUID()}`, userId]
  );
}

async function insertProjectionRebuild(pool: pg.Pool, duoId: string): Promise<void> {
  await pool.query(
    `
      INSERT INTO ops.gamification_projection_rebuilds (
        duo_id,
        rebuild_key,
        status,
        reason_code,
        xp_before,
        xp_after,
        level_before,
        level_after,
        streak_before,
        streak_after,
        finished_at
      )
      VALUES ($1, $2, 'completed', 'test-rebuild', 0, 80, 1, 2, 0, 1, now())
    `,
    [duoId, `rebuild:${randomUUID()}`]
  );
}
