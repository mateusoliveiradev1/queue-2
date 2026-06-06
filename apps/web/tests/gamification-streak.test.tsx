import { readFileSync } from "node:fs";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  evaluateStreakTransition,
  getDuoDayKey,
  StreakPanel
} from "../src/modules/gamification";
import type { ChallengeStreakPanelViewModel } from "../src/modules/gamification";

const viewModelSource = readFileSync(
  "src/modules/gamification/presentation/view-models.ts",
  "utf8"
);
const streakPanelSource = readFileSync(
  "src/modules/gamification/presentation/streak-panel.tsx",
  "utf8"
);
const globalCssSource = readFileSync("src/app/globals.css", "utf8");

afterEach(() => {
  cleanup();
});

describe("Phase 05.5 Streak policy and presentation", () => {
  it("uses the 04:00 duo-day cutoff in the duo timezone", () => {
    expect(
      getDuoDayKey({
        occurredAt: new Date("2026-06-06T06:59:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toBe("2026-06-05");
    expect(
      getDuoDayKey({
        occurredAt: new Date("2026-06-06T07:00:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toBe("2026-06-06");
  });

  it("consumes a Freeze as a shared buffer without creating competitive copy", () => {
    const transition = evaluateStreakTransition({
      currentDuoDay: "2026-06-08",
      lastActivityDuoDay: "2026-06-06",
      currentStreak: 8,
      availableFreezes: 1
    });

    expect(transition).toEqual({
      nextStreak: 8,
      availableFreezes: 0,
      consumedFreeze: true,
      reset: false
    });
    const challengeStreakCopy = viewModelSource.slice(
      viewModelSource.indexOf("function toChallengeStreakView"),
      viewModelSource.indexOf("function toStreakView")
    );

    expect(challengeStreakCopy).toContain("A reserva existe para manter o ritual tranquilo");
    expect(challengeStreakCopy).not.toMatch(/culpa|fracasso|puni[cç]ao|ranking|perdeu/i);
  });

  it("renders active and freezing Streak states without client actions", () => {
    const active = streakView({
      state: "active",
      title: "Chama da dupla",
      valueLabel: "8 dias",
      freezeLabel: "1 Streak Freeze em reserva"
    });
    const { rerender } = render(<StreakPanel streak={active} />);

    expect(screen.getByLabelText(/Streak coletivo ativo/i)).toBeInTheDocument();
    expect(screen.getByText("8 dias")).toBeInTheDocument();
    expect(screen.getByText("1 Streak Freeze em reserva")).toBeInTheDocument();

    rerender(
      <StreakPanel
        streak={streakView({
          state: "freezing",
          title: "Freeze pronto",
          valueLabel: "0 dias",
          freezeLabel: "2 Streak Freeze em reserva",
          assistiveLabel: "A dupla tem Streak Freeze em reserva, sem cobranca por atividade."
        })}
      />
    );
    expect(screen.getByLabelText(/sem cobranca por atividade/i)).toHaveAttribute(
      "data-state",
      "freezing"
    );
    expect(streakPanelSource).not.toMatch(/use client|onClick|<button|<form/);
  });

  it("keeps Streak visuals accessible under reduced motion", () => {
    expect(globalCssSource).toContain("prefers-reduced-motion: reduce");
    expect(globalCssSource).toContain(
      ".challenge-streak-panel[data-state=\"active\"] .challenge-streak-mark"
    );
    expect(globalCssSource).toContain("animation: none");
    expect(globalCssSource).toContain(".challenge-streak-mark");
  });
});

function streakView(
  overrides: Partial<ChallengeStreakPanelViewModel> = {}
): ChallengeStreakPanelViewModel {
  return {
    state: "active",
    title: "Chama da dupla",
    valueLabel: "8 dias",
    supportLabel: "Maior sequencia: 10 dias",
    freezeLabel: "1 Streak Freeze em reserva",
    cutoffLabel: "Dia da dupla fecha as 04:00",
    lastActivityLabel: "Ultimo fato: 06/06/2026",
    assistiveLabel: "Streak coletivo ativo por 8 dias.",
    ...overrides
  };
}
