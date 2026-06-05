import { expect, test, type Locator, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const readyActor = actorFromEnv("E2E_READY_USER");
const principalSlug = process.env.E2E_PHASE4_PRINCIPAL_SLUG ?? "";
const secondarySlug = process.env.E2E_PHASE4_SECONDARY_SLUG ?? "";
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

const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const hydrationErrorPatterns = [
  /Hydration/,
  /hydration/,
  /Text content does not match/,
  /Expected server HTML/
];

reportMissingEnv("Phase 4 Jogando Agora E2E", phase4MissingEnv);

test.describe("Phase 4 Jogando Agora dashboard", () => {
  test.skip(
    phase4MissingEnv.length > 0,
    `BLOCKED setup - missing Phase 4 active-game fixture: ${phase4MissingEnv.join(", ")}`
  );

  test("desktop viewport prioritizes Principal and exposes ordering controls", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app");

    await expectPlayingNowContract(page);
    await expect(page.getByRole("heading", { name: /jogando agora/i })).toBeVisible();
    await expect(page.locator(".playing-principal")).toBeVisible();
    await expect(page.locator(`.playing-principal a[href="/app/jogo/${principalSlug}"]`)).toBeVisible();
    await expect(page.locator(`.playing-secondary-card a[href="/app/jogo/${secondarySlug}"]`)).toBeVisible();
    await expectElementBefore(
      page.locator(".playing-now"),
      page.locator(".metric-grid"),
      "Jogando Agora should appear before dashboard metrics"
    );

    await page.getByRole("button", { name: /organizar/i }).click();
    await expect(page.locator(".playing-order-list")).toBeVisible();
    await expect(page.getByRole("button", { name: /arrastar/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /subir/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /descer/i }).first()).toBeVisible();
    await expectTabFocusVisible(page, page.getByRole("button", { name: /salvar ordem/i }), "Salvar ordem");
    expectNoHydrationErrors(hydrationErrors);
  });

  test("mobile viewport keeps Principal first and active cards non-overlapping", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(mobileViewport);
    await login(page, readyActor);
    await page.goto("/app");

    await expectPlayingNowContract(page);
    await expect(page.getByRole("navigation", { name: /navegacao principal mobile/i })).toBeVisible();
    await expectElementBefore(
      page.locator(".playing-principal"),
      page.locator(".playing-secondary-panel"),
      "Principal should remain first on mobile"
    );
    await expectNoOverlap(
      page.locator(".playing-principal"),
      page.locator(".playing-secondary-panel"),
      "Principal overlaps secondary panel on mobile"
    );
    await page.getByRole("button", { name: /organizar/i }).click();
    await expectNoVisibleControlOverlap(page);
    expectNoHydrationErrors(hydrationErrors);
  });

  test("reduced motion keeps static ordering feedback and keyboard controls available", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app");

    await expectPlayingNowContract(page);
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await page.getByRole("button", { name: /organizar/i }).click();
    await expect(page.locator(".playing-order-list")).toBeVisible();
    await expectTabFocusVisible(page, page.getByRole("button", { name: /arrastar/i }).first(), "Drag handle");
    await expectStaticFeedbackMark(page.locator(".action-feedback-button__mark").first());
    expectNoHydrationErrors(hydrationErrors);
  });
});

async function expectPlayingNowContract(page: Page): Promise<void> {
  await expect(page.locator(".playing-now")).toBeVisible();
  await expect(page.locator(".playing-principal")).toBeVisible();
  await expect(page.getByRole("link", { name: /abrir jornada/i })).toHaveAttribute(
    "href",
    `/app/jogo/${principalSlug}`
  );
  await expect(page.getByRole("link", { name: /iniciar sessao/i })).toHaveAttribute(
    "href",
    `/app/jogo/${principalSlug}?acao=sessao-live`
  );
  await expect(page.getByRole("link", { name: /jogamos hoje/i })).toHaveAttribute(
    "href",
    `/app/jogo/${principalSlug}?acao=jogamos-hoje`
  );
  await expect(page.getByRole("button", { name: /organizar/i })).toBeVisible();
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

function collectHydrationErrors(page: Page): string[] {
  const messages: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") {
      return;
    }

    const text = message.text();

    if (hydrationErrorPatterns.some((pattern) => pattern.test(text))) {
      messages.push(text);
    }
  });
  page.on("pageerror", (error) => {
    const text = error.message;

    if (hydrationErrorPatterns.some((pattern) => pattern.test(text))) {
      messages.push(text);
    }
  });

  return messages;
}

function expectNoHydrationErrors(messages: string[]): void {
  expect(messages).toEqual([]);
}

async function expectElementBefore(
  first: Locator,
  second: Locator,
  message: string
): Promise<void> {
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const result = await first.evaluate(
    (firstElement, secondElement) =>
      Boolean(firstElement.compareDocumentPosition(secondElement as Element) & Node.DOCUMENT_POSITION_FOLLOWING),
    await second.elementHandle()
  );

  expect(result, message).toBe(true);
}

async function expectTabFocusVisible(
  page: Page,
  target: Locator,
  label: string
): Promise<void> {
  await expect(target).toBeVisible();
  await page.evaluate(() => {
    const active = document.activeElement;

    if (active instanceof HTMLElement) {
      active.blur();
    }
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    await page.keyboard.press("Tab");

    const isFocused = await target.evaluate((element) => element === document.activeElement);

    if (!isFocused) {
      continue;
    }

    const hasFocusTreatment = await target.evaluate((element) => {
      const style = window.getComputedStyle(element);

      return (
        style.outlineStyle !== "none" ||
        style.boxShadow !== "none" ||
        style.borderColor !== "rgba(0, 0, 0, 0)"
      );
    });

    expect(hasFocusTreatment, `${label} should expose visible focus`).toBe(true);
    return;
  }

  throw new Error(`${label} did not receive keyboard focus.`);
}

async function expectNoOverlap(first: Locator, second: Locator, message: string): Promise<void> {
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox()
  ]);

  if (!firstBox || !secondBox) {
    throw new Error("Expected visible elements with bounding boxes.");
  }

  const overlaps =
    firstBox.x < secondBox.x + secondBox.width &&
    firstBox.x + firstBox.width > secondBox.x &&
    firstBox.y < secondBox.y + secondBox.height &&
    firstBox.y + firstBox.height > secondBox.y;

  expect(overlaps, message).toBe(false);
}

async function expectNoVisibleControlOverlap(page: Page): Promise<void> {
  const controls = page.locator(
    "button:visible, a:visible, input:visible, select:visible, textarea:visible"
  );
  const count = await controls.count();
  const boxes: Array<{
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    index: number;
  }> = [];

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();

    if (box) {
      boxes.push({ box, index });
    }
  }

  for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
      const first = boxes[firstIndex];
      const second = boxes[secondIndex];

      if (!first || !second) {
        continue;
      }

      const overlaps =
        first.box.x < second.box.x + second.box.width &&
        first.box.x + first.box.width > second.box.x &&
        first.box.y < second.box.y + second.box.height &&
        first.box.y + first.box.height > second.box.y;

      expect(overlaps, `Visible control ${first.index} overlaps ${second.index}`).toBe(false);
    }
  }
}

async function expectStaticFeedbackMark(mark: Locator): Promise<void> {
  await expect(mark).toBeVisible();
  const animationName = await mark.evaluate((element) => window.getComputedStyle(element).animationName);

  expect(animationName === "none" || animationName === "").toBe(true);
}
