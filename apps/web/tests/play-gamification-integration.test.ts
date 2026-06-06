import { describe, expect, it, vi } from "vitest";

import { confirmPlaySessionUseCase } from "../src/modules/play/application/confirm-play-session";
import { confirmTerminalStatusUseCase } from "../src/modules/play/application/request-terminal-status";
import type {
  PlayRepository,
  PlayRepositoryTransaction,
  PlaySessionDetailRecord,
  PlayTerminalRequestRecord
} from "../src/modules/play/application/ports";

const now = new Date("2026-06-06T15:00:00.000Z");

describe("Play confirmed facts trigger gamification", () => {
  it("applies a live-session fact in the confirmation transaction", async () => {
    const applyGamificationFact = vi.fn<
      PlayRepositoryTransaction["applyGamificationFact"]
    >(async () => rewardResult("live-session", 30));
    const transaction = {
      resolveMembership: vi.fn(async () => membership()),
      readSessionDetail: vi
        .fn<PlayRepositoryTransaction["readSessionDetail"]>()
        .mockResolvedValueOnce(
          sessionDetail({
            confirmedByUserIds: ["member-1"],
            pendingUserIds: ["member-2"],
            confirmationCount: 1,
            doubleConfirmed: false
          })
        )
        .mockResolvedValueOnce(
          sessionDetail({
            confirmedByUserIds: ["member-1", "member-2"],
            pendingUserIds: [],
            confirmationCount: 2,
            doubleConfirmed: true
          })
        ),
      confirmSession: vi.fn(async () => ({
        id: "confirmation-1",
        duoId: "duo-1",
        effectId: "session-1",
        userId: "member-2",
        confirmedAt: now
      })),
      markNotificationsActioned: vi.fn(async () => 1),
      applyConfirmedSessionEffects: vi.fn(async () => ({
        progress: {
          duoId: "duo-1",
          libraryGameId: "library-1",
          confirmedCoopSeconds: 1_800,
          subjectivePercent: null,
          updatedAt: now
        },
        xpAward: null,
        session: sessionDetail({ status: "confirmed" })
      })),
      applyGamificationFact
    } as unknown as PlayRepositoryTransaction;
    const repository = repositoryWithTransaction(transaction);

    await expect(
      confirmPlaySessionUseCase(
        { userId: "member-2", sessionId: "session-1" },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        reward: expect.objectContaining({ totalXpAwarded: 30 }),
        xpAward: expect.objectContaining({
          awardKey: "live-session:session-1",
          amount: 30,
          sourceType: "live-session"
        })
      })
    );
    expect(applyGamificationFact).toHaveBeenCalledWith({
      duoId: "duo-1",
      actorUserId: "member-2",
      sourceType: "live-session",
      sourceId: "session-1",
      occurredAt: sessionDetail().endedAt,
      confirmedDuoFact: true,
      metadata: {
        durationSeconds: 1_800,
        kind: "live",
        libraryGameId: "library-1"
      }
    });
  });

  it("treats Zerado as a major reward and Dropado as neutral", async () => {
    const zeradoFact = vi.fn<
      PlayRepositoryTransaction["applyGamificationFact"]
    >(async () => rewardResult("terminal-zerado", 250));
    const dropadoFact = vi.fn<
      PlayRepositoryTransaction["applyGamificationFact"]
    >(async () => rewardResult("terminal-dropado", 0));

    await expect(
      confirmTerminalStatusUseCase(
        { userId: "member-2", requestId: "terminal-zerado-1" },
        repositoryWithTransaction(terminalTransaction("zerado", zeradoFact))
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        reward: expect.objectContaining({ totalXpAwarded: 250 }),
        xpAward: expect.objectContaining({ sourceType: "terminal-zerado" })
      })
    );
    expect(zeradoFact).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "terminal-zerado",
        sourceId: "terminal-1",
        confirmedDuoFact: true
      })
    );

    await expect(
      confirmTerminalStatusUseCase(
        { userId: "member-2", requestId: "terminal-dropado-1" },
        repositoryWithTransaction(terminalTransaction("dropado", dropadoFact))
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        reward: expect.objectContaining({ totalXpAwarded: 0 }),
        xpAward: null
      })
    );
    expect(dropadoFact).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "terminal-dropado",
        confirmedDuoFact: true
      })
    );
  });

  it("fails the confirming action when a critical reward cannot be applied", async () => {
    const applyGamificationFact = vi.fn<
      PlayRepositoryTransaction["applyGamificationFact"]
    >(async () => ({ ok: false, reason: "projection-not-found" }));

    await expect(
      confirmTerminalStatusUseCase(
        { userId: "member-2", requestId: "terminal-zerado-1" },
        repositoryWithTransaction(terminalTransaction("zerado", applyGamificationFact))
      )
    ).resolves.toEqual({
      ok: false,
      reason: "reward-application-failed",
      rewardFailureReason: "projection-not-found"
    });
  });
});

function repositoryWithTransaction(transaction: PlayRepositoryTransaction): PlayRepository {
  return {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction))
  } as unknown as PlayRepository;
}

function terminalTransaction(
  targetStatus: "zerado" | "dropado",
  applyGamificationFact: PlayRepositoryTransaction["applyGamificationFact"]
): PlayRepositoryTransaction {
  return {
    resolveMembership: vi.fn(async () => membership()),
    confirmTerminalRequest: vi.fn(async () => terminalRequest({ targetStatus })),
    applyGamificationFact
  } as unknown as PlayRepositoryTransaction;
}

function membership() {
  return {
    duoId: "duo-1",
    userId: "member-2",
    partnerUserId: "member-1",
    memberUserIds: ["member-1", "member-2"]
  };
}

function sessionDetail(
  overrides: Partial<PlaySessionDetailRecord> = {}
): PlaySessionDetailRecord {
  return {
    id: "session-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    kind: "live",
    status: "pending_confirmation",
    startedAt: new Date("2026-06-06T14:30:00.000Z"),
    endedAt: now,
    durationSeconds: 1_800,
    createdByUserId: "member-1",
    confirmedByUserIds: [],
    pendingUserIds: ["member-1", "member-2"],
    confirmationCount: 0,
    requiredConfirmationCount: 2,
    doubleConfirmed: false,
    ...overrides
  };
}

function terminalRequest(
  overrides: Partial<PlayTerminalRequestRecord> = {}
): PlayTerminalRequestRecord {
  return {
    id: "terminal-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    targetStatus: "zerado",
    status: "confirmed",
    requestedByUserId: "member-1",
    confirmedByUserId: "member-2",
    cancelledByUserId: null,
    updatedAt: now,
    ...overrides
  };
}

function rewardResult(
  sourceType: "live-session" | "terminal-zerado" | "terminal-dropado",
  amount: number
) {
  const level = { level: 1, name: "Lv1 Casuais", xpRequired: 0 };
  const award = amount > 0
    ? {
        id: "award-1",
        duoId: "duo-1",
        awardKey: `${sourceType}:${sourceType === "live-session" ? "session-1" : "terminal-1"}`,
        sourceType,
        sourceId: sourceType === "live-session" ? "session-1" : "terminal-1",
        amount,
        reasonCode: `${sourceType}-confirmed`,
        awardedByUserId: "member-2",
        metadata: {},
        awardedAt: now
      }
    : null;

  return {
    ok: true as const,
    duplicate: false,
    summary: {
      totalXpAwarded: amount,
      xpAwards: award ? [award] : [],
      levelUp: null,
      achievements: [],
      questProgress: [],
      streak: null,
      projection: {
        duoId: "duo-1",
        xp: amount,
        level,
        streak: 0,
        availableFreezes: 0,
        updatedAt: now
      }
    }
  };
}
