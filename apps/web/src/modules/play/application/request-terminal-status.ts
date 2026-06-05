import {
  createTerminalRequest,
  isTerminalTargetStatus,
  type TerminalTargetStatus
} from "../domain/play-policy";
import type {
  PlayRepository,
  PlayTerminalRequestRecord
} from "./ports";

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
      state: "confirmed";
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "partner-confirmation-required"
        | "terminal-request-not-pending";
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
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const request = await transaction.confirmTerminalRequest({
      duoId: membership.duoId,
      requestId: input.requestId,
      actorUserId: input.userId
    });

    return request
      ? {
          ok: true,
          request,
          state: "confirmed"
        }
      : {
          ok: false,
          reason: "partner-confirmation-required"
        };
  });
}

function terminalStatusLabel(status: TerminalTargetStatus): string {
  return status === "zerado" ? "Zerado" : "Dropado";
}
