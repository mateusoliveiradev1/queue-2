import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";
import {
  claimPairingCode,
  createDuoWithPairingCode,
  insertAuthUser,
  makeTestUserId,
  withRuntimeUser
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("library RLS isolation", () => {
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

  test("members can read their duo library but not another duo", async () => {
    const first = await createReadyDuo(pool, "library-rls-a");
    const second = await createReadyDuo(pool, "library-rls-b");
    const gameId = await insertCatalogGame(pool, "library-rls-game");

    await withRuntimeUser(pool, first.ownerUserId, (client) =>
      client.query(
        `
          INSERT INTO app.duo_library_games (
            duo_id,
            catalog_game_id,
            status,
            added_by_user_id,
            status_updated_by_user_id
          )
          VALUES ($1, $2, 'wishlist', $3, $3)
        `,
        [first.duoId, gameId, first.ownerUserId]
      )
    );

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        client.query("SELECT id FROM app.duo_library_games")
      )
    ).resolves.toMatchObject({ rowCount: 1 });
    await expect(
      withRuntimeUser(pool, second.ownerUserId, (client) =>
        client.query("SELECT id FROM app.duo_library_games")
      )
    ).resolves.toMatchObject({ rowCount: 0 });
  });

  test("cross-duo library writes fail under runtime role and RLS", async () => {
    const first = await createReadyDuo(pool, "library-cross-a");
    const second = await createReadyDuo(pool, "library-cross-b");
    const gameId = await insertCatalogGame(pool, "library-cross-game");

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        client.query(
          `
            INSERT INTO app.duo_library_games (
              duo_id,
              catalog_game_id,
              status,
              added_by_user_id,
              status_updated_by_user_id
            )
            VALUES ($1, $2, 'wishlist', $3, $3)
          `,
          [second.duoId, gameId, first.ownerUserId]
        )
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
  });

  test("one member cannot overwrite the other member's platform rows", async () => {
    const duo = await createReadyDuo(pool, "platform-owner");

    await withRuntimeUser(pool, duo.partnerUserId, (client) =>
      client.query(
        `
          INSERT INTO app.member_platforms (duo_id, user_id, platform)
          VALUES ($1, $2, 'pc')
        `,
        [duo.duoId, duo.partnerUserId]
      )
    );

    const updateResult = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.member_platforms
          SET enabled = false,
              updated_at = now()
          WHERE duo_id = $1
            AND user_id = $2
          RETURNING id
        `,
        [duo.duoId, duo.partnerUserId]
      )
    );

    expect(updateResult.rowCount).toBe(0);
  });
});

async function createReadyDuo(pool: pg.Pool, label: string) {
  const ownerUserId = makeTestUserId(`${label}-owner`);
  const partnerUserId = makeTestUserId(`${label}-partner`);
  const duo = await createDuoWithPairingCode(pool, ownerUserId);
  await insertAuthUser(pool, partnerUserId);
  await claimPairingCode(pool, partnerUserId, duo.pairingCode);

  return {
    ...duo,
    partnerUserId
  };
}

async function insertCatalogGame(pool: pg.Pool, slug: string): Promise<string> {
  const uniqueSlug = `${slug}-${randomUUID()}`;
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO catalog.games (
        rawg_id,
        slug,
        name,
        rawg_url,
        source_url
      )
      VALUES (
        floor(random() * 100000000)::integer,
        $1,
        $2,
        $3,
        $3
      )
      RETURNING id
    `,
    [uniqueSlug, uniqueSlug, `https://rawg.io/games/${uniqueSlug}`]
  );

  return result.rows[0]!.id;
}
