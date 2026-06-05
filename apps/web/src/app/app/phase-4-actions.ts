"use server";

import { revalidatePath } from "next/cache";

import {
  cancelTerminalStatus,
  cancelScheduledSession,
  confirmPlaySession,
  confirmScheduledSession,
  confirmTerminalStatus,
  createMomento,
  createPlayChapter,
  endLiveSession,
  logOfflineSession,
  promotePlayingGame,
  requestTerminalStatus,
  reorderPlayingGames,
  schedulePlaySession,
  startLiveSession,
  setPlayChapterCompletion,
  updatePlayProgress,
  revealMomentoSpoiler
} from "../../modules/play";
import { requireAuthoritativeVerifiedSession } from "../../platform/auth/session";
import {
  measureStage,
  type ServerTimingContext,
  withServerTiming
} from "../../platform/performance/server-timing";

const reorderTimingContext = { action: "play.order.reorder" } as const;
const promoteTimingContext = { action: "play.order.promote" } as const;
const sessionTimingContext = { action: "play.session" } as const;
const progressTimingContext = { action: "play.progress" } as const;
const chapterTimingContext = { action: "play.chapter" } as const;
const terminalTimingContext = { action: "play.terminal" } as const;
const timelineTimingContext = { action: "play.timeline" } as const;

export type PlayOrderMutationResult =
  | {
      ok: true;
      state: "ordem-atualizada" | "principal-atualizado";
    }
  | {
      ok: false;
      reason:
        | "invalid-active-layout"
        | "invalid-input"
        | "invalid-order"
        | "membership-required"
        | "not-secondary-game";
      state: string;
      redirectTo?: string;
    };

export type PlayJourneyMutationResult =
  | {
      ok: true;
      state: string;
      redirectTo?: string;
    }
  | {
      ok: false;
      reason: string;
      state: string;
      redirectTo?: string;
    };

export async function reorderPlayingGamesAction(
  formData: FormData
): Promise<PlayOrderMutationResult> {
  return withServerTiming(reorderTimingContext, () =>
    reorderPlayingGamesActionTimed(formData)
  );
}

export async function promotePlayingGameAction(
  formData: FormData
): Promise<PlayOrderMutationResult> {
  return withServerTiming(promoteTimingContext, () =>
    promotePlayingGameActionTimed(formData)
  );
}

export async function startLiveSessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "start-live", sessionTimingContext)
  );
}

export async function endLiveSessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "end-live", sessionTimingContext)
  );
}

export async function confirmPlaySessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "confirm-session", sessionTimingContext)
  );
}

export async function logOfflineSessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "log-offline", sessionTimingContext)
  );
}

export async function updatePlayProgressAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(progressTimingContext, () =>
    playJourneyActionTimed(formData, "update-progress", progressTimingContext)
  );
}

export async function createPlayChapterAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(chapterTimingContext, () =>
    playJourneyActionTimed(formData, "create-chapter", chapterTimingContext)
  );
}

export async function setPlayChapterCompletionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(chapterTimingContext, () =>
    playJourneyActionTimed(formData, "set-chapter", chapterTimingContext)
  );
}

export async function requestTerminalStatusAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(terminalTimingContext, () =>
    playJourneyActionTimed(formData, "request-terminal", terminalTimingContext)
  );
}

export async function cancelTerminalStatusAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(terminalTimingContext, () =>
    playJourneyActionTimed(formData, "cancel-terminal", terminalTimingContext)
  );
}

export async function confirmTerminalStatusAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(terminalTimingContext, () =>
    playJourneyActionTimed(formData, "confirm-terminal", terminalTimingContext)
  );
}

export async function schedulePlaySessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "schedule-session", sessionTimingContext)
  );
}

export async function cancelScheduledSessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "cancel-scheduled", sessionTimingContext)
  );
}

export async function confirmScheduledSessionAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(sessionTimingContext, () =>
    playJourneyActionTimed(formData, "confirm-scheduled", sessionTimingContext)
  );
}

export async function createMomentoAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(timelineTimingContext, () =>
    playJourneyActionTimed(formData, "create-momento", timelineTimingContext)
  );
}

export async function revealMomentoSpoilerAction(
  formData: FormData
): Promise<void> {
  await withServerTiming(timelineTimingContext, () =>
    playJourneyActionTimed(formData, "reveal-spoiler", timelineTimingContext)
  );
}

async function reorderPlayingGamesActionTimed(
  formData: FormData
): Promise<PlayOrderMutationResult> {
  const session = await measureStage("auth", reorderTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { orderedLibraryGameIds, gameSlugs } = await measureStage(
    "validation",
    reorderTimingContext,
    async () => ({
      orderedLibraryGameIds: getOrderedLibraryGameIds(formData),
      gameSlugs: getSafeGameSlugs(formData)
    })
  );

  if (orderedLibraryGameIds.length === 0) {
    return {
      ok: false,
      reason: "invalid-input",
      state: "acao-invalida"
    };
  }

  const result = await measureStage("database", reorderTimingContext, () =>
    reorderPlayingGames({
      userId: session.user.id,
      orderedLibraryGameIds
    })
  );

  if (!result.ok && result.reason === "membership-required") {
    return {
      ok: false,
      reason: "membership-required",
      redirectTo: "/parear",
      state: "membership-required"
    };
  }

  await measureStage("revalidation", reorderTimingContext, async () => {
    revalidatePlaySurfaces(gameSlugs);
  });

  return result.ok
    ? {
        ok: true,
        state: "ordem-atualizada"
      }
    : {
        ok: false,
        reason: result.reason,
        state: playOrderReasonToState(result.reason)
      };
}

async function promotePlayingGameActionTimed(
  formData: FormData
): Promise<PlayOrderMutationResult> {
  const session = await measureStage("auth", promoteTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { libraryGameId, gameSlugs } = await measureStage(
    "validation",
    promoteTimingContext,
    async () => ({
      libraryGameId: getFormString(formData, "libraryGameId"),
      gameSlugs: getSafeGameSlugs(formData)
    })
  );

  if (!libraryGameId) {
    return {
      ok: false,
      reason: "invalid-input",
      state: "acao-invalida"
    };
  }

  const result = await measureStage("database", promoteTimingContext, () =>
    promotePlayingGame({
      userId: session.user.id,
      libraryGameId
    })
  );

  if (!result.ok && result.reason === "membership-required") {
    return {
      ok: false,
      reason: "membership-required",
      redirectTo: "/parear",
      state: "membership-required"
    };
  }

  await measureStage("revalidation", promoteTimingContext, async () => {
    revalidatePlaySurfaces(gameSlugs);
  });

  return result.ok
    ? {
        ok: true,
        state: "principal-atualizado"
      }
    : {
        ok: false,
        reason: result.reason,
        state: playOrderReasonToState(result.reason)
      };
}

async function playJourneyActionTimed(
  formData: FormData,
  action:
    | "cancel-scheduled"
    | "cancel-terminal"
    | "confirm-session"
    | "confirm-scheduled"
    | "confirm-terminal"
    | "create-momento"
    | "create-chapter"
    | "end-live"
    | "log-offline"
    | "request-terminal"
    | "reveal-spoiler"
    | "schedule-session"
    | "set-chapter"
    | "start-live"
    | "update-progress",
  timingContext: ServerTimingContext
): Promise<PlayJourneyMutationResult> {
  const session = await measureStage("auth", timingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const gameSlugs = await measureStage("validation", timingContext, async () =>
    getSafeGameSlugs(formData)
  );
  const result = await measureStage("database", timingContext, async () => {
    switch (action) {
      case "start-live":
        return startLiveSession({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId")
        });
      case "end-live":
        return endLiveSession({
          userId: session.user.id,
          sessionId: getFormString(formData, "sessionId")
        });
      case "confirm-session":
        return confirmPlaySession({
          userId: session.user.id,
          sessionId: getFormString(formData, "sessionId")
        });
      case "log-offline":
        return logOfflineSession({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId"),
          durationMinutes: getFormNumber(formData, "durationMinutes")
        });
      case "update-progress":
        return updatePlayProgress({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId"),
          subjectivePercent: getOptionalFormNumber(formData, "subjectivePercent")
        });
      case "create-chapter":
        return createPlayChapter({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId"),
          title: getFormString(formData, "title")
        });
      case "set-chapter":
        return setPlayChapterCompletion({
          userId: session.user.id,
          chapterId: getFormString(formData, "chapterId"),
          completed: getFormString(formData, "completed") === "true"
        });
      case "request-terminal":
        return requestTerminalStatus({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId"),
          targetStatus: getFormString(formData, "targetStatus")
        });
      case "cancel-terminal":
        return cancelTerminalStatus({
          userId: session.user.id,
          requestId: getFormString(formData, "requestId")
        });
      case "confirm-terminal":
        return confirmTerminalStatus({
          userId: session.user.id,
          requestId: getFormString(formData, "requestId")
        });
      case "schedule-session":
        return schedulePlaySession({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId"),
          scheduledLocalDateTime: getFormString(formData, "scheduledLocalDateTime"),
          scheduledSessionId: getFormString(formData, "scheduledSessionId") || null
        });
      case "cancel-scheduled":
        return cancelScheduledSession({
          userId: session.user.id,
          scheduledSessionId: getFormString(formData, "scheduledSessionId")
        });
      case "confirm-scheduled":
        return confirmScheduledSession({
          userId: session.user.id,
          scheduledSessionId: getFormString(formData, "scheduledSessionId")
        });
      case "create-momento":
        return createMomento({
          userId: session.user.id,
          catalogGameId: getFormString(formData, "catalogGameId"),
          body: getFormString(formData, "body"),
          isSpoiler: getFormString(formData, "isSpoiler") === "true",
          sessionId: getFormString(formData, "sessionId") || null
        });
      case "reveal-spoiler":
        return revealMomentoSpoiler({
          userId: session.user.id,
          momentoId: getFormString(formData, "momentoId")
        });
    }
  });

  if (!result.ok && result.reason === "membership-required") {
    return {
      ok: false,
      reason: "membership-required",
      redirectTo: "/parear",
      state: "membership-required"
    };
  }

  await measureStage("revalidation", timingContext, async () => {
    revalidatePlaySurfaces(gameSlugs);
  });

  return result.ok
    ? {
        ok: true,
        state: playJourneySuccessState(action)
      }
    : {
        ok: false,
        reason: result.reason,
        state: playJourneyReasonToState(result.reason)
      };
}

function getOrderedLibraryGameIds(formData: FormData): string[] {
  return formData
    .getAll("libraryGameId")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getSafeGameSlugs(formData: FormData): string[] {
  return [
    ...new Set(
      formData
        .getAll("gameSlug")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(isSafeSlug)
    )
  ];
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormNumber(formData: FormData, key: string): number {
  const value = Number(getFormString(formData, key));
  return Number.isFinite(value) ? value : Number.NaN;
}

function getOptionalFormNumber(formData: FormData, key: string): number | null {
  const raw = getFormString(formData, key);

  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function isSafeSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,159}$/.test(value);
}

function revalidatePlaySurfaces(gameSlugs: string[]): void {
  revalidatePath("/app");
  revalidatePath("/app/biblioteca");

  for (const slug of gameSlugs) {
    revalidatePath(`/app/jogo/${slug}`);
  }
}

function playOrderReasonToState(reason: Exclude<PlayOrderMutationResult, { ok: true }>["reason"]): string {
  switch (reason) {
    case "invalid-active-layout":
      return "fila-jogando-invalida";
    case "invalid-order":
      return "ordem-invalida";
    case "not-secondary-game":
      return "principal-invalido";
    case "membership-required":
      return "membership-required";
    default:
      return "acao-invalida";
  }
}

function playJourneySuccessState(
  action:
    | "cancel-scheduled"
    | "cancel-terminal"
    | "confirm-session"
    | "confirm-scheduled"
    | "confirm-terminal"
    | "create-momento"
    | "create-chapter"
    | "end-live"
    | "log-offline"
    | "request-terminal"
    | "reveal-spoiler"
    | "schedule-session"
    | "set-chapter"
    | "start-live"
    | "update-progress"
): string {
  switch (action) {
    case "start-live":
      return "sessao-ao-vivo-iniciada";
    case "end-live":
      return "sessao-pendente-confirmacao";
    case "confirm-session":
      return "sessao-confirmada";
    case "log-offline":
      return "jogamos-hoje-pendente";
    case "update-progress":
      return "progresso-atualizado";
    case "create-chapter":
      return "capitulo-criado";
    case "set-chapter":
      return "capitulo-atualizado";
    case "request-terminal":
      return "pedido-terminal-pendente";
    case "cancel-terminal":
      return "pedido-terminal-cancelado";
    case "confirm-terminal":
      return "pedido-terminal-confirmado";
    case "schedule-session":
      return "sessao-agendada";
    case "cancel-scheduled":
      return "sessao-agendada-cancelada";
    case "confirm-scheduled":
      return "presenca-confirmada";
    case "create-momento":
      return "momento-criado";
    case "reveal-spoiler":
      return "spoiler-revelado";
  }
}

function playJourneyReasonToState(reason: string): string {
  switch (reason) {
    case "active-live-session-exists":
      return "sessao-ao-vivo-ja-ativa";
    case "already-confirmed":
      return "confirmacao-ja-registrada";
    case "duration-out-of-range":
      return "duracao-invalida";
    case "library-game-not-found":
      return "jogo-fora-da-biblioteca";
    case "invalid-momento":
      return "momento-invalido";
    case "momento-not-found":
      return "momento-nao-encontrado";
    case "not-playing":
      return "jogo-nao-esta-jogando";
    case "partner-confirmation-required":
      return "confirmacao-do-parceiro-obrigatoria";
    case "percent-out-of-range":
      return "percentual-invalido";
    case "session-not-active":
      return "sessao-nao-ativa";
    case "session-not-found":
      return "sessao-nao-encontrada";
    case "invalid-scheduled-time":
      return "horario-invalido";
    case "scheduled-session-not-found":
      return "sessao-agendada-nao-encontrada";
    case "terminal-request-not-pending":
      return "pedido-terminal-nao-pendente";
    default:
      return "acao-invalida";
  }
}
