import { chromium, type ConsoleMessage, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type BaselineRoute = {
  key: string;
  path: string;
  label: string;
  usefulSelector: string;
  interactionSelector: string;
  budgets: {
    ttfbMs: number;
    usefulContentMs: number;
    firstInteractionMs: number;
    hydrationMs: number;
  };
};

type RouteResult = {
  label: string;
  path: string;
  status: "passed" | "failed";
  statusCode: number | null;
  ttfbMs: number | null;
  usefulContentMs: number | null;
  firstInteractionMs: number | null;
  hydration: "passed" | "failed";
  consoleErrors: string[];
  error?: string;
};

const requiredEnv = [
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_PHASE3_3_GAME_SLUG"
] as const;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..");
const baselinePath = resolve(
  repoRoot,
  ".planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-PERFORMANCE-BASELINE.md"
);

const baseURL = process.env.E2E_BASE_URL ?? "";
const gameSlug = process.env.E2E_PHASE3_3_GAME_SLUG ?? "";
const routes: BaselineRoute[] = [
  {
    key: "app.home",
    path: "/app",
    label: "/app",
    usefulSelector: ".metric-grid",
    interactionSelector: 'a[href="/app/catalogo"]',
    budgets: {
      ttfbMs: 900,
      usefulContentMs: 1_800,
      firstInteractionMs: 2_200,
      hydrationMs: 2_500
    }
  },
  {
    key: "app.catalogo",
    path: "/app/catalogo",
    label: "/app/catalogo",
    usefulSelector: ".catalog-grid, .empty-state",
    interactionSelector: 'form[action="/app/catalogo"] button[type="submit"], button:has-text("Adicionar a Wishlist")',
    budgets: {
      ttfbMs: 1_100,
      usefulContentMs: 2_200,
      firstInteractionMs: 2_500,
      hydrationMs: 2_800
    }
  },
  {
    key: "app.biblioteca",
    path: "/app/biblioteca",
    label: "/app/biblioteca",
    usefulSelector: ".library-operational-shell",
    interactionSelector: 'a[href="/app/catalogo"], .library-game button',
    budgets: {
      ttfbMs: 1_100,
      usefulContentMs: 2_200,
      firstInteractionMs: 2_500,
      hydrationMs: 2_800
    }
  },
  {
    key: "app.descobrir",
    path: "/app/descobrir",
    label: "/app/descobrir",
    usefulSelector: ".discovery-card-stage",
    interactionSelector: ".discovery-card-stage button, .discovery-orbit-controls a",
    budgets: {
      ttfbMs: 1_200,
      usefulContentMs: 2_400,
      firstInteractionMs: 2_700,
      hydrationMs: 3_000
    }
  },
  {
    key: "app.jogo",
    path: `/app/jogo/${gameSlug}`,
    label: "/app/jogo/[slug]",
    usefulSelector: ".game-detail-hero, .fact-grid",
    interactionSelector: 'button:has-text("Adicionar a Wishlist"), a[href="/app/catalogo"]',
    budgets: {
      ttfbMs: 1_100,
      usefulContentMs: 2_200,
      firstInteractionMs: 2_500,
      hydrationMs: 2_800
    }
  }
];

const hydrationErrorPatterns = [
  /Hydration/,
  /hydration/,
  /Text content does not match/,
  /Expected server HTML/
];

await main();

async function main(): Promise<void> {
  const generatedAt = new Date();
  const missing = requiredEnv.filter((name) => !process.env[name]);
  const environment = getEnvironment(baseURL);

  if (missing.length > 0 || environment.kind === "local") {
    await writeBaselineMarkdown({
      environment,
      findings:
        environment.kind === "local"
          ? ["E2E_BASE_URL points to a local URL; production or preview evidence is still required."]
          : [],
      generatedAt,
      missing,
      result: "BLOCKED - missing production/preview baseline evidence",
      routeResults: []
    });
    printResult("BLOCKED", missing);
    return;
  }

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 1000
      }
    });
    const routeResults: RouteResult[] = [];
    const consoleErrors = collectHydrationErrors(page);

    await login(page);

    for (const route of routes) {
      const baselineStart = consoleErrors.length;
      routeResults.push(await captureRoute(page, route, consoleErrors, baselineStart));
    }

    const failedRoutes = routeResults.filter((route) => route.status === "failed");

    await writeBaselineMarkdown({
      environment,
      findings: buildFindings(routeResults),
      generatedAt,
      missing: [],
      result: failedRoutes.length > 0 ? "FAILED" : "PASSED",
      routeResults
    });

    printResult(failedRoutes.length > 0 ? "FAILED" : "PASSED", []);

    if (failedRoutes.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    await writeBaselineMarkdown({
      environment,
      findings: [getErrorMessage(error)],
      generatedAt,
      missing: [],
      result: "FAILED",
      routeResults: []
    });
    throw error;
  } finally {
    await browser.close();
  }
}

async function login(page: Page): Promise<void> {
  await page.goto(buildUrl("/login"), { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^email$/i).fill(process.env.E2E_READY_USER_EMAIL!);
  await page.getByLabel(/^senha$/i).fill(process.env.E2E_READY_USER_PASSWORD!);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL(/\/(?:parear|app)/);
}

async function captureRoute(
  page: Page,
  route: BaselineRoute,
  consoleErrors: string[],
  baselineStart: number
): Promise<RouteResult> {
  const startedAt = performance.now();

  try {
    const response = await page.goto(buildUrl(route.path), { waitUntil: "domcontentloaded" });
    const usefulLocator = page.locator(route.usefulSelector).first();
    await usefulLocator.waitFor({ state: "visible", timeout: 20_000 });
    const usefulContentMs = performance.now() - startedAt;
    const interactionStartedAt = performance.now();
    await page.locator(route.interactionSelector).first().click({ trial: true, timeout: 10_000 });
    const firstInteractionMs = performance.now() - interactionStartedAt;
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;

      if (!entry) {
        return null;
      }

      return {
        ttfbMs: Math.max(0, entry.responseStart - entry.requestStart)
      };
    });
    const routeConsoleErrors = consoleErrors.slice(baselineStart);
    const status =
      response?.ok() &&
      routeConsoleErrors.length === 0 &&
      isWithinBudget(navigation?.ttfbMs ?? null, route.budgets.ttfbMs) &&
      isWithinBudget(usefulContentMs, route.budgets.usefulContentMs) &&
      isWithinBudget(firstInteractionMs, route.budgets.firstInteractionMs)
        ? "passed"
        : "failed";

    return {
      consoleErrors: routeConsoleErrors,
      firstInteractionMs,
      hydration: routeConsoleErrors.length === 0 ? "passed" : "failed",
      label: route.label,
      path: route.path,
      status,
      statusCode: response?.status() ?? null,
      ttfbMs: navigation?.ttfbMs ?? null,
      usefulContentMs
    };
  } catch (error) {
    return {
      consoleErrors: consoleErrors.slice(baselineStart),
      error: getErrorMessage(error),
      firstInteractionMs: null,
      hydration: "failed",
      label: route.label,
      path: route.path,
      status: "failed",
      statusCode: null,
      ttfbMs: null,
      usefulContentMs: null
    };
  }
}

async function writeBaselineMarkdown({
  environment,
  findings,
  generatedAt,
  missing,
  result,
  routeResults
}: {
  environment: ReturnType<typeof getEnvironment>;
  findings: string[];
  generatedAt: Date;
  missing: readonly string[];
  result: "PASSED" | "FAILED" | "BLOCKED - missing production/preview baseline evidence";
  routeResults: RouteResult[];
}): Promise<void> {
  const markdown = [
    "---",
    "phase: 03.3",
    "plan: 01",
    "artifact: performance-baseline",
    `generated: ${generatedAt.toISOString()}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 03.3 Performance Baseline",
    "",
    "## Environment",
    "",
    `- Generated: ${generatedAt.toISOString()}`,
    `- Base URL: ${environment.redactedBaseUrl}`,
    `- Environment type: ${environment.kind}`,
    "- Viewport: 1440x1000",
    "- Credentials: process-only, not written to this artifact",
    "",
    "## Routes",
    "",
    routeResults.length > 0
      ? [
          "| Route | Status | HTTP | TTFB | Useful Content | First Interaction | Hydration |",
          "|-------|--------|------|------|----------------|-------------------|-----------|",
          ...routeResults.map((route) =>
            `| ${[
              route.label,
              route.status.toUpperCase(),
              route.statusCode ?? "n/a",
              formatMs(route.ttfbMs),
              formatMs(route.usefulContentMs),
              formatMs(route.firstInteractionMs),
              route.hydration.toUpperCase()
            ].join(" | ")} |`
          )
        ].join("\n")
      : "Not run.",
    "",
    "## Budgets",
    "",
    "| Route | TTFB | Useful Content | First Interaction | Hydration |",
    "|-------|------|----------------|-------------------|-----------|",
    ...routes.map((route) =>
      `| ${[
        route.label,
        `${route.budgets.ttfbMs}ms`,
        `${route.budgets.usefulContentMs}ms`,
        `${route.budgets.firstInteractionMs}ms`,
        `${route.budgets.hydrationMs}ms`
      ].join(" | ")} |`
    ),
    "",
    "## Findings",
    "",
    findings.length > 0 ? findings.map((finding) => `- ${finding}`).join("\n") : "None.",
    "",
    "## Missing Fixtures",
    "",
    missing.length > 0 ? missing.map((name) => `- ${name}`).join("\n") : "None.",
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    result === "PASSED"
      ? "- Use this baseline as the starting point for query and perceived-latency improvements."
      : "- Provide production or preview baseline fixtures, rerun `pnpm --filter @queue/web performance:baseline`, and keep this artifact updated.",
    ""
  ].join("\n");

  await mkdir(dirname(baselinePath), { recursive: true });
  await writeFile(baselinePath, markdown, "utf8");
}

function collectHydrationErrors(page: Page): string[] {
  const messages: string[] = [];
  const capture = (text: string) => {
    if (hydrationErrorPatterns.some((pattern) => pattern.test(text))) {
      messages.push(text);
    }
  };

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error" || message.type() === "warning") {
      capture(message.text());
    }
  });
  page.on("pageerror", (error) => {
    capture(error.message);
  });

  return messages;
}

function buildFindings(results: RouteResult[]): string[] {
  return results.flatMap((result) => {
    const findings: string[] = [];

    if (result.status !== "passed") {
      findings.push(`${result.label} did not meet one or more baseline checks.`);
    }

    if (result.error) {
      findings.push(`${result.label}: ${result.error}`);
    }

    if (result.consoleErrors.length > 0) {
      findings.push(`${result.label}: hydration/console issue count ${result.consoleErrors.length}.`);
    }

    return findings;
  });
}

function getEnvironment(value: string): {
  kind: "local" | "preview" | "production" | "unknown";
  redactedBaseUrl: string;
} {
  if (!value) {
    return {
      kind: "unknown",
      redactedBaseUrl: "not provided"
    };
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

    if (isLocal) {
      return {
        kind: "local",
        redactedBaseUrl: url.origin
      };
    }

    return {
      kind: hostname === "queue-2.vercel.app" ? "production" : "preview",
      redactedBaseUrl: url.origin
    };
  } catch {
    return {
      kind: "unknown",
      redactedBaseUrl: "invalid URL"
    };
  }
}

function buildUrl(path: string): string {
  return new URL(path, baseURL).toString();
}

function formatMs(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value)}ms`;
}

function isWithinBudget(value: number | null, budget: number): boolean {
  return value !== null && value <= budget;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printResult(status: "PASSED" | "FAILED" | "BLOCKED", missing: readonly string[]): void {
  const suffix = missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
  console.log(`Performance baseline ${status}.${suffix}`);
  console.log(`Artifact: ${baselinePath}`);
}
