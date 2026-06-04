import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getDiscoveryDeckUseCase } from "../src/modules/discovery/application/get-discovery-deck";
import { handoffDiscoveryMatchToLibraryUseCase } from "../src/modules/discovery/application/record-discovery-decision";
import { searchDiscoveryGamesUseCase } from "../src/modules/discovery/application/search-discovery-games";
import type {
  DiscoveryCatalogSearch,
  DiscoveryDeckRepository,
  DiscoveryReadState
} from "../src/modules/discovery/application/ports";
import type { CatalogGameCardView } from "../src/modules/catalog";

const discoveryRepositorySource = readFileSync(
  "src/modules/discovery/infrastructure/discovery-repository.ts",
  "utf8"
);
const discoveryActionsSource = readFileSync(
  "src/app/app/descobrir/actions.ts",
  "utf8"
);
const catalogRepositorySource = readFileSync(
  "src/modules/catalog/infrastructure/catalog-repository.ts",
  "utf8"
);
const discoveryApplicationReadModelSources = [
  readFileSync(
    "src/modules/discovery/application/get-discovery-deck.ts",
    "utf8"
  ),
  readFileSync(
    "src/modules/discovery/application/search-discovery-games.ts",
    "utf8"
  ),
  readFileSync(
    "src/modules/discovery/application/get-surprise-recommendation.ts",
    "utf8"
  )
];

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

  it("does not blank the default deck while duo platform preferences are missing", async () => {
    const result = await getDiscoveryDeckUseCase(
      {
        userId: "member-1",
        limit: 4
      },
      fakeRepository({
        context: {
          duoId: "duo-1",
          userId: "member-1",
          partnerUserId: "member-2",
          memberUserIds: ["member-1", "member-2"],
          memberPlatforms: {
            first: [],
            second: []
          }
        }
      }),
      fakeCatalogSearch([catalogCard({ id: "pc-game", name: "PC Game" })])
    );

    expect(result.cards.map((card) => card.catalogGameId)).toEqual(["pc-game"]);
  });

  it("keeps terminal library games out of the default discovery cycle", async () => {
    const cards = [
      catalogCard({ id: "finished-game", name: "Finished Game" }),
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
            catalogGameId: "finished-game",
            libraryStatus: "zerado"
          }),
          gameState({ catalogGameId: "fresh-game" })
        ]
      }),
      fakeCatalogSearch(cards)
    );

    expect(result.cards.map((card) => card.catalogGameId)).toEqual(["fresh-game"]);
  });

  it("requests a paged catalog window when the discovery page advances", async () => {
    const calls: Array<Parameters<DiscoveryCatalogSearch>[0]> = [];
    const result = await getDiscoveryDeckUseCase(
      {
        userId: "member-1",
        limit: 6,
        page: 3
      },
      fakeRepository({
        games: [gameState({ catalogGameId: "paged-game" })]
      }),
      async (input) => {
        calls.push(input);
        return [catalogCard({ id: "paged-game", name: "Paged Game" })];
      }
    );

    expect(result.cards.map((card) => card.catalogGameId)).toEqual(["paged-game"]);
    expect(result.pageInfo).toEqual({
      currentPage: 3,
      hasNextPage: false,
      hasPreviousPage: true
    });
    expect(calls[0]).toMatchObject({
      limit: 25,
      offset: 48,
      includeNonEligible: false
    });
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

  it("does not force a preferred surprise card outside the active filters", async () => {
    const cards = [
      catalogCard({
        id: "long-surprise",
        name: "Long Surprise",
        timeEstimateLabel: "Cerca de 20 horas"
      }),
      catalogCard({
        id: "short-match",
        name: "Short Match",
        timeEstimateLabel: "Cerca de 4 horas"
      })
    ];
    const result = await getDiscoveryDeckUseCase(
      {
        userId: "member-1",
        limit: 2,
        preferredCatalogGameId: "long-surprise",
        filters: {
          maxEstimatedMinutes: 480
        }
      },
      fakeRepository({
        games: [
          gameState({ catalogGameId: "long-surprise" }),
          gameState({ catalogGameId: "short-match" })
        ]
      }),
      fakeCatalogSearch(cards)
    );

    expect(result.cards.map((card) => card.catalogGameId)).toEqual(["short-match"]);
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

  it("keeps application read-model use cases independent from presentation view models", () => {
    for (const source of discoveryApplicationReadModelSources) {
      expect(source).not.toContain("../presentation/view-models");
      expect(source).toContain("./view-models");
    }
  });

  it("keeps reciprocal match creation idempotent in the repository transaction", () => {
    expect(discoveryRepositorySource).toContain("pg_advisory_xact_lock");
    expect(discoveryRepositorySource).toContain("hashtextextended");
    expect(discoveryRepositorySource).toContain(
      "ON CONFLICT (duo_id, catalog_game_id) DO NOTHING"
    );
    expect(discoveryRepositorySource).toContain("discovery.match_created");
    expect(discoveryRepositorySource).toContain("withAppUserTransaction");
  });

  it("moves an existing library row during handoff instead of adding a duplicate", async () => {
    const calls: string[] = [];
    const result = await handoffDiscoveryMatchToLibraryUseCase(
      {
        userId: "member-1",
        catalogGameId: "game-1",
        status: "jogando"
      },
      {
        async markMatchLibraryHandoff() {
          calls.push("mark");
        }
      },
      {
        async addGameToWishlist() {
          calls.push("add");
          return { ok: true };
        },
        async moveLibraryGame() {
          calls.push("move");
          return { ok: true };
        }
      }
    );

    expect(result).toMatchObject({
      ok: true,
      state: {
        kind: "library-updated",
        status: "jogando"
      }
    });
    expect(calls).toEqual(["move", "mark"]);
  });

  it("adds to wishlist first only when a valid non-wishlist handoff has no library row", async () => {
    const calls: string[] = [];
    let moveCount = 0;
    const result = await handoffDiscoveryMatchToLibraryUseCase(
      {
        userId: "member-1",
        catalogGameId: "game-1",
        status: "pausado"
      },
      {
        async markMatchLibraryHandoff() {
          calls.push("mark");
        }
      },
      {
        async addGameToWishlist() {
          calls.push("add");
          return { ok: true };
        },
        async moveLibraryGame() {
          moveCount += 1;
          calls.push(`move-${moveCount}`);
          return moveCount === 1
            ? { ok: false, reason: "library-game-not-found" }
            : { ok: true };
        }
      }
    );

    expect(result).toMatchObject({
      ok: true,
      state: {
        kind: "library-updated",
        status: "pausado"
      }
    });
    expect(calls).toEqual(["move-1", "add", "move-2", "mark"]);
  });

  it("derives discovery server action user identity from the verified session", () => {
    expect(discoveryActionsSource).toContain("requireVerifiedSession()");
    expect(discoveryActionsSource).toContain("userId: session.user.id");
    expect(discoveryActionsSource).toContain("z.string().uuid()");
    expect(discoveryActionsSource).toContain("getSafeReturnTo");
    expect(discoveryActionsSource).toContain("getDiscoveryFiltersFromPath(returnTo)");
    expect(discoveryActionsSource).toContain('withParam(returnTo, "live"');
    expect(discoveryActionsSource).toContain('withParam(returnTo, "surpresa"');
    expect(discoveryActionsSource).not.toMatch(/formData\.get\(\"userId\"\)/);
  });

  it("keeps RAWG update freshness in catalog repository reads", () => {
    const rawgUpdatedAtSelections = catalogRepositorySource.match(/game\.rawg_updated_at/g) ?? [];
    expect(rawgUpdatedAtSelections.length).toBeGreaterThanOrEqual(2);
  });
});

function fakeCatalogSearch(cards: CatalogGameCardView[]): DiscoveryCatalogSearch {
  return async (input) =>
    input?.ids ? cards.filter((card) => input.ids?.includes(card.id)) : cards;
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
