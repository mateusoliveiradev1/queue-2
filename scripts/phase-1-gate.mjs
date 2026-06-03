import { access, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const inheritedPnpmEntry = process.env.npm_execpath;

const e2eRequiredEnv = [
  "E2E_BASE_URL",
  "E2E_FLOW_OWNER_EMAIL",
  "E2E_FLOW_OWNER_PASSWORD",
  "E2E_FLOW_PARTNER_EMAIL",
  "E2E_FLOW_PARTNER_PASSWORD",
  "E2E_FLOW_THIRD_EMAIL",
  "E2E_FLOW_THIRD_PASSWORD",
  "E2E_PAIRING_USER_EMAIL",
  "E2E_PAIRING_USER_PASSWORD",
  "E2E_READY_USER_EMAIL",
  "E2E_READY_USER_PASSWORD",
  "E2E_READY_DUO_NAME",
  "E2E_OTHER_DUO_USER_EMAIL",
  "E2E_OTHER_DUO_USER_PASSWORD",
  "E2E_OTHER_DUO_NAME"
];

const steps = [
  {
    name: "Architecture boundaries",
    args: ["check:architecture"]
  },
  {
    name: "TypeScript static analysis",
    args: ["typecheck"]
  },
  {
    name: "Lint static analysis",
    args: ["lint"]
  },
  {
    name: "Unit and component tests",
    args: ["test"]
  },
  {
    name: "Database migrations, RLS, role privileges and concurrency",
    args: ["--filter", "@queue/db", "test:integration"],
    requiredEnv: ["TEST_DATABASE_URL"],
    skipReason:
      "Use an isolated Neon preview/test branch or local Postgres database; this remains a release blocker until executed."
  },
  {
    name: "Production web build",
    args: ["--filter", "@queue/web", "build"],
    requiredEnv: ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"],
    skipReason:
      "Provide non-production build values that point at an isolated environment to validate the final client bundle."
  },
  {
    name: "Source and built-client secret scan",
    args: ["check:secrets"]
  },
  {
    name: "Production dependency audit",
    args: ["audit:dependencies"]
  },
  {
    name: "Playwright Phase 1 E2E and accessibility",
    args: ["--filter", "@queue/web", "test:e2e"],
    requiredEnv: e2eRequiredEnv,
    skipReason:
      "Use a clean isolated test deployment with verified no-duo, named-duo and cross-duo fixture accounts."
  }
];

const results = [];

console.log("QUEUE/2 Phase 1 gate");
console.log("====================");

try {
  await verifyDocumentationContracts();
  results.push({ name: "Recovery and security documentation contracts", status: "passed" });
  console.log("[PASS] Recovery and security documentation contracts");
} catch (error) {
  results.push({
    name: "Recovery and security documentation contracts",
    status: "failed"
  });
  console.error(`[FAIL] Recovery and security documentation contracts: ${errorMessage(error)}`);
}

for (const step of steps) {
  const missing = (step.requiredEnv ?? []).filter((name) => !process.env[name]);

  if (missing.length > 0) {
    results.push({ name: step.name, status: "skipped" });
    console.warn(`\n[SKIP] ${step.name}`);
    console.warn(`Missing: ${missing.join(", ")}`);
    console.warn(step.skipReason);
    continue;
  }

  console.log(`\n[RUN] ${step.name}`);
  const exitCode = await runPnpm(step.args);

  if (exitCode === 0) {
    results.push({ name: step.name, status: "passed" });
    console.log(`[PASS] ${step.name}`);
  } else {
    results.push({ name: step.name, status: "failed" });
    console.error(`[FAIL] ${step.name} exited with code ${exitCode}.`);
  }
}

printSummary(results);

if (results.some((result) => result.status === "failed")) {
  process.exitCode = 1;
} else if (results.some((result) => result.status === "skipped")) {
  console.warn(
    "\nPhase 1 gate completed with explicit external-environment skips. " +
      "Run every skipped gate before release or phase verification can claim live coverage."
  );
} else {
  console.log("\nPhase 1 gate passed with no skipped checks.");
}

async function verifyDocumentationContracts() {
  const contracts = [
    {
      path: ".planning/SECURITY.md",
      required: [
        "### Phase 1 Verification Procedure",
        "pnpm phase:1:gate",
        "### Known Critical Or High Findings"
      ]
    },
    {
      path: "packages/db/RESTORE.md",
      required: [
        "## Neon Restore Rehearsal Checklist",
        "## Local Fallback Checklist",
        "EXPLAIN (ANALYZE, BUFFERS)",
        "## Restore Rehearsal Evidence"
      ]
    }
  ];

  for (const contract of contracts) {
    const filePath = resolve(workspaceRoot, contract.path);
    await access(filePath);
    const content = await readFile(filePath, "utf8");

    for (const marker of contract.required) {
      if (!content.includes(marker)) {
        throw new Error(`${contract.path} is missing required marker: ${marker}`);
      }
    }
  }

  const migrationDir = resolve(workspaceRoot, "packages/db/src/migrations");
  const migrations = (await readdir(migrationDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  if (migrations.length === 0) {
    throw new Error("No immutable numbered SQL migrations were found.");
  }

  console.log(`Documentation gate found ${migrations.length} numbered SQL migration(s).`);
}

function runPnpm(args) {
  return new Promise((resolveExitCode) => {
    const command = inheritedPnpmEntry ? process.execPath : pnpmCommand;
    const commandArgs = inheritedPnpmEntry ? [inheritedPnpmEntry, ...args] : args;
    const child = spawn(command, commandArgs, {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
      stdio: "inherit"
    });

    child.on("error", (error) => {
      console.error(`Unable to start pnpm ${args.join(" ")}: ${errorMessage(error)}`);
      resolveExitCode(1);
    });
    child.on("exit", (code) => resolveExitCode(code ?? 1));
  });
}

function printSummary(gateResults) {
  console.log("\nPhase 1 gate summary");
  console.log("--------------------");

  for (const result of gateResults) {
    console.log(`${result.status.toUpperCase().padEnd(7)} ${result.name}`);
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
