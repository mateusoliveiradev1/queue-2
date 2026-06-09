import { describe, expect, it, vi } from "vitest";

import { confirmPlaySessionUseCase } from "../src/modules/play/application/confirm-play-session";
import { endLiveSessionUseCase } from "../src/modules/play/application/end-live-session";
import { logOfflineSessionUseCase } from "../src/modules/play/application/log-offline-session";
import { startLiveSessionUseCase } from "../src/modules/play/application/start-live-session";
import type {
  ActivePlayGameRecord,
  GameTimelineRecord,
  GamePlayDetailRecord,
  PlayConfirmationRecord,
  PlayMembershipContext,
  PlayNotificationCenterRecord,
  PlayNotificationRecord,
  PlayProgressRecord,
  PlayPushSubscriptionRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlayScheduledSessionRecord,
  PlaySessionDetailRecord,
  PlaySessionRecord,
  PlayXpAwardRecord
} from "../src/modules/play/application/ports";

describe("Phase 04.3 play session lifecycle", () => {
  it("refuses to start a second live session and returns server elapsed time", async () => {
    const activeSession = playSessionRecord({
      id: "live-active",
      startedAt: new Date("2026-06-05T12:00:00.000Z")
    });
    const { repository, transaction } = makePlayRepository({
      transaction: {
        readActiveLiveSession: vi.fn(async () => activeSession)
      }
    });

    await expect(
      startLiveSessionUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          now: new Date("2026-06-05T13:30:00.000Z")
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "active-live-session-exists",
      activeSession,
      serverNow: new Date("2026-06-05T13:30:00.000Z"),
      elapsedSeconds: 5_400
    });
    expect(transaction.createSession).not.toHaveBeenCalled();
  });

  it("logs Jogamos Hoje as a pending offline session for both duo confirmations", async () => {
    const createSession = vi.fn<PlayRepositoryTransaction["createSession"]>(async (input) =>
      playSessionRecord({
        duoId: input.duoId,
        libraryGameId: input.libraryGameId,
        kind: input.kind,
        status: input.status,
        startedAt: input.startedAt ?? new Date("2026-06-05T18:30:00.000Z"),
        endedAt: input.endedAt ?? null,
        durationSeconds: input.durationSeconds ?? null,
        createdByUserId: input.actorUserId
      })
    );
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord({ ...input, recipientUserId: input.recipientUserId ?? null })
    );
    const { repository } = makePlayRepository({
      transaction: {
        createSession,
        insertNotificationItem
      }
    });

    const result = await logOfflineSessionUseCase(
      {
        userId: "member-1",
        catalogGameId: "game-1",
        durationMinutes: 90,
        now: new Date("2026-06-05T20:00:00.000Z")
      },
      repository
    );

    expect(result).toEqual({
      ok: true,
      state: "pending-confirmation",
      session: expect.objectContaining({
        kind: "offline",
        status: "pending_confirmation",
        durationSeconds: 5_400,
        startedAt: new Date("2026-06-05T18:30:00.000Z"),
        endedAt: new Date("2026-06-05T20:00:00.000Z")
      })
    });
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "offline",
        status: "pending_confirmation",
        durationSeconds: 5_400,
        actorUserId: "member-1"
      })
    );
    expect(insertNotificationItem).toHaveBeenCalledTimes(2);
    expect(insertNotificationItem.mock.calls.map(([input]) => input.recipientUserId)).toEqual([
      "member-1",
      "member-2"
    ]);
  });

  it("refuses to start or log another session while a confirmation is pending", async () => {
    const createSession = vi.fn<PlayRepositoryTransaction["createSession"]>();
    const { repository } = makePlayRepository({
      transaction: {
        createSession,
        readGamePlayDetail: vi.fn(async () =>
          gamePlayDetailRecord({
            pendingSessions: [
              playSessionDetailRecord({
                id: "pending-1",
                pendingUserIds: ["member-2"]
              })
            ]
          })
        )
      }
    });

    await expect(
      startLiveSessionUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "pending-confirmation-exists"
    });
    await expect(
      logOfflineSessionUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          durationMinutes: 30
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "pending-confirmation-exists"
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("actions the live-session notification when ending the active session", async () => {
    const endLiveSession = vi.fn<PlayRepositoryTransaction["endLiveSession"]>(
      async (input) =>
        playSessionRecord({
          id: input.sessionId,
          duoId: input.duoId,
          status: "pending_confirmation"
        })
    );
    const markNotificationsActioned = vi.fn<
      PlayRepositoryTransaction["markNotificationsActioned"]
    >(async () => 1);
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord(input)
    );
    const { repository } = makePlayRepository({
      transaction: {
        endLiveSession,
        insertNotificationItem,
        markNotificationsActioned
      }
    });

    await expect(
      endLiveSessionUseCase(
        {
          userId: "member-1",
          sessionId: "session-1",
          now: new Date("2026-06-05T20:00:00.000Z")
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      state: "pending-confirmation",
      session: expect.objectContaining({
        id: "session-1",
        status: "pending_confirmation"
      })
    });
    expect(markNotificationsActioned).toHaveBeenCalledWith({
      duoId: "duo-1",
      notificationType: "live-session",
      actionRefType: "play_session",
      actionRefId: "session-1"
    });
    expect(insertNotificationItem).toHaveBeenCalledTimes(2);
  });

  it("applies confirmed live-session effects only after the second confirmation", async () => {
    const readSessionDetail = vi
      .fn<PlayRepositoryTransaction["readSessionDetail"]>()
      .mockResolvedValueOnce(
        playSessionDetailRecord({
          confirmedByUserIds: ["member-1"],
          pendingUserIds: ["member-2"],
          confirmationCount: 1,
          doubleConfirmed: false
        })
      )
      .mockResolvedValueOnce(
        playSessionDetailRecord({
          confirmedByUserIds: ["member-1", "member-2"],
          pendingUserIds: [],
          confirmationCount: 2,
          doubleConfirmed: true
        })
      );
    const applyConfirmedSessionEffects = vi.fn<
      PlayRepositoryTransaction["applyConfirmedSessionEffects"]
    >(async (input) => ({
      progress: playProgressRecord({
        duoId: input.duoId,
        confirmedCoopSeconds: 3_600
      }),
      xpAward: xpAwardRecord({
        duoId: input.duoId,
        sourceId: input.sessionId,
        amount: 0,
        awardedByUserId: input.actorUserId
      }),
      session: playSessionRecord({
        id: input.sessionId,
        duoId: input.duoId,
        status: "confirmed"
      })
    }));
    const markNotificationsActioned = vi.fn<
      PlayRepositoryTransaction["markNotificationsActioned"]
    >(async () => 1);
    const { repository, transaction } = makePlayRepository({
      transaction: {
        applyConfirmedSessionEffects,
        applyGamificationFact: vi.fn(async () => gamificationFactResult()),
        markNotificationsActioned,
        readSessionDetail
      }
    });

    await expect(
      confirmPlaySessionUseCase(
        {
          userId: "member-2",
          sessionId: "session-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      state: "confirmed",
      detail: expect.objectContaining({
        doubleConfirmed: true,
        pendingUserIds: []
      }),
      progress: expect.objectContaining({
        confirmedCoopSeconds: 3_600
      }),
      reward: expect.objectContaining({
        totalXpAwarded: 30
      }),
      xpAward: expect.objectContaining({
        amount: 30,
        sourceType: "live-session"
      })
    });
    expect(transaction.confirmSession).toHaveBeenCalledWith({
      duoId: "duo-1",
      sessionId: "session-1",
      userId: "member-2"
    });
    expect(applyConfirmedSessionEffects).toHaveBeenCalledWith({
      duoId: "duo-1",
      sessionId: "session-1",
      actorUserId: "member-2"
    });
    expect(markNotificationsActioned).toHaveBeenCalledWith({
      duoId: "duo-1",
      notificationType: "session-confirmation",
      actionRefType: "play_session",
      actionRefId: "session-1",
      recipientUserId: "member-2"
    });
    expect(markNotificationsActioned).toHaveBeenCalledWith({
      duoId: "duo-1",
      notificationType: "session-confirmation",
      actionRefType: "play_session",
      actionRefId: "session-1"
    });
  });

  it("treats a duplicate session confirmation as already confirmed instead of crashing", async () => {
    const confirmSession = vi.fn<PlayRepositoryTransaction["confirmSession"]>(
      async () => null
    );
    const applyConfirmedSessionEffects = vi.fn<
      PlayRepositoryTransaction["applyConfirmedSessionEffects"]
    >();
    const { repository } = makePlayRepository({
      transaction: {
        applyConfirmedSessionEffects,
        confirmSession,
        readSessionDetail: vi.fn(async () =>
          playSessionDetailRecord({
            confirmedByUserIds: ["member-1"],
            pendingUserIds: ["member-2"],
            confirmationCount: 1,
            doubleConfirmed: false
          })
        )
      }
    });

    await expect(
      confirmPlaySessionUseCase(
        {
          userId: "member-1",
          sessionId: "session-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "already-confirmed"
    });
    expect(confirmSession).toHaveBeenCalledWith({
      duoId: "duo-1",
      sessionId: "session-1",
      userId: "member-1"
    });
    expect(applyConfirmedSessionEffects).not.toHaveBeenCalled();
  });
});

function makePlayRepository(input: {
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
    createSession: vi.fn(async (sessionInput) =>
      playSessionRecord({
        duoId: sessionInput.duoId,
        libraryGameId: sessionInput.libraryGameId,
        kind: sessionInput.kind,
        status: sessionInput.status,
        startedAt: sessionInput.startedAt ?? new Date("2026-06-05T12:00:00.000Z"),
        endedAt: sessionInput.endedAt ?? null,
        durationSeconds: sessionInput.durationSeconds ?? null,
        createdByUserId: sessionInput.actorUserId
      })
    ),
    confirmSession: vi.fn(async (confirmationInput) =>
      confirmationRecord({
        duoId: confirmationInput.duoId,
        effectId: confirmationInput.sessionId,
        userId: confirmationInput.userId
      })
    ),
    readGamePlayDetail: vi.fn(async () => gamePlayDetailRecord()),
    readGameTimeline: vi.fn(async () => gameTimelineRecord()),
    readActiveLiveSession: vi.fn(async () => null),
    endLiveSession: vi.fn(async () => null),
    readSessionDetail: vi.fn(async () => playSessionDetailRecord()),
    applyConfirmedSessionEffects: vi.fn(async (effectInput) => ({
      progress: playProgressRecord({ duoId: effectInput.duoId }),
      xpAward: xpAwardRecord({
        duoId: effectInput.duoId,
        sourceId: effectInput.sessionId,
        amount: effectInput.xpAmount,
        awardedByUserId: effectInput.actorUserId
      }),
      session: playSessionRecord({
        id: effectInput.sessionId,
        duoId: effectInput.duoId,
        status: "confirmed"
      })
    })),
    updateProgressPercent: vi.fn(async (progressInput) =>
      playProgressRecord({
        duoId: progressInput.duoId,
        libraryGameId: progressInput.libraryGameId,
        subjectivePercent: progressInput.subjectivePercent
      })
    ),
    createChapter: vi.fn(),
    setChapterCompletion: vi.fn(),
    createTerminalRequest: vi.fn(),
    cancelTerminalRequest: vi.fn(),
    confirmTerminalRequest: vi.fn(),
    applyGamificationFact: vi.fn(async () => gamificationFactResult()),
    readDuoTimezone: vi.fn(async () => "America/Sao_Paulo"),
    createScheduledSession: vi.fn(async () => scheduledSessionRecord()),
    updateScheduledSession: vi.fn(async () => scheduledSessionRecord()),
    cancelScheduledSession: vi.fn(async () => scheduledSessionRecord({ status: "cancelled" })),
    readScheduledSessionDetail: vi.fn(async () => scheduledSessionRecord()),
    confirmScheduledAttendance: vi.fn(async () =>
      scheduledSessionRecord({
        confirmationCount: 2,
        confirmedByUserIds: ["member-1", "member-2"],
        doubleConfirmed: true,
        pendingUserIds: []
      })
    ),
    insertReminderJob: vi.fn(async () => reminderJobRecord()),
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

function gameTimelineRecord(
  overrides: Partial<GameTimelineRecord> = {}
): GameTimelineRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    events: [],
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

function playSessionDetailRecord(
  overrides: Partial<PlaySessionDetailRecord> = {}
): PlaySessionDetailRecord {
  return {
    ...playSessionRecord(overrides),
    status: "pending_confirmation",
    confirmedByUserIds: [],
    pendingUserIds: ["member-1", "member-2"],
    confirmationCount: 0,
    requiredConfirmationCount: 2,
    doubleConfirmed: false,
    ...overrides
  };
}

function playProgressRecord(
  overrides: Partial<PlayProgressRecord> = {}
): PlayProgressRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-1",
    confirmedCoopSeconds: 0,
    subjectivePercent: null,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function confirmationRecord(
  overrides: Partial<PlayConfirmationRecord> = {}
): PlayConfirmationRecord {
  return {
    id: "confirmation-1",
    duoId: "duo-1",
    effectId: "session-1",
    userId: "member-1",
    confirmedAt: new Date("2026-06-05T12:05:00.000Z"),
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
    notificationType: "session-confirmation",
    state: "unread",
    actionRefType: "play_session",
    actionRefId: "session-1",
    title: "Confirmar sessao",
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

function scheduledSessionRecord(
  overrides: Partial<PlayScheduledSessionRecord> = {}
): PlayScheduledSessionRecord {
  return {
    id: "scheduled-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    scheduledStartAt: new Date("2026-06-06T20:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    status: "scheduled",
    reminderDueAt: new Date("2026-06-06T19:30:00.000Z"),
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
    runAt: new Date("2026-06-06T19:30:00.000Z"),
    status: "pending",
    attempts: 0,
    payload: {},
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
    awardKey: "live-session:session-1",
    sourceType: "live-session",
    sourceId: "session-1",
    amount: 30,
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
    awardKey: "live-session:session-1",
    sourceType: "live-session" as const,
    sourceId: "session-1",
    amount: 30,
    reasonCode: "live-session-confirmed",
    awardedByUserId: "member-2",
    metadata: {},
    awardedAt: new Date("2026-06-05T12:10:00.000Z")
  };
  const level = {
    level: 1,
    name: "Lv1 Casuais",
    xpRequired: 0
  };

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
