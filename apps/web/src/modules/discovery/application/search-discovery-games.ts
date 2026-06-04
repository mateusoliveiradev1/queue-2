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
import { shouldShowInDiscoveryCycle } from "./discovery-visibility";
import type {
  DiscoveryCatalogSearch,
  DiscoveryDeckRepository,
  DiscoverySearchResult,
  DiscoverySearchValidationResult,
  SearchDiscoveryGamesInput
} from "./ports";

export const DISCOVERY_SEARCH_MIN_QUERY_LENGTH = 2;
export const DISCOVERY_SEARCH_MAX_QUERY_LENGTH = 80;
export const DISCOVERY_SEARCH_MAX_LIMIT = 10;

export function normalizeDiscoverySearchInput(input: {
  query?: string | null;
  limit?: number | null;
  includeAlreadySeen?: boolean | null;
}): DiscoverySearchValidationResult {
  const query = input.query?.trim() ?? "";

  if (query.length < DISCOVERY_SEARCH_MIN_QUERY_LENGTH) {
    return { ok: false, reason: "query-too-short" };
  }

  if (query.length > DISCOVERY_SEARCH_MAX_QUERY_LENGTH) {
    return { ok: false, reason: "query-too-long" };
  }

  if (
    input.limit !== undefined &&
    input.limit !== null &&
    (!Number.isInteger(input.limit) || input.limit <= 0)
  ) {
    return { ok: false, reason: "invalid-limit" };
  }

  return {
    ok: true,
    input: {
      query,
      limit: Math.min(input.limit ?? DISCOVERY_SEARCH_MAX_LIMIT, DISCOVERY_SEARCH_MAX_LIMIT),
      includeAlreadySeen: input.includeAlreadySeen ?? false
    }
  };
}

export async function searchDiscoveryGamesUseCase(
  input: SearchDiscoveryGamesInput,
  repository: DiscoveryDeckRepository,
  catalogSearch: DiscoveryCatalogSearch
): Promise<DiscoverySearchResult> {
  const normalized = normalizeDiscoverySearchInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  const catalogCards = await catalogSearch({
    query: normalized.input.query,
    limit: normalized.input.limit,
    includeNonEligible: false
  });
  const readState = await repository.getReadState({
    userId: input.userId,
    catalogGameIds: catalogCards.map((card) => card.id)
  });

  if (!readState.context) {
    return { ok: false, reason: "membership-required" };
  }

  const visibleCards = catalogCards.filter((card) => {
    const state = getReadableGameState(readState, card.id);
    return shouldShowInDiscoveryCycle(state, {
      includeAlreadySeen:
        normalized.input.includeAlreadySeen || input.filters?.includeAlreadySeen
    });
  });
  const memberPlatforms = normalizeMemberPlatforms(readState.context.memberPlatforms);
  const recommendations = rankDiscoveryRecommendations({
    games: toRecommendationFacts({ cards: visibleCards }),
    memberPlatforms,
    filters: toRecommendationFilters(input.filters, memberPlatforms, {
      defaultCommonPlatformOnly: false
    }),
    positiveGenres: readState.positiveProfile.genres,
    positiveTags: readState.positiveProfile.tags,
    collaborative: readState.collaborative
  });
  const recommendationsByGame = new Map(
    recommendations.recommendations.map((recommendation) => [
      recommendation.catalogGameId,
      recommendation
    ])
  );
  const result = buildDiscoveryDeckCards({
    cards: visibleCards.map((card) => ({
      card,
      readState,
      recommendation: recommendationsByGame.get(card.id)
    }))
  });

  return {
    ok: true,
    cards: result.cards
  };
}

export async function searchDiscoveryGames(
  input: SearchDiscoveryGamesInput
): Promise<DiscoverySearchResult> {
  const [{ discoveryRepository }, { searchCatalogGames }] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../../catalog")
  ]);

  return searchDiscoveryGamesUseCase(input, discoveryRepository, searchCatalogGames);
}
