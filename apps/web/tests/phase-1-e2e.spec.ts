import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

type E2EActor = {
  email: string;
  password: string;
};

const flowActors = {
  owner: actorFromEnv("E2E_FLOW_OWNER"),
  partner: actorFromEnv("E2E_FLOW_PARTNER"),
  third: actorFromEnv("E2E_FLOW_THIRD")
};
const readyActors = {
  first: actorFromEnv("E2E_READY_USER"),
  otherDuo: actorFromEnv("E2E_OTHER_DUO_USER")
};
const baseURL = process.env.E2E_BASE_URL;
const flowMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_FLOW_OWNER_EMAIL",
  "E2E_FLOW_OWNER_PASSWORD",
  "E2E_FLOW_PARTNER_EMAIL",
  "E2E_FLOW_PARTNER_PASSWORD",
  "E2E_FLOW_THIRD_EMAIL",
  "E2E_FLOW_THIRD_PASSWORD"
]);
const readyMissingEnv = missingEnv([
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_DUO_NAME",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_OTHER_DUO_NAME"
]);

reportMissingEnv("Phase 1 flow E2E", flowMissingEnv);
reportMissingEnv("Phase 1 cross-duo E2E", readyMissingEnv);

test.describe("Phase 1 auth and duo flow", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    flowMissingEnv.length > 0,
    `Missing isolated E2E environment: ${flowMissingEnv.join(", ")}`
  );

  test("signup, verification surface and reset request use the custom auth flow", async ({ page }) => {
    const timestamp = Date.now();
    const uniqueEmail = `queue2-e2e-${timestamp}@example.com`;
    const correctedEmail = `queue2-e2e-corrected-${timestamp}@example.com`;

    await page.goto("/cadastro");
    await page.getByLabel(/nome de exibicao/i).fill("Jogador E2E");
    await page.getByLabel(/^email$/i).fill(uniqueEmail);
    await page.getByLabel(/^senha$/i).fill("Fila!2026-E2E");
    await page.getByRole("button", { name: /criar conta/i }).click();

    await expect(page).toHaveURL(/\/verificar-email\?/);
    await expect(page.getByRole("status")).toContainText(/cadastro recebido/i);
    await expect(page.getByRole("button", { name: /reenviar email/i })).toBeVisible();
    await expect(page.getByLabel(/corrigir email/i)).toBeVisible();

    await page.getByLabel(/corrigir email/i).fill(correctedEmail);
    await page.getByLabel(/senha escolhida/i).fill("Fila!2026-E2E");
    await page.getByRole("button", { name: /corrigir e enviar de novo/i }).click();

    await expect(page).toHaveURL(/\/verificar-email\?/);
    await expect(page.getByRole("status")).toContainText(/nova verificacao/i);
    await expect(page.getByText(correctedEmail)).toBeVisible();

    await page.goto("/recuperar-senha");
    await page.getByLabel(/email da conta/i).fill(correctedEmail);
    await page.getByRole("button", { name: /enviar link seguro/i }).click();

    await expect(page).toHaveURL(/\/recuperar-senha\?estado=enviado/);
    await expect(page.getByRole("status")).toContainText(/se o email existir/i);
  });

  test("verified user without duo is contained in pairing routes", async ({ page }) => {
    await login(page, flowActors.owner);

    await expect(page).toHaveURL(/\/parear/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/parear/);
    await expect(page.getByRole("heading", { name: /parear a dupla/i })).toBeVisible();
  });

  test("pairing forms exactly one named duo and rejects a third member", async ({ browser }) => {
    const owner = await openLoggedInPage(browser, flowActors.owner);
    const partner = await openLoggedInPage(browser, flowActors.partner);
    const third = await openLoggedInPage(browser, flowActors.third);

    try {
      await owner.page.getByRole("button", { name: /criar codigo da dupla/i }).click();
      const codeOutput = owner.page.getByLabel(/codigo de pareamento/i);
      await expect(codeOutput).toBeVisible();
      const code = (await codeOutput.textContent())?.trim() ?? "";
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

      await partner.page.getByRole("tab", { name: /entrar com codigo/i }).click();
      await partner.page.getByLabel(/codigo da dupla/i).fill(code);
      await partner.page.getByRole("button", { name: /entrar com codigo/i }).click();
      await expect(partner.page).toHaveURL(/\/app\/dupla\?estado=dupla-formada/);
      await expect(partner.page.getByRole("status")).toContainText(/fila agora e nossa/i);

      await partner.page.getByLabel(/nome da dupla/i).fill("Dupla E2E da Fila");
      await partner.page.getByRole("button", { name: /salvar dupla/i }).click();
      await expect(partner.page.getByRole("status")).toContainText(/dupla atualizadas/i);

      await owner.page.goto("/app");
      await expect(owner.page.getByRole("heading", { name: /fila ainda esta vazia/i })).toBeVisible();
      await expect(owner.page.getByText("Dupla E2E da Fila")).toBeVisible();
      await expect(owner.page.getByText("2/2")).toBeVisible();

      await third.page.getByRole("tab", { name: /entrar com codigo/i }).click();
      await third.page.getByLabel(/codigo da dupla/i).fill(code);
      await third.page.getByRole("button", { name: /entrar com codigo/i }).click();
      await expect(third.page).toHaveURL(/\/parear/);
      await expect(third.page.getByRole("status")).toContainText(/codigo nao esta mais ativo/i);

      await third.page.goto("/app");
      await expect(third.page).toHaveURL(/\/parear/);
      await expect(third.page.getByText("Dupla E2E da Fila")).toHaveCount(0);
    } finally {
      await Promise.all([owner.context.close(), partner.context.close(), third.context.close()]);
    }
  });

  test("profile session revocation invalidates another active browser session", async ({ browser }) => {
    const current = await openLoggedInPage(browser, flowActors.owner);
    const secondary = await openLoggedInPage(browser, flowActors.owner);

    try {
      await current.page.goto("/app/perfil");
      const revokeButtons = current.page.getByRole("button", { name: /encerrar sessao/i });
      await expect(revokeButtons.first()).toBeVisible();

      while ((await revokeButtons.count()) > 0) {
        await revokeButtons.first().click();
        await expect(current.page.getByRole("status")).toContainText(/sessao revogada/i);
      }

      await secondary.page.goto("/app");
      await expect(secondary.page).toHaveURL(/\/login/);
    } finally {
      await Promise.all([current.context.close(), secondary.context.close()]);
    }
  });
});

test.describe("Phase 1 cross-duo route isolation", () => {
  test.skip(
    readyMissingEnv.length > 0,
    `Missing pre-paired cross-duo E2E fixtures: ${readyMissingEnv.join(", ")}`
  );

  test("each signed-in duo sees only its own identity through app routes", async ({ browser }) => {
    const first = await openLoggedInPage(browser, readyActors.first);
    const other = await openLoggedInPage(browser, readyActors.otherDuo);
    const firstDuoName = process.env.E2E_READY_DUO_NAME!;
    const otherDuoName = process.env.E2E_OTHER_DUO_NAME!;

    try {
      await first.page.goto("/app/dupla");
      await expect(first.page.getByRole("heading", { name: firstDuoName })).toBeVisible();
      await expect(first.page.getByText(otherDuoName)).toHaveCount(0);

      await other.page.goto("/app/dupla");
      await expect(other.page.getByRole("heading", { name: otherDuoName })).toBeVisible();
      await expect(other.page.getByText(firstDuoName)).toHaveCount(0);
    } finally {
      await Promise.all([first.context.close(), other.context.close()]);
    }
  });
});

async function login(page: Page, actor: E2EActor): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^email$/i).fill(actor.email);
  await page.getByLabel(/^senha$/i).fill(actor.password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL(/\/(?:parear|app)/);
}

async function openLoggedInPage(
  browser: Browser,
  actor: E2EActor
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL
  });
  const page = await context.newPage();
  await login(page, actor);

  return { context, page };
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
