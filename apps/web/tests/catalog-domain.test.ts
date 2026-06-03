import { describe, expect, it } from "vitest";

import {
  getCatalogGameDetailUseCase
} from "../src/modules/catalog/application/get-catalog-game";
import {
  searchCatalogGamesUseCase
} from "../src/modules/catalog/application/search-catalog";
import type {
  CatalogGameDetailRecord,
  CatalogRepository
} from "../src/modules/catalog/application/ports";
import {
  evaluateMainFlowEligibility,
  getAvailabilityState,
  getEstimatedTimeState,
  getFreshnessState,
  getSourceAttribution
} from "../src/modules/catalog/domain/catalog-policy";

const now = new Date("2026-06-03T12:00:00.000Z");

describe("catalog policy", () => {
  it("excludes games without confirmed two-player campaign coop from the main flow", () => {
    expect(evaluateMainFlowEligibility(catalogGame({ mainFlowEligible: false }))).toEqual({
      eligible: false,
      reason: "not-marked-main-flow"
    });
    expect(
      evaluateMainFlowEligibility(
        catalogGame({
          mainFlowEligible: true,
          coopCampaignConfirmed: false
        })
      )
    ).toEqual({
      eligible: false,
      reason: "coop-not-confirmed"
    });
    expect(evaluateMainFlowEligibility(catalogGame())).toEqual({
      eligible: true,
      reason: "confirmed-two-player-campaign"
    });
  });

  it("returns quiet RAWG attribution and freshness metadata", () => {
    const game = catalogGame({
      sourceUpdatedAt: new Date("2026-06-02T12:00:00.000Z")
    });

    expect(getSourceAttribution(game)).toEqual({
      label: "Dados e imagens: RAWG",
      href: "https://rawg.io/games/it-takes-two"
    });
    expect(getFreshnessState(game.sourceUpdatedAt, game.syncedAt, now)).toEqual({
      label: "Atualizado ha 1 dia",
      tone: "fresh"
    });
  });

  it("does not invent estimated time or availability when sources are missing", () => {
    expect(getEstimatedTimeState(null, now)).toEqual({
      kind: "missing",
      label: "Sem fonte confiavel ainda"
    });
    expect(getAvailabilityState([], now)).toEqual({
      kind: "missing",
      label: "Nao verificado"
    });
  });
});

describe("catalog use cases", () => {
  it("filters unconfirmed records even if a repository returns them", async () => {
    const repository = createRepository([
      catalogGame(),
      catalogGame({
        id: "game-2",
        slug: "party-only",
        name: "Party Only",
        mainFlowEligible: true,
        coopCampaignConfirmed: false
      })
    ]);

    await expect(
      searchCatalogGamesUseCase({ now }, repository)
    ).resolves.toMatchObject([
      {
        slug: "it-takes-two",
        sourceMeta: {
          attributionLabel: "Dados e imagens: RAWG"
        },
        mainFlow: {
          eligible: true,
          label: "Coop campanha 2p confirmado"
        },
        timeEstimateLabel: "Cerca de 14 horas",
        availabilityLabel: "Nao verificado"
      }
    ]);
  });

  it("maps catalog detail into presentation-ready data without React or database imports", async () => {
    const repository = createRepository([catalogGame()]);

    await expect(
      getCatalogGameDetailUseCase("it-takes-two", repository, now)
    ).resolves.toMatchObject({
      slug: "it-takes-two",
      description: "Uma aventura coop sobre reconciliacao.",
      descriptionSourceLabel: "Descricao da fonte: RAWG",
      coopLabel: "Confirmado para campanha ou historia coop em dupla.",
      detailReadiness: {
        hasCoreDetails: true,
        missingLabels: []
      }
    });
  });

  it("prefers QUEUE/2 Portuguese descriptions for curated seeded games", async () => {
    const repository = createRepository([
      catalogGame({
        slug: "it-takes-two-2",
        rawgUrl: "https://rawg.io/games/it-takes-two-2",
        sourceUrl: "https://rawg.io/games/it-takes-two-2",
        description: "Bring your favorite co-op partner."
      })
    ]);

    await expect(
      getCatalogGameDetailUseCase("it-takes-two-2", repository, now)
    ).resolves.toMatchObject({
      description: expect.stringContaining("May e Cody"),
      descriptionSourceLabel: "Descricao curada: QUEUE/2"
    });
  });
});

function createRepository(games: CatalogGameDetailRecord[]): CatalogRepository {
  return {
    searchGames: async () => games,
    getGameBySlug: async (slug) => games.find((game) => game.slug === slug) ?? null,
    upsertGame: async () => "game-1",
    upsertGames: async () => games.map((game) => game.id)
  };
}

function catalogGame(
  overrides: Partial<CatalogGameDetailRecord> = {}
): CatalogGameDetailRecord {
  return {
    id: "game-1",
    rawgId: 123,
    slug: "it-takes-two",
    name: "It Takes Two",
    description: "Uma aventura coop sobre reconciliacao.",
    releasedAt: new Date("2021-03-26T00:00:00.000Z"),
    backgroundImageUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
    rawgUrl: "https://rawg.io/games/it-takes-two",
    rawgUpdatedAt: new Date("2026-06-01T12:00:00.000Z"),
    source: "RAWG",
    sourceUrl: "https://rawg.io/games/it-takes-two",
    sourceUpdatedAt: new Date("2026-06-01T12:00:00.000Z"),
    syncedAt: new Date("2026-06-03T12:00:00.000Z"),
    coopCampaignConfirmed: true,
    coopPlayerCountMin: 2,
    coopPlayerCountMax: 2,
    coopConfirmationSource: "Curadoria QUEUE/2",
    coopConfirmationCheckedAt: new Date("2026-06-03T12:00:00.000Z"),
    mainFlowEligible: true,
    platforms: [
      {
        key: "pc",
        name: "PC",
        rawgPlatformId: 4
      }
    ],
    genres: [
      {
        slug: "adventure",
        name: "Aventura",
        rawgGenreId: 3
      }
    ],
    timeEstimate: {
      minutes: 840,
      source: "Curadoria QUEUE/2",
      sourceUrl: null,
      checkedAt: new Date("2026-06-03T12:00:00.000Z"),
      confidence: "estimated"
    },
    availability: [],
    ...overrides
  };
}
