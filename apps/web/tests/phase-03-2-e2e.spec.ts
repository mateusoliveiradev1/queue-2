import { expect, test, type Locator, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const readyActor = actorFromEnv("E2E_READY_USER");
const libraryQuery = process.env.E2E_PHASE3_2_LIBRARY_QUERY ?? "";
const phase32MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE3_2_LIBRARY_QUERY"
]);

const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const hydrationErrorPatterns = [
  /Hydration/,
  /hydration/,
  /Text content does not match/,
  /Expected server HTML/
];

reportMissingEnv("Phase 03.2 Biblioteca E2E", phase32MissingEnv);

test.describe("Phase 03.2 Biblioteca operational backlog", () => {
  test.skip(
    phase32MissingEnv.length > 0,
    `Missing Phase 03.2 E2E fixture: ${phase32MissingEnv.join(", ")}`
  );

  test("desktop viewport keeps Biblioteca bounded, filterable and honest", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await login(page, readyActor);
    await page.goto("/app/biblioteca");

    await expectLibraryBrowserContract(page);
    await expect(page.getByRole("button", { name: /zerado bloqueado/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /dropado bloqueado/i })).toHaveCount(0);

    const firstCard = page.locator(".library-game").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator(".library-cover")).toHaveAttribute("href", /\/app\/jogo\//);
    await expect(firstCard.locator("h3 a")).toHaveAttribute("href", /\/app\/jogo\//);
    await expect(firstCard.locator(".match-score")).toBeVisible();
    await expect(firstCard.getByRole("button", { name: /comecar em jogando|pausar|retomar em jogando/i }).first()).toBeVisible();
    await expect(firstCard.locator(".library-action-sheet")).toBeVisible();

    await page.getByRole("searchbox", { name: /buscar jogo na fila/i }).fill(libraryQuery);
    await page.getByText("Filtros").click();
    await page.getByRole("radio", { name: /plataformas em comum/i }).check();
    await page.getByRole("combobox", { name: /ordenar fila/i }).selectOption("match");
    await page.getByRole("button", { name: /^aplicar$/i }).click();
    await expect(page).toHaveURL(/\/app\/biblioteca/);
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(libraryQuery);
    await expect(page).toHaveURL(/plataforma=comum/);
    await expect(page).toHaveURL(/ordenar=match/);

    const nextPage = page.getByRole("link", { name: /proxima/i });
    if ((await nextPage.count()) > 0) {
      await nextPage.click();
      await expect(page).toHaveURL(/pagina=2/);
      await expect(page).toHaveURL(/ordenar=match/);
      await expect(page).toHaveURL(/plataforma=comum/);
    }

    await expectTabFocusVisible(
      page,
      page.getByRole("searchbox", { name: /buscar jogo na fila/i }),
      "Busca da Biblioteca"
    );
    await expectTabFocusVisible(
      page,
      page.locator(".library-game").first().getByRole("button").first(),
      "Acao primaria do card"
    );
    expectNoHydrationErrors(hydrationErrors);
  });

  test("mobile viewport keeps cards and secondary sheets compact and non-overlapping", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(mobileViewport);
    await login(page, readyActor);
    await page.goto("/app/biblioteca");

    await expectLibraryBrowserContract(page);
    await expect(page.locator(".library-filter-bar")).toBeVisible();
    await expect(page.locator(".library-filter-sheet")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /navegacao principal mobile/i })).toBeVisible();

    const firstCard = page.locator(".library-game").first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByText("Mais acoes").click();
    await expect(firstCard.locator(".library-action-sheet[open]")).toBeVisible();
    await expect(firstCard.getByRole("button", { name: /voltar para wishlist|mover para pausado/i }).first()).toBeVisible();
    await expectCardDoesNotOverlap(firstCard);
    expectNoHydrationErrors(hydrationErrors);
  });

  test("reduced motion preserves Biblioteca hierarchy, focus and sheet controls", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.setViewportSize(desktopViewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, readyActor);
    await page.goto("/app/biblioteca");

    await expectLibraryBrowserContract(page);
    await expect
      .poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches))
      .toBe(true);
    await page.getByText("Filtros").click();
    await expect(page.locator(".library-filter-sheet[open]")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /ordenar fila/i })).toBeVisible();
    await expectCardDoesNotOverlap(page.locator(".library-game").first());
    expectNoHydrationErrors(hydrationErrors);
  });
});

async function expectLibraryBrowserContract(page: Page): Promise<void> {
  const shell = page.locator(".library-operational-shell");
  const nextQueue = page.getByRole("heading", { name: /proximos da fila/i });
  const playing = page.getByRole("heading", { name: /^jogando$/i });
  const results = page.locator(".library-results");

  await expect(shell).toBeVisible();
  await expect(nextQueue).toBeVisible();
  await expect(playing).toBeVisible();
  await expect(page.getByText(/ate 3 ativos/i)).toBeVisible();
  await expect(results).toBeVisible();
  await expectElementBefore(page.locator(".library-priority-strip"), results, "Proximos should appear before Biblioteca results");
  await expect(page.locator(".library-game").first()).toBeVisible();
  await expect(page.locator(".library-filter-bar")).toBeVisible();
  await expect(page.locator(".library-action-sheet").first()).toBeVisible();
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
      const parentStyle =
        element.parentElement instanceof HTMLElement
          ? window.getComputedStyle(element.parentElement)
          : null;

      return (
        element.matches(":focus-visible") ||
        style.outlineStyle !== "none" ||
        style.boxShadow !== "none" ||
        Boolean(
          parentStyle &&
            (parentStyle.outlineStyle !== "none" || parentStyle.boxShadow !== "none")
        )
      );
    });

    expect(hasFocusTreatment, `${label} should expose visible keyboard focus`).toBe(true);
    return;
  }

  throw new Error(`${label} was not reachable by tabbing`);
}

async function expectElementBefore(
  first: Locator,
  second: Locator,
  message: string
): Promise<void> {
  const firstHandle = await first.elementHandle();
  const secondHandle = await second.elementHandle();

  expect(firstHandle, `${message}: first element missing`).not.toBeNull();
  expect(secondHandle, `${message}: second element missing`).not.toBeNull();

  const isBefore = await firstHandle!.evaluate((firstElement, secondElement) => {
    return Boolean(firstElement.compareDocumentPosition(secondElement as Node) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, secondHandle);

  expect(isBefore, message).toBe(true);
}

async function expectCardDoesNotOverlap(card: Locator): Promise<void> {
  const cover = card.locator(".library-cover");
  const title = card.locator("h3").first();
  const controls = card.locator(".status-controls").first();

  await expect(cover).toBeVisible();
  await expect(title).toBeVisible();
  await expect(controls).toBeVisible();
  await expectNoOverlap(cover, controls, "Biblioteca cover overlaps action cluster");
  await expectNoOverlap(title, controls, "Biblioteca title overlaps action cluster");
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

function expectNoHydrationErrors(messages: string[]): void {
  expect(messages, `Unexpected hydration console errors: ${messages.join("\n")}`).toEqual([]);
}
