import {
  LIVE_SESSION_CONFIRMATION_XP
} from "../domain/play-policy";
import type {
  PlayProgressRecord,
  PlayRepository,
  PlaySessionDetailRecord,
  PlayXpAwardRecord
} from "./ports";

export type ConfirmPlaySessionResult =
  | {
      ok: true;
      state: "waiting-partner" | "confirmed";
      detail: PlaySessionDetailRecord;
      progress?: PlayProgressRecord;
      xpAward?: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason: "already-confirmed" | "membership-required" | "session-not-found";
    };

export async function confirmPlaySessionUseCase(
  input: {
    userId: string;
    sessionId: string;
  },
  repository: PlayRepository
): Promise<ConfirmPlaySessionResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
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
      actorUserId: input.userId,
      xpAmount: detail.kind === "live" ? LIVE_SESSION_CONFIRMATION_XP : 0
    });

    return {
      ok: true,
      state: "confirmed",
      detail,
      progress: effect?.progress,
      xpAward: effect?.xpAward ?? null
    };
  });
}
