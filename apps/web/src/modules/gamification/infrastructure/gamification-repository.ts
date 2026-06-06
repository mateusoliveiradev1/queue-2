import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  GamificationAdjustmentInput,
  GamificationAchievementUnlockRecord,
  GamificationDueJobRecord,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationRewardNotificationInput,
  GamificationStreakStateRecord,
  GamificationUserId,
  GamificationXpLedgerRecord
} from "../application/ports";
import type { GamificationFactSourceType } from "../domain/gamification-policy";
import type { QuestType } from "../domain/quest-catalog";
import { getLevelForXp } from "../domain/level-curve";

type MembershipRow = {
  duo_id: string;
  user_id: string;
};

type ProjectionRow = {
  duo_id: string;
  xp: number;
  level: number;
  streak: number;
  available_freezes: number | null;
  updated_at: Date;
};

type XpLedgerRow = {
  id: string;
  duo_id: string;
  award_key: string;
  source_type: GamificationFactSourceType;
  source_id: string;
  amount: number;
  reason_code: string;
  awarded_by_user_id: string | null;
  metadata: Record<string, unknown>;
  awarded_at: Date;
};

type AchievementUnlockRow = {
  id: string;
  duo_id: string;
  achievement_slug: string;
  source_type: GamificationFactSourceType;
  source_id: string;
  unlocked_by_user_id: string | null;
  metadata: Record<string, unknown>;
  unlocked_at: Date;
};

type QuestCycleRow = {
  id: string;
  duo_id: string;
  quest_slug: string;
  quest_type: QuestType;
  cycle_key: string;
  window_start_at: Date;
  window_end_at: Date;
  timezone: string;
  status: GamificationQuestCycleRecord["status"];
};

type QuestProgressRow = {
  id: string;
  duo_id: string;
  quest_cycle_id: string;
  current_value: number;
  completed_at: Date | null;
  reward_award_id: string | null;
  metadata: Record<string, unknown>;
  updated_at: Date;
};

type StreakStateRow = {
  duo_id: string;
  current_streak: number;
  longest_streak: number;
  available_freezes: number;
  last_activity_duo_day: string | null;
  updated_at: Date;
};

type JobRow = {
  id: string;
  duo_id: string;
  job_key: string;
  job_type: GamificationDueJobRecord["jobType"];
  run_at: Date;
  attempts: number;
  payload: Record<string, unknown>;
};

let runtimePool: QueueDbPool | undefined;
let defaultGamificationRepository: GamificationRepository | undefined;

export const gamificationRepository: GamificationRepository = {
  withUserTransaction: (...args) =>
    getDefaultGamificationRepository().withUserTransaction(...args),
  claimDueGamificationJobs: (...args) =>
    getDefaultGamificationRepository().claimDueGamificationJobs(...args),
  completeGamificationJob: (...args) =>
    getDefaultGamificationRepository().completeGamificationJob(...args),
  failGamificationJob: (...args) =>
    getDefaultGamificationRepository().failGamificationJob(...args),
  recordProjectionRebuild: (...args) =>
    getDefaultGamificationRepository().recordProjectionRebuild(...args)
};

export function createGamificationRepository(
  pool: QueueDbPool = getRuntimePool()
): GamificationRepository {
  return {
    withUserTransaction: (userId, callback) =>
      withAppUserTransaction(pool, userId, (client) =>
        callback(createGamificationTransaction(client))
      ),
    claimDueGamificationJobs: (input) => claimDueGamificationJobs(pool, input),
    completeGamificationJob: (jobId) => completeGamificationJob(pool, jobId),
    failGamificationJob: (input) => failGamificationJob(pool, input),
    recordProjectionRebuild: (input) => recordProjectionRebuild(pool, input)
  };
}

export function createGamificationTransaction(
  client: QueueDbClient
): GamificationRepositoryTransaction {
  return {
    resolveMembership: (userId) => resolveMembership(client, userId),
    readDuoTimezone: (duoId) => readDuoTimezone(client, duoId),
    readProjection: (duoId) => readProjection(client, duoId),
    countXpAwardsForDuoDay: (input) => countXpAwardsForDuoDay(client, input),
    insertXpLedgerAward: (input) => insertXpLedgerAward(client, input),
    updateProjection: (input) => updateProjection(client, input),
    readAchievementUnlocks: (duoId) => readAchievementUnlocks(client, duoId),
    readRecentXpLedgerAwards: (input) => readRecentXpLedgerAwards(client, input),
    insertAchievementUnlock: (input) => insertAchievementUnlock(client, input),
    readActiveQuestCycles: (duoId) => readActiveQuestCycles(client, duoId),
    readQuestProgressForCycles: (input) => readQuestProgressForCycles(client, input),
    upsertQuestCycle: (input) => upsertQuestCycle(client, input),
    upsertQuestProgress: (input) => upsertQuestProgress(client, input),
    readStreakState: (duoId) => readStreakState(client, duoId),
    insertStreakEvent: (input) => insertStreakEvent(client, input),
    upsertStreakState: (input) => upsertStreakState(client, input),
    insertRewardNotification: (input) => insertRewardNotification(client, input),
    insertAdjustment: (input) => insertAdjustment(client, input),
    sumXpLedgerAwards: (duoId) => sumXpLedgerAwards(client, duoId)
  };
}

async function resolveMembership(
  client: QueueDbClient,
  userId: GamificationUserId
): Promise<GamificationMembershipContext | null> {
  const result = await client.query<MembershipRow>(
    `
      SELECT member.duo_id, member.user_id
      FROM app.duo_members AS member
      WHERE member.duo_id = (
        SELECT own.duo_id
        FROM app.duo_members AS own
        WHERE own.user_id = $1
        LIMIT 1
      )
      ORDER BY member.member_slot
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const memberUserIds = result.rows.map((row) => row.user_id);

  return {
    duoId: result.rows[0]!.duo_id,
    userId,
    partnerUserId: memberUserIds.find((memberUserId) => memberUserId !== userId) ?? userId,
    memberUserIds
  };
}

async function readDuoTimezone(
  client: QueueDbClient,
  duoId: string
): Promise<string> {
  const result = await client.query<{ timezone: string }>(
    `
      SELECT timezone
      FROM app.duos
      WHERE id = $1
      LIMIT 1
    `,
    [duoId]
  );

  return result.rows[0]?.timezone ?? "America/Sao_Paulo";
}

async function readProjection(
  client: QueueDbClient,
  duoId: string
): Promise<GamificationProjectionRecord | null> {
  const result = await client.query<ProjectionRow>(
    `
      SELECT
        duo.id AS duo_id,
        duo.xp,
        duo.level,
        duo.streak,
        streak.available_freezes,
        GREATEST(duo.updated_at, COALESCE(streak.updated_at, duo.updated_at)) AS updated_at
      FROM app.duos AS duo
      LEFT JOIN app.gamification_streak_state AS streak
        ON streak.duo_id = duo.id
      WHERE duo.id = $1
      LIMIT 1
    `,
    [duoId]
  );
  const row = result.rows[0];

  return row ? mapProjection(row) : null;
}

async function countXpAwardsForDuoDay(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["countXpAwardsForDuoDay"]>[0]
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `
      SELECT count(*) AS count
      FROM app.duo_xp_awards
      WHERE duo_id = $1
        AND source_type = $2
        AND ((awarded_at AT TIME ZONE $4)::date)::text = $3
    `,
    [input.duoId, input.sourceType, input.duoDay, input.timezone]
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function insertXpLedgerAward(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["insertXpLedgerAward"]>[0]
): Promise<GamificationXpLedgerRecord | null> {
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
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        reason_code,
        awarded_by_user_id,
        metadata,
        awarded_at
    `,
    [
      input.duoId,
      input.awardKey,
      input.sourceType,
      input.sourceId,
      input.amount,
      input.reasonCode,
      input.awardedByUserId,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  const row = result.rows[0];

  return row ? mapXpLedger(row) : null;
}

async function updateProjection(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["updateProjection"]>[0]
): Promise<GamificationProjectionRecord> {
  const updateResult = await client.query<{ duo_id: string; streak: number }>(
    `
      UPDATE app.duos
      SET xp = GREATEST(0, xp + $2),
          level = $3,
          streak = COALESCE($4::integer, streak),
          updated_at = now()
      WHERE id = $1
      RETURNING id AS duo_id, streak
    `,
    [input.duoId, input.xpDelta, input.nextLevel.level, input.streak ?? null]
  );
  const updatedDuo = updateResult.rows[0];

  if (!updatedDuo) {
    throw new Error("gamification_projection_duo_not_found");
  }

  if (input.streak !== undefined || input.availableFreezes !== undefined) {
    await client.query(
      `
        INSERT INTO app.gamification_streak_state (
          duo_id,
          current_streak,
          longest_streak,
          available_freezes,
          updated_at
        )
        VALUES ($1, COALESCE($2::integer, 0), COALESCE($2::integer, 0), COALESCE($3::integer, 0), now())
        ON CONFLICT (duo_id) DO UPDATE
        SET current_streak = COALESCE($2::integer, app.gamification_streak_state.current_streak),
            longest_streak = GREATEST(
              app.gamification_streak_state.longest_streak,
              COALESCE($2::integer, app.gamification_streak_state.current_streak)
            ),
            available_freezes = COALESCE($3::integer, app.gamification_streak_state.available_freezes),
            updated_at = now()
      `,
      [input.duoId, input.streak ?? null, input.availableFreezes ?? null]
    );
  }

  const projection = await readProjection(client, input.duoId);

  if (!projection) {
    throw new Error("gamification_projection_read_failed");
  }

  return projection;
}

async function readAchievementUnlocks(
  client: QueueDbClient,
  duoId: string
): Promise<GamificationAchievementUnlockRecord[]> {
  const result = await client.query<AchievementUnlockRow>(
    `
      SELECT
        id,
        duo_id,
        achievement_slug,
        source_type,
        source_id,
        unlocked_by_user_id,
        metadata,
        unlocked_at
      FROM app.gamification_achievement_unlocks
      WHERE duo_id = $1
      ORDER BY unlocked_at DESC, achievement_slug ASC
    `,
    [duoId]
  );

  return result.rows.map(mapAchievementUnlock);
}

async function readRecentXpLedgerAwards(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["readRecentXpLedgerAwards"]>[0]
): Promise<GamificationXpLedgerRecord[]> {
  const limit = Math.min(Math.max(input.limit, 1), 12);
  const result = await client.query<XpLedgerRow>(
    `
      SELECT
        id,
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        reason_code,
        awarded_by_user_id,
        metadata,
        awarded_at
      FROM app.duo_xp_awards
      WHERE duo_id = $1
      ORDER BY awarded_at DESC, id DESC
      LIMIT $2
    `,
    [input.duoId, limit]
  );

  return result.rows.map(mapXpLedger);
}

async function insertAchievementUnlock(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["insertAchievementUnlock"]>[0]
): Promise<GamificationAchievementUnlockRecord | null> {
  const result = await client.query<AchievementUnlockRow>(
    `
      INSERT INTO app.gamification_achievement_unlocks (
        duo_id,
        achievement_slug,
        source_type,
        source_id,
        unlocked_by_user_id,
        metadata
      )
      VALUES ($1, $2, $3, $4::uuid, $5, $6::jsonb)
      ON CONFLICT DO NOTHING
      RETURNING
        id,
        duo_id,
        achievement_slug,
        source_type,
        source_id,
        unlocked_by_user_id,
        metadata,
        unlocked_at
    `,
    [
      input.duoId,
      input.achievementSlug,
      input.sourceType,
      input.sourceId,
      input.unlockedByUserId,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  const row = result.rows[0];

  return row ? mapAchievementUnlock(row) : null;
}

async function readActiveQuestCycles(
  client: QueueDbClient,
  duoId: string
): Promise<GamificationQuestCycleRecord[]> {
  const result = await client.query<QuestCycleRow>(
    `
      SELECT
        id,
        duo_id,
        quest_slug,
        quest_type,
        cycle_key,
        window_start_at,
        window_end_at,
        timezone,
        status
      FROM app.gamification_quest_cycles
      WHERE duo_id = $1
        AND status = 'active'
        AND window_end_at > now()
      ORDER BY quest_type ASC, window_start_at ASC, quest_slug ASC
    `,
    [duoId]
  );

  return result.rows.map(mapQuestCycle);
}

async function readQuestProgressForCycles(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["readQuestProgressForCycles"]>[0]
): Promise<GamificationQuestProgressRecord[]> {
  if (input.questCycleIds.length === 0) {
    return [];
  }

  const result = await client.query<QuestProgressRow>(
    `
      SELECT
        id,
        duo_id,
        quest_cycle_id,
        current_value,
        completed_at,
        reward_award_id,
        metadata,
        updated_at
      FROM app.gamification_quest_progress
      WHERE duo_id = $1
        AND quest_cycle_id = ANY($2::uuid[])
    `,
    [input.duoId, input.questCycleIds]
  );

  return result.rows.map(mapQuestProgress);
}

async function upsertQuestCycle(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["upsertQuestCycle"]>[0]
): Promise<GamificationQuestCycleRecord> {
  const result = await client.query<QuestCycleRow>(
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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (duo_id, quest_slug, cycle_key) DO UPDATE
      SET window_start_at = excluded.window_start_at,
          window_end_at = excluded.window_end_at,
          timezone = excluded.timezone,
          status = 'active',
          updated_at = now()
      RETURNING
        id,
        duo_id,
        quest_slug,
        quest_type,
        cycle_key,
        window_start_at,
        window_end_at,
        timezone,
        status
    `,
    [
      input.duoId,
      input.questSlug,
      input.questType,
      input.cycleKey,
      input.windowStartAt,
      input.windowEndAt,
      input.timezone
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("gamification_quest_cycle_upsert_failed");
  }

  return mapQuestCycle(row);
}

async function upsertQuestProgress(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["upsertQuestProgress"]>[0]
): Promise<GamificationQuestProgressRecord> {
  const result = await client.query<QuestProgressRow>(
    `
      INSERT INTO app.gamification_quest_progress (
        duo_id,
        quest_cycle_id,
        current_value,
        completed_at,
        reward_award_id,
        last_source_type,
        last_source_id,
        metadata
      )
      VALUES ($1, $2::uuid, $3, $4, $5::uuid, $6, $7::uuid, $8::jsonb)
      ON CONFLICT (duo_id, quest_cycle_id) DO UPDATE
      SET current_value = GREATEST(app.gamification_quest_progress.current_value, excluded.current_value),
          completed_at = COALESCE(app.gamification_quest_progress.completed_at, excluded.completed_at),
          reward_award_id = COALESCE(app.gamification_quest_progress.reward_award_id, excluded.reward_award_id),
          last_source_type = COALESCE(excluded.last_source_type, app.gamification_quest_progress.last_source_type),
          last_source_id = COALESCE(excluded.last_source_id, app.gamification_quest_progress.last_source_id),
          metadata = app.gamification_quest_progress.metadata || excluded.metadata,
          updated_at = now()
      RETURNING
        id,
        duo_id,
        quest_cycle_id,
        current_value,
        completed_at,
        reward_award_id,
        metadata,
        updated_at
    `,
    [
      input.duoId,
      input.questCycleId,
      input.currentValue,
      input.completedAt ?? null,
      input.rewardAwardId ?? null,
      input.lastSourceType ?? null,
      input.lastSourceId ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("gamification_quest_progress_upsert_failed");
  }

  return mapQuestProgress(row);
}

async function readStreakState(
  client: QueueDbClient,
  duoId: string
): Promise<GamificationStreakStateRecord | null> {
  const result = await client.query<StreakStateRow>(
    `
      SELECT
        duo_id,
        current_streak,
        longest_streak,
        available_freezes,
        last_activity_duo_day,
        updated_at
      FROM app.gamification_streak_state
      WHERE duo_id = $1
      LIMIT 1
    `,
    [duoId]
  );
  const row = result.rows[0];

  return row ? mapStreakState(row) : null;
}

async function insertStreakEvent(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["insertStreakEvent"]>[0]
): Promise<boolean> {
  const result = await client.query<{ id: string }>(
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
        freeze_delta,
        metadata
      )
      VALUES ($1, $2, $3, $4::date, $5, $6::uuid, $7, $8, $9, $10::jsonb)
      ON CONFLICT (duo_id, event_key) DO NOTHING
      RETURNING id
    `,
    [
      input.duoId,
      input.eventKey,
      input.eventType,
      input.duoDay,
      input.sourceType ?? null,
      input.sourceId ?? null,
      input.actorUserId ?? null,
      input.deltaDays ?? 0,
      input.freezeDelta ?? 0,
      JSON.stringify(input.metadata ?? {})
    ]
  );

  return result.rows.length > 0;
}

async function upsertStreakState(
  client: QueueDbClient,
  input: GamificationStreakStateRecord
): Promise<GamificationStreakStateRecord> {
  const result = await client.query<StreakStateRow>(
    `
      INSERT INTO app.gamification_streak_state (
        duo_id,
        current_streak,
        longest_streak,
        available_freezes,
        last_activity_duo_day,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::date, now())
      ON CONFLICT (duo_id) DO UPDATE
      SET current_streak = excluded.current_streak,
          longest_streak = GREATEST(
            app.gamification_streak_state.longest_streak,
            excluded.longest_streak,
            excluded.current_streak
          ),
          available_freezes = excluded.available_freezes,
          last_activity_duo_day = excluded.last_activity_duo_day,
          updated_at = now()
      RETURNING
        duo_id,
        current_streak,
        longest_streak,
        available_freezes,
        last_activity_duo_day,
        updated_at
    `,
    [
      input.duoId,
      input.currentStreak,
      input.longestStreak,
      input.availableFreezes,
      input.lastActivityDuoDay
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("gamification_streak_state_upsert_failed");
  }

  return mapStreakState(row);
}

async function insertRewardNotification(
  client: QueueDbClient,
  input: GamificationRewardNotificationInput
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_reward_notifications (
        duo_id,
        recipient_user_id,
        actor_user_id,
        notification_type,
        intensity,
        title,
        body,
        action_ref_type,
        action_ref_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid, $10::jsonb)
    `,
    [
      input.duoId,
      input.recipientUserId ?? null,
      input.actorUserId ?? null,
      input.notificationType,
      input.intensity,
      input.title,
      input.body ?? null,
      input.actionRefType ?? null,
      input.actionRefId ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

async function insertAdjustment(
  client: QueueDbClient,
  input: GamificationAdjustmentInput
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.gamification_adjustments (
        duo_id,
        adjustment_key,
        amount_delta,
        reason_code,
        actor_user_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (duo_id, adjustment_key) DO NOTHING
    `,
    [
      input.duoId,
      input.adjustmentKey,
      input.amountDelta,
      input.reasonCode,
      input.actorUserId,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

async function sumXpLedgerAwards(
  client: QueueDbClient,
  duoId: string
): Promise<number> {
  const result = await client.query<{ total: string | null }>(
    `
      SELECT COALESCE(sum(amount), 0)::text AS total
      FROM app.duo_xp_awards
      WHERE duo_id = $1
    `,
    [duoId]
  );

  return Number(result.rows[0]?.total ?? 0);
}

async function claimDueGamificationJobs(
  pool: QueueDbPool,
  input: Parameters<GamificationRepository["claimDueGamificationJobs"]>[0]
): Promise<GamificationDueJobRecord[]> {
  const client = await pool.connect();
  const limit = Math.min(Math.max(input.limit, 1), 100);

  try {
    await client.query("BEGIN");
    const result = await client.query<JobRow>(
      `
        WITH due_jobs AS (
          SELECT id
          FROM ops.scheduled_jobs
          WHERE status IN ('pending', 'failed')
            AND job_type = ANY($2::text[])
            AND job_type IN ('gamification-quest-rotation', 'gamification-streak-check')
            AND run_at <= $1
          ORDER BY run_at ASC, id ASC
          LIMIT $3
          FOR UPDATE SKIP LOCKED
        )
        UPDATE ops.scheduled_jobs AS job
        SET status = 'claimed',
            attempts = attempts + 1,
            locked_at = $1,
            locked_by = $4,
            updated_at = now()
        FROM due_jobs
        WHERE job.id = due_jobs.id
        RETURNING
          job.id,
          job.duo_id,
          job.job_key,
          job.job_type,
          job.run_at,
          job.attempts,
          job.payload
      `,
      [input.now, input.jobTypes, limit, input.workerId]
    );
    await client.query("COMMIT");
    return result.rows.map(mapJob);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeGamificationJob(pool: QueueDbPool, jobId: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE ops.scheduled_jobs
        SET status = 'completed',
            processed_at = now(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            updated_at = now()
        WHERE id = $1
      `,
      [jobId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function failGamificationJob(
  pool: QueueDbPool,
  input: Parameters<GamificationRepository["failGamificationJob"]>[0]
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE ops.scheduled_jobs
        SET status = 'failed',
            run_at = $3,
            locked_at = NULL,
            locked_by = NULL,
            last_error = left($2, 500),
            updated_at = now()
        WHERE id = $1
      `,
      [input.jobId, input.errorMessage, input.retryAt]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordProjectionRebuild(
  pool: QueueDbPool,
  input: Parameters<GamificationRepository["recordProjectionRebuild"]>[0]
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
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
          metadata,
          finished_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb,
          CASE WHEN $3 IN ('completed', 'failed') THEN now() ELSE NULL END,
          now()
        )
        ON CONFLICT (duo_id, rebuild_key) DO UPDATE
        SET status = excluded.status,
            reason_code = excluded.reason_code,
            xp_before = COALESCE(excluded.xp_before, ops.gamification_projection_rebuilds.xp_before),
            xp_after = COALESCE(excluded.xp_after, ops.gamification_projection_rebuilds.xp_after),
            level_before = COALESCE(excluded.level_before, ops.gamification_projection_rebuilds.level_before),
            level_after = COALESCE(excluded.level_after, ops.gamification_projection_rebuilds.level_after),
            streak_before = COALESCE(excluded.streak_before, ops.gamification_projection_rebuilds.streak_before),
            streak_after = COALESCE(excluded.streak_after, ops.gamification_projection_rebuilds.streak_after),
            metadata = ops.gamification_projection_rebuilds.metadata || excluded.metadata,
            finished_at = CASE
              WHEN excluded.status IN ('completed', 'failed') THEN now()
              ELSE ops.gamification_projection_rebuilds.finished_at
            END,
            updated_at = now()
      `,
      [
        input.duoId,
        input.rebuildKey,
        input.status,
        input.reasonCode,
        input.xpBefore ?? null,
        input.xpAfter ?? null,
        input.levelBefore ?? null,
        input.levelAfter ?? null,
        input.streakBefore ?? null,
        input.streakAfter ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function mapProjection(row: ProjectionRow): GamificationProjectionRecord {
  return {
    duoId: row.duo_id,
    xp: Number(row.xp),
    level: getLevelForXp(Number(row.xp)),
    streak: Number(row.streak),
    availableFreezes: Number(row.available_freezes ?? 0),
    updatedAt: row.updated_at
  };
}

function mapXpLedger(row: XpLedgerRow): GamificationXpLedgerRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    awardKey: row.award_key,
    sourceType: row.source_type,
    sourceId: row.source_id,
    amount: Number(row.amount),
    reasonCode: row.reason_code,
    awardedByUserId: row.awarded_by_user_id,
    metadata: row.metadata ?? {},
    awardedAt: row.awarded_at
  };
}

function mapAchievementUnlock(row: AchievementUnlockRow): GamificationAchievementUnlockRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    achievementSlug: row.achievement_slug,
    sourceType: row.source_type,
    sourceId: row.source_id,
    unlockedByUserId: row.unlocked_by_user_id,
    metadata: row.metadata ?? {},
    unlockedAt: row.unlocked_at
  };
}

function mapQuestCycle(row: QuestCycleRow): GamificationQuestCycleRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    questSlug: row.quest_slug,
    questType: row.quest_type,
    cycleKey: row.cycle_key,
    windowStartAt: row.window_start_at,
    windowEndAt: row.window_end_at,
    timezone: row.timezone,
    status: row.status
  };
}

function mapQuestProgress(row: QuestProgressRow): GamificationQuestProgressRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    questCycleId: row.quest_cycle_id,
    currentValue: Number(row.current_value),
    completedAt: row.completed_at,
    rewardAwardId: row.reward_award_id,
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at
  };
}

function mapStreakState(row: StreakStateRow): GamificationStreakStateRecord {
  return {
    duoId: row.duo_id,
    currentStreak: Number(row.current_streak),
    longestStreak: Number(row.longest_streak),
    availableFreezes: Number(row.available_freezes),
    lastActivityDuoDay: row.last_activity_duo_day,
    updatedAt: row.updated_at
  };
}

function mapJob(row: JobRow): GamificationDueJobRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    jobKey: row.job_key,
    jobType: row.job_type,
    runAt: row.run_at,
    attempts: Number(row.attempts),
    payload: row.payload ?? {}
  };
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function getDefaultGamificationRepository(): GamificationRepository {
  defaultGamificationRepository ??= createGamificationRepository(getRuntimePool());
  return defaultGamificationRepository;
}
