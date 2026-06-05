import {
  assignRoleForActivation,
  getFourthGameDecision,
  validateActivePlayLayout,
  type ActivePlayGame
} from "../domain/play-policy";
import type {
  ActivatePlayingGameResult,
  CurrentPlayGameRecord,
  CurrentPlayRecord,
  DeactivatePlayingGameResult,
  PlayRepository
} from "./ports";

export async function activatePlayingGameUseCase(
  input: {
    userId: string;
    catalogGameId: string;
  },
  repository: PlayRepository
): Promise<ActivatePlayingGameResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return {
        ok: false,
        reason: "membership-required"
      };
    }

    await transaction.lockActivePlaySet({ duoId: membership.duoId });

    const libraryGame = await transaction.readLibraryGameForActivation({
      duoId: membership.duoId,
      catalogGameId: input.catalogGameId
    });

    if (!libraryGame) {
      return {
        ok: false,
        reason: "library-game-not-found"
      };
    }

    const currentActiveGames = await transaction.readActivePlayGames({
      duoId: membership.duoId
    });
    const existingActiveGame = currentActiveGames.find(
      (game) => game.libraryGameId === libraryGame.id
    );

    if (existingActiveGame && libraryGame.status === "jogando") {
      return {
        ok: true,
        outcome: "already-playing",
        activeGame: existingActiveGame,
        activeGames: currentActiveGames,
        currentPlay: createCurrentPlay(await transaction.readCurrentPlayGames({
          duoId: membership.duoId
        }))
      };
    }

    const fourthDecision = getFourthGameDecision(currentActiveGames.map(toPolicyActiveGame));

    if (!fourthDecision.ok || fourthDecision.value.allowed === false) {
      const currentGames = await transaction.readCurrentPlayGames({
        duoId: membership.duoId
      });

      return {
        ok: false,
        reason: "replacement-required",
        replacement: {
          availableActions: ["pause", "replace", "cancel"],
          autoPause: false,
          currentGames
        }
      };
    }

    const assignment = assignRoleForActivation(currentActiveGames.map(toPolicyActiveGame));

    if (!assignment.ok) {
      return {
        ok: false,
        reason: "invalid-active-layout"
      };
    }

    const activeGames = await transaction.activatePlayingLibraryGame({
      duoId: membership.duoId,
      actorUserId: input.userId,
      libraryGameId: libraryGame.id,
      role: assignment.value.role,
      position: assignment.value.position
    });
    const activeGame = activeGames.find((game) => game.libraryGameId === libraryGame.id);

    if (!activeGame) {
      return {
        ok: false,
        reason: "invalid-active-layout"
      };
    }

    return {
      ok: true,
      outcome:
        activeGame.role === "principal" ? "principal-assigned" : "secondary-assigned",
      activeGame,
      activeGames,
      currentPlay: createCurrentPlay(await transaction.readCurrentPlayGames({
        duoId: membership.duoId
      }))
    };
  });
}

export async function deactivatePlayingGameUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    nextStatus: "wishlist" | "pausado";
  },
  repository: PlayRepository
): Promise<DeactivatePlayingGameResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return {
        ok: false,
        reason: "membership-required"
      };
    }

    await transaction.lockActivePlaySet({ duoId: membership.duoId });

    const libraryGame = await transaction.readLibraryGameForActivation({
      duoId: membership.duoId,
      catalogGameId: input.catalogGameId
    });

    if (!libraryGame) {
      return {
        ok: false,
        reason: "library-game-not-found"
      };
    }

    const activeGames = await transaction.deactivatePlayingLibraryGame({
      duoId: membership.duoId,
      actorUserId: input.userId,
      libraryGameId: libraryGame.id,
      nextStatus: input.nextStatus
    });
    const layout = validateActivePlayLayout(activeGames.map(toPolicyActiveGame));

    if (!layout.ok) {
      return {
        ok: false,
        reason: "invalid-active-layout"
      };
    }

    return {
      ok: true,
      activeGames,
      currentPlay: createCurrentPlay(await transaction.readCurrentPlayGames({
        duoId: membership.duoId
      }))
    };
  });
}

function createCurrentPlay(games: CurrentPlayGameRecord[]): CurrentPlayRecord {
  return {
    games,
    principal: games.find((game) => game.role === "principal") ?? null,
    secondaries: games.filter((game) => game.role === "secondary"),
    limit: 3
  };
}

function toPolicyActiveGame(game: {
  id: string;
  role: ActivePlayGame["role"];
  position: number;
}): ActivePlayGame {
  return {
    id: game.id,
    role: game.role,
    position: game.position
  };
}
