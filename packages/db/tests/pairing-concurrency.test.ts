import type pg from "pg";

import { createMigratedIntegrationPool, getTestDatabaseUrl, missingTestDatabaseMessage } from "../src/testing/migrate-empty";
import {
  claimPairingCode,
  createDuoWithPairingCode,
  duoMemberCount,
  makeTestUserId
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("pairing concurrency", () => {
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

  test("simultaneous pairing claims leave the duo with exactly two members", async () => {
    const ownerUserId = makeTestUserId("owner");
    const claimantA = makeTestUserId("claim-a");
    const claimantB = makeTestUserId("claim-b");
    const duo = await createDuoWithPairingCode(pool, ownerUserId);

    const claims = await Promise.allSettled([
      claimPairingCode(pool, claimantA, duo.pairingCode),
      claimPairingCode(pool, claimantB, duo.pairingCode)
    ]);

    const fulfilled = claims.filter((claim): claim is PromiseFulfilledResult<string> => claim.status === "fulfilled");
    const rejected = claims.filter((claim): claim is PromiseRejectedResult => claim.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(fulfilled[0]?.value).toBe(duo.duoId);
    await expect(duoMemberCount(pool, ownerUserId, duo.duoId)).resolves.toBe(2);
  });
});
