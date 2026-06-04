import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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
const pairingActor = actorFromEnv(pairingActorPrefix);
const readyActor = actorFromEnv("E2E_READY_USER");

reportMissingEnv("Public accessibility", baseMissingEnv);
reportMissingEnv("Pairing accessibility", pairingMissingEnv);
reportMissingEnv("Authenticated accessibility", readyMissingEnv);
reportMissingEnv("Phase 2 detail accessibility", phase2DetailMissingEnv);

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
    "/app/biblioteca"
  ]) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await login(page, readyActor);
      await page.goto(route);
      await expectNoAxeViolations(page);
    });
  }
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
    for (const name of [/quero jogar/i, /agora nao/i, /^pular$/i]) {
      const control = deck.getByRole("button", { name }).first();
      await expect(control).toBeVisible();
      await control.focus();
      await expect(control).toBeFocused();
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

    await expect(page.getByRole("button", { name: /ativar alertas push/i })).toBeVisible();
    await expect(page.getByText(/atualizando a live|sessao curta/i).first()).toBeVisible();
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
