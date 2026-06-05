"use server";

import { revalidatePath } from "next/cache";

import {
  promotePlayingGame,
  reorderPlayingGames
} from "../../modules/play";
import { requireAuthoritativeVerifiedSession } from "../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../platform/performance/server-timing";

const reorderTimingContext = { action: "play.order.reorder" } as const;
const promoteTimingContext = { action: "play.order.promote" } as const;

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
