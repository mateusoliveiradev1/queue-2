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

describe.skipIf(!testDatabaseUrl)("play RLS isolation", () => {
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

  test("members can read their duo play state but not another duo", async () => {
    const first = await createReadyDuo(pool, "play-read-a");
    const second = await createReadyDuo(pool, "play-read-b");
    const libraryGameId = await createJogandoLibraryGame(pool, first, "play-read-game");

    await withRuntimeUser(pool, first.ownerUserId, async (client) => {
      const sessionId = await insertPlaySession(client, first.duoId, libraryGameId, first.ownerUserId);
      await insertMomento(client, first.duoId, libraryGameId, sessionId, first.ownerUserId, true);
      await insertScheduledSession(client, first.duoId, libraryGameId, first.ownerUserId);
      await insertNotification(client, first.duoId, first.ownerUserId);
      await insertXpAward(client, first.duoId, sessionId, first.ownerUserId);
    });

    await expect(readPlayCounts(pool, first.partnerUserId)).resolves.toEqual({
      sessions: 1,
      momentos: 1,
      scheduled: 1,
      notifications: 1,
      awards: 1
    });
    await expect(readPlayCounts(pool, second.ownerUserId)).resolves.toEqual({
      sessions: 0,
      momentos: 0,
      scheduled: 0,
      notifications: 0,
      awards: 0
    });
  });

  test("cross-duo play writes fail under runtime role and RLS", async () => {
    const first = await createReadyDuo(pool, "play-cross-a");
    const second = await createReadyDuo(pool, "play-cross-b");
    const secondLibraryGameId = await createJogandoLibraryGame(pool, second, "play-cross-game");

    await expect(
      withRuntimeUser(pool, first.ownerUserId, (client) =>
        insertPlaySession(client, second.duoId, secondLibraryGameId, first.ownerUserId)
      )
    ).rejects.toThrow(/row-level security|violates row-level security|new row violates/i);
  });

  test("spoiler reveal state is local to each viewer", async () => {
    const duo = await createReadyDuo(pool, "play-spoiler");
    const libraryGameId = await createJogandoLibraryGame(pool, duo, "play-spoiler-game");
    const momentoId = await withRuntimeUser(pool, duo.ownerUserId, async (client) => {
      const sessionId = await insertPlaySession(client, duo.duoId, libraryGameId, duo.ownerUserId);
      return insertMomento(client, duo.duoId, libraryGameId, sessionId, duo.ownerUserId, true);
    });

    await withRuntimeUser(pool, duo.partnerUserId, (client) =>
      client.query(
        `
          INSERT INTO app.play_spoiler_reveals (duo_id, momento_id, user_id)
          VALUES ($1, $2, $3)
        `,
        [duo.duoId, momentoId, duo.partnerUserId]
      )
    );

    await expect(
      withRuntimeUser(pool, duo.ownerUserId, (client) =>
        client.query("SELECT id FROM app.play_spoiler_reveals WHERE momento_id = $1", [momentoId])
      )
    ).resolves.toMatchObject({ rowCount: 0 });
    await expect(
      withRuntimeUser(pool, duo.partnerUserId, (client) =>
        client.query("SELECT id FROM app.play_spoiler_reveals WHERE momento_id = $1", [momentoId])
      )
    ).resolves.toMatchObject({ rowCount: 1 });
  });

  test("push subscription endpoint and key material are readable only by the owning member", async () => {
    const duo = await createReadyDuo(pool, "play-push");
    const endpoint = `https://push.queue2.test/${randomUUID()}`;

    await withRuntimeUser(pool, duo.partnerUserId, (client) =>
      client.query(
        `
          INSERT INTO app.push_subscriptions (
            duo_id,
            user_id,
            endpoint,
            p256dh,
            auth_secret,
            user_agent
          )
          VALUES ($1, $2, $3, 'partner-p256dh', 'partner-auth', 'vitest')
        `,
        [duo.duoId, duo.partnerUserId, endpoint]
      )
    );

    const ownerRead = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      client.query(
        `
          SELECT endpoint, p256dh, auth_secret
          FROM app.push_subscriptions
          WHERE duo_id = $1
        `,
        [duo.duoId]
      )
    );
    const partnerRead = await withRuntimeUser(pool, duo.partnerUserId, (client) =>
      client.query(
        `
          SELECT endpoint, p256dh, auth_secret
          FROM app.push_subscriptions
          WHERE duo_id = $1
        `,
        [duo.duoId]
      )
    );

    expect(ownerRead.rowCount).toBe(0);
    expect(partnerRead.rows).toEqual([
      {
        endpoint,
        p256dh: "partner-p256dh",
        auth_secret: "partner-auth"
      }
    ]);
  });
});

type ReadyDuo = Awaited<ReturnType<typeof createReadyDuo>>;

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

async function readPlayCounts(pool: pg.Pool, userId: string) {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{
      sessions: string;
      momentos: string;
      scheduled: string;
      notifications: string;
      awards: string;
    }>(`
      SELECT
        (SELECT count(*) FROM app.play_sessions) AS sessions,
        (SELECT count(*) FROM app.play_momentos) AS momentos,
        (SELECT count(*) FROM app.play_scheduled_sessions) AS scheduled,
        (SELECT count(*) FROM app.play_notifications) AS notifications,
        (SELECT count(*) FROM app.duo_xp_awards) AS awards
    `);
    const row = result.rows[0]!;

    return {
      sessions: Number(row.sessions),
      momentos: Number(row.momentos),
      scheduled: Number(row.scheduled),
      notifications: Number(row.notifications),
      awards: Number(row.awards)
    };
  });
}

async function createJogandoLibraryGame(
  pool: pg.Pool,
  duo: ReadyDuo,
  slug: string
): Promise<string> {
  const gameId = await insertCatalogGame(pool, slug);

  return withRuntimeUser(pool, duo.ownerUserId, async (client) => {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO app.duo_library_games (
          duo_id,
          catalog_game_id,
          status,
          added_by_user_id,
          status_updated_by_user_id
        )
        VALUES ($1, $2, 'jogando', $3, $3)
        RETURNING id
      `,
      [duo.duoId, gameId, duo.ownerUserId]
    );

    return result.rows[0]!.id;
  });
}

async function insertPlaySession(
  client: pg.PoolClient,
  duoId: string,
  libraryGameId: string,
  userId: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO app.play_sessions (
        duo_id,
        library_game_id,
        kind,
        status,
        started_at,
        ended_at,
        duration_seconds,
        created_by_user_id,
        updated_by_user_id
      )
      VALUES (
        $1,
        $2,
        'offline',
        'pending_confirmation',
        now() - interval '1 hour',
        now(),
        3600,
        $3,
        $3
      )
      RETURNING id
    `,
    [duoId, libraryGameId, userId]
  );

  return result.rows[0]!.id;
}

async function insertMomento(
  client: pg.PoolClient,
  duoId: string,
  libraryGameId: string,
  sessionId: string,
  userId: string,
  isSpoiler: boolean
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO app.play_momentos (
        duo_id,
        library_game_id,
        session_id,
        author_user_id,
        body,
        is_spoiler
      )
      VALUES ($1, $2, $3, $4, 'Virada memoravel no chefao final', $5)
      RETURNING id
    `,
    [duoId, libraryGameId, sessionId, userId, isSpoiler]
  );

  return result.rows[0]!.id;
}

async function insertScheduledSession(
  client: pg.PoolClient,
  duoId: string,
  libraryGameId: string,
  userId: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO app.play_scheduled_sessions (
        duo_id,
        library_game_id,
        scheduled_start_at,
        timezone,
        reminder_due_at,
        created_by_user_id,
        updated_by_user_id
      )
      VALUES (
        $1,
        $2,
        now() + interval '2 hours',
        'America/Sao_Paulo',
        now() + interval '90 minutes',
        $3,
        $3
      )
      RETURNING id
    `,
    [duoId, libraryGameId, userId]
  );

  return result.rows[0]!.id;
}

async function insertNotification(
  client: pg.PoolClient,
  duoId: string,
  userId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.play_notifications (
        duo_id,
        actor_user_id,
        notification_type,
        title,
        body
      )
      VALUES ($1, $2, 'session-confirmation', 'Confirmar sessao', 'A dupla precisa confirmar a sessao.')
    `,
    [duoId, userId]
  );
}

async function insertXpAward(
  client: pg.PoolClient,
  duoId: string,
  sourceId: string,
  userId: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.duo_xp_awards (
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        awarded_by_user_id
      )
      VALUES ($1, $2, 'offline-session', $3, 30, $4)
    `,
    [duoId, `offline-session:${sourceId}`, sourceId, userId]
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
