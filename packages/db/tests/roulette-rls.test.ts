import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl
} from "../src/testing/migrate-empty";
import {
  claimPairingCode,
  createDuoWithPairingCode,
  insertAuthUser,
  makeTestUserId,
  withRuntimeUser
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();
const missingRouletteDatabaseMessage =
  "BLOCKED setup - missing TEST_DATABASE_URL for Phase 6 roulette RLS fixtures.";

if (!testDatabaseUrl) {
  process.stderr.write(`${missingRouletteDatabaseMessage}\n`);
}

describe.skipIf(!testDatabaseUrl)("roulette RLS isolation", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const migratedPool = await createMigratedIntegrationPool();

    if (!migratedPool) {
      throw new Error(missingRouletteDatabaseMessage);
    }

    pool = migratedPool;
  });

  afterAll(async () => {
    await pool.end();
  });

  test("SAFE-06 members can read their own roulette economy, round and history but not another duo", async () => {
    const first = await createReadyDuo(pool, "roulette-read-a");
    const second = await createReadyDuo(pool, "roulette-read-b");
    const fixture = await seedRouletteRound(pool, first, "wishlist");

    await expect(readRouletteCounts(pool, first.partnerUserId)).resolves.toEqual({
      balances: 1,
      cooldowns: 1,
      entries: 60,
      history: 1,
      pity: 1,
      rounds: 1
    });
    await expect(readRouletteCounts(pool, second.ownerUserId)).resolves.toEqual({
      balances: 0,
      cooldowns: 0,
      entries: 0,
      history: 0,
      pity: 0,
      rounds: 0
    });
    expect(fixture.roundId).toBeTruthy();
  });

  test("SAFE-06 cross-duo roulette writes fail under runtime role and forced RLS", async () => {
    const first = await createReadyDuo(pool, "roulette-cross-a");
    const second = await createReadyDuo(pool, "roulette-cross-b");

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        client.query(
          `
            INSERT INTO app.roulette_boost_balances (duo_id, balance, cap)
            VALUES ($1, 100, 600)
          `,
          [second.duoId]
        )
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertRouletteRound(client, second.duoId, second.ownerUserId, randomUUID())
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
  });

  test("ROUL-10 runtime members can create light Play notifications for locked and discarded roulette results only inside their duo", async () => {
    const duo = await createReadyDuo(pool, "roulette-notifications");

    await expect(
      withRuntimeUser(pool, duo.ownerUserId, async (client) => {
        await insertPlayNotification(client, duo.duoId, duo.ownerUserId, "roulette-result-locked");
        await insertPlayNotification(client, duo.duoId, duo.ownerUserId, "roulette-result-discarded");
      })
    ).resolves.toBeUndefined();
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

async function seedRouletteRound(
  pool: pg.Pool,
  duo: Awaited<ReturnType<typeof createReadyDuo>>,
  libraryStatus: "wishlist" | "pausado"
) {
  const catalogGameId = await insertCatalogGame(pool, `roulette-${libraryStatus}`);
  const libraryGameId = await withRuntimeUser(pool, duo.ownerUserId, async (client) => {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO app.duo_library_games (
          duo_id,
          catalog_game_id,
          status,
          added_by_user_id,
          status_updated_by_user_id
        )
        VALUES ($1, $2, $3, $4, $4)
        RETURNING id
      `,
      [duo.duoId, catalogGameId, libraryStatus, duo.ownerUserId]
    );

    return result.rows[0]!.id;
  });
  const roundId = await withRuntimeUser(pool, duo.ownerUserId, async (client) => {
    await client.query(
      `
        INSERT INTO app.roulette_boost_balances (duo_id, balance, cap)
        VALUES ($1, 100, 600)
      `,
      [duo.duoId]
    );
    await client.query(
      `
        INSERT INTO app.roulette_pity_state (duo_id, draws_since_epic_or_higher)
        VALUES ($1, 4)
      `,
      [duo.duoId]
    );

    const createdRoundId = await insertRouletteRound(
      client,
      duo.duoId,
      duo.ownerUserId,
      libraryGameId
    );

    await client.query(
      `
        INSERT INTO app.roulette_cooldowns (
          duo_id,
          library_game_id,
          round_id,
          remaining_rounds,
          weight_multiplier
        )
        VALUES ($1, $2, $3, 3, 0.5)
      `,
      [duo.duoId, libraryGameId, createdRoundId]
    );
    await client.query(
      `
        INSERT INTO app.roulette_history_events (
          duo_id,
          round_id,
          event_key,
          event_type,
          actor_user_id
        )
        VALUES ($1, $2, $3, 'revealed', $4)
      `,
      [duo.duoId, createdRoundId, `revealed:${createdRoundId}`, duo.ownerUserId]
    );

    return createdRoundId;
  });

  return {
    libraryGameId,
    roundId
  };
}

async function insertCatalogGame(pool: pg.Pool, slugPrefix: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO catalog.games (
        rawg_id,
        slug,
        name,
        rawg_url,
        source_url,
        coop_campaign_confirmed,
        coop_player_count_min,
        coop_player_count_max,
        coop_confirmation_source,
        coop_confirmation_checked_at,
        main_flow_eligible
      )
      VALUES ($1, $2, 'Roulette Fixture', 'https://rawg.io/games/roulette-fixture', 'https://rawg.io/games/roulette-fixture', true, 2, 2, 'test', now(), true)
      RETURNING id
    `,
    [Math.floor(Math.random() * 1_000_000_000), `${slugPrefix}-${randomUUID()}`]
  );

  return result.rows[0]!.id;
}

async function insertRouletteRound(
  client: pg.PoolClient,
  duoId: string,
  userId: string,
  libraryGameId: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO app.roulette_rounds (
        duo_id,
        idempotency_key,
        status,
        result_library_game_id,
        result_rarity,
        boost_spent,
        pity_before,
        pity_after,
        selected_by_user_id
      )
      VALUES ($1, $2, 'pending_invitation', $3, 'rare', false, 4, 5, $4)
      RETURNING id
    `,
    [duoId, `round:${randomUUID()}`, libraryGameId, userId]
  );
  const roundId = result.rows[0]!.id;

  await client.query(
    `
      INSERT INTO app.roulette_round_entries (
        duo_id,
        round_id,
        slot_index,
        library_game_id,
        rarity,
        title_snapshot
      )
      SELECT $1, $2, slot_index, $3, 'rare', 'Roulette Fixture'
      FROM generate_series(1, 60) AS slot_index
    `,
    [duoId, roundId, libraryGameId]
  );

  return roundId;
}

async function insertPlayNotification(
  client: pg.PoolClient,
  duoId: string,
  userId: string,
  notificationType: "roulette-result-locked" | "roulette-result-discarded"
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.play_notifications (
        duo_id,
        actor_user_id,
        notification_type,
        action_ref_type,
        action_ref_id,
        title,
        body
      )
      VALUES ($1, $2, $3, 'roulette-round', gen_random_uuid(), 'Roleta atualizada', 'Resultado da roleta registrado para a dupla.')
    `,
    [duoId, userId, notificationType]
  );
}

async function readRouletteCounts(pool: pg.Pool, userId: string) {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{
      balances: string;
      cooldowns: string;
      entries: string;
      history: string;
      pity: string;
      rounds: string;
    }>(`
      SELECT
        (SELECT count(*) FROM app.roulette_boost_balances) AS balances,
        (SELECT count(*) FROM app.roulette_pity_state) AS pity,
        (SELECT count(*) FROM app.roulette_rounds) AS rounds,
        (SELECT count(*) FROM app.roulette_round_entries) AS entries,
        (SELECT count(*) FROM app.roulette_cooldowns) AS cooldowns,
        (SELECT count(*) FROM app.roulette_history_events) AS history
    `);
    const row = result.rows[0]!;

    return {
      balances: Number(row.balances),
      cooldowns: Number(row.cooldowns),
      entries: Number(row.entries),
      history: Number(row.history),
      pity: Number(row.pity),
      rounds: Number(row.rounds)
    };
  });
}
