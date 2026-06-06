import { readFileSync } from "node:fs";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createRewardToken,
  verifyRewardToken,
  type RewardTokenSubject
} from "../src/app/app/phase-5-reward-token";
import { getPhase5RewardStatus } from "../src/app/app/phase-5-status";
import type { GamificationRewardSummary } from "../src/modules/gamification";
import { RewardToast } from "../src/modules/gamification/presentation/reward-toast";

const rewardSecret = "reward-toast-test-secret-with-enough-entropy";
const rewardSubject: RewardTokenSubject = {
  duoId: "duo-1",
  userId: "user-1"
};

const phase4ActionsSource = readFileSync(
  "src/app/app/phase-4-actions.ts",
  "utf8"
);
const dashboardPageSource = readFileSync("src/app/app/page.tsx", "utf8");
const gamePageSource = readFileSync(
  "src/app/app/jogo/[slug]/page.tsx",
  "utf8"
);

afterEach(() => {
  cleanup();
});

describe("Phase 5 signed reward feedback", () => {
  it("renders only a token verified for the current user and duo", () => {
    process.env.BETTER_AUTH_SECRET = rewardSecret;
    const token = createRewardToken({
      subject: rewardSubject,
      summary: rewardSummary()
    });
    const reward = getPhase5RewardStatus(token, rewardSubject);

    render(<RewardToast reward={reward} />);

    expect(
      screen.getByText("Conquista desbloqueada para os dois.")
    ).toBeInTheDocument();
    expect(
      getPhase5RewardStatus("level-up", rewardSubject)
    ).toBeNull();
    expect(
      getPhase5RewardStatus(token, {
        ...rewardSubject,
        userId: "user-2"
      })
    ).toBeNull();
  });

  it("does not create feedback when the authoritative reward has no visible event", () => {
    const token = createRewardToken(
      {
        subject: rewardSubject,
        summary: rewardSummary({
          achievements: [],
          totalXpAwarded: 0
        })
      },
      {
        secret: rewardSecret
      }
    );

    expect(token).toBeNull();
    expect(
      verifyRewardToken(token, rewardSubject, {
        secret: rewardSecret
      })
    ).toBeNull();
  });

  it("preserves reward in Play actions and verifies it only after auth and duo lookup", () => {
    expect(phase4ActionsSource).toContain("createRewardToken");
    expect(phase4ActionsSource).toMatch(
      /case "confirm-session":[\s\S]*confirmPlaySession/
    );
    expect(phase4ActionsSource).toMatch(
      /case "set-chapter":[\s\S]*setPlayChapterCompletion/
    );
    expect(phase4ActionsSource).toMatch(
      /case "confirm-scheduled":[\s\S]*confirmScheduledSession/
    );
    expect(phase4ActionsSource).toMatch(
      /case "confirm-terminal":[\s\S]*confirmTerminalStatus/
    );
    expect(phase4ActionsSource).toMatch(
      /result\.reward[\s\S]*createRewardToken/
    );
    expect(phase4ActionsSource).toContain('redirect(buildPlayJourneyRedirect(');
    expect(phase4ActionsSource).toMatch(
      /function buildPlayJourneyRedirect[\s\S]*isSafeSlug/
    );

    expect(dashboardPageSource).toMatch(
      /requireVerifiedSession[\s\S]*getDuoDashboard[\s\S]*getPhase5RewardStatus/
    );
    expect(gamePageSource).toMatch(
      /requireVerifiedSession[\s\S]*getDuoDashboard[\s\S]*getPhase5RewardStatus/
    );
    expect(dashboardPageSource).toContain("<RewardToast reward={rewardStatus} />");
    expect(gamePageSource).toContain("<RewardToast reward={rewardStatus} />");
  });
});

function rewardSummary(
  overrides: Partial<GamificationRewardSummary> = {}
): GamificationRewardSummary {
  const now = new Date();

  return {
    achievements: [
      {
        rarity: "rare",
        slug: "primeiro-save",
        title: "Primeiro Save",
        unlockedAt: now
      }
    ],
    levelUp: null,
    projection: {
      availableFreezes: 0,
      duoId: rewardSubject.duoId,
      level: {
        level: 2,
        name: "Dupla de Sofa",
        xpRequired: 120
      },
      streak: 1,
      updatedAt: now,
      xp: 145
    },
    questProgress: [],
    streak: null,
    totalXpAwarded: 25,
    xpAwards: [],
    ...overrides
  };
}
