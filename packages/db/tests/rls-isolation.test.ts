import type pg from "pg";

import { createMigratedIntegrationPool, getTestDatabaseUrl, missingTestDatabaseMessage } from "../src/testing/migrate-empty";
import {
  createDuoWithPairingCode,
  makeTestUserId,
  visibleDuoIds,
  withRuntimeUser
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("duo RLS isolation", () => {
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

  test("members can read their own duo but not another duo", async () => {
    const first = await createDuoWithPairingCode(pool, makeTestUserId("rls-a"));
    const second = await createDuoWithPairingCode(pool, makeTestUserId("rls-b"));

    await expect(visibleDuoIds(pool, first.ownerUserId)).resolves.toEqual([first.duoId]);
    await expect(visibleDuoIds(pool, second.ownerUserId)).resolves.toEqual([second.duoId]);
  });

  test("cross-duo writes fail at the database layer", async () => {
    const first = await createDuoWithPairingCode(pool, makeTestUserId("write-a"));
    const second = await createDuoWithPairingCode(pool, makeTestUserId("write-b"));

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        client.query(
          `
            INSERT INTO ops.domain_events (duo_id, event_type, aggregate_type, aggregate_id, payload)
            VALUES ($1, 'duo.cross_write_attempted', 'duo', $2, '{}'::jsonb)
          `,
          [second.duoId, second.duoId]
        )
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
  });
});
