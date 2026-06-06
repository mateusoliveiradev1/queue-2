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

describe.skipIf(!testDatabaseUrl)("gamification migration foundation", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
  });

  afterAll(async () => {
    await pool.end();
  });

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

    expect(result.rows.every((row) => row.exists)).toBe(true);
  });

  test("forces RLS and keeps reviewed gamification indexes", async () => {
    await applyFoundationMigration(pool);

    const tableState = await pool.query<{
      table_name: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT
        namespace.nspname || '.' || class.relname AS table_name,
        class.relrowsecurity,
        class.relforcerowsecurity
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE (namespace.nspname, class.relname) IN (
        ('app', 'gamification_achievement_unlocks'),
        ('app', 'gamification_quest_cycles'),
        ('app', 'gamification_quest_progress'),
        ('app', 'gamification_streak_events'),
        ('app', 'gamification_streak_state'),
        ('app', 'gamification_reward_notifications'),
        ('app', 'gamification_adjustments'),
        ('ops', 'gamification_projection_rebuilds')
      )
      ORDER BY table_name
    `);
    const indexState = await pool.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE (schemaname = 'app' AND indexname IN (
        'app_gamification_achievement_catalog_grid_idx',
        'app_gamification_achievement_unlocks_duo_slug_uidx',
        'app_gamification_achievement_unlocks_source_uidx',
        'app_gamification_achievement_unlocks_grid_idx',
        'app_gamification_quest_templates_active_idx',
        'app_gamification_quest_cycles_duo_slug_cycle_uidx',
        'app_gamification_quest_cycles_window_idx',
        'app_gamification_quest_progress_cycle_uidx',
        'app_gamification_quest_progress_reward_uidx',
        'app_gamification_quest_progress_duo_updated_idx',
        'app_gamification_streak_events_key_uidx',
        'app_gamification_streak_events_source_uidx',
        'app_gamification_streak_events_duo_day_idx',
        'app_gamification_reward_notifications_duo_created_idx',
        'app_gamification_reward_notifications_recipient_idx',
        'app_gamification_reward_notifications_action_idx',
        'app_gamification_adjustments_key_uidx',
        'app_gamification_adjustments_duo_created_idx'
      ))
      OR (schemaname = 'ops' AND indexname IN (
        'ops_gamification_projection_rebuilds_key_uidx',
        'ops_gamification_projection_rebuilds_duo_started_idx',
        'ops_gamification_projection_rebuilds_status_idx'
      ))
      ORDER BY indexname
    `);

    expect(tableState.rows).toHaveLength(8);
    expect(tableState.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
    expect(indexState.rows.map((row) => row.indexname)).toEqual([
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
      "ops_gamification_projection_rebuilds_duo_started_idx",
      "ops_gamification_projection_rebuilds_key_uidx",
      "ops_gamification_projection_rebuilds_status_idx"
    ]);
  });

  test("extends XP ledger source coverage without granting destructive privileges", async () => {
    await applyFoundationMigration(pool);

    const sourceConstraint = await pool.query<{ constraint_def: string }>(`
      SELECT pg_get_constraintdef(constraint_row.oid) AS constraint_def
      FROM pg_constraint AS constraint_row
      JOIN pg_class AS class ON class.oid = constraint_row.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE namespace.nspname = 'app'
        AND class.relname = 'duo_xp_awards'
        AND constraint_row.conname = 'app_duo_xp_awards_source_type_chk'
    `);
    const privileges = await pool.query<{
      table_name: string;
      runtime_can_delete: boolean;
      runtime_can_insert_seed: boolean;
      runtime_can_update_duo_projection: boolean;
      runtime_can_update_rebuilds: boolean;
      worker_can_update_rebuilds: boolean;
    }>(`
      SELECT
        expected.table_name,
        has_table_privilege('queue2_app_runtime', expected.table_name, 'DELETE') AS runtime_can_delete,
        has_table_privilege('queue2_app_runtime', 'app.gamification_achievement_catalog', 'INSERT') AS runtime_can_insert_seed,
        has_column_privilege('queue2_app_runtime', 'app.duos', 'xp', 'UPDATE')
          AND has_column_privilege('queue2_app_runtime', 'app.duos', 'level', 'UPDATE')
          AND has_column_privilege('queue2_app_runtime', 'app.duos', 'streak', 'UPDATE')
          AS runtime_can_update_duo_projection,
        has_table_privilege('queue2_app_runtime', 'ops.gamification_projection_rebuilds', 'UPDATE') AS runtime_can_update_rebuilds,
        has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'status', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'reason_code', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'xp_before', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'xp_after', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'level_before', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'level_after', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'streak_before', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'streak_after', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'metadata', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'finished_at', 'UPDATE')
          AND has_column_privilege('queue2_worker', 'ops.gamification_projection_rebuilds', 'updated_at', 'UPDATE')
          AS worker_can_update_rebuilds
      FROM (VALUES
        ('app.gamification_achievement_unlocks'),
        ('app.gamification_quest_cycles'),
        ('app.gamification_quest_progress'),
        ('app.gamification_streak_events'),
        ('app.gamification_streak_state'),
        ('app.gamification_reward_notifications'),
        ('app.gamification_adjustments'),
        ('ops.gamification_projection_rebuilds')
      ) AS expected(table_name)
    `);

    expect(sourceConstraint.rows[0]?.constraint_def).toContain("quest");
    expect(sourceConstraint.rows[0]?.constraint_def).toContain("achievement");
    expect(sourceConstraint.rows[0]?.constraint_def).toContain("discovery-match");
    expect(privileges.rows.every((row) => row.runtime_can_delete === false)).toBe(true);
    expect(privileges.rows.every((row) => row.runtime_can_insert_seed === false)).toBe(true);
    expect(privileges.rows.every((row) => row.runtime_can_update_duo_projection === true)).toBe(true);
    expect(privileges.rows.every((row) => row.runtime_can_update_rebuilds === false)).toBe(true);
    expect(privileges.rows.every((row) => row.worker_can_update_rebuilds === true)).toBe(true);
  });

  test("security-sensitive gamification tables carry owner and audit comments", async () => {
    await applyFoundationMigration(pool);

    const comments = await pool.query<{ table_name: string; comment: string | null }>(`
      SELECT
        namespace.nspname || '.' || class.relname AS table_name,
        obj_description(class.oid, 'pg_class') AS comment
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE (namespace.nspname, class.relname) IN (
        ('app', 'duo_xp_awards'),
        ('app', 'gamification_achievement_unlocks'),
        ('app', 'gamification_quest_progress'),
        ('app', 'gamification_streak_events'),
        ('app', 'gamification_adjustments'),
        ('ops', 'gamification_projection_rebuilds')
      )
      ORDER BY table_name
    `);

    expect(comments.rows).toEqual([
      expect.objectContaining({
        table_name: "app.duo_xp_awards",
        comment: expect.stringContaining("gamification")
      }),
      expect.objectContaining({
        table_name: "app.gamification_achievement_unlocks",
        comment: expect.stringContaining("duplicate unlocks")
      }),
      expect.objectContaining({
        table_name: "app.gamification_adjustments",
        comment: expect.stringContaining("never erased")
      }),
      expect.objectContaining({
        table_name: "app.gamification_quest_progress",
        comment: expect.stringContaining("duplicate payouts")
      }),
      expect.objectContaining({
        table_name: "app.gamification_streak_events",
        comment: expect.stringContaining("04:00")
      }),
      expect.objectContaining({
        table_name: "ops.gamification_projection_rebuilds",
        comment: expect.stringContaining("reconciliation")
      })
    ]);
  });
});
