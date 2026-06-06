import { readFileSync } from "node:fs";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_GROUPS,
  EMPTY_ACHIEVEMENT_METRICS,
  getAchievements,
  toAchievementRouteView
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
import {
  buildAchievementPath,
  parseAchievementRouteParams
} from "../src/app/app/conquistas/achievement-route-params";
import { AchievementGrid } from "../src/modules/gamification/presentation/achievement-grid";
import { getLevelForXp } from "../src/modules/gamification/domain/level-curve";

const now = new Date("2026-06-06T15:00:00.000Z");
const getAchievementsSource = readFileSync(
  "src/modules/gamification/application/get-achievements.ts",
  "utf8"
);
const viewModelSource = readFileSync(
  "src/modules/gamification/presentation/view-models.ts",
  "utf8"
);
const iconSource = readFileSync(
  "src/modules/gamification/presentation/achievement-badge-icon.tsx",
  "utf8"
);
const gridSource = readFileSync(
  "src/modules/gamification/presentation/achievement-grid.tsx",
  "utf8"
);
const globalCssSource = readFileSync("src/app/globals.css", "utf8");
const appShellSource = readFileSync("src/components/app-shell.tsx", "utf8");
const pageSource = readFileSync("src/app/app/conquistas/page.tsx", "utf8");

afterEach(() => {
  cleanup();
});

describe("Phase 05.4 achievement read model", () => {
  it("builds grouped route-ready achievements from server unlock rows", async () => {
    const { repository } = fakeGamificationRepository({
      achievementUnlocks: [
        achievementUnlockRecord({ achievementSlug: "primeiro-save" }),
        achievementUnlockRecord({ achievementSlug: "sem-pular-cutscene" })
      ]
    });

    const record = await getAchievements({ userId: "member-1" }, repository);

    expect(record).not.toBeNull();
    expect(record?.totalCount).toBe(ACHIEVEMENT_CATALOG.length);
    expect(record?.totalCount).toBeGreaterThanOrEqual(48);
    expect(record?.totalCount).toBeLessThanOrEqual(52);
    expect(record?.groups.map((group) => group.group)).toEqual([...ACHIEVEMENT_GROUPS]);
    expect(record?.unlockedCount).toBe(2);
    expect(record?.groups.flatMap((group) => group.achievements)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "primeiro-save",
          state: "unlocked",
          unlockedAt: now
        }),
        expect.objectContaining({
          slug: "sem-pular-cutscene",
          state: "unlocked"
        })
      ])
    );
  });

  it("validates rarity params and preserves shareable filter URLs", async () => {
    const rareParams = parseAchievementRouteParams({ raridade: "rare" });
    const invalidParams = parseAchievementRouteParams({ raridade: "admin" });
    const { repository } = fakeGamificationRepository();
    const record = await getAchievements(
      { userId: "member-1", rarity: rareParams.rarity },
      repository
    );
    const view = toAchievementRouteView(record!);

    expect(rareParams).toEqual({ rarity: "rare", invalidRarity: false });
    expect(invalidParams).toEqual({ rarity: null, invalidRarity: true });
    expect(buildAchievementPath(rareParams)).toBe("/app/conquistas?raridade=rare");
    expect(buildAchievementPath(rareParams, { rarity: null })).toBe("/app/conquistas");
    expect(record?.selectedRarity).toBe("rare");
    expect(record?.groups.flatMap((group) => group.achievements).every((achievement) => achievement.rarity === "rare")).toBe(true);
    expect(view.filterOptions.find((option) => option.rarity === "rare")).toEqual(
      expect.objectContaining({
        href: "/app/conquistas?raridade=rare",
        selected: true
      })
    );
    expect(view.filterOptions.find((option) => option.rarity === null)).toEqual(
      expect.objectContaining({
        href: "/app/conquistas",
        selected: false
      })
    );
  });

  it("keeps hidden locked achievements mysterious without predicate or source leaks", async () => {
    const { repository } = fakeGamificationRepository();
    const record = await getAchievements({ userId: "member-1" }, repository);
    const hiddenLocked = record?.groups
      .flatMap((group) => group.achievements)
      .filter((achievement) => achievement.state === "locked-hidden") ?? [];

    expect(hiddenLocked.length).toBeGreaterThan(0);
    expect(hiddenLocked[0]).toEqual(
      expect.objectContaining({
        slug: null,
        title: "Conquista oculta",
        iconKey: "badge-mystery"
      })
    );
    expect(JSON.stringify(hiddenLocked)).not.toMatch(
      /predicateKey|confirmed-session-count|same-hour-sessions|unexpected-match|late-session-chain|sourceId/i
    );
    expect(getAchievementsSource).not.toMatch(/sourceId:|predicateKey:/);
  });

  it("does not rank one member against the other in achievement copy", () => {
    const combinedCopy = ACHIEVEMENT_CATALOG.map((achievement) =>
      `${achievement.title} ${achievement.description}`
    ).join(" ");

    expect(combinedCopy).not.toMatch(/ranking|placar individual|contra o outro|melhor jogador|pior jogador/i);
  });

  it("keeps route view labels collective and source-safe", async () => {
    const { repository } = fakeGamificationRepository({
      achievementUnlocks: [achievementUnlockRecord({ achievementSlug: "primeiro-save" })]
    });
    const record = await getAchievements({ userId: "member-1" }, repository);
    const view = toAchievementRouteView(record!);

    expect(view.totalLabel).toContain("sem placar individual");
    expect(view.unlockedLabel).toContain("pela dupla");
    expect(JSON.stringify(view)).not.toMatch(/predicateKey|sourceId|xp individual|ranking/i);
    expect(viewModelSource).toContain("toAchievementRouteView");
  });
});

describe("Phase 05.4 achievement presentation", () => {
  it("renders SVG badge cards, rarity filters and keyboard-focusable achievements", async () => {
    const { repository } = fakeGamificationRepository({
      achievementUnlocks: [achievementUnlockRecord({ achievementSlug: "primeiro-save" })]
    });
    const record = await getAchievements({ userId: "member-1" }, repository);
    const view = toAchievementRouteView(record!);
    const { container } = render(<AchievementGrid view={view} />);

    expect(screen.getByRole("navigation", { name: /filtrar conquistas por raridade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rara/i })).toHaveAttribute(
      "href",
      "/app/conquistas?raridade=rare"
    );
    expect(container.querySelectorAll(".achievement-badge-icon")).toHaveLength(
      record!.groups.flatMap((group) => group.achievements).length
    );
    expect(container.querySelector(".achievement-card")?.getAttribute("tabindex")).toBe("0");
    expect(container.textContent).toContain("Primeiro save");
    expect(container.textContent).toContain("Conquista oculta");
  });

  it("keeps the UI source specific to QUEUE/2 and free of emoji-dependent badges", () => {
    expect(iconSource).toContain("<svg");
    expect(iconSource).not.toMatch(emojiRegex);
    expect(gridSource).not.toMatch(emojiRegex);
    expect(globalCssSource).toContain("--rarity-rare");
    expect(globalCssSource).toContain(".achievement-rarity-filter a[aria-current=\"page\"]");
    expect(globalCssSource).toContain(".achievement-card:focus-visible");
    expect(globalCssSource).toContain("prefers-reduced-motion: reduce");
    expect(globalCssSource).not.toMatch(/letter-spacing:\s*-/);
  });

  it("adds /app/conquistas as an authenticated route through public module APIs and AppShell navigation", () => {
    expect(pageSource).toContain("getAchievements");
    expect(pageSource).toContain("currentPage=\"conquistas\"");
    expect(pageSource).toContain("NotificationCenter");
    expect(pageSource).toContain("withServerTiming");
    expect(pageSource).not.toMatch(/modules\/gamification\/(domain|application|infrastructure|presentation)/);
    expect(appShellSource).toContain("/app/conquistas");
    expect(appShellSource).toContain("Conquistas");
    expect(globalCssSource).toContain("grid-template-columns: repeat(8, minmax(72px, 1fr))");
  });
});

const emojiRegex =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function fakeGamificationRepository(input: {
  membership?: GamificationMembershipContext | null;
  achievementUnlocks?: GamificationAchievementUnlockRecord[];
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
    readProjection: vi.fn(async () => projectionRecord()),
    lockProjection: vi.fn(async () => projectionRecord()),
    readAchievementMetrics: vi.fn(async () => EMPTY_ACHIEVEMENT_METRICS),
    countXpAwardsForDuoDay: vi.fn(async () => 0),
    insertXpLedgerAward: vi.fn(async () => xpAwardRecord()),
    updateProjection: vi.fn(async () => projectionRecord()),
    readAchievementUnlocks: vi.fn(async () => input.achievementUnlocks ?? []),
    readRecentXpLedgerAwards: vi.fn(async () => []),
    insertAchievementUnlock: vi.fn(async () => achievementUnlockRecord()),
    readActiveQuestCycles: vi.fn(async () => []),
    readQuestProgressForCycles: vi.fn(async () => []),
    upsertQuestCycle: vi.fn(async () => questCycleRecord()),
    upsertQuestProgress: vi.fn(async () => questProgressRecord()),
    readStreakState: vi.fn(async () => null),
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
