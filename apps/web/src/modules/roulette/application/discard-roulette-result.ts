import {
  ROULETTE_COOLDOWN_MULTIPLIER,
  ROULETTE_COOLDOWN_ROUNDS
} from "../domain/roulette-policy";
import type {
  DiscardRouletteResult,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundId,
  RouletteUserId
} from "./ports";

type RouletteDiscardNotificationCoordinator = {
  createOperationalPlayNotification(input: {
    actorUserId: string;
    notificationType: "roulette-result-discarded";
    resultLibraryGameId: string;
    roundId: string;
  }): Promise<{ ok: boolean }>;
};

export async function discardRouletteResultUseCase(
  input: {
    userId: RouletteUserId;
    roundId: RouletteRoundId;
  },
  repository: Pick<RouletteRepository, "withUserTransaction">,
  playCoordinator: RouletteDiscardNotificationCoordinator
): Promise<DiscardRouletteResult> {
  return repository.withUserTransaction(input.userId, (transaction) =>
    discardRouletteResultFromTransaction(input, transaction, playCoordinator)
  );
}

export async function discardRouletteResultFromTransaction(
  input: {
    userId: RouletteUserId;
    roundId: RouletteRoundId;
  },
  transaction: RouletteRepositoryTransaction,
  playCoordinator: RouletteDiscardNotificationCoordinator
): Promise<DiscardRouletteResult> {
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

  const resolvedAt = new Date();
  const discardedRound = await transaction.discardRoundResult({
    actorUserId: input.userId,
    duoId: membership.duoId,
    resolvedAt,
    roundId: round.id
  });

  if (!discardedRound) {
    return { ok: false, reason: "round-not-pending" };
  }

  const cooldown = await transaction.upsertCooldown({
    duoId: membership.duoId,
    libraryGameId: round.resultLibraryGameId,
    remainingRounds: ROULETTE_COOLDOWN_ROUNDS,
    roundId: round.id,
    weightMultiplier: ROULETTE_COOLDOWN_MULTIPLIER
  });

  await transaction.insertHistoryEvent({
    actorUserId: input.userId,
    duoId: membership.duoId,
    eventKey: `history:${round.id}:discarded`,
    eventType: "discarded",
    metadata: {
      boostRefunded: false,
      boostSpent: round.boostSpent,
      resultLibraryGameId: round.resultLibraryGameId
    },
    roundId: round.id
  });
  await playCoordinator.createOperationalPlayNotification({
    actorUserId: input.userId,
    notificationType: "roulette-result-discarded",
    resultLibraryGameId: round.resultLibraryGameId,
    roundId: round.id
  });

  return {
    cooldown,
    ok: true,
    round: discardedRound
  };
}
