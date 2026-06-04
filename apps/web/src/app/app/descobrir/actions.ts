"use server";

import { redirect } from "next/navigation";

import {
  handoffDiscoveryMatchToLibrary,
  isDiscoveryDecision,
  isDiscoverySourceMode,
  recordDiscoveryDecision
} from "../../../modules/discovery";
import { requireVerifiedSession } from "../../../platform/auth/session";

export async function recordDiscoveryDecisionAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedSession();
  const catalogGameId = getFormString(formData, "catalogGameId");
  const decision = getFormString(formData, "decision");
  const sourceMode = getFormString(formData, "sourceMode") || "deck";
  const returnTo = getSafeReturnTo(formData, "/app/descobrir");

  if (
    !catalogGameId ||
    !isDiscoveryDecision(decision) ||
    !isDiscoverySourceMode(sourceMode)
  ) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await recordDiscoveryDecision({
    userId: session.user.id,
    catalogGameId,
    decision,
    sourceMode
  });

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(withState(returnTo, decisionResultToState(result)));
}

export async function handoffDiscoveryMatchToLibraryAction(
  formData: FormData
): Promise<void> {
  const session = await requireVerifiedSession();
  const catalogGameId = getFormString(formData, "catalogGameId");
  const status = getFormString(formData, "status");
  const returnTo = getSafeReturnTo(formData, "/app/descobrir");

  if (!catalogGameId || !status) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await handoffDiscoveryMatchToLibrary({
    userId: session.user.id,
    catalogGameId,
    status
  });

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(withState(returnTo, handoffResultToState(result)));
}

function decisionResultToState(
  result: Awaited<ReturnType<typeof recordDiscoveryDecision>>
): string {
  if (!result.ok) {
    return result.reason === "catalog-game-not-found"
      ? "jogo-nao-encontrado"
      : "acao-invalida";
  }

  switch (result.state.kind) {
    case "match-created":
      return "match-criado";
    case "already-matched":
      return "match-ja-existe";
    case "cooldown-set":
      return "cooldown-definido";
    case "card-advanced":
      return "card-avancado";
  }
}

function handoffResultToState(
  result: Awaited<ReturnType<typeof handoffDiscoveryMatchToLibrary>>
): string {
  if (result.ok) {
    return "biblioteca-atualizada";
  }

  switch (result.reason) {
    case "catalog-game-not-found":
      return "jogo-nao-encontrado";
    case "library-game-not-found":
      return "biblioteca-nao-encontrada";
    case "future-confirmation-required":
      return "estado-futuro-bloqueado";
    case "jogando-limit-reached":
      return "limite-jogando";
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
