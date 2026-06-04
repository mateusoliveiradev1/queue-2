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
  getCatalogDescriptionState,
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

  it("returns verified availability with source and freshness when curated rows exist", () => {
    expect(
      getAvailabilityState(
        [
          {
            type: "game-pass",
            platformKey: "xbox",
            source: "Xbox Store / EA Play",
            sourceUrl: "https://www.xbox.com/en-us/games/store/a-way-out/bwvbncmf22zk",
            checkedAt: now,
            status: "available"
          }
        ],
        now
      )
    ).toEqual({
      kind: "available",
      label: "Game Pass verificado",
      sourceLabel: "Xbox Store / EA Play",
      sourceUrl: "https://www.xbox.com/en-us/games/store/a-way-out/bwvbncmf22zk",
      freshnessLabel: "Atualizado hoje"
    });
  });

  it("returns reviewed QUEUE/2 description state for published localization records", () => {
    expect(getCatalogDescriptionState(catalogLocalization(), now)).toEqual({
      kind: "published",
      description: "Uma aventura coop sobre reconciliacao.",
      sourceLabel: "Descricao revisada: QUEUE/2",
      sourceUrl: null,
      freshnessLabel: "Atualizado hoje"
    });
  });

  it("returns honest unavailable PT-BR copy when no published localization is visible", () => {
    expect(getCatalogDescriptionState(null, now)).toEqual({
      kind: "missing",
      description: "Descricao em portugues ainda nao revisada.",
      sourceLabel: "Descricao em portugues ainda nao revisada"
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

  it("passes pagination inputs to the catalog repository", async () => {
    const calls: unknown[] = [];
    const repository: CatalogRepository = {
      ...createRepository([catalogGame()]),
      searchGames: async (input) => {
        calls.push(input);
        return [catalogGame()];
      }
    };

    await searchCatalogGamesUseCase(
      {
        includeNonEligible: true,
        limit: 18,
        offset: 36,
        query: "coop",
        now
      },
      repository
    );

    expect(calls[0]).toMatchObject({
      limit: 18,
      offset: 36,
      query: "coop",
      onlyMainFlow: false
    });
  });

  it("maps catalog detail into presentation-ready data without React or database imports", async () => {
    const repository = createRepository([catalogGame()]);

    await expect(
      getCatalogGameDetailUseCase("it-takes-two", repository, now)
    ).resolves.toMatchObject({
      slug: "it-takes-two",
      description: "Uma aventura coop sobre reconciliacao.",
      descriptionSourceLabel: "Descricao revisada: QUEUE/2",
      sourceBreakdown: [
        {
          id: "rawg",
          sourceLabel: "Dados e imagens: RAWG",
          sourceHref: "https://rawg.io/games/it-takes-two",
          statusLabel: "Atualizado ha 2 dias",
          dateTime: "2026-06-01T12:00:00.000Z",
          absoluteDateLabel: "01 de junho de 2026"
        },
        {
          id: "description",
          sourceLabel: "Descricao revisada: QUEUE/2",
          statusLabel: "Atualizado hoje",
          dateTime: "2026-06-03T12:00:00.000Z",
          absoluteDateLabel: "03 de junho de 2026"
        },
        {
          id: "time-estimate",
          sourceLabel: "Curadoria QUEUE/2",
          statusLabel: "Atualizado hoje"
        },
        {
          id: "availability",
          sourceLabel: "Nao verificado",
          statusLabel: "Sem fonte ativa para exibir",
          freshnessTone: "missing"
        }
      ],
      coopLabel: "Confirmado para campanha ou historia coop em dupla.",
      detailReadiness: {
        hasCoreDetails: true,
        missingLabels: []
      }
    });
  });

  it("prefers published QUEUE/2 Portuguese localization over RAWG descriptions", async () => {
    const repository = createRepository([
      catalogGame({
        slug: "it-takes-two-2",
        rawgUrl: "https://rawg.io/games/it-takes-two-2",
        sourceUrl: "https://rawg.io/games/it-takes-two-2",
        description: "Bring your favorite co-op partner.",
        localization: catalogLocalization({
          description:
            "May e Cody sao transformados em bonecos e precisam cooperar juntos."
        })
      })
    ]);

    await expect(
      getCatalogGameDetailUseCase("it-takes-two-2", repository, now)
    ).resolves.toMatchObject({
      description: expect.stringContaining("May e Cody"),
      descriptionSourceLabel: "Descricao revisada: QUEUE/2"
    });
  });

  it("does not fall back to raw English RAWG descriptions without reviewed localization", async () => {
    const repository = createRepository([
      catalogGame({
        description: "Bring your favorite co-op partner.",
        localization: null
      })
    ]);

    await expect(
      getCatalogGameDetailUseCase("it-takes-two", repository, now)
    ).resolves.toMatchObject({
      description: "Descricao em portugues ainda nao revisada.",
      descriptionSourceLabel: "Descricao em portugues ainda nao revisada",
      sourceBreakdown: expect.arrayContaining([
        expect.objectContaining({
          id: "description",
          sourceLabel: "Descricao em portugues ainda nao revisada",
          statusLabel: "Sem descricao revisada publicada",
          dateTime: null,
          freshnessTone: "missing"
        })
      ]),
      detailReadiness: {
        hasCoreDetails: false,
        missingLabels: ["descricao"]
      }
    });
  });

  it("treats draft or review localizations as invisible to normal read records", async () => {
    const repository = createRepository([
      catalogGame({
        description: "Draft text should not be shown.",
        localization: null
      })
    ]);

    await expect(
      getCatalogGameDetailUseCase("it-takes-two", repository, now)
    ).resolves.toMatchObject({
      description: "Descricao em portugues ainda nao revisada.",
      descriptionSourceLabel: "Descricao em portugues ainda nao revisada"
    });
  });
});

function createRepository(games: CatalogGameDetailRecord[]): CatalogRepository {
  return {
    searchGames: async () => games,
    getGameBySlug: async (slug) => games.find((game) => game.slug === slug) ?? null,
    upsertGame: async () => "game-1",
    upsertGames: async () => games.map((game) => game.id),
    syncRawgGame: async () => "game-1"
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
    localization: catalogLocalization(),
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

function catalogLocalization(
  overrides: Partial<NonNullable<CatalogGameDetailRecord["localization"]>> = {}
): NonNullable<CatalogGameDetailRecord["localization"]> {
  return {
    locale: "pt-BR",
    version: 1,
    description: "Uma aventura coop sobre reconciliacao.",
    source: "queue2-curation",
    sourceUrl: null,
    publishedAt: new Date("2026-06-03T12:00:00.000Z"),
    reviewedAt: new Date("2026-06-03T12:00:00.000Z"),
    ...overrides
  };
}
