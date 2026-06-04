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

describe.skipIf(!testDatabaseUrl)("library jogando concurrency", () => {
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

  test("a fourth concurrent jogando move cannot commit", async () => {
    const duo = await createDuoWithPairingCode(pool, makeTestUserId("jogando-owner"));
    const gameIds = await Promise.all([
      insertCatalogGame(pool, "jogando-a"),
      insertCatalogGame(pool, "jogando-b"),
      insertCatalogGame(pool, "jogando-c"),
      insertCatalogGame(pool, "jogando-d")
    ]);

    await withRuntimeUser(pool, duo.ownerUserId, async (client) => {
      for (const gameId of gameIds.slice(0, 2)) {
        await insertLibraryGame(client, duo.duoId, gameId, duo.ownerUserId, "jogando");
      }

      for (const gameId of gameIds.slice(2)) {
        await insertLibraryGame(client, duo.duoId, gameId, duo.ownerUserId, "wishlist");
      }
    });

    const moves = await Promise.allSettled(
      gameIds.slice(2).map((gameId) =>
        withRuntimeUser(pool, duo.ownerUserId, (client) =>
          client.query(
            `
              UPDATE app.duo_library_games
              SET status = 'jogando',
                  status_updated_by_user_id = $3,
                  updated_at = now()
              WHERE duo_id = $1
                AND catalog_game_id = $2
            `,
            [duo.duoId, gameId, duo.ownerUserId]
          )
        )
      )
    );

    const fulfilled = moves.filter((move) => move.status === "fulfilled");
    const rejected = moves.filter((move) => move.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(errorMessage((rejected[0] as PromiseRejectedResult).reason)).toMatch(
      /jogando_limit_reached/i
    );

    await expect(
      withRuntimeUser(pool, duo.ownerUserId, async (client) => {
        const result = await client.query<{ count: string }>(
          `
            SELECT count(*) AS count
            FROM app.duo_library_games
            WHERE duo_id = $1
              AND status = 'jogando'
          `,
          [duo.duoId]
        );

        return Number(result.rows[0]?.count ?? 0);
      })
    ).resolves.toBe(3);
  });
});

async function insertLibraryGame(
  client: pg.PoolClient,
  duoId: string,
  gameId: string,
  userId: string,
  status: "wishlist" | "jogando"
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}
