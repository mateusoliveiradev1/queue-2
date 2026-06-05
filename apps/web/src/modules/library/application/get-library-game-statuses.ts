import type {
  LibraryGameStatusesResult,
  LibraryRepository
} from "./ports";

export async function getLibraryGameStatusesUseCase(
  input: {
    userId: string;
    catalogGameIds: string[];
  },
  repository: LibraryRepository
): Promise<LibraryGameStatusesResult> {
  const catalogGameIds = [...new Set(input.catalogGameIds.map((id) => id.trim()).filter(Boolean))];

  if (catalogGameIds.length === 0) {
    return { ok: true, statuses: {} };
  }

  const result = await repository.getLibraryGameStatuses({
    userId: input.userId,
    catalogGameIds
  });

  if (!result) {
    return { ok: false, reason: "membership-required" };
  }

  return { ok: true, statuses: result };
}
