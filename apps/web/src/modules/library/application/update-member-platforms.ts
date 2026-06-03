import {
  normalizePlatformKey,
  normalizePlatformSet
} from "../domain/platforms";
import type {
  LibraryRepository,
  UpdateMemberPlatformsResult
} from "./ports";

export async function updateMemberPlatformsUseCase(
  input: {
    userId: string;
    platforms: string[];
  },
  repository: LibraryRepository
): Promise<UpdateMemberPlatformsResult> {
  if (input.platforms.some((platform) => normalizePlatformKey(platform) === null)) {
    return { ok: false, reason: "invalid-platform" };
  }

  const platforms = normalizePlatformSet(input.platforms);

  return repository.updateMemberPlatforms({
    userId: input.userId,
    platforms
  });
}
