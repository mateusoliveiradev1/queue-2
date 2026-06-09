import { randomUUID } from "node:crypto";

import {
  ROULETTE_BOOST_COST,
  ROULETTE_MINIMUM_ELIGIBLE_GAMES,
  applyPityTransition,
  buildVisualReel,
  getEligiblePoolPolicy,
  selectRouletteResult
} from "../domain/roulette-policy";
import type {
  RouletteBoostLedgerRecord,
  RouletteEligibleGameRecord,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundEntryRecord,
  RouletteRoundRecord,
  StartRouletteRoundInput,
  StartRouletteRoundResult
} from "./ports";

export async function startRouletteRoundUseCase(
  input: StartRouletteRoundInput,
  repository: Pick<RouletteRepository, "withUserTransaction">
): Promise<StartRouletteRoundResult> {
  return repository.withUserTransaction(input.userId, (transaction) =>
    startRouletteRoundFromTransaction(input, transaction)
  );
}

export async function startRouletteRoundFromTransaction(
  input: StartRouletteRoundInput,
  transaction: RouletteRepositoryTransaction
): Promise<StartRouletteRoundResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  const activeRound = await transaction.readActiveRound({ duoId: membership.duoId });

  if (activeRound) {
    return resumeRound(transaction, membership.duoId, activeRound);
  }

  const idempotentRound = await transaction.readRoundByIdempotencyKey({
    duoId: membership.duoId,
    idempotencyKey: input.idempotencyKey
  });

  if (idempotentRound) {
    return resumeRound(transaction, membership.duoId, idempotentRound);
  }

  const eligibleGames = await transaction.readEligiblePool({ duoId: membership.duoId });
  const poolPolicy = getEligiblePoolPolicy({ games: eligibleGames });

  if (!poolPolicy.ok) {
    return {
      eligibleCount: poolPolicy.count,
      ok: false,
      reason: "minimum-eligible-pool",
      requiredEligibleCount: ROULETTE_MINIMUM_ELIGIBLE_GAMES
    };
  }

  const now = input.now ?? new Date();
  const boostBalance = await transaction.materializeBoostFromXp({
    actorUserId: input.userId,
    duoId: membership.duoId,
    now
  });
  const boostRequested = Boolean(input.useBoost ?? input.boostRequested);
  let boostLedger: RouletteBoostLedgerRecord | null = null;

  if (boostRequested) {
    if (boostBalance.balance < ROULETTE_BOOST_COST) {
      return {
        ok: false,
        reason: "insufficient-boost-balance"
      };
    }

    boostLedger = await transaction.insertBoostLedgerEntry({
      actorUserId: input.userId,
      amountDelta: -ROULETTE_BOOST_COST,
      duoId: membership.duoId,
      ledgerKey: `spend:${input.idempotencyKey}`,
      metadata: {
        idempotencyKey: input.idempotencyKey
      },
      reasonCode: "boost-spend",
      roundId: null,
      sourceId: randomUUID(),
      sourceType: "roulette-round"
    });

    if (boostLedger) {
      await transaction.updateBoostBalance({
        balance: boostBalance.balance - ROULETTE_BOOST_COST,
        duoId: membership.duoId
      });
    }
  }

  const [pityState, cooldowns] = await Promise.all([
    transaction.lockPityState({ duoId: membership.duoId }),
    transaction.readCooldowns({ duoId: membership.duoId })
  ]);
  const selection = selectRouletteResult({
    boostRequested,
    eligibleGames,
    pityCount: pityState.drawsSinceEpicOrHigher,
    roll: input.roll,
    seed: input.seed
  });

  if (!selection.ok) {
    return {
      eligibleCount: 0,
      ok: false,
      reason: "minimum-eligible-pool",
      requiredEligibleCount: ROULETTE_MINIMUM_ELIGIBLE_GAMES
    };
  }

  const pityTransition = applyPityTransition({
    drawsSinceEpicOrHigher: pityState.drawsSinceEpicOrHigher,
    resultRarity: selection.result.rarity
  });
  const reelEntries = buildVisualReel({
    eligibleGames,
    seed: input.seed ?? input.idempotencyKey,
    selectedResultId: selection.result.id
  });
  let persistedRound: RouletteRoundRecord | null = null;

  try {
    persistedRound = await transaction.persistRound({
      boostLedgerId: boostLedger?.id ?? null,
      boostSpent: Boolean(boostLedger),
      duoId: membership.duoId,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        cooldownsApplied: cooldowns.map((cooldown) => ({
          libraryGameId: cooldown.libraryGameId,
          remainingRounds: cooldown.remainingRounds,
          weightMultiplier: cooldown.weightMultiplier
        })),
        pityApplied: selection.pityApplied,
        seed: input.seed ?? null
      },
      pityAfter: pityTransition.drawsSinceEpicOrHigher,
      pityBefore: pityState.drawsSinceEpicOrHigher,
      resultCatalogGameId: selection.result.catalogGameId,
      resultLibraryGameId: selection.result.id,
      resultRarity: selection.result.rarity,
      selectedByUserId: input.userId,
      weekendMultiplierApplied: false
    });
  } catch {
    if (boostRequested) {
      await refundPrePersistenceBoost(transaction, {
        duoId: membership.duoId,
        idempotencyKey: input.idempotencyKey,
        userId: input.userId
      });
    }

    return {
      ok: false,
      reason: "round-persist-failed",
      refundedBoost: boostRequested
    };
  }

  try {
    const entries = await transaction.persistRoundEntries({
      duoId: membership.duoId,
      entries: reelEntries,
      roundId: persistedRound.id
    });
    await transaction.updatePityState({
      duoId: membership.duoId,
      drawsSinceEpicOrHigher: pityTransition.drawsSinceEpicOrHigher,
      lastEpicOrHigherAt: pityTransition.qualifiedResult ? now : pityState.lastEpicOrHigherAt
    });
    await transaction.decrementCooldowns({ duoId: membership.duoId });
    await transaction.insertHistoryEvent({
      actorUserId: input.userId,
      duoId: membership.duoId,
      eventKey: `history:${input.idempotencyKey}:revealed`,
      eventType: "revealed",
      metadata: {
        boostSpent: Boolean(boostLedger),
        pityAfter: pityTransition.drawsSinceEpicOrHigher,
        pityBefore: pityState.drawsSinceEpicOrHigher
      },
      roundId: persistedRound.id
    });

    return {
      boostLedger,
      entries,
      ok: true,
      resumedExistingRound: false,
      round: persistedRound
    };
  } catch {
    const resumedRound = await transaction.readRoundByIdempotencyKey({
      duoId: membership.duoId,
      idempotencyKey: input.idempotencyKey
    });

    if (resumedRound) {
      return resumeRound(transaction, membership.duoId, resumedRound);
    }

    throw new Error("roulette_round_post_persistence_resume_failed");
  }
}

async function resumeRound(
  transaction: RouletteRepositoryTransaction,
  duoId: string,
  round: RouletteRoundRecord
): Promise<Extract<StartRouletteRoundResult, { ok: true }>> {
  const entries = await transaction.readRoundEntries({
    duoId,
    roundId: round.id
  });

  return {
    boostLedger: null,
    entries,
    ok: true,
    resumedExistingRound: true,
    round
  };
}

async function refundPrePersistenceBoost(
  transaction: RouletteRepositoryTransaction,
  input: {
    duoId: string;
    idempotencyKey: string;
    userId: string;
  }
): Promise<void> {
  const refund = await transaction.insertBoostLedgerEntry({
    actorUserId: input.userId,
    amountDelta: ROULETTE_BOOST_COST,
    duoId: input.duoId,
    ledgerKey: `refund:${input.idempotencyKey}`,
    metadata: {
      idempotencyKey: input.idempotencyKey
    },
    reasonCode: "pre-persistence-failure",
    roundId: null,
    sourceId: randomUUID(),
    sourceType: "roulette-refund"
  });

  if (refund) {
    await transaction.lockBoostBalance({ duoId: input.duoId });
  }
}
