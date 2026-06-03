import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const baseMissingEnv = missingEnv(["E2E_BASE_URL"]);
const pairingMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_PAIRING_USER_EMAIL",
  "E2E_PAIRING_USER_PASSWORD"
]);
const readyMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD"
]);
const pairingActor = actorFromEnv("E2E_PAIRING_USER");
const readyActor = actorFromEnv("E2E_READY_USER");

reportMissingEnv("Public accessibility", baseMissingEnv);
reportMissingEnv("Pairing accessibility", pairingMissingEnv);
reportMissingEnv("Authenticated accessibility", readyMissingEnv);

test.describe("Phase 1 public accessibility", () => {
  test.skip(
    baseMissingEnv.length > 0,
    `Missing public accessibility environment: ${baseMissingEnv.join(", ")}`
  );

  for (const route of ["/login", "/cadastro", "/verificar-email", "/recuperar-senha"]) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await page.goto(route);
      await expectNoAxeViolations(page);
    });
  }

  test("auth controls expose visible keyboard focus and reduced-motion preference", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    await page.keyboard.press("Tab");

    const activeElement = page.locator(":focus");
    await expect(activeElement).toBeVisible();
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

test.describe("Phase 1 authenticated accessibility", () => {
  test.skip(
    readyMissingEnv.length > 0,
    `Missing verified named-duo accessibility fixture: ${readyMissingEnv.join(", ")}`
  );

  for (const route of ["/app", "/app/perfil", "/app/dupla"]) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await login(page, readyActor);
      await page.goto(route);
      await expectNoAxeViolations(page);
    });
  }
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

function reportMissingEnv(scope: string, names: string[]): void {
  if (names.length > 0) {
    console.warn(`${scope} skipped. Missing: ${names.join(", ")}.`);
  }
}
