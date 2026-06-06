import { getLevelForXp } from "../domain/level-curve";
import type {
  GamificationProjectionRebuildResult,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationUserId
} from "./ports";

export async function rebuildGamificationProjections(
  input: {
    userId: GamificationUserId;
    duoId?: string | null;
    rebuildKey?: string;
    reasonCode?: string;
    dryRun?: boolean;
  },
  repository?: GamificationRepository
): Promise<GamificationProjectionRebuildResult> {
  const resolvedRepository =
    repository ?? (await import("../infrastructure/gamification-repository")).gamificationRepository;
  const rebuildKey = input.rebuildKey ?? `manual:${new Date().toISOString()}`;
  const reasonCode = input.reasonCode ?? "manual-reconciliation";
  const result = await resolvedRepository.withUserTransaction(input.userId, (transaction) =>
    rebuildGamificationProjectionsInTransaction(
      {
        ...input,
        rebuildKey,
        reasonCode,
        dryRun: input.dryRun ?? false
      },
      transaction
    )
  );

  if (result.ok && !result.dryRun) {
    await resolvedRepository.recordProjectionRebuild({
      duoId: result.duoId,
      rebuildKey,
      status: "completed",
      reasonCode,
      xpBefore: result.before.xp,
      xpAfter: result.after.xp,
      levelBefore: result.before.level.level,
      levelAfter: result.after.level.level,
      streakBefore: result.before.streak,
      streakAfter: result.after.streak,
      metadata: {
        adjustmentDelta: result.adjustmentDelta
      }
    });
  }

  return result;
}

export async function rebuildGamificationProjectionsInTransaction(
  input: {
    userId: GamificationUserId;
    duoId?: string | null;
    rebuildKey: string;
    reasonCode: string;
    dryRun: boolean;
  },
  transaction: GamificationRepositoryTransaction
): Promise<GamificationProjectionRebuildResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  const duoId = input.duoId ?? membership.duoId;

  if (duoId !== membership.duoId) {
    return { ok: false, reason: "duo-mismatch" };
  }

  const projection = await transaction.lockProjection(duoId);

  if (!projection) {
    return { ok: false, reason: "projection-not-found" };
  }

  const ledgerXp = await transaction.sumXpLedgerAwards(duoId);
  const streakState = await transaction.readStreakState(duoId);
  const nextLevel = getLevelForXp(ledgerXp);
  const nextStreak = streakState?.currentStreak ?? projection.streak;
  const nextAvailableFreezes = streakState?.availableFreezes ?? projection.availableFreezes;
  const xpDelta = ledgerXp - projection.xp;
  const before = {
    xp: projection.xp,
    level: projection.level,
    streak: projection.streak
  };
  const after = {
    xp: ledgerXp,
    level: nextLevel,
    streak: nextStreak
  };

  if (input.dryRun) {
    return {
      ok: true,
      dryRun: true,
      rebuildKey: input.rebuildKey,
      duoId,
      before,
      after,
      adjustmentDelta: xpDelta,
      projection
    };
  }

  if (xpDelta !== 0) {
    await transaction.insertAdjustment({
      duoId,
      adjustmentKey: `rebuild:${input.rebuildKey}`,
      amountDelta: xpDelta,
      reasonCode: input.reasonCode,
      actorUserId: input.userId,
      metadata: {
        xpBefore: projection.xp,
        xpAfter: ledgerXp
      }
    });
  }

  const updatedProjection =
    xpDelta !== 0
    || nextLevel.level !== projection.level.level
    || nextStreak !== projection.streak
    || nextAvailableFreezes !== projection.availableFreezes
      ? await transaction.updateProjection({
          duoId,
          xpDelta,
          streak: nextStreak,
          availableFreezes: nextAvailableFreezes
        })
      : projection;

  return {
    ok: true,
    dryRun: false,
    rebuildKey: input.rebuildKey,
    duoId,
    before,
    after,
    adjustmentDelta: xpDelta,
    projection: updatedProjection
  };
}
