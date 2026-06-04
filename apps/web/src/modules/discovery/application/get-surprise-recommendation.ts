import {
  buildDiscoveryDeckCards,
  getReadableGameState,
  toRecommendationFacts
} from "./view-models";
import { rankDiscoveryRecommendations } from "../domain/recommendation-policy";
import {
  normalizeMemberPlatforms,
  toRecommendationFilters
} from "./recommendation-filters";
import type {
  DiscoveryCatalogSearch,
  DiscoveryDeckRepository,
  GetSurpriseRecommendationInput,
  GetSurpriseRecommendationResult
} from "./ports";

export async function getSurpriseRecommendationUseCase(
  input: GetSurpriseRecommendationInput,
  repository: DiscoveryDeckRepository,
  catalogSearch: DiscoveryCatalogSearch
): Promise<GetSurpriseRecommendationResult> {
  const catalogCards = await catalogSearch({
    limit: 60,
    includeNonEligible: false
  });
  const readState = await repository.getReadState({
    userId: input.userId,
    catalogGameIds: catalogCards.map((card) => card.id)
  });

  if (!readState.context) {
    return { ok: false, reason: "membership-required" };
  }

  const unseenCards = catalogCards.filter((card) => {
    const state = getReadableGameState(readState, card.id);
    return !state?.seenByAnyMember;
  });
  const memberPlatforms = normalizeMemberPlatforms(readState.context.memberPlatforms);
  const recommendationResult = rankDiscoveryRecommendations({
    games: toRecommendationFacts({ cards: unseenCards }),
    memberPlatforms,
    filters: toRecommendationFilters(input.filters, memberPlatforms),
    positiveGenres: readState.positiveProfile.genres,
    positiveTags: readState.positiveProfile.tags,
    collaborative: readState.collaborative
  });
  const firstRecommendation = recommendationResult.recommendations[0];

  if (!firstRecommendation) {
    return { ok: false, reason: "surprise-not-found" };
  }

  const card = unseenCards.find(
    (candidate) => candidate.id === firstRecommendation.catalogGameId
  );

  if (!card) {
    return { ok: false, reason: "surprise-not-found" };
  }

  const result = buildDiscoveryDeckCards({
    cards: [
      {
        card,
        readState,
        recommendation: firstRecommendation
      }
    ]
  });

  return {
    ok: true,
    card: result.cards[0]!
  };
}

export async function getSurpriseRecommendation(
  input: GetSurpriseRecommendationInput
): Promise<GetSurpriseRecommendationResult> {
  const [{ discoveryRepository }, { searchCatalogGames }] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../../catalog")
  ]);

  return getSurpriseRecommendationUseCase(input, discoveryRepository, searchCatalogGames);
}
