import type {
  ReplayRouletteRoundResult,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundId,
  RouletteUserId
} from "./ports";

export async function replayRouletteRoundUseCase(
  input: { userId: RouletteUserId; roundId: RouletteRoundId },
  repository: Pick<RouletteRepository, "withUserTransaction">
): Promise<ReplayRouletteRoundResult> {
  return repository.withUserTransaction(input.userId, (transaction) =>
    replayRouletteRoundFromTransaction(input, transaction)
  );
}

export async function replayRouletteRoundFromTransaction(
  input: { userId: RouletteUserId; roundId: RouletteRoundId },
  transaction: RouletteRepositoryTransaction
): Promise<ReplayRouletteRoundResult> {
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

  if (round.status === "cancelled") {
    return { ok: false, reason: "round-not-replayable" };
  }

  const entries = await transaction.readRoundEntries({
    duoId: membership.duoId,
    roundId: round.id
  });

  return {
    entries,
    isReplay: true,
    ok: true,
    round
  };
}
