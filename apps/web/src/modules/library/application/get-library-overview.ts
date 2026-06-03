import type {
  LibraryOverviewRecord,
  LibraryRepository
} from "./ports";

export type GetLibraryOverviewResult =
  | { ok: true; overview: LibraryOverviewRecord }
  | { ok: false; reason: "membership-required" };

export async function getLibraryOverviewUseCase(
  userId: string,
  repository: LibraryRepository
): Promise<GetLibraryOverviewResult> {
  const overview = await repository.getOverview(userId);

  if (!overview) {
    return { ok: false, reason: "membership-required" };
  }

  return { ok: true, overview };
}
