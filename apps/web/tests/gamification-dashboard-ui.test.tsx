import { readFileSync } from "node:fs";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getGamificationDashboard } from "../src/modules/gamification/application/get-gamification-dashboard";
import { EMPTY_ACHIEVEMENT_METRICS } from "../src/modules/gamification/domain/achievement-predicates";
import type {
  GamificationAchievementUnlockRecord,
  GamificationDashboardRecord,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationXpLedgerRecord
} from "../src/modules/gamification/application/ports";
import { getLevelForXp } from "../src/modules/gamification/domain/level-curve";
import { GamificationDashboardBand } from "../src/modules/gamification/presentation/gamification-dashboard-band";
import { toGamificationDashboardView } from "../src/modules/gamification/presentation/view-models";
import type {
  CurrentPlayGameRecord,
  CurrentPlayRecord
} from "../src/modules/play/application/ports";

const authSessionMock = vi.hoisted(() => ({
  currentSession: {
    session: {
      id: "session-current",
      token: "session-token-current",
      userId: "user-1",
      createdAt: new Date("2026-06-06T09:00:00.000Z"),
      updatedAt: new Date("2026-06-06T10:00:00.000Z"),
      expiresAt: new Date("2026-06-20T09:00:00.000Z")
    },
    user: {
      id: "user-1",
      email: "jogador@example.com",
      emailVerified: true,
      name: "Jogador da fila",
      image: null,
      createdAt: new Date("2026-06-06T09:00:00.000Z"),
      updatedAt: new Date("2026-06-06T09:00:00.000Z")
    }
  }
}));

const duoModuleMock = vi.hoisted(() => ({
  ready: {
    routeState: "ready" as const,
    profileDisplayName: "Jogador da fila",
    duo: {
      id: "duo-1",
      name: "Dupla do sofa",
      pairedAt: new Date("2026-06-03T10:00:00.000Z"),
      timezone: "America/Sao_Paulo",
      notificationsEnabled: true,
      audioEnabled: true,
      members: [
        {
          userId: "user-1",
          displayName: "Jogador da fila",
          memberSlot: 1 as const,
          joinedAt: new Date("2026-06-03T09:00:00.000Z")
        },
        {
          userId: "user-2",
          displayName: "Parceiro da fila",
          memberSlot: 2 as const,
          joinedAt: new Date("2026-06-03T10:00:00.000Z")
        }
      ]
    },
    activePairingCode: null
  },
  getDuoDashboard: vi.fn()
}));

const libraryModuleMock = vi.hoisted(() => ({
  getLibraryOverview: vi.fn(),
  toLibraryOverviewView: vi.fn()
}));

const playModuleMock = vi.hoisted(() => ({
  getCurrentPlay: vi.fn(),
  getDuoNotifications: vi.fn()
}));

const gamificationModuleMock = vi.hoisted(() => ({
  getGamificationDashboard: vi.fn()
}));

const navigationMock = vi.hoisted(() => ({
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

const phase4ActionMock = vi.hoisted(() => ({
  promotePlayingGameAction: vi.fn(async () => ({
    ok: true,
    state: "principal-promovido"
  })),
  reorderPlayingGamesAction: vi.fn(async () => ({
    ok: true,
    state: "ordem-atualizada"
  }))
}));

const phase2ActionMock = vi.hoisted(() => ({
  moveLibraryGameAction: vi.fn(async () => undefined)
}));

vi.mock("../src/platform/auth/session", () => ({
  logoutCurrentSessionAction: vi.fn(async () => undefined),
  requireVerifiedSession: vi.fn(async () => authSessionMock.currentSession)
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    className,
    src
  }: {
    alt: string;
    className?: string;
    src: string;
  }) => <img alt={alt} className={className} src={src} />
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Unexpected redirect to ${path}`);
  }),
  useRouter: () => navigationMock
}));

vi.mock("../src/modules/duo", () => ({
  formatPairingDate: vi.fn(() => "03/06/2026"),
  getDuoDashboard: duoModuleMock.getDuoDashboard
}));

vi.mock("../src/modules/library", () => ({
  getLibraryOverview: libraryModuleMock.getLibraryOverview,
  toLibraryOverviewView: libraryModuleMock.toLibraryOverviewView
}));

vi.mock("../src/app/app/phase-2-actions", () => phase2ActionMock);
vi.mock("../src/app/app/phase-4-actions", () => phase4ActionMock);

vi.mock("../src/modules/play", async () => {
  const dashboard = await vi.importActual<
    typeof import("../src/modules/play/presentation/playing-now-dashboard")
  >("../src/modules/play/presentation/playing-now-dashboard");
  const viewModels = await vi.importActual<
    typeof import("../src/modules/play/presentation/view-models")
  >("../src/modules/play/presentation/view-models");
  const notifications = await vi.importActual<
    typeof import("../src/modules/play/presentation/notification-center")
  >("../src/modules/play/presentation/notification-center");

  return {
    NotificationCenter: notifications.NotificationCenter,
    PlayingNowDashboard: dashboard.PlayingNowDashboard,
    getCurrentPlay: playModuleMock.getCurrentPlay,
    getDuoNotifications: playModuleMock.getDuoNotifications,
    toPlayingNowView: viewModels.toPlayingNowView
  };
});

vi.mock("../src/modules/gamification", async () => {
  const dashboardBand = await vi.importActual<
    typeof import("../src/modules/gamification/presentation/gamification-dashboard-band")
  >("../src/modules/gamification/presentation/gamification-dashboard-band");
  const viewModels = await vi.importActual<
    typeof import("../src/modules/gamification/presentation/view-models")
  >("../src/modules/gamification/presentation/view-models");

  return {
    GamificationDashboardBand: dashboardBand.GamificationDashboardBand,
    RewardToast: () => null,
    getGamificationDashboard: gamificationModuleMock.getGamificationDashboard,
    toGamificationDashboardView: viewModels.toGamificationDashboardView
  };
});

import DashboardPage from "../src/app/app/page";

const now = new Date("2026-06-06T15:00:00.000Z");
const dashboardUseCaseSource = readFileSync(
  "src/modules/gamification/application/get-gamification-dashboard.ts",
  "utf8"
);
const dashboardViewModelSource = readFileSync(
  "src/modules/gamification/presentation/view-models.ts",
  "utf8"
);
const dashboardBandSource = readFileSync(
  "src/modules/gamification/presentation/gamification-dashboard-band.tsx",
  "utf8"
);
const pageSource = readFileSync("src/app/app/page.tsx", "utf8");
const globalCssSource = readFileSync("src/app/globals.css", "utf8");

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  navigationMock.refresh.mockClear();
  duoModuleMock.getDuoDashboard.mockResolvedValue(duoModuleMock.ready);
  libraryModuleMock.getLibraryOverview.mockResolvedValue({
    ok: true,
    overview: {}
  });
  libraryModuleMock.toLibraryOverviewView.mockReturnValue({
    counts: {
      wishlist: 1,
      jogando: 1,
      pausado: 0
    },
    commonPlatformLabels: ["PC"],
    groups: {
      wishlist: [],
      jogando: [],
      pausado: []
    },
    lockedStatuses: []
  });
  playModuleMock.getCurrentPlay.mockResolvedValue({
    ok: true,
    currentPlay: currentPlayRecord()
  });
  playModuleMock.getDuoNotifications.mockResolvedValue({
    ok: true,
    center: {
      unreadCount: 0,
      items: []
    }
  });
  gamificationModuleMock.getGamificationDashboard.mockResolvedValue(dashboardRecord());
});

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

  it("renders the dashboard band with XP, streak, quests, achievements and ledger", () => {
    const { container } = render(
      <GamificationDashboardBand view={toGamificationDashboardView(dashboardRecord())} />
    );

    expect(screen.getByRole("heading", { name: /progresso da dupla/i })).toBeInTheDocument();
    expect(screen.getByText("300 XP da dupla")).toBeInTheDocument();
    expect(screen.getByText("Lv3 Primeiro Save")).toBeInTheDocument();
    expect(screen.getByText("Chama ativa")).toBeInTheDocument();
    expect(screen.getByText("Sessao confirmada")).toBeInTheDocument();
    expect(screen.getByText("Capitulo da semana")).toBeInTheDocument();
    expect(screen.getByText("Descoberta em dupla")).toBeInTheDocument();
    expect(screen.getByText("Primeiro save")).toBeInTheDocument();
    expect(screen.getByText("Sessao ao vivo confirmada")).toBeInTheDocument();
    expect(screen.getByText("Desafio concluido pela dupla")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conquistas/i })).toHaveAttribute(
      "href",
      "/app/conquistas"
    );
    expect(screen.getByRole("link", { name: /desafios/i })).toHaveAttribute(
      "href",
      "/app/desafios"
    );
    expect(container.textContent).not.toMatch(/live-session|source_id|xp individual|ranking/i);
  });

  it("renders gamification immediately after PlayingNowDashboard on /app", async () => {
    const { container } = render(await DashboardPage());
    const playingNow = container.querySelector(".playing-now");
    const gamification = container.querySelector(".gamification-dashboard-band");
    const metricGrid = container.querySelector(".metric-grid");

    expect(playingNow).not.toBeNull();
    expect(gamification).not.toBeNull();
    expect(metricGrid).not.toBeNull();
    expect(appearsBefore(playingNow as Element, gamification as Element)).toBe(true);
    expect(appearsBefore(gamification as Element, metricGrid as Element)).toBe(true);
    expect(gamificationModuleMock.getGamificationDashboard).toHaveBeenCalledWith({
      userId: "user-1"
    });
    expect(screen.getByRole("heading", { name: /jogando agora/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /progresso da dupla/i })).toBeInTheDocument();
  });

  it("keeps the Phase 05.3 UI source contract explicit", () => {
    expect(pageSource).toContain("PlayingNowDashboard");
    expect(pageSource).toContain("GamificationDashboardBand");
    expect(pageSource).toMatch(/<PlayingNowDashboard[\s\S]*<GamificationDashboardBand/);
    expect(dashboardViewModelSource).toContain("/app/conquistas");
    expect(dashboardViewModelSource).toContain("/app/desafios");
    expect(dashboardBandSource).not.toMatch(/modal|overlay|individual/i);
    expect(globalCssSource).toContain(".gamification-dashboard-band");
    expect(globalCssSource).toContain("queue2-streak-glow");
    expect(globalCssSource).toContain("prefers-reduced-motion: reduce");
    expect(globalCssSource).toContain(".gamification-streak-panel[data-state=\"freezing\"]");
    expect(gamificationCssRules(globalCssSource)).not.toMatch(/letter-spacing:\s*-/);
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
    lockProjection: vi.fn(async () => input.projection ?? projectionRecord()),
    readAchievementMetrics: vi.fn(async () => EMPTY_ACHIEVEMENT_METRICS),
    countXpAwardsForDuoDay: vi.fn(async () => 0),
    insertXpLedgerAward: vi.fn(async () => xpAwardRecord()),
    updateProjection: vi.fn(async () => input.projection ?? projectionRecord()),
    readAchievementUnlocks: vi.fn(async () => input.achievementUnlocks ?? []),
    readRecentXpLedgerAwards: vi.fn(async () => input.ledger ?? []),
    insertAchievementUnlock: vi.fn(async () => achievementUnlockRecord()),
    readActiveQuestCycles: vi.fn(async () => input.questCycles ?? []),
    readQuestProgressForCycles: vi.fn(async () => input.questProgress ?? []),
    upsertQuestCycle: vi.fn(async () => questCycleRecord()),
    advanceQuestProgress: vi.fn(async () => ({
      advanced: true,
      completedNow: false,
      progress: questProgressRecord()
    })),
    linkQuestProgressReward: vi.fn(async () => questProgressRecord()),
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
      ensureGamificationJobs: vi.fn(async () => ({ readyDuos: 0, producedJobs: 0 })),
      enqueueGamificationJob: vi.fn(async () => true),
      claimDueGamificationJobs: vi.fn(async () => []),
      completeGamificationJob: vi.fn(),
      failGamificationJob: vi.fn(),
      recordProjectionRebuild: vi.fn()
    }
  };
}

function dashboardRecord(
  overrides: Partial<GamificationDashboardRecord> = {}
): GamificationDashboardRecord {
  return {
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
      },
      {
        questSlug: "capitulo-da-semana",
        questType: "weekly",
        cycleKey: "weekly:2026-06-01",
        title: "Capitulo da semana",
        description: "Concluam um capitulo manual sem transformar progresso em tarefa.",
        currentValue: 0,
        goalValue: 1,
        completed: false,
        windowEndAt: new Date("2026-06-08T04:00:00.000Z")
      },
      {
        questSlug: "descoberta-em-dupla",
        questType: "weekly",
        cycleKey: "weekly:2026-06-01",
        title: "Descoberta em dupla",
        description: "Criem um match real ou levem um jogo novo para a fila.",
        currentValue: 0,
        goalValue: 1,
        completed: false,
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
    updatedAt: now,
    ...overrides
  };
}

function currentPlayRecord(): CurrentPlayRecord {
  const principal = activeGame({
    id: "active-principal",
    libraryGameId: "library-principal",
    role: "principal",
    position: 1
  });

  return {
    limit: 3,
    principal,
    secondaries: [],
    games: [principal]
  };
}

function activeGame(overrides: Partial<CurrentPlayGameRecord>): CurrentPlayGameRecord {
  return {
    id: "active-game",
    duoId: "duo-1",
    libraryGameId: "library-game",
    catalogGameId: "catalog-game",
    role: "principal",
    position: 1,
    libraryStatus: "jogando",
    updatedAt: now,
    catalogGame: {
      id: "catalog-game",
      slug: "it-takes-two",
      name: "It Takes Two",
      coverUrl: null,
      source: "rawg",
      sourceUrl: "https://rawg.io/games/it-takes-two",
      sourceUpdatedAt: now,
      syncedAt: now,
      hasReliableTimeEstimate: true,
      hasVerifiedAvailability: false
    },
    progress: {
      confirmedCoopSeconds: 1_800,
      subjectivePercent: 25
    },
    ...overrides
  };
}

function appearsBefore(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function gamificationCssRules(source: string): string {
  return (
    source
      .match(/[^{}]+{[^{}]*}/g)
      ?.filter((rule) => rule.slice(0, rule.indexOf("{")).includes("gamification-"))
      .join("\n") ?? ""
  );
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
