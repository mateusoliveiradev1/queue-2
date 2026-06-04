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

describe.skipIf(!testDatabaseUrl)("discovery match concurrency", () => {
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

  test("concurrent reciprocal approvals create one discovery match", async () => {
    const duo = await createReadyDuo(pool, "discovery-match-race");
    const gameId = await insertCatalogGame(pool, "discovery-match-race-game");

    const attempts = await Promise.allSettled([
      approveAndCreateMatch(pool, {
        duoId: duo.duoId,
        gameId,
        actorUserId: duo.ownerUserId,
        partnerUserId: duo.partnerUserId
      }),
      approveAndCreateMatch(pool, {
        duoId: duo.duoId,
        gameId,
        actorUserId: duo.partnerUserId,
        partnerUserId: duo.ownerUserId
      })
    ]);

    expect(attempts.every((attempt) => attempt.status === "fulfilled")).toBe(true);
    expect(
      attempts
        .filter((attempt): attempt is PromiseFulfilledResult<number> => attempt.status === "fulfilled")
        .map((attempt) => attempt.value)
        .sort()
    ).toEqual([0, 1]);

    const countResult = await pool.query<{ matches: string; decisions: string }>(
      `
        SELECT
          (
            SELECT count(*)
            FROM app.discovery_matches
            WHERE duo_id = $1
              AND catalog_game_id = $2
          ) AS matches,
          (
            SELECT count(*)
            FROM app.discovery_member_decisions
            WHERE duo_id = $1
              AND catalog_game_id = $2
              AND decision = 'want'
          ) AS decisions
      `,
      [duo.duoId, gameId]
    );

    expect(Number(countResult.rows[0]?.matches ?? 0)).toBe(1);
    expect(Number(countResult.rows[0]?.decisions ?? 0)).toBe(2);
  });
});

async function approveAndCreateMatch(
  pool: pg.Pool,
  input: {
    duoId: string;
    gameId: string;
    actorUserId: string;
    partnerUserId: string;
  }
): Promise<number> {
  return withRuntimeUser(pool, input.actorUserId, async (client) => {
    await client.query(
      `
        INSERT INTO app.discovery_member_decisions (
          duo_id,
          user_id,
          catalog_game_id,
          decision,
          source_mode,
          preference_weight
        )
        VALUES ($1, $2, $3, 'want', 'live', 3)
        ON CONFLICT (duo_id, user_id, catalog_game_id)
        DO UPDATE
        SET decision = 'want',
            source_mode = 'live',
            cooldown_until = NULL,
            preference_weight = 3,
            decided_at = now(),
            updated_at = now()
      `,
      [input.duoId, input.actorUserId, input.gameId]
    );

    const result = await client.query(
      `
        INSERT INTO app.discovery_matches (
          duo_id,
          catalog_game_id,
          created_from,
          first_user_id,
          second_user_id,
          reason_snapshot
        )
        VALUES ($1, $2, 'live', $3, $4, '["PC em comum", "campanha 2p"]'::jsonb)
        ON CONFLICT (duo_id, catalog_game_id) DO NOTHING
        RETURNING id
      `,
      [input.duoId, input.gameId, input.actorUserId, input.partnerUserId]
    );

    return result.rowCount ?? 0;
  });
}

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
