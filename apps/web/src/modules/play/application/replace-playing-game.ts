import {
  validateActivePlayLayout,
  type ActivePlayGame,
  type PlayGameRole
} from "../domain/play-policy";
import type {
  CurrentPlayGameRecord,
  CurrentPlayRecord,
  PlayLibraryGameId,
  PlayRepository,
  ReplacePlayingGameResult
} from "./ports";

export async function replacePlayingGameUseCase(
  input: {
    userId: string;
    incomingLibraryGameId: string;
    pausedLibraryGameId: string;
    makePrincipal: true;
  },
  repository: PlayRepository
): Promise<ReplacePlayingGameResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return {
        ok: false,
        reason: "membership-required"
      };
    }

    await transaction.lockActivePlaySet({ duoId: membership.duoId });

    const currentGames = await transaction.readCurrentPlayGames({
      duoId: membership.duoId
    });
    const currentLayout = validateActivePlayLayout(
      currentGames.map(toPolicyActiveGameByLibraryGameId)
    );

    if (!currentLayout.ok || input.incomingLibraryGameId === input.pausedLibraryGameId) {
      return {
        ok: false,
        reason: "invalid-active-layout"
      };
    }

    const selectedPausedGame = currentGames.find(
      (game) => game.libraryGameId === input.pausedLibraryGameId
    );

    if (!selectedPausedGame) {
      return {
        ok: false,
        reason: "active-game-not-found"
      };
    }

    const incomingLibraryGame = await transaction.readLibraryGameForReplacement({
      duoId: membership.duoId,
      libraryGameId: input.incomingLibraryGameId
    });

    if (!incomingLibraryGame) {
      return {
        ok: false,
        reason: "library-game-not-found"
      };
    }

    const replacementGames = createReplacementLayout({
      currentGames,
      incomingLibraryGameId: incomingLibraryGame.id,
      pausedLibraryGameId: selectedPausedGame.libraryGameId
    });
    const replacementLayout = validateActivePlayLayout(
      replacementGames.map(toPolicyActiveGameByLibraryGameId)
    );

    if (!replacementLayout.ok) {
      return {
        ok: false,
        reason: "invalid-active-layout"
      };
    }

    const activeGames = await transaction.replacePlayingGameActiveSet({
      duoId: membership.duoId,
      actorUserId: input.userId,
      incomingLibraryGameId: incomingLibraryGame.id,
      pausedLibraryGameId: selectedPausedGame.libraryGameId,
      games: replacementGames
    });
    const writtenLayout = validateActivePlayLayout(
      activeGames.map(toPolicyActiveGameByLibraryGameId)
    );

    if (!writtenLayout.ok) {
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

function createReplacementLayout(input: {
  currentGames: CurrentPlayGameRecord[];
  incomingLibraryGameId: PlayLibraryGameId;
  pausedLibraryGameId: PlayLibraryGameId;
}): Array<{
  libraryGameId: PlayLibraryGameId;
  role: PlayGameRole;
  position: number;
}> {
  const remainingGames = input.currentGames.filter(
    (game) =>
      game.libraryGameId !== input.pausedLibraryGameId
      && game.libraryGameId !== input.incomingLibraryGameId
  );

  return [
    {
      libraryGameId: input.incomingLibraryGameId,
      role: "principal",
      position: 1
    },
    ...remainingGames.slice(0, 2).map((game, index) => ({
      libraryGameId: game.libraryGameId,
      role: "secondary" as const,
      position: index + 2
    }))
  ];
}

function createCurrentPlay(games: CurrentPlayGameRecord[]): CurrentPlayRecord {
  return {
    games,
    principal: games.find((game) => game.role === "principal") ?? null,
    secondaries: games.filter((game) => game.role === "secondary"),
    limit: 3
  };
}

function toPolicyActiveGameByLibraryGameId(game: {
  libraryGameId: string;
  role: ActivePlayGame["role"];
  position: number;
}): ActivePlayGame {
  return {
    id: game.libraryGameId,
    role: game.role,
    position: game.position
  };
}
