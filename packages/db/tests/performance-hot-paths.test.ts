import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(`${missingTestDatabaseMessage} Phase 03.3 query review remains BLOCKED.`);
}

describe.skipIf(!testDatabaseUrl)("performance hot path indexes", () => {
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

  test("catalog, library and discovery hot query indexes remain present", async () => {
    const expectedIndexes = [
      "app_discovery_live_sessions_duo_status_idx",
      "app_discovery_live_sessions_expiry_idx",
      "app_discovery_matches_duo_game_uidx",
      "app_discovery_matches_history_idx",
      "app_discovery_member_decisions_cooldown_idx",
      "app_discovery_member_decisions_deck_exclusion_idx",
      "app_discovery_member_decisions_duo_user_game_uidx",
      "app_discovery_member_decisions_partner_match_idx",
      "app_discovery_mood_answers_round_idx",
      "app_discovery_mood_answers_user_question_uidx",
      "app_duo_library_games_catalog_idx",
      "app_duo_library_games_duo_catalog_uidx",
      "app_duo_library_games_duo_status_idx",
      "app_duo_xp_awards_duo_awarded_idx",
      "app_duo_xp_awards_key_uidx",
      "app_duo_xp_awards_source_uidx",
      "app_gamification_achievement_catalog_grid_idx",
      "app_gamification_achievement_unlocks_duo_slug_uidx",
      "app_gamification_achievement_unlocks_grid_idx",
      "app_gamification_achievement_unlocks_source_uidx",
      "app_gamification_adjustments_duo_created_idx",
      "app_gamification_adjustments_key_uidx",
      "app_gamification_quest_cycles_duo_slug_cycle_uidx",
      "app_gamification_quest_cycles_window_idx",
      "app_gamification_quest_progress_cycle_uidx",
      "app_gamification_quest_progress_duo_updated_idx",
      "app_gamification_quest_progress_reward_uidx",
      "app_gamification_quest_templates_active_idx",
      "app_gamification_reward_notifications_action_idx",
      "app_gamification_reward_notifications_duo_created_idx",
      "app_gamification_reward_notifications_recipient_idx",
      "app_gamification_streak_events_duo_day_idx",
      "app_gamification_streak_events_key_uidx",
      "app_gamification_streak_events_source_uidx",
      "app_member_platforms_duo_platform_idx",
      "app_play_active_games_duo_order_idx",
      "app_play_active_games_duo_position_uidx",
      "app_play_active_games_library_uidx",
      "app_play_active_games_one_principal_uidx",
      "app_play_chapters_duo_game_idx",
      "app_play_chapters_library_position_uidx",
      "app_play_momentos_duo_game_created_idx",
      "app_play_momentos_session_idx",
      "app_play_notifications_action_idx",
      "app_play_notifications_duo_state_idx",
      "app_play_notifications_recipient_state_idx",
      "app_play_progress_duo_idx",
      "app_play_progress_library_uidx",
      "app_play_scheduled_attendance_duo_session_idx",
      "app_play_scheduled_attendance_session_user_uidx",
      "app_play_scheduled_sessions_duo_start_idx",
      "app_play_scheduled_sessions_reminder_due_idx",
      "app_play_session_confirmations_duo_session_idx",
      "app_play_session_confirmations_session_user_uidx",
      "app_play_sessions_duo_game_started_idx",
      "app_play_sessions_one_active_live_uidx",
      "app_play_sessions_pending_idx",
      "app_play_spoiler_reveals_duo_user_idx",
      "app_play_spoiler_reveals_momento_user_uidx",
      "app_play_terminal_requests_duo_status_idx",
      "app_play_terminal_requests_one_pending_uidx",
      "app_push_subscriptions_endpoint_uidx",
      "app_push_subscriptions_user_enabled_idx",
      "catalog_game_availability_game_type_platform_uidx",
      "catalog_game_genres_game_slug_uidx",
      "catalog_game_localizations_published_lookup_idx",
      "catalog_game_platforms_game_platform_uidx",
      "catalog_game_platforms_platform_idx",
      "catalog_game_time_estimates_game_kind_uidx",
      "catalog_games_main_flow_idx",
      "catalog_games_slug_uidx",
      "ops_scheduled_jobs_due_idx",
      "ops_scheduled_jobs_duo_type_idx",
      "ops_scheduled_jobs_key_uidx",
      "ops_gamification_projection_rebuilds_duo_started_idx",
      "ops_gamification_projection_rebuilds_key_uidx",
      "ops_gamification_projection_rebuilds_status_idx"
    ].sort();

    const indexState = await pool.query<{ indexname: string }>(
      `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname IN ('app', 'catalog', 'ops')
          AND indexname = ANY($1::text[])
        ORDER BY indexname
      `,
      [expectedIndexes]
    );
    const foundIndexes = indexState.rows.map((row) => row.indexname).sort();
    const missingIndexes = expectedIndexes.filter((indexName) => !foundIndexes.includes(indexName));

    expect(missingIndexes, `Missing hot-path indexes: ${missingIndexes.join(", ")}`).toEqual([]);
  });
});
