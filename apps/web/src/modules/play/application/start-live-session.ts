import {
  evaluateLiveSessionStart,
  getServerElapsedSeconds
} from "../domain/play-policy";
import type {
  PlayRepository,
  PlaySessionRecord
} from "./ports";

export type StartLiveSessionResult =
  | {
      ok: true;
      state: "started";
      session: PlaySessionRecord;
      serverNow: Date;
      elapsedSeconds: number;
    }
  | {
      ok: false;
      reason:
        | "active-live-session-exists"
        | "library-game-not-found"
        | "membership-required"
        | "not-playing"
        | "pending-confirmation-exists";
      activeSession?: PlaySessionRecord;
      serverNow?: Date;
      elapsedSeconds?: number;
    };

export async function startLiveSessionUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    now?: Date;
  },
  repository: PlayRepository
): Promise<StartLiveSessionResult> {
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

    if (detail.pendingSessions.length > 0) {
      return { ok: false, reason: "pending-confirmation-exists" };
    }

    const serverNow = input.now ?? new Date();
    const activeSession = await transaction.readActiveLiveSession({
      duoId: membership.duoId
    });
    const startDecision = evaluateLiveSessionStart({
      activeLiveSessionId: activeSession?.id ?? null
    });

    if (!startDecision.ok && activeSession) {
      return {
        ok: false,
        reason: "active-live-session-exists",
        activeSession,
        serverNow,
        elapsedSeconds: getServerElapsedSeconds({
          serverNow,
          serverStartedAt: activeSession.startedAt
        })
      };
    }

    const session = await transaction.createSession({
      duoId: membership.duoId,
      libraryGameId: detail.libraryGameId,
      kind: "live",
      status: "active",
      startedAt: serverNow,
      actorUserId: input.userId
    });

    await transaction.insertNotificationItem({
      duoId: membership.duoId,
      actorUserId: input.userId,
      notificationType: "live-session",
      actionRefType: "play_session",
      actionRefId: session.id,
      title: "Sessao ao vivo iniciada",
      body: "A dupla tem uma sessao ao vivo em andamento."
    });

    return {
      ok: true,
      state: "started",
      session,
      serverNow,
      elapsedSeconds: 0
    };
  });
}
