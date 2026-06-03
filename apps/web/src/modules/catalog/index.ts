import "server-only";

import { getCatalogGameDetailUseCase } from "./application/get-catalog-game";
import {
  searchCatalogGamesUseCase,
  type SearchCatalogGamesInput
} from "./application/search-catalog";
import { catalogRepository } from "./infrastructure/catalog-repository";

export {
  getAvailabilityState,
  getEstimatedTimeState,
  getFreshnessState,
  getSourceAttribution,
  evaluateMainFlowEligibility,
  canEnterMainCatalogFlow,
  type AvailabilityState,
  type EstimatedTimeState,
  type FreshnessState,
  type MainFlowEligibility,
  type SourceAttribution
} from "./domain/catalog-policy";

export {
  toCatalogGameCardView,
  toCatalogGameDetailView,
  type CatalogGameCardView,
  type CatalogGameDetailView,
  type CatalogSourceMetaView
} from "./presentation/view-models";

export type {
  CatalogAvailabilityRecord,
  CatalogGameDetailRecord,
  CatalogGameRecord,
  CatalogGameUpsertInput,
  CatalogGenreRecord,
  CatalogPlatformKey,
  CatalogPlatformRecord,
  CatalogRepository,
  CatalogSearchInput,
  CatalogTimeEstimateRecord
} from "./application/ports";

export type { SearchCatalogGamesInput };

export function searchCatalogGames(input: SearchCatalogGamesInput = {}) {
  return searchCatalogGamesUseCase(input, catalogRepository);
}

export function getCatalogGameDetail(slug: string) {
  return getCatalogGameDetailUseCase(slug, catalogRepository);
}
