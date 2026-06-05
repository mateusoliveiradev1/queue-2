export const performanceMetricNames = [
  "TTFB",
  "FCP",
  "LCP",
  "INP",
  "CLS",
  "hydration",
  "useful-content",
  "first-interaction",
  "server-total",
  "auth",
  "validation",
  "database",
  "external-cache",
  "rate-limit",
  "search",
  "render",
  "revalidation"
] as const;

export const performanceStageNames = [
  "server-total",
  "auth",
  "validation",
  "database",
  "external-cache",
  "rate-limit",
  "search",
  "render",
  "revalidation"
] as const;

export const performanceRouteKeys = [
  "app.home",
  "app.catalogo",
  "app.biblioteca",
  "app.descobrir",
  "app.jogo",
  "api.discovery.search",
  "unknown"
] as const;

export const performanceActionKeys = [
  "catalog.wishlist.add",
  "library.status.move",
  "discovery.decision",
  "discovery.handoff",
  "discovery.live.start",
  "discovery.quiz.answer",
  "discovery.surprise",
  "unknown"
] as const;

export const performanceEnvironments = [
  "development",
  "preview",
  "production",
  "test",
  "unknown"
] as const;

export const webVitalsRatings = ["good", "needs-improvement", "poor", "unknown"] as const;

export const navigationTypes = [
  "navigate",
  "reload",
  "back-forward",
  "prerender",
  "restore",
  "unknown"
] as const;

const allowedInputKeys = new Set([
  "name",
  "value",
  "route",
  "action",
  "stage",
  "environment",
  "rating",
  "navigationType",
  "timestamp"
]);

const sensitiveKeyPattern =
  /(authorization|cookie|duo|email|endpoint|password|push|query|raw|secret|session|sql|token|url)/i;

export type PerformanceMetricName = (typeof performanceMetricNames)[number];
export type PerformanceStageName = (typeof performanceStageNames)[number];
export type PerformanceRouteKey = (typeof performanceRouteKeys)[number];
export type PerformanceActionKey = (typeof performanceActionKeys)[number];
export type PerformanceEnvironment = (typeof performanceEnvironments)[number];
export type WebVitalsRating = (typeof webVitalsRatings)[number];
export type NavigationType = (typeof navigationTypes)[number];

export type ClientPerformanceMetricInput = {
  name: PerformanceMetricName;
  value: number;
  route?: string;
  action?: string;
  stage?: string;
  environment?: string;
  rating?: string;
  navigationType?: string;
  timestamp?: number;
};

export type PerformanceMetricEvent = {
  scope: "performance.metric";
  timestamp: string;
  name: PerformanceMetricName;
  value: number;
  route: PerformanceRouteKey;
  action: PerformanceActionKey;
  stage: PerformanceStageName | "unknown";
  environment: PerformanceEnvironment;
  rating: WebVitalsRating;
  navigationType: NavigationType;
};

export function recordPerformanceMetric(input: unknown): PerformanceMetricEvent | null {
  const event = createPerformanceMetricEvent(input);

  if (event) {
    console.info(serializePerformanceMetricEvent(event));
  }

  return event;
}

export function createPerformanceMetricEvent(input: unknown): PerformanceMetricEvent | null {
  if (!isRecord(input) || containsDisallowedKeys(input)) {
    return null;
  }

  const name = normalizeAllowlisted(input.name, performanceMetricNames);
  const value = normalizeMetricValue(input.value);

  if (!name || value === null) {
    return null;
  }

  return {
    scope: "performance.metric",
    timestamp: new Date(normalizeTimestamp(input.timestamp)).toISOString(),
    name,
    value,
    route: normalizeRouteKey(input.route),
    action: normalizeActionKey(input.action),
    stage: normalizeStage(input.stage ?? name),
    environment: normalizeAllowlisted(input.environment, performanceEnvironments) ?? "unknown",
    rating: normalizeAllowlisted(input.rating, webVitalsRatings) ?? "unknown",
    navigationType: normalizeAllowlisted(input.navigationType, navigationTypes) ?? "unknown"
  };
}

export function serializePerformanceMetricEvent(event: PerformanceMetricEvent): string {
  return JSON.stringify(event);
}

export function normalizeRouteKey(input: unknown): PerformanceRouteKey {
  if (typeof input !== "string") {
    return "unknown";
  }

  if (isAllowlisted(input, performanceRouteKeys)) {
    return input;
  }

  const path = input.split("?")[0]?.replace(/\/+$/, "") || "/";

  if (path === "/app") {
    return "app.home";
  }

  if (path === "/app/catalogo") {
    return "app.catalogo";
  }

  if (path === "/app/biblioteca") {
    return "app.biblioteca";
  }

  if (path === "/app/descobrir") {
    return "app.descobrir";
  }

  if (path.startsWith("/app/jogo/")) {
    return "app.jogo";
  }

  if (path === "/api/discovery/search") {
    return "api.discovery.search";
  }

  return "unknown";
}

export function normalizeActionKey(input: unknown): PerformanceActionKey {
  return normalizeAllowlisted(input, performanceActionKeys) ?? "unknown";
}

export function normalizeStage(input: unknown): PerformanceMetricEvent["stage"] {
  return normalizeAllowlisted(input, performanceStageNames) ?? "unknown";
}

export function getPerformanceEnvironment(env: NodeJS.ProcessEnv = process.env): PerformanceEnvironment {
  if (env.NODE_ENV === "test") {
    return "test";
  }

  if (env.VERCEL_ENV === "production") {
    return "production";
  }

  if (env.VERCEL_ENV === "preview") {
    return "preview";
  }

  if (env.NODE_ENV === "development") {
    return "development";
  }

  return "unknown";
}

function containsDisallowedKeys(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((key) => !allowedInputKeys.has(key) || sensitiveKeyPattern.test(key));
}

function normalizeMetricValue(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return null;
  }

  return Number(input.toFixed(4));
}

function normalizeTimestamp(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return input;
  }

  return Date.now();
}

function normalizeAllowlisted<const T extends readonly string[]>(
  input: unknown,
  allowed: T
): T[number] | null {
  return typeof input === "string" && isAllowlisted(input, allowed) ? input : null;
}

function isAllowlisted<const T extends readonly string[]>(input: string, allowed: T): input is T[number] {
  return (allowed as readonly string[]).includes(input);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
