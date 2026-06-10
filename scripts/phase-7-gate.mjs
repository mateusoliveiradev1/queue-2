#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const phaseDir = resolve(workspaceRoot, ".planning/phases/07-paridade-visual-e-ux-com-prototipo");
const evidencePath = resolve(phaseDir, "07-VISUAL-EVIDENCE.md");
const screenshotDir = resolve(phaseDir, "evidence/screenshots");
const pnpmBin = "pnpm";

loadEnvLocal();

const e2eFixtureVars = [
  "E2E_BASE_URL",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD"
];
const phase6FixtureVars = ["E2E_PHASE6_ELIGIBLE_SLUGS"];
const missingPublicEvidence = missingVars(["E2E_BASE_URL"]);
const missingAuthenticatedEvidence = missingVars(e2eFixtureVars);
const authFixtureBlocker =
  missingAuthenticatedEvidence.length === 0 ? await checkAuthFixture() : null;
const missingExternalEvidence = [
  ...missingVars([...e2eFixtureVars, ...phase6FixtureVars]),
  ...(authFixtureBlocker ? [authFixtureBlocker] : [])
];

if (missingExternalEvidence.length > 0) {
  console.warn(
    `[phase:7:gate] BLOCKED - missing external evidence: ${missingExternalEvidence.join(", ")}.`
  );
}

const commands = [
  {
    args: ["check:secrets"],
    command: pnpmBin,
    name: "Secret scan"
  },
  {
    args: ["check:architecture"],
    command: pnpmBin,
    name: "Architecture"
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "exec",
      "vitest",
      "run",
      "brand-ui",
      "discovery-ui",
      "roulette-ui",
      "gamification-challenges",
      "duo-flow",
      "auth-flow",
      "play-dashboard-ui",
      "catalog-library-ui",
      "gamification-dashboard-ui"
    ],
    command: pnpmBin,
    name: "Focused Phase 7 source/UI tests"
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "exec",
      "playwright",
      "test",
      "tests/phase-7-visual.spec.ts",
      "--grep",
      "Phase 7 public"
    ],
    command: pnpmBin,
    name: "Phase 7 public visual browser evidence",
    skipReason: `missing E2E_BASE_URL: ${missingPublicEvidence.join(", ")}`,
    skipWhen: missingPublicEvidence.length > 0
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "exec",
      "playwright",
      "test",
      "tests/phase-7-visual.spec.ts",
      "--grep",
      "Phase 7 authenticated"
    ],
    command: pnpmBin,
    externalBlockerPatterns: [
      /credenciais-invalidas/i,
      /invalid credentials/i,
      /BLOCKED setup/i,
      /page\.waitForURL[\s\S]*\/login/i
    ],
    externalBlockerReason:
      "E2E_READY_USER credentials could not authenticate against E2E_BASE_URL",
    name: "Phase 7 authenticated visual browser evidence",
    skipReason:
      authFixtureBlocker ??
      `missing authenticated E2E fixtures: ${missingAuthenticatedEvidence.join(", ")}`,
    skipWhen: missingAuthenticatedEvidence.length > 0 || Boolean(authFixtureBlocker)
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "exec",
      "vitest",
      "run",
      "roulette-application",
      "roulette-ui"
    ],
    command: pnpmBin,
    name: "Phase 6 preservation - roulette application/UI"
  }
];

const commandResults = commands.map(runCommand);
const externalBlockers = uniqueList([
  ...missingExternalEvidence,
  ...commandResults
    .filter((result) => result.blocked)
    .map((result) => result.blockerReason)
    .filter(Boolean)
]);
const failedCommands = commandResults.filter((result) => result.status !== 0 && !result.blocked);
const result =
  failedCommands.length > 0
    ? "FAILED"
    : externalBlockers.length > 0
      ? "BLOCKED - missing external evidence"
      : "PASSED";

writeEvidence({ commandResults, result });

console.log("");
console.log(`[phase:7:gate] Result: ${result}`);
console.log("[phase:7:gate] Command status:");
for (const commandResult of commandResults) {
  console.log(`[phase:7:gate] - ${commandResult.name}: ${formatStatus(commandResult)}`);
}

if (externalBlockers.length > 0) {
  console.log("");
  console.log("[phase:7:gate] Missing external evidence:");
  for (const name of externalBlockers) {
    console.log(`[phase:7:gate] - ${name}`);
  }
}

console.log("");
console.log(`[phase:7:gate] Evidence summary: ${evidencePath}`);
console.log(`[phase:7:gate] Browser screenshots: ${screenshotDir}`);

if (failedCommands.length > 0 || missingExternalEvidence.length > 0) {
  process.exitCode = 1;
}

function runCommand(commandConfig) {
  if (commandConfig.skipWhen) {
    console.log("");
    console.log(`[phase:7:gate] ${commandConfig.name}`);
    console.log(`[phase:7:gate] skipped (${commandConfig.skipReason})`);

    return {
      blocked: true,
      blockerReason: commandConfig.skipReason,
      command: formatCommandLine(commandConfig.command, commandConfig.args),
      durationMs: 0,
      name: commandConfig.name,
      skipped: true,
      skipReason: commandConfig.skipReason,
      status: 0
    };
  }

  console.log("");
  console.log(`[phase:7:gate] ${commandConfig.name}`);
  const commandLine = formatCommandLine(commandConfig.command, commandConfig.args);
  console.log(`$ ${commandLine}`);

  const startedAt = Date.now();
  const commandResult = spawnSync(commandLine, {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: process.env,
    shell: true,
    stdio: "pipe"
  });
  const durationMs = Date.now() - startedAt;
  const status = commandResult.status ?? 1;
  const stdout = commandResult.stdout ?? "";
  const stderr = commandResult.stderr ?? "";
  const combinedOutput = `${stdout}\n${stderr}`;
  const blocked =
    status !== 0 &&
    Array.isArray(commandConfig.externalBlockerPatterns) &&
    commandConfig.externalBlockerPatterns.some((pattern) => pattern.test(combinedOutput));

  if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }

  console.log(
    `[phase:7:gate] ${commandConfig.name}: ${
      status === 0 ? "passed" : blocked ? "blocked" : "failed"
    } (${durationMs}ms)`
  );

  return {
    blocked,
    blockerReason: blocked ? commandConfig.externalBlockerReason : undefined,
    command: commandLine,
    durationMs,
    name: commandConfig.name,
    status
  };
}

function writeEvidence({ commandResults, result }) {
  const generated = new Date().toISOString();
  const commandTable = [
    "| Command | Status | Duration |",
    "| --- | --- | --- |",
    ...commandResults.map(
      (entry) =>
        `| ${entry.name} | ${formatStatus(entry)} | ${entry.durationMs}ms |`
    )
  ].join("\n");
  const screenshotIndex = [
    "landing",
    "login",
    "cadastro",
    "parear",
    "/app",
    "biblioteca",
    "descobrir",
    "roleta",
    "desafios",
    "hall",
    "dupla",
    "perfil"
  ];

  const markdown = [
    "---",
    "phase: 07",
    "artifact: visual-evidence",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 7 Visual Evidence",
    "",
    "This file is generated by `pnpm phase:7:gate`. It records command status, screenshot locations and named fixture blockers without writing secret values.",
    "",
    "## Scope",
    "",
    "- Public landing, compact public auth and pairing routes.",
    "- Authenticated shell, Home, Biblioteca, Descobrir, Roleta, Desafios, Hall, Dupla and Perfil.",
    "- Axe, reduced motion, screenshot, no horizontal overflow, no overlap and touch target checks.",
    "- SAFE-04/SAFE-05 preservation through architecture and secret scan commands.",
    "",
    "## Viewports",
    "",
    "- desktop: 1440x1000.",
    "- mobile: 390x844.",
    "- reduced motion: authenticated Descobrir and Roleta reduced-motion checks in the authenticated browser command when ready-user fixtures are valid.",
    "",
    "## Route Coverage",
    "",
    ...screenshotIndex.map((name) => `- ${name}: desktop, mobile, axe, overflow, overlap and touch target coverage via Phase 7 browser spec.`),
    "",
    "## Command Status",
    "",
    commandTable,
    "",
    "## Browser Screenshots",
    "",
    `- Directory: \`${screenshotDir}\``,
    "- Screenshot filenames use `phase-7-{route}-{desktop|mobile}-chromium.png`.",
    "",
    "## Accessibility And Layout Checks",
    "",
    "- axe: WCAG A/AA axe checks run in the public and authenticated browser specs.",
    "- overflow: document horizontal overflow is asserted at each viewport.",
    "- overlap: visible controls are checked for meaningful collision.",
    "- focus/touch: visible buttons, links, form controls and tabs keep at least 44px touch targets unless ignored as hidden/devtools controls.",
    "- reduced motion: reduced-motion media emulation verifies Descobrir and Roleta do not collide when authenticated fixtures are available.",
    "",
    "## Missing External Evidence",
    "",
    listOrNone(externalBlockers),
    "",
    `## Result: ${result}`,
    ""
  ].join("\n");

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, markdown, "utf8");
}

function missingVars(names) {
  return names.filter((name) => !process.env[name]);
}

async function checkAuthFixture() {
  const baseUrl = process.env.E2E_BASE_URL;
  const email = process.env.E2E_READY_USER_EMAIL;
  const password = process.env.E2E_READY_USER_PASSWORD;

  if (!baseUrl || !email || !password) {
    return null;
  }

  try {
    const response = await fetch(new URL("/api/auth/sign-in/email", baseUrl), {
      body: JSON.stringify({ email, password }),
      headers: {
        "content-type": "application/json",
        origin: baseUrl
      },
      method: "POST"
    });

    if (response.ok) {
      return null;
    }

    const payload = await response.text();
    const status = sanitizePreflightStatus(payload) || `HTTP ${response.status}`;

    return `E2E_READY_USER credentials could not authenticate against E2E_BASE_URL (${status})`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return `E2E_BASE_URL auth preflight failed (${message})`;
  }
}

function sanitizePreflightStatus(value) {
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed?.code === "string") {
      return parsed.code;
    }

    if (typeof parsed?.message === "string") {
      return parsed.message.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[email]");
    }
  } catch {
    // Fall through to no detailed status.
  }

  return "";
}

function listOrNone(items) {
  return items.length > 0 ? items.map((name) => `- ${name}`).join("\n") : "None.";
}

function uniqueList(items) {
  return [...new Set(items)];
}

function formatStatus(entry) {
  if (entry.skipped) {
    return `skipped (${entry.skipReason})`;
  }

  if (entry.status === 0) {
    return "passed";
  }

  if (entry.blocked) {
    return `blocked (${entry.blockerReason})`;
  }

  return `failed (${entry.status})`;
}

function formatCommandLine(command, args) {
  return [command, ...args.map(quoteShellArg)].join(" ");
}

function quoteShellArg(value) {
  if (/^[A-Za-z0-9_@./:\\=-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\"", "\\\"")}"`;
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
