import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const rouletteUiFiles = [
  "src/app/app/roleta/page.tsx",
  "src/app/app/roleta/actions.ts",
  "src/modules/roulette/presentation/roulette-reel.tsx",
  "src/modules/roulette/presentation/roulette-audio-control.tsx",
  "src/modules/roulette/presentation/result-panel.tsx",
  "src/modules/roulette/presentation/compact-history.tsx",
  "src/modules/roulette/presentation/replacement-required.tsx",
  "src/components/app-shell.tsx",
  "src/app/globals.css"
];

describe("Phase 6 roulette UI scaffold", () => {
  it("covers exact PT-BR route, blocked pool, result, replacement and history copy", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("Roleta da dupla");
    expect(source).toContain("A fila escolhe agora");
    expect(source).toContain("A roleta precisa de tres jogos");
    expect(source).toContain("Abrir Biblioteca");
    expect(source).toContain("Descobrir jogos");
    expect(source).toContain("Buscar no Catalogo");
    expect(source).toContain("A fila apontou para este. Voces travam como Principal?");
    expect(source).toContain("Travar como Principal");
    expect(source).toContain("Escolham quem pausa para abrir vaga");
    expect(source).toContain("Nada muda sozinho. Escolham um Jogando para pausar ou cancelem a trava.");
    expect(source).toContain("Historico da roleta");
  });

  it("requires exactly 60 decorative cover slots, a central pointer and stable reel dimensions", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("60");
    expect(source).toContain("ROULETTE_REEL_SLOT_COUNT");
    expect(source).toContain("aria-hidden");
    expect(source).toContain("RoulettePointer");
    expect(source).toMatch(/central pointer|ponteiro central|pointer/i);
    expect(source).toContain("aspect-ratio: 3 / 4");
    expect(source).toContain("object-fit: cover");
  });

  it("locks the normal reveal to 5500ms with cubic-bezier(.15,.85,.25,1)", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("5500");
    expect(source).toContain("cubic-bezier(.15,.85,.25,1)");
    expect(source).toContain("Resultado guardado. Revelando para a dupla.");
    expect(source).toContain('aria-live="polite"');
  });

  it("keeps reduced-motion stages equivalent to the persisted result reveal", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("useReducedMotion");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("A fila esta escolhendo");
    expect(source).toContain("Resultado guardado");
    expect(source).toContain("Revelado");
    expect(source).not.toMatch(/novo sorteio.*replay|replay.*novo sorteio/i);
  });

  it("requires opt-in muteable audio, no autoplay and default state from duo audio preference", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("no autoplay");
    expect(source).toContain("audio preference");
    expect(source).toContain("Som da roleta ligado");
    expect(source).toContain("Som da roleta desligado");
    expect(source).toContain("defaultEnabledFromDuoPreference");
    expect(source).toContain("optInRequired");
    expect(source).toContain("localStorage");
  });

  it("covers Legendary seal and contained particles with a static fallback", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("legendary");
    expect(source).toContain("Legendary");
    expect(source).toMatch(/seal|selo/i);
    expect(source).toMatch(/particles|particulas/i);
    expect(source).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps pending invitation, replacement branch, compact history and nine-item mobile nav observable", () => {
    const source = readRouletteUiSources();

    expect(source).toContain("pending_invitation");
    expect(source).toContain("Replay nao e novo sorteio.");
    expect(source).toContain("Descartar resultado");
    expect(source).toContain("roulette-history");
    expect(source).toContain("mobile nav");
    expect(source).toContain("Roleta");
    expect(source).toMatch(/Fila[\s\S]*Catalogo[\s\S]*Descobrir[\s\S]*Biblioteca[\s\S]*Roleta[\s\S]*Conquistas[\s\S]*Desafios[\s\S]*Dupla[\s\S]*Perfil/);
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
