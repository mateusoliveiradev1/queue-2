import {
  getCatalogGameDetail,
  type CatalogGameDetailView
} from "../../catalog";
import type {
  LibraryGameDetailRecord,
  LibraryRepository
} from "./ports";

export type GetLibraryGameDetailResult =
  | {
      ok: true;
      detail: LibraryGameDetailRecord;
      catalog: CatalogGameDetailView | null;
    }
  | { ok: false; reason: "library-game-not-found" | "membership-required" };

export async function getLibraryGameDetailUseCase(
  input: {
    userId: string;
    catalogGameId: string;
  },
  repository: LibraryRepository,
  catalogDetailReader: (slug: string) => Promise<CatalogGameDetailView | null> = getCatalogGameDetail
): Promise<GetLibraryGameDetailResult> {
  const detail = await repository.getGameDetail(input);

  if (!detail) {
    return { ok: false, reason: "library-game-not-found" };
  }

  return {
    ok: true,
    detail,
    catalog: await catalogDetailReader(detail.catalogGame.slug)
  };
}
