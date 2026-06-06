import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

import { POST as recordWebVitals } from "../src/app/api/performance/web-vitals/route";

import {
  createPerformanceMetricEvent,
  getPerformanceEnvironment,
  normalizeActionKey,
  normalizeRouteKey,
  performanceMetricNames,
  recordPerformanceMetric,
  serializePerformanceMetricEvent
} from "../src/platform/performance/metrics";
import { measureStage } from "../src/platform/performance/server-timing";
import { mutationPerformanceBudgets, routePerformanceBudgets } from "../src/platform/performance/budgets";

describe("performance metric contract", () => {
  it("defines the required metric names", () => {
    expect(performanceMetricNames).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it("normalizes known route paths and unknown labels to safe keys", () => {
    expect(normalizeRouteKey("/app/catalogo?busca=private")).toBe("app.catalogo");
    expect(normalizeRouteKey("/app/jogo/it-takes-two?duo=private")).toBe("app.jogo");
    expect(normalizeRouteKey("/api/discovery/search?q=private")).toBe("api.discovery.search");
    expect(normalizeRouteKey("/app/perfil?email=dupla@example.com")).toBe("unknown");
  });

  it("normalizes unknown action labels to a safe key", () => {
    expect(normalizeActionKey("catalog.wishlist.add")).toBe("catalog.wishlist.add");
    expect(normalizeActionKey("catalog.wishlist.add?email=dupla@example.com")).toBe("unknown");
  });

  it("rejects unknown metric names", () => {
    expect(
      createPerformanceMetricEvent({
        name: "raw-sql-duration",
        route: "app.catalogo",
        value: 12
      })
    ).toBeNull();
  });

  it("rejects payloads with sensitive-looking fields", () => {
    const sensitiveKeys = ["email", "token", "password", "endpoint", "sql", "rawQuery"];

    for (const key of sensitiveKeys) {
      expect(
        createPerformanceMetricEvent({
          [key]: "secret",
          name: "TTFB",
          route: "app.catalogo",
          value: 12
        })
      ).toBeNull();
    }
  });

  it("serializes only allowlisted labels and numeric values", () => {
    const event = createPerformanceMetricEvent({
      name: "TTFB",
      navigationType: "navigate",
      rating: "good",
      route: "/app/catalogo?busca=private",
      value: 12.123456
    });

    expect(event).toMatchObject({
      action: "unknown",
      name: "TTFB",
      route: "app.catalogo",
      stage: "unknown",
      value: 12.1235
    });
    expect(serializePerformanceMetricEvent(event!)).not.toContain("busca");
  });

  it("records safe metric events through structured logs", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const event = recordPerformanceMetric({
      name: "LCP",
      rating: "needs-improvement",
      route: "app.home",
      value: 1_500
    });

    expect(event?.name).toBe("LCP");
    expect(info).toHaveBeenCalledWith(expect.stringContaining('"scope":"performance.metric"'));

    info.mockRestore();
  });

  it("resolves the runtime environment from safe deployment labels", () => {
    expect(getPerformanceEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(getPerformanceEnvironment({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(
      "preview"
    );
    expect(getPerformanceEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(
      "production"
    );
  });
});

describe("server timing helpers", () => {
  it("measures async functions", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      measureStage("database", { route: "app.catalogo" }, async () => "ok")
    ).resolves.toBe("ok");

    expect(info).toHaveBeenCalledWith(expect.stringContaining('"name":"database"'));
    info.mockRestore();
  });

  it("records failure durations without swallowing the original error", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = new Error("database unavailable");

    await expect(
      measureStage("database", { route: "app.catalogo" }, async () => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(info).toHaveBeenCalledWith(expect.stringContaining('"name":"database"'));
    info.mockRestore();
  });

  it("wires server timing to critical routes, actions and discovery search", () => {
    const catalogPage = readFileSync("src/app/app/catalogo/page.tsx", "utf8");
    const dashboardPage = readFileSync("src/app/app/page.tsx", "utf8");
    const gamePage = readFileSync("src/app/app/jogo/[slug]/page.tsx", "utf8");
    const libraryPage = readFileSync("src/app/app/biblioteca/page.tsx", "utf8");
    const discoveryPage = readFileSync("src/app/app/descobrir/page.tsx", "utf8");
    const libraryActions = readFileSync("src/app/app/phase-2-actions.ts", "utf8");
    const playActions = readFileSync("src/app/app/phase-4-actions.ts", "utf8");
    const discoveryActions = readFileSync("src/app/app/descobrir/actions.ts", "utf8");
    const discoverySearchRoute = readFileSync("src/app/api/discovery/search/route.ts", "utf8");

    expect(dashboardPage).toContain('route: "app.home"');
    expect(dashboardPage).toMatch(/measureStage\(\s*"auth"/);
    expect(dashboardPage).toMatch(/measureStage\(\s*"database"/);
    expect(catalogPage).toContain('route: "app.catalogo"');
    expect(gamePage).toContain('route: "app.jogo"');
    expect(gamePage).toContain('measureStage("auth"');
    expect(gamePage).toContain('measureStage("database"');
    expect(libraryPage).toContain('route: "app.biblioteca"');
    expect(discoveryPage).toContain('route: "app.descobrir"');
    expect(libraryActions).toContain('action: "catalog.wishlist.add"');
    expect(libraryActions).toContain('action: "library.status.move"');
    expect(playActions).toContain('action: "play.order.promote"');
    expect(playActions).toContain('action: "play.order.reorder"');
    expect(playActions).toContain('action: "play.session"');
    expect(playActions).toContain('action: "play.progress"');
    expect(playActions).toContain('action: "play.chapter"');
    expect(playActions).toContain('action: "play.terminal"');
    expect(playActions).toContain('action: "play.timeline"');
    expect(discoveryActions).toContain('action: "discovery.decision"');
    expect(discoveryActions).toContain('action: "discovery.handoff"');
    expect(discoveryActions).toContain('action: "discovery.live.start"');
    expect(discoveryActions).toContain('action: "discovery.quiz.answer"');
    expect(discoveryActions).toContain('action: "discovery.surprise"');
    expect(discoverySearchRoute).toContain('route: "api.discovery.search"');
    expect(discoverySearchRoute).toContain('measureStage("rate-limit"');
    expect(discoverySearchRoute).toContain('measureStage("search"');
  });
});

describe("performance budgets", () => {
  it("defines route budgets for critical routes and discovery search", () => {
    expect(Object.keys(routePerformanceBudgets).sort()).toEqual([
      "api.discovery.search",
      "app.biblioteca",
      "app.catalogo",
      "app.conquistas",
      "app.desafios",
      "app.descobrir",
      "app.home",
      "app.jogo"
    ]);
  });

  it("defines mutation budgets for primary phase actions", () => {
    expect(Object.keys(mutationPerformanceBudgets).sort()).toEqual([
      "catalog.wishlist.add",
      "discovery.decision",
      "discovery.handoff",
      "discovery.live.start",
      "discovery.quiz.answer",
      "discovery.surprise",
      "library.status.move",
      "play.chapter",
      "play.order.promote",
      "play.order.reorder",
      "play.progress",
      "play.session",
      "play.terminal",
      "play.timeline"
    ]);
  });
});

describe("web vitals ingestion", () => {
  it("accepts valid Web Vitals payloads with no-store responses", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const request = new NextRequest("https://queue.test/api/performance/web-vitals", {
      body: JSON.stringify({
        name: "LCP",
        navigationType: "navigate",
        rating: "good",
        route: "/app/catalogo?busca=private",
        value: 1_200
      }),
      method: "POST"
    });

    const response = await recordWebVitals(request);

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(info).toHaveBeenCalledWith(expect.stringContaining('"route":"app.catalogo"'));
    expect(info).not.toHaveBeenCalledWith(expect.stringContaining("busca"));
    info.mockRestore();
  });

  it("rejects invalid payloads without echoing request details", async () => {
    const request = new NextRequest("https://queue.test/api/performance/web-vitals", {
      body: JSON.stringify({
        name: "LCP",
        password: "not logged",
        route: "/app/catalogo",
        value: 1_200
      }),
      method: "POST"
    });

    const response = await recordWebVitals(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({
      ok: false,
      reason: "invalid-metric"
    });
  });

  it("keeps Web Vitals in a single narrow client boundary mounted from layout", () => {
    const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
    const reporterSource = readFileSync("src/components/web-vitals-reporter.tsx", "utf8");

    expect(layoutSource).toContain("WebVitalsReporter");
    expect(reporterSource).toContain('"use client"');
    expect(reporterSource).toContain("useReportWebVitals");
    expect(reporterSource).toContain("window.location.pathname");
    expect(reporterSource).not.toContain("window.location.href");
    expect(reporterSource).not.toContain("window.location.search");
  });
});
