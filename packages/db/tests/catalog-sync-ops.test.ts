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

describe.skipIf(!testDatabaseUrl)("catalog sync ops schema", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
    await applyFoundationMigration(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("creates non-duo sync run and item tables with operational comments", async () => {
    const tables = await pool.query<{ object_name: string; exists: boolean }>(`
      SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists
      FROM (VALUES
        ('ops.catalog_sync_runs'),
        ('ops.catalog_sync_run_items')
      ) AS expected(object_name)
    `);

    expect(tables.rows.every((row) => row.exists)).toBe(true);

    const columns = await pool.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'ops'
        AND table_name IN ('catalog_sync_runs', 'catalog_sync_run_items')
        AND column_name IN (
          'source',
          'mode',
          'dry_run',
          'status',
          'input_count',
          'created_count',
          'updated_count',
          'skipped_count',
          'failed_count',
          'metadata',
          'changes',
          'error_code',
          'error_message'
        )
    `);

    expect(columns.rows.length).toBeGreaterThanOrEqual(13);

    const comments = await pool.query<{ run_comment: string | null; item_comment: string | null }>(`
      SELECT
        obj_description('ops.catalog_sync_runs'::regclass, 'pg_class') AS run_comment,
        obj_description('ops.catalog_sync_run_items'::regclass, 'pg_class') AS item_comment
    `);

    expect(comments.rows[0]?.run_comment).toContain("Non-duo operational audit");
    expect(comments.rows[0]?.item_comment).toContain("redacted errors");
  });

  test("grants worker lifecycle writes but no runtime mutation privilege", async () => {
    const privileges = await pool.query<{
      table_name: string;
      app_can_insert: boolean;
      app_can_update: boolean;
      worker_can_insert: boolean;
      worker_can_update: boolean;
    }>(`
      SELECT
        table_name,
        has_table_privilege('queue2_app_runtime', 'ops.' || table_name, 'INSERT') AS app_can_insert,
        has_table_privilege('queue2_app_runtime', 'ops.' || table_name, 'UPDATE') AS app_can_update,
        has_table_privilege('queue2_worker', 'ops.' || table_name, 'INSERT') AS worker_can_insert,
        has_table_privilege('queue2_worker', 'ops.' || table_name, 'UPDATE') AS worker_can_update
      FROM (VALUES
        ('catalog_sync_runs'),
        ('catalog_sync_run_items')
      ) AS table_list(table_name)
    `);

    expect(privileges.rows).toHaveLength(2);
    expect(
      privileges.rows.every(
        (row) =>
          !row.app_can_insert &&
          !row.app_can_update &&
          row.worker_can_insert &&
          row.worker_can_update
      )
    ).toBe(true);
  });

  test("enforces run and item statuses for redacted audit rows", async () => {
    await expect(
      pool.query(`
        INSERT INTO ops.catalog_sync_runs (mode, status)
        VALUES ('apply', 'secret-error')
      `)
    ).rejects.toThrow();

    const run = await pool.query<{ id: string }>(`
      INSERT INTO ops.catalog_sync_runs (
        mode,
        dry_run,
        status,
        input_count,
        metadata
      )
      VALUES ('dry-run', true, 'running', 1, '{"allowlist":"test"}'::jsonb)
      RETURNING id
    `);

    await expect(
      pool.query(
        `
          INSERT INTO ops.catalog_sync_run_items (
            run_id,
            slug,
            status,
            changes,
            error_code,
            error_message
          )
          VALUES ($1, 'it-takes-two', 'failed', '{}'::jsonb, 'RAWG_FETCH_FAILED', 'redacted failure')
        `,
        [run.rows[0]!.id]
      )
    ).resolves.toBeTruthy();
  });
});
