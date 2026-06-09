import {
  ROULETTE_BOOST_COST,
  ROULETTE_MINIMUM_ELIGIBLE_GAMES,
  ROULETTE_PITY_THRESHOLD,
  getEligiblePoolPolicy,
  type RouletteEligibleStatus
} from "../domain/roulette-policy";
import type {
  GetRouletteStateResult,
  RouletteEligibleGameRecord,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteStateView,
  RouletteUserId
} from "./ports";

const eligibleStatusNames = ["wishlist", "pausado"] as const satisfies readonly RouletteEligibleStatus[];
const eligibleStatuses = new Set<string>(eligibleStatusNames);

export async function getRouletteStateUseCase(
  input: { userId: RouletteUserId },
  repository: Pick<RouletteRepository, "withUserTransaction">
): Promise<GetRouletteStateResult> {
  return repository.withUserTransaction(input.userId, (transaction) =>
    getRouletteStateFromTransaction(input, transaction)
  );
}

export async function getRouletteStateFromTransaction(
  input: { userId: RouletteUserId },
  transaction: RouletteRepositoryTransaction
): Promise<GetRouletteStateResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  const poolRecords = await transaction.readEligiblePool({ duoId: membership.duoId });
  const activeRound = await transaction.readActiveRound({ duoId: membership.duoId });
  const boostBalance = await transaction.lockBoostBalance({ duoId: membership.duoId });
  const pityState = await transaction.lockPityState({ duoId: membership.duoId });
  const cooldowns = await transaction.readCooldowns({ duoId: membership.duoId });
  // D-18: roulette state reads the duo audio preference from server storage.
  const audioEnabled = await transaction.readAudioPreference({ duoId: membership.duoId });

  const eligibleGames = filterEligibleGames(poolRecords);
  const baseState = {
    audioEnabled,
    boost: {
      balance: boostBalance.balance,
      canUseBoost: boostBalance.balance >= ROULETTE_BOOST_COST,
      cap: boostBalance.cap
    },
    cooldowns,
    duoId: membership.duoId,
    eligibleGames,
    pity: {
      drawsSinceEpicOrHigher: pityState.drawsSinceEpicOrHigher,
      progressText: buildPityProgressText(pityState.drawsSinceEpicOrHigher),
      threshold: ROULETTE_PITY_THRESHOLD
    }
  } satisfies Omit<RouletteStateView, "state">;

  if (activeRound && isResumableRoundStatus(activeRound.status)) {
    const entries = await transaction.readRoundEntries({
      duoId: membership.duoId,
      roundId: activeRound.id
    });

    return {
      ok: true,
      state: {
        ...baseState,
        entries,
        round: activeRound,
        state: activeRound.status
      }
    };
  }

  const poolPolicy = getEligiblePoolPolicy({
    games: eligibleGames
  });

  if (!poolPolicy.ok) {
    return {
      ok: true,
      state: {
        ...baseState,
        blockedPool: {
          ctas: poolPolicy.ctas,
          eligibleCount: poolPolicy.count,
          reason: "minimum-eligible-pool",
          requiredEligibleCount: ROULETTE_MINIMUM_ELIGIBLE_GAMES
        },
        state: "blocked-pool"
      }
    };
  }

  return {
    ok: true,
    state: {
      ...baseState,
      state: "ready"
    }
  };
}

function filterEligibleGames(
  games: RouletteEligibleGameRecord[]
): RouletteEligibleGameRecord[] {
  return games.filter((game) => eligibleStatuses.has(game.status));
}

function isResumableRoundStatus(status: string): status is RouletteStateView["state"] {
  return status === "active" || status === "revealing" || status === "pending_invitation";
}

function buildPityProgressText(drawsSinceEpicOrHigher: number): string {
  const remaining = Math.max(0, ROULETTE_PITY_THRESHOLD - drawsSinceEpicOrHigher);

  if (remaining === 0) {
    return "Garantia Epic ativa para o proximo resultado elegivel.";
  }

  if (remaining <= 2) {
    return "Garantia Epic se aproximando.";
  }

  return "Garantia Epic em progresso.";
}
