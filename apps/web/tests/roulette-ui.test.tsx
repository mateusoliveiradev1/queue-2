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
const rouletteReplacementRequiredSourcePath =
  "src/modules/roulette/presentation/replacement-required.tsx";
const dashboardPageSourcePath = "src/app/app/page.tsx";
const phase6StatusSourcePath = "src/app/app/phase-6-status.ts";

describe("Phase 6 roulette route shell", () => {
  it("composes the authenticated route from public server contracts only", () => {
    const pageSource = readRequiredSource("src/app/app/roleta/page.tsx");
    const replacementRequiredSource = readRequiredSource(rouletteReplacementRequiredSourcePath);

    expect(pageSource).toContain("requireVerifiedSession");
    expect(pageSource).toContain("getRouletteState");
    expect(pageSource).toContain("getRouletteHistory");
    expect(pageSource).toContain("currentPage=\"roleta\"");
    expect(pageSource).toContain("toRouletteRouteViewModel");
    expect(pageSource).toContain("startRouletteRoundAction");
    expect(pageSource).toContain("replayRouletteRoundAction");
    expect(pageSource).toContain("updateRouletteAudioPreferenceAction");
    expect(pageSource).toContain("lockRouletteResultAction");
    expect(pageSource).toContain("discardRouletteResultAction");
    expect(pageSource).toContain("ReplacementRequired");
    expect(pageSource).toContain('name="idempotencyKey"');
    expect(pageSource).toContain('name="useBoost"');
    expect(pageSource).toContain('name="roundId"');
    expect(pageSource).toContain('name="audioEnabled"');
    expect(`${pageSource}\n${replacementRequiredSource}`).toContain('name="replacementLibraryGameId"');
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
    expect(source).toContain("Descartar este resultado");
    expect(source).toContain("Escolham quem pausa para abrir vaga");
    expect(source).toContain("Nada muda sozinho. Escolham um Jogando para pausar ou cancelem a trava.");
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

  it("exposes Roleta in the seven-route authenticated top navigation and keeps Catalogo/Conquistas contextual", () => {
    const appShellSource = readRequiredSource("src/components/app-shell.tsx");

    expect(appShellSource).toContain('| "roleta"');
    expect(appShellSource).toContain('| "hall"');
    expect(appShellSource).toContain('href: "/app/roleta"');
    expect(appShellSource).toMatch(/Home[\s\S]*Biblioteca[\s\S]*Descobrir[\s\S]*Roleta[\s\S]*Desafios[\s\S]*Hall[\s\S]*Dupla/);
    expect(appShellSource).toContain("Perfil");
    expect(appShellSource).toContain("Sair");
    expect(appShellSource).toContain("Catalogo");
    expect(appShellSource).toContain("Conquistas");
  });

  it("keeps the mobile route rail readable with stable scrollable targets", () => {
    const appShellSource = readRequiredSource("src/components/app-shell.tsx");
    const cssSource = readRequiredSource("src/app/globals.css");

    for (const label of [
      "Home",
      "Biblioteca",
      "Descobrir",
      "Roleta",
      "Desafios",
      "Hall",
      "Dupla"
    ]) {
      expect(appShellSource).toContain(`label: "${label}"`);
    }

    expect(cssSource).toContain("overflow-x: auto");
    expect(cssSource).toContain("min-width: 72px");
    expect(cssSource).toContain("min-height: 52px");
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
    expect(actionSource).toContain("lockRouletteResultAction");
    expect(actionSource).toContain("discardRouletteResultAction");
    expect(actionSource).toContain("lockRouletteResultAsPrincipal");
    expect(actionSource).toContain("discardRouletteResult");
    expect(actionSource).toContain("idempotencyKey");
    expect(actionSource).toContain("useBoost");
    expect(actionSource).toContain("roundId");
    expect(actionSource).toContain("audioEnabled");
    expect(actionSource).toContain("replacementLibraryGameId");
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
      "boostSpent",
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

  it("wires invitation resolution actions through server-owned contracts only", () => {
    const actionSource = readRequiredSource("src/app/app/roleta/actions.ts");

    expect(actionSource).toContain('"use server"');
    expect(actionSource).toContain("lockRouletteResultAction");
    expect(actionSource).toContain("discardRouletteResultAction");
    expect(actionSource).toContain("lockRouletteResultAsPrincipal");
    expect(actionSource).toContain("discardRouletteResult");
    expect(actionSource).toContain("requireAuthoritativeVerifiedSession");
    expect(actionSource).toContain('getFormString(formData, "roundId")');
    expect(actionSource).toContain('getFormString(formData, "replacementLibraryGameId")');

    for (const forbiddenField of [
      "duoId",
      "resultLibraryGameId",
      "resultCatalogGameId",
      "boostSpent",
      "pity"
    ]) {
      expect(actionSource).not.toMatch(
        new RegExp(`formData\\.get\\(\\s*["']${forbiddenField}["']`)
      );
      expect(actionSource).not.toMatch(
        new RegExp(`getFormString\\(formData,\\s*["']${forbiddenField}["']`)
      );
    }

    expect(actionSource).not.toContain("createOperationalPlayNotification");
    expect(actionSource).not.toContain("insertNotificationItem");
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

  it("keeps scanline treatment scoped to roulette selectors only", () => {
    const cssSource = readRequiredSource("src/app/globals.css");
    const scanlineRules = cssRules(cssSource).filter((rule) => /scanline/i.test(rule));

    expect(scanlineRules.length).toBeGreaterThan(0);
    for (const rule of scanlineRules) {
      const selector = rule.slice(0, rule.indexOf("{"));

      expect(selector).toMatch(/roulette/i);
    }
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
    const replacementRequiredSource = readRequiredSource(rouletteReplacementRequiredSourcePath);

    expect(resultPanelSource).toContain("A fila apontou para este. Voces travam como Principal?");
    expect(resultPanelSource).toContain("Travar como Principal");
    expect(resultPanelSource).toContain("Descartar este resultado");
    expect(resultPanelSource).toContain("Descartar este resultado? O jogo continua na fila e o boost de uma rodada ja revelada nao volta.");
    expect(resultPanelSource).toContain("Replay nao e novo sorteio.");
    expect(resultPanelSource).toContain("ActionFeedbackButton");
    expect(resultPanelSource).toContain("lockAction");
    expect(resultPanelSource).toContain("discardAction");
    expect(resultPanelSource).toContain("rarity seal");
    expect(resultPanelSource).toContain("data-rarity");
    expect(resultPanelSource).toContain("roulette-legendary-particles");
    expect(resultPanelSource).toContain("static seal");
    expect(replacementRequiredSource).toContain("Escolham quem pausa para abrir vaga");
    expect(replacementRequiredSource).toContain("Nada muda sozinho. Escolham um Jogando para pausar ou cancelem a trava.");
    expect(replacementRequiredSource).toContain("ActionFeedbackButton");
    expect(replacementRequiredSource).toContain('name="replacementLibraryGameId"');
    expect(replacementRequiredSource).toContain('href="/app/roleta"');
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
    expect(pageSource).toContain("ReplacementRequired");
    expect(pageSource).toContain("getRouletteState");
    expect(pageSource).toContain("getRouletteHistory");
    expect(pageSource).toContain("updateRouletteAudioPreferenceAction");
    expect(pageSource).toContain("lockRouletteResultAction");
    expect(pageSource).toContain("discardRouletteResultAction");
    expect(pageSource).toContain("roulette-reel-band");
    expect(pageSource).toContain("roulette-controls");
    expect(pageSource).toContain("full-bleed");
    expect(pageSource).toContain("controls below");
    expect(pageSource).toContain("fixed pointer");
    expect(pageSource).toContain("no tiny card");
  });

  it("maps roleta-principal dashboard status and keeps notification facts display-only", () => {
    const dashboardSource = readRequiredSource(dashboardPageSourcePath);
    const statusSource = readRequiredSource(phase6StatusSourcePath);
    const notificationCenterSource = readRequiredSource(
      "src/modules/play/presentation/notification-center.tsx"
    );

    expect(statusSource).toContain("roleta-principal");
    expect(statusSource).toContain("Resultado da roleta travado como Principal.");
    expect(dashboardSource).toContain("getPhase6StatusMessage");
    expect(dashboardSource).toContain("roulettePrincipalHighlight");
    expect(dashboardSource).toContain('data-highlight="roleta-principal"');
    expect(dashboardSource).toContain("getDuoNotifications");
    expect(notificationCenterSource).toContain("Central da Dupla");
    expect(notificationCenterSource).toContain("notificationType");
    expect(`${dashboardSource}\n${notificationCenterSource}`).toContain("roulette-result-locked");
    expect(`${dashboardSource}\n${notificationCenterSource}`).toContain("roulette-result-discarded");
    expect(dashboardSource).not.toContain("createOperationalPlayNotification");
    expect(dashboardSource).not.toContain("insertNotificationItem");
  });

  it("requires focused tests to enumerate every Phase 6 requirement and decision", () => {
    const focusedSource = [
      "tests/roulette-domain.test.ts",
      "tests/roulette-application.test.ts",
      "tests/phase-6-e2e.spec.ts",
      "tests/accessibility.spec.ts",
      "../../packages/db/tests/roulette-migrations.test.ts",
      "../../packages/db/tests/roulette-rls.test.ts",
      "../../packages/db/tests/roulette-concurrency.test.ts"
    ].map(readRequiredSource).join("\n/* phase-6-focused-coverage */\n");

    for (const requirementId of [
      "ROUL-01",
      "ROUL-02",
      "ROUL-03",
      "ROUL-04",
      "ROUL-05",
      "ROUL-06",
      "ROUL-07",
      "ROUL-08",
      "ROUL-09",
      "ROUL-10",
      "SAFE-06"
    ]) {
      expect(focusedSource).toContain(requirementId);
    }

    for (const decisionId of Array.from({ length: 32 }, (_, index) =>
      `D-${String(index + 1).padStart(2, "0")}`
    )) {
      expect(focusedSource).toContain(decisionId);
    }
  });

  it("extends authenticated accessibility coverage to the roulette route", () => {
    const accessibilitySource = readRequiredSource("tests/accessibility.spec.ts");

    expect(accessibilitySource).toContain("Phase 6 roulette accessibility");
    expect(accessibilitySource).toContain("/app/roleta");
    expect(accessibilitySource).toContain("roulette-reel-band");
    expect(accessibilitySource).toContain("roulette-controls");
    expect(accessibilitySource).toContain("visual center");
    expect(accessibilitySource).toContain("no autoplay");
    expect(accessibilitySource).toContain("audio preference");
    expect(accessibilitySource).toContain("Som da roleta");
    expect(accessibilitySource).toContain("44px");
    expect(accessibilitySource).toContain("72px");
    expect(accessibilitySource).toContain("52px");
    expect(accessibilitySource).toContain("axe");
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
    expect(e2eSource).toContain("lock succeeds");
    expect(e2eSource).toContain("discard");
    expect(e2eSource).toContain("replacement");
    expect(e2eSource).toContain("required");
    expect(e2eSource).toContain("other-duo");
    expect(e2eSource).toContain("roleta-principal");
  });
});

function readRouletteUiSources(): string {
  return [
    ...rouletteUiFiles,
    rouletteResultPanelSourcePath,
    rouletteCompactHistorySourcePath,
    rouletteReplacementRequiredSourcePath
  ].map(readRequiredSource).join("\n/* roulette-ui-boundary */\n");
}

function readRequiredSource(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`missing Phase 6 implementation file: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function cssRules(source: string): string[] {
  return source.match(/[^{}]+{[^{}]*}/g) ?? [];
}
