import { readFileSync } from "node:fs";

import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import {
  activatePlayingGameUseCase,
  getCurrentPlayUseCase,
  promotePlayingGameUseCase,
  reorderPlayingGamesUseCase,
  type CurrentPlayGameRecord
} from "../src/modules/play";
import type {
  ActivePlayGameRecord,
  GameTimelineRecord,
  GamePlayDetailRecord,
  PlayChapterRecord,
  PlayMembershipContext,
  PlayProgressRecord,
  PlayRepository,
  PlayActivationLibraryGameRecord,
  PlayRepositoryTransaction,
  PlaySessionDetailRecord,
  PlaySessionRecord,
  PlayTerminalRequestRecord,
  PlayXpAwardRecord
} from "../src/modules/play/application/ports";
import { createPlayRepository } from "../src/modules/play/infrastructure/play-repository";

const playRepositorySource = readFileSync(
  "src/modules/play/infrastructure/play-repository.ts",
  "utf8"
);
const playPublicIndexSource = readFileSync("src/modules/play/index.ts", "utf8");

describe("play application contract", () => {
  it("activates the first game through repository transaction ports as Principal", async () => {
    const activatePlayingLibraryGame = vi.fn<PlayRepositoryTransaction["activatePlayingLibraryGame"]>(async (input) => [
      activeRecord({
        id: "active-1",
        libraryGameId: input.libraryGameId,
        role: input.role,
        position: input.position
      })
    ]);
    const repository = fakePlayRepository({
      activeGames: [],
      activatePlayingLibraryGame
    });

    await expect(
      activatePlayingGameUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      outcome: "principal-assigned",
      activeGame: expect.objectContaining({
        libraryGameId: "library-1",
        role: "principal",
        position: 1
      }),
      activeGames: [
        expect.objectContaining({
          libraryGameId: "library-1",
          role: "principal",
          position: 1
        })
      ],
      currentPlay: expect.objectContaining({ limit: 3 })
    });
    expect(activatePlayingLibraryGame).toHaveBeenCalledWith({
      duoId: "duo-1",
      actorUserId: "member-1",
      libraryGameId: "library-1",
      role: "principal",
      position: 1
    });
  });

  it("activates the second and third games as deterministic secondaries", async () => {
    const activatePlayingLibraryGame = vi.fn<PlayRepositoryTransaction["activatePlayingLibraryGame"]>(async (input) => [
      activeRecord({ id: "active-1", libraryGameId: "library-1", role: "principal", position: 1 }),
      activeRecord({
        id: `active-${input.position}`,
        libraryGameId: input.libraryGameId,
        role: input.role,
        position: input.position
      })
    ]);
    const repository = fakePlayRepository({
      activeGames: [activeRecord({ id: "active-1", role: "principal", position: 1 })],
      libraryGame: activationLibraryGame({ id: "library-2", catalogGameId: "game-2" }),
      activatePlayingLibraryGame
    });

    await expect(
      activatePlayingGameUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-2"
        },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        outcome: "secondary-assigned",
        activeGame: expect.objectContaining({
          libraryGameId: "library-2",
          role: "secondary",
          position: 2
        })
      })
    );
  });

  it("returns already-playing when the active role already exists", async () => {
    const activatePlayingLibraryGame = vi.fn();
    const repository = fakePlayRepository({
      activeGames: [
        activeRecord({
          id: "active-1",
          libraryGameId: "library-1",
          role: "principal",
          position: 1
        })
      ],
      libraryGame: activationLibraryGame({ status: "jogando" }),
      activatePlayingLibraryGame
    });

    await expect(
      activatePlayingGameUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1"
        },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        outcome: "already-playing",
        activeGame: expect.objectContaining({ libraryGameId: "library-1" })
      })
    );
    expect(activatePlayingLibraryGame).not.toHaveBeenCalled();
  });

  it("returns replacement-required before trying to mutate a fourth active game", async () => {
    const activatePlayingLibraryGame = vi.fn();
    const repository = fakePlayRepository({
      activeGames: [
        activeRecord({ id: "a", role: "principal", position: 1 }),
        activeRecord({ id: "b", libraryGameId: "library-2", role: "secondary", position: 2 }),
        activeRecord({ id: "c", libraryGameId: "library-3", role: "secondary", position: 3 })
      ],
      libraryGame: activationLibraryGame({ id: "library-4", catalogGameId: "game-4" }),
      activatePlayingLibraryGame
    });

    await expect(
      activatePlayingGameUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-4"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "replacement-required",
      replacement: {
        availableActions: ["pause", "replace", "cancel"],
        autoPause: false,
        currentGames: expect.arrayContaining([
          expect.objectContaining({ role: "principal", position: 1 })
        ])
      }
    });
    expect(activatePlayingLibraryGame).not.toHaveBeenCalled();
  });

  it("returns membership-required when no duo context exists", async () => {
    const repository = fakePlayRepository({
      membership: null,
      activeGames: []
    });

    await expect(
      activatePlayingGameUseCase(
        {
          userId: "member-1",
          catalogGameId: "game-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "membership-required"
    });
  });

  it("reads current play as a bounded Principal-first read model", async () => {
    const repository = fakePlayRepository({
      activeGames: [],
      currentGames: [
        currentPlayRecord({ role: "principal", position: 1 }),
        currentPlayRecord({
          id: "active-2",
          libraryGameId: "library-2",
          catalogGameId: "game-2",
          role: "secondary",
          position: 2
        })
      ]
    });

    await expect(getCurrentPlayUseCase("member-1", repository)).resolves.toEqual({
      ok: true,
      currentPlay: {
        games: [
          expect.objectContaining({ role: "principal", position: 1 }),
          expect.objectContaining({ role: "secondary", position: 2 })
        ],
        principal: expect.objectContaining({ role: "principal" }),
        secondaries: [expect.objectContaining({ role: "secondary" })],
        limit: 3
      }
    });
  });

  it("reorders the exact active set with first position as Principal", async () => {
    const replaceActiveRoleRows = vi.fn<PlayRepositoryTransaction["replaceActiveRoleRows"]>(async (input) =>
      input.games.map((game, index) =>
        activeRecord({
          id: `active-${index + 1}`,
          libraryGameId: game.libraryGameId,
          role: game.role,
          position: game.position
        })
      )
    );
    const repository = fakePlayRepository({
      activeGames: [],
      currentGames: [
        currentPlayRecord({ libraryGameId: "library-1", role: "principal", position: 1 }),
        currentPlayRecord({ id: "active-2", libraryGameId: "library-2", role: "secondary", position: 2 }),
        currentPlayRecord({ id: "active-3", libraryGameId: "library-3", role: "secondary", position: 3 })
      ],
      replaceActiveRoleRows
    });

    await expect(
      reorderPlayingGamesUseCase(
        {
          userId: "member-1",
          orderedLibraryGameIds: ["library-3", "library-1", "library-2"]
        },
        repository
      )
    ).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(replaceActiveRoleRows).toHaveBeenCalledWith({
      duoId: "duo-1",
      actorUserId: "member-1",
      games: [
        { libraryGameId: "library-3", role: "principal", position: 1 },
        { libraryGameId: "library-1", role: "secondary", position: 2 },
        { libraryGameId: "library-2", role: "secondary", position: 3 }
      ]
    });
  });

  it("rejects reorder proposals with duplicate or missing active games", async () => {
    const replaceActiveRoleRows = vi.fn();
    const repository = fakePlayRepository({
      activeGames: [],
      currentGames: [
        currentPlayRecord({ libraryGameId: "library-1", role: "principal", position: 1 }),
        currentPlayRecord({ id: "active-2", libraryGameId: "library-2", role: "secondary", position: 2 })
      ],
      replaceActiveRoleRows
    });

    await expect(
      reorderPlayingGamesUseCase(
        {
          userId: "member-1",
          orderedLibraryGameIds: ["library-2", "library-2"]
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "invalid-order"
    });
    expect(replaceActiveRoleRows).not.toHaveBeenCalled();
  });

  it("promotes a secondary game and demotes the previous Principal", async () => {
    const replaceActiveRoleRows = vi.fn<PlayRepositoryTransaction["replaceActiveRoleRows"]>(async (input) =>
      input.games.map((game, index) =>
        activeRecord({
          id: `active-${index + 1}`,
          libraryGameId: game.libraryGameId,
          role: game.role,
          position: game.position
        })
      )
    );
    const repository = fakePlayRepository({
      activeGames: [],
      currentGames: [
        currentPlayRecord({ libraryGameId: "library-1", role: "principal", position: 1 }),
        currentPlayRecord({ id: "active-2", libraryGameId: "library-2", role: "secondary", position: 2 })
      ],
      replaceActiveRoleRows
    });

    await expect(
      promotePlayingGameUseCase(
        {
          userId: "member-1",
          libraryGameId: "library-2"
        },
        repository
      )
    ).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(replaceActiveRoleRows).toHaveBeenCalledWith({
      duoId: "duo-1",
      actorUserId: "member-1",
      games: [
        { libraryGameId: "library-1", role: "secondary", position: 2 },
        { libraryGameId: "library-2", role: "principal", position: 1 }
      ]
    });
  });
});

describe("play repository skeleton", () => {
  it("reads active games inside the app user transaction context", async () => {
    const { pool, calls } = fakePlayReadPool();
    const repository = createPlayRepository(pool);

    await expect(
      repository.readActivePlayGames({
        userId: "member-1"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        id: "active-1",
        duoId: "duo-1",
        libraryGameId: "library-1",
        catalogGameId: "catalog-1",
        role: "principal",
        position: 1
      })
    ]);
    expect(calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        "BEGIN",
        expect.stringContaining("set_config('queue2.user_id'"),
        expect.stringContaining("FROM app.play_active_games AS active"),
        "COMMIT"
      ])
    );
  });

  it("keeps persistence patterns server-only, RLS-scoped and idempotent", () => {
    expect(playRepositorySource).toContain("import \"server-only\"");
    expect(playRepositorySource).toContain("withAppUserTransaction");
    expect(playRepositorySource).toContain("pg_advisory_xact_lock");
    expect(playRepositorySource).toContain("readCurrentPlayGames");
    expect(playRepositorySource).toContain("ON CONFLICT (library_game_id) DO UPDATE");
    expect(playRepositorySource).toContain("ON CONFLICT (session_id, user_id) DO NOTHING");
    expect(playRepositorySource).toContain("ON CONFLICT (duo_id, award_key) DO NOTHING");
    expect(playRepositorySource).toContain("FOR UPDATE SKIP LOCKED");
  });

  it("does not expose infrastructure internals through the play public entrypoint", () => {
    expect(playPublicIndexSource).not.toContain("createPlayRepository");
    expect(playPublicIndexSource).not.toMatch(/export\s+\{\s*playRepository/);
  });
});

function fakePlayRepository(input: {
  membership?: PlayMembershipContext | null;
  activeGames: ActivePlayGameRecord[];
  currentGames?: CurrentPlayGameRecord[];
  libraryGame?: PlayActivationLibraryGameRecord | null;
  activatePlayingLibraryGame?: PlayRepositoryTransaction["activatePlayingLibraryGame"];
  deactivatePlayingLibraryGame?: PlayRepositoryTransaction["deactivatePlayingLibraryGame"];
  upsertActiveRoleRows?: PlayRepositoryTransaction["upsertActiveRoleRows"];
  replaceActiveRoleRows?: PlayRepositoryTransaction["replaceActiveRoleRows"];
}): PlayRepository {
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
    readActivePlayGames: vi.fn(async () => input.activeGames),
    readCurrentPlayGames: vi.fn(async () => input.currentGames ?? input.activeGames.map(currentPlayRecord)),
    readLibraryGameForActivation: vi.fn(async () =>
      input.libraryGame === undefined
        ? activationLibraryGame()
        : input.libraryGame
    ),
    activatePlayingLibraryGame:
      input.activatePlayingLibraryGame ?? vi.fn(async () => input.activeGames),
    deactivatePlayingLibraryGame:
      input.deactivatePlayingLibraryGame ?? vi.fn(async () => input.activeGames),
    upsertActiveRoleRows:
      input.upsertActiveRoleRows ?? vi.fn(async () => input.activeGames),
    replaceActiveRoleRows:
      input.replaceActiveRoleRows ?? vi.fn(async () => input.activeGames),
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
    confirmSession: vi.fn(async (confirmationInput) => ({
      id: "confirmation-1",
      duoId: confirmationInput.duoId,
      effectId: confirmationInput.sessionId,
      userId: confirmationInput.userId,
      confirmedAt: new Date("2026-06-05T12:05:00.000Z")
    })),
    readGamePlayDetail: vi.fn(async ({ catalogGameId }) =>
      membership
        ? gamePlayDetailRecord({
            activeGame: input.activeGames.at(0) ?? null,
            catalogGameId,
            libraryGameId: input.libraryGame?.id ?? "library-1",
            libraryStatus: input.libraryGame?.status ?? "jogando"
          })
        : null
    ),
    readGameTimeline: vi.fn(async ({ catalogGameId }) =>
      membership ? gameTimelineRecord({ catalogGameId }) : null
    ),
    readActiveLiveSession: vi.fn(async () => null),
    endLiveSession: vi.fn(async () => null),
    readSessionDetail: vi.fn(async () => null),
    applyConfirmedSessionEffects: vi.fn(async (effectInput) => ({
      progress: playProgressRecord({ duoId: effectInput.duoId }),
      xpAward:
        effectInput.xpAmount > 0
          ? xpAwardRecord({
              duoId: effectInput.duoId,
              awardKey: `live-session:${effectInput.sessionId}`,
              sourceType: "live-session",
              sourceId: effectInput.sessionId,
              amount: effectInput.xpAmount,
              awardedByUserId: effectInput.actorUserId
            })
          : null,
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
    createChapter: vi.fn(async (chapterInput) =>
      playChapterRecord({
        duoId: chapterInput.duoId,
        libraryGameId: chapterInput.libraryGameId,
        title: chapterInput.title,
        createdByUserId: chapterInput.actorUserId,
        updatedByUserId: chapterInput.actorUserId
      })
    ),
    setChapterCompletion: vi.fn(async (chapterInput) => ({
      chapter: playChapterRecord({
        id: chapterInput.chapterId,
        duoId: chapterInput.duoId,
        completedAt: chapterInput.completed
          ? new Date("2026-06-05T12:15:00.000Z")
          : null,
        completedByUserId: chapterInput.completed ? chapterInput.actorUserId : null,
        updatedByUserId: chapterInput.actorUserId
      }),
      xpAward: chapterInput.completed
        ? xpAwardRecord({
            id: "chapter-xp-1",
            duoId: chapterInput.duoId,
            awardKey: `chapter:${chapterInput.chapterId}`,
            sourceType: "chapter",
            sourceId: chapterInput.chapterId,
            amount: 25,
            awardedByUserId: chapterInput.actorUserId
          })
        : null
    })),
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
    createMomento: vi.fn(async (momentoInput) => ({
      id: "momento-1",
      duoId: momentoInput.duoId,
      libraryGameId: momentoInput.libraryGameId,
      sessionId: momentoInput.sessionId,
      authorUserId: momentoInput.actorUserId,
      body: momentoInput.body,
      isSpoiler: momentoInput.isSpoiler,
      revealedForViewer: !momentoInput.isSpoiler,
      createdAt: new Date("2026-06-05T12:20:00.000Z"),
      updatedAt: new Date("2026-06-05T12:20:00.000Z")
    })),
    revealMomento: vi.fn(async (momentoInput) => ({
      id: momentoInput.momentoId,
      duoId: momentoInput.duoId,
      libraryGameId: "library-1",
      sessionId: null,
      authorUserId: "member-1",
      body: "Virada memoravel",
      isSpoiler: true,
      revealedForViewer: true,
      createdAt: new Date("2026-06-05T12:20:00.000Z"),
      updatedAt: new Date("2026-06-05T12:20:00.000Z")
    })),
    insertNotificationItem: vi.fn(),
    insertXpAward: vi.fn()
  };

  return {
    withUserTransaction: async (_userId, callback) => callback(transaction),
    resolveMembership: vi.fn(async () => membership),
    readCurrentPlay: vi.fn(async () =>
      membership
        ? {
            games: input.currentGames ?? input.activeGames.map(currentPlayRecord),
            principal:
              (input.currentGames ?? input.activeGames.map(currentPlayRecord)).find(
                (game) => game.role === "principal"
              ) ?? null,
            secondaries: (input.currentGames ?? input.activeGames.map(currentPlayRecord)).filter(
              (game) => game.role === "secondary"
            ),
            limit: 3 as const
          }
        : null
    ),
    readGamePlayDetail: vi.fn(async ({ catalogGameId }) =>
      membership
        ? gamePlayDetailRecord({
            activeGame: input.activeGames.at(0) ?? null,
            catalogGameId,
            libraryGameId: input.libraryGame?.id ?? "library-1",
            libraryStatus: input.libraryGame?.status ?? "jogando"
          })
        : null
    ),
    readGameTimeline: vi.fn(async ({ catalogGameId }) =>
      membership ? gameTimelineRecord({ catalogGameId }) : null
    ),
    readActivePlayGames: vi.fn(async () => input.activeGames),
    upsertActiveRoleRows: vi.fn(async () => input.activeGames),
    createSessionConfirmation: vi.fn(),
    cancelConfirmation: vi.fn(),
    insertNotificationItem: vi.fn(),
    insertXpAward: vi.fn(),
    claimDueReminderJobs: vi.fn()
  };
}

function fakePlayReadPool(): {
  pool: QueueDbPool;
  calls: Array<{ sql: string; values: unknown[] }>;
} {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (sql.includes("set_config('queue2.user_id'")) {
        return { rows: [] };
      }

      if (sql.includes("FROM app.duo_members AS member")) {
        return {
          rows: [
            { duo_id: "duo-1", user_id: "member-1" },
            { duo_id: "duo-1", user_id: "member-2" }
          ]
        };
      }

      if (sql.includes("FROM app.play_active_games AS active")) {
        return {
          rows: [
            {
              id: "active-1",
              duo_id: "duo-1",
              library_game_id: "library-1",
              catalog_game_id: "catalog-1",
              role: "principal",
              position: 1,
              updated_at: new Date("2026-06-05T12:00:00.000Z")
            }
          ]
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }),
    release: vi.fn()
  } as unknown as QueueDbClient;
  const pool = {
    connect: vi.fn(async () => client)
  } as unknown as QueueDbPool;

  return { pool, calls };
}

function activeRecord(overrides: Partial<ActivePlayGameRecord> = {}): ActivePlayGameRecord {
  return {
    id: "active-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    catalogGameId: "catalog-1",
    role: "principal",
    position: 1,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function currentPlayRecord(
  overrides: Partial<CurrentPlayGameRecord> | ActivePlayGameRecord = {}
): CurrentPlayGameRecord {
  return {
    ...activeRecord(overrides),
    libraryStatus: "jogando",
    catalogGame: {
      id: "game-1",
      slug: "it-takes-two",
      name: "It Takes Two",
      coverUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
      source: "RAWG",
      sourceUrl: "https://rawg.io/games/it-takes-two",
      sourceUpdatedAt: new Date("2026-06-05T12:00:00.000Z"),
      syncedAt: new Date("2026-06-05T12:00:00.000Z"),
      hasReliableTimeEstimate: true,
      hasVerifiedAvailability: false
    },
    progress: {
      confirmedCoopSeconds: 0,
      subjectivePercent: null
    },
    ...overrides
  };
}

function gamePlayDetailRecord(
  overrides: Partial<GamePlayDetailRecord> = {}
): GamePlayDetailRecord {
  const catalogGameId = overrides.catalogGameId ?? "game-1";
  const libraryGameId = overrides.libraryGameId ?? "library-1";

  return {
    duoId: "duo-1",
    libraryGameId,
    catalogGameId,
    libraryStatus: "jogando",
    activeGame: activeRecord({ catalogGameId, libraryGameId }),
    activeLiveSession: null,
    pendingSessions: [],
    progress: playProgressRecord({ libraryGameId }),
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

function playSessionRecord(
  overrides: Partial<PlaySessionRecord> = {}
): PlaySessionRecord {
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
    confirmedByUserIds: [],
    pendingUserIds: ["member-1", "member-2"],
    confirmationCount: 0,
    requiredConfirmationCount: 2,
    doubleConfirmed: false,
    ...overrides
  };
}

function playChapterRecord(
  overrides: Partial<PlayChapterRecord> = {}
): PlayChapterRecord {
  return {
    id: "chapter-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    title: "Ato 1 completo",
    position: 1,
    completedAt: null,
    completedByUserId: null,
    createdByUserId: "member-1",
    updatedByUserId: "member-1",
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
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

function activationLibraryGame(
  overrides: Partial<PlayActivationLibraryGameRecord> = {}
): PlayActivationLibraryGameRecord {
  return {
    id: "library-1",
    duoId: "duo-1",
    catalogGameId: "game-1",
    status: "wishlist",
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}
