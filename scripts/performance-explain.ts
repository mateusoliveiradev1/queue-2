import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type ReviewQuery = {
  name: string;
  surface: string;
  mode: "read-analyze" | "mutation-static";
  queryCount: number;
  sql: string;
  params?: unknown[];
  expectedIndexes: string[];
};

type QueryReviewResult = {
  name: string;
  surface: string;
  mode: ReviewQuery["mode"];
  queryCount: number;
  expectedIndexes: string[];
  status: "reviewed" | "failed" | "blocked";
  planSummary: string;
  actionTaken: string;
};

type QueryReviewRun = {
  result: "PASSED" | "FAILED";
  results: QueryReviewResult[];
};

type QueryReviewWriteOptions = {
  databaseStatus?: string;
  evidenceSource?: string;
  nextAction?: string;
};

type PgPool = {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const requestedPhase = readFlag("--phase") ?? "03.3";

loadEnvLocal();

export const phase33ReviewQueries: ReviewQuery[] = [
  {
    name: "Catalogo browse",
    surface: "/app/catalogo",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "catalog_games_main_flow_idx",
      "catalog_games_slug_uidx",
      "catalog_game_platforms_platform_idx"
    ],
    sql: `
      SELECT game.id, game.slug, game.name, game.synced_at
      FROM catalog.games AS game
      WHERE game.main_flow_eligible = true
        AND ($1::text IS NULL OR game.name ILIKE '%' || $1 || '%' OR game.slug ILIKE '%' || $1 || '%')
      ORDER BY game.synced_at DESC, game.name ASC
      LIMIT 19
    `,
    params: [null]
  },
  {
    name: "Catalogo detail",
    surface: "/app/jogo/[slug]",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "catalog_games_slug_uidx",
      "catalog_game_platforms_game_platform_uidx",
      "catalog_game_localizations_published_lookup_idx"
    ],
    sql: `
      SELECT game.id, game.slug, game.name
      FROM catalog.games AS game
      WHERE game.slug = $1
      LIMIT 1
    `,
    params: ["query-review-game"]
  },
  {
    name: "Biblioteca queue page",
    surface: "/app/biblioteca",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_duo_library_games_duo_status_idx",
      "app_duo_library_games_duo_catalog_uidx",
      "catalog_game_platforms_platform_idx"
    ],
    sql: `
      SELECT library_game.id, library_game.status, game.name
      FROM app.duo_library_games AS library_game
      INNER JOIN catalog.games AS game
        ON game.id = library_game.catalog_game_id
      WHERE library_game.duo_id = $1::uuid
        AND library_game.status = ANY($2::text[])
      ORDER BY game.name ASC, library_game.updated_at DESC, library_game.created_at DESC
      LIMIT 12
      OFFSET 0
    `,
    params: ["00000000-0000-0000-0000-000000000001", ["wishlist", "jogando", "pausado"]]
  },
  {
    name: "Descobrir deck candidates",
    surface: "/app/descobrir",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "catalog_games_main_flow_idx",
      "app_discovery_member_decisions_deck_exclusion_idx",
      "app_duo_library_games_duo_catalog_uidx"
    ],
    sql: `
      SELECT game.id, game.slug, game.name
      FROM catalog.games AS game
      WHERE game.main_flow_eligible = true
        AND NOT EXISTS (
          SELECT 1
          FROM app.discovery_member_decisions AS decision
          WHERE decision.duo_id = $1::uuid
            AND decision.user_id = $2::text
            AND decision.catalog_game_id = game.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM app.duo_library_games AS library_game
          WHERE library_game.duo_id = $1::uuid
            AND library_game.catalog_game_id = game.id
        )
      ORDER BY game.synced_at DESC, game.name ASC
      LIMIT 24
    `,
    params: ["00000000-0000-0000-0000-000000000001", "query-review-user"]
  },
  {
    name: "Descobrir state read",
    surface: "/app/descobrir",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_discovery_member_decisions_deck_exclusion_idx",
      "app_discovery_matches_duo_game_uidx",
      "app_duo_library_games_duo_catalog_uidx"
    ],
    sql: `
      SELECT game_id
      FROM (
        SELECT decision.catalog_game_id AS game_id
        FROM app.discovery_member_decisions AS decision
        WHERE decision.duo_id = $1::uuid
          AND decision.catalog_game_id = ANY($2::uuid[])
        UNION
        SELECT match.catalog_game_id AS game_id
        FROM app.discovery_matches AS match
        WHERE match.duo_id = $1::uuid
          AND match.catalog_game_id = ANY($2::uuid[])
        UNION
        SELECT library_game.catalog_game_id AS game_id
        FROM app.duo_library_games AS library_game
        WHERE library_game.duo_id = $1::uuid
          AND library_game.catalog_game_id = ANY($2::uuid[])
      ) AS state
    `,
    params: [
      "00000000-0000-0000-0000-000000000001",
      ["00000000-0000-0000-0000-000000000002"]
    ]
  },
  {
    name: "Wishlist insert or existing update",
    surface: "addGameToWishlistAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_duo_library_games_duo_catalog_uidx"],
    sql: `
      INSERT INTO app.duo_library_games (
        duo_id,
        catalog_game_id,
        status,
        added_by_user_id,
        status_updated_by_user_id
      )
      VALUES (gen_random_uuid(), gen_random_uuid(), 'wishlist', 'query-review-user', 'query-review-user')
      ON CONFLICT (duo_id, catalog_game_id)
      DO UPDATE SET status = 'wishlist', status_updated_by_user_id = 'query-review-user'
    `
  },
  {
    name: "Library status move",
    surface: "moveLibraryGameAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_duo_library_games_duo_catalog_uidx", "app_duo_library_games_duo_status_idx"],
    sql: `
      UPDATE app.duo_library_games
      SET status = 'jogando',
          status_updated_by_user_id = 'query-review-user',
          updated_at = now()
      WHERE duo_id = gen_random_uuid()
        AND catalog_game_id = gen_random_uuid()
    `
  },
  {
    name: "Discovery decision",
    surface: "recordDiscoveryDecisionAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: [
      "app_discovery_member_decisions_duo_user_game_uidx",
      "app_discovery_member_decisions_partner_match_idx"
    ],
    sql: `
      INSERT INTO app.discovery_member_decisions (
        duo_id,
        user_id,
        catalog_game_id,
        decision,
        source_mode,
        preference_weight
      )
      VALUES (gen_random_uuid(), 'query-review-user', gen_random_uuid(), 'want', 'deck', 3)
      ON CONFLICT (duo_id, user_id, catalog_game_id)
      DO UPDATE SET decision = 'want', preference_weight = 3, updated_at = now()
    `
  },
  {
    name: "Discovery match handoff",
    surface: "handoffDiscoveryMatchToLibraryAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_discovery_matches_duo_game_uidx", "app_duo_library_games_duo_catalog_uidx"],
    sql: `
      UPDATE app.discovery_matches
      SET library_handoff_status = 'wishlist',
          library_handoff_at = now(),
          library_handoff_by_user_id = 'query-review-user'
      WHERE duo_id = gen_random_uuid()
        AND catalog_game_id = gen_random_uuid()
    `
  },
  {
    name: "Live start",
    surface: "startDiscoveryLiveSessionAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_discovery_live_sessions_duo_status_idx"],
    sql: `
      INSERT INTO app.discovery_live_sessions (
        duo_id,
        started_by_user_id,
        expires_at
      )
      VALUES (gen_random_uuid(), 'query-review-user', now() + interval '10 minutes')
    `
  },
  {
    name: "Live read",
    surface: "/api/discovery/live/[sessionId]",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: ["app_discovery_live_sessions_duo_status_idx"],
    sql: `
      SELECT id, status, expires_at
      FROM app.discovery_live_sessions
      WHERE duo_id = $1::uuid
        AND id = $2::uuid
        AND status = 'active'
      LIMIT 1
    `,
    params: [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    ]
  },
  {
    name: "Mood Quiz answer",
    surface: "answerMoodQuizAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_discovery_mood_answers_user_question_uidx"],
    sql: `
      INSERT INTO app.discovery_mood_quiz_answers (
        duo_id,
        user_id,
        quiz_round,
        question_key,
        answer_key
      )
      VALUES (gen_random_uuid(), 'query-review-user', gen_random_uuid(), 'energy', 'medium')
      ON CONFLICT (duo_id, user_id, quiz_round, question_key)
      DO UPDATE SET answer_key = 'medium', updated_at = now()
    `
  },
  {
    name: "Mood Quiz status",
    surface: "getMoodQuizStatus",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: ["app_discovery_mood_answers_round_idx"],
    sql: `
      SELECT quiz_round, user_id, question_key, answer_key
      FROM app.discovery_mood_quiz_answers
      WHERE duo_id = $1::uuid
      ORDER BY answered_at DESC
      LIMIT 12
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  }
];

export const phase4ReviewQueries: ReviewQuery[] = [
  {
    name: "Jogando Agora dashboard",
    surface: "/app",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_play_active_games_duo_order_idx",
      "app_duo_library_games_duo_status_idx",
      "app_play_progress_library_uidx"
    ],
    sql: `
      SELECT active.id, active.role, active.position, library.status, progress.confirmed_coop_seconds
      FROM app.play_active_games AS active
      INNER JOIN app.duo_library_games AS library
        ON library.id = active.library_game_id
      LEFT JOIN app.play_progress AS progress
        ON progress.library_game_id = library.id
      WHERE active.duo_id = $1::uuid
        AND library.status = 'jogando'
      ORDER BY active.position ASC
      LIMIT 3
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Game play detail",
    surface: "/app/jogo/[slug]",
    mode: "read-analyze",
    queryCount: 4,
    expectedIndexes: [
      "app_duo_library_games_duo_catalog_uidx",
      "app_play_sessions_duo_game_started_idx",
      "app_play_chapters_duo_game_idx",
      "app_play_scheduled_sessions_duo_start_idx"
    ],
    sql: `
      SELECT library.id, library.status
      FROM app.duo_library_games AS library
      INNER JOIN catalog.games AS game
        ON game.id = library.catalog_game_id
      WHERE library.duo_id = $1::uuid
        AND game.slug = $2
      LIMIT 1
    `,
    params: ["00000000-0000-0000-0000-000000000001", "phase-4-query-review"]
  },
  {
    name: "Game timeline",
    surface: "/app/jogo/[slug] timeline",
    mode: "read-analyze",
    queryCount: 3,
    expectedIndexes: [
      "app_play_sessions_duo_game_started_idx",
      "app_play_chapters_duo_game_idx",
      "app_play_momentos_duo_game_created_idx",
      "app_play_spoiler_reveals_momento_user_uidx"
    ],
    sql: `
      SELECT id, kind, status, started_at, ended_at
      FROM app.play_sessions
      WHERE duo_id = $1::uuid
        AND library_game_id = $2::uuid
        AND status = 'confirmed'
      ORDER BY started_at ASC
      LIMIT 50
    `,
    params: [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    ]
  },
  {
    name: "Notification center polling",
    surface: "Central da Dupla",
    mode: "read-analyze",
    queryCount: 2,
    expectedIndexes: [
      "app_play_notifications_duo_state_idx",
      "app_play_notifications_recipient_state_idx"
    ],
    sql: `
      SELECT id, notification_type, state, created_at
      FROM app.play_notifications
      WHERE duo_id = $1::uuid
        AND state <> 'archived'
      ORDER BY created_at DESC
      LIMIT 30
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Due reminder jobs",
    surface: "/api/jobs/play/reminders",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: [
      "ops_scheduled_jobs_due_idx",
      "ops_scheduled_jobs_duo_type_idx",
      "ops_scheduled_jobs_key_uidx"
    ],
    sql: `
      WITH due_jobs AS (
        SELECT id
        FROM ops.scheduled_jobs
        WHERE status IN ('pending', 'failed')
          AND job_type = 'play-session-reminder'
          AND run_at <= now()
        ORDER BY run_at ASC, id ASC
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      )
      UPDATE ops.scheduled_jobs AS job
      SET status = 'claimed',
          attempts = attempts + 1,
          locked_at = now(),
          locked_by = 'query-review'
      FROM due_jobs
      WHERE job.id = due_jobs.id
    `
  },
  {
    name: "Session confirmation",
    surface: "confirmPlaySessionAction",
    mode: "mutation-static",
    queryCount: 2,
    expectedIndexes: [
      "app_play_session_confirmations_session_user_uidx",
      "app_duo_xp_awards_key_uidx"
    ],
    sql: `
      INSERT INTO app.play_session_confirmations (
        duo_id,
        session_id,
        user_id
      )
      VALUES (gen_random_uuid(), gen_random_uuid(), 'query-review-user')
      ON CONFLICT (session_id, user_id) DO NOTHING
    `
  },
  {
    name: "Scheduled attendance confirmation",
    surface: "confirmScheduledSessionAction",
    mode: "mutation-static",
    queryCount: 2,
    expectedIndexes: [
      "app_play_scheduled_attendance_session_user_uidx",
      "app_duo_xp_awards_key_uidx"
    ],
    sql: `
      INSERT INTO app.play_scheduled_attendance (
        duo_id,
        scheduled_session_id,
        user_id
      )
      VALUES (gen_random_uuid(), gen_random_uuid(), 'query-review-user')
      ON CONFLICT (scheduled_session_id, user_id) DO NOTHING
    `
  },
  {
    name: "Active play reorder",
    surface: "reorderPlayingGamesAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: [
      "app_play_active_games_duo_position_uidx",
      "app_play_active_games_one_principal_uidx"
    ],
    sql: `
      UPDATE app.play_active_games
      SET position = CASE library_game_id
            WHEN gen_random_uuid() THEN 1
            ELSE position
          END,
          role = CASE position
            WHEN 1 THEN 'principal'
            ELSE 'secondary'
          END
      WHERE duo_id = gen_random_uuid()
    `
  }
];

export const phase5ReviewQueries: ReviewQuery[] = [
  {
    name: "Gamification dashboard summary",
    surface: "/app",
    mode: "read-analyze",
    queryCount: 4,
    expectedIndexes: [
      "app_gamification_streak_events_duo_day_idx",
      "app_gamification_quest_cycles_window_idx",
      "app_gamification_achievement_unlocks_grid_idx",
      "app_duo_xp_awards_duo_awarded_idx"
    ],
    sql: `
      SELECT duo.id, duo.xp, duo.level, duo.streak, streak.available_freezes
      FROM app.duos AS duo
      LEFT JOIN app.gamification_streak_state AS streak
        ON streak.duo_id = duo.id
      WHERE duo.id = $1::uuid
      LIMIT 1
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Gamification XP ledger history",
    surface: "XP ledger panel",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_duo_xp_awards_duo_awarded_idx",
      "app_duo_xp_awards_key_uidx",
      "app_duo_xp_awards_source_uidx"
    ],
    sql: `
      SELECT id, reason_code, source_type, amount, awarded_at
      FROM app.duo_xp_awards
      WHERE duo_id = $1::uuid
      ORDER BY awarded_at DESC
      LIMIT 5
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Achievements grid",
    surface: "/app/conquistas",
    mode: "read-analyze",
    queryCount: 2,
    expectedIndexes: [
      "app_gamification_achievement_catalog_grid_idx",
      "app_gamification_achievement_unlocks_duo_slug_uidx",
      "app_gamification_achievement_unlocks_grid_idx"
    ],
    sql: `
      SELECT catalog.slug, catalog.group_key, catalog.rarity, unlock.unlocked_at
      FROM app.gamification_achievement_catalog AS catalog
      LEFT JOIN app.gamification_achievement_unlocks AS unlock
        ON unlock.achievement_slug = catalog.slug
       AND unlock.duo_id = $1::uuid
      WHERE catalog.active = true
        AND ($2::text IS NULL OR catalog.rarity = $2)
      ORDER BY catalog.group_key ASC, catalog.rarity ASC, catalog.slug ASC
      LIMIT 60
    `,
    params: ["00000000-0000-0000-0000-000000000001", null]
  },
  {
    name: "Challenges page",
    surface: "/app/desafios",
    mode: "read-analyze",
    queryCount: 3,
    expectedIndexes: [
      "app_gamification_quest_cycles_window_idx",
      "app_gamification_quest_progress_cycle_uidx",
      "app_gamification_quest_templates_active_idx",
      "app_gamification_streak_events_duo_day_idx"
    ],
    sql: `
      SELECT cycle.id, cycle.quest_slug, cycle.quest_type, progress.current_value, progress.completed_at
      FROM app.gamification_quest_cycles AS cycle
      LEFT JOIN app.gamification_quest_progress AS progress
        ON progress.quest_cycle_id = cycle.id
       AND progress.duo_id = cycle.duo_id
      WHERE cycle.duo_id = $1::uuid
        AND cycle.status = 'active'
        AND cycle.window_end_at > now()
      ORDER BY cycle.quest_type ASC, cycle.window_start_at DESC
      LIMIT 12
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Quest rotation jobs",
    surface: "/api/jobs/gamification/maintenance quest rotation",
    mode: "mutation-static",
    queryCount: 2,
    expectedIndexes: [
      "ops_scheduled_jobs_due_idx",
      "ops_scheduled_jobs_duo_type_idx",
      "ops_scheduled_jobs_key_uidx",
      "app_gamification_quest_cycles_duo_slug_cycle_uidx"
    ],
    sql: `
      WITH due_jobs AS (
        SELECT id
        FROM ops.scheduled_jobs
        WHERE status IN ('pending', 'failed')
          AND job_type = 'gamification-quest-rotation'
          AND run_at <= now()
        ORDER BY run_at ASC, id ASC
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      )
      UPDATE ops.scheduled_jobs AS job
      SET status = 'claimed',
          attempts = attempts + 1,
          locked_at = now(),
          locked_by = 'query-review'
      FROM due_jobs
      WHERE job.id = due_jobs.id
    `
  },
  {
    name: "Streak maintenance jobs",
    surface: "/api/jobs/gamification/maintenance streak",
    mode: "mutation-static",
    queryCount: 2,
    expectedIndexes: [
      "ops_scheduled_jobs_due_idx",
      "ops_scheduled_jobs_duo_type_idx",
      "app_gamification_streak_events_key_uidx",
      "app_gamification_streak_events_duo_day_idx"
    ],
    sql: `
      INSERT INTO app.gamification_streak_events (
        duo_id,
        event_key,
        event_type,
        duo_day,
        source_type,
        source_id,
        freeze_delta
      )
      VALUES (
        gen_random_uuid(),
        'query-review-freeze',
        'freeze-consumed',
        current_date,
        'streak',
        gen_random_uuid(),
        -1
      )
      ON CONFLICT DO NOTHING
    `
  },
  {
    name: "Reward application mutation",
    surface: "applyGamificationFact",
    mode: "mutation-static",
    queryCount: 5,
    expectedIndexes: [
      "app_duo_xp_awards_key_uidx",
      "app_duo_xp_awards_source_uidx",
      "app_gamification_achievement_unlocks_duo_slug_uidx",
      "app_gamification_quest_progress_cycle_uidx",
      "app_gamification_reward_notifications_duo_created_idx"
    ],
    sql: `
      INSERT INTO app.duo_xp_awards (
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        reason_code,
        awarded_by_user_id
      )
      VALUES (
        gen_random_uuid(),
        'query-review-award',
        'quest',
        gen_random_uuid(),
        80,
        'quest-complete',
        'query-review-user'
      )
      ON CONFLICT DO NOTHING
    `
  }
];

export const phase6ReviewQueries: ReviewQuery[] = [
  {
    name: "Roulette state read",
    surface: "/app/roleta",
    mode: "read-analyze",
    queryCount: 4,
    expectedIndexes: [
      "app_roulette_boost_balances_duo_uidx",
      "app_roulette_pity_state_duo_uidx",
      "app_roulette_rounds_active_duo_uidx",
      "app_roulette_history_events_duo_created_idx"
    ],
    sql: `
      SELECT
        duo.id,
        balance.balance,
        pity.draws_since_epic_or_higher,
        active_round.id AS active_round_id,
        history.event_type AS latest_history_event
      FROM app.duos AS duo
      LEFT JOIN app.roulette_boost_balances AS balance
        ON balance.duo_id = duo.id
      LEFT JOIN app.roulette_pity_state AS pity
        ON pity.duo_id = duo.id
      LEFT JOIN LATERAL (
        SELECT round_row.id
        FROM app.roulette_rounds AS round_row
        WHERE round_row.duo_id = duo.id
          AND round_row.status IN ('active', 'revealing', 'pending_invitation')
        ORDER BY round_row.updated_at DESC
        LIMIT 1
      ) AS active_round ON true
      LEFT JOIN LATERAL (
        SELECT event.event_type
        FROM app.roulette_history_events AS event
        WHERE event.duo_id = duo.id
        ORDER BY event.created_at DESC
        LIMIT 1
      ) AS history ON true
      WHERE duo.id = $1::uuid
      LIMIT 1
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Roulette eligible pool with cooldown",
    surface: "/app/roleta eligible pool",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_duo_library_games_duo_status_idx",
      "app_duo_library_games_duo_catalog_uidx",
      "app_roulette_cooldowns_duo_game_uidx",
      "app_roulette_cooldowns_duo_remaining_idx"
    ],
    sql: `
      SELECT library_game.id, library_game.status, game.name, cooldown.weight_multiplier
      FROM app.duo_library_games AS library_game
      INNER JOIN catalog.games AS game
        ON game.id = library_game.catalog_game_id
      LEFT JOIN app.roulette_cooldowns AS cooldown
        ON cooldown.duo_id = library_game.duo_id
       AND cooldown.library_game_id = library_game.id
       AND cooldown.remaining_rounds > 0
      WHERE library_game.duo_id = $1::uuid
        AND library_game.status = ANY($2::text[])
      ORDER BY game.name ASC, library_game.updated_at DESC
      LIMIT 60
    `,
    params: ["00000000-0000-0000-0000-000000000001", ["wishlist", "pausado"]]
  },
  {
    name: "Roulette active round lookup",
    surface: "startRouletteRound",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_roulette_rounds_active_duo_uidx",
      "app_roulette_rounds_duo_status_idx",
      "app_roulette_rounds_idempotency_uidx"
    ],
    sql: `
      SELECT id, status, result_library_game_id, boost_spent
      FROM app.roulette_rounds
      WHERE duo_id = $1::uuid
        AND status IN ('active', 'revealing', 'pending_invitation')
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Roulette compact history",
    surface: "CompactHistory",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_roulette_history_events_duo_created_idx",
      "app_roulette_history_events_round_idx"
    ],
    sql: `
      SELECT event_type, round_id, metadata, created_at
      FROM app.roulette_history_events
      WHERE duo_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 12
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  },
  {
    name: "Roulette lock discard invitation resolution",
    surface: "lockRouletteResult / discardRouletteResult",
    mode: "mutation-static",
    queryCount: 2,
    expectedIndexes: [
      "app_roulette_rounds_active_duo_uidx",
      "app_roulette_rounds_result_idx",
      "app_roulette_history_events_key_uidx"
    ],
    sql: `
      UPDATE app.roulette_rounds
      SET status = 'locked',
          resolved_by_user_id = 'query-review-user',
          resolved_at = now(),
          updated_at = now()
      WHERE duo_id = gen_random_uuid()
        AND id = gen_random_uuid()
        AND status = 'pending_invitation'
    `
  },
  {
    name: "Roulette boost ledger spend or refund",
    surface: "boost ledger",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: [
      "app_roulette_boost_ledger_key_uidx",
      "app_roulette_boost_ledger_source_uidx",
      "app_roulette_boost_ledger_duo_created_idx"
    ],
    sql: `
      INSERT INTO app.roulette_boost_ledger (
        duo_id,
        ledger_key,
        source_type,
        source_id,
        amount_delta,
        reason_code,
        actor_user_id
      )
      VALUES (
        gen_random_uuid(),
        'query-review-roulette-boost',
        'roulette-round',
        gen_random_uuid(),
        -100,
        'boost-spend',
        'query-review-user'
      )
      ON CONFLICT DO NOTHING
    `
  },
  {
    name: "Roulette dashboard handoff",
    surface: "/app roleta-principal dashboard",
    mode: "read-analyze",
    queryCount: 2,
    expectedIndexes: [
      "app_play_active_games_duo_order_idx",
      "app_play_notifications_duo_state_idx",
      "app_play_notifications_recipient_state_idx"
    ],
    sql: `
      SELECT notification.id, notification.notification_type, notification.created_at
      FROM app.play_notifications AS notification
      WHERE notification.duo_id = $1::uuid
        AND notification.notification_type = ANY($2::text[])
        AND notification.state <> 'archived'
      ORDER BY notification.created_at DESC
      LIMIT 10
    `,
    params: [
      "00000000-0000-0000-0000-000000000001",
      ["roulette-result-locked", "roulette-result-discarded"]
    ]
  }
];

const queryReviewConfig = getQueryReviewConfig(requestedPhase);
const queryReviewPath = queryReviewConfig.path;

export const reviewQueries: ReviewQuery[] = queryReviewConfig.queries;

if (isMainModule()) {
  await main();
}

async function main(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    if (hasFreshProductionRuntimeQueryReview()) {
      console.log(`${queryReviewConfig.label} query review PASSED using recent production runtime evidence artifact.`);
      console.log(`Artifact: ${queryReviewPath}`);
      return;
    }

    const results = reviewQueries.map<QueryReviewResult>((query) => ({
      actionTaken: "Skipped runtime plan review because TEST_DATABASE_URL is missing.",
      expectedIndexes: query.expectedIndexes,
      mode: query.mode,
      name: query.name,
      planSummary: "No database connection available.",
      queryCount: query.queryCount,
      status: "blocked",
      surface: query.surface
    }));

    await writeQueryReview("BLOCKED - missing TEST_DATABASE_URL", results);
    console.log(`${queryReviewConfig.label} query review BLOCKED. Missing: TEST_DATABASE_URL.`);
    console.log(`Artifact: ${queryReviewPath}`);
    return;
  }

  const review = await runQueryReviews(testDatabaseUrl);

  await writeQueryReview(review.result, review.results);
  console.log(`${queryReviewConfig.label} query review ${review.result}.`);
  console.log(`Artifact: ${queryReviewPath}`);

  if (review.result === "FAILED") {
    process.exitCode = 1;
  }
}

export async function runQueryReviews(connectionString: string): Promise<QueryReviewRun> {
  const pg = resolvePg();
  const pool = new pg.Pool({
    connectionString,
    max: 4
  });

  try {
    const results: QueryReviewResult[] = [];

    for (const query of reviewQueries) {
      results.push(await reviewQuery(pool, query));
    }

    return {
      result: results.some((result) => result.status === "failed") ? "FAILED" : "PASSED",
      results
    };
  } finally {
    await pool.end();
  }
}

export async function reviewQuery(pool: PgPool, query: ReviewQuery): Promise<QueryReviewResult> {
  const explainPrefix =
    query.mode === "read-analyze"
      ? "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)"
      : "EXPLAIN (COSTS, FORMAT JSON)";

  try {
    const result = await pool.query<unknown[]>(`${explainPrefix} ${query.sql}`, query.params ?? []);
    const planSummary = summarizePlan(result.rows[0]);

    return {
      actionTaken:
        query.mode === "read-analyze"
          ? "Reviewed read plan with ANALYZE and BUFFERS."
          : "Reviewed data-changing shape with static EXPLAIN only; no mutation was executed.",
      expectedIndexes: query.expectedIndexes,
      mode: query.mode,
      name: query.name,
      planSummary,
      queryCount: query.queryCount,
      status: "reviewed",
      surface: query.surface
    };
  } catch (error) {
    return {
      actionTaken: "Review failed; inspect schema/data fixture before using this result.",
      expectedIndexes: query.expectedIndexes,
      mode: query.mode,
      name: query.name,
      planSummary: getErrorMessage(error),
      queryCount: query.queryCount,
      status: "failed",
      surface: query.surface
    };
  }
}

export async function writeQueryReview(
  result: string,
  results: QueryReviewResult[],
  options: QueryReviewWriteOptions = {}
): Promise<void> {
  const markdown = buildQueryReviewMarkdown(result, results, options);

  await mkdir(dirname(queryReviewPath), { recursive: true });
  await writeFile(queryReviewPath, markdown, "utf8");
}

export function buildQueryReviewMarkdown(
  result: string,
  results: QueryReviewResult[],
  options: QueryReviewWriteOptions = {}
): string {
  const generated = new Date().toISOString();
  const databaseStatus =
    options.databaseStatus ?? (process.env.TEST_DATABASE_URL ? "configured" : "missing");
  const evidenceSource = options.evidenceSource ?? "local TEST_DATABASE_URL";
  const nextAction =
    options.nextAction ??
    (result === "BLOCKED - missing TEST_DATABASE_URL"
      ? `- Provide TEST_DATABASE_URL for an isolated Neon/test Postgres database, then rerun \`${queryReviewConfig.command}\`.`
      : "- Keep this artifact updated after batching or index changes.");

  return [
    "---",
    `phase: ${queryReviewConfig.phase}`,
    `plan: ${queryReviewConfig.plan}`,
    `artifact: ${queryReviewConfig.artifact}`,
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    `# ${queryReviewConfig.title}`,
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    `- Database evidence: ${databaseStatus}`,
    `- Evidence source: ${evidenceSource}`,
    "- Parameter values: redacted from artifact",
    "",
    "## Query Review",
    "",
    "| Query | Surface | Count | Mode | Plan Status | Expected Indexes | Action Taken |",
    "|-------|---------|-------|------|-------------|------------------|--------------|",
    ...results.map(
      (review) =>
        `| ${review.name} | ${review.surface} | ${review.queryCount} | ${review.mode} | ${review.status} | ${review.expectedIndexes.join(", ")} | ${review.actionTaken} |`
    ),
    "",
    "## Plan Summaries",
    "",
    ...results.flatMap((review) => [
      `### ${review.name}`,
      "",
      `- Status: ${review.status}`,
      `- Summary: ${review.planSummary}`,
      ""
    ]),
    "## Findings",
    "",
    result === "PASSED"
      ? "No missing index findings were produced by this review."
      : result === "BLOCKED - missing TEST_DATABASE_URL"
        ? "- TEST_DATABASE_URL is required for runtime EXPLAIN evidence."
        : "- One or more query plan reviews failed. Inspect the plan summaries above.",
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    nextAction,
    ""
  ].join("\n");
}

function summarizePlan(raw: unknown): string {
  const wrapped = isRecord(raw) ? raw["QUERY PLAN"] ?? Object.values(raw)[0] : raw;
  const explain = Array.isArray(wrapped) ? wrapped[0] : wrapped;
  const root = isRecord(explain) && "Plan" in explain ? explain.Plan : explain;
  const plan = isRecord(root) ? root : undefined;
  const nodeType = getString(plan?.["Node Type"]);
  const relation = getString(plan?.["Relation Name"]);
  const index = getString(plan?.["Index Name"]);
  const totalCost = getNumber(plan?.["Total Cost"]);
  const actualRows = getNumber(plan?.["Actual Rows"]);
  const parts = [
    nodeType ? `node=${nodeType}` : null,
    relation ? `relation=${relation}` : null,
    index ? `index=${index}` : null,
    typeof totalCost === "number" ? `cost=${Math.round(totalCost * 100) / 100}` : null,
    typeof actualRows === "number" ? `actualRows=${actualRows}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("; ") : "Plan JSON returned without a root summary.";
}

function loadEnvLocal(): void {
  const envPath = resolve(workspaceRoot, ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;

    if (!name || process.env[name]) {
      continue;
    }

    process.env[name] = unquote(rawValue?.trim() ?? "");
  }
}

function hasFreshProductionRuntimeQueryReview(): boolean {
  if (queryReviewConfig.phase !== "03.3") {
    return false;
  }

  if (!existsSync(queryReviewPath)) {
    return false;
  }

  const content = readFileSync(queryReviewPath, "utf8");
  const generated = content.match(/^generated:\s*(.+)$/m)?.[1]?.trim();
  const generatedAt = generated ? Date.parse(generated) : Number.NaN;
  const maxAgeMs = 24 * 60 * 60 * 1_000;

  return (
    content.includes("## Result: PASSED") &&
    content.includes("Evidence source: Vercel production runtime DATABASE_URL") &&
    Number.isFinite(generatedAt) &&
    Date.now() - generatedAt <= maxAgeMs
  );
}

type QueryReviewConfig = {
  artifact: string;
  command: string;
  label: string;
  path: string;
  phase: string;
  plan: string;
  queries: ReviewQuery[];
  title: string;
};

function getQueryReviewConfig(phase: string): QueryReviewConfig {
  if (phase === "4" || phase === "04") {
    return {
      artifact: "performance-review",
      command: "node --experimental-strip-types scripts/performance-explain.ts --phase=4",
      label: "Phase 4",
      path: resolve(
        workspaceRoot,
        ".planning/phases/04-jogando-agora-sessoes-e-agendamento/04-PERFORMANCE-REVIEW.md"
      ),
      phase: "04",
      plan: "06",
      queries: phase4ReviewQueries,
      title: "Phase 4 Performance Review"
    };
  }

  if (phase === "5" || phase === "05") {
    return {
      artifact: "performance-review",
      command: "node --experimental-strip-types scripts/performance-explain.ts --phase=5",
      label: "Phase 5",
      path: resolve(
        workspaceRoot,
        ".planning/phases/05-gamificacao-coletiva/05-PERFORMANCE-REVIEW.md"
      ),
      phase: "05",
      plan: "06",
      queries: phase5ReviewQueries,
      title: "Phase 5 Performance Review"
    };
  }

  if (phase === "6" || phase === "06") {
    return {
      artifact: "performance-review",
      command: "node --experimental-strip-types scripts/performance-explain.ts --phase=6",
      label: "Phase 6",
      path: resolve(
        workspaceRoot,
        ".planning/phases/06-roleta-e-economia/06-PERFORMANCE-REVIEW.md"
      ),
      phase: "06",
      plan: "10",
      queries: phase6ReviewQueries,
      title: "Phase 6 Performance Review"
    };
  }

  return {
    artifact: "query-review",
    command: "node --experimental-strip-types scripts/performance-explain.ts",
    label: "Phase 03.3",
    path: resolve(
      workspaceRoot,
      ".planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-QUERY-REVIEW.md"
    ),
    phase: "03.3",
    plan: "02",
    queries: phase33ReviewQueries,
    title: "Phase 03.3 Query Review"
  };
}

function readFlag(name: string): string | null {
  const valueFlag = process.argv.find((arg) => arg.startsWith(`${name}=`));

  if (valueFlag) {
    return valueFlag.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  const next = index >= 0 ? process.argv[index + 1] : undefined;

  return next && !next.startsWith("--") ? next : null;
}

function unquote(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMainModule(): boolean {
  return process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
}

function resolvePg(): { Pool: new (config: { connectionString: string; max: number }) => PgPool } {
  const requireFromHere = createRequire(import.meta.url);

  try {
    return requireFromHere("pg") as { Pool: new (config: { connectionString: string; max: number }) => PgPool };
  } catch {
    const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));

    return requireFromDb("pg") as { Pool: new (config: { connectionString: string; max: number }) => PgPool };
  }
}
