import { readFileSync } from "node:fs";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPhase5RewardStatus,
  isPhase5RewardStatus
} from "../src/app/app/phase-5-status";
import type { GamificationRewardSummary } from "../src/modules/gamification";
import { getLevelForXp } from "../src/modules/gamification/domain/level-curve";
import { RewardToast } from "../src/modules/gamification/presentation/reward-toast";
import { toRewardToastView } from "../src/modules/gamification/presentation/view-models";

const queueToastMock = vi.hoisted(() => ({
  queueToast: vi.fn()
}));

vi.mock("@queue/ui", () => ({
  queueToast: queueToastMock.queueToast
}));

const rewardToastSource = readFileSync(
  "src/modules/gamification/presentation/reward-toast.tsx",
  "utf8"
);
const phase5StatusSource = readFileSync("src/app/app/phase-5-status.ts", "utf8");
const pageSource = readFileSync("src/app/app/page.tsx", "utf8");
const globalCssSource = readFileSync("src/app/globals.css", "utf8");

afterEach(() => {
  cleanup();
  queueToastMock.queueToast.mockClear();
});

describe("Phase 05.3 reward toast feedback", () => {
  it("triggers a non-blocking special toast from safe reward status", async () => {
    const reward = getPhase5RewardStatus("level-up");

    const { rerender } = render(<RewardToast reward={reward} />);

    expect(screen.getByRole("status")).toHaveTextContent(/level-up registrado para a dupla/i);
    await waitFor(() => expect(queueToastMock.queueToast).toHaveBeenCalledTimes(1));
    expect(queueToastMock.queueToast).toHaveBeenCalledWith("Nivel novo da dupla", {
      description: "O XP veio de fatos confirmados e o painel ja mostra o novo marco.",
      variant: "special"
    });

    rerender(<RewardToast reward={reward} />);

    expect(queueToastMock.queueToast).toHaveBeenCalledTimes(1);
  });

  it("whitelists reward search params and reserves special intensity", () => {
    expect(isPhase5RewardStatus("level-up")).toBe(true);
    expect(isPhase5RewardStatus("conquista")).toBe(true);
    expect(isPhase5RewardStatus("desafio-completo")).toBe(true);
    expect(isPhase5RewardStatus("xp-registrado")).toBe(true);
    expect(getPhase5RewardStatus("xp=9999")).toBeNull();
    expect(getPhase5RewardStatus("individual-top")).toBeNull();

    expect(getPhase5RewardStatus("level-up")).toEqual(
      expect.objectContaining({ variant: "special" })
    );
    expect(getPhase5RewardStatus("conquista")).toEqual(
      expect.objectContaining({ variant: "special" })
    );
    expect(getPhase5RewardStatus("desafio-completo")).toEqual(
      expect.objectContaining({ variant: "special" })
    );
    expect(getPhase5RewardStatus("xp-registrado")).toEqual(
      expect.objectContaining({ variant: "calm" })
    );
    expect(JSON.stringify([
      getPhase5RewardStatus("level-up"),
      getPhase5RewardStatus("conquista"),
      getPhase5RewardStatus("desafio-completo"),
      getPhase5RewardStatus("xp-registrado")
    ])).not.toMatch(/culpa|pressao|vergonha|ranking|individual|perdeu/i);
  });

  it("can derive reward feedback from a server reward summary path", () => {
    const view = toRewardToastView(rewardSummary());

    expect(view).toEqual(
      expect.objectContaining({
        key: "level-up:3",
        title: "Nivel 3 da dupla",
        variant: "special",
        inlineLabel: "Level-up registrado no painel da dupla."
      })
    );
  });

  it("keeps reward feedback non-modal and reduced-motion static", () => {
    expect(pageSource).toContain("getPhase5RewardStatus");
    expect(pageSource).toContain("recompensa");
    expect(pageSource).toContain("RewardToast");
    expect(phase5StatusSource).toContain("rewardStatuses");
    expect(rewardToastSource).toContain("queueToast");
    expect(rewardToastSource).toContain("role=\"status\"");
    expect(rewardToastSource).not.toMatch(/modal|dialog|overlay|confirm\(/i);
    expect(globalCssSource).toContain(".reward-inline-state");
    expect(globalCssSource).toContain(".reward-inline-state[data-variant=\"special\"]");
    expect(globalCssSource).toContain("prefers-reduced-motion: reduce");
  });
});

function rewardSummary(): GamificationRewardSummary {
  const updatedAt = new Date("2026-06-06T15:00:00.000Z");

  return {
    totalXpAwarded: 110,
    xpAwards: [
      {
        id: "award-1",
        duoId: "duo-1",
        awardKey: "live-session:00000000-0000-4000-8000-000000000101",
        sourceType: "live-session",
        sourceId: "00000000-0000-4000-8000-000000000101",
        amount: 30,
        reasonCode: "live-session-confirmed",
        awardedByUserId: "member-1",
        metadata: {},
        awardedAt: updatedAt
      }
    ],
    levelUp: {
      previousLevel: getLevelForXp(110),
      currentLevel: getLevelForXp(300)
    },
    achievements: [],
    questProgress: [],
    streak: null,
    projection: {
      duoId: "duo-1",
      xp: 300,
      level: getLevelForXp(300),
      streak: 1,
      availableFreezes: 0,
      updatedAt
    }
  };
}
