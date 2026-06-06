import type {
  PlayGamificationXpAwardRecord,
  PlayRepository,
  PlayRewardSummary,
  PlayScheduledSessionRecord,
  PlayXpAwardRecord
} from "./ports";

export type ConfirmScheduledSessionResult =
  | {
      ok: true;
      scheduledSession: PlayScheduledSessionRecord;
      reward: PlayRewardSummary | null;
      xpAward: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "reward-application-failed"
        | "scheduled-session-not-found";
      rewardFailureReason?: string;
    };

export async function confirmScheduledSessionUseCase(
  input: {
    userId: string;
    scheduledSessionId: string;
  },
  repository: PlayRepository
): Promise<ConfirmScheduledSessionResult> {
  try {
    return await repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const scheduledSession = await transaction.confirmScheduledAttendance({
      actorUserId: input.userId,
      duoId: membership.duoId,
      memberUserIds: membership.memberUserIds,
      scheduledSessionId: input.scheduledSessionId
    });

    if (!scheduledSession) {
      return { ok: false, reason: "scheduled-session-not-found" };
    }

    const rewardResult = scheduledSession.doubleConfirmed
      ? await transaction.applyGamificationFact({
          duoId: membership.duoId,
          actorUserId: input.userId,
          sourceType: "scheduled-session",
          sourceId: scheduledSession.id,
          occurredAt: scheduledSession.scheduledStartAt,
          confirmedDuoFact: true,
          metadata: {
            scheduledStartAt: scheduledSession.scheduledStartAt.toISOString(),
            timezone: scheduledSession.timezone
          }
        })
      : null;

    if (rewardResult && !rewardResult.ok) {
      throw new RewardApplicationError(rewardResult.reason);
    }

    await transaction.insertNotificationItem({
      actionRefId: scheduledSession.id,
      actionRefType: "scheduled_session",
      actorUserId: input.userId,
      body: scheduledSession.doubleConfirmed
        ? "Presenca confirmada pelos dois. O bonus de compromisso foi registrado uma vez."
        : "A sessao agendada ainda aguarda a outra confirmacao.",
      duoId: membership.duoId,
      notificationType: "scheduled-session",
      title: "Presenca confirmada"
    });

    return {
      ok: true,
      scheduledSession,
      reward: rewardResult?.summary ?? null,
      xpAward: toPlayXpAward(rewardResult?.ok ? rewardResult.summary.xpAwards[0] : undefined)
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
