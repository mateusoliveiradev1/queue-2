import { describe, expect, it, vi } from "vitest";

import { confirmPlaySessionUseCase } from "../src/modules/play/application/confirm-play-session";
import { logOfflineSessionUseCase } from "../src/modules/play/application/log-offline-session";
import { startLiveSessionUseCase } from "../src/modules/play/application/start-live-session";
import type {
  ActivePlayGameRecord,
  GamePlayDetailRecord,
  PlayConfirmationRecord,
  PlayMembershipContext,
  PlayNotificationRecord,
  PlayProgressRecord,
  PlayRepository,
  PlayRepositoryTransaction,
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
        amount: input.xpAmount,
        awardedByUserId: input.actorUserId
      }),
      session: playSessionRecord({
        id: input.sessionId,
        duoId: input.duoId,
        status: "confirmed"
      })
    }));
    const { repository, transaction } = makePlayRepository({
      transaction: {
        applyConfirmedSessionEffects,
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
      actorUserId: "member-2",
      xpAmount: 30
    });
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
    activatePlayingLibraryGame: vi.fn(async () => []),
    deactivatePlayingLibraryGame: vi.fn(async () => []),
    upsertActiveRoleRows: vi.fn(async () => []),
    replaceActiveRoleRows: vi.fn(async () => []),
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
    insertNotificationItem: vi.fn(async (notificationInput) => notificationRecord(notificationInput)),
    insertXpAward: vi.fn(async (awardInput) => xpAwardRecord(awardInput)),
    ...input.transaction
  };
  const repository: PlayRepository = {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
    resolveMembership: vi.fn(async () => membership),
    readCurrentPlay: vi.fn(async () => null),
    readGamePlayDetail: vi.fn(async () => gamePlayDetailRecord()),
    readActivePlayGames: vi.fn(async () => [activeRecord()]),
    upsertActiveRoleRows: vi.fn(async () => []),
    createSessionConfirmation: vi.fn(),
    cancelConfirmation: vi.fn(),
    insertNotificationItem: vi.fn(async (notificationInput) => notificationRecord(notificationInput)),
    insertXpAward: vi.fn(async (awardInput) => xpAwardRecord(awardInput)),
    claimDueReminderJobs: vi.fn(async () => [])
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
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    libraryStatus: "jogando",
    activeGame: activeRecord(),
    activeLiveSession: null,
    pendingSessions: [],
    progress: playProgressRecord(),
    chapters: [],
    terminalRequest: null,
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
