import type pg from "pg";

import {
  applyFoundationMigration,
  createIntegrationPool,
  getTestDatabaseUrl
} from "../src/testing/migrate-empty";

const testDatabaseUrl = getTestDatabaseUrl();
const missingRouletteDatabaseMessage =
  "BLOCKED setup - missing TEST_DATABASE_URL for Phase 6 roulette migration fixtures.";

if (!testDatabaseUrl) {
  process.stderr.write(`${missingRouletteDatabaseMessage}\n`);
}

describe.skipIf(!testDatabaseUrl)("roulette migration foundation", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("ROUL-10 applies roulette schema objects to an empty database and can be rerun", async () => {
    await applyFoundationMigration(pool);
    await applyFoundationMigration(pool);

    const result = await pool.query<{ exists: boolean; object_name: string }>(`
      SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists
      FROM (VALUES
        ('app.roulette_boost_balances'),
        ('app.roulette_boost_ledger'),
        ('app.roulette_pity_state'),
        ('app.roulette_rounds'),
        ('app.roulette_round_entries'),
        ('app.roulette_cooldowns'),
        ('app.roulette_history_events')
      ) AS expected(object_name)
      ORDER BY object_name
    `);

    expect(result.rows.every((row) => row.exists)).toBe(true);
  });

  test("SAFE-06 forces RLS and keeps reviewed roulette indexes for active rounds, history and economy", async () => {
    await applyFoundationMigration(pool);

    const tableState = await pool.query<{
      relforcerowsecurity: boolean;
      relrowsecurity: boolean;
      table_name: string;
    }>(`
      SELECT
        namespace.nspname || '.' || class.relname AS table_name,
        class.relrowsecurity,
        class.relforcerowsecurity
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE (namespace.nspname, class.relname) IN (
        ('app', 'roulette_boost_balances'),
        ('app', 'roulette_boost_ledger'),
        ('app', 'roulette_pity_state'),
        ('app', 'roulette_rounds'),
        ('app', 'roulette_round_entries'),
        ('app', 'roulette_cooldowns'),
        ('app', 'roulette_history_events')
      )
      ORDER BY table_name
    `);
    const indexState = await pool.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'app'
        AND indexname IN (
          'app_roulette_boost_balances_duo_uidx',
          'app_roulette_boost_ledger_key_uidx',
          'app_roulette_boost_ledger_source_uidx',
          'app_roulette_pity_state_duo_uidx',
          'app_roulette_rounds_active_duo_uidx',
          'app_roulette_rounds_idempotency_uidx',
          'app_roulette_round_entries_slot_uidx',
          'app_roulette_cooldowns_duo_game_uidx',
          'app_roulette_history_events_key_uidx',
          'app_roulette_history_events_duo_created_idx'
        )
      ORDER BY indexname
    `);

    expect(tableState.rows).toHaveLength(7);
    expect(tableState.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
    expect(indexState.rows.map((row) => row.indexname)).toEqual([
      "app_roulette_boost_balances_duo_uidx",
      "app_roulette_boost_ledger_key_uidx",
      "app_roulette_boost_ledger_source_uidx",
      "app_roulette_cooldowns_duo_game_uidx",
      "app_roulette_history_events_duo_created_idx",
      "app_roulette_history_events_key_uidx",
      "app_roulette_pity_state_duo_uidx",
      "app_roulette_round_entries_slot_uidx",
      "app_roulette_rounds_active_duo_uidx",
      "app_roulette_rounds_idempotency_uidx"
    ]);
  });

  test("ROUL-10 allows Play notifications for roulette-result-locked and roulette-result-discarded", async () => {
    await applyFoundationMigration(pool);

    const constraint = await pool.query<{ constraint_def: string }>(`
      SELECT pg_get_constraintdef(constraint_row.oid) AS constraint_def
      FROM pg_constraint AS constraint_row
      JOIN pg_class AS class ON class.oid = constraint_row.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE namespace.nspname = 'app'
        AND class.relname = 'play_notifications'
        AND constraint_row.conname = 'app_play_notifications_type_chk'
    `);

    expect(constraint.rows[0]?.constraint_def).toContain("roulette-result-locked");
    expect(constraint.rows[0]?.constraint_def).toContain("roulette-result-discarded");
  });

  test("security-sensitive roulette tables carry owner and audit comments", async () => {
    await applyFoundationMigration(pool);

    const comments = await pool.query<{ comment: string | null; table_name: string }>(`
      SELECT
        namespace.nspname || '.' || class.relname AS table_name,
        obj_description(class.oid, 'pg_class') AS comment
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE (namespace.nspname, class.relname) IN (
        ('app', 'roulette_boost_ledger'),
        ('app', 'roulette_pity_state'),
        ('app', 'roulette_rounds'),
        ('app', 'roulette_round_entries'),
        ('app', 'roulette_history_events')
      )
      ORDER BY table_name
    `);

    expect(comments.rows).toEqual([
      expect.objectContaining({
        comment: expect.stringContaining("boost"),
        table_name: "app.roulette_boost_ledger"
      }),
      expect.objectContaining({
        comment: expect.stringContaining("history"),
        table_name: "app.roulette_history_events"
      }),
      expect.objectContaining({
        comment: expect.stringContaining("pity"),
        table_name: "app.roulette_pity_state"
      }),
      expect.objectContaining({
        comment: expect.stringContaining("60"),
        table_name: "app.roulette_round_entries"
      }),
      expect.objectContaining({
        comment: expect.stringContaining("server"),
        table_name: "app.roulette_rounds"
      })
    ]);
  });
});
