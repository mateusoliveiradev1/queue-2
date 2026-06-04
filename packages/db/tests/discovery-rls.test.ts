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

describe.skipIf(!testDatabaseUrl)("discovery RLS isolation", () => {
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

  test("members can read discovery state for their duo but not another duo", async () => {
    const first = await createReadyDuo(pool, "discovery-read-a");
    const second = await createReadyDuo(pool, "discovery-read-b");
    const gameId = await insertCatalogGame(pool, "discovery-read-game");

    await withRuntimeUser(pool, first.ownerUserId, (client) =>
      insertDecision(client, first.duoId, first.ownerUserId, gameId, "want")
    );

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        client.query("SELECT id FROM app.discovery_member_decisions")
      )
    ).resolves.toMatchObject({ rowCount: 1 });
    await expect(
      withRuntimeUser(pool, second.ownerUserId, (client) =>
        client.query("SELECT id FROM app.discovery_member_decisions")
      )
    ).resolves.toMatchObject({ rowCount: 0 });
  });

  test("cross-duo discovery writes and updates fail under runtime role and RLS", async () => {
    const first = await createReadyDuo(pool, "discovery-cross-a");
    const second = await createReadyDuo(pool, "discovery-cross-b");
    const gameId = await insertCatalogGame(pool, "discovery-cross-game");

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertDecision(client, second.duoId, first.ownerUserId, gameId, "want")
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);

    await withRuntimeUser(pool, second.ownerUserId, (client) =>
      insertDecision(client, second.duoId, second.ownerUserId, gameId, "want")
    );

    const crossUpdate = await withRuntimeUser(pool, first.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_member_decisions
          SET decision = 'skip',
              cooldown_until = NULL,
              preference_weight = 0,
              updated_at = now()
          WHERE duo_id = $1
          RETURNING id
        `,
        [second.duoId]
      )
    );

    expect(crossUpdate.rowCount).toBe(0);
  });

  test("one member cannot overwrite the partner's decision, quiz answer or push subscription", async () => {
    const duo = await createReadyDuo(pool, "discovery-owner");
    const gameId = await insertCatalogGame(pool, "discovery-owner-game");
    const quizRound = randomUUID();

    await withRuntimeUser(pool, duo.partnerUserId, async (client) => {
      await insertDecision(client, duo.duoId, duo.partnerUserId, gameId, "want");
      await client.query(
        `
          INSERT INTO app.discovery_mood_quiz_answers (
            duo_id,
            user_id,
            quiz_round,
            question_key,
            answer_key
          )
          VALUES ($1, $2, $3, 'energy', 'medium')
        `,
        [duo.duoId, duo.partnerUserId, quizRound]
      );
      await client.query(
        `
          INSERT INTO app.discovery_push_subscriptions (
            duo_id,
            user_id,
            endpoint,
            p256dh,
            auth_secret,
            user_agent
          )
          VALUES ($1, $2, $3, 'key', 'secret', 'vitest')
        `,
        [duo.duoId, duo.partnerUserId, `https://push.queue2.test/${randomUUID()}`]
      );
    });

    await expect(
      withRuntimeUser(pool, duo.ownerUserId, (client) =>
        insertDecision(client, duo.duoId, duo.partnerUserId, gameId, "skip")
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);

    const partnerDecisionUpdate = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_member_decisions
          SET decision = 'skip',
              cooldown_until = NULL,
              preference_weight = 0,
              updated_at = now()
          WHERE duo_id = $1
            AND user_id = $2
          RETURNING id
        `,
        [duo.duoId, duo.partnerUserId]
      )
    );
    const partnerQuizUpdate = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_mood_quiz_answers
          SET answer_key = 'high',
              updated_at = now()
          WHERE duo_id = $1
            AND user_id = $2
          RETURNING id
        `,
        [duo.duoId, duo.partnerUserId]
      )
    );
    const partnerPushUpdate = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_push_subscriptions
          SET enabled = false,
              disabled_at = now(),
              updated_at = now()
          WHERE duo_id = $1
            AND user_id = $2
          RETURNING id
        `,
        [duo.duoId, duo.partnerUserId]
      )
    );

    expect(partnerDecisionUpdate.rowCount).toBe(0);
    expect(partnerQuizUpdate.rowCount).toBe(0);
    expect(partnerPushUpdate.rowCount).toBe(0);
  });

  test("match and live rows mutate only through authorized duo membership", async () => {
    const duo = await createReadyDuo(pool, "discovery-shared");
    const outsider = await createReadyDuo(pool, "discovery-outsider");
    const gameId = await insertCatalogGame(pool, "discovery-shared-game");

    await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      client.query(
        `
          INSERT INTO app.discovery_live_sessions (
            duo_id,
            started_by_user_id,
            expires_at
          )
          VALUES ($1, $2, now() + interval '10 minutes')
        `,
        [duo.duoId, duo.ownerUserId]
      )
    );
    await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      insertMatch(client, duo.duoId, gameId, duo.ownerUserId, duo.partnerUserId)
    );

    const partnerLiveUpdate = await withRuntimeUser(pool, duo.partnerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_live_sessions
          SET status = 'ended',
              ended_at = now(),
              updated_at = now()
          WHERE duo_id = $1
          RETURNING id
        `,
        [duo.duoId]
      )
    );
    const outsiderLiveUpdate = await withRuntimeUser(pool, outsider.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_live_sessions
          SET status = 'expired',
              ended_at = now(),
              updated_at = now()
          WHERE duo_id = $1
          RETURNING id
        `,
        [duo.duoId]
      )
    );
    const partnerMatchUpdate = await withRuntimeUser(pool, duo.partnerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_matches
          SET library_handoff_status = 'wishlist',
              library_handoff_at = now(),
              library_handoff_by_user_id = $2
          WHERE duo_id = $1
          RETURNING id
        `,
        [duo.duoId, duo.partnerUserId]
      )
    );
    const outsiderMatchUpdate = await withRuntimeUser(pool, outsider.ownerUserId, (client) =>
      client.query(
        `
          UPDATE app.discovery_matches
          SET library_handoff_status = 'pausado',
              library_handoff_at = now(),
              library_handoff_by_user_id = $2
          WHERE duo_id = $1
          RETURNING id
        `,
        [duo.duoId, outsider.ownerUserId]
      )
    );

    expect(partnerLiveUpdate.rowCount).toBe(1);
    expect(outsiderLiveUpdate.rowCount).toBe(0);
    expect(partnerMatchUpdate.rowCount).toBe(1);
    expect(outsiderMatchUpdate.rowCount).toBe(0);
  });

  test("discovery tables are forced through RLS and retain reviewed hot-query indexes", async () => {
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
      WHERE namespace.nspname = 'app'
        AND class.relname IN (
          'discovery_member_decisions',
          'discovery_matches',
          'discovery_live_sessions',
          'discovery_mood_quiz_answers',
          'discovery_push_subscriptions'
        )
      ORDER BY table_name
    `);
    const indexState = await pool.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'app'
        AND indexname IN (
          'app_discovery_member_decisions_deck_exclusion_idx',
          'app_discovery_member_decisions_cooldown_idx',
          'app_discovery_member_decisions_partner_match_idx',
          'app_discovery_matches_duo_game_uidx',
          'app_discovery_matches_history_idx',
          'app_discovery_live_sessions_duo_status_idx',
          'app_discovery_live_sessions_expiry_idx'
        )
    `);

    expect(tableState.rows).toHaveLength(5);
    expect(tableState.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
    expect(indexState.rows.map((row) => row.indexname).sort()).toEqual([
      "app_discovery_live_sessions_duo_status_idx",
      "app_discovery_live_sessions_expiry_idx",
      "app_discovery_matches_duo_game_uidx",
      "app_discovery_matches_history_idx",
      "app_discovery_member_decisions_cooldown_idx",
      "app_discovery_member_decisions_deck_exclusion_idx",
      "app_discovery_member_decisions_partner_match_idx"
    ]);
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

async function insertDecision(
  client: pg.PoolClient,
  duoId: string,
  userId: string,
  gameId: string,
  decision: "want" | "not_now" | "skip"
): Promise<void> {
  const cooldownUntil = decision === "not_now" ? "now() + interval '14 days'" : "NULL";
  const preferenceWeight = decision === "want" ? 3 : decision === "not_now" ? -2 : 0;

  await client.query(
    `
      INSERT INTO app.discovery_member_decisions (
        duo_id,
        user_id,
        catalog_game_id,
        decision,
        source_mode,
        cooldown_until,
        preference_weight
      )
      VALUES ($1, $2, $3, $4, 'deck', ${cooldownUntil}, $5)
    `,
    [duoId, userId, gameId, decision, preferenceWeight]
  );
}

async function insertMatch(
  client: pg.PoolClient,
  duoId: string,
  gameId: string,
  firstUserId: string,
  secondUserId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.discovery_matches (
        duo_id,
        catalog_game_id,
        created_from,
        first_user_id,
        second_user_id,
        reason_snapshot
      )
      VALUES ($1, $2, 'deck', $3, $4, '["PC em comum"]'::jsonb)
    `,
    [duoId, gameId, firstUserId, secondUserId]
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
