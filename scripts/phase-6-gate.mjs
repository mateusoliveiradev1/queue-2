#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
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
  "E2E_PHASE6_ELIGIBLE_SLUGS"
];
const externalEvidenceVars = [
  "DATABASE_URL",
  "TEST_DATABASE_URL",
  ...e2eFixtureVars
];
const missingExternalEvidence = missingVars(externalEvidenceVars);
const missingE2eFixtures = missingVars(e2eFixtureVars);
const missingTestDatabase = missingVars(["TEST_DATABASE_URL"]);
const missingRuntimeDatabase = missingVars(["DATABASE_URL"]);

if (missingExternalEvidence.length > 0) {
  console.warn(
    `[phase:6:gate] BLOCKED - missing external evidence: ${missingExternalEvidence.join(", ")}.`
  );
}

const commands = [
  {
    args: ["check:architecture"],
    command: pnpmBin,
    name: "Architecture"
  },
  {
    args: ["--filter", "@queue/web", "typecheck"],
    command: pnpmBin,
    name: "Web typecheck"
  },
  {
    args: ["--filter", "@queue/db", "typecheck"],
    command: pnpmBin,
    name: "DB typecheck"
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "test",
      "roulette-domain",
      "roulette-application",
      "roulette-ui"
    ],
    command: pnpmBin,
    name: "Focused roulette tests"
  },
  {
    args: [
      "--filter",
      "@queue/db",
      "test:integration",
      "roulette-migrations",
      "roulette-rls",
      "roulette-concurrency"
    ],
    command: pnpmBin,
    name: "DB integration evidence",
    skipReason: `missing TEST_DATABASE_URL: ${missingTestDatabase.join(", ")}`,
    skipWhen: missingTestDatabase.length > 0
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "test:e2e",
      "tests/phase-6-e2e.spec.ts"
    ],
    command: pnpmBin,
    name: "Browser E2E",
    skipReason: `missing E2E fixtures: ${missingE2eFixtures.join(", ")}`,
    skipWhen: missingE2eFixtures.length > 0
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "test:e2e",
      "tests/accessibility.spec.ts"
    ],
    command: pnpmBin,
    name: "Accessibility"
  },
  {
    args: ["scripts/roulette-economy-simulation.mjs"],
    command: "node",
    name: "Roulette economy simulation"
  },
  {
    args: ["--experimental-strip-types", "scripts/performance-explain.ts", "--phase=6"],
    command: "node",
    name: "Performance review",
    skipReason: `missing DATABASE_URL: ${missingRuntimeDatabase.join(", ")}`,
    skipWhen: missingRuntimeDatabase.length > 0
  },
  {
    args: ["check:secrets"],
    command: pnpmBin,
    name: "Security checks"
  }
];

const commandResults = commands.map(runCommand);
const failedCommands = commandResults.filter((result) => result.status !== 0);
const result =
  missingExternalEvidence.length > 0
    ? "BLOCKED - missing external evidence"
    : failedCommands.length > 0
      ? "FAILED"
      : "PASSED";

console.log("");
console.log(`[phase:6:gate] Result: ${result}`);
console.log("[phase:6:gate] Command status:");
for (const commandResult of commandResults) {
  console.log(
    `[phase:6:gate] - ${commandResult.name}: ${
      commandResult.skipped
        ? `skipped (${commandResult.skipReason})`
        : commandResult.status === 0
          ? "passed"
          : `failed (${commandResult.status})`
    }`
  );
}

if (missingExternalEvidence.length > 0) {
  console.log("");
  console.log("[phase:6:gate] Missing external evidence:");
  for (const name of missingExternalEvidence) {
    console.log(`[phase:6:gate] - ${name}`);
  }
}

if (failedCommands.length > 0 || missingExternalEvidence.length > 0) {
  process.exitCode = 1;
}

function runCommand(commandConfig) {
  if (commandConfig.skipWhen) {
    console.log("");
    console.log(`[phase:6:gate] ${commandConfig.name}`);
    console.log(`[phase:6:gate] skipped (${commandConfig.skipReason})`);

    return {
      command: [commandConfig.command, ...commandConfig.args].join(" "),
      durationMs: 0,
      name: commandConfig.name,
      skipped: true,
      skipReason: commandConfig.skipReason,
      status: 0
    };
  }

  console.log("");
  console.log(`[phase:6:gate] ${commandConfig.name}`);
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

  console.log(
    `[phase:6:gate] ${commandConfig.name}: ${status === 0 ? "passed" : "failed"} (${durationMs}ms)`
  );

  return {
    command: commandLine,
    durationMs,
    name: commandConfig.name,
    status
  };
}

function missingVars(names) {
  return names.filter((name) => !process.env[name]);
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
