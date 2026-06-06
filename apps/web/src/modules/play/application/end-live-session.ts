import type {
  PlayRepository,
  PlaySessionRecord
} from "./ports";

export type EndLiveSessionResult =
  | {
      ok: true;
      session: PlaySessionRecord;
      state: "pending-confirmation";
    }
  | {
      ok: false;
      reason: "membership-required" | "session-not-active";
    };

export async function endLiveSessionUseCase(
  input: {
    userId: string;
    sessionId: string;
    now?: Date;
  },
  repository: PlayRepository
): Promise<EndLiveSessionResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const session = await transaction.endLiveSession({
      duoId: membership.duoId,
      sessionId: input.sessionId,
      actorUserId: input.userId,
      endedAt: input.now ?? new Date()
    });

    if (!session) {
      return { ok: false, reason: "session-not-active" };
    }

    await transaction.markNotificationsActioned({
      duoId: membership.duoId,
      notificationType: "live-session",
      actionRefType: "play_session",
      actionRefId: session.id
    });

    for (const userId of membership.memberUserIds) {
      await transaction.insertNotificationItem({
        duoId: membership.duoId,
        actorUserId: input.userId,
        recipientUserId: userId,
        notificationType: "session-confirmation",
        actionRefType: "play_session",
        actionRefId: session.id,
        title: "Confirmar sessao ao vivo",
        body: "A sessao encerrada so vira progresso depois da confirmacao dos dois."
      });
    }

    return {
      ok: true,
      session,
      state: "pending-confirmation"
    };
  });
}
