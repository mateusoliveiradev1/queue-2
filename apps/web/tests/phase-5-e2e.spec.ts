import { expect, test, type Locator, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const readyActor = actorFromEnv("E2E_READY_USER");
const partnerActor = actorFromEnv("E2E_READY_PARTNER");
const otherDuoActor = actorFromEnv("E2E_OTHER_DUO_USER");
const zeradoSlug = process.env.E2E_PHASE5_ZERADO_SLUG ?? "";
const dropadoSlug = process.env.E2E_PHASE5_DROPADO_SLUG ?? "";
const phase5MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE5_ZERADO_SLUG",
  "E2E_PHASE5_DROPADO_SLUG"
]);

const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const hydrationErrorPatterns = [
  /Hydration/,
  /hydration/,
  /Text content does not match/,
  /Expected server HTML/
];

reportMissingEnv("Phase 5 gamification E2E", phase5MissingEnv);

test.describe("Phase 5 gamificacao coletiva E2E", () => {
  test.describe.configure({ timeout: 60_000 });

  test.skip(
    phase5MissingEnv.length > 0,
    `BLOCKED setup - missing Phase 5 fixtures: ${phase5MissingEnv.join(", ")}`
  );

  test("dashboard exposes shared XP, level, streak, quests, achievements and ledger", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app");

    const playingNow = page.locator(".playing-now");
    const gamification = page.locator(".gamification-dashboard-band");
    await expect(playingNow).toBeVisible();
    await expect(gamification).toBeVisible();
    await expectElementBefore(
      playingNow,
      gamification,
      "A faixa de gamificacao deve ficar logo depois de Jogando Agora"
    );
    await expect(gamification.getByRole("heading", { name: /progresso da dupla/i })).toBeVisible();
    await expect(gamification).toContainText(/XP da dupla/i);
    await expect(gamification).toContainText(/Lv\d+/i);
    await expect(gamification).toContainText(/chama|freeze|streak/i);
    await expect(gamification.getByRole("link", { name: /conquistas/i })).toHaveAttribute(
      "href",
      "/app/conquistas"
    );
    await expect(gamification.getByRole("link", { name: /desafios/i })).toHaveAttribute(
      "href",
      "/app/desafios"
    );
    await expect(page.locator(".xp-ledger-panel, .gamification-ledger-panel")).toContainText(
      /XP|sessao|desafio|zerado/i
    );
    await expect(page.locator("body")).not.toContainText(/XP individual|ranking|placar individual/i);
    expectNoHydrationErrors(hydrationErrors);
  });

  test("achievements and challenges stay usable on mobile without overlapping controls", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await login(page, readyActor);

    await page.goto("/app");
    await expect(page.locator(".gamification-dashboard-band")).toBeVisible();
    await expectNoOverlap(
      page.locator(".playing-now"),
      page.locator(".gamification-dashboard-band"),
      "Gamification band overlaps Jogando Agora on mobile"
    );
    await expectNoVisibleControlOverlap(page);

    await page.goto("/app/conquistas?raridade=rare");
    await expect(page.locator(".achievements-route")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /filtrar conquistas por raridade/i })).toBeVisible();
    await expect(page.locator(".achievement-card").first()).toBeVisible();
    await expectNoVisibleControlOverlap(page);

    await page.goto("/app/desafios?periodo=semana");
    await expect(page.locator(".challenges-route")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /filtrar desafios por periodo/i })).toBeVisible();
    await expect(page.locator(".challenge-streak-panel")).toBeVisible();
    await expectNoVisibleControlOverlap(page);
  });

  test("forged reward query is ignored while reduced motion keeps static feedback", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app?recompensa=level-up");

    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await expect(page.locator(".reward-inline-state")).toHaveCount(0);
    await expect(page.locator(".queue2-toast")).toHaveCount(0);
    await expectStaticFeedbackMark(page.locator(".gamification-streak-mark").first());

    await page.goto("/app/conquistas?raridade=legendary");
    await expect(page.locator(".achievement-badge-icon").first()).toBeVisible();
    await expectStaticFeedbackMark(page.locator(".achievement-badge-icon").first());

    await page.goto("/app/desafios");
    await expect(page.locator(".challenge-streak-panel")).toBeVisible();
    await expectStaticFeedbackMark(page.locator(".challenge-streak-mark").first());
    expectNoHydrationErrors(hydrationErrors);
  });

  test("both members must confirm Zerado before the major reward is visible", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto(`/app/jogo/${zeradoSlug}`);

    await expect(page.getByRole("heading", { name: /zerado ou dropado/i })).toBeVisible();
    await page.getByRole("button", { name: /pedir zerado/i }).click();
    await expect(page.getByText(/pedido pendente:\s*zerado/i)).toBeVisible();
    await expect(page.getByText(/solicitante nao pode confirmar sozinho/i)).toBeVisible();
    await page.getByRole("button", { name: /confirmar com a dupla/i }).click();
    await expect(page.getByText(/pedido-terminal-nao-pendente|acao invalida|solicitante/i).first()).toBeVisible();

    await login(page, partnerActor);
    await page.goto(`/app/jogo/${zeradoSlug}`);
    await expect(page.getByText(/pedido pendente:\s*zerado/i)).toBeVisible();
    await Promise.all([
      page.waitForURL((url) =>
        url.pathname === `/app/jogo/${zeradoSlug}`
        && url.searchParams.get("estado") === "pedido-terminal-confirmado"
        && url.searchParams.has("recompensa")
      ),
      page.getByRole("button", { name: /confirmar com a dupla/i }).click()
    ]);
    const rewardFeedback = page.locator(".reward-inline-state");
    await expect(rewardFeedback).toBeVisible();
    await expect(rewardFeedback).toContainText(/XP|conquista|desafio|level-up/i);
    await expectStaticFeedbackMark(rewardFeedback);
    await page.getByRole("link", { name: /voltar ao catalogo/i }).click();
    await page.waitForURL(/\/app\/catalogo/);
    await page.goto("/app");
    await expect(page.locator(".gamification-dashboard-band")).toContainText(/Zerado|Final verdadeiro|XP da dupla/i);
  });

  test("Dropado confirmation stays neutral and does not remove XP or shame the duo", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto(`/app/jogo/${dropadoSlug}`);

    await page.getByRole("button", { name: /pedir dropado/i }).click();
    await expect(page.getByText(/pedido pendente:\s*dropado/i)).toBeVisible();

    await login(page, partnerActor);
    await page.goto(`/app/jogo/${dropadoSlug}`);
    await Promise.all([
      page.waitForURL(/pedido-terminal-confirmado|\/app\/jogo\//),
      page.getByRole("button", { name: /confirmar com a dupla/i }).click()
    ]);
    await page.goto("/app");

    const body = page.locator("body");
    await expect(body).not.toContainText(/perdeu XP|punicao|culpa|vergonha|fracasso/i);
    await expect(body).toContainText(/Dropado|sem punicao|sem tilt|XP da dupla/i);
  });

  test("other-duo actor cannot inspect Phase 5 state or call protected job API", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, otherDuoActor);

    await page.goto(`/app/jogo/${zeradoSlug}`);
    await expect(page.getByRole("heading", { name: /zerado ou dropado/i })).toHaveCount(0);
    await expect(page.locator(".gamification-dashboard-band")).toHaveCount(0);

    const jobResponse = await page.request.get("/api/jobs/gamification/maintenance");
    expect(jobResponse.status()).toBe(401);

    await page.goto("/app/conquistas");
    await expect(page.locator("body")).not.toContainText(zeradoSlug);
    await expect(page.locator("body")).not.toContainText(dropadoSlug);
  });
});

async function login(page: Page, actor: E2EActor): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/^email$/i).fill(actor.email);
  await page.getByLabel(/^senha$/i).fill(actor.password);
  await Promise.all([
    page.waitForURL(/\/(?:parear|app)/),
    page.getByRole("button", { name: /^entrar$/i }).click()
  ]);
  await page.waitForLoadState("load");
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
  const secondHandle = await second.elementHandle();

  if (!secondHandle) {
    throw new Error("Expected second element handle.");
  }

  const result = await first.evaluate(
    (firstElement, secondElement) =>
      Boolean(firstElement.compareDocumentPosition(secondElement as Element) & Node.DOCUMENT_POSITION_FOLLOWING),
    secondHandle
  );

  expect(result, message).toBe(true);
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
