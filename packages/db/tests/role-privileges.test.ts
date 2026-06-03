import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";
import {
  createDuoWithPairingCode,
  makeTestUserId,
  withRuntimeUser
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("runtime role privileges", () => {
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

  test("runtime role has no bypass, ownership or schema migration capability", async () => {
    const role = await pool.query<{
      rolbypassrls: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolreplication: boolean;
      rolsuper: boolean;
      can_create_auth: boolean;
      can_create_app: boolean;
      can_create_ops: boolean;
    }>(`
      SELECT
        rolbypassrls,
        rolcreatedb,
        rolcreaterole,
        rolreplication,
        rolsuper,
        has_schema_privilege('queue2_app_runtime', 'auth', 'CREATE') AS can_create_auth,
        has_schema_privilege('queue2_app_runtime', 'app', 'CREATE') AS can_create_app,
        has_schema_privilege('queue2_app_runtime', 'ops', 'CREATE') AS can_create_ops
      FROM pg_roles
      WHERE rolname = 'queue2_app_runtime'
    `);

    expect(role.rows[0]).toMatchObject({
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
      rolsuper: false,
      can_create_auth: false,
      can_create_app: false,
      can_create_ops: false
    });
  });

  test("runtime role cannot create or alter application schema objects", async () => {
    const probeTable = `runtime_migration_probe_${randomUUID().replaceAll("-", "")}`;

    await expectRoleStatementDenied(
      pool,
      `CREATE TABLE app.${probeTable} (id integer)`
    );
    await expectRoleStatementDenied(
      pool,
      "ALTER TABLE app.duos ADD COLUMN runtime_probe integer"
    );
  });

  test("runtime and worker roles can update only Phase 1 duo settings columns", async () => {
    const privileges = await pool.query<{
      role_name: string;
      column_name: string;
      can_update: boolean;
      can_update_table: boolean;
    }>(`
      SELECT
        role.role_name,
        column_name,
        has_column_privilege(role.role_name, 'app.duos', column_name, 'UPDATE') AS can_update,
        has_table_privilege(role.role_name, 'app.duos', 'UPDATE') AS can_update_table
      FROM (VALUES ('queue2_app_runtime'), ('queue2_worker')) AS role(role_name)
      CROSS JOIN (VALUES
        ('id'),
        ('name'),
        ('paired_at'),
        ('xp'),
        ('level'),
        ('streak'),
        ('timezone'),
        ('created_at'),
        ('updated_at')
      ) AS duo_column(column_name)
      ORDER BY role.role_name, column_name
    `);

    for (const roleName of ["queue2_app_runtime", "queue2_worker"]) {
      const rolePrivileges = Object.fromEntries(
        privileges.rows
          .filter((row) => row.role_name === roleName)
          .map((row) => [row.column_name, row.can_update])
      );

      expect(rolePrivileges).toEqual({
        created_at: false,
        id: false,
        level: false,
        name: true,
        paired_at: false,
        streak: false,
        timezone: true,
        updated_at: true,
        xp: false
      });
      expect(
        privileges.rows
          .filter((row) => row.role_name === roleName)
          .every((row) => !row.can_update_table)
      ).toBe(true);
    }
  });

  test("duo-scoped tables are forced through RLS for the runtime role", async () => {
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
      WHERE namespace.nspname IN ('app', 'ops')
        AND class.relname IN (
          'profiles',
          'duos',
          'duo_members',
          'pairing_codes',
          'duo_preferences',
          'domain_events',
          'audit_events',
          'idempotency_keys'
        )
      ORDER BY table_name
    `);

    expect(tableState.rows).toHaveLength(8);
    expect(tableState.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);

    const protectedDuo = await createDuoWithPairingCode(pool, makeTestUserId("role-owner"));
    const outsiderUserId = makeTestUserId("role-outsider");

    await expect(
      withRuntimeUser(pool, outsiderUserId, async (client) => {
        await client.query("SET LOCAL row_security = off");
        return client.query("SELECT id FROM app.duos WHERE id = $1", [protectedDuo.duoId]);
      })
    ).rejects.toThrow(/row-level security|query would be affected/i);
  });

  test("reviewed hot queries retain pairing and membership indexes", async () => {
    const duo = await createDuoWithPairingCode(pool, makeTestUserId("plan-review"));
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL enable_seqscan = off");
      const pairingPlan = await client.query<{ "QUERY PLAN": string }>(
        `
          EXPLAIN (COSTS OFF)
          SELECT id
          FROM app.pairing_codes
          WHERE code = $1
            AND revoked_at IS NULL
            AND claimed_at IS NULL
          LIMIT 1
        `,
        [duo.pairingCode]
      );
      const membershipPlan = await client.query<{ "QUERY PLAN": string }>(
        `
          EXPLAIN (COSTS OFF)
          SELECT duo_id
          FROM app.duo_members
          WHERE user_id = $1
          LIMIT 1
        `,
        [duo.ownerUserId]
      );

      expect(planText(pairingPlan.rows)).toContain("app_pairing_codes_active_code_uidx");
      expect(planText(membershipPlan.rows)).toMatch(
        /app_duo_members_user(_duo)?_idx/
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

async function expectRoleStatementDenied(pool: pg.Pool, statement: string): Promise<void> {
  const client = await pool.connect();
  let statementError: unknown;

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE queue2_app_runtime");

    try {
      await client.query(statement);
    } catch (error) {
      statementError = error;
    }
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }

  expect(errorMessage(statementError)).toMatch(/permission denied|must be owner/i);
}

function planText(rows: Array<{ "QUERY PLAN": string }>): string {
  return rows.map((row) => row["QUERY PLAN"]).join("\n");
}
