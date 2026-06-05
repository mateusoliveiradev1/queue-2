import { readFileSync } from "node:fs";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authSessionMock = vi.hoisted(() => ({
  currentSession: {
    session: {
      id: "session-current",
      token: "session-token-current",
      userId: "user-1",
      createdAt: new Date("2026-06-03T09:00:00.000Z"),
      updatedAt: new Date("2026-06-03T10:00:00.000Z"),
      expiresAt: new Date("2026-06-17T09:00:00.000Z")
    },
    user: {
      id: "user-1",
      email: "jogador@example.com",
      emailVerified: true,
      name: "Jogador da fila",
      image: null,
      createdAt: new Date("2026-06-03T09:00:00.000Z"),
      updatedAt: new Date("2026-06-03T09:00:00.000Z")
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

const catalogModuleMock = vi.hoisted(() => ({
  searchCatalogGames: vi.fn(),
  getCatalogGameDetail: vi.fn()
}));

const libraryModuleMock = vi.hoisted(() => ({
  getLibraryOverview: vi.fn(),
  getLibraryQueue: vi.fn(),
  getLibraryGameDetail: vi.fn(),
  addGameToWishlist: vi.fn(async () => ({ ok: true, game: {} })),
  moveLibraryGame: vi.fn(async () => ({ ok: true, game: {} })),
  updateMemberPlatforms: vi.fn(async () => ({ ok: true, platforms: ["pc"] }))
}));

vi.mock("../src/platform/auth/session", () => ({
  requireVerifiedSession: vi.fn(async () => authSessionMock.currentSession)
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src
  }: {
    alt: string;
    src: string;
  }) => <img alt={alt} src={src} />
}));

vi.mock("../src/modules/duo", () => ({
  formatPairingDate: vi.fn(() => "03/06/2026"),
  getDuoDashboard: duoModuleMock.getDuoDashboard
}));

vi.mock("../src/modules/catalog", async () => {
  const card = await vi.importActual<
    typeof import("../src/modules/catalog/presentation/catalog-card")
  >("../src/modules/catalog/presentation/catalog-card");
  const source = await vi.importActual<
    typeof import("../src/modules/catalog/presentation/source-metadata")
  >("../src/modules/catalog/presentation/source-metadata");
  const sourceFreshness = await vi.importActual<
    typeof import("../src/modules/catalog/presentation/source-freshness-panel")
  >("../src/modules/catalog/presentation/source-freshness-panel");

  return {
    CatalogCard: card.CatalogCard,
    SourceFreshnessPanel: sourceFreshness.SourceFreshnessPanel,
    SourceMetadata: source.SourceMetadata,
    getCatalogGameDetail: catalogModuleMock.getCatalogGameDetail,
    searchCatalogGames: catalogModuleMock.searchCatalogGames
  };
});

vi.mock("../src/modules/library", async () => {
  const viewModels = await vi.importActual<
    typeof import("../src/modules/library/presentation/view-models")
  >("../src/modules/library/presentation/view-models");
  const statusControls = await vi.importActual<
    typeof import("../src/modules/library/presentation/library-status-controls")
  >("../src/modules/library/presentation/library-status-controls");
  const libraryCard = await vi.importActual<
    typeof import("../src/modules/library/presentation/library-card")
  >("../src/modules/library/presentation/library-card");
  const platformPicker = await vi.importActual<
    typeof import("../src/modules/library/presentation/platform-picker")
  >("../src/modules/library/presentation/platform-picker");
  const policy = await vi.importActual<
    typeof import("../src/modules/library/domain/library-policy")
  >("../src/modules/library/domain/library-policy");
  const platforms = await vi.importActual<
    typeof import("../src/modules/library/domain/platforms")
  >("../src/modules/library/domain/platforms");

  return {
    ...viewModels,
    LibraryQueueCard: libraryCard.LibraryQueueCard,
    LibraryStatusControls: statusControls.LibraryStatusControls,
    PlatformPicker: platformPicker.PlatformPicker,
    addGameToWishlist: libraryModuleMock.addGameToWishlist,
    getLibraryGameDetail: libraryModuleMock.getLibraryGameDetail,
    getLibraryOverview: libraryModuleMock.getLibraryOverview,
    getLibraryQueue: libraryModuleMock.getLibraryQueue,
    isPhase2LibraryStatus: policy.isPhase2LibraryStatus,
    normalizeLibraryLimit: policy.normalizeLibraryLimit,
    normalizeLibraryPage: policy.normalizeLibraryPage,
    normalizeLibrarySort: policy.normalizeLibrarySort,
    normalizeLibraryView: policy.normalizeLibraryView,
    normalizePlatformKey: platforms.normalizePlatformKey,
    moveLibraryGame: libraryModuleMock.moveLibraryGame,
    updateMemberPlatforms: libraryModuleMock.updateMemberPlatforms
  };
});

import DashboardPage from "../src/app/app/page";
import {
  buildLibraryPath,
  parseLibraryRouteParams
} from "../src/app/app/biblioteca/library-route-params";
import LibraryPage from "../src/app/app/biblioteca/page";
import CatalogPage from "../src/app/app/catalogo/page";
import GamePage from "../src/app/app/jogo/[slug]/page";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  duoModuleMock.getDuoDashboard.mockResolvedValue(duoModuleMock.ready);
  catalogModuleMock.searchCatalogGames.mockImplementation(async (input = {}) => {
    if ("limit" in input && input.limit === 1 && !input.includeNonEligible) {
      return [catalogCard()];
    }

    return [
      catalogCard(),
      catalogCard({
        id: "game-2",
        slug: "party-only",
        name: "Party Only",
        mainFlow: {
          eligible: false,
          label: "Fora do fluxo principal"
        }
      })
    ];
  });
  catalogModuleMock.getCatalogGameDetail.mockResolvedValue(catalogDetail());
  libraryModuleMock.getLibraryOverview.mockResolvedValue({
    ok: true,
    overview: libraryOverview()
  });
  libraryModuleMock.getLibraryQueue.mockResolvedValue({
    ok: true,
    queue: libraryQueue()
  });
  libraryModuleMock.getLibraryGameDetail.mockResolvedValue({
    ok: true,
    detail: libraryDetail("wishlist"),
    catalog: catalogDetail()
  });
});

describe("Biblioteca route params", () => {
  it("normalizes invalid URL state into the bounded queue defaults", () => {
    expect(
      parseLibraryRouteParams({
        visao: "desconhecida",
        q: "  Portal  ",
        plataforma: "PS5",
        ordenar: "raridade",
        pagina: "0",
        tamanho: "99"
      })
    ).toEqual({
      view: "todas",
      query: "Portal",
      commonPlatformOnly: false,
      platform: "playstation",
      sort: "recentes",
      page: 1,
      limit: 24,
      offset: 0
    });
  });

  it("preserves filters through pagination and resets page when filters change", () => {
    const params = parseLibraryRouteParams({
      visao: "wishlist",
      q: "take",
      plataforma: "comum",
      ordenar: "match",
      pagina: "3",
      tamanho: "24"
    });

    expect(buildLibraryPath(params, { page: 4 })).toBe(
      "/app/biblioteca?visao=wishlist&q=take&plataforma=comum&ordenar=match&tamanho=24&pagina=4"
    );
    expect(buildLibraryPath(params, { query: "overcooked" })).toBe(
      "/app/biblioteca?visao=wishlist&q=overcooked&plataforma=comum&ordenar=match&tamanho=24"
    );
    expect(buildLibraryPath(params, { view: "jogando" })).toBe(
      "/app/biblioteca?visao=jogando&q=take&plataforma=comum&ordenar=match&tamanho=24"
    );
  });
});

describe("Phase 2 authenticated catalog and library UI", () => {
  it("keeps the Biblioteca route on the bounded queue contract", () => {
    const source = readFileSync(
      "src/app/app/biblioteca/page.tsx",
      "utf8"
    );
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(source).toContain("library-operational-shell");
    expect(source).toContain("getLibraryQueue");
    expect(source).toContain("LibraryQueueCard");
    expect(source).not.toContain("getLibraryOverview");
    expect(source).not.toContain("function LibraryGameCard");
    expect(source).not.toContain("library-board");
    expect(source).not.toContain("locked-status");
    expect(source).not.toContain("Zerado bloqueado");
    expect(source).not.toContain("Dropado bloqueado");
    expect(css).toContain(".library-operational-shell");
    expect(css).toContain(".library-priority-strip");
    expect(css).toContain(".library-playing-strip");
    expect(css).toContain(".library-results");
    expect(css).toContain(".library-pagination");
    expect(css).not.toContain(".library-board");

    for (const futureOnlyWord of [
      "Principal",
      "secundario",
      "sessao",
      "timer",
      "capitulo",
      "porcentagem",
      "milestone"
    ]) {
      expect(source).not.toContain(futureOnlyWord);
    }
  });

  it("renders dashboard navigation and real library entry points", async () => {
    render(await DashboardPage());
    const navigation = within(
      screen.getByRole("navigation", { name: /area autenticada queue dois/i })
    );

    expect(navigation.getByRole("link", { name: /catalogo/i })).toHaveAttribute(
      "href",
      "/app/catalogo"
    );
    expect(navigation.getByRole("link", { name: /biblioteca/i })).toHaveAttribute(
      "href",
      "/app/biblioteca"
    );
    expect(screen.getByRole("heading", { name: /a fila ja tem dono/i })).toBeInTheDocument();
    expect(screen.getByText(/1 na Wishlist/i)).toBeInTheDocument();
  });

  it("renders suggested catalog card, search and RAWG attribution", async () => {
    const { container } = render(
      await CatalogPage({
        searchParams: Promise.resolve({ q: "take" })
      })
    );

    expect(screen.getByRole("heading", { name: /garimpar coops com prova/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /buscar no catalogo/i })).toHaveValue("take");
    expect(screen.getAllByRole("link", { name: /dados e imagens: rawg/i }).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/coop campanha 2p confirmado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/fora do fluxo principal/i).length).toBeGreaterThan(0);
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders the operational Biblioteca queue without dead archive controls", async () => {
    const { container } = render(await LibraryPage());

    expect(screen.getByRole("heading", { name: /a fila operacional/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /proximos da fila/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^jogando$/i })).toBeInTheDocument();
    expect(screen.getByText(/ate 3 ativos/i)).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /buscar jogo na fila/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /ordenar/i })).toHaveValue("recentes");
    expect(screen.getByLabelText("PC")).toBeChecked();
    expect(screen.getAllByText(/em comum/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("PC").length).toBeGreaterThan(1);
    expect(
      screen
        .getAllByRole("link", { name: /it takes two/i })
        .some((link) => link.getAttribute("href") === "/app/jogo/it-takes-two")
    ).toBe(true);
    expect(screen.getAllByRole("link", { name: /capa de it takes two/i })[0]).toHaveAttribute(
      "href",
      "/app/jogo/it-takes-two"
    );
    expect(screen.queryByRole("button", { name: /zerado bloqueado/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dropado bloqueado/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/coop campanha 2p confirmado/i).length).toBeGreaterThan(0);
    expect(
      container.textContent?.indexOf("Proximos da fila") ?? -1
    ).toBeLessThan(container.textContent?.indexOf("Toda a fila ativa") ?? -1);
    expect(libraryModuleMock.getLibraryQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        view: "todas",
        sort: "recentes",
        limit: 12,
        offset: 0
      })
    );
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders game detail with source facts and no active future play controls", async () => {
    const { container } = render(
      await GamePage({
        params: Promise.resolve({ slug: "it-takes-two" })
      })
    );
    const sourcePanel = screen.getByRole("region", { name: /fontes e frescor/i });

    expect(screen.getByRole("heading", { name: /it takes two/i })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /dados e imagens: rawg/i })
        .some((link) => link.getAttribute("href") === "https://rawg.io/games/it-takes-two")
    ).toBe(true);
    expect(screen.getByText(/cerca de 14 horas/i)).toBeInTheDocument();
    expect(screen.getAllByText(/curadoria queue\/2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sem fonte ativa para exibir/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /fontes e frescor/i })).toBeInTheDocument();
    expect(within(sourcePanel).getByText(/descricao revisada: queue\/2/i)).toBeInTheDocument();
    expect(within(sourcePanel).queryByRole("link", { name: /descricao revisada: queue\/2/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".source-freshness-row")).toHaveLength(4);
    expect(container.querySelector(".source-freshness-row[data-freshness='missing']")).toHaveTextContent(
      /disponibilidade/i
    );
    expect(container.querySelectorAll("time[datetime]")).toHaveLength(3);
    expect(container.querySelector("time[datetime='2026-06-03T12:00:00.000Z']")).toHaveAttribute(
      "title",
      "03 de junho de 2026"
    );
    expect(screen.getByText(/descricao em portugues/i)).toBeInTheDocument();
    expect(screen.getByText(/jornada da dupla/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar checkpoint/i })).not.toBeInTheDocument();
  });

  it("renders an explicit missing localization state without English fallback", async () => {
    const sourceBreakdown = catalogDetail().sourceBreakdown.map((row) =>
      row.id === "description"
        ? {
            ...row,
            sourceLabel: "Descricao em portugues ainda nao revisada.",
            statusLabel: "Sem descricao revisada publicada",
            freshnessTone: "missing" as const,
            dateTime: null,
            absoluteDateLabel: null
          }
        : row
    );
    catalogModuleMock.getCatalogGameDetail.mockResolvedValue(
      catalogDetail({
        description: "Descricao em portugues ainda nao revisada.",
        descriptionSourceLabel: "Sem descricao revisada publicada",
        sourceBreakdown
      })
    );

    const { container } = render(
      await GamePage({
        params: Promise.resolve({ slug: "it-takes-two" })
      })
    );

    expect(screen.getAllByText(/descricao em portugues ainda nao revisada/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sem descricao revisada publicada/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/bring your favorite co-op partner/i)).not.toBeInTheDocument();
    expect(container.querySelector(".source-freshness-row[data-freshness='missing']")).toHaveTextContent(
      /descricao em portugues/i
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

function catalogCard(overrides = {}) {
  return {
    id: "game-1",
    slug: "it-takes-two",
    name: "It Takes Two",
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
    mainFlow: {
      eligible: true,
      label: "Coop campanha 2p confirmado"
    },
    timeEstimateLabel: "Cerca de 14 horas",
    availabilityLabel: "Nao verificado",
    ...overrides
  };
}

function catalogDetail(overrides = {}) {
  return {
    ...catalogCard(),
    description: "Uma aventura coop sobre reconciliacao.",
    descriptionSourceLabel: "Descricao revisada: QUEUE/2",
    sourceBreakdown: [
      {
        id: "rawg" as const,
        category: "Dados e imagens",
        sourceLabel: "Dados e imagens: RAWG",
        sourceHref: "https://rawg.io/games/it-takes-two",
        statusLabel: "Atualizado hoje",
        freshnessTone: "fresh" as const,
        dateTime: "2026-06-03T12:00:00.000Z",
        absoluteDateLabel: "03 de junho de 2026"
      },
      {
        id: "description" as const,
        category: "Descricao em portugues",
        sourceLabel: "Descricao revisada: QUEUE/2",
        sourceHref: null,
        statusLabel: "Atualizado hoje",
        freshnessTone: "fresh" as const,
        dateTime: "2026-06-03T12:00:00.000Z",
        absoluteDateLabel: "03 de junho de 2026"
      },
      {
        id: "time-estimate" as const,
        category: "Tempo estimado",
        sourceLabel: "Curadoria QUEUE/2",
        sourceHref: null,
        statusLabel: "Atualizado hoje",
        freshnessTone: "fresh" as const,
        dateTime: "2026-06-03T12:00:00.000Z",
        absoluteDateLabel: "03 de junho de 2026"
      },
      {
        id: "availability" as const,
        category: "Disponibilidade",
        sourceLabel: "Nao verificado",
        sourceHref: null,
        statusLabel: "Sem fonte ativa para exibir",
        freshnessTone: "missing" as const,
        dateTime: null,
        absoluteDateLabel: null
      }
    ],
    rawgUrl: "https://rawg.io/games/it-takes-two",
    coopLabel: "Confirmado para campanha ou historia coop em dupla.",
    timeEstimate: {
      kind: "available" as const,
      label: "Cerca de 14 horas",
      sourceLabel: "Curadoria QUEUE/2",
      sourceHref: null,
      freshnessLabel: "Atualizado hoje"
    },
    availability: {
      kind: "missing" as const,
      label: "Nao verificado"
    },
    detailReadiness: {
      hasCoreDetails: true,
      missingLabels: []
    },
    ...overrides
  };
}

function libraryOverview() {
  return {
    memberPlatforms: [
      {
        userId: "user-1",
        platforms: ["pc", "switch"]
      },
      {
        userId: "user-2",
        platforms: ["pc", "xbox"]
      }
    ],
    commonPlatforms: ["pc"],
    groups: {
      wishlist: [libraryDetail("wishlist")],
      jogando: [],
      pausado: []
    },
    lockedStatuses: ["zerado", "dropado"]
  };
}

function libraryQueue() {
  return {
    memberPlatforms: [
      {
        userId: "user-1",
        platforms: ["pc", "switch"]
      },
      {
        userId: "user-2",
        platforms: ["pc", "xbox"]
      }
    ],
    commonPlatforms: ["pc"],
    statusCounts: {
      wishlist: 1,
      jogando: 1,
      pausado: 1
    },
    archiveCount: 1,
    nextQueue: [libraryDetail("wishlist")],
    playing: [libraryDetail("jogando")],
    page: {
      items: [libraryDetail("wishlist"), libraryDetail("pausado")],
      total: 2,
      limit: 12 as const,
      offset: 0,
      hasNextPage: false,
      hasPreviousPage: false
    }
  };
}

function libraryDetail(status: "wishlist" | "jogando" | "pausado") {
  return {
    libraryGame: {
      id: `library-${status}`,
      duoId: "duo-1",
      catalogGameId: "game-1",
      status,
      addedByUserId: "user-1",
      statusUpdatedByUserId: "user-1",
      createdAt: new Date("2026-06-03T12:00:00.000Z"),
      updatedAt: new Date("2026-06-03T12:00:00.000Z")
    },
    catalogGame: {
      id: "game-1",
      slug: "it-takes-two",
      name: "It Takes Two",
      coverUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
      platforms: ["pc", "xbox"],
      mainFlowEligible: true,
      coopCampaignConfirmed: true,
      hasReliableTimeEstimate: true,
      hasVerifiedAvailability: false
    },
    memberPlatforms: [
      {
        userId: "user-1",
        platforms: ["pc", "switch"]
      },
      {
        userId: "user-2",
        platforms: ["pc", "xbox"]
      }
    ],
    matchScore: {
      label: "Forte" as const,
      recommendedForMainFlow: true,
      commonPlatforms: ["pc"],
      factors: [
        "coop campanha 2p confirmado",
        "plataforma em comum: PC",
        "tempo estimado com fonte",
        "disponibilidade nao verificada"
      ]
    }
  };
}
