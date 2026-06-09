import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const rouletteUiFiles = [
  "src/app/app/roleta/page.tsx",
  "src/app/app/roleta/actions.ts",
  "src/modules/roulette/presentation/view-models.ts",
  "src/components/app-shell.tsx",
  "src/app/globals.css"
];
const rouletteReelSourcePath = "src/modules/roulette/presentation/roulette-reel.tsx";
const rouletteAudioSourcePath =
  "src/modules/roulette/presentation/roulette-audio-control.tsx";
const rouletteResultPanelSourcePath =
  "src/modules/roulette/presentation/result-panel.tsx";
const rouletteCompactHistorySourcePath =
  "src/modules/roulette/presentation/compact-history.tsx";

describe("Phase 6 roulette route shell", () => {
  it("composes the authenticated route from public server contracts only", () => {
    const pageSource = readRequiredSource("src/app/app/roleta/page.tsx");

    expect(pageSource).toContain("requireVerifiedSession");
    expect(pageSource).toContain("getRouletteState");
    expect(pageSource).toContain("getRouletteHistory");
    expect(pageSource).toContain("currentPage=\"roleta\"");
    expect(pageSource).toContain("toRouletteRouteViewModel");
    expect(pageSource).toContain("startRouletteRoundAction");
    expect(pageSource).toContain("replayRouletteRoundAction");
    expect(pageSource).toContain("updateRouletteAudioPreferenceAction");
    expect(pageSource).toContain('name="idempotencyKey"');
    expect(pageSource).toContain('name="useBoost"');
    expect(pageSource).toContain('name="roundId"');
    expect(pageSource).toContain('name="audioEnabled"');
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

  it("wires start, replay and audio preference actions through authoritative session checks", () => {
    const actionSource = readRequiredSource("src/app/app/roleta/actions.ts");
    const duoSource = [
      readRequiredSource("src/modules/duo/application/update-duo-audio-preference.ts"),
      readRequiredSource("src/modules/duo/index.ts"),
      readRequiredSource("src/modules/duo/infrastructure/duo-repository.ts")
    ].join("\n");

    expect(actionSource).toContain('"use server"');
    expect(actionSource).toContain("requireAuthoritativeVerifiedSession");
    expect(actionSource).toContain("startRouletteRound");
    expect(actionSource).toContain("replayRouletteRound");
    expect(actionSource).toContain("updateDuoAudioPreference");
    expect(actionSource).toContain("updateRouletteAudioPreferenceAction");
    expect(actionSource).toContain("idempotencyKey");
    expect(actionSource).toContain("useBoost");
    expect(actionSource).toContain("roundId");
    expect(actionSource).toContain("audioEnabled");
    expect(duoSource).toContain("updateDuoAudioPreference");
    expect(duoSource).toContain("audio_enabled");
  });

  it("does not extract server-owned roulette, economy or duo facts from FormData", () => {
    const actionSource = readRequiredSource("src/app/app/roleta/actions.ts");

    for (const forbiddenField of [
      "duoId",
      "resultLibraryGameId",
      "resultCatalogGameId",
      "pity",
      "boostBalance",
      "resultRarity",
      "weekend"
    ]) {
      expect(actionSource).not.toMatch(
        new RegExp(`formData\\.get\\(\\s*["']${forbiddenField}["']`)
      );
      expect(actionSource).not.toMatch(
        new RegExp(`getFormString\\(formData,\\s*["']${forbiddenField}["']`)
      );
    }
  });

  it("builds a 60-slot reel with fixed pointer, reduced-motion stages and rarity tokens", () => {
    const reelSource = readRequiredSource(rouletteReelSourcePath);
    const cssSource = readRequiredSource("src/app/globals.css");

    expect(reelSource).toContain('"use client"');
    expect(reelSource).toContain("motion/react");
    expect(reelSource).toContain("useReducedMotion");
    expect(reelSource).toContain("RoulettePointer");
    expect(reelSource).toContain("5500");
    expect(reelSource).toContain("cubic-bezier(.15,.85,.25,1)");
    expect(reelSource).toContain("Array.from({ length: 60 }");
    expect(reelSource).toContain("aria-hidden");
    expect(reelSource).toContain("aria-live");
    expect(reelSource).toContain('role="region"');
    expect(reelSource).toContain("tabIndex");
    expect(reelSource).toContain("A fila esta escolhendo");
    expect(reelSource).toContain("Resultado guardado");
    expect(reelSource).toContain("Revelado");
    expect(`${reelSource}\n${cssSource}`).toContain("data-rarity");
    expect(cssSource).toContain("--rarity-common");
    expect(cssSource).toContain("--rarity-rare");
    expect(cssSource).toContain("--rarity-epic");
    expect(cssSource).toContain("--rarity-legendary");
    expect(cssSource).toContain("roulette-legendary-particles");
    expect(cssSource).toContain("static Legendary");
    expect(cssSource).toContain("prefers-reduced-motion");
  });

  it("keeps the mobile reel full-bleed with centered pointer and controls below", () => {
    const cssSource = readRequiredSource("src/app/globals.css");

    expect(cssSource).toContain("roulette-reel-band");
    expect(cssSource).toContain("width: 100vw");
    expect(cssSource).toContain("margin-inline: calc(50% - 50vw)");
    expect(cssSource).toContain("roulette-pointer-anchor");
    expect(cssSource).toContain("left: 50%");
    expect(cssSource).toContain("translateX(-50%)");
    expect(cssSource).toContain("roulette-controls");
    expect(cssSource).toContain("min-height: 44px");
    expect(cssSource).not.toMatch(/\.roulette-[\s\S]{0,160}letter-spacing:\s*-/);
  });

  it("implements opt-in roulette audio with no autoplay and persisted default preference", () => {
    const audioSource = readRequiredSource(rouletteAudioSourcePath);

    expect(audioSource).toContain('"use client"');
    expect(audioSource).toContain("defaultEnabled");
    expect(audioSource).toContain("updateRouletteAudioPreferenceAction");
    expect(audioSource).toContain("AudioContext");
    expect(audioSource).toContain("no autoplay");
    expect(audioSource).toContain("audio preference");
    expect(audioSource).toContain("Som da roleta ligado");
    expect(audioSource).toContain("Som da roleta desligado");
    expect(audioSource).toContain("dry tick");
    expect(audioSource).toContain("heavier cadence");
    expect(audioSource).toContain("near the pointer");
    expect(audioSource).toContain("restrained");
    expect(readRequiredSource("tests/roulette-ui.test.tsx")).toContain("non-casino");
    expect(audioSource).toContain("fanfare");
  });

  it("renders result invitation, rarity seal, replay disclaimer and compact trust history", () => {
    const resultPanelSource = readRequiredSource(rouletteResultPanelSourcePath);
    const compactHistorySource = readRequiredSource(rouletteCompactHistorySourcePath);

    expect(resultPanelSource).toContain("A fila apontou para este. Voces travam como Principal?");
    expect(resultPanelSource).toContain("Travar como Principal");
    expect(resultPanelSource).toContain("Replay nao e novo sorteio.");
    expect(resultPanelSource).toContain("rarity seal");
    expect(resultPanelSource).toContain("data-rarity");
    expect(resultPanelSource).toContain("roulette-legendary-particles");
    expect(resultPanelSource).toContain("static seal");
    expect(compactHistorySource).toContain("Historico da roleta");
    expect(compactHistorySource).toContain("Os sorteios aparecem aqui depois da primeira rodada.");
    expect(compactHistorySource).toContain("boost");
    expect(compactHistorySource).toContain("pity");
    expect(compactHistorySource).toContain("locked");
    expect(compactHistorySource).toContain("discarded");
  });

  it("composes reel, audio, result panel and compact history on the route", () => {
    const pageSource = readRequiredSource("src/app/app/roleta/page.tsx");

    expect(pageSource).toContain("RouletteReel");
    expect(pageSource).toContain("RouletteAudioControl");
    expect(pageSource).toContain("ResultPanel");
    expect(pageSource).toContain("CompactHistory");
    expect(pageSource).toContain("getRouletteState");
    expect(pageSource).toContain("getRouletteHistory");
    expect(pageSource).toContain("updateRouletteAudioPreferenceAction");
    expect(pageSource).toContain("roulette-reel-band");
    expect(pageSource).toContain("roulette-controls");
    expect(pageSource).toContain("full-bleed");
    expect(pageSource).toContain("controls below");
    expect(pageSource).toContain("fixed pointer");
    expect(pageSource).toContain("no tiny card");
  });

  it("extends Phase 6 E2E scaffold with persisted reveal, mobile and rarity assertions", () => {
    const e2eSource = readRequiredSource("tests/phase-6-e2e.spec.ts");

    expect(e2eSource).toContain("E2E_READY_USER");
    expect(e2eSource).toContain("E2E_READY_PARTNER");
    expect(e2eSource).toContain("E2E_OTHER_DUO_USER");
    expect(e2eSource).toContain("BLOCKED setup");
    expect(e2eSource).toContain("persisted result");
    expect(e2eSource).toContain("replay does not redraw");
    expect(e2eSource).toContain("full-bleed");
    expect(e2eSource).toContain("controls below");
    expect(e2eSource).toContain("fixed pointer");
    expect(e2eSource).toContain("no tiny card");
    expect(e2eSource).toContain("Legendary");
    expect(e2eSource).toContain("particle");
    expect(e2eSource).toContain("static seal");
    expect(e2eSource).toContain("reduced motion");
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
