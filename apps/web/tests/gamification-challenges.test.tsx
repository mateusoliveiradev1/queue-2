import { readFileSync } from "node:fs";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ChallengeBoard,
  getChallenges,
  StreakPanel,
  toChallengeRouteView
} from "../src/modules/gamification";
import type {
  GamificationAchievementUnlockRecord,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationStreakStateRecord,
  GamificationXpLedgerRecord
} from "../src/modules/gamification/application/ports";
import { getLevelForXp } from "../src/modules/gamification/domain/level-curve";
import {
  buildChallengePath,
  parseChallengeRouteParams
} from "../src/app/app/desafios/challenge-route-params";

const now = new Date("2026-06-06T15:00:00.000Z");
const getChallengesSource = readFileSync(
  "src/modules/gamification/application/get-challenges.ts",
  "utf8"
);
const viewModelSource = readFileSync(
  "src/modules/gamification/presentation/view-models.ts",
  "utf8"
);
const challengeBoardSource = readFileSync(
  "src/modules/gamification/presentation/challenge-board.tsx",
  "utf8"
);
const streakPanelSource = readFileSync(
  "src/modules/gamification/presentation/streak-panel.tsx",
  "utf8"
);
const globalCssSource = readFileSync("src/app/globals.css", "utf8");
const appShellSource = readFileSync("src/components/app-shell.tsx", "utf8");
const pageSource = readFileSync("src/app/app/desafios/page.tsx", "utf8");

afterEach(() => {
  cleanup();
});

describe("Phase 05.5 challenge read model", () => {
  it("builds weekly, monthly and seasonal sections from server-owned cycles", async () => {
    const cycles = [
      questCycleRecord({
        id: "cycle-weekly-3",
        questSlug: "descoberta-em-dupla",
        questType: "weekly"
      }),
      questCycleRecord({
        id: "cycle-seasonal-1",
        questSlug: "spooky-coop",
        questType: "seasonal",
        cycleKey: "seasonal:spooky:2026"
      }),
      questCycleRecord({
        id: "cycle-weekly-1",
        questSlug: "sessao-confirmada",
        questType: "weekly"
      }),
      questCycleRecord({
        id: "cycle-monthly-1",
        questSlug: "mes-da-fila",
        questType: "monthly",
        cycleKey: "monthly:2026-06"
      }),
      questCycleRecord({
        id: "cycle-weekly-2",
        questSlug: "capitulo-da-semana",
        questType: "weekly"
      }),
      questCycleRecord({
        id: "cycle-unknown",
        questSlug: "nao-existe",
        questType: "weekly"
      })
    ];
    const { repository, transaction } = fakeGamificationRepository({
      cycles,
      progress: [
        questProgressRecord({
          questCycleId: "cycle-weekly-1",
          currentValue: 1,
          completedAt: now
        }),
        questProgressRecord({
          questCycleId: "cycle-monthly-1",
          currentValue: 2
        }),
        questProgressRecord({
          questCycleId: "cycle-seasonal-1",
          currentValue: 1,
          completedAt: now
        })
      ],
      streakState: streakStateRecord({
        currentStreak: 6,
        longestStreak: 9,
        availableFreezes: 2,
        lastActivityDuoDay: "2026-06-06"
      })
    });

    const record = await getChallenges({ userId: "member-1", now }, repository);

    expect(record).not.toBeNull();
    expect(record?.duoId).toBe("duo-1");
    expect(record?.timezone).toBe("America/Sao_Paulo");
    expect(record?.streak).toEqual({
      current: 6,
      longest: 9,
      availableFreezes: 2,
      lastActivityDuoDay: "2026-06-06",
      cutoffHour: 4
    });
    expect(record?.sections.map((section) => section.questType)).toEqual([
      "weekly",
      "monthly",
      "seasonal"
    ]);
    expect(record?.sections[0]?.expectedSlots).toBe(3);
    expect(record?.sections[0]?.quests.map((quest) => quest.questSlug)).toEqual([
      "sessao-confirmada",
      "capitulo-da-semana",
      "descoberta-em-dupla"
    ]);
    expect(record?.sections[1]?.quests[0]).toEqual(
      expect.objectContaining({
        questSlug: "mes-da-fila",
        currentValue: 2,
        goalValue: 4,
        completed: false
      })
    );
    expect(record?.sections[2]?.quests[0]).toEqual(
      expect.objectContaining({
        questSlug: "spooky-coop",
        completed: true,
        completedAt: now,
        seasonalKey: "spooky"
      })
    );
    expect(transaction.readQuestProgressForCycles).toHaveBeenCalledWith({
      duoId: "duo-1",
      questCycleIds: cycles.map((cycle) => cycle.id)
    });
    expect(getChallengesSource).not.toMatch(/upsertQuestProgress|insertXpLedgerAward|insertStreakEvent/);
  });

  it("validates period params and keeps route labels collective", async () => {
    const weeklyParams = parseChallengeRouteParams({ periodo: "semana" });
    const invalidParams = parseChallengeRouteParams({ periodo: "admin" });
    const { repository } = fakeGamificationRepository({
      cycles: [
        questCycleRecord({
          id: "cycle-weekly-1",
          questSlug: "sessao-confirmada",
          questType: "weekly"
        }),
        questCycleRecord({
          id: "cycle-seasonal-1",
          questSlug: "spooky-coop",
          questType: "seasonal",
          cycleKey: "seasonal:spooky:2026"
        })
      ],
      progress: [
        questProgressRecord({
          questCycleId: "cycle-seasonal-1",
          currentValue: 1,
          completedAt: now
        })
      ]
    });
    const record = await getChallenges({ userId: "member-1", now }, repository);
    const view = toChallengeRouteView(
      record!,
      (period) => buildChallengePath(weeklyParams, { period }),
      weeklyParams.period
    );

    expect(weeklyParams).toEqual({ period: "weekly", invalidPeriod: false });
    expect(invalidParams).toEqual({ period: null, invalidPeriod: true });
    expect(buildChallengePath(weeklyParams)).toBe("/app/desafios");
    expect(buildChallengePath(weeklyParams, { period: "monthly" })).toBe("/app/desafios?periodo=mes");
    expect(view.selectedPeriod).toBe("weekly");
    expect(view.sections).toHaveLength(1);
    expect(view.filterOptions.find((option) => option.period === "weekly")).toEqual(
      expect.objectContaining({
        href: "/app/desafios?periodo=semana",
        selected: true
      })
    );
    expect(JSON.stringify(view)).toMatch(/dupla|servidor|Streak Freeze/i);
    expect(JSON.stringify(view)).not.toMatch(/culpa|fracasso|falha|perdeu|punicao|ranking/i);
    expect(viewModelSource).toContain("sem guardar historico de incompletos");
  });
});

describe("Phase 05.5 challenge presentation", () => {
  it("renders the board, filters, Streak panel and focusable cards", async () => {
    const { repository } = fakeGamificationRepository({
      cycles: [
        questCycleRecord({
          id: "cycle-weekly-1",
          questSlug: "sessao-confirmada",
          questType: "weekly"
        }),
        questCycleRecord({
          id: "cycle-seasonal-1",
          questSlug: "spooky-coop",
          questType: "seasonal",
          cycleKey: "seasonal:spooky:2026"
        })
      ],
      progress: [
        questProgressRecord({
          questCycleId: "cycle-seasonal-1",
          currentValue: 1,
          completedAt: now
        })
      ],
      streakState: streakStateRecord({
        currentStreak: 3,
        longestStreak: 5,
        availableFreezes: 1,
        lastActivityDuoDay: "2026-06-06"
      })
    });
    const record = await getChallenges({ userId: "member-1", now }, repository);
    const view = toChallengeRouteView(record!);
    const { container } = render(
      <>
        <h1 id="challenges-route-title">Desafios da dupla</h1>
        <StreakPanel streak={view.streak} />
        <ChallengeBoard view={view} />
      </>
    );

    expect(screen.getByRole("navigation", { name: /filtrar desafios por periodo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /semana/i })).toHaveAttribute(
      "href",
      "/app/desafios?periodo=semana"
    );
    expect(screen.getByRole("progressbar", { name: /concluido pela dupla/i })).toBeInTheDocument();
    expect(container.querySelector(".challenge-streak-panel")).toHaveAttribute("data-state", "active");
    expect(container.querySelector(".challenge-card")?.getAttribute("tabindex")).toBe("0");
    expect(container.textContent).toContain("Spooky coop");
    expect(container.textContent).toContain("Selo spooky");
    expect(container.textContent).toContain("desde 06/06/2026");
  });

  it("keeps /app/desafios authenticated, server-authoritative and responsive in source", () => {
    expect(pageSource).toContain("requireVerifiedSession");
    expect(pageSource).toContain("getDuoDashboard");
    expect(pageSource).toContain("getChallenges");
    expect(pageSource).toContain("currentPage=\"desafios\"");
    expect(pageSource).toContain("NotificationCenter");
    expect(pageSource).not.toMatch(/modules\/gamification\/(domain|application|infrastructure|presentation)/);
    expect(challengeBoardSource).not.toMatch(/use client|onClick|<button|<form/);
    expect(streakPanelSource).not.toMatch(/use client|onClick|<button|<form/);
    expect(viewModelSource).toContain("quest.completedAt");
    expect(appShellSource).toContain("/app/desafios");
    expect(appShellSource).toContain("Desafios");
    expect(globalCssSource).toContain("grid-template-columns: repeat(8, minmax(72px, 1fr))");
    expect(globalCssSource).toContain(".challenge-card:focus-visible");
    expect(globalCssSource).toContain("min-height: 44px");
    expect(globalCssSource).not.toMatch(/letter-spacing:\s*-/);
  });
});

function fakeGamificationRepository(input: {
  membership?: GamificationMembershipContext | null;
  projection?: GamificationProjectionRecord | null;
  cycles?: GamificationQuestCycleRecord[];
  progress?: GamificationQuestProgressRecord[];
  streakState?: GamificationStreakStateRecord | null;
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
    readProjection: vi.fn(async () =>
      input.projection === undefined ? projectionRecord() : input.projection
    ),
    countXpAwardsForDuoDay: vi.fn(async () => 0),
    insertXpLedgerAward: vi.fn(async () => xpAwardRecord()),
    updateProjection: vi.fn(async () => projectionRecord()),
    readAchievementUnlocks: vi.fn(async () => []),
    readRecentXpLedgerAwards: vi.fn(async () => []),
    insertAchievementUnlock: vi.fn(async () => achievementUnlockRecord()),
    readActiveQuestCycles: vi.fn(async () => input.cycles ?? []),
    readQuestProgressForCycles: vi.fn(async () => input.progress ?? []),
    upsertQuestCycle: vi.fn(async () => questCycleRecord()),
    upsertQuestProgress: vi.fn(async () => questProgressRecord()),
    readStreakState: vi.fn(async () =>
      input.streakState === undefined ? null : input.streakState
    ),
    insertStreakEvent: vi.fn(async () => true),
    upsertStreakState: vi.fn(async (state) => state),
    insertRewardNotification: vi.fn(),
    insertAdjustment: vi.fn(),
    sumXpLedgerAwards: vi.fn(async () => 0)
  };

  return {
    transaction,
    repository: {
      withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
      ensureGamificationJobs: vi.fn(async () => ({ readyDuos: 0, producedJobs: 0 })),
      enqueueGamificationJob: vi.fn(async () => true),
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
    xp: 120,
    level: getLevelForXp(120),
    streak: 2,
    availableFreezes: 1,
    updatedAt: now,
    ...overrides
  };
}

function questCycleRecord(
  overrides: Partial<GamificationQuestCycleRecord> = {}
): GamificationQuestCycleRecord {
  return {
    id: "cycle-weekly-1",
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
    questCycleId: "cycle-weekly-1",
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
