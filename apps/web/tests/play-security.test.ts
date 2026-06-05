import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isPlayReminderRequestAuthorized } from "../src/modules/play/jobs";

const phase4ActionsSource = readFileSync("src/app/app/phase-4-actions.ts", "utf8");
const productPushRouteSource = readFileSync("src/app/api/play/notifications/route.ts", "utf8");
const reminderRouteSource = readFileSync("src/app/api/jobs/play/reminders/route.ts", "utf8");
const playJobsSource = readFileSync("src/modules/play/jobs.ts", "utf8");
const pushServiceSource = readFileSync("src/modules/play/infrastructure/push-service.ts", "utf8");
const pushPreferencesSource = readFileSync("src/modules/play/presentation/push-preferences.tsx", "utf8");
const playRepositorySource = readFileSync("src/modules/play/infrastructure/play-repository.ts", "utf8");
const dbClientSource = readFileSync("../../packages/db/src/client.ts", "utf8");

describe("Phase 4 play security gates", () => {
  it("keeps Phase 4 server actions behind authoritative sessions", () => {
    expect(phase4ActionsSource).toContain('"use server"');
    expect(phase4ActionsSource).toContain("requireAuthoritativeVerifiedSession");
    expect(phase4ActionsSource).toMatch(/async function reorderPlayingGamesActionTimed[\s\S]*requireAuthoritativeVerifiedSession/);
    expect(phase4ActionsSource).toMatch(/async function promotePlayingGameActionTimed[\s\S]*requireAuthoritativeVerifiedSession/);
    expect(phase4ActionsSource).toMatch(/async function playJourneyActionTimed[\s\S]*requireAuthoritativeVerifiedSession/);
    expect(phase4ActionsSource).not.toContain("getFormString(formData, \"duoId\")");
  });

  it("requires authoritative sessions for product push writes and verified sessions for public key reads", () => {
    expect(productPushRouteSource).toContain("requireVerifiedSession");
    expect(productPushRouteSource).toMatch(/export async function GET[\s\S]*requireVerifiedSession/);
    expect(productPushRouteSource).toMatch(/export async function POST[\s\S]*requireAuthoritativeVerifiedSession/);
    expect(productPushRouteSource).toMatch(/export async function DELETE[\s\S]*requireAuthoritativeVerifiedSession/);
    expect(productPushRouteSource).toContain("Cache-Control");
    expect(productPushRouteSource).toContain("no-store");
  });

  it("requires an exact bearer token from CRON_SECRET for play reminders", () => {
    const request = new Request("http://localhost/api/jobs/play/reminders", {
      headers: {
        Authorization: "Bearer secret-1"
      }
    });

    expect(isPlayReminderRequestAuthorized(request, "secret-1")).toBe(true);
    expect(isPlayReminderRequestAuthorized(request, "secret-2")).toBe(false);
    expect(isPlayReminderRequestAuthorized(request, "")).toBe(false);
    expect(reminderRouteSource).toContain("isPlayReminderRequestAuthorized");
    expect(playJobsSource).toContain("process.env.CRON_SECRET");
  });

  it("keeps VAPID private material server-only and never requests permission on initial render", () => {
    expect(pushServiceSource).toContain('import "server-only"');
    expect(pushServiceSource).toContain("VAPID_PRIVATE_KEY");
    expect(pushServiceSource).toContain("redactPushEndpoint");
    expect(pushPreferencesSource).not.toContain("VAPID_PRIVATE_KEY");
    expect(pushPreferencesSource).toMatch(/async function handleEnablePush[\s\S]*Notification\.requestPermission/);
    const mountEffect = pushPreferencesSource.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[\]\);/)?.[1] ?? "";
    expect(mountEffect).not.toContain("Notification.requestPermission");
  });

  it("keeps play persistence RLS-scoped and worker job claims bounded to play reminders", () => {
    expect(playRepositorySource).toContain("withAppUserTransaction");
    expect(dbClientSource).toContain("set_config('queue2.user_id'");
    expect(playRepositorySource).toContain("FOR UPDATE SKIP LOCKED");
    expect(playRepositorySource).toContain("AND job_type = 'play-session-reminder'");
    expect(playRepositorySource).toContain("LIMIT $2");
  });
});
