import { describe, expect, it, vi } from "vitest";

import { getGameTimelineUseCase } from "../src/modules/play/application/get-game-timeline";
import {
  createMomentoUseCase,
  revealMomentoSpoilerUseCase
} from "../src/modules/play/application/manage-momentos";
import type {
  ActivePlayGameRecord,
  GameTimelineRecord,
  GamePlayDetailRecord,
  PlayMembershipContext,
  PlayMomentoRecord,
  PlayNotificationRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlayXpAwardRecord
} from "../src/modules/play/application/ports";
import { classifyTimelineMilestones } from "../src/modules/play/domain/milestone-policy";

describe("Phase 04.4 timeline milestones", () => {
  it("classifies first, night and marathon milestones with duo timezone", () => {
    expect(
      classifyTimelineMilestones({
        accumulatedConfirmedSecondsAfter: 14_400,
        accumulatedConfirmedSecondsBefore: 0,
        confirmedSessionCountBefore: 0,
        durationSeconds: 14_400,
        estimatedMinutes: null,
        sessionStartedAt: new Date("2026-06-06T02:30:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toEqual(["first-session", "night-session", "marathon"]);
  });

  it("emits sourced estimate milestones only when thresholds are crossed", () => {
    expect(
      classifyTimelineMilestones({
        accumulatedConfirmedSecondsAfter: 11 * 60 * 60,
        accumulatedConfirmedSecondsBefore: 6 * 60 * 60,
        confirmedSessionCountBefore: 3,
        durationSeconds: 5 * 60 * 60,
        estimatedMinutes: 600,
        sessionStartedAt: new Date("2026-06-05T18:00:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toEqual(["marathon", "estimated-time-100"]);

    expect(
      classifyTimelineMilestones({
        accumulatedConfirmedSecondsAfter: 12 * 60 * 60,
        accumulatedConfirmedSecondsBefore: 11 * 60 * 60,
        confirmedSessionCountBefore: 4,
        durationSeconds: 60 * 60,
        estimatedMinutes: null,
        sessionStartedAt: new Date("2026-06-05T18:00:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).not.toContain("estimated-time-100");
  });
});

describe("Phase 04.4 timeline application", () => {
  it("reads the game timeline through the play repository boundary", async () => {
    const readGameTimeline = vi.fn<PlayRepository["readGameTimeline"]>(async () =>
      gameTimelineRecord({
        events: [
          {
            id: "milestone:session-1:first-session",
            occurredAt: new Date("2026-06-05T20:00:00.000Z"),
            type: "milestone",
            milestone: {
              id: "session-1:first-session",
              kind: "first-session",
              label: "Primeira sessao",
              description: "A jornada da dupla comecou neste jogo.",
              occurredAt: new Date("2026-06-05T20:00:00.000Z")
            }
          }
        ]
      })
    );
    const { repository } = makeTimelineRepository({ readGameTimeline });

    await expect(
      getGameTimelineUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          estimatedMinutes: 600
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      timeline: expect.objectContaining({
        events: [expect.objectContaining({ type: "milestone" })]
      })
    });
    expect(readGameTimeline).toHaveBeenCalledWith({
      userId: "member-1",
      catalogGameId: "game-1",
      estimatedMinutes: 600
    });
  });

  it("creates bounded plain-text Momentos for the current game", async () => {
    const createMomento = vi.fn<PlayRepositoryTransaction["createMomento"]>(
      async (input) =>
        momentoRecord({
          body: input.body,
          isSpoiler: input.isSpoiler,
          sessionId: input.sessionId,
          authorUserId: input.actorUserId
        })
    );
    const { repository } = makeTimelineRepository({
      transaction: {
        createMomento
      }
    });

    await expect(
      createMomentoUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1",
          body: "  Virada   memoravel  ",
          isSpoiler: true,
          sessionId: null
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      momento: expect.objectContaining({
        body: "Virada memoravel",
        isSpoiler: true
      })
    });
    expect(createMomento).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Virada memoravel",
        isSpoiler: true,
        libraryGameId: "library-1"
      })
    );
  });

  it("stores spoiler reveal state for only the current viewer", async () => {
    const revealMomento = vi.fn<PlayRepositoryTransaction["revealMomento"]>(
      async (input) =>
        momentoRecord({
          id: input.momentoId,
          revealedForViewer: true
        })
    );
    const { repository } = makeTimelineRepository({
      transaction: {
        revealMomento
      }
    });

    await expect(
      revealMomentoSpoilerUseCase(
        {
          userId: "member-2",
          momentoId: "momento-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      momento: expect.objectContaining({
        id: "momento-1",
        revealedForViewer: true
      })
    });
    expect(revealMomento).toHaveBeenCalledWith({
      duoId: "duo-1",
      momentoId: "momento-1",
      viewerUserId: "member-2"
    });
  });
});

function makeTimelineRepository(input: {
  membership?: PlayMembershipContext | null;
  readGameTimeline?: PlayRepository["readGameTimeline"];
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
    createMomento: vi.fn(async (momentoInput) => momentoRecord(momentoInput)),
    revealMomento: vi.fn(async (momentoInput) =>
      momentoRecord({
        id: momentoInput.momentoId,
        revealedForViewer: true
      })
    ),
    insertNotificationItem: vi.fn(async (notificationInput) => notificationRecord(notificationInput)),
    insertXpAward: vi.fn(async (awardInput) => xpAwardRecord(awardInput)),
    ...input.transaction
  };
  const repository: PlayRepository = {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
    resolveMembership: vi.fn(async () => membership),
    readCurrentPlay: vi.fn(async () => null),
    readGamePlayDetail: vi.fn(async () => gamePlayDetailRecord()),
    readGameTimeline: input.readGameTimeline ?? vi.fn(async () => gameTimelineRecord()),
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

function momentoRecord(overrides: Partial<PlayMomentoRecord> = {}): PlayMomentoRecord {
  return {
    id: "momento-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    sessionId: null,
    authorUserId: "member-1",
    body: "Virada memoravel",
    isSpoiler: false,
    revealedForViewer: true,
    createdAt: new Date("2026-06-05T20:00:00.000Z"),
    updatedAt: new Date("2026-06-05T20:00:00.000Z"),
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
    title: "Timeline",
    body: null,
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function xpAwardRecord(overrides: Partial<PlayXpAwardRecord> = {}): PlayXpAwardRecord {
  return {
    id: "xp-1",
    duoId: "duo-1",
    awardKey: "timeline:test",
    sourceType: "chapter",
    sourceId: "chapter-1",
    amount: 25,
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: new Date("2026-06-05T12:10:00.000Z"),
    ...overrides
  };
}
