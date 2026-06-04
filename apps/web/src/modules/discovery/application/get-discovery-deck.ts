import {
  rankDiscoveryRecommendations
} from "../domain/recommendation-policy";
import { shouldExcludeFromCurrentDeck } from "../domain/discovery-policy";
import {
  buildDiscoveryDeckCards,
  getReadableGameState,
  toRecommendationFacts
} from "./view-models";
import {
  normalizeMemberPlatforms,
  toRecommendationFilters
} from "./recommendation-filters";
import type {
  DiscoveryCatalogSearch,
  DiscoveryDeckBuildResult,
  DiscoveryDeckRepository,
  GetDiscoveryDeckInput
} from "./ports";

export async function getDiscoveryDeckUseCase(
  input: GetDiscoveryDeckInput,
  repository: DiscoveryDeckRepository,
  catalogSearch: DiscoveryCatalogSearch
): Promise<DiscoveryDeckBuildResult> {
  const limit = clampLimit(input.limit, 12);
  const catalogCards = mergePreferredCatalogCards(
    await Promise.all([
      input.preferredCatalogGameId
        ? catalogSearch({
            ids: [input.preferredCatalogGameId],
            limit: 1,
            includeNonEligible: false
          })
        : Promise.resolve([]),
      catalogSearch({
        limit: Math.min(60, Math.max(24, limit * 4)),
        includeNonEligible: false
      })
    ])
  );
  const readState = await repository.getReadState({
    userId: input.userId,
    catalogGameIds: catalogCards.map((card) => card.id)
  });

  if (!readState.context) {
    return {
      cards: [],
      recommendations: []
    };
  }

  const eligibleCards = catalogCards.filter((card) => {
    const state = getReadableGameState(readState, card.id);

    if (input.filters?.includeAlreadySeen) {
      return true;
    }

    if (!state?.currentMemberDecision) {
      return true;
    }

    return !shouldExcludeFromCurrentDeck({
      decision: state.currentMemberDecision.decision,
      cooldownUntil: state.currentMemberDecision.cooldownUntil
    });
  });
  const facts = toRecommendationFacts({ cards: eligibleCards });
  const memberPlatforms = normalizeMemberPlatforms(readState.context.memberPlatforms);
  const recommendationResult = rankDiscoveryRecommendations({
    games: facts,
    memberPlatforms,
    filters: toRecommendationFilters(input.filters, memberPlatforms),
    positiveGenres: readState.positiveProfile.genres,
    positiveTags: readState.positiveProfile.tags,
    collaborative: readState.collaborative
  });
  const recommendationsByGame = new Map(
    recommendationResult.recommendations.map((recommendation) => [
      recommendation.catalogGameId,
      recommendation
    ])
  );
  const cardsById = new Map(eligibleCards.map((card) => [card.id, card]));
  const hasRecommendedPreferred =
    Boolean(input.preferredCatalogGameId) &&
    recommendationResult.recommendations.some(
      (recommendation) =>
        recommendation.catalogGameId === input.preferredCatalogGameId
    );
  const rankedCatalogGameIds = prioritizePreferredCatalogGameId(
    recommendationResult.recommendations.map(
      (recommendation) => recommendation.catalogGameId
    ),
    input.preferredCatalogGameId,
    hasRecommendedPreferred
  );
  const rankedCards = rankedCatalogGameIds
    .map((catalogGameId) => cardsById.get(catalogGameId))
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
    .slice(0, limit);

  return buildDiscoveryDeckCards({
    cards: rankedCards.map((card) => ({
      card,
      readState,
      recommendation: recommendationsByGame.get(card.id)
    }))
  });
}

export async function getDiscoveryDeck(
  input: GetDiscoveryDeckInput
): Promise<DiscoveryDeckBuildResult> {
  const [{ discoveryRepository }, { searchCatalogGames }] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../../catalog")
  ]);

  return getDiscoveryDeckUseCase(input, discoveryRepository, searchCatalogGames);
}

function mergePreferredCatalogCards(
  [preferredCards, catalogCards]: [
    Awaited<ReturnType<DiscoveryCatalogSearch>>,
    Awaited<ReturnType<DiscoveryCatalogSearch>>
  ]
) {
  const cardsById = new Map(
    [...preferredCards, ...catalogCards].map((card) => [card.id, card])
  );

  return [...cardsById.values()];
}

function prioritizePreferredCatalogGameId(
  catalogGameIds: string[],
  preferredCatalogGameId: string | undefined,
  hasPreferredCard: boolean
): string[] {
  if (!preferredCatalogGameId || !hasPreferredCard) {
    return catalogGameIds;
  }

  return [
    preferredCatalogGameId,
    ...catalogGameIds.filter((catalogGameId) => catalogGameId !== preferredCatalogGameId)
  ];
}

function clampLimit(value: number | undefined, fallback: number): number {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(24, Math.max(1, Math.floor(value)));
}
