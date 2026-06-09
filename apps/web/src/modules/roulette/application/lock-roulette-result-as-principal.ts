import type {
  LockRouletteResultAsPrincipalInput,
  LockRouletteResultAsPrincipalResult,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundRecord
} from "./ports";

type PlayReplacementDecision = {
  availableActions: readonly ["pause", "replace", "cancel"];
  autoPause: false;
  currentGames: unknown[];
};

type RoulettePlayResolutionCoordinator = {
  activatePlayingGame(input: {
    userId: string;
    catalogGameId: string;
  }): Promise<
    | {
        ok: true;
        outcome: "principal-assigned" | "secondary-assigned" | "already-playing";
        activeGame: {
          libraryGameId: string;
          role: "principal" | "secondary";
        };
      }
    | {
        ok: false;
        reason: string;
        replacement?: PlayReplacementDecision;
      }
  >;
  createOperationalPlayNotification(input: {
    actorUserId: string;
    notificationType: "roulette-result-locked";
    resultLibraryGameId: string;
    roundId: string;
  }): Promise<{ ok: boolean }>;
  promotePlayingGame(input: {
    userId: string;
    libraryGameId: string;
  }): Promise<{ ok: true } | { ok: false; reason: string }>;
  replacePlayingGame(input: {
    userId: string;
    incomingLibraryGameId: string;
    pausedLibraryGameId: string;
    makePrincipal: true;
  }): Promise<{ ok: true } | { ok: false; reason: string }>;
};

export async function lockRouletteResultAsPrincipalUseCase(
  input: LockRouletteResultAsPrincipalInput,
  repository: Pick<RouletteRepository, "withUserTransaction">,
  playCoordinator: RoulettePlayResolutionCoordinator
): Promise<LockRouletteResultAsPrincipalResult> {
  return repository.withUserTransaction(input.userId, (transaction) =>
    lockRouletteResultAsPrincipalFromTransaction(input, transaction, playCoordinator)
  );
}

export async function lockRouletteResultAsPrincipalFromTransaction(
  input: LockRouletteResultAsPrincipalInput,
  transaction: RouletteRepositoryTransaction,
  playCoordinator: RoulettePlayResolutionCoordinator
): Promise<LockRouletteResultAsPrincipalResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  const round = await transaction.readRoundById({
    duoId: membership.duoId,
    roundId: input.roundId
  });

  if (!round) {
    return { ok: false, reason: "round-not-found" };
  }

  if (round.status !== "pending_invitation") {
    return { ok: false, reason: "round-not-pending" };
  }

  if (!round.resultCatalogGameId) {
    return { ok: false, reason: "play-handoff-failed" };
  }

  const handoff = await handOffResultToPlay({
    input,
    playCoordinator,
    round
  });

  if (!handoff.ok) {
    return handoff.result;
  }

  const resolvedAt = new Date();
  const lockedRound = await transaction.lockRoundResult({
    actorUserId: input.userId,
    duoId: membership.duoId,
    resolvedAt,
    roundId: round.id
  });

  if (!lockedRound) {
    return { ok: false, reason: "round-not-pending" };
  }

  await transaction.insertHistoryEvent({
    actorUserId: input.userId,
    duoId: membership.duoId,
    eventKey: `history:${round.id}:locked`,
    eventType: "locked",
    metadata: {
      resultCatalogGameId: round.resultCatalogGameId,
      resultLibraryGameId: round.resultLibraryGameId
    },
    roundId: round.id
  });
  await playCoordinator.createOperationalPlayNotification({
    actorUserId: input.userId,
    notificationType: "roulette-result-locked",
    resultLibraryGameId: round.resultLibraryGameId,
    roundId: round.id
  });

  return {
    ok: true,
    redirectTo: "/app?estado=roleta-principal",
    round: lockedRound
  };
}

async function handOffResultToPlay(input: {
  input: LockRouletteResultAsPrincipalInput;
  playCoordinator: RoulettePlayResolutionCoordinator;
  round: RouletteRoundRecord;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      result: Extract<LockRouletteResultAsPrincipalResult, { ok: false }>;
    }
> {
  const activation = await input.playCoordinator.activatePlayingGame({
    catalogGameId: input.round.resultCatalogGameId!,
    userId: input.input.userId
  });

  if (activation.ok) {
    if (activation.activeGame.libraryGameId !== input.round.resultLibraryGameId) {
      return {
        ok: false,
        result: { ok: false, reason: "play-handoff-failed" }
      };
    }

    if (
      activation.activeGame.role !== "principal"
    ) {
      const promotion = await input.playCoordinator.promotePlayingGame({
        libraryGameId: input.round.resultLibraryGameId,
        userId: input.input.userId
      });

      if (!promotion.ok) {
        return {
          ok: false,
          result: { ok: false, reason: "play-handoff-failed" }
        };
      }
    }

    return { ok: true };
  }

  if (activation.reason !== "replacement-required") {
    return {
      ok: false,
      result: { ok: false, reason: "play-handoff-failed" }
    };
  }

  const replacement = activation.replacement ?? {
    availableActions: ["pause", "replace", "cancel"],
    autoPause: false as const,
    currentGames: []
  };

  if (
    input.input.replacement?.action === "replace"
    && input.input.replacement.libraryGameId
  ) {
    const replacementResult = await input.playCoordinator.replacePlayingGame({
      incomingLibraryGameId: input.round.resultLibraryGameId,
      makePrincipal: true,
      pausedLibraryGameId: input.input.replacement.libraryGameId,
      userId: input.input.userId
    });

    if (replacementResult.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      result: { ok: false, reason: "play-handoff-failed" }
    };
  }

  return {
    ok: false,
    result: {
      autoPause: replacement.autoPause,
      currentGames: replacement.currentGames,
      ok: false,
      reason: "replacement-required"
    }
  };
}
