import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const baseMissingEnv = missingEnv(["E2E_BASE_URL"]);
const pairingActorPrefix = hasEnv([
  "E2E_PAIRING_USER_EMAIL",
  "E2E_PAIRING_USER_PASSWORD"
])
  ? "E2E_PAIRING_USER"
  : "E2E_FLOW_OWNER";
const pairingMissingEnv = missingEnv([
  "E2E_BASE_URL",
  `${pairingActorPrefix}_EMAIL`,
  `${pairingActorPrefix}_PASSWORD`
]);
const readyMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD"
]);
const phase2DetailMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_PHASE2_CATALOG_SLUG"
]);
const phase32LibraryMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE3_2_LIBRARY_QUERY"
]);
const phase33PerformanceMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE3_3_CATALOG_QUERY",
  "E2E_PHASE3_3_GAME_SLUG"
]);
const phase4MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE4_PRINCIPAL_SLUG",
  "E2E_PHASE4_SECONDARY_SLUG"
]);
const phase5DashboardMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD"
]);
const phase5AchievementsMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD"
]);
const pairingActor = actorFromEnv(pairingActorPrefix);
const readyActor = actorFromEnv("E2E_READY_USER");

reportMissingEnv("Public accessibility", baseMissingEnv);
reportMissingEnv("Pairing accessibility", pairingMissingEnv);
reportMissingEnv("Authenticated accessibility", readyMissingEnv);
reportMissingEnv("Phase 2 detail accessibility", phase2DetailMissingEnv);
reportMissingEnv("Phase 03.2 Biblioteca accessibility", phase32LibraryMissingEnv);
reportMissingEnv("Phase 03.3 performance feedback accessibility", phase33PerformanceMissingEnv);
reportMissingEnv("Phase 4 Jogando Agora accessibility", phase4MissingEnv);
reportMissingEnv("Phase 5 gamification dashboard accessibility", phase5DashboardMissingEnv);
reportMissingEnv("Phase 5 achievements accessibility", phase5AchievementsMissingEnv);

test.describe("Phase 1 public accessibility", () => {
  test.skip(
    baseMissingEnv.length > 0,
    `Missing public accessibility environment: ${baseMissingEnv.join(", ")}`
  );

  for (const route of ["/", "/login", "/cadastro", "/verificar-email", "/recuperar-senha"]) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await page.goto(route);
      await expectNoAxeViolations(page);
    });
  }

  test("auth controls expose visible keyboard focus and reduced-motion preference", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");

    const emailInput = page.getByLabel(/^email$/i);
    await expect(emailInput).toBeVisible();
    await expect
      .poll(() =>
        emailInput.evaluate((element) => {
          const input = element as HTMLInputElement;

          return !input.disabled && input.tabIndex >= 0;
        })
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() => {
          return Array.from(document.styleSheets).some((sheet) => {
            try {
              return Array.from(sheet.cssRules).some((rule) => {
                const text = rule.cssText;

                return text.includes(".queue2-input:focus-visible") && text.includes("box-shadow");
              });
            } catch {
              return false;
            }
          });
        })
      )
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
  });
});

test.describe("Phase 1 pairing accessibility", () => {
  test.skip(
    pairingMissingEnv.length > 0,
    `Missing verified no-duo accessibility fixture: ${pairingMissingEnv.join(", ")}`
  );

  test("pairing page has labels, focusable modes and no WCAG A/AA axe violations", async ({ page }) => {
    await login(page, pairingActor);
    await expect(page).toHaveURL(/\/parear/);
    await expect(page.getByRole("tab", { name: /criar dupla/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /entrar com codigo/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("Authenticated accessibility", () => {
  test.skip(
    readyMissingEnv.length > 0,
    `Missing verified named-duo accessibility fixture: ${readyMissingEnv.join(", ")}`
  );

  for (const route of [
    "/app",
    "/app/perfil",
    "/app/dupla",
    "/app/catalogo",
    "/app/descobrir",
    "/app/biblioteca",
    "/app/conquistas"
  ]) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await login(page, readyActor);
      await page.goto(route);
      await expectNoAxeViolations(page);
    });
  }
});

test.describe("Phase 5 achievements accessibility", () => {
  test.skip(
    phase5AchievementsMissingEnv.length > 0,
    `Missing Phase 5 achievements accessibility fixture: ${phase5AchievementsMissingEnv.join(", ")}`
  );

  test("achievements route is filterable, focusable, reduced-motion safe and axe-clean", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/conquistas?raridade=rare");

    const route = page.locator(".achievements-route");
    await expect(route).toBeVisible();
    await expect(page.getByRole("heading", { name: /conquistas da dupla/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /navegacao principal mobile/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /conquistas/i }).first()).toHaveAttribute(
      "aria-current",
      "page"
    );

    const filter = page.getByRole("navigation", { name: /filtrar conquistas por raridade/i });
    await expect(filter.getByRole("link", { name: /rara/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await filter.getByRole("link", { name: /todas/i }).focus();
    await expect(filter.getByRole("link", { name: /todas/i })).toBeFocused();

    const firstCard = page.locator(".achievement-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.focus();
    await expect(firstCard).toBeFocused();
    await expectStaticFeedbackMark(page.locator(".achievement-badge-icon").first());
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await expectNoAxeViolations(page);
  });
});

test.describe("Phase 3 discovery accessibility", () => {
  test.skip(
    readyMissingEnv.length > 0,
    `Missing verified named-duo discovery accessibility fixture: ${readyMissingEnv.join(", ")}`
  );

  test("discovery preserves reduced-motion, keyboard decisions and source links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/descobrir");

    await expect(page.getByRole("heading", { name: /os dois quiseram\?/i })).toBeVisible();
    await expect(page.locator(".discovery-card-stage")).toBeVisible();
    await expect(page.locator(".discovery-orbit-controls")).toBeVisible();
    await expect(page.locator(".discovery-filter-sheet")).toBeVisible();
    await expect(page.locator(".discovery-search-sheet")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    const mobileNav = page.getByRole("navigation", { name: /navegacao principal mobile/i });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /descobrir/i })).toHaveAttribute(
      "aria-current",
      "page"
    );

    const deck = page.getByRole("group", { name: /deck de descoberta/i });
    await expect(deck).toBeVisible();
    const decisionControls = [
      { label: "Quero jogar", name: /quero jogar/i },
      { label: "Agora nao", name: /agora nao/i },
      { label: "Pular", name: /^pular$/i }
    ];

    for (const { label, name } of decisionControls) {
      const control = deck.getByRole("button", { name }).first();
      await expect(control).toBeVisible();
      await control.focus();
      await expect(control, `${label} should expose keyboard focus`).toBeFocused();
    }

    const sourceLinks = page.getByRole("link", { name: /dados e imagens: rawg/i });
    await expect(sourceLinks.first()).toBeVisible();
    await sourceLinks.first().focus();
    await expect(sourceLinks.first()).toBeFocused();

    const searchControl = page.getByRole("combobox", { name: /buscar jogo/i });
    await expect(searchControl).toBeVisible();
    await searchControl.focus();
    await expect(searchControl).toBeFocused();

    const filterControl = page.getByRole("radio", { name: /plataforma comum/i });
    await expect(filterControl).toBeVisible();
    await filterControl.focus();
    await expect(filterControl).toBeFocused();

    const pushOptInButton = page.getByRole("button", { name: /ativar alertas push/i });
    if ((await pushOptInButton.count()) > 0) {
      await expect(pushOptInButton.first()).toBeVisible();
    }
    await expect(page.getByText(/live ativa|atualizando a live|sessao curta/i).first()).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("Phase 03.2 Biblioteca accessibility", () => {
  test.skip(
    phase32LibraryMissingEnv.length > 0,
    `Missing Phase 03.2 Biblioteca accessibility fixture: ${phase32LibraryMissingEnv.join(", ")}`
  );

  test("Biblioteca has axe-clean compact filters, focusable cards and reachable sheets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/biblioteca");

    await expect(page.locator(".library-operational-shell")).toBeVisible();
    await expect(page.locator(".library-filter-bar")).toBeVisible();
    await expect(page.locator(".library-filter-sheet")).toBeVisible();
    await expect(page.locator(".library-game").first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);

    const searchControl = page.getByRole("searchbox", { name: /buscar jogo na fila/i });
    await expect(searchControl).toBeVisible();
    await searchControl.focus();
    await expect(searchControl).toBeFocused();

    const firstCard = page.locator(".library-game").first();
    const titleLink = firstCard.locator("h3 a").first();
    await expect(titleLink).toBeVisible();
    await titleLink.focus();
    await expect(titleLink).toBeFocused();

    const primaryAction = firstCard.getByRole("button").first();
    await expect(primaryAction).toBeVisible();
    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();

    await page.getByText("Filtros").click();
    await expect(page.getByRole("combobox", { name: /ordenar fila/i })).toBeVisible();
    await firstCard.getByText("Mais acoes").click();
    await expect(firstCard.locator(".library-action-sheet[data-open='true']")).toBeVisible();
    await expect(page.getByRole("button", { name: /zerado bloqueado/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /dropado bloqueado/i })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});

test.describe("Phase 03.3 performance feedback accessibility", () => {
  test.skip(
    phase33PerformanceMissingEnv.length > 0,
    `Missing Phase 03.3 performance accessibility fixture: ${phase33PerformanceMissingEnv.join(", ")}`
  );

  test("pending Discovery feedback remains announced, focused and non-overlapping", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await delayNextServerAction(page, "**/app/descobrir**", 1_200);
    await page.goto("/app/descobrir");

    const button = page.getByRole("button", { name: /quero jogar/i }).first();
    await expect(button).toBeVisible();
    await button.focus();
    await expect(button).toBeFocused();
    await button.click();

    const status = page.getByRole("status").filter({
      hasText: /decisao salva aqui, sincronizando/i
    }).first();
    await expect(status).toBeVisible();
    await expect(button).toBeDisabled();
    await expectStaticFeedbackMark(page.locator(".action-feedback-button__mark").first());
    await expectNoOverlap(button, status, "Pending Discovery button overlaps feedback copy");
    await expectNoAxeViolations(page);
  });
});

test.describe("Phase 4 Jogando Agora accessibility", () => {
  test.skip(
    phase4MissingEnv.length > 0,
    `Missing Phase 4 accessibility fixture: ${phase4MissingEnv.join(", ")}`
  );

  test("dashboard and game detail remain axe-clean on mobile with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);

    await page.goto("/app");
    await expect(page.locator(".playing-now")).toBeVisible();
    await expect(page.locator(".notification-center")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /navegacao principal mobile/i })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto(`/app/jogo/${process.env.E2E_PHASE4_PRINCIPAL_SLUG!}`);
    await expect(page.getByRole("heading", { name: /sessao ao vivo/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /proxima sessao/i })).toBeVisible();
    await expect(page.locator(".notification-center")).toBeVisible();
    await expect(page.getByRole("button", { name: /agendar sessao/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ativar push de sessoes/i })).toBeVisible();
    await expectNoOverlap(
      page.locator(".schedule-session-form"),
      page.locator(".notification-center"),
      "Schedule form overlaps Central da Dupla on mobile"
    );
    await expectNoAxeViolations(page);
  });
});

test.describe("Phase 5 gamification dashboard accessibility", () => {
  test.skip(
    phase5DashboardMissingEnv.length > 0,
    `Missing Phase 5 dashboard accessibility fixture: ${phase5DashboardMissingEnv.join(", ")}`
  );

  test("dashboard band is reachable, reduced-motion safe and axe-clean", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app");

    const playingNow = page.locator(".playing-now");
    const gamification = page.locator(".gamification-dashboard-band");
    await expect(playingNow).toBeVisible();
    await expect(gamification).toBeVisible();
    await expect(gamification.getByRole("heading", { name: /progresso da dupla/i })).toBeVisible();
    await expect(gamification.getByRole("link", { name: /conquistas/i })).toHaveAttribute(
      "href",
      "/app/conquistas"
    );
    await expect(gamification.getByRole("link", { name: /desafios/i })).toHaveAttribute(
      "href",
      "/app/desafios"
    );
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await expectStaticFeedbackMark(gamification.locator(".gamification-streak-mark").first());
    await expectNoOverlap(playingNow, gamification, "Gamification band overlaps Jogando Agora on mobile");
    await expectNoAxeViolations(page);
  });
});

test.describe("Phase 2 detail accessibility", () => {
  test.skip(
    phase2DetailMissingEnv.length > 0,
    `Missing Phase 2 detail accessibility fixture: ${phase2DetailMissingEnv.join(", ")}`
  );

  test("game detail has no WCAG A/AA axe violations", async ({ page }) => {
    await login(page, readyActor);
    await page.goto(`/app/jogo/${process.env.E2E_PHASE2_CATALOG_SLUG!}`);
    const sourceSection = page.getByRole("region", { name: /fontes e frescor/i });
    await expect(sourceSection).toBeVisible();
    const rawgSourceLink = sourceSection.getByRole("link", { name: /dados e imagens: rawg/i });
    await expect(rawgSourceLink).toBeVisible();
    await rawgSourceLink.focus();
    await expect(rawgSourceLink).toBeFocused();

    const datedSources = sourceSection.locator("time");
    for (let index = 0; index < (await datedSources.count()); index += 1) {
      const datedSource = datedSources.nth(index);

      await expect(datedSource).toHaveAttribute("datetime", /.+/);
      await expect(datedSource).toHaveAttribute("title", /.+/);
    }

    await expectNoAxeViolations(page);
  });
});

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

async function delayNextServerAction(
  page: Page,
  url: string,
  delayMs: number
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
  });
}

async function expectStaticFeedbackMark(mark: Locator): Promise<void> {
  await expect(mark).toBeVisible();

  const animationName = await mark.evaluate((element) => {
    return window.getComputedStyle(element).animationName;
  });

  expect(animationName).toBe("none");
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

async function login(page: Page, actor: E2EActor): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^email$/i).fill(actor.email);
  await page.getByLabel(/^senha$/i).fill(actor.password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL(/\/(?:parear|app)/);
}

function actorFromEnv(prefix: string): E2EActor {
  return {
    email: process.env[`${prefix}_EMAIL`] ?? "",
    password: process.env[`${prefix}_PASSWORD`] ?? ""
  };
}

function missingEnv(names: string[]): string[] {
  return names.filter((name) => !process.env[name]);
}

function hasEnv(names: string[]): boolean {
  return names.every((name) => process.env[name]);
}

function reportMissingEnv(scope: string, names: string[]): void {
  if (names.length > 0) {
    console.warn(`${scope} skipped. Missing: ${names.join(", ")}.`);
  }
}
