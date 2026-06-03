import {
  toCatalogGameDetailView,
  type CatalogGameDetailView
} from "../presentation/view-models";
import type { CatalogRepository } from "./ports";

export async function getCatalogGameDetailUseCase(
  slug: string,
  repository: CatalogRepository,
  now: Date = new Date()
): Promise<CatalogGameDetailView | null> {
  const game = await repository.getGameBySlug(slug);

  if (!game) {
    return null;
  }

  return toCatalogGameDetailView(game, now);
}
