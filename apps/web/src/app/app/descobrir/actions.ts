"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  answerMoodQuiz,
  getSurpriseRecommendation,
  handoffDiscoveryMatchToLibrary,
  isDiscoveryDecision,
  isDiscoverySourceMode,
  recordDiscoveryDecision,
  startLiveSession
} from "../../../modules/discovery";
import { requireVerifiedSession } from "../../../platform/auth/session";

const uuidSchema = z.string().uuid();

export async function recordDiscoveryDecisionAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedSession();
  const catalogGameId = getFormString(formData, "catalogGameId");
  const decision = getFormString(formData, "decision");
  const sourceMode = getFormString(formData, "sourceMode") || "deck";
  const returnTo = getSafeReturnTo(formData, "/app/descobrir");

  if (
    !isUuid(catalogGameId) ||
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

  if (!isUuid(catalogGameId) || !status) {
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

export async function startDiscoveryLiveSessionAction(
  formData: FormData
): Promise<void> {
  const session = await requireVerifiedSession();
  const returnTo = getSafeReturnTo(formData, "/app/descobrir");
  const result = await startLiveSession({
    userId: session.user.id
  });

  if (!result.ok) {
    redirect(result.reason === "membership-required" ? "/parear" : withState(returnTo, "acao-invalida"));
  }

  redirect(withState(withParam(returnTo, "live", result.session.id), "live-iniciado"));
}

export async function answerMoodQuizAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedSession();
  const returnTo = getSafeReturnTo(formData, "/app/descobrir");
  const energy = getFormString(formData, "energy");
  const commitment = getFormString(formData, "commitment");
  const vibe = getFormString(formData, "vibe");

  if (!isMoodEnergyAnswer(energy) || !isMoodCommitmentAnswer(commitment) || !isMoodVibeAnswer(vibe)) {
    redirect(withState(returnTo, "quiz-invalido"));
  }

  const result = await answerMoodQuiz({
    userId: session.user.id,
    answers: {
      energy,
      commitment,
      vibe
    }
  });

  redirect(
    withState(
      returnTo,
      result.mood.kind === "duo" ? "quiz-completo" : "quiz-preview"
    )
  );
}

export async function getSurpriseRecommendationAction(
  formData: FormData
): Promise<void> {
  const session = await requireVerifiedSession();
  const returnTo = getSafeReturnTo(formData, "/app/descobrir");
  const result = await getSurpriseRecommendation({
    userId: session.user.id
  });

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  if (!result.ok) {
    redirect(withState(returnTo, "surpresa-indisponivel"));
  }

  redirect(
    withState(
      withParam(returnTo, "surpresa", result.card.catalogGameId),
      "surpresa-pronta"
    )
  );
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

function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "https://queue.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

function isMoodEnergyAnswer(value: string): value is "low" | "medium" | "high" {
  return ["low", "medium", "high"].includes(value);
}

function isMoodCommitmentAnswer(value: string): value is "short" | "steady" | "epic" {
  return ["short", "steady", "epic"].includes(value);
}

function isMoodVibeAnswer(value: string): value is "laugh" | "think" | "focus" | "flexible" {
  return ["laugh", "think", "focus", "flexible"].includes(value);
}
