"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addGameToWishlist,
  moveLibraryGame,
  updateMemberPlatforms
} from "../../modules/library";
import { requireAuthoritativeVerifiedSession } from "../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../platform/performance/server-timing";

const addWishlistTimingContext = { action: "catalog.wishlist.add" } as const;
const moveLibraryTimingContext = { action: "library.status.move" } as const;

export type EnhancedLibraryMutationResult =
  | { ok: true; state: string }
  | {
      ok: false;
      reason:
        | "catalog-game-not-found"
        | "invalid-input"
        | "library-game-not-found"
        | "membership-required"
        | "future-confirmation-required"
        | "invalid-status"
        | "jogando-limit-reached";
      state: string;
      redirectTo?: string;
    };

export async function addGameToWishlistAction(formData: FormData): Promise<void> {
  return withServerTiming(addWishlistTimingContext, () =>
    addGameToWishlistActionTimed(formData)
  );
}

export async function addGameToWishlistEnhancedAction(
  formData: FormData
): Promise<EnhancedLibraryMutationResult> {
  return withServerTiming(addWishlistTimingContext, () =>
    addGameToWishlistEnhancedActionTimed(formData)
  );
}

async function addGameToWishlistActionTimed(formData: FormData): Promise<void> {
  const session = await measureStage("auth", addWishlistTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { catalogGameId, returnTo } = await measureStage(
    "validation",
    addWishlistTimingContext,
    async () => ({
      catalogGameId: getFormString(formData, "catalogGameId"),
      returnTo: getSafeReturnTo(formData, "/app/biblioteca")
    })
  );

  if (!catalogGameId) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await measureStage("database", addWishlistTimingContext, () =>
    addGameToWishlist({
      userId: session.user.id,
      catalogGameId
    })
  );

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  await measureStage("revalidation", addWishlistTimingContext, async () => {
    revalidateLibrarySurfaces(returnTo);
  });

  redirect(
    withState(
      returnTo,
      result.ok ? "wishlist-adicionada" : "jogo-nao-encontrado"
    )
  );
}

async function addGameToWishlistEnhancedActionTimed(
  formData: FormData
): Promise<EnhancedLibraryMutationResult> {
  const session = await measureStage("auth", addWishlistTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { catalogGameId } = await measureStage(
    "validation",
    addWishlistTimingContext,
    async () => ({
      catalogGameId: getFormString(formData, "catalogGameId")
    })
  );

  if (!catalogGameId) {
    return { ok: false, reason: "invalid-input", state: "acao-invalida" };
  }

  const result = await measureStage("database", addWishlistTimingContext, () =>
    addGameToWishlist({
      userId: session.user.id,
      catalogGameId
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

  if (result.ok) {
    await measureStage("revalidation", addWishlistTimingContext, async () => {
      revalidateEnhancedWishlistSurfaces();
    });

    return { ok: true, state: "wishlist-adicionada" };
  }

  return {
    ok: false,
    reason: "catalog-game-not-found",
    state: "jogo-nao-encontrado"
  };
}

export async function moveLibraryGameAction(formData: FormData): Promise<void> {
  return withServerTiming(moveLibraryTimingContext, () =>
    moveLibraryGameActionTimed(formData)
  );
}

export async function moveLibraryGameEnhancedAction(
  formData: FormData
): Promise<EnhancedLibraryMutationResult> {
  return withServerTiming(moveLibraryTimingContext, () =>
    moveLibraryGameEnhancedActionTimed(formData)
  );
}

async function moveLibraryGameActionTimed(formData: FormData): Promise<void> {
  const session = await measureStage("auth", moveLibraryTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { catalogGameId, status, returnTo } = await measureStage(
    "validation",
    moveLibraryTimingContext,
    async () => ({
      catalogGameId: getFormString(formData, "catalogGameId"),
      status: getFormString(formData, "status"),
      returnTo: getSafeReturnTo(formData, "/app/biblioteca")
    })
  );

  if (!catalogGameId || !status) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await measureStage("database", moveLibraryTimingContext, () =>
    moveLibraryGame({
      userId: session.user.id,
      catalogGameId,
      status
    })
  );

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  await measureStage("revalidation", moveLibraryTimingContext, async () => {
    revalidateLibrarySurfaces(returnTo);
  });

  redirect(withState(returnTo, moveResultToState(result)));
}

async function moveLibraryGameEnhancedActionTimed(
  formData: FormData
): Promise<EnhancedLibraryMutationResult> {
  const session = await measureStage("auth", moveLibraryTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const { catalogGameId, status, returnTo } = await measureStage(
    "validation",
    moveLibraryTimingContext,
    async () => ({
      catalogGameId: getFormString(formData, "catalogGameId"),
      status: getFormString(formData, "status"),
      returnTo: getSafeReturnTo(formData, "/app/biblioteca")
    })
  );

  if (!catalogGameId || !status) {
    return { ok: false, reason: "invalid-input", state: "acao-invalida" };
  }

  const result = await measureStage("database", moveLibraryTimingContext, () =>
    moveLibraryGame({
      userId: session.user.id,
      catalogGameId,
      status
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

  if (result.ok) {
    await measureStage("revalidation", moveLibraryTimingContext, async () => {
      revalidateEnhancedLibrarySurfaces(returnTo);
    });

    return { ok: true, state: "status-atualizado" };
  }

  return {
    ok: false,
    reason: result.reason,
    state: moveResultToState(result)
  };
}

export async function updateMemberPlatformsAction(formData: FormData): Promise<void> {
  const session = await requireAuthoritativeVerifiedSession();
  const returnTo = getSafeReturnTo(formData, "/app/biblioteca");
  const result = await updateMemberPlatforms({
    userId: session.user.id,
    platforms: formData
      .getAll("platforms")
      .filter((value): value is string => typeof value === "string")
  });

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(
    withState(
      returnTo,
      result.ok ? "plataformas-atualizadas" : "plataforma-invalida"
    )
  );
}

function moveResultToState(
  result: Awaited<ReturnType<typeof moveLibraryGame>>
): string {
  if (result.ok) {
    return "status-atualizado";
  }

  switch (result.reason) {
    case "jogando-limit-reached":
      return "limite-jogando";
    case "future-confirmation-required":
      return "estado-futuro-bloqueado";
    case "library-game-not-found":
      return "biblioteca-nao-encontrada";
    default:
      return "acao-invalida";
  }
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnTo(formData: FormData, fallback: string): string {
  const value = getFormString(formData, "returnTo");

  if (!value || value.startsWith("//") || !value.startsWith("/app")) {
    return fallback;
  }

  return value;
}

function withState(path: string, state: string): string {
  const url = new URL(path, "https://queue.local");
  url.searchParams.set("estado", state);
  return `${url.pathname}${url.search}`;
}

function revalidateLibrarySurfaces(returnTo: string): void {
  revalidatePath("/app");
  revalidatePath("/app/biblioteca");
  revalidatePath("/app/catalogo");
  revalidatePath(new URL(returnTo, "https://queue.local").pathname);
}

function revalidateEnhancedLibrarySurfaces(returnTo: string): void {
  revalidatePath("/app/biblioteca");
  revalidatePath(new URL(returnTo, "https://queue.local").pathname);
}

function revalidateEnhancedWishlistSurfaces(): void {
  revalidatePath("/app");
  revalidatePath("/app/biblioteca");
}
