import {
  getLibraryMovePolicy
} from "../domain/library-policy";
import type {
  LibraryRepository,
  MoveLibraryGameResult
} from "./ports";

export async function moveLibraryGameUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    status: string;
  },
  repository: LibraryRepository
): Promise<MoveLibraryGameResult> {
  const [currentGame, currentJogandoCount] = await Promise.all([
    repository.getLibraryGame({
      userId: input.userId,
      catalogGameId: input.catalogGameId
    }),
    repository.getJogandoCount(input.userId)
  ]);

  if (!currentGame) {
    return { ok: false, reason: "library-game-not-found" };
  }

  const policy = getLibraryMovePolicy({
    status: input.status,
    currentJogandoCount,
    alreadyJogando: currentGame.status === "jogando"
  });

  if (!policy.ok) {
    return {
      ok: false,
      reason: policy.reason,
      status: "status" in policy ? policy.status : undefined
    };
  }

  return repository.moveLibraryGame({
    userId: input.userId,
    catalogGameId: input.catalogGameId,
    status: policy.status
  });
}
