import type {
  PlayRepository,
  PlaySessionRecord
} from "./ports";

export type LogOfflineSessionResult =
  | {
      ok: true;
      session: PlaySessionRecord;
      state: "pending-confirmation";
    }
  | {
      ok: false;
      reason:
        | "duration-out-of-range"
        | "library-game-not-found"
        | "membership-required"
        | "not-playing";
    };

export async function logOfflineSessionUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    durationMinutes: number;
    now?: Date;
  },
  repository: PlayRepository
): Promise<LogOfflineSessionResult> {
  const durationSeconds = Math.floor(input.durationMinutes) * 60;

  if (durationSeconds < 5 * 60 || durationSeconds > 12 * 60 * 60) {
    return { ok: false, reason: "duration-out-of-range" };
  }

  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const detail = await transaction.readGamePlayDetail({
      duoId: membership.duoId,
      catalogGameId: input.catalogGameId
    });

    if (!detail) {
      return { ok: false, reason: "library-game-not-found" };
    }

    if (detail.libraryStatus !== "jogando" || !detail.activeGame) {
      return { ok: false, reason: "not-playing" };
    }

    const endedAt = input.now ?? new Date();
    const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
    const session = await transaction.createSession({
      duoId: membership.duoId,
      libraryGameId: detail.libraryGameId,
      kind: "offline",
      status: "pending_confirmation",
      startedAt,
      endedAt,
      durationSeconds,
      actorUserId: input.userId
    });

    for (const userId of membership.memberUserIds) {
      await transaction.insertNotificationItem({
        duoId: membership.duoId,
        actorUserId: input.userId,
        recipientUserId: userId,
        notificationType: "session-confirmation",
        actionRefType: "play_session",
        actionRefId: session.id,
        title: "Confirmar Jogamos Hoje",
        body: "A sessao offline so vira progresso depois da confirmacao dos dois."
      });
    }

    return {
      ok: true,
      session,
      state: "pending-confirmation"
    };
  });
}
