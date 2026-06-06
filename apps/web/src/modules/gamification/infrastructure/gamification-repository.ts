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
  GamificationEnqueueJobInput,
  GamificationJobBootstrapResult,
  GamificationJobScheduleKind,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationRewardNotificationInput,
  GamificationStreakStateRecord,
  GamificationUserId,
  GamificationXpLedgerRecord,
  GamificationReadyJobTarget
} from "../application/ports";
import type { AchievementMetricSnapshot } from "../domain/achievement-predicates";
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

type QuestAdvanceRow = QuestProgressRow & {
  advanced: boolean;
  completed_now: boolean;
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

type ReadyJobTargetRow = {
  duo_id: string;
  timezone: string;
  created_by_user_id: string;
};

type AchievementMetricsRow = {
  achievement_count: string | number;
  achievement_slugs: string[] | null;
  aligned_play_day_count: string | number;
  attendance_confirmation_count: string | number;
  boss_marker_count: string | number;
  calm_streak_count: string | number;
  comeback_session_count: string | number;
  completed_chapter_count: string | number;
  confirmed_session_count: string | number;
  couch_boss_count: string | number;
  current_streak: string | number;
  discovery_match_count: string | number;
  double_confirmation_count: string | number;
  duo_decision_count: string | number;
  freeze_consumed_count: string | number;
  freeze_earned_count: string | number;
  late_night_activity_count: string | number;
  late_session_chain_count: string | number;
  level: string | number;
  library_growth_count: string | number;
  library_maintenance_count: string | number;
  long_session_count: string | number;
  longest_streak: string | number;
  longest_streak_without_reset: string | number;
  marathon_session_count: string | number;
  max_confirmed_actions_per_local_day: string | number;
  max_confirmed_facts_per_local_week: string | number;
  max_estimated_time_ratio: string | number;
  max_progress_layers_per_game: string | number;
  max_sessions_per_game: string | number;
  max_weekly_quest_completions: string | number;
  monthly_quest_complete_count: string | number;
  mutual_want_count: string | number;
  quest_complete_count: string | number;
  quiz_match_count: string | number;
  same_hour_session_count: string | number;
  scheduled_session_count: string | number;
  seasonal_anniversary_complete_count: string | number;
  seasonal_awards_complete_count: string | number;
  seasonal_quest_complete_count: string | number;
  seasonal_spooky_complete_count: string | number;
  surprise_match_count: string | number;
  terminal_dropado_count: string | number;
  terminal_zerado_count: string | number;
  unexpected_match_count: string | number;
  weekend_session_count: string | number;
};

type GamificationRepositoryOptions = {
  runtimePool?: QueueDbPool;
  workerPool?: QueueDbPool;
  workerPoolFactory?: () => QueueDbPool;
};

let runtimePool: QueueDbPool | undefined;
let workerPool: QueueDbPool | undefined;
let defaultGamificationRepository: GamificationRepository | undefined;

export const gamificationRepository: GamificationRepository = {
  withUserTransaction: (...args) =>
    getDefaultGamificationRepository().withUserTransaction(...args),
  ensureGamificationJobs: (...args) =>
    getDefaultGamificationRepository().ensureGamificationJobs(...args),
  enqueueGamificationJob: (...args) =>
    getDefaultGamificationRepository().enqueueGamificationJob(...args),
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
  input: QueueDbPool | GamificationRepositoryOptions = {}
): GamificationRepository {
  const options = isQueueDbPool(input) ? { runtimePool: input } : input;
  const resolvedRuntimePool = options.runtimePool ?? getRuntimePool();
  let injectedWorkerPool = options.workerPool;
  const resolveWorkerPool = () => {
    injectedWorkerPool ??= options.workerPoolFactory?.() ?? getWorkerPool();
    return injectedWorkerPool;
  };

  return {
    withUserTransaction: (userId, callback) =>
      withAppUserTransaction(resolvedRuntimePool, userId, (client) =>
        callback(createGamificationTransaction(client))
      ),
    ensureGamificationJobs: (now) =>
      ensureGamificationJobs(resolveWorkerPool(), now),
    enqueueGamificationJob: (jobInput) =>
      enqueueGamificationJob(resolveWorkerPool(), jobInput),
    claimDueGamificationJobs: (jobInput) =>
      claimDueGamificationJobs(resolveWorkerPool(), jobInput),
    completeGamificationJob: (jobId) =>
      completeGamificationJob(resolveWorkerPool(), jobId),
    failGamificationJob: (jobInput) =>
      failGamificationJob(resolveWorkerPool(), jobInput),
    recordProjectionRebuild: (rebuildInput) =>
      recordProjectionRebuild(resolveWorkerPool(), rebuildInput)
  };
}

export function createGamificationTransaction(
  client: QueueDbClient
): GamificationRepositoryTransaction {
  return {
    resolveMembership: (userId) => resolveMembership(client, userId),
    readDuoTimezone: (duoId) => readDuoTimezone(client, duoId),
    readProjection: (duoId) => readProjection(client, duoId),
    lockProjection: (duoId) => lockProjection(client, duoId),
    readAchievementMetrics: (duoId, context) =>
      readAchievementMetrics(client, duoId, context),
    countXpAwardsForDuoDay: (input) => countXpAwardsForDuoDay(client, input),
    insertXpLedgerAward: (input) => insertXpLedgerAward(client, input),
    updateProjection: (input) => updateProjection(client, input),
    readAchievementUnlocks: (duoId) => readAchievementUnlocks(client, duoId),
    readRecentXpLedgerAwards: (input) => readRecentXpLedgerAwards(client, input),
    insertAchievementUnlock: (input) => insertAchievementUnlock(client, input),
    readActiveQuestCycles: (duoId) => readActiveQuestCycles(client, duoId),
    readQuestProgressForCycles: (input) => readQuestProgressForCycles(client, input),
    upsertQuestCycle: (input) => upsertQuestCycle(client, input),
    advanceQuestProgress: (input) => advanceQuestProgress(client, input),
    linkQuestProgressReward: (input) => linkQuestProgressReward(client, input),
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

async function lockProjection(
  client: QueueDbClient,
  duoId: string
): Promise<GamificationProjectionRecord | null> {
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
    [duoId]
  );
  const row = result.rows[0];

  return row ? mapProjection(row) : null;
}

async function readAchievementMetrics(
  client: QueueDbClient,
  duoId: string,
  context: {
    timezone: string;
  }
): Promise<AchievementMetricSnapshot> {
  const result = await client.query<AchievementMetricsRow>(
    `
      WITH confirmed_sessions AS (
        SELECT
          session.id,
          session.library_game_id,
          session.kind,
          session.duration_seconds,
          COALESCE(session.ended_at, session.started_at) AS occurred_at,
          (COALESCE(session.ended_at, session.started_at) AT TIME ZONE $2)::date AS local_day,
          extract(hour FROM COALESCE(session.ended_at, session.started_at) AT TIME ZONE $2)::integer AS local_hour,
          date_trunc('week', COALESCE(session.ended_at, session.started_at) AT TIME ZONE $2)::date AS local_week
        FROM app.play_sessions AS session
        WHERE session.duo_id = $1
          AND session.status = 'confirmed'
      ),
      session_gaps AS (
        SELECT
          local_day,
          lag(local_day) OVER (ORDER BY local_day, occurred_at, id) AS previous_local_day
        FROM confirmed_sessions
      ),
      session_game_counts AS (
        SELECT library_game_id, count(*) AS session_count
        FROM confirmed_sessions
        GROUP BY library_game_id
      ),
      session_hour_counts AS (
        SELECT local_hour, count(*) AS session_count
        FROM confirmed_sessions
        GROUP BY local_hour
      ),
      late_session_days AS (
        SELECT local_day, count(*) AS session_count
        FROM confirmed_sessions
        WHERE local_hour BETWEEN 0 AND 3
        GROUP BY local_day
      ),
      completed_chapters AS (
        SELECT
          chapter.id,
          chapter.library_game_id,
          chapter.title,
          chapter.completed_at AS occurred_at,
          (chapter.completed_at AT TIME ZONE $2)::date AS local_day,
          extract(hour FROM chapter.completed_at AT TIME ZONE $2)::integer AS local_hour,
          date_trunc('week', chapter.completed_at AT TIME ZONE $2)::date AS local_week
        FROM app.play_chapters AS chapter
        WHERE chapter.duo_id = $1
          AND chapter.completed_at IS NOT NULL
      ),
      boss_chapters AS (
        SELECT *
        FROM completed_chapters
        WHERE translate(
          lower(title),
          'áàâãäéèêëíìîïóòôõöúùûüç',
          'aaaaaeeeeiiiiooooouuuuc'
        ) ~ '(boss|chefe|chefao)'
      ),
      confirmed_terminals AS (
        SELECT
          terminal.id,
          terminal.library_game_id,
          terminal.target_status,
          terminal.confirmed_at AS occurred_at,
          (terminal.confirmed_at AT TIME ZONE $2)::date AS local_day,
          extract(hour FROM terminal.confirmed_at AT TIME ZONE $2)::integer AS local_hour,
          date_trunc('week', terminal.confirmed_at AT TIME ZONE $2)::date AS local_week
        FROM app.play_terminal_requests AS terminal
        WHERE terminal.duo_id = $1
          AND terminal.status = 'confirmed'
          AND terminal.confirmed_at IS NOT NULL
      ),
      attended_schedules AS (
        SELECT
          scheduled.id,
          scheduled.library_game_id,
          scheduled.scheduled_start_at AS occurred_at,
          (scheduled.scheduled_start_at AT TIME ZONE $2)::date AS local_day,
          extract(hour FROM scheduled.scheduled_start_at AT TIME ZONE $2)::integer AS local_hour,
          date_trunc('week', scheduled.scheduled_start_at AT TIME ZONE $2)::date AS local_week
        FROM app.play_scheduled_sessions AS scheduled
        JOIN app.play_scheduled_attendance AS attendance
          ON attendance.scheduled_session_id = scheduled.id
          AND attendance.duo_id = scheduled.duo_id
        WHERE scheduled.duo_id = $1
          AND scheduled.status <> 'cancelled'
        GROUP BY
          scheduled.id,
          scheduled.library_game_id,
          scheduled.scheduled_start_at
        HAVING count(DISTINCT attendance.user_id) = 2
      ),
      confirmed_actions AS (
        SELECT occurred_at, local_day, local_hour, local_week FROM confirmed_sessions
        UNION ALL
        SELECT occurred_at, local_day, local_hour, local_week FROM completed_chapters
        UNION ALL
        SELECT occurred_at, local_day, local_hour, local_week FROM confirmed_terminals
        UNION ALL
        SELECT occurred_at, local_day, local_hour, local_week FROM attended_schedules
      ),
      action_day_counts AS (
        SELECT local_day, count(*) AS action_count
        FROM confirmed_actions
        GROUP BY local_day
      ),
      action_week_counts AS (
        SELECT local_week, count(*) AS action_count
        FROM confirmed_actions
        GROUP BY local_week
      ),
      aligned_play_days AS (
        SELECT DISTINCT session.library_game_id, session.local_day
        FROM confirmed_sessions AS session
        WHERE EXISTS (
          SELECT 1
          FROM completed_chapters AS chapter
          WHERE chapter.library_game_id = session.library_game_id
            AND chapter.local_day = session.local_day
        )
        OR EXISTS (
          SELECT 1
          FROM confirmed_terminals AS terminal
          WHERE terminal.library_game_id = session.library_game_id
            AND terminal.local_day = session.local_day
        )
      ),
      progress_metrics AS (
        SELECT
          progress.library_game_id,
          (
            CASE WHEN progress.confirmed_coop_seconds > 0 THEN 1 ELSE 0 END
            + CASE WHEN progress.subjective_percent IS NOT NULL THEN 1 ELSE 0 END
            + CASE WHEN EXISTS (
                SELECT 1
                FROM completed_chapters AS chapter
                WHERE chapter.library_game_id = progress.library_game_id
              ) THEN 1 ELSE 0 END
          ) AS progress_layers,
          CASE
            WHEN estimate.minutes > 0
              THEN progress.confirmed_coop_seconds::numeric / (estimate.minutes * 60)
            ELSE 0
          END AS estimated_time_ratio
        FROM app.play_progress AS progress
        JOIN app.duo_library_games AS library_game
          ON library_game.id = progress.library_game_id
          AND library_game.duo_id = progress.duo_id
        LEFT JOIN LATERAL (
          SELECT max(time_estimate.minutes) AS minutes
          FROM catalog.game_time_estimates AS time_estimate
          WHERE time_estimate.game_id = library_game.catalog_game_id
            AND time_estimate.minutes IS NOT NULL
        ) AS estimate ON true
        WHERE progress.duo_id = $1
      ),
      couch_boss_sessions AS (
        SELECT session.id
        FROM confirmed_sessions AS session
        WHERE session.kind = 'offline'
          AND COALESCE(session.duration_seconds, 0) >= 7200
          AND EXISTS (
            SELECT 1
            FROM boss_chapters AS boss
            WHERE boss.library_game_id = session.library_game_id
          )
      ),
      unexpected_matches AS (
        SELECT match.id
        FROM app.discovery_matches AS match
        WHERE match.duo_id = $1
          AND EXISTS (
            SELECT 1
            FROM app.discovery_matches AS previous_match
            WHERE previous_match.duo_id = match.duo_id
              AND previous_match.matched_at < match.matched_at
          )
          AND EXISTS (
            SELECT 1
            FROM catalog.game_genres AS current_genre
            WHERE current_genre.game_id = match.catalog_game_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM catalog.game_genres AS current_genre
            JOIN app.discovery_matches AS previous_match
              ON previous_match.duo_id = match.duo_id
              AND previous_match.matched_at < match.matched_at
            JOIN catalog.game_genres AS previous_genre
              ON previous_genre.game_id = previous_match.catalog_game_id
              AND previous_genre.slug = current_genre.slug
            WHERE current_genre.game_id = match.catalog_game_id
          )
      ),
      completed_quests AS (
        SELECT
          cycle.quest_slug,
          cycle.quest_type,
          cycle.cycle_key
        FROM app.gamification_quest_progress AS progress
        JOIN app.gamification_quest_cycles AS cycle
          ON cycle.id = progress.quest_cycle_id
          AND cycle.duo_id = progress.duo_id
        WHERE progress.duo_id = $1
          AND progress.completed_at IS NOT NULL
      ),
      weekly_quest_counts AS (
        SELECT cycle_key, count(*) AS quest_count
        FROM completed_quests
        WHERE quest_type = 'weekly'
        GROUP BY cycle_key
      ),
      achievement_unlocks AS (
        SELECT achievement_slug
        FROM app.gamification_achievement_unlocks
        WHERE duo_id = $1
      ),
      streak_snapshot AS (
        SELECT
          COALESCE(state.current_streak, 0) AS current_streak,
          COALESCE(state.longest_streak, 0) AS longest_streak,
          COALESCE((
            SELECT count(*)
            FROM app.gamification_streak_events AS event
            WHERE event.duo_id = $1
              AND event.event_type = 'freeze-consumed'
          ), 0) AS freeze_consumed_count,
          COALESCE((
            SELECT count(*)
            FROM app.gamification_streak_events AS event
            WHERE event.duo_id = $1
              AND event.event_type = 'streak-reset'
          ), 0) AS reset_count
        FROM app.duos AS duo
        LEFT JOIN app.gamification_streak_state AS state
          ON state.duo_id = duo.id
        WHERE duo.id = $1
      )
      SELECT
        (SELECT count(*) FROM achievement_unlocks) AS achievement_count,
        COALESCE((SELECT array_agg(achievement_slug ORDER BY achievement_slug) FROM achievement_unlocks), ARRAY[]::text[]) AS achievement_slugs,
        (SELECT count(*) FROM aligned_play_days) AS aligned_play_day_count,
        (SELECT count(*) FROM attended_schedules) AS attendance_confirmation_count,
        (SELECT count(*) FROM boss_chapters) AS boss_marker_count,
        CASE
          WHEN streak.current_streak >= 7 AND streak.reset_count = 0 THEN 1
          ELSE 0
        END AS calm_streak_count,
        (SELECT count(*) FROM session_gaps WHERE local_day - previous_local_day >= 7) AS comeback_session_count,
        (SELECT count(*) FROM completed_chapters) AS completed_chapter_count,
        (SELECT count(*) FROM confirmed_sessions) AS confirmed_session_count,
        (SELECT count(*) FROM couch_boss_sessions) AS couch_boss_count,
        streak.current_streak,
        (SELECT count(*) FROM app.discovery_matches WHERE duo_id = $1) AS discovery_match_count,
        (
          (SELECT count(*) FROM confirmed_sessions)
          + (SELECT count(*) FROM attended_schedules)
          + (SELECT count(*) FROM confirmed_terminals)
        ) AS double_confirmation_count,
        (
          SELECT count(*)
          FROM ops.domain_events
          WHERE duo_id = $1
            AND event_type = 'discovery.decision_recorded'
        ) AS duo_decision_count,
        streak.freeze_consumed_count,
        floor(duo.level / 10.0)::integer AS freeze_earned_count,
        (SELECT count(*) FROM confirmed_actions WHERE local_hour BETWEEN 0 AND 3) AS late_night_activity_count,
        COALESCE((SELECT max(floor(session_count / 3.0)) FROM late_session_days), 0) AS late_session_chain_count,
        duo.level,
        (SELECT count(*) FROM app.duo_library_games WHERE duo_id = $1) AS library_growth_count,
        (
          SELECT count(*)
          FROM ops.domain_events
          WHERE duo_id = $1
            AND event_type = 'library.status_moved'
        ) AS library_maintenance_count,
        (SELECT count(*) FROM confirmed_sessions WHERE COALESCE(duration_seconds, 0) >= 2700) AS long_session_count,
        streak.longest_streak,
        streak.current_streak AS longest_streak_without_reset,
        (SELECT count(*) FROM confirmed_sessions WHERE COALESCE(duration_seconds, 0) >= 7200) AS marathon_session_count,
        COALESCE((SELECT max(action_count) FROM action_day_counts), 0) AS max_confirmed_actions_per_local_day,
        COALESCE((SELECT max(action_count) FROM action_week_counts), 0) AS max_confirmed_facts_per_local_week,
        COALESCE((SELECT max(estimated_time_ratio) FROM progress_metrics), 0) AS max_estimated_time_ratio,
        COALESCE((SELECT max(progress_layers) FROM progress_metrics), 0) AS max_progress_layers_per_game,
        COALESCE((SELECT max(session_count) FROM session_game_counts), 0) AS max_sessions_per_game,
        COALESCE((SELECT max(quest_count) FROM weekly_quest_counts), 0) AS max_weekly_quest_completions,
        (SELECT count(*) FROM completed_quests WHERE quest_type = 'monthly') AS monthly_quest_complete_count,
        (SELECT count(*) FROM app.discovery_matches WHERE duo_id = $1) AS mutual_want_count,
        (SELECT count(*) FROM completed_quests) AS quest_complete_count,
        (SELECT count(*) FROM app.discovery_matches WHERE duo_id = $1 AND created_from = 'quiz') AS quiz_match_count,
        COALESCE((SELECT max(session_count) FROM session_hour_counts), 0) AS same_hour_session_count,
        (
          SELECT count(*)
          FROM app.play_scheduled_sessions
          WHERE duo_id = $1
            AND status <> 'cancelled'
        ) AS scheduled_session_count,
        (SELECT count(*) FROM completed_quests WHERE quest_slug = 'aniversario-da-fila') AS seasonal_anniversary_complete_count,
        (SELECT count(*) FROM completed_quests WHERE quest_slug = 'awards-em-casa') AS seasonal_awards_complete_count,
        (SELECT count(*) FROM completed_quests WHERE quest_type = 'seasonal') AS seasonal_quest_complete_count,
        (SELECT count(*) FROM completed_quests WHERE quest_slug = 'spooky-coop') AS seasonal_spooky_complete_count,
        (SELECT count(*) FROM app.discovery_matches WHERE duo_id = $1 AND created_from = 'surprise') AS surprise_match_count,
        (SELECT count(*) FROM confirmed_terminals WHERE target_status = 'dropado') AS terminal_dropado_count,
        (SELECT count(*) FROM confirmed_terminals WHERE target_status = 'zerado') AS terminal_zerado_count,
        (SELECT count(*) FROM unexpected_matches) AS unexpected_match_count,
        (
          SELECT count(*)
          FROM confirmed_sessions
          WHERE extract(isodow FROM occurred_at AT TIME ZONE $2) IN (6, 7)
        ) AS weekend_session_count
      FROM app.duos AS duo
      CROSS JOIN streak_snapshot AS streak
      WHERE duo.id = $1
    `,
    [duoId, context.timezone]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("gamification_achievement_metrics_not_found");
  }

  return mapAchievementMetrics(row);
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
  const updateResult = await client.query<{ duo_id: string; xp: number; streak: number }>(
    `
      UPDATE app.duos
      SET xp = GREATEST(0, xp + $2),
          streak = COALESCE($3::integer, streak),
          updated_at = now()
      WHERE id = $1
      RETURNING id AS duo_id, xp, streak
    `,
    [input.duoId, input.xpDelta, input.streak ?? null]
  );
  const updatedDuo = updateResult.rows[0];

  if (!updatedDuo) {
    throw new Error("gamification_projection_duo_not_found");
  }

  const nextLevel = getLevelForXp(updatedDuo.xp);

  await client.query(
    `
      UPDATE app.duos
      SET level = $2,
          updated_at = CASE WHEN level IS DISTINCT FROM $2 THEN now() ELSE updated_at END
      WHERE id = $1
        AND level IS DISTINCT FROM $2
    `,
    [input.duoId, nextLevel.level]
  );

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

async function advanceQuestProgress(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["advanceQuestProgress"]>[0]
): Promise<Awaited<ReturnType<GamificationRepositoryTransaction["advanceQuestProgress"]>>> {
  await client.query(
    `
      INSERT INTO app.gamification_quest_progress (
        duo_id,
        quest_cycle_id,
        current_value,
        metadata
      )
      VALUES ($1, $2::uuid, 0, '{}'::jsonb)
      ON CONFLICT (duo_id, quest_cycle_id) DO NOTHING
    `,
    [input.duoId, input.questCycleId]
  );

  const result = await client.query<QuestAdvanceRow>(
    `
      WITH previous AS MATERIALIZED (
        SELECT
          progress.*,
          progress.completed_at IS NULL
            AND NOT (
              COALESCE(progress.metadata -> 'sourceKeys', '[]'::jsonb) ? $3
            ) AS should_advance
        FROM app.gamification_quest_progress AS progress
        WHERE progress.duo_id = $1
          AND progress.quest_cycle_id = $2::uuid
        FOR UPDATE
      ),
      updated AS (
        UPDATE app.gamification_quest_progress AS progress
        SET current_value = LEAST($5, previous.current_value + $4),
            completed_at = CASE
              WHEN previous.current_value < $5
                AND LEAST($5, previous.current_value + $4) >= $5
                THEN $6
              ELSE previous.completed_at
            END,
            last_source_type = $7,
            last_source_id = $8::uuid,
            metadata = previous.metadata
              || $9::jsonb
              || jsonb_build_object(
                'sourceKeys',
                COALESCE(previous.metadata -> 'sourceKeys', '[]'::jsonb)
                  || jsonb_build_array($3),
                'lastSourceKey',
                $3
              ),
            updated_at = now()
        FROM previous
        WHERE progress.id = previous.id
          AND previous.should_advance
        RETURNING
          progress.id,
          progress.duo_id,
          progress.quest_cycle_id,
          progress.current_value,
          progress.completed_at,
          progress.reward_award_id,
          progress.metadata,
          progress.updated_at,
          true AS advanced,
          previous.current_value < $5
            AND progress.current_value >= $5 AS completed_now
      )
      SELECT *
      FROM updated
      UNION ALL
      SELECT
        previous.id,
        previous.duo_id,
        previous.quest_cycle_id,
        previous.current_value,
        previous.completed_at,
        previous.reward_award_id,
        previous.metadata,
        previous.updated_at,
        false AS advanced,
        false AS completed_now
      FROM previous
      WHERE NOT EXISTS (SELECT 1 FROM updated)
      LIMIT 1
    `,
    [
      input.duoId,
      input.questCycleId,
      input.sourceKey,
      input.increment,
      input.goal,
      input.completedAt,
      input.lastSourceType,
      input.lastSourceId,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("gamification_quest_progress_advance_failed");
  }

  return {
    advanced: row.advanced,
    completedNow: row.completed_now,
    progress: mapQuestProgress(row)
  };
}

async function linkQuestProgressReward(
  client: QueueDbClient,
  input: Parameters<GamificationRepositoryTransaction["linkQuestProgressReward"]>[0]
): Promise<GamificationQuestProgressRecord> {
  const result = await client.query<QuestProgressRow>(
    `
      UPDATE app.gamification_quest_progress
      SET reward_award_id = COALESCE(reward_award_id, $3::uuid),
          updated_at = CASE
            WHEN reward_award_id IS NULL THEN now()
            ELSE updated_at
          END
      WHERE duo_id = $1
        AND quest_cycle_id = $2::uuid
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
    [input.duoId, input.questCycleId, input.rewardAwardId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("gamification_quest_progress_reward_link_failed");
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

async function ensureGamificationJobs(
  pool: QueueDbPool,
  now: Date
): Promise<GamificationJobBootstrapResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const targetsResult = await client.query<ReadyJobTargetRow>(
      `
        SELECT
          duo.id AS duo_id,
          duo.timezone,
          (array_agg(member.user_id ORDER BY member.member_slot))[1] AS created_by_user_id
        FROM app.duos AS duo
        JOIN app.duo_members AS member ON member.duo_id = duo.id
        WHERE duo.paired_at IS NOT NULL
          AND btrim(COALESCE(duo.name, '')) <> ''
        GROUP BY duo.id, duo.timezone
        HAVING count(*) = 2
          AND count(DISTINCT member.user_id) = 2
          AND count(DISTINCT member.member_slot) = 2
          AND min(member.member_slot) = 1
          AND max(member.member_slot) = 2
        ORDER BY duo.id
      `
    );
    const targets = targetsResult.rows.map(mapReadyJobTarget);
    let producedJobs = 0;

    for (const target of targets) {
      for (const scheduleKind of [
        "weekly",
        "monthly",
        "seasonal",
        "streak"
      ] as const) {
        const inserted = await insertGamificationJob(client, {
          duoId: target.duoId,
          scheduleKind,
          runAt: now,
          createdByUserId: target.createdByUserId,
          jobKey: buildBootstrapJobKey(target.duoId, scheduleKind, now),
          payload:
            scheduleKind === "streak"
              ? {
                  checkAt: now.toISOString(),
                  createdByUserId: target.createdByUserId
                }
              : {
                  createdByUserId: target.createdByUserId,
                  now: now.toISOString(),
                  questType: scheduleKind
                }
        }, true);

        if (inserted) {
          producedJobs += 1;
        }
      }
    }

    await client.query("COMMIT");
    return {
      readyDuos: targets.length,
      producedJobs
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function enqueueGamificationJob(
  pool: QueueDbPool,
  input: GamificationEnqueueJobInput
): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const inserted = await insertGamificationJob(client, input, false);
    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertGamificationJob(
  client: QueueDbClient,
  input: GamificationEnqueueJobInput,
  skipActiveKind: boolean
): Promise<boolean> {
  const jobType =
    input.scheduleKind === "streak"
      ? "gamification-streak-check"
      : "gamification-quest-rotation";
  const jobKey =
    input.jobKey ??
    `gamification:${input.duoId}:${input.scheduleKind}:${input.runAt.toISOString()}`;
  const payload = {
    createdByUserId: input.createdByUserId,
    ...(input.scheduleKind === "streak"
      ? { checkAt: input.runAt.toISOString() }
      : { questType: input.scheduleKind }),
    ...(input.payload ?? {})
  };
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO ops.scheduled_jobs (
        duo_id,
        job_key,
        job_type,
        run_at,
        payload
      )
      SELECT $1, $2, $3, $4, $5::jsonb
      WHERE (
        NOT $7::boolean
        OR NOT EXISTS (
          SELECT 1
          FROM ops.scheduled_jobs AS existing
          WHERE existing.duo_id = $1
            AND existing.status IN ('pending', 'claimed', 'failed')
            AND existing.job_type = $3
            AND (
              $3 <> 'gamification-quest-rotation'
              OR existing.payload ->> 'questType' = $6
            )
        )
      )
      ON CONFLICT (job_key) DO NOTHING
      RETURNING id
    `,
    [
      input.duoId,
      jobKey,
      jobType,
      input.runAt,
      JSON.stringify(payload),
      input.scheduleKind,
      skipActiveKind
    ]
  );

  return result.rows.length > 0;
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

function mapAchievementMetrics(
  row: AchievementMetricsRow
): AchievementMetricSnapshot {
  return {
    achievementCount: Number(row.achievement_count),
    alignedPlayDayCount: Number(row.aligned_play_day_count),
    attendanceConfirmationCount: Number(row.attendance_confirmation_count),
    bossMarkerCount: Number(row.boss_marker_count),
    calmStreakCount: Number(row.calm_streak_count),
    comebackSessionCount: Number(row.comeback_session_count),
    completedChapterCount: Number(row.completed_chapter_count),
    confirmedSessionCount: Number(row.confirmed_session_count),
    couchBossCount: Number(row.couch_boss_count),
    currentStreak: Number(row.current_streak),
    discoveryMatchCount: Number(row.discovery_match_count),
    doubleConfirmationCount: Number(row.double_confirmation_count),
    duoDecisionCount: Number(row.duo_decision_count),
    freezeConsumedCount: Number(row.freeze_consumed_count),
    freezeEarnedCount: Number(row.freeze_earned_count),
    lateNightActivityCount: Number(row.late_night_activity_count),
    lateSessionChainCount: Number(row.late_session_chain_count),
    level: Number(row.level),
    libraryGrowthCount: Number(row.library_growth_count),
    libraryMaintenanceCount: Number(row.library_maintenance_count),
    longSessionCount: Number(row.long_session_count),
    longestStreak: Number(row.longest_streak),
    longestStreakWithoutReset: Number(row.longest_streak_without_reset),
    marathonSessionCount: Number(row.marathon_session_count),
    maxConfirmedActionsPerLocalDay: Number(
      row.max_confirmed_actions_per_local_day
    ),
    maxConfirmedFactsPerLocalWeek: Number(
      row.max_confirmed_facts_per_local_week
    ),
    maxEstimatedTimeRatio: Number(row.max_estimated_time_ratio),
    maxProgressLayersPerGame: Number(row.max_progress_layers_per_game),
    maxSessionsPerGame: Number(row.max_sessions_per_game),
    maxWeeklyQuestCompletions: Number(row.max_weekly_quest_completions),
    monthlyQuestCompleteCount: Number(row.monthly_quest_complete_count),
    mutualWantCount: Number(row.mutual_want_count),
    questCompleteCount: Number(row.quest_complete_count),
    quizMatchCount: Number(row.quiz_match_count),
    sameHourSessionCount: Number(row.same_hour_session_count),
    scheduledSessionCount: Number(row.scheduled_session_count),
    seasonalAnniversaryCompleteCount: Number(
      row.seasonal_anniversary_complete_count
    ),
    seasonalAwardsCompleteCount: Number(row.seasonal_awards_complete_count),
    seasonalQuestCompleteCount: Number(row.seasonal_quest_complete_count),
    seasonalSpookyCompleteCount: Number(row.seasonal_spooky_complete_count),
    surpriseMatchCount: Number(row.surprise_match_count),
    terminalDropadoCount: Number(row.terminal_dropado_count),
    terminalZeradoCount: Number(row.terminal_zerado_count),
    unexpectedMatchCount: Number(row.unexpected_match_count),
    unlockedAchievementSlugs: row.achievement_slugs ?? [],
    weekendSessionCount: Number(row.weekend_session_count)
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

function mapReadyJobTarget(row: ReadyJobTargetRow): GamificationReadyJobTarget {
  return {
    duoId: row.duo_id,
    timezone: row.timezone,
    createdByUserId: row.created_by_user_id
  };
}

function buildBootstrapJobKey(
  duoId: string,
  scheduleKind: GamificationJobScheduleKind,
  now: Date
): string {
  return `gamification-bootstrap:${duoId}:${scheduleKind}:${now.toISOString().slice(0, 10)}`;
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function getWorkerPool(): QueueDbPool {
  const connectionString = process.env.WORKER_DATABASE_URL;

  if (!connectionString) {
    throw new Error("WORKER_DATABASE_URL is required for gamification jobs.");
  }

  workerPool ??= createRuntimePool(connectionString);
  return workerPool;
}

function isQueueDbPool(
  input: QueueDbPool | GamificationRepositoryOptions
): input is QueueDbPool {
  return typeof (input as QueueDbPool).connect === "function";
}

function getDefaultGamificationRepository(): GamificationRepository {
  defaultGamificationRepository ??= createGamificationRepository({
    runtimePool: getRuntimePool(),
    workerPoolFactory: getWorkerPool
  });
  return defaultGamificationRepository;
}
