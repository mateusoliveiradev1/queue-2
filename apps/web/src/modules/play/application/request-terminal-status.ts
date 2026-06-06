import {
  createTerminalRequest,
  isTerminalTargetStatus,
  type TerminalTargetStatus
} from "../domain/play-policy";
import type {
  PlayGamificationXpAwardRecord,
  PlayRepository,
  PlayRewardSummary,
  PlayTerminalRequestRecord
} from "./ports";
import type { PlayXpAwardRecord } from "./ports";

export type RequestTerminalStatusResult =
  | {
      ok: true;
      request: PlayTerminalRequestRecord;
      state: "pending";
    }
  | {
      ok: false;
      reason:
        | "invalid-terminal-status"
        | "library-game-not-found"
        | "membership-required"
        | "not-playing";
    };

export type CancelTerminalStatusResult =
  | {
      ok: true;
      request: PlayTerminalRequestRecord;
    }
  | {
      ok: false;
      reason: "membership-required" | "terminal-request-not-pending";
    };

export type ConfirmTerminalStatusResult =
  | {
      ok: true;
      request: PlayTerminalRequestRecord;
      reward: PlayRewardSummary | null;
      state: "confirmed";
      xpAward: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "partner-confirmation-required"
        | "reward-application-failed"
        | "terminal-request-not-pending";
      rewardFailureReason?: string;
    };

export async function requestTerminalStatusUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    targetStatus: string;
  },
  repository: PlayRepository
): Promise<RequestTerminalStatusResult> {
  if (!isTerminalTargetStatus(input.targetStatus)) {
    return { ok: false, reason: "invalid-terminal-status" };
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

    const request = createTerminalRequest({
      targetStatus: input.targetStatus,
      requestedByUserId: input.userId
    });

    if (!request.ok) {
      return { ok: false, reason: "invalid-terminal-status" };
    }

    const record = await transaction.createTerminalRequest({
      duoId: membership.duoId,
      libraryGameId: detail.libraryGameId,
      targetStatus: request.value.targetStatus,
      actorUserId: input.userId
    });

    await transaction.insertNotificationItem({
      duoId: membership.duoId,
      actorUserId: input.userId,
      notificationType: "terminal-request",
      actionRefType: "terminal_request",
      actionRefId: record.id,
      title: `Confirmar ${terminalStatusLabel(record.targetStatus)}`,
      body: "A biblioteca so muda depois da confirmacao do outro membro."
    });

    return {
      ok: true,
      request: record,
      state: "pending"
    };
  });
}

export async function cancelTerminalStatusUseCase(
  input: {
    userId: string;
    requestId: string;
  },
  repository: PlayRepository
): Promise<CancelTerminalStatusResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const request = await transaction.cancelTerminalRequest({
      duoId: membership.duoId,
      requestId: input.requestId,
      actorUserId: input.userId
    });

    return request
      ? { ok: true, request }
      : { ok: false, reason: "terminal-request-not-pending" };
  });
}

export async function confirmTerminalStatusUseCase(
  input: {
    userId: string;
    requestId: string;
  },
  repository: PlayRepository
): Promise<ConfirmTerminalStatusResult> {
  try {
    return await repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const request = await transaction.confirmTerminalRequest({
      duoId: membership.duoId,
      requestId: input.requestId,
      actorUserId: input.userId
    });

    if (!request) {
      return {
        ok: false,
        reason: "partner-confirmation-required"
      };
    }

    const rewardResult = await transaction.applyGamificationFact({
      duoId: membership.duoId,
      actorUserId: input.userId,
      sourceType: request.targetStatus === "zerado" ? "terminal-zerado" : "terminal-dropado",
      sourceId: request.id,
      occurredAt: request.updatedAt,
      confirmedDuoFact: true,
      metadata: {
        libraryGameId: request.libraryGameId,
        terminalStatus: request.targetStatus
      }
    });

    if (!rewardResult.ok) {
      throw new RewardApplicationError(rewardResult.reason);
    }

    return {
      ok: true,
      request,
      reward: rewardResult.summary,
      state: "confirmed",
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

function terminalStatusLabel(status: TerminalTargetStatus): string {
  return status === "zerado" ? "Zerado" : "Dropado";
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
