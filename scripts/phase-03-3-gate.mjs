#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const reviewPath = resolve(
  workspaceRoot,
  ".planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-PERFORMANCE-REVIEW.md"
);
const baselinePath = resolve(
  workspaceRoot,
  ".planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-PERFORMANCE-BASELINE.md"
);
const queryReviewPath = resolve(
  workspaceRoot,
  ".planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-QUERY-REVIEW.md"
);
const pnpmBin = "pnpm";

loadEnvLocal();

const fixtureVars = [
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_PARTNER_EMAIL",
  "E2E_READY_PARTNER_PASSWORD",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_PHASE3_3_CATALOG_QUERY",
  "E2E_PHASE3_3_GAME_SLUG"
];
const missingFixtures = fixtureVars.filter((name) => !process.env[name]);

if (missingFixtures.length > 0) {
  console.warn(`Phase 03.3 gate BLOCKED setup. Missing: ${missingFixtures.join(", ")}.`);
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
    name: "Focused unit and UI tests",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/web",
      "test",
      "performance-mutation-ui",
      "catalog-library-ui",
      "discovery-ui",
      "performance-metrics"
    ]
  },
  {
    name: "Performance baseline",
    command: pnpmBin,
    args: ["--filter", "@queue/web", "performance:baseline"]
  },
  {
    name: "Query review",
    command: "node",
    args: ["--experimental-strip-types", "scripts/performance-explain.ts"]
  },
  {
    name: "Browser performance and accessibility",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/web",
      "test:e2e",
      "tests/phase-03-3-performance.spec.ts",
      "tests/accessibility.spec.ts"
    ],
    skipWhen: missingFixtures.length > 0,
    skipReason: `missing E2E fixtures: ${missingFixtures.join(", ")}`
  }
];

const commandResults = commands.map(runCommand);
const failedCommands = commandResults.filter((result) => result.status !== 0);
const result =
  failedCommands.length > 0
    ? "FAILED"
    : missingFixtures.length > 0
      ? "BLOCKED - missing fixture evidence"
      : "PASSED";

writePerformanceReview({
  commandResults,
  missingFixtures,
  result
});

console.log(`Phase 03.3 gate ${result}.`);
console.log(`Artifact: ${reviewPath}`);

if (failedCommands.length > 0) {
  process.exitCode = 1;
}

function runCommand(commandConfig) {
  if (commandConfig.skipWhen) {
    console.log(`\n[phase:03.3:gate] ${commandConfig.name}`);
    console.log(`[phase:03.3:gate] skipped (${commandConfig.skipReason})`);

    return {
      command: [commandConfig.command, ...commandConfig.args].join(" "),
      durationMs: 0,
      name: commandConfig.name,
      skipped: true,
      status: 0
    };
  }

  console.log(`\n[phase:03.3:gate] ${commandConfig.name}`);
  const commandLine = [commandConfig.command, ...commandConfig.args].join(" ");
  console.log(`$ ${commandLine}`);

  const startedAt = Date.now();
  const result = spawnSync(commandLine, {
    cwd: workspaceRoot,
    env: process.env,
    shell: true,
    stdio: "inherit"
  });
  const durationMs = Date.now() - startedAt;
  const status = result.status ?? 1;

  console.log(`[phase:03.3:gate] ${commandConfig.name}: ${status === 0 ? "passed" : "failed"} (${durationMs}ms)`);

  return {
    command: [commandConfig.command, ...commandConfig.args].join(" "),
    durationMs,
    name: commandConfig.name,
    status
  };
}

function writePerformanceReview({ commandResults, missingFixtures, result }) {
  const generated = new Date().toISOString();
  const baselineResult = readResultLine(baselinePath) ?? "not generated";
  const queryReviewResult = readResultLine(queryReviewPath) ?? "not generated";
  const commandTable = [
    "| Command | Status | Duration |",
    "|---------|--------|----------|",
    ...commandResults.map(
      (entry) =>
        `| ${entry.name} | ${entry.skipped ? "skipped" : entry.status === 0 ? "passed" : `failed (${entry.status})`} | ${entry.durationMs}ms |`
    )
  ].join("\n");
  const missingText =
    missingFixtures.length > 0
      ? missingFixtures.map((name) => `- ${name}`).join("\n")
      : "None.";

  const markdown = [
    "---",
    "phase: 03.3",
    "plan: 04",
    "artifact: performance-review",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 03.3 Performance Review",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    "- Evidence environment: root Phase 03.3 gate command",
    "- Credentials: process-only; no credential values written to this artifact",
    `- Fixture status: ${missingFixtures.length > 0 ? "missing required E2E fixture values" : "configured"}`,
    "",
    "## Route Baselines",
    "",
    "- Command: `pnpm --filter @queue/web performance:baseline`",
    `- Baseline result: ${baselineResult}`,
    "- Artifact: `03.3-PERFORMANCE-BASELINE.md`",
    "",
    "## Mutation Feedback",
    "",
    "- Command: `pnpm --filter @queue/web test -- performance-mutation-ui catalog-library-ui discovery-ui performance-metrics`",
    "- Covered locally: immediate syncing feedback, retry copy, duplicate-submit prevention, fallback inputs, reduced-motion CSS and source guards.",
    "- Browser delayed-response checks are defined in `apps/web/tests/phase-03-3-performance.spec.ts`.",
    "",
    "## Query Review",
    "",
    "- Command: `node --experimental-strip-types scripts/performance-explain.ts`",
    `- Query Review result: ${queryReviewResult}`,
    "- Artifact: `03.3-QUERY-REVIEW.md`",
    "",
    "## Telemetry",
    "",
    "- Web Vitals reporter mount is guarded by focused unit tests.",
    "- Server timing wrappers for routes and actions are guarded by focused unit tests.",
    "- Metric contracts reject arbitrary labels and sensitive-looking payload keys.",
    "",
    "## Desktop Browser",
    "",
    "- Command: `pnpm --filter @queue/web test:e2e -- tests/phase-03-3-performance.spec.ts tests/accessibility.spec.ts`",
    "- Coverage defined for 1440x1000 critical routes, useful content, hydration errors and first keyboard focus.",
    "",
    "## Mobile Browser",
    "",
    "- Coverage defined for 390x844 critical routes, mobile nav visibility, first focus and visible control overlap checks.",
    "",
    "## Slow Network",
    "",
    "- Coverage defined with a 420ms latency, 750kbps down, 250kbps up browser profile and delayed mutation responses.",
    "",
    "## Reduced Motion",
    "",
    "- Coverage defined through `page.emulateMedia({ reducedMotion: \"reduce\" })` plus static `/2` feedback state checks.",
    "",
    "## Accessibility",
    "",
    "- Coverage defined for pending feedback status announcements, disabled pending buttons, visible focus, non-overlap and axe checks.",
    "",
    "## Security/RLS",
    "",
    "- E2E fixture contract requires ready duo, partner and other-duo users.",
    "- Query review artifacts redact parameter values.",
    "- Local optimistic UI does not award XP, progress or terminal Phase 4 statuses.",
    "",
    "## Command Status",
    "",
    commandTable,
    "",
    "## Missing Fixtures",
    "",
    missingText,
    "",
    `## Result: ${result}`,
    "",
    "## Remaining Gates",
    "",
    result === "PASSED"
      ? "- None for Phase 03.3 performance gate."
      : "- Provide missing fixtures, rerun `pnpm phase:03.3:gate`, and review this artifact before starting Phase 4.",
    ""
  ].join("\n");

  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, markdown, "utf8");
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
