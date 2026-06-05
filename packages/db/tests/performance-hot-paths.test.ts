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
      "app_member_platforms_duo_platform_idx",
      "catalog_game_availability_game_type_platform_uidx",
      "catalog_game_genres_game_slug_uidx",
      "catalog_game_localizations_published_lookup_idx",
      "catalog_game_platforms_game_platform_uidx",
      "catalog_game_platforms_platform_idx",
      "catalog_game_time_estimates_game_kind_uidx",
      "catalog_games_main_flow_idx",
      "catalog_games_slug_uidx"
    ].sort();

    const indexState = await pool.query<{ indexname: string }>(
      `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname IN ('app', 'catalog')
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
