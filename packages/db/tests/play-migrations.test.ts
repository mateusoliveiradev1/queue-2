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

describe.skipIf(!testDatabaseUrl)("play migration foundation", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("applies Phase 4 play schema to an empty database and can be rerun", async () => {
    await applyFoundationMigration(pool);
    await applyFoundationMigration(pool);

    const result = await pool.query<{ object_name: string; exists: boolean }>(`
      SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists
      FROM (VALUES
        ('app.play_active_games'),
        ('app.play_sessions'),
        ('app.play_session_confirmations'),
        ('app.play_progress'),
        ('app.play_chapters'),
        ('app.play_momentos'),
        ('app.play_spoiler_reveals'),
        ('app.play_terminal_requests'),
        ('app.play_scheduled_sessions'),
        ('app.play_scheduled_attendance'),
        ('app.play_notifications'),
        ('app.push_subscriptions'),
        ('app.duo_xp_awards'),
        ('ops.scheduled_jobs')
      ) AS expected(object_name)
    `);

    expect(result.rows.every((row) => row.exists)).toBe(true);
  });

  test("forces RLS and keeps reviewed play indexes", async () => {
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
        ('app', 'play_active_games'),
        ('app', 'play_sessions'),
        ('app', 'play_session_confirmations'),
        ('app', 'play_progress'),
        ('app', 'play_chapters'),
        ('app', 'play_momentos'),
        ('app', 'play_spoiler_reveals'),
        ('app', 'play_terminal_requests'),
        ('app', 'play_scheduled_sessions'),
        ('app', 'play_scheduled_attendance'),
        ('app', 'play_notifications'),
        ('app', 'push_subscriptions'),
        ('app', 'duo_xp_awards'),
        ('ops', 'scheduled_jobs')
      )
      ORDER BY table_name
    `);
    const indexState = await pool.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE (schemaname = 'app' AND indexname IN (
        'app_play_active_games_one_principal_uidx',
        'app_play_active_games_duo_position_uidx',
        'app_play_sessions_one_active_live_uidx',
        'app_play_session_confirmations_session_user_uidx',
        'app_play_spoiler_reveals_momento_user_uidx',
        'app_play_terminal_requests_one_pending_uidx',
        'app_play_scheduled_attendance_session_user_uidx',
        'app_duo_xp_awards_key_uidx',
        'app_duo_xp_awards_source_uidx',
        'app_push_subscriptions_endpoint_uidx'
      ))
      OR (schemaname = 'ops' AND indexname IN (
        'ops_scheduled_jobs_key_uidx',
        'ops_scheduled_jobs_due_idx'
      ))
      ORDER BY indexname
    `);

    expect(tableState.rows).toHaveLength(14);
    expect(tableState.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
    expect(indexState.rows.map((row) => row.indexname)).toEqual([
      "app_duo_xp_awards_key_uidx",
      "app_duo_xp_awards_source_uidx",
      "app_play_active_games_duo_position_uidx",
      "app_play_active_games_one_principal_uidx",
      "app_play_scheduled_attendance_session_user_uidx",
      "app_play_session_confirmations_session_user_uidx",
      "app_play_sessions_one_active_live_uidx",
      "app_play_spoiler_reveals_momento_user_uidx",
      "app_play_terminal_requests_one_pending_uidx",
      "app_push_subscriptions_endpoint_uidx",
      "ops_scheduled_jobs_due_idx",
      "ops_scheduled_jobs_key_uidx"
    ]);
  });

  test("runtime grants stay least-privileged for play data", async () => {
    await applyFoundationMigration(pool);

    const privileges = await pool.query<{
      table_name: string;
      can_delete: boolean;
      runtime_can_update_jobs: boolean;
      worker_can_update_jobs: boolean;
    }>(`
      SELECT
        expected.table_name,
        has_table_privilege('queue2_app_runtime', expected.table_name, 'DELETE') AS can_delete,
        has_table_privilege('queue2_app_runtime', 'ops.scheduled_jobs', 'UPDATE') AS runtime_can_update_jobs,
        has_table_privilege('queue2_worker', 'ops.scheduled_jobs', 'UPDATE') AS worker_can_update_jobs
      FROM (VALUES
        ('app.play_active_games'),
        ('app.play_sessions'),
        ('app.play_session_confirmations'),
        ('app.play_progress'),
        ('app.play_chapters'),
        ('app.play_momentos'),
        ('app.play_spoiler_reveals'),
        ('app.play_terminal_requests'),
        ('app.play_scheduled_sessions'),
        ('app.play_scheduled_attendance'),
        ('app.play_notifications'),
        ('app.push_subscriptions'),
        ('app.duo_xp_awards'),
        ('ops.scheduled_jobs')
      ) AS expected(table_name)
    `);

    expect(
      privileges.rows.filter((row) => row.table_name === "app.play_active_games")
    ).toEqual([expect.objectContaining({ can_delete: true })]);
    expect(
      privileges.rows
        .filter((row) => row.table_name !== "app.play_active_games")
        .every((row) => row.can_delete === false)
    ).toBe(true);
    expect(privileges.rows.every((row) => row.runtime_can_update_jobs === false)).toBe(true);
    expect(privileges.rows.every((row) => row.worker_can_update_jobs === true)).toBe(true);
  });

  test("security-sensitive play tables carry owner and audit comments", async () => {
    await applyFoundationMigration(pool);

    const comments = await pool.query<{ table_name: string; comment: string | null }>(`
      SELECT
        namespace.nspname || '.' || class.relname AS table_name,
        obj_description(class.oid, 'pg_class') AS comment
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE (namespace.nspname, class.relname) IN (
        ('app', 'play_momentos'),
        ('app', 'push_subscriptions'),
        ('app', 'duo_xp_awards'),
        ('ops', 'scheduled_jobs')
      )
      ORDER BY table_name
    `);

    expect(comments.rows).toEqual([
      expect.objectContaining({
        table_name: "app.duo_xp_awards",
        comment: expect.stringContaining("Owner module: play")
      }),
      expect.objectContaining({
        table_name: "app.play_momentos",
        comment: expect.stringContaining("spoiler")
      }),
      expect.objectContaining({
        table_name: "app.push_subscriptions",
        comment: expect.stringContaining("server")
      }),
      expect.objectContaining({
        table_name: "ops.scheduled_jobs",
        comment: expect.stringContaining("Idempotent")
      })
    ]);
  });
});
