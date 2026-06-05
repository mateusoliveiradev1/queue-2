import {
  SCHEDULED_SESSION_ATTENDANCE_XP,
  getScheduledSessionAward
} from "../domain/play-policy";
import type {
  PlayRepository,
  PlayScheduledSessionRecord,
  PlayXpAwardRecord
} from "./ports";

export type ConfirmScheduledSessionResult =
  | {
      ok: true;
      scheduledSession: PlayScheduledSessionRecord;
      xpAward: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason: "membership-required" | "scheduled-session-not-found";
    };

export async function confirmScheduledSessionUseCase(
  input: {
    userId: string;
    scheduledSessionId: string;
  },
  repository: PlayRepository
): Promise<ConfirmScheduledSessionResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
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

    const award = getScheduledSessionAward({
      awardAlreadyApplied: false,
      doubleConfirmed: scheduledSession.doubleConfirmed,
      scheduledSessionId: scheduledSession.id
    });
    const xpAward = award.ok
      ? await transaction.insertXpAward({
          amount: SCHEDULED_SESSION_ATTENDANCE_XP,
          awardKey: award.value.awardKey,
          awardedByUserId: input.userId,
          duoId: membership.duoId,
          metadata: {
            scheduledStartAt: scheduledSession.scheduledStartAt.toISOString()
          },
          sourceId: scheduledSession.id,
          sourceType: "scheduled-session"
        })
      : null;

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
      xpAward
    };
  });
}
