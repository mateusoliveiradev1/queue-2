import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  MAX_CHAPTER_XP_AWARDS_PER_DUO_DAY,
  applyGamificationFact,
  getGamificationDashboard,
  getLevelForXp,
  rebuildGamificationProjections
} from "../src/modules/gamification";
import type {
  GamificationAchievementUnlockRecord,
  GamificationDueJobRecord,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationStreakStateRecord,
  GamificationXpLedgerRecord
} from "../src/modules/gamification/application/ports";

const now = new Date("2026-06-06T15:00:00.000Z");
const portsSource = readFileSync("src/modules/gamification/application/ports.ts", "utf8");

describe("gamification reward application", () => {
  it("applies shared XP, quest progress, achievements, streak and level-up once", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      projection: projectionRecord({ xp: 110, level: getLevelForXp(110) }),
      questCycles: [questCycleRecord()]
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "live-session",
        sourceId: "00000000-0000-4000-8000-000000000101",
        occurredAt: now,
        confirmedDuoFact: true,
        metadata: { durationSeconds: 1_800 }
      },
      repository
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        duplicate: false
      })
    );

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.summary.totalXpAwarded).toBe(110);
    expect(result.summary.levelUp).toEqual(
      expect.objectContaining({
        previousLevel: expect.objectContaining({ level: 1 }),
        currentLevel: expect.objectContaining({ level: 2, name: "Lv2 Dupla de Sofa" })
      })
    );
    expect(result.summary.achievements.map((achievement) => achievement.slug)).toEqual(
      expect.arrayContaining(["primeiro-save", "controle-passado", "primeiro-desafio"])
    );
    expect(result.summary.questProgress).toEqual([
      expect.objectContaining({
        questSlug: "sessao-confirmada",
        completed: true,
        xpAwarded: 80
      })
    ]);
    expect(result.summary.streak).toEqual(
      expect.objectContaining({
        previousStreak: 0,
        currentStreak: 1,
        availableFreezes: 0
      })
    );
    expect(transaction.insertXpLedgerAward).toHaveBeenCalledWith(
      expect.objectContaining({
        awardKey: "live-session:00000000-0000-4000-8000-000000000101",
        amount: 30
      })
    );
    expect(transaction.updateProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        duoId: "duo-1",
        xpDelta: 110,
        nextLevel: expect.objectContaining({ level: 2 }),
        streak: 1,
        availableFreezes: 0
      })
    );
  });

  it("returns an empty idempotent summary when the XP ledger already has the source", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      insertXpLedgerAward: vi.fn(async () => null)
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "chapter",
        sourceId: "00000000-0000-4000-8000-000000000202",
        occurredAt: now,
        confirmedDuoFact: true
      },
      repository
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        duplicate: true
      })
    );

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.summary.totalXpAwarded).toBe(0);
    expect(result.summary.achievements).toEqual([]);
    expect(transaction.updateProjection).not.toHaveBeenCalled();
    expect(transaction.upsertQuestProgress).not.toHaveBeenCalled();
    expect(transaction.insertAchievementUnlock).not.toHaveBeenCalled();
  });

  it("lets a short confirmed session count as non-XP progress without farming XP", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      questCycles: [questCycleRecord()]
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "offline-session",
        sourceId: "00000000-0000-4000-8000-000000000303",
        occurredAt: now,
        confirmedDuoFact: true,
        metadata: { durationSeconds: 300 }
      },
      repository
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, duplicate: false }));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.summary.totalXpAwarded).toBe(80);
    expect(result.summary.skippedXpReason).toBe("session-too-short");
    expect(transaction.insertXpLedgerAward).toHaveBeenCalledTimes(1);
    expect(transaction.insertXpLedgerAward).toHaveBeenCalledWith(
      expect.objectContaining({
        awardKey: "quest:00000000-0000-4000-8000-000000000011",
        sourceType: "quest"
      })
    );
  });

  it("enforces the chapter duo-day XP cap without accepting client supplied totals", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      awardsForDuoDay: MAX_CHAPTER_XP_AWARDS_PER_DUO_DAY
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "chapter",
        sourceId: "00000000-0000-4000-8000-000000000404",
        occurredAt: now,
        confirmedDuoFact: true,
        amountOverride: 9_999
      },
      repository
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, duplicate: false }));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.summary.totalXpAwarded).toBe(0);
    expect(result.summary.skippedXpReason).toBe("chapter-daily-cap-reached");
    expect(transaction.insertXpLedgerAward).not.toHaveBeenCalled();
  });

  it("builds a duo-scoped dashboard read model without individual XP fields", async () => {
    const { repository } = fakeGamificationRepository({
      projection: projectionRecord({ xp: 140, level: getLevelForXp(140), streak: 2 }),
      questCycles: [questCycleRecord()],
      questProgress: [questProgressRecord({ currentValue: 1, completedAt: now })],
      achievementUnlocks: [achievementUnlockRecord({ achievementSlug: "primeiro-save" })]
    });

    await expect(
      getGamificationDashboard({ userId: "member-1" }, repository)
    ).resolves.toEqual(
      expect.objectContaining({
        duoId: "duo-1",
        xp: 140,
        streak: expect.objectContaining({ current: 2 }),
        activeQuests: [
          expect.objectContaining({
            questSlug: "sessao-confirmada",
            currentValue: 1,
            completed: true
          })
        ],
        recentAchievements: [
          expect.objectContaining({
            slug: "primeiro-save",
            title: "Primeiro save"
          })
        ]
      })
    );
    expect(portsSource).not.toMatch(/individualXp|userXp|playerXp|memberXp/i);
  });

  it("rebuilds XP and level projections from the authoritative ledger", async () => {
    const recordProjectionRebuild = vi.fn<
      GamificationRepository["recordProjectionRebuild"]
    >();
    const { repository, transaction } = fakeGamificationRepository({
      projection: projectionRecord({ xp: 100, level: getLevelForXp(100), streak: 1 }),
      ledgerXp: 250,
      recordProjectionRebuild,
      streakState: streakStateRecord({ currentStreak: 2, availableFreezes: 1 })
    });

    await expect(
      rebuildGamificationProjections(
        {
          userId: "member-1",
          rebuildKey: "test-rebuild",
          reasonCode: "test-drift"
        },
        repository
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        adjustmentDelta: 150,
        before: expect.objectContaining({ xp: 100, streak: 1 }),
        after: expect.objectContaining({ xp: 250, streak: 2 }),
        projection: expect.objectContaining({
          xp: 250,
          streak: 2,
          availableFreezes: 1
        })
      })
    );
    expect(transaction.insertAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentKey: "rebuild:test-rebuild",
        amountDelta: 150,
        reasonCode: "test-drift"
      })
    );
    expect(transaction.updateProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        xpDelta: 150,
        streak: 2,
        availableFreezes: 1
      })
    );
    expect(recordProjectionRebuild).toHaveBeenCalledWith(
      expect.objectContaining({
        rebuildKey: "test-rebuild",
        status: "completed",
        xpBefore: 100,
        xpAfter: 250,
        streakBefore: 1,
        streakAfter: 2
      })
    );
  });
});

function fakeGamificationRepository(input: {
  membership?: GamificationMembershipContext | null;
  projection?: GamificationProjectionRecord;
  questCycles?: GamificationQuestCycleRecord[];
  questProgress?: GamificationQuestProgressRecord[];
  achievementUnlocks?: GamificationAchievementUnlockRecord[];
  streakState?: GamificationStreakStateRecord | null;
  awardsForDuoDay?: number;
  ledgerXp?: number;
  insertXpLedgerAward?: GamificationRepositoryTransaction["insertXpLedgerAward"];
  recordProjectionRebuild?: GamificationRepository["recordProjectionRebuild"];
} = {}): {
  repository: GamificationRepository;
  transaction: GamificationRepositoryTransaction;
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
  const projection = input.projection ?? projectionRecord();
  const questCycles = input.questCycles ?? [];
  const questProgress = input.questProgress ?? [];
  const achievementUnlocks = input.achievementUnlocks ?? [];
  let awardSequence = 0;

  const transaction: GamificationRepositoryTransaction = {
    resolveMembership: vi.fn(async () => membership),
    readDuoTimezone: vi.fn(async () => "America/Sao_Paulo"),
    readProjection: vi.fn(async () => projection),
    countXpAwardsForDuoDay: vi.fn(async () => input.awardsForDuoDay ?? 0),
    insertXpLedgerAward:
      input.insertXpLedgerAward ??
      vi.fn(async (awardInput) =>
        xpAwardRecord({
          id: `award-${++awardSequence}`,
          ...awardInput,
          metadata: awardInput.metadata ?? {},
          awardedAt: now
        })
      ),
    updateProjection: vi.fn(async (updateInput) =>
      projectionRecord({
        duoId: updateInput.duoId,
        xp: Math.max(0, projection.xp + updateInput.xpDelta),
        level: updateInput.nextLevel,
        streak: updateInput.streak ?? projection.streak,
        availableFreezes: updateInput.availableFreezes ?? projection.availableFreezes,
        updatedAt: now
      })
    ),
    readAchievementUnlocks: vi.fn(async () => achievementUnlocks),
    insertAchievementUnlock: vi.fn(async (unlockInput) =>
      achievementUnlockRecord({
        ...unlockInput,
        metadata: unlockInput.metadata ?? {},
        unlockedAt: now
      })
    ),
    readActiveQuestCycles: vi.fn(async () => questCycles),
    readQuestProgressForCycles: vi.fn(async () => questProgress),
    upsertQuestCycle: vi.fn(async () => questCycleRecord()),
    upsertQuestProgress: vi.fn(async (progressInput) =>
      questProgressRecord({
        duoId: progressInput.duoId,
        questCycleId: progressInput.questCycleId,
        currentValue: progressInput.currentValue,
        completedAt: progressInput.completedAt ?? null,
        rewardAwardId: progressInput.rewardAwardId ?? null,
        metadata: progressInput.metadata ?? {},
        updatedAt: now
      })
    ),
    readStreakState: vi.fn(async () => input.streakState ?? null),
    insertStreakEvent: vi.fn(async () => true),
    upsertStreakState: vi.fn(async (state) => state),
    insertRewardNotification: vi.fn(),
    insertAdjustment: vi.fn(),
    sumXpLedgerAwards: vi.fn(async () => input.ledgerXp ?? projection.xp)
  };

  return {
    transaction,
    repository: {
      withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
      claimDueGamificationJobs: vi.fn(async () => [jobRecord()]),
      completeGamificationJob: vi.fn(),
      failGamificationJob: vi.fn(),
      recordProjectionRebuild: input.recordProjectionRebuild ?? vi.fn()
    }
  };
}

function projectionRecord(
  overrides: Partial<GamificationProjectionRecord> = {}
): GamificationProjectionRecord {
  return {
    duoId: "duo-1",
    xp: 0,
    level: getLevelForXp(0),
    streak: 0,
    availableFreezes: 0,
    updatedAt: now,
    ...overrides
  };
}

function xpAwardRecord(
  overrides: Partial<GamificationXpLedgerRecord> = {}
): GamificationXpLedgerRecord {
  return {
    id: "award-1",
    duoId: "duo-1",
    awardKey: "live-session:00000000-0000-4000-8000-000000000101",
    sourceType: "live-session",
    sourceId: "00000000-0000-4000-8000-000000000101",
    amount: 30,
    reasonCode: "live-session-confirmed",
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: now,
    ...overrides
  };
}

function achievementUnlockRecord(
  overrides: Partial<GamificationAchievementUnlockRecord> = {}
): GamificationAchievementUnlockRecord {
  return {
    id: "unlock-1",
    duoId: "duo-1",
    achievementSlug: "primeiro-save",
    sourceType: "live-session",
    sourceId: "00000000-0000-4000-8000-000000000101",
    unlockedByUserId: "member-1",
    metadata: {},
    unlockedAt: now,
    ...overrides
  };
}

function questCycleRecord(
  overrides: Partial<GamificationQuestCycleRecord> = {}
): GamificationQuestCycleRecord {
  return {
    id: "00000000-0000-4000-8000-000000000011",
    duoId: "duo-1",
    questSlug: "sessao-confirmada",
    questType: "weekly",
    cycleKey: "weekly:2026-06-01",
    windowStartAt: new Date("2026-06-01T04:00:00.000Z"),
    windowEndAt: new Date("2026-06-08T04:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    status: "active",
    ...overrides
  };
}

function questProgressRecord(
  overrides: Partial<GamificationQuestProgressRecord> = {}
): GamificationQuestProgressRecord {
  return {
    id: "progress-1",
    duoId: "duo-1",
    questCycleId: "00000000-0000-4000-8000-000000000011",
    currentValue: 0,
    completedAt: null,
    rewardAwardId: null,
    metadata: {},
    updatedAt: now,
    ...overrides
  };
}

function streakStateRecord(
  overrides: Partial<GamificationStreakStateRecord> = {}
): GamificationStreakStateRecord {
  return {
    duoId: "duo-1",
    currentStreak: 0,
    longestStreak: 0,
    availableFreezes: 0,
    lastActivityDuoDay: null,
    updatedAt: now,
    ...overrides
  };
}

function jobRecord(
  overrides: Partial<GamificationDueJobRecord> = {}
): GamificationDueJobRecord {
  return {
    id: "job-1",
    duoId: "duo-1",
    jobKey: "gamification-quest-rotation:duo-1:weekly:2026-06-01",
    jobType: "gamification-quest-rotation",
    runAt: now,
    attempts: 0,
    payload: {},
    ...overrides
  };
}
