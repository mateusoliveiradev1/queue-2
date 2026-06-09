import type {
  GetRouletteHistoryResult,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteUserId
} from "./ports";

const DEFAULT_HISTORY_LIMIT = 12;
const MAX_HISTORY_LIMIT = 30;

export async function getRouletteHistoryUseCase(
  input: { userId: RouletteUserId; limit?: number },
  repository: Pick<RouletteRepository, "withUserTransaction">
): Promise<GetRouletteHistoryResult> {
  return repository.withUserTransaction(input.userId, (transaction) =>
    getRouletteHistoryFromTransaction(input, transaction)
  );
}

export async function getRouletteHistoryFromTransaction(
  input: { userId: RouletteUserId; limit?: number },
  transaction: RouletteRepositoryTransaction
): Promise<GetRouletteHistoryResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  const history = await transaction.readHistory({
    duoId: membership.duoId,
    limit: normalizeHistoryLimit(input.limit)
  });

  return { history, ok: true };
}

function normalizeHistoryLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.trunc(limit as number)));
}
