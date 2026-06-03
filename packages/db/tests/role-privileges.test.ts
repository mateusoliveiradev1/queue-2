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
    const client = await pool.connect();
    const probeTable = `runtime_migration_probe_${randomUUID().replaceAll("-", "")}`;
    let createError: unknown;
    let alterError: unknown;

    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE queue2_app_runtime");

      try {
        await client.query(`CREATE TABLE app.${probeTable} (id integer)`);
      } catch (error) {
        createError = error;
      }

      try {
        await client.query("ALTER TABLE app.duos ADD COLUMN runtime_probe integer");
      } catch (error) {
        alterError = error;
      }
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }

    expect(errorMessage(createError)).toMatch(/permission denied|must be owner/i);
    expect(errorMessage(alterError)).toMatch(/permission denied|must be owner|transaction is aborted/i);
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
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}
