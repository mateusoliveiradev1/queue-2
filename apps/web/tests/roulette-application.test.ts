import { describe, expect, it, vi } from "vitest";

import type {
  RouletteBoostBalanceRecord,
  RouletteCooldownRecord,
  RouletteHistoryEventRecord,
  RouletteMembershipContext,
  RoulettePityStateRecord,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundEntryRecord,
  RouletteRoundRecord
} from "../src/modules/roulette/application/ports";
import type { RouletteVisualReelSlot } from "../src/modules/roulette/domain/roulette-policy";

import { discardRouletteResultUseCase } from "../src/modules/roulette/application/discard-roulette-result";
import { getRouletteHistoryUseCase } from "../src/modules/roulette/application/get-roulette-history";
import { getRouletteStateUseCase } from "../src/modules/roulette/application/get-roulette-state";
import { lockRouletteResultAsPrincipalUseCase } from "../src/modules/roulette/application/lock-roulette-result-as-principal";
import { replayRouletteRoundUseCase } from "../src/modules/roulette/application/replay-roulette-round";
import { startRouletteRoundUseCase } from "../src/modules/roulette/application/start-roulette-round";
import {
  ROULETTE_COOLDOWN_MULTIPLIER,
  ROULETTE_COOLDOWN_ROUNDS
} from "../src/modules/roulette/domain/roulette-policy";

describe("roulette state, history and replay application use cases", () => {
  it("returns blocked-pool with semantic CTAs, boost, pity and D-18 audio preference when fewer than three games are eligible", async () => {
    const repository = fakeRouletteRepository({
      audioEnabled: false,
      eligibleGames: [
        eligibleGame({ id: "library-a", status: "wishlist", title: "A" }),
        eligibleGame({ id: "library-b", status: "pausado", title: "B" }),
        eligibleGame({ id: "library-c", status: "jogando", title: "C" })
      ]
    });

    await expect(
      getRouletteStateUseCase({ userId: "member-1" }, repository)
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        state: expect.objectContaining({
          audioEnabled: false,
          boost: {
            balance: 80,
            canUseBoost: false,
            cap: 600
          },
          pity: expect.objectContaining({
            drawsSinceEpicOrHigher: 4,
            progressText: expect.stringMatching(/garantia/i)
          }),
          state: "blocked-pool",
          blockedPool: {
            ctas: ["biblioteca", "descobrir", "catalogo"],
            eligibleCount: 2,
            reason: "minimum-eligible-pool",
            requiredEligibleCount: 3
          }
        })
      })
    );
    expect(repository.transaction.readAudioPreference).toHaveBeenCalledWith({
      duoId: "duo-1"
    });
  });

  it("returns active/revealing/pending_invitation rounds before ready state so refreshes resume authoritative state", async () => {
    const round = roundRecord({ status: "pending_invitation" });
    const entries = [roundEntry({ roundId: round.id, selectedSlot: true })];
    const repository = fakeRouletteRepository({
      activeRound: round,
      activeRoundEntries: entries,
      eligibleGames: [
        eligibleGame({ id: "library-a", status: "wishlist" }),
        eligibleGame({ id: "library-b", status: "wishlist" }),
        eligibleGame({ id: "library-c", status: "pausado" })
      ]
    });

    await expect(
      getRouletteStateUseCase({ userId: "member-2" }, repository)
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        state: expect.objectContaining({
          state: "pending_invitation",
          round: expect.objectContaining({
            id: "round-1",
            resultLibraryGameId: "library-result",
            status: "pending_invitation"
          }),
          entries
        })
      })
    );
  });

  it("returns ready state with only wishlist and pausado games when there is no active round", async () => {
    const repository = fakeRouletteRepository({
      eligibleGames: [
        eligibleGame({ id: "library-a", rarity: "common", status: "wishlist" }),
        eligibleGame({ id: "library-b", rarity: "rare", status: "pausado" }),
        eligibleGame({ id: "library-c", rarity: "epic", status: "wishlist" }),
        eligibleGame({ id: "library-d", rarity: "legendary", status: "zerado" })
      ]
    });

    await expect(
      getRouletteStateUseCase({ userId: "member-1" }, repository)
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        state: expect.objectContaining({
          state: "ready",
          eligibleGames: [
            expect.objectContaining({ id: "library-a", status: "wishlist" }),
            expect.objectContaining({ id: "library-b", status: "pausado" }),
            expect.objectContaining({ id: "library-c", status: "wishlist" })
          ],
          audioEnabled: true
        })
      })
    );
  });

  it("reads compact history for the caller duo with a bounded default limit", async () => {
    const repository = fakeRouletteRepository({
      history: [
        historyEvent({ eventKey: "history:round-1:revealed", eventType: "revealed" })
      ]
    });

    await expect(
      getRouletteHistoryUseCase({ userId: "member-1" }, repository)
    ).resolves.toEqual({
      ok: true,
      history: [
        expect.objectContaining({
          eventKey: "history:round-1:revealed",
          eventType: "revealed"
        })
      ]
    });
    expect(repository.transaction.readHistory).toHaveBeenCalledWith({
      duoId: "duo-1",
      limit: 12
    });
  });

  it("replay returns the persisted round with isReplay and never redraws, spends, refunds or updates history/economy", async () => {
    const repository = fakeRouletteRepository({
      roundById: roundRecord({ status: "pending_invitation" }),
      roundEntries: [
        roundEntry({
          roundId: "round-1",
          selectedSlot: true
        })
      ]
    });

    await expect(
      replayRouletteRoundUseCase(
        {
          roundId: "round-1",
          userId: "member-2"
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      isReplay: true,
      round: expect.objectContaining({
        id: "round-1",
        resultLibraryGameId: "library-result"
      }),
      entries: [
        expect.objectContaining({
          roundId: "round-1",
          selectedSlot: true
        })
      ]
    });
    expect(repository.transaction.selectResult).not.toHaveBeenCalled();
    expect(repository.transaction.insertBoostLedgerEntry).not.toHaveBeenCalled();
    expect(repository.transaction.updateBoostBalance).not.toHaveBeenCalled();
    expect(repository.transaction.updatePityState).not.toHaveBeenCalled();
    expect(repository.transaction.insertHistoryEvent).not.toHaveBeenCalled();
  });
});

describe("roulette idempotent start application use case", () => {
  it("D-16 D-24 returns an existing active round before creating a draw or spending boost", async () => {
    const activeRound = roundRecord({ status: "revealing" });
    const activeEntries = [roundEntry({ roundId: activeRound.id, selectedSlot: true })];
    const repository = fakeRouletteRepository({
      activeRound,
      activeRoundEntries: activeEntries
    });

    await expect(
      startRouletteRoundUseCase(
        {
          idempotencyKey: "existing-active",
          useBoost: true,
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual({
      boostLedger: null,
      entries: activeEntries,
      ok: true,
      resumedExistingRound: true,
      round: expect.objectContaining({
        id: "round-1",
        status: "revealing"
      })
    });
    expect(repository.transaction.insertBoostLedgerEntry).not.toHaveBeenCalled();
    expect(repository.transaction.persistRound).not.toHaveBeenCalled();
    expect(repository.transaction.persistRoundEntries).not.toHaveBeenCalled();
  });

  it("D-21 persists boost spend, pity transition, history and 60-slot snapshot before returning a new reveal", async () => {
    const repository = fakeRouletteRepository({
      eligibleGames: [
        eligibleGame({ id: "library-a", rarity: "common", status: "wishlist" }),
        eligibleGame({ id: "library-b", rarity: "rare", status: "pausado" }),
        eligibleGame({ id: "library-c", rarity: "epic", status: "wishlist" })
      ],
      boostBalance: boostBalance({ balance: 200 }),
      pity: pityState({ drawsSinceEpicOrHigher: 9 })
    });

    await expect(
      startRouletteRoundUseCase(
        {
          idempotencyKey: "new-boosted-round",
          roll: 0.99,
          seed: "seeded",
          useBoost: true,
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        resumedExistingRound: false,
        round: expect.objectContaining({
          boostSpent: true,
          idempotencyKey: "new-boosted-round",
          pityBefore: 9
        })
      })
    );
    expect(repository.transaction.materializeBoostFromXp).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "member-1",
        duoId: "duo-1"
      })
    );
    expect(repository.transaction.insertBoostLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        amountDelta: -100,
        ledgerKey: "spend:new-boosted-round",
        reasonCode: "boost-spend",
        sourceType: "roulette-round"
      })
    );
    expect(repository.transaction.persistRound).toHaveBeenCalledWith(
      expect.objectContaining({
        boostSpent: true,
        duoId: "duo-1",
        idempotencyKey: "new-boosted-round",
        pityAfter: 0,
        pityBefore: 9,
        resultLibraryGameId: "library-c"
      })
    );
    expect(repository.transaction.persistRoundEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: expect.arrayContaining([
          expect.objectContaining({
            authoritativeResult: true,
            gameId: "library-c"
          })
        ])
      })
    );
    const persistedEntries = repository.transaction.persistRoundEntries.mock.calls[0]?.[0]
      ?.entries;
    expect(persistedEntries).toHaveLength(60);
    expect(repository.transaction.updatePityState).toHaveBeenCalledWith(
      expect.objectContaining({
        drawsSinceEpicOrHigher: 0,
        duoId: "duo-1"
      })
    );
    expect(repository.transaction.decrementCooldowns).toHaveBeenCalledWith({
      duoId: "duo-1"
    });
    expect(repository.transaction.insertHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: "history:new-boosted-round:revealed",
        eventType: "revealed"
      })
    );
  });

  it("D-15 refunds boosted starts that fail before the round is persisted", async () => {
    const repository = fakeRouletteRepository({
      boostBalance: boostBalance({ balance: 200 }),
      eligibleGames: [
        eligibleGame({ id: "library-a", status: "wishlist" }),
        eligibleGame({ id: "library-b", status: "pausado" }),
        eligibleGame({ id: "library-c", status: "wishlist" })
      ],
      persistRound: vi.fn(async () => {
        throw new Error("persist-failed-before-round");
      })
    });

    await expect(
      startRouletteRoundUseCase(
        {
          idempotencyKey: "fails-before-persist",
          useBoost: true,
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "round-persist-failed",
      refundedBoost: true
    });
    expect(repository.transaction.insertBoostLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        amountDelta: 100,
        ledgerKey: "refund:fails-before-persist",
        reasonCode: "pre-persistence-failure",
        sourceType: "roulette-refund"
      })
    );
  });

  it("D-15 resumes a persisted round after post-persistence failure without refunding boost", async () => {
    const persistedRound = roundRecord({
      boostSpent: true,
      id: "persisted-round",
      idempotencyKey: "fails-after-persist"
    });
    const repository = fakeRouletteRepository({
      boostBalance: boostBalance({ balance: 200 }),
      eligibleGames: [
        eligibleGame({ id: "library-a", status: "wishlist" }),
        eligibleGame({ id: "library-b", status: "pausado" }),
        eligibleGame({ id: "library-c", status: "wishlist" })
      ],
      persistRound: vi.fn(async () => persistedRound),
      persistRoundEntries: vi.fn(async () => {
        throw new Error("entries-failed-after-round");
      }),
      roundByIdempotencyKey: persistedRound
    });

    await expect(
      startRouletteRoundUseCase(
        {
          idempotencyKey: "fails-after-persist",
          useBoost: true,
          userId: "member-1"
        },
        repository
      )
    ).resolves.toEqual({
      boostLedger: null,
      entries: [],
      ok: true,
      resumedExistingRound: true,
      round: expect.objectContaining({
        id: "persisted-round"
      })
    });
    expect(repository.transaction.insertBoostLedgerEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({
        ledgerKey: "refund:fails-after-persist"
      })
    );
  });
});

describe("roulette invitation resolution application use cases", () => {
  it("D-26 locks a pending result as Principal with actor history and Central notification facts", async () => {
    const repository = fakeRouletteRepository({
      roundById: roundRecord({
        resultCatalogGameId: "catalog-result",
        resultLibraryGameId: "library-result",
        status: "pending_invitation"
      })
    });
    const play = fakeRoulettePlayCoordinator({
      activatePlayingGame: vi.fn(async () => ({
        ok: true as const,
        outcome: "secondary-assigned" as const,
        activeGame: { libraryGameId: "library-result", role: "secondary", position: 2 },
        activeGames: [],
        currentPlay: { games: [], principal: null, secondaries: [], limit: 3 as const }
      })),
      promotePlayingGame: vi.fn(async () => ({
        ok: true as const,
        currentPlay: { games: [], principal: null, secondaries: [], limit: 3 as const }
      }))
    });

    await expect(
      lockRouletteResultAsPrincipalUseCase(
        {
          roundId: "round-1",
          userId: "member-2"
        },
        repository,
        play
      )
    ).resolves.toEqual({
      ok: true,
      redirectTo: "/app?estado=roleta-principal",
      round: expect.objectContaining({
        resolvedByUserId: "member-2",
        status: "locked"
      })
    });
    expect(play.activatePlayingGame).toHaveBeenCalledWith({
      catalogGameId: "catalog-result",
      userId: "member-2"
    });
    expect(play.promotePlayingGame).toHaveBeenCalledWith({
      libraryGameId: "library-result",
      userId: "member-2"
    });
    expect(repository.transaction.lockRoundResult).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "member-2",
        duoId: "duo-1",
        roundId: "round-1"
      })
    );
    expect(repository.transaction.insertHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "member-2",
        eventKey: "history:round-1:locked",
        eventType: "locked",
        metadata: expect.objectContaining({
          resultLibraryGameId: "library-result"
        })
      })
    );
    expect(play.createOperationalPlayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "member-2",
        notificationType: "roulette-result-locked",
        roundId: "round-1"
      })
    );
  });

  it("D-27 returns replacement-required with autoPause false and leaves state untouched before selection", async () => {
    const repository = fakeRouletteRepository({
      roundById: roundRecord({
        resultCatalogGameId: "catalog-result",
        status: "pending_invitation"
      })
    });
    const currentGames = [
      { libraryGameId: "library-1", name: "Principal", role: "principal", position: 1 },
      { libraryGameId: "library-2", name: "Secundario A", role: "secondary", position: 2 },
      { libraryGameId: "library-3", name: "Secundario B", role: "secondary", position: 3 }
    ];
    const play = fakeRoulettePlayCoordinator({
      activatePlayingGame: vi.fn(async () => ({
        ok: false as const,
        reason: "replacement-required" as const,
        replacement: {
          availableActions: ["pause", "replace", "cancel"] as const,
          autoPause: false as const,
          currentGames
        }
      }))
    });

    await expect(
      lockRouletteResultAsPrincipalUseCase(
        {
          roundId: "round-1",
          userId: "member-1"
        },
        repository,
        play
      )
    ).resolves.toEqual({
      ok: false,
      reason: "replacement-required",
      currentGames,
      autoPause: false
    });
    expect(repository.transaction.lockRoundResult).not.toHaveBeenCalled();
    expect(repository.transaction.insertHistoryEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "locked" })
    );
    expect(play.createOperationalPlayNotification).not.toHaveBeenCalled();
  });

  it("D-27 locks after the selected replacement succeeds through the Play public contract", async () => {
    const repository = fakeRouletteRepository({
      roundById: roundRecord({
        resultCatalogGameId: "catalog-result",
        resultLibraryGameId: "library-result",
        status: "pending_invitation"
      })
    });
    const play = fakeRoulettePlayCoordinator({
      activatePlayingGame: vi.fn(async () => ({
        ok: false as const,
        reason: "replacement-required" as const,
        replacement: {
          availableActions: ["pause", "replace", "cancel"] as const,
          autoPause: false as const,
          currentGames: [
            { libraryGameId: "library-2", name: "Secundario", role: "secondary", position: 2 }
          ]
        }
      })),
      replacePlayingGame: vi.fn(async () => ({
        ok: true as const,
        activeGames: [],
        currentPlay: { games: [], principal: null, secondaries: [], limit: 3 as const }
      }))
    });

    await expect(
      lockRouletteResultAsPrincipalUseCase(
        {
          replacement: {
            action: "replace",
            libraryGameId: "library-2"
          },
          roundId: "round-1",
          userId: "member-1"
        },
        repository,
        play
      )
    ).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(play.replacePlayingGame).toHaveBeenCalledWith({
      incomingLibraryGameId: "library-result",
      makePrincipal: true,
      pausedLibraryGameId: "library-2",
      userId: "member-1"
    });
    expect(repository.transaction.lockRoundResult).toHaveBeenCalled();
    expect(play.createOperationalPlayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "roulette-result-locked"
      })
    );
  });

  it("D-30 discards without refunding boost and records cooldown, history and Central notification facts", async () => {
    const repository = fakeRouletteRepository({
      roundById: roundRecord({
        boostSpent: true,
        resultLibraryGameId: "library-result",
        status: "pending_invitation"
      })
    });
    const play = fakeRoulettePlayCoordinator();

    await expect(
      discardRouletteResultUseCase(
        {
          roundId: "round-1",
          userId: "member-1"
        },
        repository,
        play
      )
    ).resolves.toEqual({
      ok: true,
      cooldown: expect.objectContaining({
        libraryGameId: "library-result",
        remainingRounds: ROULETTE_COOLDOWN_ROUNDS,
        weightMultiplier: ROULETTE_COOLDOWN_MULTIPLIER
      }),
      round: expect.objectContaining({
        resolvedByUserId: "member-1",
        status: "discarded"
      })
    });
    expect(repository.transaction.discardRoundResult).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "member-1",
        duoId: "duo-1",
        roundId: "round-1"
      })
    );
    expect(repository.transaction.upsertCooldown).toHaveBeenCalledWith({
      duoId: "duo-1",
      libraryGameId: "library-result",
      remainingRounds: ROULETTE_COOLDOWN_ROUNDS,
      roundId: "round-1",
      weightMultiplier: ROULETTE_COOLDOWN_MULTIPLIER
    });
    expect(repository.transaction.insertHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: "history:round-1:discarded",
        eventType: "discarded",
        metadata: expect.objectContaining({
          boostRefunded: false
        })
      })
    );
    expect(repository.transaction.insertBoostLedgerEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({
        reasonCode: expect.stringMatching(/refund/i)
      })
    );
    expect(play.createOperationalPlayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "roulette-result-discarded",
        roundId: "round-1"
      })
    );
  });

  it("D-29 refuses lock and discard when the invitation is already resolved", async () => {
    const repository = fakeRouletteRepository({
      roundById: roundRecord({ status: "locked" })
    });
    const play = fakeRoulettePlayCoordinator();

    await expect(
      lockRouletteResultAsPrincipalUseCase(
        {
          roundId: "round-1",
          userId: "member-1"
        },
        repository,
        play
      )
    ).resolves.toEqual({
      ok: false,
      reason: "round-not-pending"
    });
    await expect(
      discardRouletteResultUseCase(
        {
          roundId: "round-1",
          userId: "member-1"
        },
        repository,
        play
      )
    ).resolves.toEqual({
      ok: false,
      reason: "round-not-pending"
    });
    expect(play.activatePlayingGame).not.toHaveBeenCalled();
    expect(play.createOperationalPlayNotification).not.toHaveBeenCalled();
  });
});

type FakeRouletteRepository = {
  transaction: ReturnType<typeof fakeRouletteTransaction>;
} & Pick<RouletteRepository, "withUserTransaction">;

function fakeRouletteRepository(
  overrides: Partial<{
    activeRound: RouletteRoundRecord | null;
    activeRoundEntries: RouletteRoundEntryRecord[];
    audioEnabled: boolean;
    boostBalance: RouletteBoostBalanceRecord;
    eligibleGames: Array<ReturnType<typeof eligibleGame>>;
    history: RouletteHistoryEventRecord[];
    membership: RouletteMembershipContext | null;
    persistRound: ReturnType<typeof vi.fn>;
    persistRoundEntries: ReturnType<typeof vi.fn>;
    pity: RoulettePityStateRecord;
    roundById: RouletteRoundRecord | null;
    roundByIdempotencyKey: RouletteRoundRecord | null;
    roundEntries: RouletteRoundEntryRecord[];
  }> = {}
): FakeRouletteRepository {
  const transaction = fakeRouletteTransaction(overrides);
  const withUserTransaction = vi.fn(
    async <T,>(
      _userId: string,
      callback: (transaction: RouletteRepositoryTransaction) => Promise<T>
    ) => callback(transaction as unknown as RouletteRepositoryTransaction)
  ) as RouletteRepository["withUserTransaction"];

  return {
    transaction,
    withUserTransaction
  };
}

function fakeRouletteTransaction(
  overrides: Partial<{
    activeRound: RouletteRoundRecord | null;
    activeRoundEntries: RouletteRoundEntryRecord[];
    audioEnabled: boolean;
    boostBalance: RouletteBoostBalanceRecord;
    eligibleGames: Array<ReturnType<typeof eligibleGame>>;
    history: RouletteHistoryEventRecord[];
    membership: RouletteMembershipContext | null;
    persistRound: ReturnType<typeof vi.fn>;
    persistRoundEntries: ReturnType<typeof vi.fn>;
    pity: RoulettePityStateRecord;
    roundById: RouletteRoundRecord | null;
    roundByIdempotencyKey: RouletteRoundRecord | null;
    roundEntries: RouletteRoundEntryRecord[];
  }>
) {
  return {
    insertBoostLedgerEntry: vi.fn(async (input) =>
      boostLedger({
        actorUserId: input.actorUserId,
        amountDelta: input.amountDelta,
        duoId: input.duoId,
        ledgerKey: input.ledgerKey,
        metadata: input.metadata,
        reasonCode: input.reasonCode,
        roundId: input.roundId,
        sourceId: input.sourceId,
        sourceType: input.sourceType
      })
    ),
    insertHistoryEvent: vi.fn(),
    readActiveRound: vi.fn(async () => overrides.activeRound ?? null),
    readAudioPreference: vi.fn(async () => overrides.audioEnabled ?? true),
    readCooldowns: vi.fn(async () => [] satisfies RouletteCooldownRecord[]),
    readEligiblePool: vi.fn(async () => overrides.eligibleGames ?? []),
    readHistory: vi.fn(async () => overrides.history ?? []),
    readRoundById: vi.fn(async () => overrides.roundById ?? null),
    readRoundByIdempotencyKey: vi.fn(async () => overrides.roundByIdempotencyKey ?? null),
    readRoundEntries: vi.fn(async ({ roundId }: { roundId: string }) => {
      if (overrides.roundEntries) {
        return overrides.roundEntries;
      }

      if (overrides.activeRoundEntries && roundId === overrides.activeRound?.id) {
        return overrides.activeRoundEntries;
      }

      return [];
    }),
    lockRoundResult: vi.fn(async (input) =>
      roundRecord({
        duoId: input.duoId,
        id: input.roundId,
        resolvedAt: input.resolvedAt,
        resolvedByUserId: input.actorUserId,
        status: "locked"
      })
    ),
    discardRoundResult: vi.fn(async (input) =>
      roundRecord({
        duoId: input.duoId,
        id: input.roundId,
        resolvedAt: input.resolvedAt,
        resolvedByUserId: input.actorUserId,
        status: "discarded"
      })
    ),
    resolveMembership: vi.fn(async () =>
      overrides.membership === undefined
        ? {
            duoId: "duo-1",
            memberUserIds: ["member-1", "member-2"],
            partnerUserId: "member-2",
            userId: "member-1"
          }
        : overrides.membership
    ),
    selectResult: vi.fn(),
    updateBoostBalance: vi.fn(async ({ duoId, balance }) =>
      boostBalance({ balance, duoId })
    ),
    updatePityState: vi.fn(),
    decrementCooldowns: vi.fn(),
    persistRound:
      overrides.persistRound ??
      vi.fn(async (input) =>
        roundRecord({
          boostLedgerId: input.boostLedgerId,
          boostSpent: input.boostSpent,
          duoId: input.duoId,
          idempotencyKey: input.idempotencyKey,
          pityAfter: input.pityAfter,
          pityBefore: input.pityBefore,
          resultCatalogGameId: input.resultCatalogGameId,
          resultLibraryGameId: input.resultLibraryGameId,
          resultRarity: input.resultRarity,
          selectedByUserId: input.selectedByUserId,
          weekendMultiplierApplied: input.weekendMultiplierApplied
        })
      ),
    persistRoundEntries:
      overrides.persistRoundEntries ??
      vi.fn(async ({ duoId, entries, roundId }: {
        duoId: string;
        entries: RouletteVisualReelSlot[];
        roundId: string;
      }) =>
        entries.map((entry: RouletteVisualReelSlot, index: number) =>
          roundEntry({
            catalogGameId: entry.catalogGameId ?? null,
            coverUrlSnapshot: entry.coverUrl ?? null,
            duoId,
            id: `entry-${index + 1}`,
            libraryGameId: entry.gameId,
            rarity: entry.rarity,
            roundId,
            selectedSlot: entry.authoritativeResult,
            slotIndex: entry.slotIndex,
            titleSnapshot: entry.title
          })
        )
      ),
    lockBoostBalance: vi.fn(async () => overrides.boostBalance ?? boostBalance()),
    materializeBoostFromXp: vi.fn(async () => overrides.boostBalance ?? boostBalance()),
    lockPityState: vi.fn(async () => overrides.pity ?? pityState()),
    markRoundRevealed: vi.fn(),
    recordReplay: vi.fn(),
    upsertCooldown: vi.fn(async (input) =>
      cooldownRecord({
        duoId: input.duoId,
        libraryGameId: input.libraryGameId,
        remainingRounds: input.remainingRounds,
        roundId: input.roundId,
        weightMultiplier: input.weightMultiplier
      })
    )
  };
}

function fakeRoulettePlayCoordinator(
  overrides: Partial<{
    activatePlayingGame: ReturnType<typeof vi.fn>;
    createOperationalPlayNotification: ReturnType<typeof vi.fn>;
    promotePlayingGame: ReturnType<typeof vi.fn>;
    replacePlayingGame: ReturnType<typeof vi.fn>;
  }> = {}
) {
  return {
    activatePlayingGame:
      overrides.activatePlayingGame ??
      vi.fn(async () => ({
        ok: true as const,
        outcome: "principal-assigned" as const,
        activeGame: { libraryGameId: "library-result", role: "principal", position: 1 },
        activeGames: [],
        currentPlay: { games: [], principal: null, secondaries: [], limit: 3 as const }
      })),
    createOperationalPlayNotification:
      overrides.createOperationalPlayNotification ??
      vi.fn(async () => ({
        ok: true as const,
        notification: {
          actionRefId: "round-1",
          actionRefType: "roulette-round",
          body: "A fila foi atualizada.",
          createdAt: new Date("2026-06-09T10:00:00.000Z"),
          duoId: "duo-1",
          id: "notification-1",
          notificationType: "roulette-result-locked",
          recipientUserId: null,
          state: "unread",
          title: "Resultado da roleta"
        },
        pushAttempts: 0,
        pushDelivered: 0
      })),
    promotePlayingGame:
      overrides.promotePlayingGame ??
      vi.fn(async () => ({
        ok: true as const,
        currentPlay: { games: [], principal: null, secondaries: [], limit: 3 as const }
      })),
    replacePlayingGame:
      overrides.replacePlayingGame ??
      vi.fn(async () => ({
        ok: true as const,
        activeGames: [],
        currentPlay: { games: [], principal: null, secondaries: [], limit: 3 as const }
      }))
  };
}

function eligibleGame(
  overrides: Partial<{
    id: string;
    catalogGameId: string;
    coverUrl: string | null;
    rarity: "common" | "rare" | "epic" | "legendary";
    status: string;
    title: string;
  }> = {}
) {
  return {
    catalogGameId: overrides.catalogGameId ?? `${overrides.id ?? "library-result"}-catalog`,
    coverUrl: overrides.coverUrl ?? null,
    id: overrides.id ?? "library-result",
    rarity: overrides.rarity ?? "common",
    status: overrides.status ?? "wishlist",
    title: overrides.title ?? "Coop Game",
    updatedAt: new Date("2026-06-09T10:00:00.000Z")
  };
}

function boostBalance(
  overrides: Partial<RouletteBoostBalanceRecord> = {}
): RouletteBoostBalanceRecord {
  return {
    balance: 80,
    cap: 600,
    duoId: "duo-1",
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function pityState(
  overrides: Partial<RoulettePityStateRecord> = {}
): RoulettePityStateRecord {
  return {
    drawsSinceEpicOrHigher: 4,
    duoId: "duo-1",
    lastEpicOrHigherAt: null,
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function cooldownRecord(
  overrides: Partial<RouletteCooldownRecord> = {}
): RouletteCooldownRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-result",
    remainingRounds: ROULETTE_COOLDOWN_ROUNDS,
    roundId: "round-1",
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    weightMultiplier: ROULETTE_COOLDOWN_MULTIPLIER,
    ...overrides
  };
}

function boostLedger(
  overrides: Partial<{
    actorUserId: string | null;
    amountDelta: number;
    duoId: string;
    ledgerKey: string;
    metadata: Record<string, unknown>;
    reasonCode: string;
    roundId: string | null;
    sourceId: string;
    sourceType:
      | "xp-award"
      | "roulette-round"
      | "roulette-refund"
      | "adjustment"
      | "rebuild";
  }> = {}
) {
  return {
    actorUserId: overrides.actorUserId ?? "member-1",
    amountDelta: overrides.amountDelta ?? -100,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    duoId: overrides.duoId ?? "duo-1",
    id: `ledger-${overrides.ledgerKey ?? "spend"}`,
    ledgerKey: overrides.ledgerKey ?? "spend:round-key",
    metadata: overrides.metadata ?? {},
    reasonCode: overrides.reasonCode ?? "boost-spend",
    roundId: overrides.roundId ?? null,
    sourceId: overrides.sourceId ?? "11111111-1111-4111-8111-111111111111",
    sourceType: overrides.sourceType ?? "roulette-round"
  };
}

function roundRecord(overrides: Partial<RouletteRoundRecord> = {}): RouletteRoundRecord {
  return {
    boostLedgerId: null,
    boostSpent: false,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    duoId: "duo-1",
    id: "round-1",
    idempotencyKey: "round-key",
    metadata: {},
    pityAfter: 5,
    pityBefore: 4,
    resultCatalogGameId: "catalog-result",
    resultLibraryGameId: "library-result",
    resultRarity: "rare",
    revealedAt: null,
    resolvedAt: null,
    resolvedByUserId: null,
    selectedAt: new Date("2026-06-09T10:00:00.000Z"),
    selectedByUserId: "member-1",
    status: "revealing",
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    weekendMultiplierApplied: false,
    ...overrides
  };
}

function roundEntry(
  overrides: Partial<RouletteRoundEntryRecord> & { selectedSlot?: boolean } = {}
): RouletteRoundEntryRecord {
  return {
    catalogGameId: "catalog-result",
    coverUrlSnapshot: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    duoId: "duo-1",
    id: `entry-${overrides.slotIndex ?? 1}`,
    libraryGameId: "library-result",
    metadata: {},
    rarity: "rare",
    roundId: "round-1",
    selectedSlot: overrides.selectedSlot ?? false,
    slotIndex: overrides.slotIndex ?? 1,
    titleSnapshot: "Coop Game",
    ...overrides
  };
}

function historyEvent(
  overrides: Partial<RouletteHistoryEventRecord> = {}
): RouletteHistoryEventRecord {
  return {
    actorUserId: "member-1",
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    duoId: "duo-1",
    eventKey: "history:round-1:started",
    eventType: "started",
    id: "history-1",
    metadata: {},
    roundId: "round-1",
    ...overrides
  };
}
