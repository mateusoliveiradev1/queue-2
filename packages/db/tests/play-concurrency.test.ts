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

describe.skipIf(!testDatabaseUrl)("play database-backed concurrency invariants", () => {
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

  test("concurrent Principal promotions converge to exactly one Principal", async () => {
    const duo = await createReadyDuo(pool, "play-principal-race");
    const firstLibraryGameId = await createJogandoLibraryGame(pool, duo, "principal-race-a");
    const secondLibraryGameId = await createJogandoLibraryGame(pool, duo, "principal-race-b");

    await withRuntimeUser(pool, duo.ownerUserId, async (client) => {
      await insertActiveGame(client, duo, firstLibraryGameId, "secondary", 2);
      await insertActiveGame(client, duo, secondLibraryGameId, "secondary", 3);
    });

    const results = await Promise.allSettled([
      promoteToPrincipal(pool, duo.ownerUserId, firstLibraryGameId),
      promoteToPrincipal(pool, duo.partnerUserId, secondLibraryGameId)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(readPrincipalCount(pool, duo.ownerUserId, duo.duoId)).resolves.toBe(1);
  });

  test("concurrent live session starts cannot both remain active", async () => {
    const duo = await createReadyDuo(pool, "play-live-race");
    const libraryGameId = await createJogandoLibraryGame(pool, duo, "live-race-game");

    const results = await Promise.allSettled([
      insertLiveSession(pool, duo.ownerUserId, duo.duoId, libraryGameId),
      insertLiveSession(pool, duo.partnerUserId, duo.duoId, libraryGameId)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(readActiveLiveCount(pool, duo.ownerUserId, duo.duoId)).resolves.toBe(1);
  });

  test("replayed confirmations and XP awards are stored once", async () => {
    const duo = await createReadyDuo(pool, "play-idempotency");
    const libraryGameId = await createJogandoLibraryGame(pool, duo, "idempotency-game");
    const sessionId = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      insertPendingSession(client, duo.duoId, libraryGameId, duo.ownerUserId)
    );

    const confirmationResults = await Promise.allSettled([
      insertSessionConfirmation(pool, duo.ownerUserId, sessionId),
      insertSessionConfirmation(pool, duo.ownerUserId, sessionId)
    ]);
    const awardKey = `offline-session:${sessionId}`;
    const xpResults = await Promise.allSettled([
      insertXpAward(pool, duo.ownerUserId, duo.duoId, sessionId, awardKey),
      insertXpAward(pool, duo.partnerUserId, duo.duoId, sessionId, awardKey)
    ]);

    expect(confirmationResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(confirmationResults.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(xpResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(xpResults.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(readConfirmationCount(pool, duo.ownerUserId, sessionId)).resolves.toBe(1);
    await expect(readXpAwardCount(pool, duo.ownerUserId, duo.duoId, awardKey)).resolves.toBe(1);
  });

  test("replayed scheduled attendance confirmations are stored once", async () => {
    const duo = await createReadyDuo(pool, "play-scheduled-idempotency");
    const libraryGameId = await createJogandoLibraryGame(pool, duo, "scheduled-idempotency-game");
    const scheduledSessionId = await withRuntimeUser(pool, duo.ownerUserId, (client) =>
      insertScheduledSession(client, duo.duoId, libraryGameId, duo.ownerUserId)
    );

    const attendanceResults = await Promise.allSettled([
      insertScheduledAttendance(pool, duo.ownerUserId, scheduledSessionId),
      insertScheduledAttendance(pool, duo.ownerUserId, scheduledSessionId)
    ]);

    expect(attendanceResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attendanceResults.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(readScheduledAttendanceCount(pool, duo.ownerUserId, scheduledSessionId)).resolves.toBe(1);
  });
});

type ReadyDuo = Awaited<ReturnType<typeof createReadyDuo>>;
type PlayGameRole = "principal" | "secondary";

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

async function insertActiveGame(
  client: pg.PoolClient,
  duo: ReadyDuo,
  libraryGameId: string,
  role: PlayGameRole,
  position: number
): Promise<void> {
  await client.query(
    `
      INSERT INTO app.play_active_games (
        duo_id,
        library_game_id,
        role,
        position,
        added_by_user_id,
        updated_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $5)
    `,
    [duo.duoId, libraryGameId, role, position, duo.ownerUserId]
  );
}

async function promoteToPrincipal(
  pool: pg.Pool,
  userId: string,
  libraryGameId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        UPDATE app.play_active_games
        SET role = 'principal',
            position = 1,
            updated_by_user_id = $2,
            updated_at = now()
        WHERE library_game_id = $1
      `,
      [libraryGameId, userId]
    );
  });
}

async function insertLiveSession(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  libraryGameId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.play_sessions (
          duo_id,
          library_game_id,
          kind,
          status,
          created_by_user_id,
          updated_by_user_id
        )
        VALUES ($1, $2, 'live', 'active', $3, $3)
      `,
      [duoId, libraryGameId, userId]
    );
  });
}

async function insertPendingSession(
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

async function insertScheduledAttendance(
  pool: pg.Pool,
  userId: string,
  scheduledSessionId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.play_scheduled_attendance (
          duo_id,
          scheduled_session_id,
          user_id
        )
        SELECT duo_id, id, $2
        FROM app.play_scheduled_sessions
        WHERE id = $1
      `,
      [scheduledSessionId, userId]
    );
  });
}

async function insertSessionConfirmation(
  pool: pg.Pool,
  userId: string,
  sessionId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.play_session_confirmations (
          duo_id,
          session_id,
          user_id
        )
        SELECT duo_id, id, $2
        FROM app.play_sessions
        WHERE id = $1
      `,
      [sessionId, userId]
    );
  });
}

async function insertXpAward(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  sourceId: string,
  awardKey: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
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
      [duoId, awardKey, sourceId, userId]
    );
  });
}

async function readPrincipalCount(
  pool: pg.Pool,
  userId: string,
  duoId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.play_active_games
        WHERE duo_id = $1
          AND role = 'principal'
      `,
      [duoId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readActiveLiveCount(
  pool: pg.Pool,
  userId: string,
  duoId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.play_sessions
        WHERE duo_id = $1
          AND kind = 'live'
          AND status = 'active'
      `,
      [duoId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readConfirmationCount(
  pool: pg.Pool,
  userId: string,
  sessionId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.play_session_confirmations
        WHERE session_id = $1
      `,
      [sessionId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readScheduledAttendanceCount(
  pool: pg.Pool,
  userId: string,
  scheduledSessionId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.play_scheduled_attendance
        WHERE scheduled_session_id = $1
      `,
      [scheduledSessionId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readXpAwardCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  awardKey: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.duo_xp_awards
        WHERE duo_id = $1
          AND award_key = $2
      `,
      [duoId, awardKey]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
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
