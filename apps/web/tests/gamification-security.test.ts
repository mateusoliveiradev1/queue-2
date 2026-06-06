import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { GamificationRewardSummary } from "../src/modules/gamification";
import { isGamificationMaintenanceRequestAuthorized } from "../src/modules/gamification/jobs";
import {
  createRewardToken,
  verifyRewardToken
} from "../src/app/app/phase-5-reward-token";

const phase4ActionsSource = readFileSync("src/app/app/phase-4-actions.ts", "utf8");
const gamificationJobsSource = readFileSync("src/modules/gamification/jobs.ts", "utf8");
const gamificationJobRouteSource = readFileSync(
  "src/app/api/jobs/gamification/maintenance/route.ts",
  "utf8"
);
const gamificationRepositorySource = readFileSync(
  "src/modules/gamification/infrastructure/gamification-repository.ts",
  "utf8"
);
const applyGamificationFactSource = readFileSync(
  "src/modules/gamification/application/apply-gamification-fact.ts",
  "utf8"
);
const challengesPageSource = readFileSync("src/app/app/desafios/page.tsx", "utf8");
const achievementsPageSource = readFileSync("src/app/app/conquistas/page.tsx", "utf8");
const dbClientSource = readFileSync("../../packages/db/src/client.ts", "utf8");
const rewardTokenSource = readFileSync(
  "src/app/app/phase-5-reward-token.ts",
  "utf8"
);

const rewardTokenSecret = "test-secret-with-at-least-thirty-two-bytes";
const rewardTokenNow = new Date("2026-06-06T20:45:00.000Z");
const rewardTokenSubject = {
  duoId: "duo-private-123",
  userId: "user-private-456"
};

describe("Phase 5 gamification security gates", () => {
  it("keeps reward-triggering server actions behind authoritative sessions", () => {
    expect(phase4ActionsSource).toContain('"use server"');
    expect(phase4ActionsSource).toContain("requireAuthoritativeVerifiedSession");
    expect(phase4ActionsSource).toMatch(/async function playJourneyActionTimed[\s\S]*requireAuthoritativeVerifiedSession/);
    expect(phase4ActionsSource).toMatch(/case "confirm-session":[\s\S]*confirmPlaySession/);
    expect(phase4ActionsSource).toMatch(/case "confirm-scheduled":[\s\S]*confirmScheduledSession/);
    expect(phase4ActionsSource).toMatch(/case "set-chapter":[\s\S]*setPlayChapterCompletion/);
    expect(phase4ActionsSource).toMatch(/case "confirm-terminal":[\s\S]*confirmTerminalStatus/);
    expect(phase4ActionsSource).not.toContain("getFormString(formData, \"duoId\")");
    expect(phase4ActionsSource).not.toMatch(/getForm(Number|String)\(formData,\s*"xp/i);
  });

  it("does not let browser input supply XP, level, streak, quest or achievement authority", () => {
    expect(applyGamificationFactSource).toContain("input.sourceType");
    expect(applyGamificationFactSource).toContain("eligibility.amount");
    expect(applyGamificationFactSource).toContain("totalXpAwarded");
    expect(applyGamificationFactSource).not.toMatch(/formData|searchParams|request\.json|input\.xp|input\.level|input\.streak/i);
    expect(challengesPageSource).toContain("requireVerifiedSession");
    expect(challengesPageSource).toContain("getDuoDashboard");
    expect(challengesPageSource).toContain("getChallenges");
    expect(challengesPageSource).not.toMatch(/upsertQuest|insertXp|updateProjection|runStreak/i);
    expect(achievementsPageSource).toContain("requireVerifiedSession");
    expect(achievementsPageSource).toContain("getDuoDashboard");
    expect(achievementsPageSource).toContain("getAchievements");
    expect(achievementsPageSource).not.toMatch(/insertAchievement|insertXp|updateProjection/i);
  });

  it("requires an exact bearer token from CRON_SECRET for gamification maintenance", () => {
    const request = new Request("http://localhost/api/jobs/gamification/maintenance", {
      headers: {
        Authorization: "Bearer secret-1"
      }
    });

    expect(isGamificationMaintenanceRequestAuthorized(request, "secret-1")).toBe(true);
    expect(isGamificationMaintenanceRequestAuthorized(request, "secret-2")).toBe(false);
    expect(isGamificationMaintenanceRequestAuthorized(request, "")).toBe(false);
    expect(gamificationJobRouteSource).toContain("isGamificationMaintenanceRequestAuthorized");
    expect(gamificationJobRouteSource).toContain("runtime = \"nodejs\"");
    expect(gamificationJobRouteSource).toContain("maxDuration = 300");
    expect(gamificationJobsSource).toContain('import "server-only"');
    expect(gamificationJobsSource).toContain("process.env.CRON_SECRET");
  });

  it("keeps gamification persistence RLS-scoped and job claims bounded", () => {
    expect(gamificationRepositorySource).toContain("withAppUserTransaction");
    expect(dbClientSource).toContain("set_config('queue2.user_id'");
    expect(gamificationRepositorySource).toContain("FOR UPDATE SKIP LOCKED");
    expect(gamificationRepositorySource).toContain("job_type = ANY");
    expect(gamificationRepositorySource).toContain("LIMIT $2");
    expect(gamificationRepositorySource).not.toContain("BYPASSRLS");
  });

  it("signs a short-lived reward view without serializing raw authority", () => {
    const token = createRewardToken(
      {
        subject: rewardTokenSubject,
        summary: rewardSummary()
      },
      {
        now: rewardTokenNow,
        secret: rewardTokenSecret
      }
    );

    expect(token).toBeTruthy();
    expect(
      verifyRewardToken(token, rewardTokenSubject, {
        now: new Date("2026-06-06T20:49:59.000Z"),
        secret: rewardTokenSecret
      })
    ).toEqual({
      body: "Checkpoint Juntos entrou na fila. XP confirmado no servidor.",
      inlineLabel: "Level-up registrado no painel da dupla.",
      key: "level-up:5",
      title: "Nivel 5 da dupla",
      variant: "special"
    });

    const encodedPayload = token?.split(".")[0] ?? "";
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");

    expect(payload).not.toContain(rewardTokenSubject.userId);
    expect(payload).not.toContain(rewardTokenSubject.duoId);
    expect(payload).not.toContain("projection");
    expect(payload).not.toContain("totalXpAwarded");
    expect(payload).not.toContain(rewardTokenSecret);
    expect(rewardTokenSource).toContain('import "server-only"');
    expect(rewardTokenSource).toContain("createHmac");
    expect(rewardTokenSource).toContain("timingSafeEqual");
  });

  it("rejects expired, malformed, tampered and cross-subject reward tokens", () => {
    const token = createRewardToken(
      {
        subject: rewardTokenSubject,
        summary: rewardSummary()
      },
      {
        now: rewardTokenNow,
        secret: rewardTokenSecret
      }
    );
    const [encodedPayload = "", signature = ""] = token?.split(".") ?? [];
    const parsedPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Record<string, unknown>;
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        ...parsedPayload,
        view: {
          ...(parsedPayload.view as Record<string, unknown>),
          title: "Toast forjado"
        }
      })
    ).toString("base64url");
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith("a") ? "b" : "a"}`;

    expect(
      verifyRewardToken(token, rewardTokenSubject, {
        now: new Date("2026-06-06T20:50:01.000Z"),
        secret: rewardTokenSecret
      })
    ).toBeNull();
    expect(
      verifyRewardToken(`${tamperedPayload}.${signature}`, rewardTokenSubject, {
        now: rewardTokenNow,
        secret: rewardTokenSecret
      })
    ).toBeNull();
    expect(
      verifyRewardToken(`${encodedPayload}.${tamperedSignature}`, rewardTokenSubject, {
        now: rewardTokenNow,
        secret: rewardTokenSecret
      })
    ).toBeNull();
    expect(
      verifyRewardToken(
        token,
        {
          ...rewardTokenSubject,
          userId: "user-other"
        },
        {
          now: rewardTokenNow,
          secret: rewardTokenSecret
        }
      )
    ).toBeNull();
    expect(
      verifyRewardToken(
        token,
        {
          ...rewardTokenSubject,
          duoId: "duo-other"
        },
        {
          now: rewardTokenNow,
          secret: rewardTokenSecret
        }
      )
    ).toBeNull();
    expect(
      verifyRewardToken("not-a-token", rewardTokenSubject, {
        now: rewardTokenNow,
        secret: rewardTokenSecret
      })
    ).toBeNull();
  });
});

function rewardSummary(): GamificationRewardSummary {
  return {
    achievements: [],
    levelUp: {
      currentLevel: {
        level: 5,
        name: "Checkpoint Juntos",
        xpRequired: 600
      },
      previousLevel: {
        level: 4,
        name: "Controle Dividido",
        xpRequired: 450
      }
    },
    projection: {
      availableFreezes: 0,
      duoId: rewardTokenSubject.duoId,
      level: {
        level: 5,
        name: "Checkpoint Juntos",
        xpRequired: 600
      },
      streak: 2,
      updatedAt: rewardTokenNow,
      xp: 640
    },
    questProgress: [],
    streak: null,
    totalXpAwarded: 50,
    xpAwards: []
  };
}
