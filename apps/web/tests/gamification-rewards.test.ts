import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  EMPTY_ACHIEVEMENT_METRICS,
  MAX_CHAPTER_XP_AWARDS_PER_DUO_DAY,
  applyGamificationFact,
  getGamificationDashboard,
  getLevelForXp,
  getLevelThreshold,
  rebuildGamificationProjections
} from "../src/modules/gamification";
import type { AchievementMetricSnapshot } from "../src/modules/gamification";
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
      questCycles: [questCycleRecord()],
      achievementMetrics: achievementMetrics({
        confirmedSessionCount: 1,
        doubleConfirmationCount: 1,
        questCompleteCount: 1
      })
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

  it("advances quests atomically by source key, caps the goal and links one reward", async () => {
    let currentValue = 2;
    let completedAt: Date | null = null;
    let rewardAwardId: string | null = null;
    const seenSources = new Set<string>();
    const advanceQuestProgress = vi.fn(async (input: {
      completedAt: Date;
      duoId: string;
      goal: number;
      increment: number;
      questCycleId: string;
      sourceKey: string;
    }) => {
      const advanced = !completedAt && !seenSources.has(input.sourceKey);
      const previousValue = currentValue;

      if (advanced) {
        seenSources.add(input.sourceKey);
        currentValue = Math.min(input.goal, currentValue + input.increment);
      }

      const completedNow =
        advanced && !completedAt && previousValue < input.goal && currentValue >= input.goal;

      if (completedNow) {
        completedAt = input.completedAt;
      }

      return {
        advanced,
        completedNow,
        progress: questProgressRecord({
          currentValue,
          completedAt,
          rewardAwardId,
          metadata: { sourceKeys: [...seenSources] }
        })
      };
    });
    const linkQuestProgressReward = vi.fn(async (input: {
      rewardAwardId: string;
    }) => {
      rewardAwardId ??= input.rewardAwardId;

      return questProgressRecord({
        currentValue,
        completedAt,
        rewardAwardId,
        metadata: { sourceKeys: [...seenSources] }
      });
    });
    const { repository } = fakeGamificationRepository({
      questCycles: [
        questCycleRecord({
          questSlug: "mes-da-fila",
          questType: "monthly",
          cycleKey: "monthly:2026-06"
        })
      ],
      advanceQuestProgress,
      linkQuestProgressReward
    });
    const applySource = (sourceId: string) =>
      applyGamificationFact(
        {
          duoId: "duo-1",
          actorUserId: "member-1",
          sourceType: "scheduled-session",
          sourceId,
          occurredAt: now,
          confirmedDuoFact: true
        },
        repository
      );

    const sourceA = "00000000-0000-4000-8000-000000000701";
    const sourceB = "00000000-0000-4000-8000-000000000702";
    const sourceC = "00000000-0000-4000-8000-000000000703";
    const first = await applySource(sourceA);
    const second = await applySource(sourceB);
    const replay = await applySource(sourceA);
    const capped = await applySource(sourceC);

    if (!first.ok || !second.ok || !replay.ok || !capped.ok) {
      throw new Error("expected quest sources to be processed");
    }

    expect(first.summary.questProgress[0]).toEqual(
      expect.objectContaining({ currentValue: 3, completed: false, xpAwarded: 0 })
    );
    expect(second.summary.questProgress[0]).toEqual(
      expect.objectContaining({ currentValue: 4, completed: true, xpAwarded: 240 })
    );
    expect(replay.summary.questProgress[0]).toEqual(
      expect.objectContaining({ currentValue: 4, completed: true, xpAwarded: 0 })
    );
    expect(capped.summary.questProgress[0]).toEqual(
      expect.objectContaining({ currentValue: 4, completed: true, xpAwarded: 0 })
    );
    expect(advanceQuestProgress).toHaveBeenCalledTimes(4);
    expect(advanceQuestProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sourceKey: `scheduled-session:${sourceA}`,
        increment: 1,
        goal: 4
      })
    );
    expect(linkQuestProgressReward).toHaveBeenCalledTimes(1);
    expect(linkQuestProgressReward).toHaveBeenCalledWith(
      expect.objectContaining({
        duoId: "duo-1",
        questCycleId: "00000000-0000-4000-8000-000000000011",
        rewardAwardId: expect.any(String)
      })
    );
  });

  it("unlocks permanent monthly and seasonal seals only from completed quest rewards", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      questCycles: [
        questCycleRecord({
          id: "00000000-0000-4000-8000-000000000121",
          questSlug: "mes-da-fila",
          questType: "monthly",
          cycleKey: "monthly:2026-06"
        }),
        questCycleRecord({
          id: "00000000-0000-4000-8000-000000000122",
          questSlug: "spooky-coop",
          questType: "seasonal",
          cycleKey: "seasonal:spooky:2026"
        })
      ],
      questProgress: [
        questProgressRecord({
          questCycleId: "00000000-0000-4000-8000-000000000121",
          currentValue: 3
        })
      ],
      achievementMetrics: achievementMetrics({
        confirmedSessionCount: 1,
        doubleConfirmationCount: 1,
        monthlyQuestCompleteCount: 1,
        questCompleteCount: 2,
        seasonalQuestCompleteCount: 1,
        seasonalSpookyCompleteCount: 1
      })
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "live-session",
        sourceId: "00000000-0000-4000-8000-000000000505",
        occurredAt: now,
        confirmedDuoFact: true,
        metadata: { durationSeconds: 1_800 }
      },
      repository
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, duplicate: false }));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(result.summary.questProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questSlug: "mes-da-fila",
          questType: "monthly",
          completed: true,
          xpAwarded: 240
        }),
        expect.objectContaining({
          questSlug: "spooky-coop",
          questType: "seasonal",
          completed: true,
          xpAwarded: 180
        })
      ])
    );
    expect(result.summary.achievements.map((achievement) => achievement.slug)).toEqual(
      expect.arrayContaining([
        "primeiro-desafio",
        "mes-da-dupla",
        "selo-sazonal",
        "spooky-coop"
      ])
    );
    expect(transaction.insertAchievementUnlock).toHaveBeenCalledWith(
      expect.objectContaining({
        achievementSlug: "mes-da-dupla",
        metadata: expect.objectContaining({
          predicateKey: "monthly-quest-complete-count:1"
        })
      })
    );
    expect(transaction.insertAchievementUnlock).toHaveBeenCalledWith(
      expect.objectContaining({
        achievementSlug: "spooky-coop",
        metadata: expect.objectContaining({
          predicateKey: "seasonal-spooky-complete:1"
        })
      })
    );
    expect(new Set(result.summary.achievements.map((achievement) => achievement.slug)).size).toBe(
      result.summary.achievements.length
    );
    expect(JSON.stringify(result.summary)).not.toMatch(/inventory|shop|loadout|equip/i);
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

  it("locks the duo projection before derived reads and trusts the authoritative returned level", async () => {
    const locked = projectionRecord({ xp: 100, level: getLevelForXp(100) });
    const authoritative = projectionRecord({ xp: 500, level: getLevelForXp(500) });
    const lockProjection = vi.fn(async () => locked);
    const updateProjection = vi.fn(async () => authoritative);
    const { repository, transaction } = fakeGamificationRepository({
      lockProjection,
      updateProjection
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "live-session",
        sourceId: "00000000-0000-4000-8000-000000001010",
        occurredAt: now,
        confirmedDuoFact: true,
        metadata: { durationSeconds: 1_800 }
      },
      repository
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, duplicate: false }));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(lockProjection).toHaveBeenCalledWith("duo-1");
    expect(transaction.readProjection).not.toHaveBeenCalled();
    expect(lockProjection.mock.invocationCallOrder[0]).toBeLessThan(
      (transaction.readDuoTimezone as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0]!
    );
    expect(result.summary.levelUp?.currentLevel).toEqual(authoritative.level);
    expect(updateProjection).toHaveBeenCalledWith(
      expect.not.objectContaining({ nextLevel: expect.anything() })
    );
  });

  it("records a level milestone freeze once across a replay", async () => {
    const levelTenThreshold = getLevelThreshold(10);
    const locked = projectionRecord({
      xp: levelTenThreshold - 20,
      level: getLevelForXp(levelTenThreshold - 20)
    });
    const insertXpLedgerAward = vi
      .fn<GamificationRepositoryTransaction["insertXpLedgerAward"]>()
      .mockResolvedValueOnce(
        xpAwardRecord({
          amount: 30,
          sourceId: "00000000-0000-4000-8000-000000001111"
        })
      )
      .mockResolvedValueOnce(null);
    let availableFreezes = 0;
    const updateProjection = vi.fn(async (input: {
      availableFreezes?: number;
      duoId: string;
      streak?: number;
      xpDelta: number;
    }) => {
      availableFreezes = input.availableFreezes ?? availableFreezes;
      return projectionRecord({
        xp: levelTenThreshold + 10,
        level: getLevelForXp(levelTenThreshold + 10),
        availableFreezes
      });
    });
    const { repository, transaction } = fakeGamificationRepository({
      insertXpLedgerAward,
      lockProjection: vi.fn(async () => locked),
      updateProjection
    });
    const fact = {
      duoId: "duo-1",
      actorUserId: "member-1",
      sourceType: "live-session" as const,
      sourceId: "00000000-0000-4000-8000-000000001111",
      occurredAt: now,
      confirmedDuoFact: true,
      metadata: { durationSeconds: 1_800 }
    };

    const first = await applyGamificationFact(fact, repository);
    const replay = await applyGamificationFact(fact, repository);

    if (!first.ok || !replay.ok) {
      throw new Error("expected level crossing and replay to succeed");
    }

    expect(first.summary.streak).toEqual(
      expect.objectContaining({
        earnedFreezes: 1,
        availableFreezes: 1
      })
    );
    expect(replay.duplicate).toBe(true);
    expect(
      (transaction.insertStreakEvent as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([event]) => event.eventType === "freeze-earned"
      )
    ).toHaveLength(1);
  });

  it("reads duo-scoped metrics after projection updates and unlocks threshold and composite predicates", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      achievementMetrics: achievementMetrics({
        alignedPlayDayCount: 1,
        doubleConfirmationCount: 1
      })
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "chapter",
        sourceId: "00000000-0000-4000-8000-000000000606",
        occurredAt: now,
        confirmedDuoFact: true,
        metadata: {
          chapterTitle: "Chefe",
          libraryGameId: "00000000-0000-4000-8000-000000000777"
        }
      },
      repository
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, duplicate: false }));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(transaction.readAchievementMetrics).toHaveBeenCalledWith("duo-1", {
      timezone: "America/Sao_Paulo"
    });
    expect(
      (transaction.updateProjection as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
    ).toBeLessThan(
      (transaction.readAchievementMetrics as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0]!
    );
    expect(result.summary.achievements.map((achievement) => achievement.slug)).toContain(
      "dois-controles-um-plano"
    );
  });

  it("returns only achievement unlocks that were inserted for the current fact", async () => {
    const insertAchievementUnlock = vi.fn(async () => null);
    const { repository, transaction } = fakeGamificationRepository({
      achievementMetrics: achievementMetrics({
        confirmedSessionCount: 1,
        doubleConfirmationCount: 1
      }),
      insertAchievementUnlock
    });

    const result = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "live-session",
        sourceId: "00000000-0000-4000-8000-000000000707",
        occurredAt: now,
        confirmedDuoFact: true,
        metadata: { durationSeconds: 1_800 }
      },
      repository
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, duplicate: false }));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    expect(insertAchievementUnlock).toHaveBeenCalled();
    expect(result.summary.achievements).toEqual([]);
    expect(transaction.insertRewardNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ notificationType: "achievement" })
    );
  });

  it("keeps Dropado and Discovery XP-neutral while evaluating their real facts", async () => {
    const dropado = fakeGamificationRepository({
      achievementMetrics: achievementMetrics({ terminalDropadoCount: 1 })
    });
    const discovery = fakeGamificationRepository({
      achievementMetrics: achievementMetrics({ discoveryMatchCount: 1 })
    });

    const dropadoResult = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "terminal-dropado",
        sourceId: "00000000-0000-4000-8000-000000000808",
        occurredAt: now,
        confirmedDuoFact: true
      },
      dropado.repository
    );
    const discoveryResult = await applyGamificationFact(
      {
        duoId: "duo-1",
        actorUserId: "member-1",
        sourceType: "discovery-match",
        sourceId: "00000000-0000-4000-8000-000000000909",
        occurredAt: now,
        confirmedDuoFact: true
      },
      discovery.repository
    );

    if (!dropadoResult.ok || !discoveryResult.ok) {
      throw new Error("expected neutral facts to remain valid");
    }

    expect(dropadoResult.summary.totalXpAwarded).toBe(0);
    expect(dropadoResult.summary.achievements.map((achievement) => achievement.slug)).toContain(
      "sem-tilt"
    );
    expect(discoveryResult.summary.totalXpAwarded).toBe(0);
    expect(
      discoveryResult.summary.achievements.map((achievement) => achievement.slug)
    ).toContain("radar-ligado");
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
  achievementMetrics?: AchievementMetricSnapshot;
  insertXpLedgerAward?: GamificationRepositoryTransaction["insertXpLedgerAward"];
  insertAchievementUnlock?: GamificationRepositoryTransaction["insertAchievementUnlock"];
  advanceQuestProgress?: (input: {
    completedAt: Date;
    duoId: string;
    goal: number;
    increment: number;
    lastSourceId: string;
    lastSourceType: string;
    metadata?: Record<string, unknown>;
    questCycleId: string;
    sourceKey: string;
  }) => Promise<{
    advanced: boolean;
    completedNow: boolean;
    progress: GamificationQuestProgressRecord;
  }>;
  linkQuestProgressReward?: (input: {
    duoId: string;
    questCycleId: string;
    rewardAwardId: string;
  }) => Promise<GamificationQuestProgressRecord>;
  lockProjection?: (
    duoId: string
  ) => Promise<GamificationProjectionRecord | null>;
  updateProjection?: (
    input: {
      availableFreezes?: number;
      duoId: string;
      streak?: number;
      xpDelta: number;
    }
  ) => Promise<GamificationProjectionRecord>;
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
    lockProjection: input.lockProjection ?? vi.fn(async () => projection),
    readAchievementMetrics: vi.fn(
      async () => input.achievementMetrics ?? achievementMetrics()
    ),
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
    updateProjection:
      input.updateProjection ??
      vi.fn(async (updateInput) => {
        const xp = Math.max(0, projection.xp + updateInput.xpDelta);
        return projectionRecord({
          duoId: updateInput.duoId,
          xp,
          level: getLevelForXp(xp),
          streak: updateInput.streak ?? projection.streak,
          availableFreezes:
            updateInput.availableFreezes ?? projection.availableFreezes,
          updatedAt: now
        });
      }),
    readAchievementUnlocks: vi.fn(async () => achievementUnlocks),
    readRecentXpLedgerAwards: vi.fn(async () => []),
    insertAchievementUnlock:
      input.insertAchievementUnlock ??
      vi.fn(async (unlockInput) =>
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
  Object.assign(transaction, {
    advanceQuestProgress: input.advanceQuestProgress,
    linkQuestProgressReward: input.linkQuestProgressReward
  });

  return {
    transaction,
    repository: {
      withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
      ensureGamificationJobs: vi.fn(async () => ({ readyDuos: 0, producedJobs: 0 })),
      enqueueGamificationJob: vi.fn(async () => true),
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

function achievementMetrics(
  overrides: Partial<AchievementMetricSnapshot> = {}
): AchievementMetricSnapshot {
  return {
    ...EMPTY_ACHIEVEMENT_METRICS,
    ...overrides
  };
}
