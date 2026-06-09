import { describe, expect, it, vi } from "vitest";

import { confirmScheduledSessionUseCase } from "../src/modules/play/application/confirm-scheduled-session";
import {
  parseLocalDateTimeInZone,
  schedulePlaySessionUseCase
} from "../src/modules/play/application/schedule-play-session";
import { getReminderDueAt } from "../src/modules/play/domain/play-policy";
import type {
  ActivePlayGameRecord,
  GameTimelineRecord,
  GamePlayDetailRecord,
  PlayMembershipContext,
  PlayNotificationCenterRecord,
  PlayNotificationRecord,
  PlayProgressRecord,
  PlayPushSubscriptionRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlayScheduledSessionRecord,
  PlaySessionRecord,
  PlayXpAwardRecord
} from "../src/modules/play/application/ports";

describe("Phase 04.5 scheduled sessions", () => {
  it("converts duo-local time, stores reminder due time and creates a reminder job", async () => {
    const createScheduledSession = vi.fn<PlayRepositoryTransaction["createScheduledSession"]>(
      async (input) => scheduledSessionRecord(input)
    );
    const insertReminderJob = vi.fn<PlayRepositoryTransaction["insertReminderJob"]>(
      async (input) => reminderJobRecord(input)
    );
    const { repository } = makeRepository({
      transaction: {
        createScheduledSession,
        insertReminderJob
      }
    });

    const result = await schedulePlaySessionUseCase(
      {
        userId: "member-1",
        catalogGameId: "game-1",
        scheduledLocalDateTime: "2026-06-06T20:00",
        now: new Date("2026-06-05T12:00:00.000Z")
      },
      repository
    );

    const scheduledStartAt = parseLocalDateTimeInZone(
      "2026-06-06T20:00",
      "America/Sao_Paulo"
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, state: "scheduled" }));
    expect(createScheduledSession).toHaveBeenCalledWith(
      expect.objectContaining({
        libraryGameId: "library-1",
        reminderDueAt: scheduledStartAt ? getReminderDueAt(scheduledStartAt) : null,
        scheduledStartAt,
        timezone: "America/Sao_Paulo"
      })
    );
    expect(insertReminderJob).toHaveBeenCalledWith(
      expect.objectContaining({
        runAt: scheduledStartAt ? getReminderDueAt(scheduledStartAt) : null,
        scheduledSessionId: "scheduled-1"
      })
    );
  });

  it("rejects scheduling for a game that is not currently Jogando", async () => {
    const { repository } = makeRepository({
      detail: gamePlayDetailRecord({
        activeGame: null,
        libraryStatus: "wishlist"
      })
    });

    await expect(
      schedulePlaySessionUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          scheduledLocalDateTime: "2026-06-06T20:00",
          now: new Date("2026-06-05T12:00:00.000Z")
        },
        repository
      )
    ).resolves.toEqual({ ok: false, reason: "not-playing" });
  });

  it("awards scheduled-session XP through gamification", async () => {
    const applyGamificationFact = vi.fn<
      PlayRepositoryTransaction["applyGamificationFact"]
    >(async () => gamificationFactResult());
    const { repository } = makeRepository({
      transaction: {
        confirmScheduledAttendance: vi.fn(async () =>
          scheduledSessionRecord({
            confirmationCount: 2,
            confirmedByUserIds: ["member-1", "member-2"],
            doubleConfirmed: true,
            pendingUserIds: []
          })
        ),
        applyGamificationFact
      }
    });

    await expect(
      confirmScheduledSessionUseCase(
        {
          userId: "member-2",
          scheduledSessionId: "scheduled-1"
        },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        reward: expect.objectContaining({
          totalXpAwarded: 100
        }),
        xpAward: expect.objectContaining({
          amount: 100,
          awardKey: "scheduled-session:scheduled-1"
        })
      })
    );
    expect(applyGamificationFact).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "scheduled-1",
        sourceType: "scheduled-session",
        confirmedDuoFact: true
      })
    );
  });
});

function makeRepository(input: {
  detail?: GamePlayDetailRecord | null;
  membership?: PlayMembershipContext | null;
  transaction?: Partial<PlayRepositoryTransaction>;
} = {}): {
  repository: PlayRepository;
  transaction: PlayRepositoryTransaction;
} {
  const membership =
    input.membership === undefined
      ? {
          duoId: "duo-1",
          userId: "member-1",
          partnerUserId: "member-2",
          memberUserIds: ["member-1", "member-2"]
        }
      : input.membership;
  const transaction: PlayRepositoryTransaction = {
    resolveMembership: vi.fn(async () => membership),
    lockActivePlaySet: vi.fn(),
    readActivePlayGames: vi.fn(async () => [activeRecord()]),
    readCurrentPlayGames: vi.fn(async () => []),
    readLibraryGameForActivation: vi.fn(async () => null),
    readLibraryGameForReplacement: vi.fn(async () => null),
    activatePlayingLibraryGame: vi.fn(async () => []),
    deactivatePlayingLibraryGame: vi.fn(async () => []),
    upsertActiveRoleRows: vi.fn(async () => []),
    replaceActiveRoleRows: vi.fn(async () => []),
    replacePlayingGameActiveSet: vi.fn(async () => []),
    createSession: vi.fn(async () => playSessionRecord()),
    confirmSession: vi.fn(),
    readGamePlayDetail: vi.fn(async () =>
      input.detail === undefined ? gamePlayDetailRecord() : input.detail
    ),
    readGameTimeline: vi.fn(async () => gameTimelineRecord()),
    readActiveLiveSession: vi.fn(async () => null),
    endLiveSession: vi.fn(async () => null),
    readSessionDetail: vi.fn(async () => null),
    applyConfirmedSessionEffects: vi.fn(async () => null),
    updateProgressPercent: vi.fn(),
    createChapter: vi.fn(),
    setChapterCompletion: vi.fn(),
    createTerminalRequest: vi.fn(),
    cancelTerminalRequest: vi.fn(),
    confirmTerminalRequest: vi.fn(),
    applyGamificationFact: vi.fn(async () => gamificationFactResult()),
    readDuoTimezone: vi.fn(async () => "America/Sao_Paulo"),
    createScheduledSession: vi.fn(async (scheduledInput) => scheduledSessionRecord(scheduledInput)),
    updateScheduledSession: vi.fn(async (scheduledInput) => scheduledSessionRecord(scheduledInput)),
    cancelScheduledSession: vi.fn(async () => scheduledSessionRecord({ status: "cancelled" })),
    readScheduledSessionDetail: vi.fn(async () => scheduledSessionRecord()),
    confirmScheduledAttendance: vi.fn(async () => scheduledSessionRecord()),
    insertReminderJob: vi.fn(async (jobInput) => reminderJobRecord(jobInput)),
    registerPushSubscription: vi.fn(async (pushInput) => pushSubscriptionRecord(pushInput)),
    disablePushSubscriptions: vi.fn(async () => 1),
    createMomento: vi.fn(),
    revealMomento: vi.fn(),
    insertNotificationItem: vi.fn(async (notificationInput) => notificationRecord(notificationInput)),
    markNotificationsActioned: vi.fn(async () => 1),
    insertXpAward: vi.fn(async (awardInput) => xpAwardRecord(awardInput)),
    ...input.transaction
  };
  const repository: PlayRepository = {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
    resolveMembership: vi.fn(async () => membership),
    readCurrentPlay: vi.fn(async () => null),
    readGamePlayDetail: vi.fn(async () => gamePlayDetailRecord()),
    readGameTimeline: vi.fn(async () => gameTimelineRecord()),
    readActivePlayGames: vi.fn(async () => [activeRecord()]),
    upsertActiveRoleRows: vi.fn(async () => []),
    createSessionConfirmation: vi.fn(),
    cancelConfirmation: vi.fn(),
    insertNotificationItem: vi.fn(async (notificationInput) => notificationRecord(notificationInput)),
    insertXpAward: vi.fn(async (awardInput) => xpAwardRecord(awardInput)),
    readNotificationCenter: vi.fn(async () => notificationCenterRecord()),
    registerPushSubscription: vi.fn(async (pushInput) => pushSubscriptionRecord(pushInput)),
    disablePushSubscriptions: vi.fn(async () => 1),
    claimDueReminderJobs: vi.fn(async () => []),
    completeReminderJob: vi.fn(),
    failReminderJob: vi.fn(),
    runAsUser: vi.fn(async (_userId, callback) => callback(transaction)),
    readEnabledPushSubscriptions: vi.fn(async () => [])
  };

  return { repository, transaction };
}

function activeRecord(overrides: Partial<ActivePlayGameRecord> = {}): ActivePlayGameRecord {
  return {
    id: "active-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    role: "principal",
    position: 1,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function gamePlayDetailRecord(
  overrides: Partial<GamePlayDetailRecord> = {}
): GamePlayDetailRecord {
  return {
    duoId: "duo-1",
    duoTimezone: "America/Sao_Paulo",
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    libraryStatus: "jogando",
    activeGame: activeRecord(),
    activeLiveSession: null,
    pendingSessions: [],
    progress: playProgressRecord(),
    chapters: [],
    terminalRequest: null,
    scheduledSessions: [],
    ...overrides
  };
}

function gameTimelineRecord(overrides: Partial<GameTimelineRecord> = {}): GameTimelineRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    events: [],
    ...overrides
  };
}

function playProgressRecord(overrides: Partial<PlayProgressRecord> = {}): PlayProgressRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-1",
    confirmedCoopSeconds: 0,
    subjectivePercent: null,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function playSessionRecord(overrides: Partial<PlaySessionRecord> = {}): PlaySessionRecord {
  return {
    id: "session-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    kind: "live",
    status: "active",
    startedAt: new Date("2026-06-05T12:00:00.000Z"),
    endedAt: null,
    durationSeconds: null,
    createdByUserId: "member-1",
    ...overrides
  };
}

function scheduledSessionRecord(
  overrides: Partial<PlayScheduledSessionRecord> = {}
): PlayScheduledSessionRecord {
  return {
    id: "scheduled-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    scheduledStartAt: new Date("2026-06-06T23:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    status: "scheduled",
    reminderDueAt: new Date("2026-06-06T22:30:00.000Z"),
    createdByUserId: "member-1",
    updatedByUserId: "member-1",
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    confirmedByUserIds: [],
    pendingUserIds: ["member-1", "member-2"],
    confirmationCount: 0,
    requiredConfirmationCount: 2,
    doubleConfirmed: false,
    ...overrides
  };
}

function reminderJobRecord(overrides: Partial<PlayReminderJobRecord> = {}): PlayReminderJobRecord {
  return {
    id: "job-1",
    duoId: "duo-1",
    jobKey: "play-session-reminder:scheduled-1",
    jobType: "play-session-reminder",
    runAt: new Date("2026-06-06T22:30:00.000Z"),
    status: "pending",
    attempts: 0,
    payload: {},
    ...overrides
  };
}

function notificationRecord(
  overrides: Partial<PlayNotificationRecord> = {}
): PlayNotificationRecord {
  return {
    id: "notification-1",
    duoId: "duo-1",
    recipientUserId: null,
    notificationType: "scheduled-session",
    state: "unread",
    actionRefType: "scheduled_session",
    actionRefId: "scheduled-1",
    title: "Sessao agendada",
    body: null,
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function notificationCenterRecord(
  overrides: Partial<PlayNotificationCenterRecord> = {}
): PlayNotificationCenterRecord {
  return {
    unreadCount: 0,
    items: [],
    ...overrides
  };
}

function pushSubscriptionRecord(
  overrides: Partial<PlayPushSubscriptionRecord> = {}
): PlayPushSubscriptionRecord {
  return {
    id: "push-1",
    duoId: "duo-1",
    userId: "member-1",
    endpoint: "https://push.example.test/sub",
    p256dh: "p256dh_key",
    authSecret: "auth_secret",
    enabled: true,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function xpAwardRecord(overrides: Partial<PlayXpAwardRecord> = {}): PlayXpAwardRecord {
  return {
    id: "xp-1",
    duoId: "duo-1",
    awardKey: "scheduled-session:scheduled-1",
    sourceType: "scheduled-session",
    sourceId: "scheduled-1",
    amount: 100,
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: new Date("2026-06-05T12:10:00.000Z"),
    ...overrides
  };
}

function gamificationFactResult() {
  const award = {
    id: "xp-1",
    duoId: "duo-1",
    awardKey: "scheduled-session:scheduled-1",
    sourceType: "scheduled-session" as const,
    sourceId: "scheduled-1",
    amount: 100,
    reasonCode: "scheduled-session-confirmed",
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: new Date("2026-06-05T12:10:00.000Z")
  };
  const level = { level: 1, name: "Lv1 Casuais", xpRequired: 0 };

  return {
    ok: true as const,
    duplicate: false,
    summary: {
      totalXpAwarded: award.amount,
      xpAwards: [award],
      levelUp: null,
      achievements: [],
      questProgress: [],
      streak: null,
      projection: {
        duoId: "duo-1",
        xp: award.amount,
        level,
        streak: 0,
        availableFreezes: 0,
        updatedAt: new Date("2026-06-05T12:10:00.000Z")
      }
    }
  };
}
