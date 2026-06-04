import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { answerMoodQuizUseCase } from "../src/modules/discovery/application/answer-mood-quiz";
import { getSurpriseRecommendationUseCase } from "../src/modules/discovery/application/get-surprise-recommendation";
import { normalizeDiscoverySearchInput } from "../src/modules/discovery/application/search-discovery-games";
import type {
  DiscoveryCatalogSearch,
  DiscoveryDeckRepository,
  DiscoveryRepository,
  DiscoveryReadState
} from "../src/modules/discovery/application/ports";
import type { CatalogGameCardView } from "../src/modules/catalog";

const searchRouteSource = readFileSync(
  "src/app/api/discovery/search/route.ts",
  "utf8"
);
const persistentRateLimitSource = readFileSync(
  "src/platform/rate-limit/persistent.ts",
  "utf8"
);
const discoveryRepositorySource = readFileSync(
  "src/modules/discovery/infrastructure/discovery-repository.ts",
  "utf8"
);

describe("discovery autocomplete and mode services", () => {
  it("rejects too-short and too-long autocomplete queries and caps the limit", () => {
    expect(normalizeDiscoverySearchInput({ query: "a" })).toEqual({
      ok: false,
      reason: "query-too-short"
    });
    expect(normalizeDiscoverySearchInput({ query: "x".repeat(81) })).toEqual({
      ok: false,
      reason: "query-too-long"
    });
    expect(normalizeDiscoverySearchInput({ query: "coop", limit: 50 })).toEqual({
      ok: true,
      input: {
        query: "coop",
        limit: 10,
        includeAlreadySeen: false
      }
    });
  });

  it("protects the autocomplete route with zod, verified session and persistent rate limit", () => {
    expect(searchRouteSource).toContain("z.object");
    expect(searchRouteSource).toContain("requireVerifiedSession()");
    expect(searchRouteSource).toContain("persistentDiscoverySearchLimiter");
    expect(searchRouteSource).toContain("Cache-Control");
    expect(persistentRateLimitSource).toContain("discovery:search:");
    expect(persistentRateLimitSource).toContain('storage: "database"');
  });

  it("returns a surprise only from games neither member has seen", async () => {
    const cards = [
      catalogCard({ id: "seen-by-partner", name: "Seen By Partner" }),
      catalogCard({ id: "unseen", name: "Unseen" })
    ];
    const result = await getSurpriseRecommendationUseCase(
      {
        userId: "member-1"
      },
      fakeRepository({
        games: [
          gameState({
            catalogGameId: "seen-by-partner",
            seenByAnyMember: true
          }),
          gameState({
            catalogGameId: "unseen",
            seenByAnyMember: false
          })
        ]
      }),
      fakeCatalogSearch(cards)
    );

    expect(result).toMatchObject({
      ok: true,
      card: {
        catalogGameId: "unseen"
      }
    });
  });

  it("keeps mood quiz in preview mode until both members have answered", async () => {
    const result = await answerMoodQuizUseCase(
      {
        userId: "member-1",
        answers: {
          energy: "low",
          commitment: "short",
          vibe: "laugh"
        }
      },
      {
        ...fakeRepository({
          games: [gameState({ catalogGameId: "flexible" })]
        }),
        async answerMoodQuiz() {
          return {
            mood: {
              kind: "preview",
              answeredMembers: 1,
              recommendationMode: "preview-only",
              mood: {
                energy: "low",
                commitment: "short",
                vibe: "laugh",
                conflictResolution: "none"
              }
            }
          };
        }
      },
      fakeCatalogSearch([catalogCard({ id: "flexible", name: "Flexible" })])
    );

    expect(result.mood).toMatchObject({
      kind: "preview",
      recommendationMode: "preview-only"
    });
  });

  it("keeps live session reads scoped to the current user's duo", () => {
    expect(discoveryRepositorySource).toContain("FROM app.discovery_live_sessions");
    expect(discoveryRepositorySource).toContain("WHERE duo_id = $1");
    expect(discoveryRepositorySource).toContain("AND ($2::uuid IS NULL OR id = $2::uuid)");
    expect(discoveryRepositorySource).toContain("mergeDuoMoodAnswers");
  });
});

function fakeCatalogSearch(cards: CatalogGameCardView[]): DiscoveryCatalogSearch {
  return async () => cards;
}

function fakeRepository(
  state: Partial<DiscoveryReadState>
): DiscoveryDeckRepository & Pick<DiscoveryRepository, "answerMoodQuiz"> {
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
    },
    async answerMoodQuiz() {
      return {
        mood: {
          kind: "empty",
          answeredMembers: 0,
          recommendationMode: "none"
        }
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
