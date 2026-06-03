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

describe.skipIf(!testDatabaseUrl)("foundation migration", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("applies to an empty test branch and can be rerun as an upgrade placeholder", async () => {
    await applyFoundationMigration(pool);
    await applyFoundationMigration(pool);

    const result = await pool.query<{ object_name: string; exists: boolean }>(`
      SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists
      FROM (VALUES
        ('auth."user"'),
        ('auth.session'),
        ('auth.rate_limit'),
        ('app.duos'),
        ('app.duo_members'),
        ('app.pairing_codes'),
        ('app.duo_preferences'),
        ('ops.domain_events'),
        ('ops.audit_events'),
        ('ops.idempotency_keys')
      ) AS expected(object_name)
    `);

    expect(result.rows.every((row) => row.exists)).toBe(true);
  });

  test("runtime role is least-privileged and cannot apply migrations", async () => {
    await applyFoundationMigration(pool);

    const role = await pool.query<{
      rolbypassrls: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      can_create_app: boolean;
      can_create_ops: boolean;
    }>(`
      SELECT
        rolbypassrls,
        rolcreatedb,
        rolcreaterole,
        has_schema_privilege('queue2_app_runtime', 'app', 'CREATE') AS can_create_app,
        has_schema_privilege('queue2_app_runtime', 'ops', 'CREATE') AS can_create_ops
      FROM pg_roles
      WHERE rolname = 'queue2_app_runtime'
    `);

    expect(role.rows[0]).toMatchObject({
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      can_create_app: false,
      can_create_ops: false
    });
  });
});
