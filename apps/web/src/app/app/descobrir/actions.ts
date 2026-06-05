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
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
import { getDiscoveryFiltersFromPath } from "./discovery-route-params";

const uuidSchema = z.string().uuid();
const decisionTimingContext = { action: "discovery.decision" } as const;
const handoffTimingContext = { action: "discovery.handoff" } as const;
const liveTimingContext = { action: "discovery.live.start" } as const;
const quizTimingContext = { action: "discovery.quiz.answer" } as const;
const surpriseTimingContext = { action: "discovery.surprise" } as const;

export async function recordDiscoveryDecisionAction(formData: FormData): Promise<void> {
  return withServerTiming(decisionTimingContext, () =>
    recordDiscoveryDecisionActionTimed(formData)
  );
}

async function recordDiscoveryDecisionActionTimed(formData: FormData): Promise<void> {
  const session = await measureStage("auth", decisionTimingContext, () =>
    requireVerifiedSession()
  );
  const { catalogGameId, decision, sourceMode, returnTo } = await measureStage(
    "validation",
    decisionTimingContext,
    async () => ({
      catalogGameId: getFormString(formData, "catalogGameId"),
      decision: getFormString(formData, "decision"),
      sourceMode: getFormString(formData, "sourceMode") || "deck",
      returnTo: getSafeReturnTo(formData, "/app/descobrir")
    })
  );

  if (
    !isUuid(catalogGameId) ||
    !isDiscoveryDecision(decision) ||
    !isDiscoverySourceMode(sourceMode)
  ) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await measureStage("database", decisionTimingContext, () =>
    recordDiscoveryDecision({
      userId: session.user.id,
      catalogGameId,
      decision,
      sourceMode
    })
  );

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(withState(returnTo, decisionResultToState(result)));
}

export async function handoffDiscoveryMatchToLibraryAction(
  formData: FormData
): Promise<void> {
  return withServerTiming(handoffTimingContext, () =>
    handoffDiscoveryMatchToLibraryActionTimed(formData)
  );
}

async function handoffDiscoveryMatchToLibraryActionTimed(
  formData: FormData
): Promise<void> {
  const session = await measureStage("auth", handoffTimingContext, () =>
    requireVerifiedSession()
  );
  const { catalogGameId, status, returnTo } = await measureStage(
    "validation",
    handoffTimingContext,
    async () => ({
      catalogGameId: getFormString(formData, "catalogGameId"),
      status: getFormString(formData, "status"),
      returnTo: getSafeReturnTo(formData, "/app/descobrir")
    })
  );

  if (!isUuid(catalogGameId) || !status) {
    redirect(withState(returnTo, "acao-invalida"));
  }

  const result = await measureStage("database", handoffTimingContext, () =>
    handoffDiscoveryMatchToLibrary({
      userId: session.user.id,
      catalogGameId,
      status
    })
  );

  if (!result.ok && result.reason === "membership-required") {
    redirect("/parear");
  }

  redirect(withState(returnTo, handoffResultToState(result)));
}

export async function startDiscoveryLiveSessionAction(
  formData: FormData
): Promise<void> {
  return withServerTiming(liveTimingContext, () =>
    startDiscoveryLiveSessionActionTimed(formData)
  );
}

async function startDiscoveryLiveSessionActionTimed(
  formData: FormData
): Promise<void> {
  const session = await measureStage("auth", liveTimingContext, () =>
    requireVerifiedSession()
  );
  const returnTo = await measureStage("validation", liveTimingContext, async () =>
    getSafeReturnTo(formData, "/app/descobrir")
  );
  const result = await measureStage("database", liveTimingContext, () =>
    startLiveSession({
      userId: session.user.id
    })
  );

  if (!result.ok) {
    redirect(result.reason === "membership-required" ? "/parear" : withState(returnTo, "acao-invalida"));
  }

  redirect(withState(withParam(returnTo, "live", result.session.id), "live-iniciado"));
}

export async function answerMoodQuizAction(formData: FormData): Promise<void> {
  return withServerTiming(quizTimingContext, () =>
    answerMoodQuizActionTimed(formData)
  );
}

async function answerMoodQuizActionTimed(formData: FormData): Promise<void> {
  const session = await measureStage("auth", quizTimingContext, () =>
    requireVerifiedSession()
  );
  const { returnTo, energy, commitment, vibe } = await measureStage(
    "validation",
    quizTimingContext,
    async () => ({
      returnTo: getSafeReturnTo(formData, "/app/descobrir"),
      energy: getFormString(formData, "energy"),
      commitment: getFormString(formData, "commitment"),
      vibe: getFormString(formData, "vibe")
    })
  );

  if (!isMoodEnergyAnswer(energy) || !isMoodCommitmentAnswer(commitment) || !isMoodVibeAnswer(vibe)) {
    redirect(withState(returnTo, "quiz-invalido"));
  }

  const result = await measureStage("database", quizTimingContext, () =>
    answerMoodQuiz({
      userId: session.user.id,
      answers: {
        energy,
        commitment,
        vibe
      }
    })
  );

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
  return withServerTiming(surpriseTimingContext, () =>
    getSurpriseRecommendationActionTimed(formData)
  );
}

async function getSurpriseRecommendationActionTimed(
  formData: FormData
): Promise<void> {
  const session = await measureStage("auth", surpriseTimingContext, () =>
    requireVerifiedSession()
  );
  const { returnTo, filters } = await measureStage(
    "validation",
    surpriseTimingContext,
    async () => {
      const returnTo = getSafeReturnTo(formData, "/app/descobrir");

      return {
        returnTo,
        filters: getDiscoveryFiltersFromPath(returnTo)
      };
    }
  );
  const result = await measureStage("database", surpriseTimingContext, () =>
    getSurpriseRecommendation({
      userId: session.user.id,
      filters
    })
  );

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
