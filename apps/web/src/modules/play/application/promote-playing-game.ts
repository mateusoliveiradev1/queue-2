import {
  promoteSecondaryToPrincipal,
  validateActivePlayLayout,
  type ActivePlayGame
} from "../domain/play-policy";
import type {
  CurrentPlayGameRecord,
  PlayRepository,
  PromotePlayingGameResult
} from "./ports";

export async function promotePlayingGameUseCase(
  input: {
    userId: string;
    libraryGameId: string;
  },
  repository: PlayRepository
): Promise<PromotePlayingGameResult> {
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
    const promotedLayout = promoteSecondaryToPrincipal(
      currentGames.map(toPolicyActiveGameByLibraryGameId),
      input.libraryGameId
    );

    if (!promotedLayout.ok) {
      return {
        ok: false,
        reason:
          promotedLayout.reason === "not-secondary-game"
            ? "not-secondary-game"
            : "invalid-active-layout"
      };
    }

    const roleByLibraryGameId = new Map(
      promotedLayout.value.map((game) => [game.id, game])
    );
    const writtenGames = await transaction.replaceActiveRoleRows({
      duoId: membership.duoId,
      actorUserId: input.userId,
      games: currentGames.map((game) => {
        const promotedGame = roleByLibraryGameId.get(game.libraryGameId);

        if (!promotedGame) {
          throw new Error("play_promote_layout_missing_game");
        }

        return {
          libraryGameId: game.libraryGameId,
          role: promotedGame.role,
          position: promotedGame.position
        };
      })
    });
    const validLayout = validateActivePlayLayout(writtenGames.map(toPolicyActiveGame));

    if (!validLayout.ok) {
      return {
        ok: false,
        reason: "invalid-active-layout"
      };
    }

    return {
      ok: true,
      currentPlay: createCurrentPlay(await transaction.readCurrentPlayGames({
        duoId: membership.duoId
      }))
    };
  });
}

function createCurrentPlay(games: CurrentPlayGameRecord[]) {
  return {
    games,
    principal: games.find((game) => game.role === "principal") ?? null,
    secondaries: games.filter((game) => game.role === "secondary"),
    limit: 3 as const
  };
}

function toPolicyActiveGameByLibraryGameId(game: CurrentPlayGameRecord): ActivePlayGame {
  return {
    id: game.libraryGameId,
    role: game.role,
    position: game.position
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
