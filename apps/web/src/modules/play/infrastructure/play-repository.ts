import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  ActivePlayGameRecord,
  CurrentPlayGameRecord,
  CurrentPlayRecord,
  PlayMembershipContext,
  PlayNotificationInput,
  PlayNotificationRecord,
  PlayActivationLibraryGameRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlaySessionRecord,
  PlayUserId,
  PlayXpAwardInput,
  PlayXpAwardRecord
} from "../application/ports";
import type {
  PlayGameRole,
  PlayNotificationType,
  PlaySessionKind,
  PlaySessionStatus
} from "../domain/play-policy";

type MembershipRow = {
  duo_id: string;
  user_id: string;
};

type ActiveGameRow = {
  id: string;
  duo_id: string;
  library_game_id: string;
  catalog_game_id: string;
  role: PlayGameRole;
  position: number;
  updated_at: Date;
};

type CurrentPlayGameRow = ActiveGameRow & {
  library_status: string;
  game_slug: string;
  game_name: string;
  background_image_url: string | null;
  source: string;
  source_url: string;
  source_updated_at: Date | null;
  synced_at: Date;
  has_reliable_time_estimate: boolean;
  has_verified_availability: boolean;
  confirmed_coop_seconds: number | null;
  subjective_percent: number | null;
};

type ActivationLibraryGameRow = {
  id: string;
  duo_id: string;
  catalog_game_id: string;
  status: string;
  updated_at: Date;
};

type SessionRow = {
  id: string;
  duo_id: string;
  library_game_id: string;
  kind: PlaySessionKind;
  status: PlaySessionStatus;
  started_at: Date;
  ended_at: Date | null;
  duration_seconds: number | null;
  created_by_user_id: string;
};

type ConfirmationRow = {
  id: string;
  duo_id: string;
  session_id: string;
  user_id: string;
  confirmed_at: Date;
};

type NotificationRow = {
  id: string;
  duo_id: string;
  recipient_user_id: string | null;
  notification_type: PlayNotificationType;
  state: "unread" | "read" | "actioned" | "archived";
  action_ref_type: string | null;
  action_ref_id: string | null;
  title: string;
  body: string | null;
  created_at: Date;
};

type XpAwardRow = {
  id: string;
  duo_id: string;
  award_key: string;
  source_type: PlayXpAwardInput["sourceType"];
  source_id: string;
  amount: number;
  awarded_by_user_id: string | null;
  metadata: Record<string, unknown>;
  awarded_at: Date;
};

type JobRow = {
  id: string;
  duo_id: string;
  job_key: string;
  job_type: string;
  run_at: Date;
  status: PlayReminderJobRecord["status"];
  attempts: number;
  payload: Record<string, unknown>;
};

let runtimePool: QueueDbPool | undefined;
let defaultPlayRepository: PlayRepository | undefined;

export const playRepository: PlayRepository = {
  withUserTransaction: (...args) => getDefaultPlayRepository().withUserTransaction(...args),
  resolveMembership: (...args) => getDefaultPlayRepository().resolveMembership(...args),
  readCurrentPlay: (...args) => getDefaultPlayRepository().readCurrentPlay(...args),
  readActivePlayGames: (...args) => getDefaultPlayRepository().readActivePlayGames(...args),
  upsertActiveRoleRows: (...args) => getDefaultPlayRepository().upsertActiveRoleRows(...args),
  createSessionConfirmation: (...args) =>
    getDefaultPlayRepository().createSessionConfirmation(...args),
  cancelConfirmation: (...args) => getDefaultPlayRepository().cancelConfirmation(...args),
  insertNotificationItem: (...args) => getDefaultPlayRepository().insertNotificationItem(...args),
  insertXpAward: (...args) => getDefaultPlayRepository().insertXpAward(...args),
  claimDueReminderJobs: (...args) => getDefaultPlayRepository().claimDueReminderJobs(...args)
};

export function createPlayRepository(pool: QueueDbPool = getRuntimePool()): PlayRepository {
  return {
    withUserTransaction: (userId, callback) =>
      withAppUserTransaction(pool, userId, (client) =>
        callback(createTransaction(client))
      ),
    resolveMembership: (userId) =>
      withAppUserTransaction(pool, userId, (client) => resolveMembership(client, userId)),
    readCurrentPlay: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership ? readCurrentPlay(client, membership.duoId) : null;
      }),
    readActivePlayGames: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership ? readActivePlayGames(client, membership.duoId) : [];
      }),
    upsertActiveRoleRows: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);

        if (!membership) {
          return [];
        }

        return upsertActiveRoleRows(client, {
          duoId: membership.duoId,
          actorUserId: input.userId,
          games: input.games
        });
      }),
    createSessionConfirmation: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        createSessionConfirmation(client, input)
      ),
    cancelConfirmation: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        cancelPendingSessionConfirmation(client, input)
      ),
    insertNotificationItem: (input) =>
      withAppUserTransaction(pool, input.actorUserId ?? input.recipientUserId ?? "", (client) =>
        insertNotificationItem(client, input)
      ),
    insertXpAward: (input) =>
      withAppUserTransaction(pool, input.awardedByUserId ?? "", (client) =>
        insertXpAward(client, input)
      ),
    claimDueReminderJobs: (input) => claimDueReminderJobs(pool, input)
  };
}

function createTransaction(client: QueueDbClient): PlayRepositoryTransaction {
  return {
    resolveMembership: (userId) => resolveMembership(client, userId),
    lockActivePlaySet: (input) => lockActivePlaySet(client, input.duoId),
    readActivePlayGames: (input) => readActivePlayGames(client, input.duoId),
    readCurrentPlayGames: (input) => readCurrentPlayGames(client, input.duoId),
    readLibraryGameForActivation: (input) =>
      readLibraryGameForActivation(client, input),
    activatePlayingLibraryGame: (input) =>
      activatePlayingLibraryGame(client, input),
    deactivatePlayingLibraryGame: (input) =>
      deactivatePlayingLibraryGame(client, input),
    upsertActiveRoleRows: (input) => upsertActiveRoleRows(client, input),
    createSession: (input) => createSession(client, input),
    confirmSession: (input) =>
      createSessionConfirmation(client, {
        userId: input.userId,
        sessionId: input.sessionId
      }).then((confirmation) => {
        if (!confirmation) {
          throw new Error("play_session_confirmation_failed");
        }

        return confirmation;
      }),
    insertNotificationItem: (input) => insertNotificationItem(client, input),
    insertXpAward: (input) =>
      insertXpAward(client, input).then((award) => {
        if (!award) {
          throw new Error("play_xp_award_already_applied");
        }

        return award;
      })
  };
}

async function resolveMembership(
  client: QueueDbClient,
  userId: PlayUserId
): Promise<PlayMembershipContext | null> {
  const result = await client.query<MembershipRow>(
    `
      SELECT member.duo_id, member.user_id
      FROM app.duo_members AS member
      WHERE member.duo_id = (
        SELECT own.duo_id
        FROM app.duo_members AS own
        WHERE own.user_id = $1
        LIMIT 1
      )
      ORDER BY member.member_slot
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const memberUserIds = result.rows.map((row) => row.user_id);

  return {
    duoId: result.rows[0]!.duo_id,
    userId,
    partnerUserId: memberUserIds.find((memberUserId) => memberUserId !== userId) ?? null,
    memberUserIds
  };
}

async function readActivePlayGames(
  client: QueueDbClient,
  duoId: string
): Promise<ActivePlayGameRecord[]> {
  const result = await client.query<ActiveGameRow>(
    `
      SELECT
        active.id,
        active.duo_id,
        active.library_game_id,
        library.catalog_game_id,
        active.role,
        active.position,
        active.updated_at
      FROM app.play_active_games AS active
      INNER JOIN app.duo_library_games AS library
        ON library.id = active.library_game_id
      WHERE active.duo_id = $1
      ORDER BY active.position ASC
    `,
    [duoId]
  );

  return result.rows.map(mapActiveGame);
}

async function readCurrentPlay(
  client: QueueDbClient,
  duoId: string
): Promise<CurrentPlayRecord> {
  return createCurrentPlayRecord(await readCurrentPlayGames(client, duoId));
}

async function readCurrentPlayGames(
  client: QueueDbClient,
  duoId: string
): Promise<CurrentPlayGameRecord[]> {
  const result = await client.query<CurrentPlayGameRow>(
    `
      SELECT
        active.id,
        active.duo_id,
        active.library_game_id,
        library.catalog_game_id,
        library.status AS library_status,
        active.role,
        active.position,
        active.updated_at,
        game.slug AS game_slug,
        game.name AS game_name,
        game.background_image_url,
        game.source,
        game.source_url,
        game.source_updated_at,
        game.synced_at,
        EXISTS (
          SELECT 1
          FROM catalog.game_time_estimates AS estimate
          WHERE estimate.game_id = game.id
            AND estimate.minutes IS NOT NULL
            AND estimate.confidence IN ('verified', 'estimated')
        ) AS has_reliable_time_estimate,
        EXISTS (
          SELECT 1
          FROM catalog.game_availability AS availability
          WHERE availability.game_id = game.id
            AND availability.status = 'available'
        ) AS has_verified_availability,
        progress.confirmed_coop_seconds,
        progress.subjective_percent
      FROM app.play_active_games AS active
      INNER JOIN app.duo_library_games AS library
        ON library.id = active.library_game_id
      INNER JOIN catalog.games AS game
        ON game.id = library.catalog_game_id
      LEFT JOIN app.play_progress AS progress
        ON progress.library_game_id = library.id
      WHERE active.duo_id = $1
        AND library.status = 'jogando'
      ORDER BY active.position ASC
      LIMIT 3
    `,
    [duoId]
  );

  return result.rows.map(mapCurrentPlayGame);
}

async function readLibraryGameForActivation(
  client: QueueDbClient,
  input: {
    duoId: string;
    catalogGameId: string;
  }
): Promise<PlayActivationLibraryGameRecord | null> {
  const result = await client.query<ActivationLibraryGameRow>(
    `
      SELECT
        id,
        duo_id,
        catalog_game_id,
        status,
        updated_at
      FROM app.duo_library_games
      WHERE duo_id = $1
        AND catalog_game_id = $2
      LIMIT 1
      FOR UPDATE
    `,
    [input.duoId, input.catalogGameId]
  );
  const row = result.rows[0];

  return row
    ? {
        id: row.id,
        duoId: row.duo_id,
        catalogGameId: row.catalog_game_id,
        status: row.status,
        updatedAt: row.updated_at
      }
    : null;
}

async function activatePlayingLibraryGame(
  client: QueueDbClient,
  input: {
    duoId: string;
    actorUserId: string;
    libraryGameId: string;
    role: PlayGameRole;
    position: number;
  }
): Promise<ActivePlayGameRecord[]> {
  await client.query(
    `
      UPDATE app.duo_library_games
      SET status = 'jogando',
          status_updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
    `,
    [input.duoId, input.libraryGameId, input.actorUserId]
  );

  return upsertActiveRoleRows(client, {
    duoId: input.duoId,
    actorUserId: input.actorUserId,
    games: [
      {
        libraryGameId: input.libraryGameId,
        role: input.role,
        position: input.position
      }
    ]
  });
}

async function deactivatePlayingLibraryGame(
  client: QueueDbClient,
  input: {
    duoId: string;
    actorUserId: string;
    libraryGameId: string;
    nextStatus: "wishlist" | "pausado";
  }
): Promise<ActivePlayGameRecord[]> {
  await client.query(
    `
      UPDATE app.duo_library_games
      SET status = $3,
          status_updated_by_user_id = $4,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
    `,
    [input.duoId, input.libraryGameId, input.nextStatus, input.actorUserId]
  );
  await client.query(
    `
      DELETE FROM app.play_active_games
      WHERE duo_id = $1
        AND library_game_id = $2
    `,
    [input.duoId, input.libraryGameId]
  );

  return compactActivePlayRows(client, input.duoId, input.actorUserId);
}

async function upsertActiveRoleRows(
  client: QueueDbClient,
  input: {
    duoId: string;
    actorUserId: string;
    games: Array<{
      libraryGameId: string;
      role: PlayGameRole;
      position: number;
    }>;
  }
): Promise<ActivePlayGameRecord[]> {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `play-active:${input.duoId}`
  ]);

  for (const game of input.games) {
    await client.query(
      `
        INSERT INTO app.play_active_games (
          duo_id,
          library_game_id,
          role,
          position,
          added_by_user_id,
          updated_by_user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $5, now())
        ON CONFLICT (library_game_id) DO UPDATE
        SET role = excluded.role,
            position = excluded.position,
            updated_by_user_id = excluded.updated_by_user_id,
            updated_at = now()
      `,
      [input.duoId, game.libraryGameId, game.role, game.position, input.actorUserId]
    );
  }

  return readActivePlayGames(client, input.duoId);
}

async function compactActivePlayRows(
  client: QueueDbClient,
  duoId: string,
  actorUserId: string
): Promise<ActivePlayGameRecord[]> {
  const current = await readActivePlayGames(client, duoId);
  const compacted = current.map((game, index) => ({
    libraryGameId: game.libraryGameId,
    role: index === 0 ? "principal" as const : "secondary" as const,
    position: index + 1
  }));

  if (compacted.length === 0) {
    return [];
  }

  for (const game of compacted) {
    await client.query(
      `
        UPDATE app.play_active_games
        SET role = $3,
            position = $4,
            updated_by_user_id = $5,
            updated_at = now()
        WHERE duo_id = $1
          AND library_game_id = $2
      `,
      [duoId, game.libraryGameId, game.role, game.position, actorUserId]
    );
  }

  return readActivePlayGames(client, duoId);
}

async function lockActivePlaySet(client: QueueDbClient, duoId: string): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `play-active:${duoId}`
  ]);
}

async function createSession(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    kind: PlaySessionKind;
    status: PlaySessionStatus;
    startedAt?: Date;
    endedAt?: Date | null;
    durationSeconds?: number | null;
    actorUserId: string;
  }
): Promise<PlaySessionRecord> {
  const result = await client.query<SessionRow>(
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
        updated_by_user_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, coalesce($5::timestamptz, now()), $6, $7, $8, $8, now())
      RETURNING
        id,
        duo_id,
        library_game_id,
        kind,
        status,
        started_at,
        ended_at,
        duration_seconds,
        created_by_user_id
    `,
    [
      input.duoId,
      input.libraryGameId,
      input.kind,
      input.status,
      input.startedAt ?? null,
      input.endedAt ?? null,
      input.durationSeconds ?? null,
      input.actorUserId
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_session_create_failed");
  }

  return mapSession(row);
}

async function createSessionConfirmation(
  client: QueueDbClient,
  input: {
    userId: string;
    sessionId: string;
  }
) {
  const result = await client.query<ConfirmationRow>(
    `
      INSERT INTO app.play_session_confirmations (
        duo_id,
        session_id,
        user_id
      )
      SELECT session.duo_id, session.id, $2
      FROM app.play_sessions AS session
      WHERE session.id = $1
      ON CONFLICT (session_id, user_id) DO NOTHING
      RETURNING
        id,
        duo_id,
        session_id,
        user_id,
        confirmed_at
    `,
    [input.sessionId, input.userId]
  );
  const row = result.rows[0];

  return row
    ? {
        id: row.id,
        duoId: row.duo_id,
        effectId: row.session_id,
        userId: row.user_id,
        confirmedAt: row.confirmed_at
      }
    : null;
}

async function cancelPendingSessionConfirmation(
  client: QueueDbClient,
  input: {
    userId: string;
    sessionId: string;
  }
): Promise<void> {
  await client.query(
    `
      UPDATE app.play_sessions
      SET status = 'cancelled',
          updated_by_user_id = $2,
          updated_at = now()
      WHERE id = $1
        AND status = 'pending_confirmation'
    `,
    [input.sessionId, input.userId]
  );
}

async function insertNotificationItem(
  client: QueueDbClient,
  input: PlayNotificationInput
): Promise<PlayNotificationRecord> {
  const result = await client.query<NotificationRow>(
    `
      INSERT INTO app.play_notifications (
        duo_id,
        recipient_user_id,
        actor_user_id,
        notification_type,
        action_ref_type,
        action_ref_id,
        title,
        body,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8, now())
      RETURNING
        id,
        duo_id,
        recipient_user_id,
        notification_type,
        state,
        action_ref_type,
        action_ref_id,
        title,
        body,
        created_at
    `,
    [
      input.duoId,
      input.recipientUserId ?? null,
      input.actorUserId ?? null,
      input.notificationType,
      input.actionRefType ?? null,
      input.actionRefId ?? null,
      input.title,
      input.body ?? null
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_notification_insert_failed");
  }

  return mapNotification(row);
}

async function insertXpAward(
  client: QueueDbClient,
  input: PlayXpAwardInput
): Promise<PlayXpAwardRecord | null> {
  const result = await client.query<XpAwardRow>(
    `
      INSERT INTO app.duo_xp_awards (
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        awarded_by_user_id,
        metadata
      )
      VALUES ($1, $2, $3, $4::uuid, $5, $6, $7::jsonb)
      ON CONFLICT (duo_id, award_key) DO NOTHING
      RETURNING
        id,
        duo_id,
        award_key,
        source_type,
        source_id,
        amount,
        awarded_by_user_id,
        metadata,
        awarded_at
    `,
    [
      input.duoId,
      input.awardKey,
      input.sourceType,
      input.sourceId,
      input.amount,
      input.awardedByUserId ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  const row = result.rows[0];

  return row ? mapXpAward(row) : null;
}

async function claimDueReminderJobs(
  pool: QueueDbPool,
  input: {
    now: Date;
    limit: number;
    workerId: string;
  }
): Promise<PlayReminderJobRecord[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<JobRow>(
      `
        WITH due_jobs AS (
          SELECT id
          FROM ops.scheduled_jobs
          WHERE status IN ('pending', 'failed')
            AND run_at <= $1
          ORDER BY run_at ASC, id ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE ops.scheduled_jobs AS job
        SET status = 'claimed',
            attempts = attempts + 1,
            locked_at = $1,
            locked_by = $3,
            updated_at = now()
        FROM due_jobs
        WHERE job.id = due_jobs.id
        RETURNING
          job.id,
          job.duo_id,
          job.job_key,
          job.job_type,
          job.run_at,
          job.status,
          job.attempts,
          job.payload
      `,
      [input.now, Math.min(Math.max(input.limit, 1), 100), input.workerId]
    );
    await client.query("COMMIT");
    return result.rows.map(mapJob);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function mapActiveGame(row: ActiveGameRow): ActivePlayGameRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    catalogGameId: row.catalog_game_id,
    role: row.role,
    position: row.position,
    updatedAt: row.updated_at
  };
}

function mapCurrentPlayGame(row: CurrentPlayGameRow): CurrentPlayGameRecord {
  return {
    ...mapActiveGame(row),
    libraryStatus: row.library_status,
    catalogGame: {
      id: row.catalog_game_id,
      slug: row.game_slug,
      name: row.game_name,
      coverUrl: row.background_image_url,
      source: row.source,
      sourceUrl: row.source_url,
      sourceUpdatedAt: row.source_updated_at,
      syncedAt: row.synced_at,
      hasReliableTimeEstimate: row.has_reliable_time_estimate,
      hasVerifiedAvailability: row.has_verified_availability
    },
    progress: {
      confirmedCoopSeconds: Number(row.confirmed_coop_seconds ?? 0),
      subjectivePercent: row.subjective_percent
    }
  };
}

function createCurrentPlayRecord(games: CurrentPlayGameRecord[]): CurrentPlayRecord {
  return {
    games,
    principal: games.find((game) => game.role === "principal") ?? null,
    secondaries: games.filter((game) => game.role === "secondary"),
    limit: 3
  };
}

function mapSession(row: SessionRow): PlaySessionRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    kind: row.kind,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    createdByUserId: row.created_by_user_id
  };
}

function mapNotification(row: NotificationRow): PlayNotificationRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    recipientUserId: row.recipient_user_id,
    notificationType: row.notification_type,
    state: row.state,
    actionRefType: row.action_ref_type,
    actionRefId: row.action_ref_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at
  };
}

function mapXpAward(row: XpAwardRow): PlayXpAwardRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    awardKey: row.award_key,
    sourceType: row.source_type,
    sourceId: row.source_id,
    amount: row.amount,
    awardedByUserId: row.awarded_by_user_id,
    metadata: row.metadata,
    awardedAt: row.awarded_at
  };
}

function mapJob(row: JobRow): PlayReminderJobRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    jobKey: row.job_key,
    jobType: row.job_type,
    runAt: row.run_at,
    status: row.status,
    attempts: row.attempts,
    payload: row.payload
  };
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function getDefaultPlayRepository(): PlayRepository {
  defaultPlayRepository ??= createPlayRepository(getRuntimePool());
  return defaultPlayRepository;
}
