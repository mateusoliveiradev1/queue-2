#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const phaseDir = resolve(
  workspaceRoot,
  ".planning/phases/04-jogando-agora-sessoes-e-agendamento"
);
const performanceReviewPath = resolve(phaseDir, "04-PERFORMANCE-REVIEW.md");
const reminderReadinessPath = resolve(phaseDir, "04-REMINDER-READINESS.md");
const userSetupPath = resolve(phaseDir, "04-USER-SETUP.md");
const pnpmBin = "pnpm";

loadEnvLocal();

const e2eFixtureVars = [
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE4_PRINCIPAL_SLUG",
  "E2E_PHASE4_SECONDARY_SLUG"
];
const missingE2eFixtures = e2eFixtureVars.filter((name) => !process.env[name]);
const missingDbFixtures = process.env.TEST_DATABASE_URL ? [] : ["TEST_DATABASE_URL"];

if (missingE2eFixtures.length > 0) {
  console.warn(`Phase 4 browser gate BLOCKED setup. Missing: ${missingE2eFixtures.join(", ")}.`);
}

if (missingDbFixtures.length > 0) {
  console.warn("Phase 4 DB gate BLOCKED setup. Missing: TEST_DATABASE_URL.");
}

const commands = [
  {
    name: "Architecture",
    command: pnpmBin,
    args: ["check:architecture"]
  },
  {
    name: "Web typecheck",
    command: pnpmBin,
    args: ["--filter", "@queue/web", "typecheck"]
  },
  {
    name: "DB typecheck",
    command: pnpmBin,
    args: ["--filter", "@queue/db", "typecheck"]
  },
  {
    name: "Focused play unit and UI tests",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/web",
      "test",
      "play-application",
      "play-sessions",
      "play-terminal-status",
      "play-timeline",
      "play-progress-ui",
      "play-scheduling",
      "play-reminder-jobs",
      "play-notifications-ui",
      "play-security",
      "discovery-push"
    ]
  },
  {
    name: "DB integration evidence",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/db",
      "test:integration",
      "play-rls",
      "play-concurrency",
      "performance-hot-paths"
    ]
  },
  {
    name: "Phase 4 query and performance review",
    command: "node",
    args: ["--experimental-strip-types", "scripts/performance-explain.ts", "--phase=4"]
  },
  {
    name: "Browser E2E and accessibility",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/web",
      "test:e2e",
      "tests/phase-4-e2e.spec.ts",
      "tests/accessibility.spec.ts"
    ],
    skipWhen: missingE2eFixtures.length > 0,
    skipReason: `missing E2E fixtures: ${missingE2eFixtures.join(", ")}`
  }
];

const commandResults = commands.map(runCommand);
const reminderReadiness = writeReminderReadiness();
const failedCommands = commandResults.filter((result) => result.status !== 0);
const blockers = [
  ...missingDbFixtures,
  ...missingE2eFixtures,
  ...(reminderReadiness.result === "PASSED" ? [] : [reminderReadiness.result])
];
const result =
  failedCommands.length > 0
    ? "FAILED"
    : blockers.length > 0
      ? "BLOCKED - missing external evidence or reminder readiness"
      : "PASSED";

writePerformanceReview({
  blockers,
  commandResults,
  missingDbFixtures,
  missingE2eFixtures,
  reminderReadiness,
  result
});

console.log(`Phase 4 gate ${result}.`);
console.log(`Performance artifact: ${performanceReviewPath}`);
console.log(`Reminder artifact: ${reminderReadinessPath}`);
console.log(`Setup artifact: ${userSetupPath}`);

if (failedCommands.length > 0) {
  process.exitCode = 1;
}

function runCommand(commandConfig) {
  if (commandConfig.skipWhen) {
    console.log(`\n[phase:4:gate] ${commandConfig.name}`);
    console.log(`[phase:4:gate] skipped (${commandConfig.skipReason})`);

    return {
      command: [commandConfig.command, ...commandConfig.args].join(" "),
      durationMs: 0,
      name: commandConfig.name,
      skipped: true,
      status: 0
    };
  }

  console.log(`\n[phase:4:gate] ${commandConfig.name}`);
  const commandLine = [commandConfig.command, ...commandConfig.args].join(" ");
  console.log(`$ ${commandLine}`);

  const startedAt = Date.now();
  const commandResult = spawnSync(commandLine, {
    cwd: workspaceRoot,
    env: process.env,
    shell: true,
    stdio: "inherit"
  });
  const durationMs = Date.now() - startedAt;
  const status = commandResult.status ?? 1;

  console.log(`[phase:4:gate] ${commandConfig.name}: ${status === 0 ? "passed" : "failed"} (${durationMs}ms)`);

  return {
    command: commandLine,
    durationMs,
    name: commandConfig.name,
    status
  };
}

function writePerformanceReview({
  blockers,
  commandResults,
  missingDbFixtures,
  missingE2eFixtures,
  reminderReadiness,
  result
}) {
  const generated = new Date().toISOString();
  const queryReviewResult = readResultLine(performanceReviewPath) ?? "not generated";
  const commandTable = [
    "| Command | Status | Duration |",
    "|---------|--------|----------|",
    ...commandResults.map(
      (entry) =>
        `| ${entry.name} | ${entry.skipped ? "skipped" : entry.status === 0 ? "passed" : `failed (${entry.status})`} | ${entry.durationMs}ms |`
    )
  ].join("\n");
  const missingDbText =
    missingDbFixtures.length > 0 ? missingDbFixtures.map((name) => `- ${name}`).join("\n") : "None.";
  const missingE2eText =
    missingE2eFixtures.length > 0 ? missingE2eFixtures.map((name) => `- ${name}`).join("\n") : "None.";
  const blockerText =
    blockers.length > 0 ? blockers.map((name) => `- ${name}`).join("\n") : "None.";

  const markdown = [
    "---",
    "phase: 04",
    "plan: 06",
    "artifact: performance-review",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 4 Performance and Evidence Review",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    "- Evidence environment: root Phase 4 gate command",
    "- Credentials: process-only; no credential values written to this artifact",
    `- DB fixture status: ${missingDbFixtures.length > 0 ? "missing" : "configured"}`,
    `- E2E fixture status: ${missingE2eFixtures.length > 0 ? "missing" : "configured"}`,
    "",
    "## Query Review",
    "",
    "- Command: `node --experimental-strip-types scripts/performance-explain.ts --phase=4`",
    `- Query/performance result before gate consolidation: ${queryReviewResult}`,
    "- Covered hot paths: dashboard current play, game detail/timeline, notification center polling, due reminder jobs, session confirmation, scheduled attendance and active reorder.",
    "",
    "## Browser and Accessibility",
    "",
    "- Command: `pnpm --filter @queue/web test:e2e -- tests/phase-4-e2e.spec.ts tests/accessibility.spec.ts`",
    "- Coverage defined for dashboard Principal/secondaries, game detail, scheduling, Central da Dupla, partner confirmations, other-duo isolation, mobile overlap and reduced motion.",
    "",
    "## Security and RLS",
    "",
    "- Source security command: `pnpm --filter @queue/web test -- play-security`",
    "- DB integration command: `pnpm --filter @queue/db test:integration -- play-rls play-concurrency performance-hot-paths`",
    "- Missing `TEST_DATABASE_URL` remains blocked evidence, not a pass.",
    "",
    "## Reminder Readiness",
    "",
    `- Result: ${reminderReadiness.result}`,
    `- Exact 30-minute UI promise allowed: ${reminderReadiness.exactPromiseAllowed ? "yes" : "no"}`,
    `- Reason: ${reminderReadiness.reason}`,
    "- Artifact: `04-REMINDER-READINESS.md`",
    "",
    "## Command Status",
    "",
    commandTable,
    "",
    "## Missing DB Fixtures",
    "",
    missingDbText,
    "",
    "## Missing E2E Fixtures",
    "",
    missingE2eText,
    "",
    "## Blockers",
    "",
    blockerText,
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    result === "PASSED"
      ? "- None for Phase 4 gate."
      : "- Provide missing fixtures/readiness inputs, rerun `pnpm phase:4:gate`, and review this artifact before closing Phase 4.",
    ""
  ].join("\n");

  mkdirSync(dirname(performanceReviewPath), { recursive: true });
  writeFileSync(performanceReviewPath, markdown, "utf8");
}

function writeReminderReadiness() {
  const generated = new Date().toISOString();
  const playCron = readPlayReminderCron();
  const runnerMinutes = Number(process.env.PLAY_REMINDER_RUNNER_FREQUENCY_MINUTES ?? Number.NaN);
  const runnerFrequency =
    Number.isFinite(runnerMinutes) && runnerMinutes > 0 ? runnerMinutes : playCron.frequencyMinutes;
  const missingPushEnv = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"].filter(
    (name) => !process.env[name]
  );
  const missingCronEnv = process.env.CRON_SECRET ? [] : ["CRON_SECRET"];
  const exactRunnerAvailable = typeof runnerFrequency === "number" && runnerFrequency <= 5;
  const result =
    missingCronEnv.length > 0 || missingPushEnv.length > 0
      ? "BLOCKED - missing reminder environment"
      : exactRunnerAvailable
        ? "PASSED"
        : "BLOCKED - reminder precision unavailable";
  const reason =
    result === "PASSED"
      ? "A compatible runner frequency and reminder/push environment are configured."
      : missingCronEnv.length > 0 || missingPushEnv.length > 0
        ? `Missing environment: ${[...missingCronEnv, ...missingPushEnv].join(", ")}.`
        : "No compatible minute-level runner was detected for exact 30-minute reminders.";
  const exactPromiseAllowed = result === "PASSED";
  const markdown = [
    "---",
    "phase: 04",
    "plan: 06",
    "artifact: reminder-readiness",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 4 Reminder Readiness",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    `- CRON_SECRET configured: ${missingCronEnv.length === 0 ? "yes" : "no"}`,
    `- VAPID public/private/subject configured: ${missingPushEnv.length === 0 ? "yes" : "no"}`,
    `- Play reminder cron path configured in vercel.json: ${playCron.configured ? "yes" : "no"}`,
    `- Play reminder cron schedule: ${playCron.schedule ?? "not configured"}`,
    `- Runner frequency minutes: ${runnerFrequency ?? "unknown"}`,
    "",
    "## Operational Decision",
    "",
    `- Exact 30-minute UI promise allowed: ${exactPromiseAllowed ? "yes" : "no"}`,
    `- Reason: ${reason}`,
    "- Current UI may say reminders are prepared and runner-dependent; it must not promise exact delivery while this artifact is blocked.",
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    exactPromiseAllowed
      ? "- Keep this artifact updated when cron schedule or deployment plan changes."
      : "- Configure `CRON_SECRET`, VAPID keys and a compatible play reminder runner, then rerun `pnpm phase:4:gate`.",
    ""
  ].join("\n");

  mkdirSync(dirname(reminderReadinessPath), { recursive: true });
  writeFileSync(reminderReadinessPath, markdown, "utf8");

  return {
    exactPromiseAllowed,
    reason,
    result
  };
}

function readPlayReminderCron() {
  const vercelPath = resolve(workspaceRoot, "vercel.json");

  if (!existsSync(vercelPath)) {
    return {
      configured: false,
      frequencyMinutes: null,
      schedule: null
    };
  }

  try {
    const config = JSON.parse(readFileSync(vercelPath, "utf8"));
    const cron = Array.isArray(config.crons)
      ? config.crons.find((entry) => entry?.path === "/api/jobs/play/reminders")
      : null;
    const schedule = typeof cron?.schedule === "string" ? cron.schedule : null;

    return {
      configured: Boolean(schedule),
      frequencyMinutes: schedule ? parseCronFrequencyMinutes(schedule) : null,
      schedule
    };
  } catch {
    return {
      configured: false,
      frequencyMinutes: null,
      schedule: null
    };
  }
}

function parseCronFrequencyMinutes(schedule) {
  const minute = schedule.trim().split(/\s+/)[0];

  if (minute === "*") {
    return 1;
  }

  const step = minute.match(/^\*\/(\d+)$/);

  if (step?.[1]) {
    return Number(step[1]);
  }

  return null;
}

function readResultLine(path) {
  if (!existsSync(path)) {
    return null;
  }

  const match = readFileSync(path, "utf8").match(/^## Result:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function loadEnvLocal() {
  const envPath = resolve(workspaceRoot, ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;

    if (!name || process.env[name]) {
      continue;
    }

    process.env[name] = unquote(rawValue?.trim() ?? "");
  }
}

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
