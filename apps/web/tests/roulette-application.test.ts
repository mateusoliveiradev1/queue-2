import { describe, expect, it, vi } from "vitest";

import type {
  RouletteBoostBalanceRecord,
  RouletteCooldownRecord,
  RouletteHistoryEventRecord,
  RouletteMembershipContext,
  RoulettePityStateRecord,
  RouletteRoundEntryRecord,
  RouletteRoundRecord
} from "../src/modules/roulette/application/ports";

import { getRouletteHistoryUseCase } from "../src/modules/roulette/application/get-roulette-history";
import { getRouletteStateUseCase } from "../src/modules/roulette/application/get-roulette-state";
import { replayRouletteRoundUseCase } from "../src/modules/roulette/application/replay-roulette-round";

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

type FakeRouletteRepository = {
  transaction: ReturnType<typeof fakeRouletteTransaction>;
  withUserTransaction: ReturnType<typeof vi.fn>;
};

function fakeRouletteRepository(
  overrides: Partial<{
    activeRound: RouletteRoundRecord | null;
    activeRoundEntries: RouletteRoundEntryRecord[];
    audioEnabled: boolean;
    eligibleGames: Array<ReturnType<typeof eligibleGame>>;
    history: RouletteHistoryEventRecord[];
    membership: RouletteMembershipContext | null;
    roundById: RouletteRoundRecord | null;
    roundEntries: RouletteRoundEntryRecord[];
  }> = {}
): FakeRouletteRepository {
  const transaction = fakeRouletteTransaction(overrides);

  return {
    transaction,
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction))
  };
}

function fakeRouletteTransaction(
  overrides: Partial<{
    activeRound: RouletteRoundRecord | null;
    activeRoundEntries: RouletteRoundEntryRecord[];
    audioEnabled: boolean;
    eligibleGames: Array<ReturnType<typeof eligibleGame>>;
    history: RouletteHistoryEventRecord[];
    membership: RouletteMembershipContext | null;
    roundById: RouletteRoundRecord | null;
    roundEntries: RouletteRoundEntryRecord[];
  }>
) {
  return {
    insertBoostLedgerEntry: vi.fn(),
    insertHistoryEvent: vi.fn(),
    materializeBoostFromXp: vi.fn(),
    readActiveRound: vi.fn(async () => overrides.activeRound ?? null),
    readAudioPreference: vi.fn(async () => overrides.audioEnabled ?? true),
    readCooldowns: vi.fn(async () => [] satisfies RouletteCooldownRecord[]),
    readEligiblePool: vi.fn(async () => overrides.eligibleGames ?? []),
    readHistory: vi.fn(async () => overrides.history ?? []),
    readRoundById: vi.fn(async () => overrides.roundById ?? null),
    readRoundEntries: vi.fn(async ({ roundId }: { roundId: string }) => {
      if (overrides.roundEntries) {
        return overrides.roundEntries;
      }

      if (overrides.activeRoundEntries && roundId === overrides.activeRound?.id) {
        return overrides.activeRoundEntries;
      }

      return [];
    }),
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
    updateBoostBalance: vi.fn(),
    updatePityState: vi.fn(),
    lockBoostBalance: vi.fn(async () => boostBalance()),
    lockPityState: vi.fn(async () => pityState())
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

function boostBalance(): RouletteBoostBalanceRecord {
  return {
    balance: 80,
    cap: 600,
    duoId: "duo-1",
    updatedAt: new Date("2026-06-09T10:00:00.000Z")
  };
}

function pityState(): RoulettePityStateRecord {
  return {
    drawsSinceEpicOrHigher: 4,
    duoId: "duo-1",
    lastEpicOrHigherAt: null,
    updatedAt: new Date("2026-06-09T10:00:00.000Z")
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
