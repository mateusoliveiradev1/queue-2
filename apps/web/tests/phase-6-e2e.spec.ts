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

  test("route renders reel, audio, result and history from persisted server state", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");

    await expect(page.getByRole("heading", { name: /a fila escolhe agora/i })).toBeVisible();
    await expect(page.locator(".roulette-reel")).toBeVisible();
    await expect(page.locator(".roulette-reel [aria-hidden='true']")).toHaveCount(60);
    await expect(page.getByRole("button", { name: /sortear da fila/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /som da roleta/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Resultado guardado|A fila apontou para este/i);
    await expect(page.getByRole("heading", { name: /historico da roleta/i })).toBeVisible();
  });

  test("partner resumes the same persisted result and replay does not redraw", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");
    await expect(page.locator("body")).toContainText(eligibleSlugs[0] ?? /A fila apontou/i);
    const resultText = await page.locator(".roulette-result-panel, body").first().textContent();

    await login(page, partnerActor);
    await page.goto("/app/roleta");
    await expect(page.locator(".roulette-result-panel, body").first()).toContainText(
      resultText?.match(/A fila apontou para este[\s\S]*/)?.[0] ?? /A fila apontou para este/i
    );

    const replay = page.getByRole("button", { name: /rever giro salvo/i });

    if ((await replay.count()) > 0) {
      await replay.click();
      await expect(page.locator("body")).toContainText(/Replay nao e novo sorteio/i);
    }
  });

  test("mobile reduced-motion route exposes nine-item mobile nav and no visible control overlap", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/roleta");

    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await expect(page.getByText(/A fila esta escolhendo|Resultado guardado|Revelado/i).first()).toBeVisible();

    const mobileNav = page.getByRole("navigation", { name: /navegacao principal mobile/i });
    await expect(mobileNav).toBeVisible();
    for (const item of [
      "Fila",
      "Catalogo",
      "Descobrir",
      "Biblioteca",
      "Roleta",
      "Conquistas",
      "Desafios",
      "Dupla",
      "Perfil"
    ]) {
      await expect(mobileNav.getByRole("link", { name: new RegExp(item, "i") })).toBeVisible();
    }
    await expectNoVisibleControlOverlap(page);
  });

  test("replacement branch asks who pauses and never pauses automatically", async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/roleta");

    const lockButton = page.getByRole("button", { name: /travar como principal/i });

    if ((await lockButton.count()) > 0) {
      await lockButton.click();
      await expect(page.getByRole("heading", { name: /escolham quem pausa para abrir vaga/i })).toBeVisible();
      await expect(page.locator("body")).toContainText(/Nada muda sozinho/i);
      await expect(page.getByRole("button", { name: /cancelar/i })).toBeVisible();
    }
  });

  test("other-duo actor cannot inspect ready duo roulette state", async ({ page }) => {
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
