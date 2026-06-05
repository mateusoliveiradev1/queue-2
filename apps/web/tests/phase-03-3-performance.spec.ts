import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  mutationPerformanceBudgets,
  routePerformanceBudgets
} from "../src/platform/performance/budgets";

type E2EActor = {
  email: string;
  password: string;
};

type CriticalRouteCase = {
  key: keyof typeof routePerformanceBudgets;
  path: string;
  label: string;
  usefulSelector: string;
};

type RouteTimingResult = {
  ttfbMs: number;
  usefulContentMs: number;
  firstInteractionMs: number;
};

const requiredEnv = [
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE3_3_CATALOG_QUERY",
  "E2E_PHASE3_3_GAME_SLUG"
] as const;

const readyActor = actorFromEnv("E2E_READY_USER");
const catalogQuery = process.env.E2E_PHASE3_3_CATALOG_QUERY ?? "";
const gameSlug = process.env.E2E_PHASE3_3_GAME_SLUG ?? "";
const missingPhase33Env = missingEnv(requiredEnv);
const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const hydrationErrorPatterns = [
  /Hydration/,
  /hydration/,
  /Text content does not match/,
  /Expected server HTML/
];
const criticalRoutes: CriticalRouteCase[] = [
  {
    key: "app.home",
    path: "/app",
    label: "/app",
    usefulSelector: ".metric-grid"
  },
  {
    key: "app.catalogo",
    path: "/app/catalogo",
    label: "/app/catalogo",
    usefulSelector: ".catalog-grid, .empty-state"
  },
  {
    key: "app.biblioteca",
    path: "/app/biblioteca",
    label: "/app/biblioteca",
    usefulSelector: ".library-operational-shell"
  },
  {
    key: "app.descobrir",
    path: "/app/descobrir",
    label: "/app/descobrir",
    usefulSelector: ".discovery-card-stage"
  },
  {
    key: "app.jogo",
    path: `/app/jogo/${gameSlug}`,
    label: "/app/jogo/[slug]",
    usefulSelector: ".game-detail-hero, .fact-grid"
  }
];

reportMissingEnv("Phase 03.3 performance E2E", missingPhase33Env);

test.describe("Phase 03.3 production-like performance gates", () => {
  test.skip(
    missingPhase33Env.length > 0,
    `BLOCKED setup - missing Phase 03.3 performance fixture: ${missingPhase33Env.join(", ")}`
  );

  test("desktop routes meet baseline budgets and expose first keyboard focus", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);

    for (const route of criticalRoutes) {
      const timings = await captureRouteTimings(page, route);

      expectRouteWithinBudget(route, timings);
      await expectFirstTabFocusVisible(page, `${route.label} first focusable control`);
    }

    expectNoHydrationErrors(hydrationErrors);
  });

  test("mobile routes meet baseline budgets without overlapping first controls", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(mobileViewport);
    await login(page, readyActor);

    for (const route of criticalRoutes) {
      const timings = await captureRouteTimings(page, route);

      expectRouteWithinBudget(route, timings);
      await expectFirstTabFocusVisible(page, `${route.label} mobile first focusable control`);
      await expectNoVisibleControlOverlap(page);
    }

    await expect(page.getByRole("navigation", { name: /navegacao principal mobile/i })).toBeVisible();
    expectNoHydrationErrors(hydrationErrors);
  });

  test("slow network keeps Discovery feedback visible before the delayed server response", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    let delayedServerActionFinished = false;

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await emulateSlowNetwork(page);
    await delayNextServerAction(page, "**/app/descobrir**", 1_200, () => {
      delayedServerActionFinished = true;
    });
    await page.goto("/app/descobrir");

    const button = page.getByRole("button", { name: /quero jogar/i }).first();
    await expect(button).toBeVisible();

    const startedAt = await browserNow(page);
    await button.click();
    const syncingStatus = page.getByRole("status").filter({
      hasText: /decisao salva aqui, sincronizando/i
    });

    await expect(syncingStatus).toBeVisible();
    const feedbackMs = (await browserNow(page)) - startedAt;

    expect(delayedServerActionFinished).toBe(false);
    expect(feedbackMs).toBeLessThanOrEqual(
      mutationPerformanceBudgets["discovery.decision"].pendingFeedbackMs + 150
    );
    await expect(button).toBeDisabled();
    expectNoHydrationErrors(hydrationErrors);
  });

  test("reduced motion keeps low-motion feedback states equivalent", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(mobileViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await delayNextServerAction(page, "**/app/descobrir**", 900);
    await page.goto("/app/descobrir");

    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await expect(page.locator(".discovery-deck-status")).toContainText(/movimento reduzido ativo/i);

    const button = page.getByRole("button", { name: /pular/i }).first();
    await button.click();
    await expect(
      page.getByRole("status").filter({ hasText: /decisao salva aqui, sincronizando/i })
    ).toBeVisible();
    await expectStaticFeedbackMark(page.locator(".action-feedback-button__mark").first());
    expectNoHydrationErrors(hydrationErrors);
  });

  test("failed mutation state exposes retry copy and keeps controls non-overlapping", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await failNextServerAction(page, "**/app/descobrir**");
    await page.goto("/app/descobrir");

    const button = page.getByRole("button", { name: /agora nao/i }).first();
    await expect(button).toBeVisible();
    await button.click();

    await expect(page.getByRole("button", { name: /tentar de novo/i }).first()).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /tente de novo/i }).first()).toBeVisible();
    await expectNoOverlap(
      page.getByRole("button", { name: /tentar de novo/i }).first(),
      page.getByRole("status").filter({ hasText: /tente de novo/i }).first(),
      "Retry button overlaps feedback copy"
    );
  });

  test("Catalogo delayed mutation feedback appears before the Wishlist server response settles", async ({ page }) => {
    let delayedServerActionFinished = false;

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await delayNextServerAction(page, "**/app/catalogo**", 1_200, () => {
      delayedServerActionFinished = true;
    });
    await page.goto(`/app/catalogo?busca=${encodeURIComponent(catalogQuery)}`);

    const button = page.getByRole("button", { name: /adicionar a wishlist/i }).first();
    await expect(button).toBeVisible();

    const startedAt = await browserNow(page);
    await button.click();
    const syncingStatus = page.getByRole("status").filter({
      hasText: /salvo aqui, sincronizando/i
    });

    await expect(syncingStatus).toBeVisible();
    const feedbackMs = (await browserNow(page)) - startedAt;

    expect(delayedServerActionFinished).toBe(false);
    expect(feedbackMs).toBeLessThanOrEqual(
      mutationPerformanceBudgets["catalog.wishlist.add"].pendingFeedbackMs + 150
    );
    await expect(button).toBeDisabled();
  });
});

async function captureRouteTimings(
  page: Page,
  route: CriticalRouteCase
): Promise<RouteTimingResult> {
  const startedAt = await browserNow(page);
  const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
  const useful = page.locator(route.usefulSelector).first();

  await useful.waitFor({ state: "visible", timeout: 20_000 });
  const usefulContentMs = (await browserNow(page)) - startedAt;
  const firstInteractive = page
    .locator("a[href], button:not([disabled]), input:not([type='hidden']), select, textarea")
    .first();
  const interactionStartedAt = await browserNow(page);

  await firstInteractive.click({ trial: true, timeout: 10_000 });
  const firstInteractionMs = (await browserNow(page)) - interactionStartedAt;
  const ttfbMs = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    return entry ? Math.max(0, entry.responseStart - entry.requestStart) : 0;
  });

  expect(response?.ok(), `${route.label} should return an OK response`).toBe(true);

  return {
    firstInteractionMs,
    ttfbMs,
    usefulContentMs
  };
}

function expectRouteWithinBudget(route: CriticalRouteCase, timings: RouteTimingResult): void {
  const budget = routePerformanceBudgets[route.key];

  expect(timings.ttfbMs, `${route.label} TTFB`).toBeLessThanOrEqual(budget.ttfbMs);
  expect(timings.usefulContentMs, `${route.label} useful content`).toBeLessThanOrEqual(
    budget.usefulContentMs
  );
  expect(timings.firstInteractionMs, `${route.label} first interaction`).toBeLessThanOrEqual(
    budget.firstInteractionMs
  );
}

async function emulateSlowNetwork(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);

  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    downloadThroughput: (750 * 1024) / 8,
    latency: 420,
    offline: false,
    uploadThroughput: (250 * 1024) / 8
  });
}

async function delayNextServerAction(
  page: Page,
  url: string,
  delayMs: number,
  onFinished?: () => void
): Promise<void> {
  let hasDelayed = false;

  await page.route(url, async (route) => {
    if (route.request().method() !== "POST" || hasDelayed) {
      await route.continue();
      return;
    }

    hasDelayed = true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
    onFinished?.();
  });
}

async function failNextServerAction(page: Page, url: string): Promise<void> {
  let hasFailed = false;

  await page.route(url, async (route) => {
    if (route.request().method() !== "POST" || hasFailed) {
      await route.continue();
      return;
    }

    hasFailed = true;
    await route.abort("failed");
  });
}

async function expectFirstTabFocusVisible(page: Page, label: string): Promise<void> {
  await page.evaluate(() => {
    const active = document.activeElement;

    if (active instanceof HTMLElement) {
      active.blur();
    }
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    await page.keyboard.press("Tab");

    const result = await page.evaluate(() => {
      const active = document.activeElement;

      if (!(active instanceof HTMLElement)) {
        return { focused: false, visible: false };
      }

      const style = window.getComputedStyle(active);

      return {
        focused: true,
        visible:
          active.matches(":focus-visible") ||
          style.outlineStyle !== "none" ||
          style.boxShadow !== "none"
      };
    });

    if (!result.focused) {
      continue;
    }

    expect(result.visible, `${label} should have visible focus`).toBe(true);
    return;
  }

  throw new Error(`${label} was not reachable by tabbing`);
}

async function expectNoVisibleControlOverlap(page: Page): Promise<void> {
  const controls = page.locator("button:visible, a[href]:visible").first();
  const nextControl = page.locator("button:visible, a[href]:visible").nth(1);

  if ((await controls.count()) === 0 || (await nextControl.count()) === 0) {
    return;
  }

  await expectNoOverlap(controls, nextControl, "First visible controls overlap");
}

async function expectNoOverlap(
  first: Locator,
  second: Locator,
  message: string
): Promise<void> {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();

  expect(firstBox, `${message}: first boundingBox missing`).not.toBeNull();
  expect(secondBox, `${message}: second boundingBox missing`).not.toBeNull();

  const overlaps =
    firstBox!.x < secondBox!.x + secondBox!.width &&
    firstBox!.x + firstBox!.width > secondBox!.x &&
    firstBox!.y < secondBox!.y + secondBox!.height &&
    firstBox!.y + firstBox!.height > secondBox!.y;

  expect(overlaps, message).toBe(false);
}

async function expectStaticFeedbackMark(mark: Locator): Promise<void> {
  await expect(mark).toBeVisible();

  const animationName = await mark.evaluate((element) => {
    return window.getComputedStyle(element).animationName;
  });

  expect(animationName).toBe("none");
}

async function login(page: Page, actor: E2EActor): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^email$/i).fill(actor.email);
  await page.getByLabel(/^senha$/i).fill(actor.password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL(/\/(?:parear|app)/);
}

function collectHydrationErrors(page: Page): string[] {
  const messages: string[] = [];
  const capture = (text: string) => {
    if (hydrationErrorPatterns.some((pattern) => pattern.test(text))) {
      messages.push(text);
    }
  };

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      capture(message.text());
    }
  });
  page.on("pageerror", (error) => {
    capture(error.message);
  });

  return messages;
}

function expectNoHydrationErrors(messages: string[]): void {
  expect(messages, `Unexpected hydration console errors: ${messages.join("\n")}`).toEqual([]);
}

async function browserNow(page: Page): Promise<number> {
  return page.evaluate(() => performance.now());
}

function actorFromEnv(prefix: string): E2EActor {
  return {
    email: process.env[`${prefix}_EMAIL`] ?? "",
    password: process.env[`${prefix}_PASSWORD`] ?? ""
  };
}

function missingEnv(names: readonly string[]): string[] {
  return names.filter((name) => !process.env[name]);
}

function reportMissingEnv(scope: string, names: string[]): void {
  if (names.length > 0) {
    console.warn(`${scope} BLOCKED setup. Missing: ${names.join(", ")}.`);
  }
}
