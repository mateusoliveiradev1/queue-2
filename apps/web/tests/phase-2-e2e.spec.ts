import { expect, test, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const readyActor = actorFromEnv("E2E_READY_USER");
const phase2MissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_PHASE2_CATALOG_SLUG"
]);

reportMissingEnv("Phase 2 catalog/library E2E", phase2MissingEnv);

test.describe("Phase 2 catalog to library flow", () => {
  test.skip(
    phase2MissingEnv.length > 0,
    `Missing Phase 2 E2E fixture: ${phase2MissingEnv.join(", ")}`
  );

  test("opens catalog, adds a game to Wishlist, checks library and detail", async ({ page }) => {
    const slug = process.env.E2E_PHASE2_CATALOG_SLUG!;

    await login(page, readyActor);
    await page.goto("/app/catalogo");
    await expect(page.getByRole("heading", { name: /descobrir sem chutar/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /dados e imagens: rawg/i }).first()).toBeVisible();

    await page.goto(`/app/jogo/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /dados e imagens: rawg/i })).toBeVisible();
    const sourceSection = page.getByRole("region", { name: /fontes e frescor/i });
    await expect(sourceSection).toBeVisible();
    await expect(sourceSection.getByRole("link", { name: /dados e imagens: rawg/i })).toBeVisible();
    await expect(sourceSection.getByText(/descricao em portugues/i)).toBeVisible();
    expect(
      (await sourceSection.getByText(/descricao revisada: queue\/2/i).count()) +
        (await sourceSection.getByText(/sem descricao revisada publicada/i).count())
    ).toBeGreaterThan(0);
    expect(await sourceSection.locator("time[datetime]").count()).toBeGreaterThan(0);
    await expect(page.getByText(/bring your favorite co-op partner/i)).toHaveCount(0);

    const addToWishlist = page.getByRole("button", { name: /adicionar a wishlist/i });
    if ((await addToWishlist.count()) > 0) {
      await addToWishlist.click();
      await expect(page.getByRole("status")).toContainText(/wishlist/i);
    }

    await page.goto("/app/biblioteca");
    await expect(page.getByRole("heading", { name: /a fila compartilhada/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /zerado na fase 4/i }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /dropado na fase 4/i }).first()).toBeDisabled();

    await page.goto(`/app/jogo/${slug}`);
    await expect(page.getByText(/jornada da dupla/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /registrar checkpoint/i })).toHaveCount(0);
  });
});

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
