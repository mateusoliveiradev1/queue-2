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
  GameTimelineRecord,
  GamePlayDetailRecord,
  PlayChapterRecord,
  PlayMembershipContext,
  PlayMomentoRecord,
  PlayNotificationCenterRecord,
  PlayNotificationInput,
  PlayNotificationRecord,
  PlayActivationLibraryGameRecord,
  PlayProgressRecord,
  PlayPushSubscriptionInput,
  PlayPushSubscriptionRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlayScheduledSessionRecord,
  PlaySessionDetailRecord,
  PlaySessionRecord,
  PlayTimelineEvent,
  PlayTimelineMilestoneRecord,
  PlayTerminalRequestRecord,
  PlayUserId,
  PlayXpAwardInput,
  PlayXpAwardRecord
} from "../application/ports";
import {
  classifyTimelineMilestones,
  getTimelineMilestoneCopy,
  type TimelineMilestoneKind
} from "../domain/milestone-policy";
import type {
  PlayGameRole,
  PlayNotificationType,
  PlaySessionKind,
  PlaySessionStatus,
  TerminalTargetStatus
} from "../domain/play-policy";

type MembershipRow = {
  duo_id: string;
  user_id: string;
};

type DuoTimezoneRow = {
  timezone: string | null;
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

type SessionDetailRow = SessionRow & {
  confirmed_by_user_ids: string[];
  confirmation_count: number;
};

type ProgressRow = {
  duo_id: string;
  library_game_id: string;
  confirmed_coop_seconds: number;
  subjective_percent: number | null;
  updated_at: Date;
};

type ChapterRow = {
  id: string;
  duo_id: string;
  library_game_id: string;
  title: string;
  position: number;
  completed_at: Date | null;
  completed_by_user_id: string | null;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

type ConfirmationRow = {
  id: string;
  duo_id: string;
  session_id: string;
  user_id: string;
  confirmed_at: Date;
};

type TerminalRequestRow = {
  id: string;
  duo_id: string;
  library_game_id: string;
  target_status: TerminalTargetStatus;
  status: "pending" | "confirmed" | "cancelled";
  requested_by_user_id: string;
  confirmed_by_user_id: string | null;
  cancelled_by_user_id: string | null;
  updated_at: Date;
};

type ScheduledSessionRow = {
  id: string;
  duo_id: string;
  library_game_id: string;
  scheduled_start_at: Date;
  timezone: string;
  status: PlayScheduledSessionRecord["status"];
  reminder_due_at: Date;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  confirmed_by_user_ids: string[];
  confirmation_count: number;
};

type MomentoRow = {
  id: string;
  duo_id: string;
  library_game_id: string;
  session_id: string | null;
  author_user_id: string;
  body: string;
  is_spoiler: boolean;
  revealed_for_viewer: boolean;
  created_at: Date;
  updated_at: Date;
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

type PushSubscriptionRow = {
  id: string;
  duo_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  enabled: boolean;
  updated_at: Date;
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
  readGamePlayDetail: (...args) => getDefaultPlayRepository().readGamePlayDetail(...args),
  readGameTimeline: (...args) => getDefaultPlayRepository().readGameTimeline(...args),
  readActivePlayGames: (...args) => getDefaultPlayRepository().readActivePlayGames(...args),
  upsertActiveRoleRows: (...args) => getDefaultPlayRepository().upsertActiveRoleRows(...args),
  createSessionConfirmation: (...args) =>
    getDefaultPlayRepository().createSessionConfirmation(...args),
  cancelConfirmation: (...args) => getDefaultPlayRepository().cancelConfirmation(...args),
  insertNotificationItem: (...args) => getDefaultPlayRepository().insertNotificationItem(...args),
  insertXpAward: (...args) => getDefaultPlayRepository().insertXpAward(...args),
  readNotificationCenter: (...args) => getDefaultPlayRepository().readNotificationCenter(...args),
  registerPushSubscription: (...args) =>
    getDefaultPlayRepository().registerPushSubscription(...args),
  disablePushSubscriptions: (...args) =>
    getDefaultPlayRepository().disablePushSubscriptions(...args),
  claimDueReminderJobs: (...args) => getDefaultPlayRepository().claimDueReminderJobs(...args),
  completeReminderJob: (...args) => getDefaultPlayRepository().completeReminderJob(...args),
  failReminderJob: (...args) => getDefaultPlayRepository().failReminderJob(...args),
  runAsUser: (...args) => getDefaultPlayRepository().runAsUser(...args),
  readEnabledPushSubscriptions: (...args) =>
    getDefaultPlayRepository().readEnabledPushSubscriptions(...args)
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
    readGamePlayDetail: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership
          ? readGamePlayDetail(client, {
              duoId: membership.duoId,
              catalogGameId: input.catalogGameId,
              memberUserIds: membership.memberUserIds
            })
          : null;
      }),
    readGameTimeline: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership
          ? readGameTimeline(client, {
              duoId: membership.duoId,
              catalogGameId: input.catalogGameId,
              estimatedMinutes: input.estimatedMinutes,
              memberUserIds: membership.memberUserIds,
              viewerUserId: input.userId
            })
          : null;
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
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership
          ? createSessionConfirmation(client, {
              ...input,
              duoId: membership.duoId
            })
          : null;
      }),
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
    readNotificationCenter: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership
          ? readNotificationCenter(client, {
              duoId: membership.duoId,
              limit: input.limit
            })
          : null;
      }),
    registerPushSubscription: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const membership = await resolveMembership(client, input.userId);
        return membership
          ? registerPushSubscription(client, {
              ...input,
              duoId: membership.duoId
            })
          : null;
      }),
    disablePushSubscriptions: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        disablePushSubscriptions(client, input)
      ),
    claimDueReminderJobs: (input) => claimDueReminderJobs(pool, input),
    completeReminderJob: (input) => completeReminderJob(pool, input),
    failReminderJob: (input) => failReminderJob(pool, input),
    runAsUser: (userId, callback) =>
      withAppUserTransaction(pool, userId, (client) =>
        callback(createTransaction(client))
      ),
    readEnabledPushSubscriptions: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        readEnabledPushSubscriptions(client, input.userId)
      )
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
    replaceActiveRoleRows: (input) => replaceActiveRoleRows(client, input),
    createSession: (input) => createSession(client, input),
    confirmSession: (input) =>
      createSessionConfirmation(client, {
        duoId: input.duoId,
        userId: input.userId,
        sessionId: input.sessionId
      }),
    readGamePlayDetail: async (input) => {
      const membership = await resolveMembershipByDuo(client, input.duoId);
      return readGamePlayDetail(client, {
        duoId: input.duoId,
        catalogGameId: input.catalogGameId,
        memberUserIds: membership
      });
    },
    readGameTimeline: async (input) => {
      const membership = await resolveMembershipByDuo(client, input.duoId);
      return readGameTimeline(client, {
        ...input,
        memberUserIds: membership
      });
    },
    readActiveLiveSession: (input) => readActiveLiveSession(client, input.duoId),
    endLiveSession: (input) => endLiveSession(client, input),
    readSessionDetail: async (input) => {
      const membership = await resolveMembershipByDuo(client, input.duoId);
      return readSessionDetail(client, {
        ...input,
        memberUserIds: membership
      });
    },
    applyConfirmedSessionEffects: (input) =>
      applyConfirmedSessionEffects(client, input),
    updateProgressPercent: (input) => updateProgressPercent(client, input),
    createChapter: (input) => createChapter(client, input),
    setChapterCompletion: (input) => setChapterCompletion(client, input),
    createTerminalRequest: (input) => createTerminalRequest(client, input),
    cancelTerminalRequest: (input) => cancelTerminalRequest(client, input),
    confirmTerminalRequest: (input) => confirmTerminalRequest(client, input),
    readDuoTimezone: (input) => readDuoTimezone(client, input.duoId),
    createScheduledSession: (input) => createScheduledSession(client, input),
    updateScheduledSession: (input) => updateScheduledSession(client, input),
    cancelScheduledSession: (input) => cancelScheduledSession(client, input),
    readScheduledSessionDetail: (input) => readScheduledSessionDetail(client, input),
    confirmScheduledAttendance: (input) => confirmScheduledAttendance(client, input),
    insertReminderJob: (input) => insertReminderJob(client, input),
    registerPushSubscription: async (input) => {
      const membership = await resolveMembership(client, input.userId);

      if (!membership) {
        throw new Error("play_push_membership_required");
      }

      return registerPushSubscription(client, {
        ...input,
        duoId: membership.duoId
      });
    },
    disablePushSubscriptions: (input) => disablePushSubscriptions(client, input),
    createMomento: (input) => createMomento(client, input),
    revealMomento: (input) => revealMomento(client, input),
    insertNotificationItem: (input) => insertNotificationItem(client, input),
    markNotificationsActioned: (input) => markNotificationsActioned(client, input),
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

async function resolveMembershipByDuo(
  client: QueueDbClient,
  duoId: string
): Promise<string[]> {
  const result = await client.query<MembershipRow>(
    `
      SELECT duo_id, user_id
      FROM app.duo_members
      WHERE duo_id = $1
      ORDER BY member_slot
    `,
    [duoId]
  );

  return result.rows.map((row) => row.user_id);
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

async function readGamePlayDetail(
  client: QueueDbClient,
  input: {
    duoId: string;
    catalogGameId: string;
    memberUserIds: string[];
  }
): Promise<GamePlayDetailRecord | null> {
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
    `,
    [input.duoId, input.catalogGameId]
  );
  const libraryGame = result.rows[0];

  if (!libraryGame) {
    return null;
  }

  const duoTimezone = await readDuoTimezone(client, input.duoId);
  const currentGames = await readCurrentPlayGames(client, input.duoId);
  const activeLiveSession = await readActiveLiveSession(client, input.duoId);
  const pendingSessions = await readPendingSessionsForLibraryGame(client, {
    duoId: input.duoId,
    libraryGameId: libraryGame.id,
    memberUserIds: input.memberUserIds
  });
  const progress = await readProgress(client, input.duoId, libraryGame.id);
  const chapters = await readChapters(client, input.duoId, libraryGame.id);
  const terminalRequest = await readPendingTerminalRequest(client, input.duoId, libraryGame.id);
  const scheduledSessions = await readScheduledSessionsForLibraryGame(client, {
    duoId: input.duoId,
    libraryGameId: libraryGame.id,
    memberUserIds: input.memberUserIds
  });

  return {
    duoId: input.duoId,
    duoTimezone,
    libraryGameId: libraryGame.id,
    catalogGameId: libraryGame.catalog_game_id,
    libraryStatus: libraryGame.status,
    activeGame: currentGames.find((game) => game.libraryGameId === libraryGame.id) ?? null,
    activeLiveSession:
      activeLiveSession?.libraryGameId === libraryGame.id ? activeLiveSession : null,
    pendingSessions,
    progress,
    chapters,
    terminalRequest,
    scheduledSessions
  };
}

async function readGameTimeline(
  client: QueueDbClient,
  input: {
    duoId: string;
    catalogGameId: string;
    estimatedMinutes: number | null;
    memberUserIds: string[];
    viewerUserId: string;
  }
): Promise<GameTimelineRecord | null> {
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
    `,
    [input.duoId, input.catalogGameId]
  );
  const libraryGame = result.rows[0];

  if (!libraryGame) {
    return null;
  }

  const timezone = await readDuoTimezone(client, input.duoId);
  const sessions = await readConfirmedSessionsForLibraryGame(client, {
    duoId: input.duoId,
    libraryGameId: libraryGame.id,
    memberUserIds: input.memberUserIds
  });
  const chapters = await readChapters(client, input.duoId, libraryGame.id);
  const momentos = await readMomentosForLibraryGame(client, {
    duoId: input.duoId,
    libraryGameId: libraryGame.id,
    viewerUserId: input.viewerUserId
  });

  const sessionEvents: PlayTimelineEvent[] = sessions.map((session) => ({
    id: `session:${session.id}`,
    type: "session",
    occurredAt: session.endedAt ?? session.startedAt,
    session
  }));
  const chapterEvents: PlayTimelineEvent[] = chapters
    .filter((chapter) => chapter.completedAt)
    .map((chapter) => ({
      id: `chapter:${chapter.id}`,
      type: "chapter",
      occurredAt: chapter.completedAt ?? chapter.updatedAt,
      chapter
    }));
  const momentoEvents: PlayTimelineEvent[] = momentos.map((momento) => ({
    id: `momento:${momento.id}`,
    type: "momento",
    occurredAt: momento.createdAt,
    momento
  }));
  const milestoneEvents = buildMilestoneEvents({
    estimatedMinutes: input.estimatedMinutes,
    sessions,
    timezone
  });
  const events = [
    ...sessionEvents,
    ...chapterEvents,
    ...milestoneEvents,
    ...momentoEvents
  ].sort((first, second) => first.occurredAt.getTime() - second.occurredAt.getTime());

  return {
    duoId: input.duoId,
    libraryGameId: libraryGame.id,
    catalogGameId: libraryGame.catalog_game_id,
    events
  };
}

async function readDuoTimezone(client: QueueDbClient, duoId: string): Promise<string> {
  const result = await client.query<DuoTimezoneRow>(
    `
      SELECT timezone
      FROM app.duos
      WHERE id = $1
      LIMIT 1
    `,
    [duoId]
  );

  return result.rows[0]?.timezone ?? "UTC";
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

async function readActiveLiveSession(
  client: QueueDbClient,
  duoId: string
): Promise<PlaySessionRecord | null> {
  const result = await client.query<SessionRow>(
    `
      SELECT
        id,
        duo_id,
        library_game_id,
        kind,
        status,
        started_at,
        ended_at,
        duration_seconds,
        created_by_user_id
      FROM app.play_sessions
      WHERE duo_id = $1
        AND kind = 'live'
        AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [duoId]
  );
  const row = result.rows[0];

  return row ? mapSession(row) : null;
}

async function readPendingSessionsForLibraryGame(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    memberUserIds: string[];
  }
): Promise<PlaySessionDetailRecord[]> {
  const result = await client.query<SessionDetailRow>(
    `
      SELECT
        session.id,
        session.duo_id,
        session.library_game_id,
        session.kind,
        session.status,
        session.started_at,
        session.ended_at,
        session.duration_seconds,
        session.created_by_user_id,
        coalesce(array_agg(confirmation.user_id ORDER BY confirmation.confirmed_at) FILTER (WHERE confirmation.user_id IS NOT NULL), ARRAY[]::text[]) AS confirmed_by_user_ids,
        count(confirmation.user_id)::int AS confirmation_count
      FROM app.play_sessions AS session
      LEFT JOIN app.play_session_confirmations AS confirmation
        ON confirmation.session_id = session.id
      WHERE session.duo_id = $1
        AND session.library_game_id = $2
        AND session.status = 'pending_confirmation'
      GROUP BY session.id
      ORDER BY session.updated_at DESC
      LIMIT 8
    `,
    [input.duoId, input.libraryGameId]
  );

  return result.rows.map((row) => mapSessionDetail(row, input.memberUserIds));
}

async function readConfirmedSessionsForLibraryGame(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    memberUserIds: string[];
  }
): Promise<PlaySessionDetailRecord[]> {
  const result = await client.query<SessionDetailRow>(
    `
      SELECT
        session.id,
        session.duo_id,
        session.library_game_id,
        session.kind,
        session.status,
        session.started_at,
        session.ended_at,
        session.duration_seconds,
        session.created_by_user_id,
        coalesce(array_agg(confirmation.user_id ORDER BY confirmation.confirmed_at) FILTER (WHERE confirmation.user_id IS NOT NULL), ARRAY[]::text[]) AS confirmed_by_user_ids,
        count(confirmation.user_id)::int AS confirmation_count
      FROM app.play_sessions AS session
      LEFT JOIN app.play_session_confirmations AS confirmation
        ON confirmation.session_id = session.id
      WHERE session.duo_id = $1
        AND session.library_game_id = $2
        AND session.status = 'confirmed'
      GROUP BY session.id
      ORDER BY coalesce(session.ended_at, session.started_at) ASC
      LIMIT 100
    `,
    [input.duoId, input.libraryGameId]
  );

  return result.rows.map((row) => mapSessionDetail(row, input.memberUserIds));
}

async function readSessionDetail(
  client: QueueDbClient,
  input: {
    duoId: string;
    sessionId: string;
    memberUserIds: string[];
  }
): Promise<PlaySessionDetailRecord | null> {
  const result = await client.query<SessionDetailRow>(
    `
      SELECT
        session.id,
        session.duo_id,
        session.library_game_id,
        session.kind,
        session.status,
        session.started_at,
        session.ended_at,
        session.duration_seconds,
        session.created_by_user_id,
        coalesce(array_agg(confirmation.user_id ORDER BY confirmation.confirmed_at) FILTER (WHERE confirmation.user_id IS NOT NULL), ARRAY[]::text[]) AS confirmed_by_user_ids,
        count(confirmation.user_id)::int AS confirmation_count
      FROM app.play_sessions AS session
      LEFT JOIN app.play_session_confirmations AS confirmation
        ON confirmation.session_id = session.id
      WHERE session.duo_id = $1
        AND session.id = $2
      GROUP BY session.id
      LIMIT 1
    `,
    [input.duoId, input.sessionId]
  );
  const row = result.rows[0];

  return row ? mapSessionDetail(row, input.memberUserIds) : null;
}

async function readProgress(
  client: QueueDbClient,
  duoId: string,
  libraryGameId: string
): Promise<PlayProgressRecord> {
  const result = await client.query<ProgressRow>(
    `
      SELECT
        duo_id,
        library_game_id,
        confirmed_coop_seconds,
        subjective_percent,
        updated_at
      FROM app.play_progress
      WHERE duo_id = $1
        AND library_game_id = $2
      LIMIT 1
    `,
    [duoId, libraryGameId]
  );
  const row = result.rows[0];

  return row
    ? mapProgress(row)
    : {
        duoId,
        libraryGameId,
        confirmedCoopSeconds: 0,
        subjectivePercent: null,
        updatedAt: new Date(0)
      };
}

async function readChapters(
  client: QueueDbClient,
  duoId: string,
  libraryGameId: string
): Promise<PlayChapterRecord[]> {
  const result = await client.query<ChapterRow>(
    `
      SELECT
        id,
        duo_id,
        library_game_id,
        title,
        position,
        completed_at,
        completed_by_user_id,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
      FROM app.play_chapters
      WHERE duo_id = $1
        AND library_game_id = $2
      ORDER BY position ASC, created_at ASC
    `,
    [duoId, libraryGameId]
  );

  return result.rows.map(mapChapter);
}

async function readPendingTerminalRequest(
  client: QueueDbClient,
  duoId: string,
  libraryGameId: string
): Promise<PlayTerminalRequestRecord | null> {
  const result = await client.query<TerminalRequestRow>(
    `
      SELECT
        id,
        duo_id,
        library_game_id,
        target_status,
        status,
        requested_by_user_id,
        confirmed_by_user_id,
        cancelled_by_user_id,
        updated_at
      FROM app.play_terminal_requests
      WHERE duo_id = $1
        AND library_game_id = $2
        AND status = 'pending'
      LIMIT 1
    `,
    [duoId, libraryGameId]
  );
  const row = result.rows[0];

  return row ? mapTerminalRequest(row) : null;
}

async function readScheduledSessionsForLibraryGame(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    memberUserIds: string[];
  }
): Promise<PlayScheduledSessionRecord[]> {
  const result = await client.query<ScheduledSessionRow>(
    `
      SELECT
        scheduled.id,
        scheduled.duo_id,
        scheduled.library_game_id,
        scheduled.scheduled_start_at,
        scheduled.timezone,
        scheduled.status,
        scheduled.reminder_due_at,
        scheduled.created_by_user_id,
        scheduled.updated_by_user_id,
        scheduled.created_at,
        scheduled.updated_at,
        coalesce(array_agg(attendance.user_id ORDER BY attendance.confirmed_at) FILTER (WHERE attendance.user_id IS NOT NULL), ARRAY[]::text[]) AS confirmed_by_user_ids,
        count(attendance.user_id)::int AS confirmation_count
      FROM app.play_scheduled_sessions AS scheduled
      LEFT JOIN app.play_scheduled_attendance AS attendance
        ON attendance.scheduled_session_id = scheduled.id
      WHERE scheduled.duo_id = $1
        AND scheduled.library_game_id = $2
        AND scheduled.status <> 'cancelled'
      GROUP BY scheduled.id
      ORDER BY scheduled.scheduled_start_at ASC
      LIMIT 12
    `,
    [input.duoId, input.libraryGameId]
  );

  return result.rows.map((row) => mapScheduledSession(row, input.memberUserIds));
}

async function readScheduledSessionDetail(
  client: QueueDbClient,
  input: {
    duoId: string;
    scheduledSessionId: string;
    memberUserIds: string[];
  }
): Promise<PlayScheduledSessionRecord | null> {
  const result = await client.query<ScheduledSessionRow>(
    `
      SELECT
        scheduled.id,
        scheduled.duo_id,
        scheduled.library_game_id,
        scheduled.scheduled_start_at,
        scheduled.timezone,
        scheduled.status,
        scheduled.reminder_due_at,
        scheduled.created_by_user_id,
        scheduled.updated_by_user_id,
        scheduled.created_at,
        scheduled.updated_at,
        coalesce(array_agg(attendance.user_id ORDER BY attendance.confirmed_at) FILTER (WHERE attendance.user_id IS NOT NULL), ARRAY[]::text[]) AS confirmed_by_user_ids,
        count(attendance.user_id)::int AS confirmation_count
      FROM app.play_scheduled_sessions AS scheduled
      LEFT JOIN app.play_scheduled_attendance AS attendance
        ON attendance.scheduled_session_id = scheduled.id
      WHERE scheduled.duo_id = $1
        AND scheduled.id = $2
      GROUP BY scheduled.id
      LIMIT 1
    `,
    [input.duoId, input.scheduledSessionId]
  );
  const row = result.rows[0];

  return row ? mapScheduledSession(row, input.memberUserIds) : null;
}

async function createScheduledSession(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    scheduledStartAt: Date;
    timezone: string;
    reminderDueAt: Date;
    actorUserId: string;
    memberUserIds: string[];
  }
): Promise<PlayScheduledSessionRecord> {
  const result = await client.query<ScheduledSessionRow>(
    `
      INSERT INTO app.play_scheduled_sessions (
        duo_id,
        library_game_id,
        scheduled_start_at,
        timezone,
        reminder_due_at,
        created_by_user_id,
        updated_by_user_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $6, now())
      RETURNING
        id,
        duo_id,
        library_game_id,
        scheduled_start_at,
        timezone,
        status,
        reminder_due_at,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at,
        ARRAY[]::text[] AS confirmed_by_user_ids,
        0::int AS confirmation_count
    `,
    [
      input.duoId,
      input.libraryGameId,
      input.scheduledStartAt,
      input.timezone,
      input.reminderDueAt,
      input.actorUserId
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_scheduled_session_create_failed");
  }

  return mapScheduledSession(row, input.memberUserIds);
}

async function updateScheduledSession(
  client: QueueDbClient,
  input: {
    duoId: string;
    scheduledSessionId: string;
    libraryGameId: string;
    scheduledStartAt: Date;
    timezone: string;
    reminderDueAt: Date;
    actorUserId: string;
    memberUserIds: string[];
  }
): Promise<PlayScheduledSessionRecord | null> {
  const result = await client.query<ScheduledSessionRow>(
    `
      UPDATE app.play_scheduled_sessions
      SET library_game_id = $3,
          scheduled_start_at = $4,
          timezone = $5,
          reminder_due_at = $6,
          status = 'scheduled',
          updated_by_user_id = $7,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
        AND status = 'scheduled'
      RETURNING
        id,
        duo_id,
        library_game_id,
        scheduled_start_at,
        timezone,
        status,
        reminder_due_at,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at,
        ARRAY[]::text[] AS confirmed_by_user_ids,
        0::int AS confirmation_count
    `,
    [
      input.duoId,
      input.scheduledSessionId,
      input.libraryGameId,
      input.scheduledStartAt,
      input.timezone,
      input.reminderDueAt,
      input.actorUserId
    ]
  );
  const row = result.rows[0];

  return row ? mapScheduledSession(row, input.memberUserIds) : null;
}

async function cancelScheduledSession(
  client: QueueDbClient,
  input: {
    duoId: string;
    scheduledSessionId: string;
    actorUserId: string;
    memberUserIds: string[];
  }
): Promise<PlayScheduledSessionRecord | null> {
  const result = await client.query<ScheduledSessionRow>(
    `
      UPDATE app.play_scheduled_sessions
      SET status = 'cancelled',
          updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
        AND status = 'scheduled'
      RETURNING
        id,
        duo_id,
        library_game_id,
        scheduled_start_at,
        timezone,
        status,
        reminder_due_at,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at,
        ARRAY[]::text[] AS confirmed_by_user_ids,
        0::int AS confirmation_count
    `,
    [input.duoId, input.scheduledSessionId, input.actorUserId]
  );
  const row = result.rows[0];

  return row ? mapScheduledSession(row, input.memberUserIds) : null;
}

async function confirmScheduledAttendance(
  client: QueueDbClient,
  input: {
    duoId: string;
    scheduledSessionId: string;
    actorUserId: string;
    memberUserIds: string[];
  }
): Promise<PlayScheduledSessionRecord | null> {
  await client.query(
    `
      INSERT INTO app.play_scheduled_attendance (
        duo_id,
        scheduled_session_id,
        user_id
      )
      SELECT $1, scheduled.id, $3
      FROM app.play_scheduled_sessions AS scheduled
      WHERE scheduled.duo_id = $1
        AND scheduled.id = $2
        AND scheduled.status = 'scheduled'
      ON CONFLICT (scheduled_session_id, user_id) DO NOTHING
    `,
    [input.duoId, input.scheduledSessionId, input.actorUserId]
  );

  return readScheduledSessionDetail(client, input);
}

async function insertReminderJob(
  client: QueueDbClient,
  input: {
    duoId: string;
    scheduledSessionId: string;
    runAt: Date;
    scheduledStartAt: Date;
    createdByUserId: string;
  }
): Promise<PlayReminderJobRecord> {
  const jobKey = `play-session-reminder:${input.scheduledSessionId}:${input.runAt.toISOString()}`;
  const payload = {
    createdByUserId: input.createdByUserId,
    scheduledSessionId: input.scheduledSessionId,
    scheduledStartAt: input.scheduledStartAt.toISOString()
  };
  const result = await client.query<JobRow>(
    `
      INSERT INTO ops.scheduled_jobs (
        duo_id,
        job_key,
        job_type,
        run_at,
        payload
      )
      VALUES ($1, $2, 'play-session-reminder', $3, $4::jsonb)
      ON CONFLICT (job_key) DO NOTHING
      RETURNING
        id,
        duo_id,
        job_key,
        job_type,
        run_at,
        status,
        attempts,
        payload
    `,
    [input.duoId, jobKey, input.runAt, JSON.stringify(payload)]
  );
  const row = result.rows[0];

  if (row) {
    return mapJob(row);
  }

  const existing = await client.query<JobRow>(
    `
      SELECT id, duo_id, job_key, job_type, run_at, status, attempts, payload
      FROM ops.scheduled_jobs
      WHERE job_key = $1
      LIMIT 1
    `,
    [jobKey]
  );
  const existingRow = existing.rows[0];

  if (!existingRow) {
    throw new Error("play_reminder_job_insert_failed");
  }

  return mapJob(existingRow);
}

async function readMomentosForLibraryGame(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    viewerUserId: string;
  }
): Promise<PlayMomentoRecord[]> {
  const result = await client.query<MomentoRow>(
    `
      SELECT
        momento.id,
        momento.duo_id,
        momento.library_game_id,
        momento.session_id,
        momento.author_user_id,
        momento.body,
        momento.is_spoiler,
        (reveal.momento_id IS NOT NULL) AS revealed_for_viewer,
        momento.created_at,
        momento.updated_at
      FROM app.play_momentos AS momento
      LEFT JOIN app.play_spoiler_reveals AS reveal
        ON reveal.momento_id = momento.id
       AND reveal.user_id = $3
      WHERE momento.duo_id = $1
        AND momento.library_game_id = $2
      ORDER BY momento.created_at ASC
      LIMIT 100
    `,
    [input.duoId, input.libraryGameId, input.viewerUserId]
  );

  return result.rows.map(mapMomento);
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

async function replaceActiveRoleRows(
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
  await client.query(
    `
      DELETE FROM app.play_active_games
      WHERE duo_id = $1
    `,
    [input.duoId]
  );

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

async function endLiveSession(
  client: QueueDbClient,
  input: {
    duoId: string;
    sessionId: string;
    actorUserId: string;
    endedAt: Date;
  }
): Promise<PlaySessionRecord | null> {
  const result = await client.query<SessionRow>(
    `
      UPDATE app.play_sessions
      SET status = 'pending_confirmation',
          ended_at = $4,
          duration_seconds = greatest(0, floor(extract(epoch FROM ($4 - started_at)))::int),
          updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
        AND kind = 'live'
        AND status = 'active'
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
    [input.duoId, input.sessionId, input.actorUserId, input.endedAt]
  );
  const row = result.rows[0];

  return row ? mapSession(row) : null;
}

async function createSessionConfirmation(
  client: QueueDbClient,
  input: {
    duoId: string;
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
        AND session.duo_id = $3
        AND session.status = 'pending_confirmation'
      ON CONFLICT (session_id, user_id) DO NOTHING
      RETURNING
        id,
        duo_id,
        session_id,
        user_id,
        confirmed_at
    `,
    [input.sessionId, input.userId, input.duoId]
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

async function applyConfirmedSessionEffects(
  client: QueueDbClient,
  input: {
    duoId: string;
    sessionId: string;
    actorUserId: string;
    xpAmount: number;
  }
): Promise<{
  progress: PlayProgressRecord;
  xpAward: PlayXpAwardRecord | null;
  session: PlaySessionRecord;
} | null> {
  const sessionResult = await client.query<SessionRow>(
    `
      UPDATE app.play_sessions
      SET status = 'confirmed',
          updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
        AND status = 'pending_confirmation'
        AND (
          SELECT count(*)
          FROM app.play_session_confirmations AS confirmation
          WHERE confirmation.session_id = app.play_sessions.id
        ) >= 2
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
    [input.duoId, input.sessionId, input.actorUserId]
  );
  const row = sessionResult.rows[0];

  if (!row) {
    return null;
  }

  const session = mapSession(row);
  const progress = await addConfirmedCoopSeconds(client, {
    duoId: input.duoId,
    libraryGameId: session.libraryGameId,
    actorUserId: input.actorUserId,
    durationSeconds: session.durationSeconds ?? 0
  });
  const xpAward = input.xpAmount > 0
    ? await insertXpAward(client, {
        duoId: input.duoId,
        awardKey: `${session.kind}-session:${session.id}`,
        sourceType: session.kind === "live" ? "live-session" : "offline-session",
        sourceId: session.id,
        amount: input.xpAmount,
        awardedByUserId: input.actorUserId,
        metadata: {
          durationSeconds: session.durationSeconds ?? 0
        }
      })
    : null;

  return {
    progress,
    xpAward,
    session
  };
}

async function addConfirmedCoopSeconds(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    actorUserId: string;
    durationSeconds: number;
  }
): Promise<PlayProgressRecord> {
  const result = await client.query<ProgressRow>(
    `
      INSERT INTO app.play_progress (
        duo_id,
        library_game_id,
        confirmed_coop_seconds,
        updated_by_user_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (library_game_id) DO UPDATE
      SET confirmed_coop_seconds = app.play_progress.confirmed_coop_seconds + excluded.confirmed_coop_seconds,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_at = now()
      RETURNING
        duo_id,
        library_game_id,
        confirmed_coop_seconds,
        subjective_percent,
        updated_at
    `,
    [
      input.duoId,
      input.libraryGameId,
      Math.max(0, input.durationSeconds),
      input.actorUserId
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_progress_update_failed");
  }

  return mapProgress(row);
}

async function updateProgressPercent(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    actorUserId: string;
    subjectivePercent: number | null;
  }
): Promise<PlayProgressRecord> {
  const result = await client.query<ProgressRow>(
    `
      INSERT INTO app.play_progress (
        duo_id,
        library_game_id,
        subjective_percent,
        updated_by_user_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (library_game_id) DO UPDATE
      SET subjective_percent = excluded.subjective_percent,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_at = now()
      RETURNING
        duo_id,
        library_game_id,
        confirmed_coop_seconds,
        subjective_percent,
        updated_at
    `,
    [input.duoId, input.libraryGameId, input.subjectivePercent, input.actorUserId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_progress_percent_update_failed");
  }

  return mapProgress(row);
}

async function createChapter(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    title: string;
    actorUserId: string;
  }
): Promise<PlayChapterRecord> {
  const result = await client.query<ChapterRow>(
    `
      INSERT INTO app.play_chapters (
        duo_id,
        library_game_id,
        title,
        position,
        created_by_user_id,
        updated_by_user_id,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        coalesce((
          SELECT max(position) + 1
          FROM app.play_chapters
          WHERE duo_id = $1
            AND library_game_id = $2
        ), 1),
        $4,
        $4,
        now()
      )
      RETURNING
        id,
        duo_id,
        library_game_id,
        title,
        position,
        completed_at,
        completed_by_user_id,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
    `,
    [input.duoId, input.libraryGameId, input.title, input.actorUserId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_chapter_create_failed");
  }

  return mapChapter(row);
}

async function setChapterCompletion(
  client: QueueDbClient,
  input: {
    duoId: string;
    chapterId: string;
    actorUserId: string;
    completed: boolean;
  }
): Promise<{
  chapter: PlayChapterRecord;
  xpAward: PlayXpAwardRecord | null;
} | null> {
  const result = await client.query<ChapterRow>(
    `
      UPDATE app.play_chapters
      SET completed_at = CASE WHEN $4 THEN coalesce(completed_at, now()) ELSE NULL END,
          completed_by_user_id = CASE WHEN $4 THEN coalesce(completed_by_user_id, $3) ELSE NULL END,
          updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
      RETURNING
        id,
        duo_id,
        library_game_id,
        title,
        position,
        completed_at,
        completed_by_user_id,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
    `,
    [input.duoId, input.chapterId, input.actorUserId, input.completed]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const chapter = mapChapter(row);
  const xpAward = input.completed
    ? await insertXpAward(client, {
        duoId: input.duoId,
        awardKey: `chapter:${chapter.id}`,
        sourceType: "chapter",
        sourceId: chapter.id,
        amount: 25,
        awardedByUserId: input.actorUserId,
        metadata: {
          title: chapter.title
        }
      })
    : null;

  return { chapter, xpAward };
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

async function createTerminalRequest(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    targetStatus: TerminalTargetStatus;
    actorUserId: string;
  }
): Promise<PlayTerminalRequestRecord> {
  const result = await client.query<TerminalRequestRow>(
    `
      INSERT INTO app.play_terminal_requests (
        duo_id,
        library_game_id,
        target_status,
        requested_by_user_id,
        updated_by_user_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $4, now())
      ON CONFLICT (library_game_id) WHERE status = 'pending' DO UPDATE
      SET target_status = excluded.target_status,
          requested_by_user_id = excluded.requested_by_user_id,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_at = now()
      RETURNING
        id,
        duo_id,
        library_game_id,
        target_status,
        status,
        requested_by_user_id,
        confirmed_by_user_id,
        cancelled_by_user_id,
        updated_at
    `,
    [input.duoId, input.libraryGameId, input.targetStatus, input.actorUserId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_terminal_request_create_failed");
  }

  return mapTerminalRequest(row);
}

async function cancelTerminalRequest(
  client: QueueDbClient,
  input: {
    duoId: string;
    requestId: string;
    actorUserId: string;
  }
): Promise<PlayTerminalRequestRecord | null> {
  const result = await client.query<TerminalRequestRow>(
    `
      UPDATE app.play_terminal_requests
      SET status = 'cancelled',
          cancelled_by_user_id = $3,
          cancelled_at = now(),
          updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
        AND status = 'pending'
      RETURNING
        id,
        duo_id,
        library_game_id,
        target_status,
        status,
        requested_by_user_id,
        confirmed_by_user_id,
        cancelled_by_user_id,
        updated_at
    `,
    [input.duoId, input.requestId, input.actorUserId]
  );
  const row = result.rows[0];

  return row ? mapTerminalRequest(row) : null;
}

async function confirmTerminalRequest(
  client: QueueDbClient,
  input: {
    duoId: string;
    requestId: string;
    actorUserId: string;
  }
): Promise<PlayTerminalRequestRecord | null> {
  const result = await client.query<TerminalRequestRow>(
    `
      UPDATE app.play_terminal_requests
      SET status = 'confirmed',
          confirmed_by_user_id = $3,
          confirmed_at = now(),
          updated_by_user_id = $3,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
        AND status = 'pending'
        AND requested_by_user_id <> $3
      RETURNING
        id,
        duo_id,
        library_game_id,
        target_status,
        status,
        requested_by_user_id,
        confirmed_by_user_id,
        cancelled_by_user_id,
        updated_at
    `,
    [input.duoId, input.requestId, input.actorUserId]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  await client.query(
    `
      UPDATE app.duo_library_games
      SET status = $3,
          status_updated_by_user_id = $4,
          updated_at = now()
      WHERE duo_id = $1
        AND id = $2
    `,
    [input.duoId, row.library_game_id, row.target_status, input.actorUserId]
  );
  await client.query(
    `
      DELETE FROM app.play_active_games
      WHERE duo_id = $1
        AND library_game_id = $2
    `,
    [input.duoId, row.library_game_id]
  );
  await compactActivePlayRows(client, input.duoId, input.actorUserId);

  return mapTerminalRequest(row);
}

async function createMomento(
  client: QueueDbClient,
  input: {
    duoId: string;
    libraryGameId: string;
    sessionId: string | null;
    body: string;
    isSpoiler: boolean;
    actorUserId: string;
  }
): Promise<PlayMomentoRecord | null> {
  const result = await client.query<MomentoRow>(
    `
      INSERT INTO app.play_momentos (
        duo_id,
        library_game_id,
        session_id,
        author_user_id,
        body,
        is_spoiler,
        updated_at
      )
      VALUES ($1, $2, $3::uuid, $4, $5, $6, now())
      RETURNING
        id,
        duo_id,
        library_game_id,
        session_id,
        author_user_id,
        body,
        is_spoiler,
        false AS revealed_for_viewer,
        created_at,
        updated_at
    `,
    [
      input.duoId,
      input.libraryGameId,
      input.sessionId,
      input.actorUserId,
      input.body,
      input.isSpoiler
    ]
  );
  const row = result.rows[0];

  return row ? mapMomento(row) : null;
}

async function revealMomento(
  client: QueueDbClient,
  input: {
    duoId: string;
    momentoId: string;
    viewerUserId: string;
  }
): Promise<PlayMomentoRecord | null> {
  await client.query(
    `
      INSERT INTO app.play_spoiler_reveals (
        duo_id,
        momento_id,
        user_id
      )
      SELECT $1, momento.id, $3
      FROM app.play_momentos AS momento
      WHERE momento.duo_id = $1
        AND momento.id = $2
      ON CONFLICT (momento_id, user_id) DO NOTHING
    `,
    [input.duoId, input.momentoId, input.viewerUserId]
  );

  return readMomentoForViewer(client, input);
}

async function readMomentoForViewer(
  client: QueueDbClient,
  input: {
    duoId: string;
    momentoId: string;
    viewerUserId: string;
  }
): Promise<PlayMomentoRecord | null> {
  const result = await client.query<MomentoRow>(
    `
      SELECT
        momento.id,
        momento.duo_id,
        momento.library_game_id,
        momento.session_id,
        momento.author_user_id,
        momento.body,
        momento.is_spoiler,
        (reveal.momento_id IS NOT NULL) AS revealed_for_viewer,
        momento.created_at,
        momento.updated_at
      FROM app.play_momentos AS momento
      LEFT JOIN app.play_spoiler_reveals AS reveal
        ON reveal.momento_id = momento.id
       AND reveal.user_id = $3
      WHERE momento.duo_id = $1
        AND momento.id = $2
      LIMIT 1
    `,
    [input.duoId, input.momentoId, input.viewerUserId]
  );
  const row = result.rows[0];

  return row ? mapMomento(row) : null;
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

async function readNotificationCenter(
  client: QueueDbClient,
  input: {
    duoId: string;
    limit: number;
  }
): Promise<PlayNotificationCenterRecord> {
  const limit = Math.min(Math.max(input.limit, 1), 8);
  const items = await client.query<NotificationRow>(
    `
      SELECT
        notification.id,
        notification.duo_id,
        notification.recipient_user_id,
        notification.notification_type,
        notification.state,
        notification.action_ref_type,
        notification.action_ref_id,
        notification.title,
        notification.body,
        notification.created_at
      FROM app.play_notifications AS notification
      LEFT JOIN app.play_sessions AS session
        ON notification.action_ref_type = 'play_session'
       AND notification.action_ref_id = session.id
      WHERE notification.duo_id = $1
        AND notification.state IN ('unread', 'read')
        AND (
          notification.action_ref_type <> 'play_session'
          OR notification.notification_type NOT IN ('live-session', 'session-confirmation')
          OR (
            notification.notification_type = 'live-session'
            AND session.status = 'active'
          )
          OR (
            notification.notification_type = 'session-confirmation'
            AND session.status = 'pending_confirmation'
          )
        )
      ORDER BY notification.created_at DESC
      LIMIT $2
    `,
    [input.duoId, limit]
  );
  const unread = await client.query<{ unread_count: number }>(
    `
      SELECT count(*)::int AS unread_count
      FROM app.play_notifications AS notification
      LEFT JOIN app.play_sessions AS session
        ON notification.action_ref_type = 'play_session'
       AND notification.action_ref_id = session.id
      WHERE notification.duo_id = $1
        AND notification.state = 'unread'
        AND (
          notification.action_ref_type <> 'play_session'
          OR notification.notification_type NOT IN ('live-session', 'session-confirmation')
          OR (
            notification.notification_type = 'live-session'
            AND session.status = 'active'
          )
          OR (
            notification.notification_type = 'session-confirmation'
            AND session.status = 'pending_confirmation'
          )
        )
    `,
    [input.duoId]
  );

  return {
    unreadCount: Number(unread.rows[0]?.unread_count ?? 0),
    items: items.rows.map(mapNotification)
  };
}

async function markNotificationsActioned(
  client: QueueDbClient,
  input: {
    duoId: string;
    notificationType?: string;
    actionRefType: string;
    actionRefId: string;
    recipientUserId?: string | null;
  }
): Promise<number> {
  const result = await client.query(
    `
      UPDATE app.play_notifications
      SET state = 'actioned',
          read_at = COALESCE(read_at, now()),
          updated_at = now()
      WHERE duo_id = $1
        AND action_ref_type = $2
        AND action_ref_id = $3::uuid
        AND state IN ('unread', 'read')
        AND ($4::text IS NULL OR notification_type = $4)
        AND ($5::text IS NULL OR recipient_user_id = $5)
    `,
    [
      input.duoId,
      input.actionRefType,
      input.actionRefId,
      input.notificationType ?? null,
      input.recipientUserId ?? null
    ]
  );

  return result.rowCount ?? 0;
}

async function registerPushSubscription(
  client: QueueDbClient,
  input: PlayPushSubscriptionInput & {
    duoId: string;
  }
): Promise<PlayPushSubscriptionRecord> {
  const result = await client.query<PushSubscriptionRow>(
    `
      INSERT INTO app.push_subscriptions (
        duo_id,
        user_id,
        endpoint,
        p256dh,
        auth_secret,
        user_agent,
        enabled,
        disabled_at,
        last_seen_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, NULL, now(), now())
      ON CONFLICT (duo_id, user_id, endpoint) DO UPDATE
      SET p256dh = excluded.p256dh,
          auth_secret = excluded.auth_secret,
          user_agent = excluded.user_agent,
          enabled = true,
          disabled_at = NULL,
          last_seen_at = now(),
          updated_at = now()
      RETURNING
        id,
        duo_id,
        user_id,
        endpoint,
        p256dh,
        auth_secret,
        enabled,
        updated_at
    `,
    [
      input.duoId,
      input.userId,
      input.endpoint,
      input.p256dh,
      input.authSecret,
      input.userAgent ?? null
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("play_push_subscription_register_failed");
  }

  return mapPushSubscription(row);
}

async function disablePushSubscriptions(
  client: QueueDbClient,
  input: {
    userId: string;
    endpoint?: string | null;
  }
): Promise<number> {
  const result = await client.query<{ disabled_count: number }>(
    `
      WITH disabled AS (
        UPDATE app.push_subscriptions
        SET enabled = false,
            disabled_at = coalesce(disabled_at, now()),
            updated_at = now()
        WHERE user_id = $1
          AND enabled = true
          AND ($2::text IS NULL OR endpoint = $2)
        RETURNING id
      )
      SELECT count(*)::int AS disabled_count
      FROM disabled
    `,
    [input.userId, input.endpoint ?? null]
  );

  return Number(result.rows[0]?.disabled_count ?? 0);
}

async function readEnabledPushSubscriptions(
  client: QueueDbClient,
  userId: string
): Promise<PlayPushSubscriptionRecord[]> {
  const result = await client.query<PushSubscriptionRow>(
    `
      SELECT
        id,
        duo_id,
        user_id,
        endpoint,
        p256dh,
        auth_secret,
        enabled,
        updated_at
      FROM app.push_subscriptions
      WHERE user_id = $1
        AND enabled = true
      ORDER BY updated_at DESC
      LIMIT 10
    `,
    [userId]
  );

  return result.rows.map(mapPushSubscription);
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

async function completeReminderJob(
  pool: QueueDbPool,
  input: {
    jobId: string;
    processedAt: Date;
  }
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE ops.scheduled_jobs
        SET status = 'completed',
            processed_at = $2,
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            updated_at = now()
        WHERE id = $1
      `,
      [input.jobId, input.processedAt]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function failReminderJob(
  pool: QueueDbPool,
  input: {
    jobId: string;
    error: string;
  }
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE ops.scheduled_jobs
        SET status = 'failed',
            locked_at = NULL,
            locked_by = NULL,
            last_error = left($2, 500),
            updated_at = now()
        WHERE id = $1
      `,
      [input.jobId, input.error]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
            AND job_type = 'play-session-reminder'
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

function mapSessionDetail(
  row: SessionDetailRow,
  memberUserIds: string[]
): PlaySessionDetailRecord {
  const confirmedByUserIds = row.confirmed_by_user_ids ?? [];
  const pendingUserIds = memberUserIds.filter(
    (userId) => !confirmedByUserIds.includes(userId)
  );

  return {
    ...mapSession(row),
    confirmedByUserIds,
    pendingUserIds,
    confirmationCount: Number(row.confirmation_count ?? confirmedByUserIds.length),
    requiredConfirmationCount: memberUserIds.length,
    doubleConfirmed: pendingUserIds.length === 0 && memberUserIds.length >= 2
  };
}

function mapProgress(row: ProgressRow): PlayProgressRecord {
  return {
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    confirmedCoopSeconds: Number(row.confirmed_coop_seconds ?? 0),
    subjectivePercent: row.subjective_percent,
    updatedAt: row.updated_at
  };
}

function mapChapter(row: ChapterRow): PlayChapterRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    title: row.title,
    position: row.position,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTerminalRequest(row: TerminalRequestRow): PlayTerminalRequestRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    targetStatus: row.target_status,
    status: row.status,
    requestedByUserId: row.requested_by_user_id,
    confirmedByUserId: row.confirmed_by_user_id,
    cancelledByUserId: row.cancelled_by_user_id,
    updatedAt: row.updated_at
  };
}

function mapScheduledSession(
  row: ScheduledSessionRow,
  memberUserIds: string[]
): PlayScheduledSessionRecord {
  const confirmedByUserIds = row.confirmed_by_user_ids ?? [];
  const pendingUserIds = memberUserIds.filter(
    (userId) => !confirmedByUserIds.includes(userId)
  );

  return {
    id: row.id,
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    scheduledStartAt: row.scheduled_start_at,
    timezone: row.timezone,
    status: row.status,
    reminderDueAt: row.reminder_due_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedByUserIds,
    pendingUserIds,
    confirmationCount: Number(row.confirmation_count ?? confirmedByUserIds.length),
    requiredConfirmationCount: memberUserIds.length,
    doubleConfirmed: pendingUserIds.length === 0 && memberUserIds.length >= 2
  };
}

function mapMomento(row: MomentoRow): PlayMomentoRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    sessionId: row.session_id,
    authorUserId: row.author_user_id,
    body: row.body,
    isSpoiler: row.is_spoiler,
    revealedForViewer: !row.is_spoiler || row.revealed_for_viewer,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildMilestoneEvents(input: {
  sessions: PlaySessionDetailRecord[];
  estimatedMinutes: number | null;
  timezone: string;
}): PlayTimelineEvent[] {
  let accumulatedConfirmedSeconds = 0;
  const events: PlayTimelineEvent[] = [];

  input.sessions.forEach((session, index) => {
    const durationSeconds = session.durationSeconds ?? 0;
    const before = accumulatedConfirmedSeconds;
    const after = before + durationSeconds;
    const kinds = classifyTimelineMilestones({
      accumulatedConfirmedSecondsAfter: after,
      accumulatedConfirmedSecondsBefore: before,
      confirmedSessionCountBefore: index,
      durationSeconds,
      estimatedMinutes: input.estimatedMinutes,
      sessionStartedAt: session.startedAt,
      timezone: input.timezone
    });

    accumulatedConfirmedSeconds = after;

    for (const kind of kinds) {
      const milestone = toTimelineMilestone({
        kind,
        occurredAt: session.endedAt ?? session.startedAt,
        sessionId: session.id
      });

      events.push({
        id: `milestone:${milestone.id}`,
        type: "milestone",
        occurredAt: milestone.occurredAt,
        milestone
      });
    }
  });

  return events;
}

function toTimelineMilestone(input: {
  kind: TimelineMilestoneKind;
  occurredAt: Date;
  sessionId: string;
}): PlayTimelineMilestoneRecord {
  const copy = getTimelineMilestoneCopy(input.kind);

  return {
    id: `${input.sessionId}:${input.kind}`,
    kind: input.kind,
    label: copy.label,
    description: copy.description,
    occurredAt: input.occurredAt
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

function mapPushSubscription(row: PushSubscriptionRow): PlayPushSubscriptionRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    authSecret: row.auth_secret,
    enabled: row.enabled,
    updatedAt: row.updated_at
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
