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
  "BLOCKED setup - missing TEST_DATABASE_URL for Phase 6 roulette concurrency fixtures.";

if (!testDatabaseUrl) {
  process.stderr.write(`${missingRouletteDatabaseMessage}\n`);
}

describe.skipIf(!testDatabaseUrl)("roulette database-backed concurrency invariants", () => {
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

  test("D-16 allows only one active or pending roulette round per duo", async () => {
    const duo = await createReadyDuo(pool, "roulette-one-active");
    const firstLibraryGameId = await seedLibraryGame(pool, duo, "wishlist");
    const secondLibraryGameId = await seedLibraryGame(pool, duo, "pausado");

    const results = await Promise.allSettled([
      insertActiveRound(pool, duo.ownerUserId, duo.duoId, firstLibraryGameId, "round-a"),
      insertActiveRound(pool, duo.partnerUserId, duo.duoId, secondLibraryGameId, "round-b")
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(readActiveRoundCount(pool, duo.ownerUserId, duo.duoId)).resolves.toBe(1);
  });

  test("D-15 D-16 exactly-once boost spend, pity update and history event converge across replayed keys", async () => {
    const duo = await createReadyDuo(pool, "roulette-exactly-once");
    const libraryGameId = await seedLibraryGame(pool, duo, "wishlist");
    const roundKey = `boosted:${randomUUID()}`;

    await withRuntimeUser(pool, duo.ownerUserId, async (client) => {
      await client.query(
        `
          INSERT INTO app.roulette_boost_balances (duo_id, balance, cap)
          VALUES ($1, 200, 600)
        `,
        [duo.duoId]
      );
      await client.query(
        `
          INSERT INTO app.roulette_pity_state (duo_id, draws_since_epic_or_higher)
          VALUES ($1, 9)
        `,
        [duo.duoId]
      );
    });

    const results = await Promise.allSettled([
      applyBoostedRoundEffects(pool, duo.ownerUserId, duo.duoId, libraryGameId, roundKey),
      applyBoostedRoundEffects(pool, duo.partnerUserId, duo.duoId, libraryGameId, roundKey)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(readExactlyOnceState(pool, duo.ownerUserId, duo.duoId, roundKey)).resolves.toEqual({
      boostBalance: 100,
      boostLedgerRows: 1,
      historyRows: 1,
      pityCounter: 10,
      roundRows: 1
    });
  });

  test("D-29 cannot start a new round until pending invitation is locked or discarded", async () => {
    const duo = await createReadyDuo(pool, "roulette-pending-blocks");
    const libraryGameId = await seedLibraryGame(pool, duo, "wishlist");

    await insertActiveRound(pool, duo.ownerUserId, duo.duoId, libraryGameId, "first");
    await expect(
      insertActiveRound(pool, duo.partnerUserId, duo.duoId, libraryGameId, "second")
    ).rejects.toThrow(/duplicate key|unique constraint|active_duo/i);

    await resolveRound(pool, duo.ownerUserId, duo.duoId, "discarded");
    await expect(
      insertActiveRound(pool, duo.partnerUserId, duo.duoId, libraryGameId, "third")
    ).resolves.toBeTruthy();
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

async function seedLibraryGame(
  pool: pg.Pool,
  duo: Awaited<ReturnType<typeof createReadyDuo>>,
  status: "wishlist" | "pausado"
): Promise<string> {
  const catalogResult = await pool.query<{ id: string }>(
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
      VALUES ($1, $2, 'Roulette Concurrency', 'https://rawg.io/games/roulette-concurrency', 'https://rawg.io/games/roulette-concurrency', true, 2, 2, 'test', now(), true)
      RETURNING id
    `,
    [Math.floor(Math.random() * 1_000_000_000), `roulette-concurrency-${randomUUID()}`]
  );

  return withRuntimeUser(pool, duo.ownerUserId, async (client) => {
    const libraryResult = await client.query<{ id: string }>(
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
      [duo.duoId, catalogResult.rows[0]!.id, status, duo.ownerUserId]
    );

    return libraryResult.rows[0]!.id;
  });
}

async function insertActiveRound(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  libraryGameId: string,
  idempotencyKey: string
): Promise<string> {
  return withRuntimeUser(pool, userId, async (client) => {
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
        VALUES ($1, $2, 'pending_invitation', $3, 'common', false, 0, 1, $4)
        RETURNING id
      `,
      [duoId, idempotencyKey, libraryGameId, userId]
    );

    return result.rows[0]!.id;
  });
}

async function applyBoostedRoundEffects(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  libraryGameId: string,
  roundKey: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    const round = await client.query<{ id: string }>(
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
        VALUES ($1, $2, 'pending_invitation', $3, 'rare', true, 9, 10, $4)
        ON CONFLICT (duo_id, idempotency_key)
        DO UPDATE SET updated_at = app.roulette_rounds.updated_at
        RETURNING id
      `,
      [duoId, roundKey, libraryGameId, userId]
    );
    const roundId = round.rows[0]!.id;

    await client.query(
      `
        WITH inserted_ledger AS (
          INSERT INTO app.roulette_boost_ledger (
            duo_id,
            ledger_key,
            source_type,
            source_id,
            amount_delta,
            reason_code,
            actor_user_id
          )
          VALUES ($1, $2, 'roulette-round', $3, -100, 'boost-spend', $4)
          ON CONFLICT (duo_id, ledger_key) DO NOTHING
          RETURNING amount_delta
        )
        UPDATE app.roulette_boost_balances
        SET balance = GREATEST(0, balance + inserted_ledger.amount_delta),
            updated_at = now()
        FROM inserted_ledger
        WHERE duo_id = $1
      `,
      [duoId, `boost:${roundKey}`, roundId, userId]
    );
    await client.query(
      `
        UPDATE app.roulette_pity_state
        SET draws_since_epic_or_higher = 10,
            updated_at = now()
        WHERE duo_id = $1
      `,
      [duoId]
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
        ON CONFLICT (duo_id, event_key) DO NOTHING
      `,
      [duoId, roundId, `history:${roundKey}:revealed`, userId]
    );
  });
}

async function resolveRound(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  status: "locked" | "discarded"
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        UPDATE app.roulette_rounds
        SET status = $2,
            resolved_at = now(),
            resolved_by_user_id = $3,
            updated_at = now()
        WHERE duo_id = $1
          AND status = 'pending_invitation'
      `,
      [duoId, status, userId]
    );
  });
}

async function readActiveRoundCount(
  pool: pg.Pool,
  userId: string,
  duoId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.roulette_rounds
        WHERE duo_id = $1
          AND status IN ('active', 'revealing', 'pending_invitation')
      `,
      [duoId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readExactlyOnceState(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  roundKey: string
) {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{
      boost_balance: number;
      boost_ledger_rows: string;
      history_rows: string;
      pity_counter: number;
      round_rows: string;
    }>(
      `
        SELECT
          (SELECT balance FROM app.roulette_boost_balances WHERE duo_id = $1) AS boost_balance,
          (SELECT draws_since_epic_or_higher FROM app.roulette_pity_state WHERE duo_id = $1) AS pity_counter,
          (SELECT count(*) FROM app.roulette_rounds WHERE duo_id = $1 AND idempotency_key = $2) AS round_rows,
          (SELECT count(*) FROM app.roulette_boost_ledger WHERE duo_id = $1 AND ledger_key = $3) AS boost_ledger_rows,
          (SELECT count(*) FROM app.roulette_history_events WHERE duo_id = $1 AND event_key = $4) AS history_rows
      `,
      [duoId, roundKey, `boost:${roundKey}`, `history:${roundKey}:revealed`]
    );
    const row = result.rows[0]!;

    return {
      boostBalance: Number(row.boost_balance),
      boostLedgerRows: Number(row.boost_ledger_rows),
      historyRows: Number(row.history_rows),
      pityCounter: Number(row.pity_counter),
      roundRows: Number(row.round_rows)
    };
  });
}
