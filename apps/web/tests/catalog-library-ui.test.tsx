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

  return {
    CatalogCard: card.CatalogCard,
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
  const platformPicker = await vi.importActual<
    typeof import("../src/modules/library/presentation/platform-picker")
  >("../src/modules/library/presentation/platform-picker");
  const policy = await vi.importActual<
    typeof import("../src/modules/library/domain/library-policy")
  >("../src/modules/library/domain/library-policy");

  return {
    ...viewModels,
    LibraryStatusControls: statusControls.LibraryStatusControls,
    PlatformPicker: platformPicker.PlatformPicker,
    addGameToWishlist: libraryModuleMock.addGameToWishlist,
    getLibraryGameDetail: libraryModuleMock.getLibraryGameDetail,
    getLibraryOverview: libraryModuleMock.getLibraryOverview,
    isPhase2LibraryStatus: policy.isPhase2LibraryStatus,
    moveLibraryGame: libraryModuleMock.moveLibraryGame,
    updateMemberPlatforms: libraryModuleMock.updateMemberPlatforms
  };
});

import DashboardPage from "../src/app/app/page";
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
  libraryModuleMock.getLibraryGameDetail.mockResolvedValue({
    ok: true,
    detail: libraryDetail("wishlist"),
    catalog: catalogDetail()
  });
});

describe("Phase 2 authenticated catalog and library UI", () => {
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
    expect(screen.getByRole("heading", { name: /a fila ja pode crescer/i })).toBeInTheDocument();
    expect(screen.getByText(/1 na Wishlist/i)).toBeInTheDocument();
  });

  it("renders suggested catalog card, search and RAWG attribution", async () => {
    const { container } = render(
      await CatalogPage({
        searchParams: Promise.resolve({ q: "take" })
      })
    );

    expect(screen.getByRole("heading", { name: /descobrir sem chutar/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /buscar no catalogo/i })).toHaveValue("take");
    expect(screen.getAllByRole("link", { name: /dados e imagens: rawg/i }).length).toBeGreaterThan(1);
    expect(screen.getByText(/coop campanha 2p confirmado/i)).toBeInTheDocument();
    expect(screen.getAllByText(/fora do fluxo principal/i).length).toBeGreaterThan(0);
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders platform editing, common platforms and locked future statuses", async () => {
    const { container } = render(await LibraryPage());

    expect(screen.getByRole("heading", { name: /a fila compartilhada/i })).toBeInTheDocument();
    expect(screen.getByLabelText("PC")).toBeChecked();
    expect(screen.getAllByText(/em comum/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("PC").length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: /zerado na fase 4/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /dropado na fase 4/i })).toBeDisabled();
    expect(screen.getByText(/coop campanha 2p confirmado/i)).toBeInTheDocument();
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders game detail with source facts and no active future play controls", async () => {
    render(
      await GamePage({
        params: Promise.resolve({ slug: "it-takes-two" })
      })
    );

    expect(screen.getByRole("heading", { name: /it takes two/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dados e imagens: rawg/i })).toHaveAttribute(
      "href",
      "https://rawg.io/games/it-takes-two"
    );
    expect(screen.getByText(/cerca de 14 horas/i)).toBeInTheDocument();
    expect(screen.getByText(/curadoria queue\/2/i)).toBeInTheDocument();
    expect(screen.getByText(/sem fonte ativa para exibir/i)).toBeInTheDocument();
    expect(screen.getByText(/jornada da dupla/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar checkpoint/i })).not.toBeInTheDocument();
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

function catalogDetail() {
  return {
    ...catalogCard(),
    description: "Uma aventura coop sobre reconciliacao.",
    descriptionSourceLabel: "Descricao revisada: QUEUE/2",
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
    }
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
