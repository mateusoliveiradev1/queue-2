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
        "database",
        "external-cache",
        "render",
        "revalidation"
      ])
    );
  });

  it("normalizes known route paths and unknown labels to safe keys", () => {
    expect(normalizeRouteKey("/app/catalogo?busca=private")).toBe("app.catalogo");
    expect(normalizeRouteKey("/app/jogo/it-takes-two?duo=private")).toBe("app.jogo");
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
});

describe("performance budgets", () => {
  it("defines route budgets for the five critical routes", () => {
    expect(Object.keys(routePerformanceBudgets).sort()).toEqual([
      "app.biblioteca",
      "app.catalogo",
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
      "library.status.move"
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
