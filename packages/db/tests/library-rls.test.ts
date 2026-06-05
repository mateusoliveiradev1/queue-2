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

  test("paginated filtered library reads stay isolated to the runtime user's duo", async () => {
    const first = await createReadyDuo(pool, "library-page-a");
    const second = await createReadyDuo(pool, "library-page-b");
    const sharedGameId = await insertCatalogGame(pool, "library-page-shared", ["pc"]);
    const secondOnlyGameId = await insertCatalogGame(pool, "library-page-private", ["pc"]);

    await withRuntimeUser(pool, first.ownerUserId, (client) =>
      insertLibraryGame(client, first.duoId, sharedGameId, first.ownerUserId, "wishlist")
    );
    await withRuntimeUser(pool, second.ownerUserId, async (client) => {
      await insertLibraryGame(client, second.duoId, sharedGameId, second.ownerUserId, "wishlist");
      await insertLibraryGame(client, second.duoId, secondOnlyGameId, second.ownerUserId, "pausado");
    });

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        queryFilteredLibraryPage(client, first.duoId, "library-page", ["wishlist", "pausado"], ["pc"])
      )
    ).resolves.toMatchObject({
      rowCount: 1,
      rows: [expect.objectContaining({ duo_id: first.duoId })]
    });

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        queryFilteredLibraryPage(client, second.duoId, "library-page", ["wishlist", "pausado"], ["pc"])
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

async function queryFilteredLibraryPage(
  client: pg.PoolClient,
  duoId: string,
  query: string,
  statuses: Array<"wishlist" | "jogando" | "pausado" | "zerado" | "dropado">,
  platformKeys: string[]
): Promise<pg.QueryResult<{ id: string; duo_id: string; name: string }>> {
  return client.query(
    `
      SELECT
        library_game.id,
        library_game.duo_id,
        game.name
      FROM app.duo_library_games AS library_game
      INNER JOIN catalog.games AS game
        ON game.id = library_game.catalog_game_id
      WHERE library_game.duo_id = $1
        AND library_game.status = ANY($2::text[])
        AND (
          $3::text IS NULL
          OR game.name ILIKE '%' || $3 || '%'
          OR game.slug ILIKE '%' || $3 || '%'
        )
        AND (
          cardinality($4::text[]) = 0
          OR EXISTS (
            SELECT 1
            FROM catalog.game_platforms AS platform
            WHERE platform.game_id = game.id
              AND platform.platform_key = ANY($4::text[])
          )
        )
      ORDER BY game.name ASC, library_game.updated_at DESC, library_game.created_at DESC
      LIMIT 12
      OFFSET 0
    `,
    [duoId, statuses, query, platformKeys]
  );
}

async function insertLibraryGame(
  client: pg.PoolClient,
  duoId: string,
  gameId: string,
  userId: string,
  status: "wishlist" | "jogando" | "pausado"
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.duo_library_games (
        duo_id,
        catalog_game_id,
        status,
        added_by_user_id,
        status_updated_by_user_id
      )
      VALUES ($1, $2, $3, $4, $4)
    `,
    [duoId, gameId, status, userId]
  );
}

async function insertCatalogGame(
  pool: pg.Pool,
  slug: string,
  platforms: string[] = []
): Promise<string> {
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

  const gameId = result.rows[0]!.id;

  for (const platform of platforms) {
    await pool.query(
      `
        INSERT INTO catalog.game_platforms (
          game_id,
          platform_key,
          platform_name
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (game_id, platform_key) DO NOTHING
      `,
      [gameId, platform, platform.toUpperCase()]
    );
  }

  return gameId;
}
