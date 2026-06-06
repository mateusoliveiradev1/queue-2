import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isGamificationMaintenanceRequestAuthorized } from "../src/modules/gamification/jobs";

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
});
