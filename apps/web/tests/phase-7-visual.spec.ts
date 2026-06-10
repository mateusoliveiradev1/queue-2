import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

type E2EActor = {
  email: string;
  password: string;
};

type RouteTarget = {
  name: string;
  path: string;
};

const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const evidenceDir = resolve(
  process.cwd(),
  "../../.planning/phases/07-paridade-visual-e-ux-com-prototipo/evidence/screenshots"
);

const publicRoutes: RouteTarget[] = [
  { name: "landing", path: "/" },
  { name: "public-auth-login", path: "/login" },
  { name: "public-auth-cadastro", path: "/cadastro" },
  { name: "public-auth-recuperar-senha", path: "/recuperar-senha" },
  { name: "public-auth-verificar-email", path: "/verificar-email" }
];

const authenticatedRoutes: RouteTarget[] = [
  { name: "authenticated-shell-home", path: "/app" },
  { name: "authenticated-shell-biblioteca", path: "/app/biblioteca" },
  { name: "authenticated-shell-descobrir", path: "/app/descobrir" },
  { name: "authenticated-shell-roleta", path: "/app/roleta" },
  { name: "authenticated-shell-desafios", path: "/app/desafios" },
  { name: "authenticated-shell-hall", path: "/app/hall" },
  { name: "authenticated-shell-dupla", path: "/app/dupla" },
  { name: "authenticated-shell-perfil", path: "/app/perfil" }
];

const readyActor = actorFromEnv("E2E_READY_USER");
const publicMissingEnv = missingEnv(["E2E_BASE_URL"]);
const authenticatedMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD"
]);

reportMissingEnv("Phase 7 landing and public auth visual", publicMissingEnv);
reportMissingEnv("Phase 7 authenticated shell visual", authenticatedMissingEnv);

test.describe("Phase 7 public visual scaffold", () => {
  test.describe.configure({ timeout: 60_000 });

  test.skip(
    publicMissingEnv.length > 0,
    `BLOCKED setup - missing Phase 7 public visual fixtures: ${publicMissingEnv.join(", ")}`
  );

  for (const route of publicRoutes) {
    test(`${route.name} captures desktop/mobile screenshots with axe, no horizontal overflow, no overlap and touch target checks`, async ({
      page
    }, testInfo) => {
      for (const [viewportName, viewport] of [
        ["desktop", desktopViewport],
        ["mobile", mobileViewport]
      ] as const) {
        await page.setViewportSize(viewport);
        await page.goto(route.path);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await capturePhase7Screenshot(page, route.name, viewportName, testInfo);
        await expectNoHorizontalOverflow(page, `${route.name} ${viewportName} no horizontal overflow`);
        await expectNoMeaningfulOverlap(page);
        await expectTouchTargets(page);
        await expectNoAxeViolations(page);
      }
    });
  }

  test("landing exposes monumental QUEUE/2 ritual hierarchy before implementation can pass", async ({
    page
  }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /queue\s*\/2/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/A fila e nossa|Descubram|sorteiem|zerem/i);
    await expect(page.getByRole("link", { name: /entrar|comecar|criar conta/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/descobrir|sortear|zerar/i);
  });

  test("public auth tabs keep Entrar, Criar conta and Parear reachable in the compact public auth system", async ({
    page
  }) => {
    for (const route of ["/login", "/cadastro"]) {
      await page.goto(route);
      await expect(page.getByRole("link", { name: /entrar/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /criar conta/i }).first()).toBeVisible();
      await expect(page.locator("body")).toContainText(/parear|codigo|dupla/i);
    }
  });

  test("pairing route keeps unauthenticated users on the login flow", async ({ page }) => {
    await page.goto("/parear");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("link", { name: /entrar/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/codigo|dupla/i);
  });
});

test.describe("Phase 7 authenticated shell visual scaffold", () => {
  test.describe.configure({ timeout: 75_000 });

  test.skip(
    authenticatedMissingEnv.length > 0,
    `BLOCKED setup - missing Phase 7 authenticated fixtures: ${authenticatedMissingEnv.join(", ")}`
  );

  test.beforeEach(async ({ page }) => {
    await login(page, readyActor);
  });

  for (const route of authenticatedRoutes) {
    test(`${route.name} captures desktop/mobile screenshots with axe, no horizontal overflow, no overlap and touch target checks`, async ({
      page
    }, testInfo) => {
      for (const [viewportName, viewport] of [
        ["desktop", desktopViewport],
        ["mobile", mobileViewport]
      ] as const) {
        await page.setViewportSize(viewport);
        await page.goto(route.path);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await capturePhase7Screenshot(page, route.name, viewportName, testInfo);
        await expectNoHorizontalOverflow(page, `${route.name} ${viewportName} no horizontal overflow`);
        await expectNoMeaningfulOverlap(page);
        await expectTouchTargets(page);
      }
    });
  }

  test("authenticated shell exposes seven primary top routes plus right-side Perfil and Sair", async ({
    page
  }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto("/app");

    const navigation = page.getByRole("navigation", {
      name: /area autenticada queue dois|navegacao principal/i
    }).first();

    await expect(navigation).toBeVisible();
    for (const item of ["Home", "Biblioteca", "Descobrir", "Roleta", "Desafios", "Hall", "Dupla"]) {
      await expect(navigation.getByRole("link", { name: new RegExp(item, "i") })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /perfil/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sair/i }).or(page.getByRole("link", { name: /sair/i })).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/LV|XP|STREAK/i);
    for (const item of ["Descobrir", "Roleta", "Biblioteca"]) {
      await expect(page.getByRole("link", { name: new RegExp(item, "i") }).first()).toBeVisible();
    }
    await expect(page.locator("body")).toContainText(/Catalogo|Conquistas/i);
  });

  test("/app home exposes Phase 7 anchor, CTAs and contextual Catalogo/Conquistas links", async ({
    page
  }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto("/app");

    await expect(page.locator("body")).toContainText(/LV|XP|STREAK/i);
    await expect(page.getByRole("heading", { name: /jogando agora/i })).toBeVisible();
    for (const item of ["Descobrir", "Roleta", "Biblioteca"]) {
      await expect(page.getByRole("link", { name: new RegExp(item, "i") }).first()).toBeVisible();
    }
    for (const item of ["Catalogo", "Conquistas"]) {
      await expect(page.getByRole("link", { name: new RegExp(item, "i") }).first()).toBeVisible();
    }
  });

  test("mobile authenticated shell keeps the same primary routes in a horizontal rail", async ({
    page
  }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/app/roleta");

    const mobileRail = page.getByRole("navigation", {
      name: /navegacao principal mobile|area autenticada queue dois/i
    }).first();
    await expect(mobileRail).toBeVisible();
    for (const item of ["Home", "Biblioteca", "Descobrir", "Roleta", "Desafios", "Hall", "Dupla"]) {
      await expectMinimumTarget(
        mobileRail.getByRole("link", { name: new RegExp(item, "i") }),
        44,
        44,
        `${item} touch target`
      );
    }
  });

  test("Descobrir and Roleta keep reducedMotion equivalents without visible layout collisions", async ({
    page
  }) => {
    await page.setViewportSize(mobileViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const route of ["/app/descobrir", "/app/roleta"]) {
      await page.goto(route);
      await expect
        .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
        .toBe(true);
      await expectNoHorizontalOverflow(page, `${route} reducedMotion no horizontal overflow`);
      await expectNoMeaningfulOverlap(page);
      await expectNoAxeViolations(page);
    }
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

async function capturePhase7Screenshot(
  page: Page,
  routeName: string,
  viewportName: string,
  testInfo: TestInfo
): Promise<void> {
  mkdirSync(evidenceDir, { recursive: true });
  const projectName = sanitizeSegment(testInfo.project.name || "chromium");

  await page.screenshot({
    fullPage: true,
    path: resolve(evidenceDir, `phase-7-${routeName}-${viewportName}-${projectName}.png`)
  });
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page, message: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.documentElement;
          const body = document.body;

          return Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - body.clientWidth);
        }),
      { message }
    )
    .toBeLessThanOrEqual(1);
}

async function expectNoMeaningfulOverlap(page: Page): Promise<void> {
  const controls = page.locator(
    "button:visible, a:visible, input:visible, select:visible, textarea:visible, [role='tab']:visible"
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
    const control = controls.nth(index);

    if (await isIgnoredControl(control)) {
      continue;
    }

    const box = await control.boundingBox();

    if (box && box.width > 0 && box.height > 0) {
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

      expect(overlaps, `no overlap: visible control ${first.index} overlaps ${second.index}`).toBe(false);
    }
  }
}

async function expectTouchTargets(page: Page): Promise<void> {
  const controls = page.locator(
    "button:visible, a:visible, input:visible, select:visible, textarea:visible, [role='tab']:visible"
  );
  const count = await controls.count();

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);

    if (await isIgnoredControl(control)) {
      continue;
    }

    await expectMinimumTarget(control, 44, 44, `touch target ${index}`);
  }
}

async function expectMinimumTarget(
  locator: Locator,
  minWidth: number,
  minHeight: number,
  message: string
): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box, `${message}: boundingBox missing`).not.toBeNull();
  expect(box!.width, `${message}: width`).toBeGreaterThanOrEqual(minWidth);
  expect(box!.height, `${message}: height`).toBeGreaterThanOrEqual(minHeight);
}

async function isIgnoredControl(control: Locator): Promise<boolean> {
  return control.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    const label = `${htmlElement.getAttribute("aria-label") ?? ""} ${htmlElement.textContent ?? ""}`;
    const role = htmlElement.getAttribute("role") ?? "";
    const inputType = htmlElement instanceof HTMLInputElement ? htmlElement.type : "";

    if (inputType === "hidden") {
      return true;
    }

    if (role === "presentation" || htmlElement.getAttribute("aria-hidden") === "true") {
      return true;
    }

    return /Next\.js Dev Tools|issues overlay|Collapse issues badge|Open issues/i.test(label);
  });
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
    console.warn(`${scope} BLOCKED setup. Missing: ${names.join(", ")}.`);
  }
}

function sanitizeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
