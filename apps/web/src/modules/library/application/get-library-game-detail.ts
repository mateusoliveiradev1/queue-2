import type {
  LibraryGameDetailRecord,
  LibraryRepository
} from "./ports";

export type GetLibraryGameDetailResult =
  | { ok: true; detail: LibraryGameDetailRecord }
  | { ok: false; reason: "library-game-not-found" | "membership-required" };

export async function getLibraryGameDetailUseCase(
  input: {
    userId: string;
    catalogGameId: string;
  },
  repository: LibraryRepository
): Promise<GetLibraryGameDetailResult> {
  const detail = await repository.getGameDetail(input);

  if (!detail) {
    return { ok: false, reason: "library-game-not-found" };
  }

  return { ok: true, detail };
}
