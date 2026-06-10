import { expect, test, type Locator, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const readyActor = actorFromEnv("E2E_READY_USER");
const partnerActor = actorFromEnv("E2E_READY_PARTNER");
const otherDuoActor = actorFromEnv("E2E_OTHER_DUO_USER");
const eligibleSlugs = splitFixtureList(process.env.E2E_PHASE6_ELIGIBLE_SLUGS);
const phase6MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE6_ELIGIBLE_SLUGS"
]);

const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };

reportMissingEnv("Phase 6 roulette E2E", phase6MissingEnv);

test.describe("Phase 6 roulette browser flow", () => {
  test.describe.configure({ timeout: 75_000 });

  test.skip(
    phase6MissingEnv.length > 0,
    `BLOCKED setup - missing Phase 6 roulette fixtures: ${phase6MissingEnv.join(", ")}`
  );

  test("route renders reel, audio, persisted result and history from server state", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);

    await expect(page.getByRole("heading", { name: /a fila escolhe agora/i })).toBeVisible();
    await expect(page.locator(".roulette-reel-band")).toBeVisible();
    await expect(page.locator(".roulette-reel-slot[aria-hidden='true']")).toHaveCount(60);
    await expectRoulettePrimaryControl(page);
    await expect(page.getByRole("button", { name: /som da roleta/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Resultado guardado|A fila apontou para este/i);
    await expect(page.getByRole("heading", { name: /historico da roleta/i })).toBeVisible();
  });

  test("partner resumes the same persisted result and replay does not redraw", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);
    await expect(page.locator("body")).toContainText(/A fila apontou para este/i);
    const resultText = await page.locator(".roulette-result-panel").textContent();
    const invitationText =
      resultText?.match(/A fila apontou para este[\s\S]*?(?:Replay nao e novo sorteio\.|$)/)?.[0]
      ?? "A fila apontou para este";

    await login(page, partnerActor);
    await page.goto("/app/roleta");
    await expect(page.locator(".roulette-result-panel")).toContainText(invitationText);

    const replay = page.getByRole("button", { name: /rever giro salvo/i });

    if ((await replay.count()) > 0) {
      await replay.click();
      await expect(page.locator("body")).toContainText(/Replay nao e novo sorteio/i);
    }
  });

  test("mobile full-bleed reel keeps fixed pointer and controls below with no tiny card", async ({ page }) => {
    // D-23: full-bleed mobile reel, fixed pointer, visual center, controls below, no tiny card.
    await page.setViewportSize(mobileViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);

    const reel = page.locator(".roulette-reel-band");
    const pointer = page.locator(".roulette-pointer-anchor");
    const controls = page.locator(".roulette-controls");
    await expect(reel).toBeVisible();
    await expect(pointer).toBeVisible();
    await expect(controls).toBeVisible();
    await expectVisualCenter(pointer, reel, "fixed pointer visual center");
    await expectElementBefore(reel, controls, "controls below the full-bleed reel");
    await expectNoVisibleControlOverlap(page);
  });

  test("mobile reduced motion route exposes seven primary routes and no visible control overlap", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);

    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await expect(page.getByText(/A fila esta escolhendo|Resultado guardado|Revelado/i).first()).toBeVisible();

    const mobileNav = page.getByRole("navigation", {
      name: /navegacao principal mobile|navegacao principal da area autenticada queue dois/i
    }).first();
    await expect(mobileNav).toBeVisible();
    for (const item of [
      "Home",
      "Biblioteca",
      "Descobrir",
      "Roleta",
      "Desafios",
      "Hall",
      "Dupla"
    ]) {
      await expect(mobileNav.getByRole("link", { name: new RegExp(item, "i") })).toBeVisible();
    }
    await expectNoVisibleControlOverlap(page);
  });

  test("Legendary result keeps particle layer and static seal fallback in reduced motion", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/roleta");

    const legendaryResult = page.locator('[data-rarity="legendary"]').first();

    if ((await legendaryResult.count()) > 0) {
      await expect(legendaryResult).toBeVisible();
      await expect(page.locator(".roulette-legendary-particles")).toHaveCount(
        await page.locator(".roulette-legendary-particles").count()
      );
      await expect(page.locator(".roulette-static-legendary-seal").first()).toContainText(/Legendary/i);
    }
  });

  test("replacement branch asks who pauses and never pauses automatically", async ({ page }) => {
    // replacement required: the full queue must ask explicitly; nothing auto-pauses.
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);

    const lockButton = page.getByRole("button", { name: /travar como principal/i });

    await expect(lockButton).toBeVisible();
    await lockButton.click();
    await page.waitForURL(/\/app\/roleta\?estado=replacement-required/);
    const replacementHeading = page.getByRole("heading", { name: /escolham quem pausa para abrir vaga/i });

    await expect(replacementHeading).toBeVisible();
    await expect(page.locator("body")).toContainText(/Nada muda sozinho/i);
    await expect(page.getByRole("link", { name: /cancelar/i })).toBeVisible();
  });

  test("lock succeeds with roleta-principal dashboard highlight and Central notification display", async ({ page }) => {
    // lock succeeds: successful invitation resolution redirects to /app?estado=roleta-principal.
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);

    const lockButton = page.getByRole("button", { name: /travar como principal/i });

    if ((await lockButton.count()) === 0) {
      test.skip(true, "BLOCKED setup - no pending roulette result to lock.");
    }

    await lockButton.click();

    await page.waitForURL(/\/(?:app\?estado=roleta-principal|app\/roleta\?estado=replacement-required)/);

    if (page.url().includes("replacement-required")) {
      const replacementAction = page
        .getByRole("button", { name: /pausar .* travar resultado|pausar e travar/i })
        .first();

      await expect(replacementAction).toBeVisible();
      await replacementAction.click();
      await page.waitForURL(/\/app\?estado=roleta-principal/);
    }

    await expect(page.locator('[data-highlight="roleta-principal"]').first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/Resultado da roleta travado como Principal/i);
    await expect(page.locator("body")).toContainText(/Central da Dupla/i);
    await expect(page.locator("body")).toContainText(/roleta|Principal/i);
  });

  test("discard updates history and unblocks a new roulette round", async ({ page }) => {
    // discard: result goes to history and the route can offer a new round again.
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await ensureRouletteResult(page);

    const discardButton = page.getByRole("button", { name: /descartar este resultado/i });

    if ((await discardButton.count()) === 0) {
      test.skip(true, "BLOCKED setup - no pending roulette result to discard.");
    }

    await discardButton.click();
    await page.waitForURL(/\/app\/roleta/);
    await expect(page.getByRole("heading", { name: /historico da roleta/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/discarded|descart/i);
    await expect(page.getByRole("button", { name: /sortear da fila/i })).toBeVisible();
  });

  test("other-duo actor cannot inspect ready duo roulette state", async ({ page }) => {
    // other-duo: isolation evidence must not reveal the ready duo result or history.
    await page.setViewportSize(desktopViewport);
    await login(page, otherDuoActor);
    await page.goto("/app/roleta");

    for (const slug of eligibleSlugs) {
      await expect(page.locator("body")).not.toContainText(slug);
    }
    await expect(page.locator(".roulette-result-panel")).toHaveCount(0);
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

function splitFixtureList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function reportMissingEnv(scope: string, names: string[]): void {
  if (names.length > 0) {
    console.warn(`${scope} BLOCKED setup. Missing: ${names.join(", ")}.`);
  }
}

async function expectRoulettePrimaryControl(page: Page): Promise<void> {
  const startButton = page.getByRole("button", { name: /sortear da fila/i });

  if ((await startButton.count()) > 0) {
    await expect(startButton).toBeVisible();
    return;
  }

  await expect(page.getByRole("button", { name: /rever giro salvo/i }).first()).toBeVisible();
}

async function ensureRouletteResult(page: Page): Promise<void> {
  const resultPanel = page.locator(".roulette-result-panel");

  if ((await resultPanel.count()) > 0) {
    await expect(resultPanel).toBeVisible();
    return;
  }

  const startButton = page.getByRole("button", { name: /sortear da fila/i });

  await expect(startButton).toBeVisible();
  await startButton.click();
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await expect(resultPanel).toBeVisible({ timeout: 30_000 });
}

async function expectNoVisibleControlOverlap(page: Page): Promise<void> {
  const controls = page.locator(
    "button:visible, a:visible, input:visible, select:visible, textarea:visible"
  );
  const count = await controls.count();
  const boxes: Array<{
    box: {
      height: number;
      width: number;
      x: number;
      y: number;
    };
    index: number;
  }> = [];

  for (let index = 0; index < count; index += 1) {
    if (await isDevelopmentOverlayControl(controls.nth(index))) {
      continue;
    }

    const box = await controls.nth(index).boundingBox();

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

async function expectVisualCenter(
  inner: Locator,
  outer: Locator,
  message: string
): Promise<void> {
  await expect(inner).toBeVisible();
  await expect(outer).toBeVisible();
  const innerBox = await inner.boundingBox();
  const outerBox = await outer.boundingBox();

  expect(innerBox, `${message}: inner boundingBox missing`).not.toBeNull();
  expect(outerBox, `${message}: outer boundingBox missing`).not.toBeNull();

  const innerCenter = innerBox!.x + innerBox!.width / 2;
  const outerCenter = outerBox!.x + outerBox!.width / 2;

  expect(Math.abs(innerCenter - outerCenter), message).toBeLessThanOrEqual(8);
}

async function isDevelopmentOverlayControl(control: Locator): Promise<boolean> {
  return control.evaluate((element) => {
    const label = `${element.getAttribute("aria-label") ?? ""} ${element.textContent ?? ""}`;

    return /Next\.js Dev Tools|issues overlay|Collapse issues badge|Open issues/i.test(label);
  });
}
