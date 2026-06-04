import { describe, expect, it } from "vitest";

import { getDiscoveryDeckUseCase } from "../src/modules/discovery/application/get-discovery-deck";
import { searchDiscoveryGamesUseCase } from "../src/modules/discovery/application/search-discovery-games";
import type {
  DiscoveryCatalogSearch,
  DiscoveryDeckRepository,
  DiscoveryReadState
} from "../src/modules/discovery/application/ports";
import type { CatalogGameCardView } from "../src/modules/catalog";

describe("discovery application deck", () => {
  it("excludes games the current member already evaluated from the default deck", async () => {
    const cards = [
      catalogCard({ id: "seen-game", name: "Seen Game" }),
      catalogCard({ id: "fresh-game", name: "Fresh Game" })
    ];
    const result = await getDiscoveryDeckUseCase(
      {
        userId: "member-1",
        limit: 4
      },
      fakeRepository({
        games: [
          gameState({
            catalogGameId: "seen-game",
            currentMemberDecision: decisionRecord({
              catalogGameId: "seen-game",
              decision: "want"
            }),
            seenByCurrentMember: true,
            seenByAnyMember: true
          }),
          gameState({ catalogGameId: "fresh-game" })
        ]
      }),
      fakeCatalogSearch(cards)
    );

    expect(result.cards.map((card) => card.catalogGameId)).toEqual(["fresh-game"]);
  });

  it("can intentionally include already seen games in search results", async () => {
    const cards = [
      catalogCard({ id: "seen-game", name: "Seen Game" }),
      catalogCard({ id: "fresh-game", name: "Fresh Game" })
    ];
    const repository = fakeRepository({
      games: [
        gameState({
          catalogGameId: "seen-game",
          currentMemberDecision: decisionRecord({
            catalogGameId: "seen-game",
            decision: "skip"
          }),
          seenByCurrentMember: true,
          seenByAnyMember: true
        }),
        gameState({ catalogGameId: "fresh-game" })
      ]
    });

    const defaultResult = await searchDiscoveryGamesUseCase(
      {
        userId: "member-1",
        query: "game"
      },
      repository,
      fakeCatalogSearch(cards)
    );
    const inclusiveResult = await searchDiscoveryGamesUseCase(
      {
        userId: "member-1",
        query: "game",
        includeAlreadySeen: true
      },
      repository,
      fakeCatalogSearch(cards)
    );

    expect(defaultResult).toMatchObject({
      ok: true,
      cards: [{ catalogGameId: "fresh-game" }]
    });
    expect(inclusiveResult).toMatchObject({
      ok: true,
      cards: [
        { catalogGameId: "seen-game" },
        { catalogGameId: "fresh-game" }
      ]
    });
  });

  it("includes library status and valid action state without duplicating library rows", async () => {
    const result = await getDiscoveryDeckUseCase(
      {
        userId: "member-1",
        limit: 1
      },
      fakeRepository({
        games: [
          gameState({
            catalogGameId: "wishlist-game",
            libraryStatus: "wishlist"
          })
        ]
      }),
      fakeCatalogSearch([
        catalogCard({ id: "wishlist-game", name: "Wishlist Game" })
      ])
    );

    expect(result.cards[0]).toMatchObject({
      catalogGameId: "wishlist-game",
      libraryStatus: "wishlist",
      libraryActionState: "can-move",
      allowedLibraryActions: ["jogando", "pausado"]
    });
  });

  it("rejects unbounded autocomplete input before reading catalog data", async () => {
    const result = await searchDiscoveryGamesUseCase(
      {
        userId: "member-1",
        query: "x".repeat(81)
      },
      fakeRepository({}),
      async () => {
        throw new Error("catalog should not be called");
      }
    );

    expect(result).toEqual({ ok: false, reason: "query-too-long" });
  });
});

function fakeCatalogSearch(cards: CatalogGameCardView[]): DiscoveryCatalogSearch {
  return async () => cards;
}

function fakeRepository(state: Partial<DiscoveryReadState>): DiscoveryDeckRepository {
  return {
    async getReadState(input) {
      return {
        context: {
          duoId: "duo-1",
          userId: input.userId,
          partnerUserId: "member-2",
          memberUserIds: [input.userId, "member-2"],
          memberPlatforms: {
            first: ["pc"],
            second: ["pc"]
          }
        },
        games: [],
        positiveProfile: {
          genres: [],
          tags: []
        },
        collaborative: {
          currentDuoDecisionCount: 0,
          crossDuoPositiveDecisionCount: 0
        },
        ...state
      };
    }
  };
}

function catalogCard(overrides: Partial<CatalogGameCardView> = {}): CatalogGameCardView {
  return {
    id: "game",
    slug: "game",
    name: "Game",
    coverUrl: null,
    releaseLabel: "2026",
    platformLabels: ["PC"],
    genreLabels: ["Puzzle"],
    sourceMeta: {
      attributionLabel: "Dados e imagens: RAWG",
      attributionHref: "https://rawg.io",
      freshnessLabel: "Atualizado hoje",
      freshnessTone: "fresh"
    },
    mainFlow: {
      eligible: true,
      label: "Coop campanha 2p confirmado"
    },
    timeEstimateLabel: "Cerca de 6 horas",
    availabilityLabel: "Nao verificado",
    ...overrides
  };
}

function gameState(
  overrides: Partial<DiscoveryReadState["games"][number]>
): DiscoveryReadState["games"][number] {
  return {
    catalogGameId: "game",
    currentMemberDecision: null,
    seenByCurrentMember: false,
    seenByAnyMember: false,
    libraryStatus: null,
    match: null,
    ...overrides
  };
}

function decisionRecord(
  overrides: Partial<NonNullable<DiscoveryReadState["games"][number]["currentMemberDecision"]>>
): NonNullable<DiscoveryReadState["games"][number]["currentMemberDecision"]> {
  return {
    duoId: "duo-1",
    userId: "member-1",
    catalogGameId: "game",
    decision: "want",
    sourceMode: "deck",
    decidedAt: new Date("2026-06-04T00:00:00.000Z"),
    cooldownUntil: null,
    preferenceWeight: 3,
    ...overrides
  };
}
