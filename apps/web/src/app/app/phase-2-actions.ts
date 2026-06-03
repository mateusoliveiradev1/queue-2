"use server";

import { redirect } from "next/navigation";

import {
  addGameToWishlist,
  moveLibraryGame,
  updateMemberPlatforms
} from "../../modules/library";
import { requireVerifiedSession } from "../../platform/auth/session";

export async function addGameToWishlistAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedSession();
  const catalogGameId = getFormString(formData, "catalogGameId");
  const returnTo = getSafeReturnTo(formData, "/app/biblioteca");

  if (!catalogGameId) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await addGameToWishlist({
    userId: session.user.id,
    catalogGameId
  });

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(
    withState(
      returnTo,
      result.ok ? "wishlist-adicionada" : "jogo-nao-encontrado"
    )
  );
}

export async function moveLibraryGameAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedSession();
  const catalogGameId = getFormString(formData, "catalogGameId");
  const status = getFormString(formData, "status");
  const returnTo = getSafeReturnTo(formData, "/app/biblioteca");

  if (!catalogGameId || !status) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await moveLibraryGame({
    userId: session.user.id,
    catalogGameId,
    status
  });

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(withState(returnTo, moveResultToState(result)));
}

export async function updateMemberPlatformsAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedSession();
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
