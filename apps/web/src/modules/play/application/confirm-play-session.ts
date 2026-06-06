import type {
  PlayGamificationXpAwardRecord,
  PlayProgressRecord,
  PlayRepository,
  PlayRewardSummary,
  PlaySessionDetailRecord,
  PlayXpAwardRecord
} from "./ports";

export type ConfirmPlaySessionResult =
  | {
      ok: true;
      state: "waiting-partner" | "confirmed";
      detail: PlaySessionDetailRecord;
      progress?: PlayProgressRecord;
      reward?: PlayRewardSummary | null;
      xpAward?: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason:
        | "already-confirmed"
        | "membership-required"
        | "reward-application-failed"
        | "session-not-found";
      rewardFailureReason?: string;
    };

export async function confirmPlaySessionUseCase(
  input: {
    userId: string;
    sessionId: string;
  },
  repository: PlayRepository
): Promise<ConfirmPlaySessionResult> {
  try {
    return await repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const existing = await transaction.readSessionDetail({
      duoId: membership.duoId,
      sessionId: input.sessionId
    });

    if (!existing) {
      return { ok: false, reason: "session-not-found" };
    }

    const confirmation = await transaction.confirmSession({
      duoId: membership.duoId,
      sessionId: input.sessionId,
      userId: input.userId
    });

    if (!confirmation) {
      return {
        ok: false,
        reason: existing.confirmedByUserIds.includes(input.userId)
          ? "already-confirmed"
          : "session-not-found"
      };
    }

    await transaction.markNotificationsActioned({
      duoId: membership.duoId,
      notificationType: "session-confirmation",
      actionRefType: "play_session",
      actionRefId: input.sessionId,
      recipientUserId: input.userId
    });

    const detail = await transaction.readSessionDetail({
      duoId: membership.duoId,
      sessionId: input.sessionId
    });

    if (!detail) {
      return { ok: false, reason: "session-not-found" };
    }

    if (!detail.doubleConfirmed) {
      return {
        ok: true,
        state: "waiting-partner",
        detail
      };
    }

    await transaction.markNotificationsActioned({
      duoId: membership.duoId,
      notificationType: "session-confirmation",
      actionRefType: "play_session",
      actionRefId: input.sessionId
    });

    const effect = await transaction.applyConfirmedSessionEffects({
      duoId: membership.duoId,
      sessionId: input.sessionId,
      actorUserId: input.userId
    });

    if (!effect) {
      return { ok: false, reason: "session-not-found" };
    }

    const rewardResult = await transaction.applyGamificationFact({
      duoId: membership.duoId,
      actorUserId: input.userId,
      sourceType: detail.kind === "live" ? "live-session" : "offline-session",
      sourceId: input.sessionId,
      occurredAt: detail.endedAt ?? detail.startedAt,
      confirmedDuoFact: true,
      metadata: {
        durationSeconds: detail.durationSeconds ?? 0,
        kind: detail.kind,
        libraryGameId: detail.libraryGameId
      }
    });

    if (!rewardResult.ok) {
      throw new RewardApplicationError(rewardResult.reason);
    }

    return {
      ok: true,
      state: "confirmed",
      detail,
      progress: effect.progress,
      reward: rewardResult.summary,
      xpAward: toPlayXpAward(rewardResult.summary.xpAwards[0])
    };
  });
  } catch (error) {
    if (error instanceof RewardApplicationError) {
      return {
        ok: false,
        reason: "reward-application-failed",
        rewardFailureReason: error.reason
      };
    }

    throw error;
  }
}

class RewardApplicationError extends Error {
  constructor(readonly reason: string) {
    super(`play_reward_application_failed:${reason}`);
  }
}

function toPlayXpAward(
  award: PlayGamificationXpAwardRecord | undefined
): PlayXpAwardRecord | null {
  return award
    ? {
        id: award.id,
        duoId: award.duoId,
        awardKey: award.awardKey,
        sourceType: award.sourceType,
        sourceId: award.sourceId,
        amount: award.amount,
        awardedByUserId: award.awardedByUserId,
        metadata: award.metadata,
        awardedAt: award.awardedAt
      }
    : null;
}
