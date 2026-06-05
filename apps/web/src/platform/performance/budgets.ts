import type { PerformanceActionKey, PerformanceRouteKey } from "./metrics";

export type PerformanceBudget = {
  ttfbMs: number;
  usefulContentMs: number;
  firstInteractionMs: number;
  hydrationMs: number;
};

export type MutationPerformanceBudget = {
  pendingFeedbackMs: number;
  authoritativeSettledMs: number;
};

export const routePerformanceBudgets: Record<Exclude<PerformanceRouteKey, "unknown">, PerformanceBudget> = {
  "app.home": {
    ttfbMs: 900,
    usefulContentMs: 1_800,
    firstInteractionMs: 2_200,
    hydrationMs: 2_500
  },
  "app.catalogo": {
    ttfbMs: 1_100,
    usefulContentMs: 2_200,
    firstInteractionMs: 2_500,
    hydrationMs: 2_800
  },
  "app.biblioteca": {
    ttfbMs: 1_100,
    usefulContentMs: 2_200,
    firstInteractionMs: 2_500,
    hydrationMs: 2_800
  },
  "app.descobrir": {
    ttfbMs: 1_200,
    usefulContentMs: 2_400,
    firstInteractionMs: 2_700,
    hydrationMs: 3_000
  },
  "app.jogo": {
    ttfbMs: 1_100,
    usefulContentMs: 2_200,
    firstInteractionMs: 2_500,
    hydrationMs: 2_800
  }
};

export const mutationPerformanceBudgets: Record<
  Exclude<PerformanceActionKey, "unknown">,
  MutationPerformanceBudget
> = {
  "catalog.wishlist.add": {
    pendingFeedbackMs: 100,
    authoritativeSettledMs: 2_500
  },
  "library.status.move": {
    pendingFeedbackMs: 100,
    authoritativeSettledMs: 2_500
  },
  "discovery.decision": {
    pendingFeedbackMs: 100,
    authoritativeSettledMs: 2_000
  },
  "discovery.handoff": {
    pendingFeedbackMs: 100,
    authoritativeSettledMs: 2_500
  },
  "discovery.live.start": {
    pendingFeedbackMs: 100,
    authoritativeSettledMs: 2_500
  },
  "discovery.quiz.answer": {
    pendingFeedbackMs: 100,
    authoritativeSettledMs: 2_000
  }
};

export const criticalRoutePaths: Record<Exclude<PerformanceRouteKey, "unknown">, string> = {
  "app.home": "/app",
  "app.catalogo": "/app/catalogo",
  "app.biblioteca": "/app/biblioteca",
  "app.descobrir": "/app/descobrir",
  "app.jogo": "/app/jogo/[slug]"
};
