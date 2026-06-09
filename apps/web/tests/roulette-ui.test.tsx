import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const rouletteUiFiles = [
  "src/app/app/roleta/page.tsx",
  "src/modules/roulette/presentation/view-models.ts",
  "src/components/app-shell.tsx",
  "src/app/globals.css"
];

describe("Phase 6 roulette route shell", () => {
  it("composes the authenticated route from public server contracts only", () => {
    const pageSource = readRequiredSource("src/app/app/roleta/page.tsx");

    expect(pageSource).toContain("requireVerifiedSession");
    expect(pageSource).toContain("getRouletteState");
    expect(pageSource).toContain("getRouletteHistory");
    expect(pageSource).toContain("currentPage=\"roleta\"");
    expect(pageSource).toContain("toRouletteRouteViewModel");
    expect(pageSource).not.toContain("modules/roulette/application");
    expect(pageSource).not.toContain("modules/roulette/infrastructure");
  });

  it("covers exact PT-BR route, blocked pool, boost, pity, persisted and history copy", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("Roleta da dupla");
    expect(source).toContain("A fila escolhe agora");
    expect(source).toContain("A roleta usa Wishlist e Pausado. O resultado e guardado antes da revelacao.");
    expect(source).toContain("A roleta precisa de tres jogos");
    expect(source).toContain("Coloquem pelo menos tres jogos em Wishlist ou Pausado. Depois a fila escolhe com peso real, nao com surpresa vazia.");
    expect(source).toContain("Abrir Biblioteca");
    expect(source).toContain("Descobrir jogos");
    expect(source).toContain("Buscar no Catalogo");
    expect(source).toContain("Sortear da fila");
    expect(source).toContain("Usar boost - 100 saldo");
    expect(source).toContain("Boost indisponivel agora");
    expect(source).toContain("Garantia epica se aproxima");
    expect(source).toContain("Resultado guardado. Revelando para a dupla.");
    expect(source).toContain("A fila apontou para este. Voces travam como Principal?");
    expect(source).toContain("Travar como Principal");
    expect(source).toContain("Rever giro salvo");
    expect(source).toContain("Replay nao e novo sorteio.");
    expect(source).toContain("Historico da roleta");
    expect(source).toContain("Os sorteios aparecem aqui depois da primeira rodada.");
    expect(source).toContain("Som da roleta ligado");
    expect(source).toContain("Som da roleta desligado");
  });

  it("maps exactly one first-viewport server state for the route shell", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("blocked-pool");
    expect(source).toContain("ready");
    expect(source).toContain("revealing");
    expect(source).toContain("pending_invitation");
    expect(source).toContain("history-backed-empty");
    expect(source).toContain("audioEnabled");
    expect(source).toContain("defaultEnabledFromDuoPreference");
  });

  it("exposes Roleta in authenticated navigation between Biblioteca and Conquistas", () => {
    const appShellSource = readRequiredSource("src/components/app-shell.tsx");

    expect(appShellSource).toContain('| "roleta"');
    expect(appShellSource).toContain('href: "/app/roleta"');
    expect(appShellSource).toMatch(/Fila[\s\S]*Catalogo[\s\S]*Descobrir[\s\S]*Biblioteca[\s\S]*Roleta[\s\S]*Conquistas[\s\S]*Desafios[\s\S]*Dupla[\s\S]*Perfil/);
  });

  it("keeps nine mobile nav labels readable with stable scrollable targets", () => {
    const appShellSource = readRequiredSource("src/components/app-shell.tsx");
    const cssSource = readRequiredSource("src/app/globals.css");

    for (const label of [
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
      expect(appShellSource).toContain(`label: "${label}"`);
    }

    expect(cssSource).toContain("overflow-x: auto");
    expect(cssSource).toContain("min-width: 72px");
    expect(cssSource).toContain("min-height: 52px");
    expect(cssSource).toContain("safe-area-inset-bottom");
    expect(cssSource).toContain("scroll-padding");
    expect(cssSource).toContain("scrollbar-width");
  });
});

function readRouletteUiSources(): string {
  return rouletteUiFiles.map(readRequiredSource).join("\n/* roulette-ui-boundary */\n");
}

function readRequiredSource(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`missing Phase 6 implementation file: ${path}`);
  }

  return readFileSync(path, "utf8");
}
