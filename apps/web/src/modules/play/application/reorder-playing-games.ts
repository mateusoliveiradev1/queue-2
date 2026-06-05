import {
  validateActivePlayLayout,
  type ActivePlayGame,
  type PlayGameRole
} from "../domain/play-policy";
import type {
  CurrentPlayGameRecord,
  PlayRepository,
  ReorderPlayingGamesResult
} from "./ports";

export async function reorderPlayingGamesUseCase(
  input: {
    userId: string;
    orderedLibraryGameIds: string[];
  },
  repository: PlayRepository
): Promise<ReorderPlayingGamesResult> {
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
    const layout = createLayoutFromProposal(currentGames, input.orderedLibraryGameIds);

    if (!layout.ok) {
      return layout;
    }

    const writtenGames = await transaction.replaceActiveRoleRows({
      duoId: membership.duoId,
      actorUserId: input.userId,
      games: layout.games
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

function createLayoutFromProposal(
  currentGames: CurrentPlayGameRecord[],
  orderedLibraryGameIds: string[]
):
  | {
      ok: true;
      games: Array<{
        libraryGameId: string;
        role: PlayGameRole;
        position: number;
      }>;
    }
  | {
      ok: false;
      reason: "invalid-active-layout" | "invalid-order";
    } {
  if (currentGames.length === 0) {
    return {
      ok: false,
      reason: "invalid-active-layout"
    };
  }

  if (orderedLibraryGameIds.length !== currentGames.length) {
    return {
      ok: false,
      reason: "invalid-order"
    };
  }

  const uniqueIds = new Set(orderedLibraryGameIds);

  if (uniqueIds.size !== orderedLibraryGameIds.length) {
    return {
      ok: false,
      reason: "invalid-order"
    };
  }

  const currentByLibraryGameId = new Map(
    currentGames.map((game) => [game.libraryGameId, game])
  );

  if (!orderedLibraryGameIds.every((id) => currentByLibraryGameId.has(id))) {
    return {
      ok: false,
      reason: "invalid-order"
    };
  }

  return {
    ok: true,
    games: orderedLibraryGameIds.map((libraryGameId, index) => ({
      libraryGameId,
      role: index === 0 ? "principal" : "secondary",
      position: index + 1
    }))
  };
}

function createCurrentPlay(games: CurrentPlayGameRecord[]) {
  return {
    games,
    principal: games.find((game) => game.role === "principal") ?? null,
    secondaries: games.filter((game) => game.role === "secondary"),
    limit: 3 as const
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
