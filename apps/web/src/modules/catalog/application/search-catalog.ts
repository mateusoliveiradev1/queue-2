import {
  canEnterMainCatalogFlow
} from "../domain/catalog-policy";
import {
  toCatalogGameCardView,
  type CatalogGameCardView
} from "../presentation/view-models";
import type {
  CatalogPlatformKey,
  CatalogRepository
} from "./ports";

export type SearchCatalogGamesInput = {
  query?: string;
  limit?: number;
  platformKeys?: CatalogPlatformKey[];
  includeNonEligible?: boolean;
  now?: Date;
};

export async function searchCatalogGamesUseCase(
  input: SearchCatalogGamesInput,
  repository: CatalogRepository
): Promise<CatalogGameCardView[]> {
  const includeNonEligible = input.includeNonEligible ?? false;
  const records = await repository.searchGames({
    query: input.query,
    limit: input.limit,
    platformKeys: input.platformKeys,
    onlyMainFlow: !includeNonEligible
  });
  const filtered = includeNonEligible
    ? records
    : records.filter(canEnterMainCatalogFlow);

  return filtered.map((game) => toCatalogGameCardView(game, input.now));
}
