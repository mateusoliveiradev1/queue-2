import type pg from "pg";

import {
  applyFoundationMigration,
  createIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("catalog source schema", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
    await applyFoundationMigration(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("creates sourced catalog tables with ownership comments and required columns", async () => {
    const result = await pool.query<{ object_name: string; exists: boolean }>(`
      SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists
      FROM (VALUES
        ('catalog.games'),
        ('catalog.game_platforms'),
        ('catalog.game_genres'),
        ('catalog.game_time_estimates'),
        ('catalog.game_availability')
      ) AS expected(object_name)
    `);

    expect(result.rows.every((row) => row.exists)).toBe(true);

    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'catalog'
        AND table_name = 'games'
        AND column_name IN (
          'rawg_id',
          'slug',
          'name',
          'description',
          'released_at',
          'background_image_url',
          'rawg_url',
          'source',
          'source_url',
          'source_updated_at',
          'synced_at',
          'coop_campaign_confirmed',
          'coop_player_count_min',
          'coop_player_count_max',
          'main_flow_eligible'
        )
    `);

    expect(columns.rows).toHaveLength(15);

    const comment = await pool.query<{ table_comment: string | null }>(`
      SELECT obj_description('catalog.games'::regclass, 'pg_class') AS table_comment
    `);

    expect(comment.rows[0]?.table_comment).toContain("Owner module: catalog");
  });

  test("keeps main-flow eligibility explicit and grants runtime read-only access", async () => {
    const constraint = await pool.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'catalog.games'::regclass
        AND conname = 'catalog_games_main_flow_requires_confirmed_coop_chk'
    `);

    expect(constraint.rows).toHaveLength(1);

    const privileges = await pool.query<{
      app_can_select: boolean;
      app_can_insert: boolean;
      app_can_update: boolean;
      worker_can_insert: boolean;
      worker_can_update: boolean;
    }>(`
      SELECT
        has_table_privilege('queue2_app_runtime', 'catalog.games', 'SELECT') AS app_can_select,
        has_table_privilege('queue2_app_runtime', 'catalog.games', 'INSERT') AS app_can_insert,
        has_table_privilege('queue2_app_runtime', 'catalog.games', 'UPDATE') AS app_can_update,
        has_table_privilege('queue2_worker', 'catalog.games', 'INSERT') AS worker_can_insert,
        has_table_privilege('queue2_worker', 'catalog.games', 'UPDATE') AS worker_can_update
    `);

    expect(privileges.rows[0]).toMatchObject({
      app_can_select: true,
      app_can_insert: false,
      app_can_update: false,
      worker_can_insert: true,
      worker_can_update: true
    });
  });
});
