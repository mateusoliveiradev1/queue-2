import {
  getLibraryMovePolicy
} from "../domain/library-policy";
import type {
  LibraryPlayCoordinator,
  LibraryRepository,
  MoveLibraryGameResult
} from "./ports";

export async function moveLibraryGameUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    status: string;
  },
  repository: LibraryRepository,
  playCoordinator?: LibraryPlayCoordinator
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
    currentJogandoCount:
      input.status === "jogando" && playCoordinator
        ? 0
        : currentJogandoCount,
    alreadyJogando: currentGame.status === "jogando"
  });

  if (!policy.ok) {
    return {
      ok: false,
      reason: policy.reason,
      status: "status" in policy ? policy.status : undefined
    };
  }

  if (policy.status === "jogando" && playCoordinator) {
    const activation = await playCoordinator.activatePlayingGame({
      userId: input.userId,
      catalogGameId: input.catalogGameId
    });

    if (!activation.ok) {
      if (activation.reason === "replacement-required") {
        return {
          ok: false,
          reason: "replacement-required",
          replacement: activation.replacement
            ? {
                availableActions: activation.replacement.availableActions,
                autoPause: activation.replacement.autoPause,
                currentGames: activation.replacement.currentGames.map((game) => ({
                  libraryGameId: game.libraryGameId,
                  name: game.catalogGame.name,
                  role: game.role,
                  position: game.position
                }))
              }
            : undefined
        };
      }

      return {
        ok: false,
        reason:
          activation.reason === "membership-required"
            ? "membership-required"
            : activation.reason === "invalid-active-layout"
              ? "invalid-active-layout"
              : "library-game-not-found"
      };
    }

    return {
      ok: true,
      game: {
        ...currentGame,
        status: "jogando",
        statusUpdatedByUserId: input.userId
      },
      playOutcome: activation.outcome
    };
  }

  if (
    currentGame.status === "jogando"
    && policy.status !== "jogando"
    && playCoordinator
  ) {
    const deactivation = await playCoordinator.deactivatePlayingGame({
      userId: input.userId,
      catalogGameId: input.catalogGameId,
      nextStatus: policy.status
    });

    if (!deactivation.ok) {
      return {
        ok: false,
        reason:
          deactivation.reason === "membership-required"
            ? "membership-required"
            : deactivation.reason === "invalid-active-layout"
              ? "invalid-active-layout"
              : "library-game-not-found"
      };
    }

    return {
      ok: true,
      game: {
        ...currentGame,
        status: policy.status,
        statusUpdatedByUserId: input.userId
      },
      playOutcome: "active-removed"
    };
  }

  return repository.moveLibraryGame({
    userId: input.userId,
    catalogGameId: input.catalogGameId,
    status: policy.status
  });
}
