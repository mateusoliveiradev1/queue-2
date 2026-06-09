import { describe, expect, it, vi } from "vitest";

const rouletteModulePath = "../src/modules/roulette";

type RouletteModule = Record<string, unknown>;

describe("roulette application contract scaffold", () => {
  it("D-16 D-21 D-24 resumes an active persisted round instead of starting a new draw or charging boost", async () => {
    const roulette = await loadRouletteModule();
    const startRouletteRound = getFunction(roulette, "startRouletteRoundUseCase");
    const repository = fakeRouletteRepository({
      activeRound: roundRecord({ status: "revealing" })
    });

    await expect(
      startRouletteRound(
        {
          idempotencyKey: "round-replay",
          requestBoost: true,
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      reason: "active-round-resumed",
      round: expect.objectContaining({
        id: "round-1",
        resultLibraryGameId: "library-result"
      })
    });
    expect(repository.transaction.spendBoost).not.toHaveBeenCalled();
    expect(repository.transaction.persistRound).not.toHaveBeenCalled();
  });

  it("D-15 refunds a boost only when the boosted round failed before the result was persisted", async () => {
    const roulette = await loadRouletteModule();
    const startRouletteRound = getFunction(roulette, "startRouletteRoundUseCase");
    const repository = fakeRouletteRepository({
      persistRound: vi.fn(async () => {
        throw new Error("network-before-persist");
      })
    });

    await expect(
      startRouletteRound(
        {
          idempotencyKey: "round-fails-before-persist",
          requestBoost: true,
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "round-persist-failed",
      refundedBoost: true
    });
    expect(repository.transaction.refundBoost).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        reasonCode: "pre-persistence-failure"
      })
    );
  });

  it("D-07 D-22 D-29 keeps revealed results as pending invitations and replay never redraws", async () => {
    const roulette = await loadRouletteModule();
    const replayRouletteRound = getFunction(roulette, "replayRouletteRoundUseCase");
    const repository = fakeRouletteRepository({
      activeRound: roundRecord({ replayCount: 1, status: "pending_invitation" })
    });

    await expect(
      replayRouletteRound(
        {
          roundId: "round-1",
          userId: "member-2"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      replayOnly: true,
      round: expect.objectContaining({
        resultLibraryGameId: "library-result",
        status: "pending_invitation"
      })
    });
    expect(repository.transaction.selectResult).not.toHaveBeenCalled();
    expect(repository.transaction.spendBoost).not.toHaveBeenCalled();
  });

  it("D-18 reads the default audio preference and exposes muteable opt-in state without autoplay", async () => {
    const roulette = await loadRouletteModule();
    const getRouletteState = getFunction(roulette, "getRouletteStateUseCase");
    const repository = fakeRouletteRepository({
      audioPreference: false,
      activeRound: null
    });

    await expect(
      getRouletteState(
        {
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        audio: {
          defaultEnabledFromDuoPreference: false,
          muted: true,
          noAutoplay: true,
          optInRequired: true
        }
      })
    );
  });

  it("D-26 D-27 D-28 locks a pending result through Play and returns the replacement branch when three games are active", async () => {
    const roulette = await loadRouletteModule();
    const lockRouletteResult = getFunction(roulette, "lockRouletteResultAsPrincipalUseCase");
    const repository = fakeRouletteRepository({
      activeRound: roundRecord({ status: "pending_invitation" })
    });
    const play = {
      activatePrincipalFromRoulette: vi.fn(async () => ({
        activeGames: ["principal", "secondary-a", "secondary-b"],
        ok: false,
        reason: "replacement-required"
      }))
    };

    await expect(
      lockRouletteResult(
        {
          roundId: "round-1",
          userId: "member-1"
        },
        repository,
        { play }
      )
    ).resolves.toEqual({
      activeGames: ["principal", "secondary-a", "secondary-b"],
      autoPause: false,
      ok: false,
      reason: "replacement-required"
    });
    expect(play.activatePrincipalFromRoulette).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "member-1",
        libraryGameId: "library-result"
      })
    );
    expect(repository.transaction.completeRound).not.toHaveBeenCalled();
  });

  it("D-30 D-31 D-32 records discard history, cooldown and light notifications without refunding persisted boost", async () => {
    const roulette = await loadRouletteModule();
    const discardRouletteResult = getFunction(roulette, "discardRouletteResultUseCase");
    const repository = fakeRouletteRepository({
      activeRound: roundRecord({
        boostSpent: true,
        status: "pending_invitation"
      })
    });

    await expect(
      discardRouletteResult(
        {
          roundId: "round-1",
          userId: "member-2"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      outcome: "discarded"
    });
    expect(repository.transaction.refundBoost).not.toHaveBeenCalled();
    expect(repository.transaction.insertHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "discarded",
        roundId: "round-1"
      })
    );
    expect(repository.transaction.upsertCooldown).toHaveBeenCalledWith(
      expect.objectContaining({
        libraryGameId: "library-result",
        remainingRounds: 3,
        weightMultiplier: 0.5
      })
    );
    expect(repository.transaction.insertPlayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "roulette-result-discarded"
      })
    );
  });
});

async function loadRouletteModule(): Promise<RouletteModule> {
  return import(rouletteModulePath) as Promise<RouletteModule>;
}

function getFunction(module: RouletteModule, name: string): (...args: unknown[]) => unknown {
  const value = module[name];

  if (typeof value !== "function") {
    throw new Error(`missing Phase 6 implementation export: ${name}`);
  }

  return value as (...args: unknown[]) => unknown;
}

function fakeRouletteRepository(
  overrides: {
    activeRound?: ReturnType<typeof roundRecord> | null;
    audioPreference?: boolean;
    persistRound?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const transaction = {
    completeRound: vi.fn(),
    insertHistoryEvent: vi.fn(),
    insertPlayNotification: vi.fn(),
    persistRound: overrides.persistRound ?? vi.fn(async () => roundRecord()),
    readActiveRound: vi.fn(async () => overrides.activeRound ?? null),
    readAudioPreference: vi.fn(async () => overrides.audioPreference ?? true),
    refundBoost: vi.fn(),
    resolveMembership: vi.fn(async () => ({
      duoId: "duo-1",
      memberUserIds: ["member-1", "member-2"],
      partnerUserId: "member-2",
      userId: "member-1"
    })),
    selectResult: vi.fn(async () => ({ libraryGameId: "library-result" })),
    spendBoost: vi.fn(async () => ({
      amount: 100,
      ledgerId: "boost-ledger-1"
    })),
    upsertCooldown: vi.fn()
  };

  return {
    transaction,
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction))
  };
}

function roundRecord(
  overrides: Partial<{
    boostSpent: boolean;
    id: string;
    replayCount: number;
    resultLibraryGameId: string;
    status: string;
  }> = {}
) {
  return {
    boostSpent: false,
    id: "round-1",
    replayCount: 0,
    resultLibraryGameId: "library-result",
    status: "revealing",
    ...overrides
  };
}
