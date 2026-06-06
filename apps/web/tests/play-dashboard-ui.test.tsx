import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CurrentPlayCatalogFacts,
  CurrentPlayGameRecord,
  CurrentPlayRecord
} from "../src/modules/play/application/ports";

const authSessionMock = vi.hoisted(() => ({
  currentSession: {
    session: {
      id: "session-current",
      token: "session-token-current",
      userId: "user-1",
      createdAt: new Date("2026-06-05T09:00:00.000Z"),
      updatedAt: new Date("2026-06-05T10:00:00.000Z"),
      expiresAt: new Date("2026-06-19T09:00:00.000Z")
    },
    user: {
      id: "user-1",
      email: "jogador@example.com",
      emailVerified: true,
      name: "Jogador da fila",
      image: null,
      createdAt: new Date("2026-06-05T09:00:00.000Z"),
      updatedAt: new Date("2026-06-05T09:00:00.000Z")
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
  getGamificationDashboard: vi.fn(async () => null)
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

const navigationMock = vi.hoisted(() => ({
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

vi.mock("../src/platform/auth/session", () => ({
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
  const orderControls = await vi.importActual<
    typeof import("../src/modules/play/presentation/playing-order-controls")
  >("../src/modules/play/presentation/playing-order-controls");
  const viewModels = await vi.importActual<
    typeof import("../src/modules/play/presentation/view-models")
  >("../src/modules/play/presentation/view-models");
  const notifications = await vi.importActual<
    typeof import("../src/modules/play/presentation/notification-center")
  >("../src/modules/play/presentation/notification-center");

  return {
    NotificationCenter: notifications.NotificationCenter,
    PlayingNowDashboard: dashboard.PlayingNowDashboard,
    PlayingOrderControls: orderControls.PlayingOrderControls,
    getCurrentPlay: playModuleMock.getCurrentPlay,
    getDuoNotifications: playModuleMock.getDuoNotifications,
    toPlayingNowView: viewModels.toPlayingNowView
  };
});

vi.mock("../src/modules/gamification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/modules/gamification")>();

  return {
    ...actual,
    getGamificationDashboard: gamificationModuleMock.getGamificationDashboard
  };
});

import DashboardPage from "../src/app/app/page";
import {
  PlayingNowDashboard,
  toPlayingNowView
} from "../src/modules/play";

const pageSource = readFileSync("src/app/app/page.tsx", "utf8");
const dashboardSource = readFileSync(
  "src/modules/play/presentation/playing-now-dashboard.tsx",
  "utf8"
);
const orderControlsSource = readFileSync(
  "src/modules/play/presentation/playing-order-controls.tsx",
  "utf8"
);
const phase4ActionsSource = readFileSync("src/app/app/phase-4-actions.ts", "utf8");
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
      jogando: 3,
      pausado: 1
    },
    commonPlatformLabels: ["PC"],
    groups: {
      wishlist: [],
      jogando: [],
      pausado: [pausedLibraryGame()]
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
});

describe("Phase 04.2 Jogando Agora dashboard", () => {
  it("opens /app with Jogando Agora before status metrics", async () => {
    const { container } = render(await DashboardPage());
    const playingNow = container.querySelector(".playing-now");
    const metricGrid = container.querySelector(".metric-grid");

    expect(screen.getByRole("heading", { name: /jogando agora/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /a fila e nossa/i })).toBeInTheDocument();
    expect(screen.getAllByText("3/3 em Jogando").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: /it takes two/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir jornada/i })).toHaveAttribute(
      "href",
      "/app/jogo/it-takes-two"
    );
    expect(screen.getByRole("link", { name: /iniciar sessao/i })).toHaveAttribute(
      "href",
      "/app/jogo/it-takes-two?acao=sessao-live"
    );
    expect(screen.getByRole("link", { name: /jogamos hoje/i })).toHaveAttribute(
      "href",
      "/app/jogo/it-takes-two?acao=jogamos-hoje"
    );
    expect(screen.getByRole("heading", { name: /portal 2/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /overcooked 2/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /na reserva da dupla/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /unravel two/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retomar/i })).toBeInTheDocument();
    expect(screen.getByText(/1 na wishlist, 3 em jogando, 1 pausado/i)).toBeInTheDocument();
    expect(playingNow).not.toBeNull();
    expect(metricGrid).not.toBeNull();
    expect(appearsBefore(playingNow as Element, metricGrid as Element)).toBe(true);
    expect(playModuleMock.getCurrentPlay).toHaveBeenCalledWith("user-1");
  });

  it("renders promotion and explicit organization controls with stable ordered payloads", () => {
    const promoteAction = vi.fn(async () => ({ ok: true as const, state: "principal-promovido" }));
    const reorderAction = vi.fn(async () => ({ ok: true as const, state: "ordem-atualizada" }));
    const { container } = render(
      <PlayingNowDashboard
        promoteAction={promoteAction}
        reorderAction={reorderAction}
        view={toPlayingNowView(currentPlayRecord())}
      />
    );

    expect(screen.getByRole("button", { name: /promover portal 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /promover overcooked 2/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /organizar/i }));

    expect(screen.getByRole("button", { name: /arrastar portal 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subir portal 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descer it takes two/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar ordem/i })).toBeInTheDocument();
    expect(orderedLibraryIds(container)).toEqual([
      "library-principal",
      "library-secondary-a",
      "library-secondary-b"
    ]);

    fireEvent.click(screen.getByRole("button", { name: /subir portal 2/i }));

    expect(orderedLibraryIds(container)).toEqual([
      "library-secondary-a",
      "library-principal",
      "library-secondary-b"
    ]);
    expect(screen.getAllByDisplayValue("portal-2").length).toBeGreaterThan(0);
  });

  it("keeps the empty active state actionable without fake play data", () => {
    render(
      <PlayingNowDashboard
        promoteAction={vi.fn()}
        reorderAction={vi.fn()}
        view={toPlayingNowView({
          games: [],
          principal: null,
          secondaries: [],
          limit: 3
        })}
      />
    );

    expect(screen.getByRole("heading", { name: /nenhum principal definido/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir biblioteca/i })).toHaveAttribute(
      "href",
      "/app/biblioteca"
    );
    expect(screen.getByRole("link", { name: /descobrir matches/i })).toHaveAttribute(
      "href",
      "/app/descobrir"
    );
    expect(screen.queryByRole("button", { name: /organizar/i })).not.toBeInTheDocument();
  });

  it("keeps dashboard, actions and CSS on the Phase 04.2 contract", () => {
    expect(pageSource).toContain("getCurrentPlay");
    expect(pageSource).toContain("PlayingNowDashboard");
    expect(pageSource).toContain("toPlayingNowView");
    expect(pageSource).not.toContain("Roleta e sessoes entram depois");
    expect(dashboardSource).toContain("Jogando Agora");
    expect(dashboardSource).toContain("playing-principal-backdrop");
    expect(dashboardSource).toContain("playing-paused-panel");
    expect(dashboardSource).toContain("Jogamos Hoje");
    expect(orderControlsSource).toContain("DndContext");
    expect(orderControlsSource).toContain("SortableContext");
    expect(orderControlsSource).toContain("KeyboardSensor");
    expect(orderControlsSource).toContain("arrayMove");
    expect(orderControlsSource).toContain('name="libraryGameId"');
    expect(orderControlsSource).toContain("Subir");
    expect(orderControlsSource).toContain("Descer");
    expect(phase4ActionsSource).toContain("requireAuthoritativeVerifiedSession");
    expect(phase4ActionsSource).toMatch(/measureStage\(\s*"validation"/);
    expect(phase4ActionsSource).toMatch(/measureStage\(\s*"database"/);
    expect(phase4ActionsSource).toContain('revalidatePath("/app")');
    expect(phase4ActionsSource).toContain('revalidatePath("/app/biblioteca")');
    expect(globalCssSource).toContain(".playing-now");
    expect(globalCssSource).toContain(".playing-principal");
    expect(globalCssSource).toContain(".playing-order-row");
    expect(globalCssSource).toContain("prefers-reduced-motion: reduce");
    expect(playingCssRules(globalCssSource)).not.toMatch(/font-size:\s*clamp\(/);
    expect(playingCssRules(globalCssSource)).not.toMatch(/letter-spacing:\s*-/);
  });
});

function orderedLibraryIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>("input[name='libraryGameId']"))
    .map((input) => input.value);
}

function pausedLibraryGame() {
  return {
    id: "library-paused",
    catalogGameId: "catalog-paused",
    slug: "unravel-two",
    name: "Unravel Two",
    coverUrl: "https://media.rawg.io/media/games/unravel-two.jpg",
    status: "Pausado",
    platformLabels: ["PC"],
    commonPlatformLabels: ["PC"],
    match: {
      label: "Forte",
      factors: ["coop campanha 2p confirmado"],
      recommendedForMainFlow: true
    },
    duoJourney: "Pausado sem culpa; a dupla pode retomar quando fizer sentido."
  };
}

function appearsBefore(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function playingCssRules(source: string): string {
  return (
    source
      .match(/[^{}]+{[^{}]*}/g)
      ?.filter((rule) => rule.slice(0, rule.indexOf("{")).includes("playing-"))
      .join("\n") ?? ""
  );
}

function currentPlayRecord(): CurrentPlayRecord {
  const principal = activeGame({
    id: "active-principal",
    libraryGameId: "library-principal",
    role: "principal",
    position: 1,
    catalogGame: catalogGame({
      id: "catalog-principal",
      slug: "it-takes-two",
      name: "It Takes Two",
      coverUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
      hasReliableTimeEstimate: true
    }),
    progress: {
      confirmedCoopSeconds: 5_400,
      subjectivePercent: 35
    }
  });
  const secondaryA = activeGame({
    id: "active-secondary-a",
    libraryGameId: "library-secondary-a",
    role: "secondary",
    position: 2,
    catalogGame: catalogGame({
      id: "catalog-secondary-a",
      slug: "portal-2",
      name: "Portal 2",
      coverUrl: "https://media.rawg.io/media/games/portal-2.jpg"
    })
  });
  const secondaryB = activeGame({
    id: "active-secondary-b",
    libraryGameId: "library-secondary-b",
    role: "secondary",
    position: 3,
    catalogGame: catalogGame({
      id: "catalog-secondary-b",
      slug: "overcooked-2",
      name: "Overcooked 2",
      coverUrl: null
    })
  });

  return {
    limit: 3,
    principal,
    secondaries: [secondaryA, secondaryB],
    games: [principal, secondaryA, secondaryB]
  };
}

function activeGame(overrides: Partial<CurrentPlayGameRecord>): CurrentPlayGameRecord {
  const catalog = overrides.catalogGame ?? catalogGame();

  return {
    id: "active-game",
    duoId: "duo-1",
    libraryGameId: "library-game",
    catalogGameId: catalog.id,
    role: "secondary",
    position: 2,
    libraryStatus: "jogando",
    updatedAt: new Date("2026-06-05T09:00:00.000Z"),
    catalogGame: catalog,
    progress: {
      confirmedCoopSeconds: 0,
      subjectivePercent: null
    },
    ...overrides
  };
}

function catalogGame(
  overrides: Partial<CurrentPlayCatalogFacts> = {}
): CurrentPlayCatalogFacts {
  return {
    id: "catalog-game",
    slug: "it-takes-two",
    name: "It Takes Two",
    coverUrl: null,
    source: "rawg",
    sourceUrl: "https://rawg.io/games/it-takes-two",
    sourceUpdatedAt: new Date("2026-06-05T09:00:00.000Z"),
    syncedAt: new Date("2026-06-05T09:00:00.000Z"),
    hasReliableTimeEstimate: false,
    hasVerifiedAvailability: false,
    ...overrides
  };
}
