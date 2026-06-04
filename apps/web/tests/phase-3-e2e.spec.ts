import { expect, test, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const readyActor = actorFromEnv("E2E_READY_USER");
const readyPartner = actorFromEnv("E2E_READY_PARTNER");
const otherDuoActor = actorFromEnv("E2E_OTHER_DUO_USER");
const discoveryQuery = process.env.E2E_PHASE3_DISCOVERY_QUERY ?? "";
const phase3MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE3_DISCOVERY_QUERY"
]);

reportMissingEnv("Phase 3 discovery/match E2E", phase3MissingEnv);

test.describe("Phase 3 discovery ritual", () => {
  test.skip(
    phase3MissingEnv.length > 0,
    `Missing Phase 3 E2E fixture: ${phase3MissingEnv.join(", ")}`
  );

  test("loads deck, modes, filters, source links and keyboard decision controls", async ({ page }) => {
    await login(page, readyActor);
    await page.goto("/app/descobrir");

    await expect(page.getByRole("heading", { name: /os dois quiseram\?/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^live$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^surpresa$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^quiz$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^busca$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^filtros$/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /plataforma comum/i })).toBeChecked();
    await expect(page.locator(".discovery-filter-sheet")).toBeVisible();
    await expect(page.getByText(/mais filtros/i)).toBeVisible();
    const searchDialog = page.getByRole("dialog", { name: /busca no deck/i });
    await expect(searchDialog).toBeVisible();
    await expect(searchDialog.getByRole("combobox", { name: /buscar jogo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /quero jogar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /agora nao/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^pular$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /dados e imagens: rawg/i }).first()).toBeVisible();

    await page.keyboard.press("Tab");
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe("");

    const deck = page.getByRole("group", { name: /deck de descoberta/i });
    await expect(deck).toBeVisible();
    await expect(deck).not.toContainText(/roleta/i);
    await expect(deck).not.toContainText(/sessao live coop/i);
    await expect(deck).not.toContainText(/hall da moral/i);
  });

  test("surprise, mood quiz, autocomplete and filters stay inside Discovery", async ({ page }) => {
    await login(page, readyActor);
    await page.goto("/app/descobrir");

    await page.getByRole("button", { name: /^surpresa$/i }).click();
    await expect(page).toHaveURL(/\/app\/descobrir/);
    await expect(page.getByRole("status")).toContainText(/surpresa/i);

    await page.getByRole("link", { name: /^quiz$/i }).click();
    await page
      .getByRole("group", { name: /qual energia voces tem/i })
      .getByLabel(/media/i)
      .check();
    await page
      .getByRole("group", { name: /qual tamanho de compromisso/i })
      .getByLabel(/constante/i)
      .check();
    await page
      .getByRole("group", { name: /que clima voces querem/i })
      .getByLabel(/flexivel/i)
      .check();
    await page.getByRole("button", { name: /salvar mood/i }).click();
    await expect(page).toHaveURL(/\/app\/descobrir/);
    await expect(page.getByRole("status")).toContainText(/quiz/i);

    const searchDialog = page.getByRole("dialog", { name: /busca no deck/i });
    await searchDialog.getByRole("combobox", { name: /buscar jogo/i }).fill(discoveryQuery);
    const suggestion = searchDialog.getByRole("option").first();
    await expect(suggestion).toBeVisible();
    await suggestion.click();
    await expect(searchDialog.getByText(/contexto selecionado/i)).toBeVisible();

    await page.getByRole("radio", { name: /explorar fora/i }).check();
    await page.getByRole("button", { name: /aplicar filtros/i }).click();
    await expect(page).toHaveURL(/plataforma=livre/);
  });

  test("reciprocal Quero jogar creates celebration before library handoff", async ({ browser }) => {
    const firstContext = await browser.newContext();
    const secondContext = await browser.newContext();
    const firstPage = await firstContext.newPage();
    const secondPage = await secondContext.newPage();

    try {
      await login(firstPage, readyActor);
      await login(secondPage, readyPartner);
      await firstPage.goto("/app/descobrir");
      await secondPage.goto("/app/descobrir");
      await openDiscoverySearchCard(firstPage, discoveryQuery);
      await openDiscoverySearchCard(secondPage, discoveryQuery);

      await firstPage.getByRole("button", { name: /quero jogar/i }).click();
      await expect(firstPage.getByRole("status")).not.toContainText(/match da dupla criado/i);

      await secondPage.getByRole("button", { name: /quero jogar/i }).click();
      await expect(secondPage.getByRole("status")).toContainText(/match da dupla criado/i);
      await expect(secondPage.getByRole("heading", { name: new RegExp(discoveryQuery, "i") })).toBeVisible();
      await expect(secondPage.getByRole("button", { name: /enviar para wishlist/i })).toBeVisible();
      await expect(secondPage.getByRole("button", { name: /zerado bloqueado/i })).toBeDisabled();
      await expect(secondPage.getByRole("button", { name: /dropado bloqueado/i })).toBeDisabled();
    } finally {
      await firstContext.close();
      await secondContext.close();
    }
  });

  test("Match Live updates in-app and remains scoped to the current duo", async ({ page }) => {
    await login(page, readyActor);
    await page.goto("/app/descobrir");
    await page.getByRole("button", { name: /^live$/i }).click();
    await expect(page).toHaveURL(/live=/);
    await expect(page.getByText(/atualizando a live/i)).toBeVisible();

    const liveId = new URL(page.url()).searchParams.get("live");
    expect(liveId).toBeTruthy();

    const liveResponse = await page.request.get(`/api/discovery/live/${liveId}`);
    expect(liveResponse.headers()["cache-control"]).toContain("no-store");
    expect(liveResponse.ok()).toBe(true);

    await page.context().clearCookies();
    await login(page, otherDuoActor);
    const otherDuoResponse = await page.request.get(`/api/discovery/live/${liveId}`);
    expect([403, 404]).toContain(otherDuoResponse.status());
  });

  test("library handoff stays valid, non-duplicating and returns to Discovery", async ({ page }) => {
    await login(page, readyActor);
    await page.goto("/app/descobrir?estado=match-ja-existe");

    const firstMatch = page.getByRole("status").filter({ hasText: /primeiro o match/i }).first();
    await expect(firstMatch).toBeVisible();

    const wishlistButton = firstMatch.getByRole("button", { name: /wishlist/i }).first();
    if ((await wishlistButton.count()) > 0) {
      await wishlistButton.click();
      await expect(page).toHaveURL(/\/app\/descobrir/);
      await expect(page.getByRole("status")).toContainText(/biblioteca atualizada/i);
    }

    await page.goto("/app/biblioteca");
    const matchingRows = page.getByText(new RegExp(discoveryQuery, "i"));
    expect(await matchingRows.count()).toBeLessThanOrEqual(1);
    await expect(page.getByRole("button", { name: /zerado bloqueado/i }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /dropado bloqueado/i }).first()).toBeDisabled();
  });
});

async function openDiscoverySearchCard(page: Page, query: string): Promise<void> {
  const searchDialog = page.getByRole("dialog", { name: /busca no deck/i });
  await searchDialog.getByRole("combobox", { name: /buscar jogo/i }).fill(query);
  const option = searchDialog.getByRole("option").filter({ hasText: new RegExp(query, "i") }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(searchDialog.getByText(/contexto selecionado/i)).toBeVisible();
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
