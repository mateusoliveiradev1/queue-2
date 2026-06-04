import { readFileSync } from "node:fs";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authSessionMock = vi.hoisted(() => ({
  currentSession: {
    session: {
      id: "session-current",
      token: "session-token-current",
      userId: "user-1",
      createdAt: new Date("2026-06-04T09:00:00.000Z"),
      updatedAt: new Date("2026-06-04T10:00:00.000Z"),
      expiresAt: new Date("2026-06-18T09:00:00.000Z")
    },
    user: {
      id: "user-1",
      email: "jogador@example.com",
      emailVerified: true,
      name: "Jogador da fila",
      image: null,
      createdAt: new Date("2026-06-04T09:00:00.000Z"),
      updatedAt: new Date("2026-06-04T09:00:00.000Z")
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

const discoveryModuleMock = vi.hoisted(() => ({
  getDiscoveryDeck: vi.fn(),
  getMatchHistory: vi.fn(),
  getLiveSession: vi.fn()
}));

const libraryModuleMock = vi.hoisted(() => ({
  getLibraryOverview: vi.fn(),
  toLibraryOverviewView: vi.fn()
}));

vi.mock("../src/platform/auth/session", () => ({
  requireVerifiedSession: vi.fn(async () => authSessionMock.currentSession)
}));

vi.mock("../src/modules/duo", () => ({
  formatPairingDate: vi.fn(() => "03/06/2026"),
  getDuoDashboard: duoModuleMock.getDuoDashboard
}));

vi.mock("../src/app/app/descobrir/actions", () => ({
  answerMoodQuizAction: vi.fn(async () => undefined),
  getSurpriseRecommendationAction: vi.fn(async () => undefined),
  handoffDiscoveryMatchToLibraryAction: vi.fn(async () => undefined),
  recordDiscoveryDecisionAction: vi.fn(async () => undefined),
  startDiscoveryLiveSessionAction: vi.fn(async () => undefined)
}));

vi.mock("../src/modules/discovery", async () => {
  const actual = await vi.importActual<typeof import("../src/modules/discovery")>(
    "../src/modules/discovery"
  );

  return {
    ...actual,
    getDiscoveryDeck: discoveryModuleMock.getDiscoveryDeck,
    getLiveSession: discoveryModuleMock.getLiveSession,
    getMatchHistory: discoveryModuleMock.getMatchHistory
  };
});

vi.mock("../src/modules/library", () => ({
  getLibraryOverview: libraryModuleMock.getLibraryOverview,
  LibraryStatusControls: ({
    action,
    catalogGameId,
    currentStatus,
    returnTo
  }: {
    action: (formData: FormData) => Promise<void>;
    catalogGameId: string;
    currentStatus: string;
    returnTo?: string;
  }) => (
    <div className="status-controls" aria-label="Mudar status na biblioteca">
      {(["wishlist", "jogando", "pausado"] as const).map((status) => (
        <form action={action} key={status}>
          <input name="catalogGameId" type="hidden" value={catalogGameId} />
          <input name="status" type="hidden" value={status} />
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <button aria-pressed={currentStatus === status} type="submit">
            {status === "wishlist" ? "Wishlist" : status === "jogando" ? "Jogando" : "Pausado"}
          </button>
        </form>
      ))}
      <button disabled type="button">
        Zerado bloqueado
      </button>
      <button disabled type="button">
        Dropado bloqueado
      </button>
    </div>
  ),
  toLibraryOverviewView: libraryModuleMock.toLibraryOverviewView
}));

import DashboardPage from "../src/app/app/page";
import DiscoveryPage from "../src/app/app/descobrir/page";
import { LiveSessionRefresh } from "../src/modules/discovery/presentation/live-session-refresh";

const DISCOVERY_CARD_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_DISCOVERY_CARD_ID = "00000000-0000-4000-8000-000000000002";
const LIVE_SESSION_ID = "00000000-0000-4000-8000-000000000003";
const LIVE_MATCH_ID = "00000000-0000-4000-8000-000000000004";

const liveRouteSource = readFileSync(
  "src/app/api/discovery/live/[sessionId]/route.ts",
  "utf8"
);
const liveRefreshSource = readFileSync(
  "src/modules/discovery/presentation/live-session-refresh.tsx",
  "utf8"
);

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  duoModuleMock.getDuoDashboard.mockResolvedValue(duoModuleMock.ready);
  discoveryModuleMock.getDiscoveryDeck.mockResolvedValue({
    cards: [discoveryCard()],
    recommendations: []
  });
  discoveryModuleMock.getMatchHistory.mockResolvedValue([
    {
      match: {
        id: "match-1",
        duoId: "duo-1",
        userId: "user-1",
        catalogGameId: DISCOVERY_CARD_ID,
        matchedAt: new Date("2026-06-04T09:30:00.000Z"),
        createdFrom: "deck",
        firstUserId: "user-1",
        secondUserId: "user-2",
        reasonSnapshot: ["PC em comum"],
        libraryHandoffStatus: null
      },
      slug: "it-takes-two",
      title: "It Takes Two",
      coverUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
      libraryStatus: null,
      reasons: ["PC em comum"]
    },
    {
      match: {
        id: "match-2",
        duoId: "duo-1",
        catalogGameId: SECOND_DISCOVERY_CARD_ID,
        matchedAt: new Date("2026-06-03T09:30:00.000Z"),
        createdFrom: "deck",
        firstUserId: "user-1",
        secondUserId: "user-2",
        reasonSnapshot: ["Game Pass verificado"],
        libraryHandoffStatus: "jogando"
      },
      slug: "portal-2",
      title: "Portal 2",
      coverUrl: "https://media.rawg.io/media/games/portal-2.jpg",
      libraryStatus: "jogando",
      reasons: ["Game Pass verificado"]
    }
  ]);
  discoveryModuleMock.getLiveSession.mockResolvedValue({
    ok: true,
    session: {
      id: LIVE_SESSION_ID,
      duoId: "duo-1",
      startedByUserId: "user-1",
      status: "active",
      startedAt: new Date("2026-06-04T09:00:00.000Z"),
      expiresAt: new Date("2026-06-04T09:20:00.000Z"),
      endedAt: null
    },
    matches: [],
    expiresInSeconds: 600
  });
  libraryModuleMock.getLibraryOverview.mockResolvedValue({
    ok: true,
    overview: {}
  });
  libraryModuleMock.toLibraryOverviewView.mockReturnValue({
    counts: {
      wishlist: 1,
      jogando: 0,
      pausado: 0
    },
    commonPlatformLabels: ["PC"]
  });
});

describe("Phase 3 Discovery route shell", () => {
  it("adds Descobrir to authenticated navigation and dashboard entry points", async () => {
    render(await DashboardPage());
    const navigation = within(
      screen.getByRole("navigation", { name: /area autenticada queue dois/i })
    );

    expect(navigation.getByRole("link", { name: /descobrir/i })).toHaveAttribute(
      "href",
      "/app/descobrir"
    );
    expect(screen.getByRole("link", { name: /abrir descobrir/i })).toHaveAttribute(
      "href",
      "/app/descobrir"
    );
    expect(screen.getByText(/roleta e sessoes entram depois/i)).toBeInTheDocument();
  });

  it("renders the server Discovery shell from public discovery APIs", async () => {
    const { container } = render(
      await DiscoveryPage({
        searchParams: Promise.resolve({
          estado: "match-criado",
          live: LIVE_SESSION_ID
        })
      })
    );

    expect(screen.getByRole("heading", { name: /os dois quiseram\?/i })).toBeInTheDocument();
    const desktopNav = within(
      screen.getByRole("navigation", { name: /area autenticada queue dois/i })
    );
    const mobileNav = within(
      screen.getByRole("navigation", { name: /navegacao principal mobile/i })
    );
    expect(desktopNav.getByRole("link", { name: /descobrir/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(mobileNav.getByRole("link", { name: /descobrir/i })).toHaveAttribute(
      "href",
      "/app/descobrir"
    );
    expect(mobileNav.getByRole("link", { name: /descobrir/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(container.querySelector(".discovery-stage")).not.toBeNull();
    expect(container.querySelector(".discovery-card-stage")).not.toBeNull();
    expect(container.querySelector(".discovery-orbit-controls")).not.toBeNull();
    expect(container.querySelector(".discovery-route-grid")).toBeNull();
    expect(container.querySelector(".discovery-side-rail")).toBeNull();
    expect(container.querySelector(".discovery-mode-actions")).toBeNull();
    expect(screen.queryByRole("navigation", { name: /modos de descoberta/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /modos de descoberta/i })).not.toBeInTheDocument();
    const orbitControls = within(
      screen.getByRole("group", { name: /controles orbitais de descoberta/i })
    );
    expect(orbitControls.getByRole("button", { name: "Live" })).toBeInTheDocument();
    expect(orbitControls.getByRole("button", { name: "Surpresa" })).toBeInTheDocument();
    expect(orbitControls.getByRole("link", { name: "Quiz" })).toHaveAttribute("href", "#mood-quiz");
    expect(orbitControls.getByRole("link", { name: "Busca" })).toHaveAttribute("href", "#discovery-search");
    expect(orbitControls.getByRole("link", { name: "Filtros" })).toHaveAttribute(
      "href",
      "#discovery-filters-panel"
    );
    expect(screen.getByRole("radio", { name: /plataforma comum/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /explorar fora/i })).not.toBeChecked();
    expect(screen.getByText("Mais filtros")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /buscar jogo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar match live/i })).toBeInTheDocument();
    expect(screen.getByText(/atualizando a live/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar mood/i })).toBeInTheDocument();
    expect(screen.getAllByText(/qual energia voces tem/i)).toHaveLength(1);
    expect(screen.getAllByText(/qual tamanho de compromisso/i)).toHaveLength(1);
    expect(screen.getAllByText(/que clima voces querem/i)).toHaveLength(1);
    expect(screen.getByText(/match da dupla criado/i)).toBeInTheDocument();
    const deckGroup = screen.getByRole("group", { name: /deck de descoberta/i });
    expect(deckGroup).toBeInTheDocument();
    expect(appearsBefore(deckGroup, screen.getByText("Mais filtros"))).toBe(true);
    expect(
      appearsBefore(deckGroup, screen.getByRole("combobox", { name: /buscar jogo/i }))
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Quero jogar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agora nao" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pular" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "It Takes Two" })).toHaveTextContent(
      /primeiro o match/i
    );
    expect(screen.getAllByRole("heading", { name: /it takes two/i }).length).toBeGreaterThan(1);
    expect(
      screen
        .getAllByRole("link", { name: /it takes two/i })
        .some((link) => link.getAttribute("href") === "/app/jogo/it-takes-two")
    ).toBe(true);
    expect(discoveryModuleMock.getDiscoveryDeck).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        filters: expect.objectContaining({ commonPlatformOnly: true }),
        limit: 6,
        preferredCatalogGameId: undefined
      })
    );
    expect(discoveryModuleMock.getMatchHistory).toHaveBeenCalledWith({
      userId: "user-1",
      limit: 6
    });
    expect(discoveryModuleMock.getLiveSession).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: LIVE_SESSION_ID
    });
    expect(screen.getByRole("heading", { name: /portal 2/i })).toBeInTheDocument();
    expect(screen.getByText(/status atual: jogando/i)).toBeInTheDocument();
    expect(screen.queryByText(/reviews/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/replay/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /zerado bloqueado/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /dropado bloqueado/i }).length).toBeGreaterThan(0);
    expectEveryVisibleFormControlHasName(container);
  });

  it("uses a valid surprise id to request and render the highlighted discovery card", async () => {
    render(
      await DiscoveryPage({
        searchParams: Promise.resolve({
          estado: "surpresa-pronta",
          surpresa: DISCOVERY_CARD_ID
        })
      })
    );

    expect(discoveryModuleMock.getDiscoveryDeck).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredCatalogGameId: DISCOVERY_CARD_ID
      })
    );
    expect(screen.getByText(/surpresa pronta/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /deck de descoberta/i })).toBeInTheDocument();
  });

  it("keeps live polling bounded, private and announced in-app", () => {
    expect(liveRouteSource).toContain("requireVerifiedSession()");
    expect(liveRouteSource).toContain("z.string().uuid()");
    expect(liveRouteSource).toContain("getLiveSession");
    expect(liveRouteSource).toContain('"Cache-Control": "no-store"');
    expect(liveRefreshSource).toContain("/api/discovery/live/");
    expect(liveRefreshSource).toContain("window.setInterval");
    expect(liveRefreshSource).toContain("window.clearInterval");
    expect(liveRefreshSource).toContain("expiresInSeconds > 0");
    expect(liveRefreshSource).toContain('aria-live="polite"');

    render(
      <LiveSessionRefresh
        initialLiveSession={{
          ok: true,
          session: {
            id: "live-1",
            duoId: "duo-1",
            startedByUserId: "user-1",
            status: "active",
            startedAt: new Date("2026-06-04T09:00:00.000Z"),
            expiresAt: new Date("2026-06-04T09:20:00.000Z"),
            endedAt: null
          },
          matches: [
            {
              match: {
                id: LIVE_MATCH_ID,
                duoId: "duo-1",
                catalogGameId: DISCOVERY_CARD_ID,
                matchedAt: new Date("2026-06-04T09:08:00.000Z"),
                createdFrom: "live",
                firstUserId: "user-1",
                secondUserId: "user-2",
                reasonSnapshot: ["PC em comum"],
                libraryHandoffStatus: null
              },
              slug: "it-takes-two",
              title: "It Takes Two",
              coverUrl: null,
              libraryStatus: null,
              reasons: ["PC em comum"]
            }
          ],
          expiresInSeconds: 600
        }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(/match live detectou/i);
    expect(screen.getByRole("link", { name: /abrir detalhe/i })).toHaveAttribute(
      "href",
      "/app/jogo/it-takes-two"
    );
  });
});

function expectEveryVisibleFormControlHasName(container: HTMLElement) {
  const controls = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input:not([type='hidden']), select, textarea"
    )
  );

  for (const control of controls) {
    expect(control).toHaveAccessibleName();
  }
}

function appearsBefore(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function discoveryCard() {
  return {
    catalogGameId: DISCOVERY_CARD_ID,
    slug: "it-takes-two",
    title: "It Takes Two",
    coverUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
    releaseLabel: "26 de mar. de 2021",
    platformLabels: ["PC", "PlayStation", "Xbox"],
    genreLabels: ["Aventura", "Puzzle"],
    sourceMeta: {
      attributionLabel: "Dados e imagens: RAWG",
      attributionHref: "https://rawg.io/games/it-takes-two",
      freshnessLabel: "Atualizado hoje",
      freshnessTone: "fresh" as const
    },
    timeEstimateLabel: "Cerca de 14 horas",
    availabilityLabel: "Nao verificado",
    reasons: ["PC em comum", "campanha 2p"],
    libraryStatus: null,
    libraryActionState: "can-add" as const,
    allowedLibraryActions: ["wishlist", "jogando", "pausado"]
  };
}
