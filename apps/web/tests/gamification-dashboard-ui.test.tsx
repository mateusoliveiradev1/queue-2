import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  getGamificationDashboard,
  getLevelForXp,
  toGamificationDashboardView
} from "../src/modules/gamification";
import type {
  GamificationAchievementUnlockRecord,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationXpLedgerRecord
} from "../src/modules/gamification/application/ports";

const now = new Date("2026-06-06T15:00:00.000Z");
const dashboardUseCaseSource = readFileSync(
  "src/modules/gamification/application/get-gamification-dashboard.ts",
  "utf8"
);
const dashboardViewModelSource = readFileSync(
  "src/modules/gamification/presentation/view-models.ts",
  "utf8"
);

describe("Phase 05.3 gamification dashboard contract", () => {
  it("builds a bounded duo-shared dashboard read model for /app", async () => {
    const { repository, transaction } = fakeGamificationRepository({
      projection: projectionRecord({ xp: 300, level: getLevelForXp(300), streak: 3 }),
      questCycles: [
        questCycleRecord({
          id: "00000000-0000-4000-8000-000000000001",
          questSlug: "mes-da-fila",
          questType: "monthly"
        }),
        questCycleRecord({
          id: "00000000-0000-4000-8000-000000000002",
          questSlug: "descoberta-em-dupla"
        }),
        questCycleRecord({
          id: "00000000-0000-4000-8000-000000000003",
          questSlug: "capitulo-da-semana"
        }),
        questCycleRecord({
          id: "00000000-0000-4000-8000-000000000004",
          questSlug: "sessao-confirmada"
        })
      ],
      questProgress: [
        questProgressRecord({
          questCycleId: "00000000-0000-4000-8000-000000000004",
          currentValue: 1,
          completedAt: now
        })
      ],
      achievementUnlocks: [
        achievementUnlockRecord({ achievementSlug: "primeiro-save" }),
        achievementUnlockRecord({ achievementSlug: "controle-passado" }),
        achievementUnlockRecord({ achievementSlug: "primeiro-desafio" }),
        achievementUnlockRecord({ achievementSlug: "radar-ligado" })
      ],
      ledger: [
        xpAwardRecord({
          id: "award-session",
          sourceType: "live-session",
          reasonCode: "live-session-confirmed",
          amount: 30
        }),
        xpAwardRecord({
          id: "award-quest",
          sourceType: "quest",
          reasonCode: "quest-complete",
          amount: 80
        })
      ]
    });

    const dashboard = await getGamificationDashboard({ userId: "member-1" }, repository);

    expect(dashboard).toEqual(
      expect.objectContaining({
        xp: 300,
        level: expect.objectContaining({ name: "Lv3 Primeiro Save" }),
        streak: expect.objectContaining({ current: 3 })
      })
    );
    expect(dashboard?.activeQuests.map((quest) => quest.questSlug)).toEqual([
      "capitulo-da-semana",
      "descoberta-em-dupla",
      "sessao-confirmada"
    ]);
    expect(dashboard?.recentAchievements).toHaveLength(3);
    expect(dashboard?.recentLedger).toHaveLength(2);
    expect(transaction.readRecentXpLedgerAwards).toHaveBeenCalledWith({
      duoId: "duo-1",
      limit: 5
    });
    expect(dashboardUseCaseSource).toContain("DASHBOARD_ACTIVE_QUEST_LIMIT = 3");
    expect(dashboardUseCaseSource).toContain("DASHBOARD_RECENT_LEDGER_LIMIT = 5");
  });

  it("maps XP history to product language without individual totals or internal source names", () => {
    const view = toGamificationDashboardView({
      duoId: "duo-1",
      xp: 300,
      level: getLevelForXp(300),
      nextLevel: getLevelForXp(430),
      xpIntoLevel: 38,
      xpForNextLevel: 168,
      progressRatio: 0.22,
      streak: {
        current: 3,
        availableFreezes: 1
      },
      activeQuests: [
        {
          questSlug: "sessao-confirmada",
          questType: "weekly",
          cycleKey: "weekly:2026-06-01",
          title: "Sessao confirmada",
          description: "Confirmem uma sessao coop real nesta semana.",
          currentValue: 1,
          goalValue: 1,
          completed: true,
          windowEndAt: new Date("2026-06-08T04:00:00.000Z")
        }
      ],
      recentAchievements: [
        {
          slug: "primeiro-save",
          title: "Primeiro save",
          rarity: "common",
          unlockedAt: now
        }
      ],
      recentLedger: [
        {
          id: "award-session",
          amount: 30,
          reasonCode: "live-session-confirmed",
          sourceType: "live-session",
          awardedAt: now
        },
        {
          id: "award-quest",
          amount: 80,
          reasonCode: "quest-complete",
          sourceType: "quest",
          awardedAt: now
        }
      ],
      updatedAt: now
    });

    expect(view.xpLabel).toBe("300 XP da dupla");
    expect(view.levelName).toBe("Lv3 Primeiro Save");
    expect(view.streak).toEqual(
      expect.objectContaining({
        state: "active",
        label: "Chama ativa",
        valueLabel: "3 dias"
      })
    );
    expect(view.quests).toEqual([
      expect.objectContaining({
        title: "Sessao confirmada",
        progressLabel: "Concluido pela dupla"
      })
    ]);
    expect(view.achievements).toEqual([
      expect.objectContaining({
        title: "Primeiro save",
        rarityLabel: "Comum"
      })
    ]);
    expect(view.ledger.map((entry) => entry.reasonLabel)).toEqual([
      "Sessao ao vivo confirmada",
      "Desafio concluido pela dupla"
    ]);
    expect(JSON.stringify(view)).not.toMatch(/live-session|source_id|member xp|player xp|xp individual/i);
    expect(dashboardViewModelSource).not.toMatch(/individualXp|userXp|playerXp|memberXp/i);
  });

  it("renders a new-duo state without fake progress or guilt copy", () => {
    const view = toGamificationDashboardView(null);

    expect(view.empty).toBe(true);
    expect(view.xpLabel).toBe("0 XP da dupla");
    expect(view.progressPercent).toBe(0);
    expect(view.progressLabel).toMatch(/primeiro XP vem de sessoes/i);
    expect(view.quests).toEqual([]);
    expect(view.achievements).toEqual([]);
    expect(view.ledger).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/perdeu|atrasou|culpa|ranking|individual/i);
  });
});

function fakeGamificationRepository(input: {
  membership?: GamificationMembershipContext | null;
  projection?: GamificationProjectionRecord;
  questCycles?: GamificationQuestCycleRecord[];
  questProgress?: GamificationQuestProgressRecord[];
  achievementUnlocks?: GamificationAchievementUnlockRecord[];
  ledger?: GamificationXpLedgerRecord[];
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
  const transaction: GamificationRepositoryTransaction = {
    resolveMembership: vi.fn(async () => membership),
    readDuoTimezone: vi.fn(async () => "America/Sao_Paulo"),
    readProjection: vi.fn(async () => input.projection ?? projectionRecord()),
    countXpAwardsForDuoDay: vi.fn(async () => 0),
    insertXpLedgerAward: vi.fn(async () => xpAwardRecord()),
    updateProjection: vi.fn(async () => input.projection ?? projectionRecord()),
    readAchievementUnlocks: vi.fn(async () => input.achievementUnlocks ?? []),
    readRecentXpLedgerAwards: vi.fn(async () => input.ledger ?? []),
    insertAchievementUnlock: vi.fn(async () => achievementUnlockRecord()),
    readActiveQuestCycles: vi.fn(async () => input.questCycles ?? []),
    readQuestProgressForCycles: vi.fn(async () => input.questProgress ?? []),
    upsertQuestCycle: vi.fn(async () => questCycleRecord()),
    upsertQuestProgress: vi.fn(async () => questProgressRecord()),
    readStreakState: vi.fn(async () => null),
    insertStreakEvent: vi.fn(async () => true),
    upsertStreakState: vi.fn(async (state) => state),
    insertRewardNotification: vi.fn(),
    insertAdjustment: vi.fn(),
    sumXpLedgerAwards: vi.fn(async () => input.projection?.xp ?? 0)
  };

  return {
    transaction,
    repository: {
      withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
      claimDueGamificationJobs: vi.fn(async () => []),
      completeGamificationJob: vi.fn(),
      failGamificationJob: vi.fn(),
      recordProjectionRebuild: vi.fn()
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

function questCycleRecord(
  overrides: Partial<GamificationQuestCycleRecord> = {}
): GamificationQuestCycleRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
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
    questCycleId: "00000000-0000-4000-8000-000000000001",
    currentValue: 0,
    completedAt: null,
    rewardAwardId: null,
    metadata: {},
    updatedAt: now,
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
