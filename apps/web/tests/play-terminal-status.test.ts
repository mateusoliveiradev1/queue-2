import { describe, expect, it, vi } from "vitest";

import {
  cancelTerminalStatusUseCase,
  confirmTerminalStatusUseCase,
  requestTerminalStatusUseCase
} from "../src/modules/play/application/request-terminal-status";
import { confirmTerminalRequest } from "../src/modules/play/domain/play-policy";
import type {
  ActivePlayGameRecord,
  GamePlayDetailRecord,
  PlayMembershipContext,
  PlayNotificationRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlayTerminalRequestRecord,
  PlayXpAwardRecord
} from "../src/modules/play/application/ports";

describe("Phase 04.3 terminal play status", () => {
  it("rejects invalid terminal targets before opening a transaction", async () => {
    const { repository } = makeTerminalRepository();

    await expect(
      requestTerminalStatusUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          targetStatus: "finalizado"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "invalid-terminal-status"
    });
    expect(repository.withUserTransaction).not.toHaveBeenCalled();
  });

  it("requires the game to be in Jogando Agora before creating a terminal request", async () => {
    const createTerminalRequest = vi.fn<PlayRepositoryTransaction["createTerminalRequest"]>();
    const { repository } = makeTerminalRepository({
      transaction: {
        createTerminalRequest,
        readGamePlayDetail: vi.fn(async () =>
          gamePlayDetailRecord({
            activeGame: null,
            libraryStatus: "wishlist"
          })
        )
      }
    });

    await expect(
      requestTerminalStatusUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          targetStatus: "zerado"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "not-playing"
    });
    expect(createTerminalRequest).not.toHaveBeenCalled();
  });

  it("creates a pending request and confirmation notification for a playing game", async () => {
    const createTerminalRequest = vi.fn<PlayRepositoryTransaction["createTerminalRequest"]>(
      async (input) =>
        terminalRequestRecord({
          duoId: input.duoId,
          libraryGameId: input.libraryGameId,
          requestedByUserId: input.actorUserId,
          targetStatus: input.targetStatus
        })
    );
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord(input)
    );
    const { repository } = makeTerminalRepository({
      transaction: {
        createTerminalRequest,
        insertNotificationItem
      }
    });

    await expect(
      requestTerminalStatusUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          targetStatus: "dropado"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      state: "pending",
      request: expect.objectContaining({
        requestedByUserId: "member-1",
        status: "pending",
        targetStatus: "dropado"
      })
    });
    expect(insertNotificationItem).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "terminal-request",
        actionRefType: "terminal_request",
        title: "Confirmar Dropado"
      })
    );
  });

  it("keeps requester confirmation blocked until the other duo member acts", async () => {
    expect(
      confirmTerminalRequest({
        requestStatus: "pending",
        requestedByUserId: "member-1",
        actorUserId: "member-1"
      })
    ).toEqual({
      ok: false,
      reason: "partner-confirmation-required"
    });

    const confirmTerminalRequestPort = vi.fn<
      PlayRepositoryTransaction["confirmTerminalRequest"]
    >(async () => null);
    const { repository } = makeTerminalRepository({
      transaction: {
        confirmTerminalRequest: confirmTerminalRequestPort
      }
    });

    await expect(
      confirmTerminalStatusUseCase(
        {
          userId: "member-1",
          requestId: "terminal-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "partner-confirmation-required"
    });
    expect(confirmTerminalRequestPort).toHaveBeenCalledWith({
      duoId: "duo-1",
      requestId: "terminal-1",
      actorUserId: "member-1"
    });
  });

  it("cancels only pending terminal requests in the duo transaction scope", async () => {
    const cancelTerminalRequest = vi.fn<PlayRepositoryTransaction["cancelTerminalRequest"]>(
      async (input) =>
        terminalRequestRecord({
          id: input.requestId,
          duoId: input.duoId,
          status: "cancelled",
          cancelledByUserId: input.actorUserId
        })
    );
    const { repository } = makeTerminalRepository({
      transaction: {
        cancelTerminalRequest
      }
    });

    await expect(
      cancelTerminalStatusUseCase(
        {
          userId: "member-1",
          requestId: "terminal-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      request: expect.objectContaining({
        status: "cancelled",
        cancelledByUserId: "member-1"
      })
    });
    expect(cancelTerminalRequest).toHaveBeenCalledWith({
      duoId: "duo-1",
      requestId: "terminal-1",
      actorUserId: "member-1"
    });
  });
});

function makeTerminalRepository(input: {
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
    createSession: vi.fn(),
    confirmSession: vi.fn(),
    readGamePlayDetail: vi.fn(async () => gamePlayDetailRecord()),
    readActiveLiveSession: vi.fn(async () => null),
    endLiveSession: vi.fn(async () => null),
    readSessionDetail: vi.fn(async () => null),
    applyConfirmedSessionEffects: vi.fn(async () => null),
    updateProgressPercent: vi.fn(),
    createChapter: vi.fn(),
    setChapterCompletion: vi.fn(),
    createTerminalRequest: vi.fn(async (terminalInput) =>
      terminalRequestRecord({
        duoId: terminalInput.duoId,
        libraryGameId: terminalInput.libraryGameId,
        targetStatus: terminalInput.targetStatus,
        requestedByUserId: terminalInput.actorUserId
      })
    ),
    cancelTerminalRequest: vi.fn(async () => null),
    confirmTerminalRequest: vi.fn(async () => null),
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
    progress: {
      duoId: "duo-1",
      libraryGameId: "library-1",
      confirmedCoopSeconds: 0,
      subjectivePercent: null,
      updatedAt: new Date("2026-06-05T12:00:00.000Z")
    },
    chapters: [],
    terminalRequest: null,
    ...overrides
  };
}

function terminalRequestRecord(
  overrides: Partial<PlayTerminalRequestRecord> = {}
): PlayTerminalRequestRecord {
  return {
    id: "terminal-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    targetStatus: "zerado",
    status: "pending",
    requestedByUserId: "member-1",
    confirmedByUserId: null,
    cancelledByUserId: null,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
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
    notificationType: "terminal-request",
    state: "unread",
    actionRefType: "terminal_request",
    actionRefId: "terminal-1",
    title: "Confirmar Zerado",
    body: null,
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function xpAwardRecord(overrides: Partial<PlayXpAwardRecord> = {}): PlayXpAwardRecord {
  return {
    id: "xp-1",
    duoId: "duo-1",
    awardKey: "terminal-status:terminal-1",
    sourceType: "terminal-status",
    sourceId: "terminal-1",
    amount: 0,
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: new Date("2026-06-05T12:10:00.000Z"),
    ...overrides
  };
}
