#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const phaseDir = resolve(workspaceRoot, ".planning/phases/06-roleta-e-economia");
const performanceReviewPath = resolve(phaseDir, "06-PERFORMANCE-REVIEW.md");
const securityReviewPath = resolve(phaseDir, "06-SECURITY-REVIEW.md");
const userSetupPath = resolve(phaseDir, "06-USER-SETUP.md");
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
const migrationDatabaseVars = ["DATABASE_URL"];
const dbFixtureVars = ["TEST_DATABASE_URL"];
const effectiveMigrationDatabaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
const missingE2eFixtures = missingVars(e2eFixtureVars);
const missingDbFixtures = missingVars(dbFixtureVars);
const missingMigrationDatabase = effectiveMigrationDatabaseUrl ? [] : migrationDatabaseVars;
const missingExternalEvidence = [
  ...missingMigrationDatabase,
  ...missingDbFixtures,
  ...missingE2eFixtures
];
const requirementCoverage = [
  ["ROUL-01", "Eligible pool and blocked state", "roulette-domain, roulette-ui, phase-6-e2e"],
  ["ROUL-02", "Server-authoritative result before reveal", "roulette-domain, roulette-application, DB integration"],
  ["ROUL-03", "Opt-in audio and no autoplay", "roulette-ui, accessibility"],
  ["ROUL-04", "Reduced motion and replay without redraw", "roulette-domain, roulette-ui, phase-6-e2e"],
  ["ROUL-05", "Rarity seal and Legendary fallback", "roulette-ui, phase-6-e2e"],
  ["ROUL-06", "Base and boosted rarity weights", "roulette-domain, economy simulation"],
  ["ROUL-07", "Discard cooldown", "roulette-domain, roulette-application, economy simulation"],
  ["ROUL-08", "Boost balance, cap and weekend generation", "roulette-domain, roulette-application, economy simulation"],
  ["ROUL-09", "Lock result as Principal", "roulette-application, roulette-ui, phase-6-e2e"],
  ["ROUL-10", "Idempotency and one active round", "roulette-application, DB integration"],
  ["SAFE-06", "Server authorization, RLS and no client-owned facts", "security review, DB integration, gate"]
];
const decisionCoverage = [
  ["D-01", "Curated backlog source", "roulette-domain"],
  ["D-02", "Wishlist and Pausado eligibility", "roulette-domain"],
  ["D-03", "60 visual covers with one persisted result", "roulette-domain, roulette-ui"],
  ["D-04", "Minimum eligible pool of 3", "roulette-domain, roulette-application"],
  ["D-05", "Base rarity weights", "economy simulation"],
  ["D-06", "Recent discard cooldown", "economy simulation, roulette-domain"],
  ["D-07", "Pending invitation after reveal", "roulette-application"],
  ["D-08", "Separate boost balance", "roulette-domain, DB integration"],
  ["D-09", "Boost mirrors collective XP", "roulette-domain"],
  ["D-10", "100 boost improves rarity odds", "economy simulation"],
  ["D-11", "Visible pity progress", "roulette-ui"],
  ["D-12", "Pity guarantee at 10", "economy simulation"],
  ["D-13", "Weekend generation multiplier 1.2", "economy simulation"],
  ["D-14", "Boost balance cap 600", "economy simulation"],
  ["D-15", "Refund before persistence only", "roulette-domain, roulette-application"],
  ["D-16", "One active or pending round", "DB integration, roulette-application"],
  ["D-17", "Editorial reveal cadence", "roulette-ui"],
  ["D-18", "Opt-in audio preference", "roulette-ui, accessibility"],
  ["D-19", "Reduced-motion staged reveal", "roulette-ui, accessibility"],
  ["D-20", "Legendary static and particle fallback", "roulette-ui, phase-6-e2e"],
  ["D-21", "Persisted shared result before animation", "roulette-application"],
  ["D-22", "Replay is not a redraw", "phase-6-e2e"],
  ["D-23", "Mobile full-bleed reel with fixed pointer", "roulette-ui, accessibility, phase-6-e2e"],
  ["D-24", "Authoritative resume after refresh", "roulette-application, phase-6-e2e"],
  ["D-25", "Commitment invitation copy", "roulette-ui"],
  ["D-26", "Lock as Principal with audit", "roulette-application"],
  ["D-27", "Replacement required with no auto-pause", "roulette-application, roulette-ui"],
  ["D-28", "Dashboard roleta-principal highlight", "roulette-ui"],
  ["D-29", "New round blocked until invitation resolution", "roulette-application"],
  ["D-30", "Discard keeps persisted boost spend", "roulette-application"],
  ["D-31", "Central facts for locked and discarded results", "roulette-ui, DB integration"],
  ["D-32", "Compact history with result outcome", "roulette-ui, performance review"]
];

if (missingExternalEvidence.length > 0) {
  console.warn(
    `[phase:6:gate] BLOCKED - missing external evidence: ${missingExternalEvidence.join(", ")}.`
  );
}

const migrationEnv = effectiveMigrationDatabaseUrl
  ? {
      DATABASE_URL: effectiveMigrationDatabaseUrl,
      DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL ?? effectiveMigrationDatabaseUrl
    }
  : {};

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
    args: ["--filter", "@queue/db", "drizzle:generate"],
    command: pnpmBin,
    env: migrationEnv,
    name: "Drizzle generate",
    skipReason: `missing DATABASE_URL: ${missingMigrationDatabase.join(", ")}`,
    skipWhen: missingMigrationDatabase.length > 0
  },
  {
    args: ["--filter", "@queue/db", "drizzle:migrate"],
    command: pnpmBin,
    env: migrationEnv,
    name: "Drizzle migrate",
    skipReason: `missing DATABASE_URL: ${missingMigrationDatabase.join(", ")}`,
    skipWhen: missingMigrationDatabase.length > 0
  },
  {
    args: [
      "--filter",
      "@queue/db",
      "test:integration",
      "roulette-migrations",
      "roulette-rls",
      "roulette-concurrency",
      "performance-hot-paths"
    ],
    command: pnpmBin,
    name: "DB integration evidence",
    skipReason: `missing TEST_DATABASE_URL: ${missingDbFixtures.join(", ")}`,
    skipWhen: missingDbFixtures.length > 0
  },
  {
    args: ["--experimental-strip-types", "scripts/performance-explain.ts", "--phase=6"],
    command: "node",
    name: "Performance explain"
  },
  {
    args: ["scripts/roulette-economy-simulation.mjs"],
    command: "node",
    name: "Roulette economy simulation"
  },
  {
    args: [
      "--filter",
      "@queue/web",
      "test:e2e",
      "tests/phase-6-e2e.spec.ts",
      "tests/accessibility.spec.ts"
    ],
    command: pnpmBin,
    name: "Browser E2E and accessibility",
    skipReason: `missing E2E fixtures: ${missingE2eFixtures.join(", ")}`,
    skipWhen: missingE2eFixtures.length > 0
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
  failedCommands.length > 0
    ? "FAILED"
    : missingExternalEvidence.length > 0
      ? "BLOCKED - missing external evidence"
      : "PASSED";

writeUserSetup({ result });
writeSecurityReview({ commandResults, result });
writePerformanceReview({ commandResults, result });

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

console.log("");
console.log(`[phase:6:gate] Performance artifact: ${performanceReviewPath}`);
console.log(`[phase:6:gate] Security artifact: ${securityReviewPath}`);
console.log(`[phase:6:gate] Setup artifact: ${userSetupPath}`);

if (failedCommands.length > 0) {
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
    env: {
      ...process.env,
      ...(commandConfig.env ?? {})
    },
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

function writeUserSetup({ result }) {
  const generated = new Date().toISOString();
  const markdown = [
    "---",
    "phase: 06-roleta-e-economia",
    "artifact: user-setup",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 6 User Setup",
    "",
    "Use this setup before treating Phase 6 database, browser or migration evidence as complete. Missing variables are blockers, not passing evidence. Secret values are never written to this artifact.",
    "",
    "## Database And Migration Evidence",
    "",
    "| Variable | Status | Purpose |",
    "| --- | --- | --- |",
    `| \`DATABASE_URL\` | ${effectiveMigrationDatabaseUrl ? "configured" : "missing"} | Direct test/integration database connection for \`drizzle:generate\` and \`drizzle:migrate\`; the gate maps it to \`DIRECT_DATABASE_URL\` for Drizzle Kit. |`,
    `| \`TEST_DATABASE_URL\` | ${process.env.TEST_DATABASE_URL ? "configured" : "missing"} | Isolated Neon/Postgres branch for roulette migration, RLS, concurrency and performance-hot-path evidence. |`,
    "",
    "## Authenticated E2E Fixtures",
    "",
    "| Variable | Status | Purpose |",
    "| --- | --- | --- |",
    ...e2eFixtureVars.map((name) => `| \`${name}\` | ${process.env[name] ? "configured" : "missing"} | ${fixturePurpose(name)} |`),
    "",
    "Fixture expectations:",
    "",
    "- `E2E_READY_USER_*` and `E2E_READY_PARTNER_*` must belong to exactly the same ready duo.",
    "- `E2E_OTHER_DUO_USER_*` must belong to a different duo and must not see the ready duo roulette state.",
    "- `E2E_PHASE6_ELIGIBLE_SLUGS` must list comma-separated Wishlist/Pausado game slugs for the ready duo.",
    "- The ready duo needs enough eligible games to satisfy ROUL-01 and at least one scenario with a pending result for lock/discard browser evidence.",
    "",
    buildCoverageSection(),
    "",
    "## Verification Commands",
    "",
    "```bash",
    "pnpm phase:6:gate",
    "node --experimental-strip-types scripts/performance-explain.ts --phase=6",
    "pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency performance-hot-paths",
    "pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts tests/accessibility.spec.ts",
    "```",
    "",
    "## Missing Variables",
    "",
    "### Database",
    "",
    listOrNone([...missingMigrationDatabase, ...missingDbFixtures]),
    "",
    "### Browser",
    "",
    listOrNone(missingE2eFixtures),
    "",
    `## Result: ${result}`,
    ""
  ].join("\n");

  writeArtifact(userSetupPath, markdown);
}

function writePerformanceReview({ commandResults, result }) {
  const generated = new Date().toISOString();
  const queryReviewResult = readResultLine(performanceReviewPath) ?? "not generated";
  const commandTable = [
    "| Command | Status | Duration |",
    "| --- | --- | --- |",
    ...commandResults.map(
      (entry) =>
        `| ${entry.name} | ${entry.skipped ? "skipped" : entry.status === 0 ? "passed" : `failed (${entry.status})`} | ${entry.durationMs}ms |`
    )
  ].join("\n");
  const markdown = [
    "---",
    "phase: 06",
    "plan: 10",
    "artifact: performance-review",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 6 Performance Review",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    "- Evidence environment: root Phase 6 gate command.",
    "- Credentials: process-only; no credential values written to this artifact.",
    `- Migration database status: ${effectiveMigrationDatabaseUrl ? "configured" : "missing"}`,
    `- TEST_DATABASE_URL status: ${process.env.TEST_DATABASE_URL ? "configured" : "missing"}`,
    `- E2E fixture status: ${missingE2eFixtures.length > 0 ? "missing" : "configured"}`,
    "",
    "## Query Review",
    "",
    "- Command: `node --experimental-strip-types scripts/performance-explain.ts --phase=6`",
    `- Query/performance result before gate consolidation: ${queryReviewResult}`,
    "- Covered roulette hot paths: roulette state read, eligible pool, active round lookup, compact history, lock/discard mutation, boost ledger mutation and dashboard handoff.",
    "- Test target: `pnpm --filter @queue/db test:integration -- performance-hot-paths`.",
    "",
    "## Query Targets",
    "",
    "- `/app/roleta` state read uses boost balance, pity state, active round and history indexes.",
    "- Eligible Wishlist/Pausado pool uses library status and cooldown indexes.",
    "- Lock/discard resolves one pending invitation through indexed round status/idempotency paths.",
    "- Dashboard handoff continues through Play active-game and notification hot paths.",
    "",
    buildCoverageSection(),
    "",
    "## Command Status",
    "",
    commandTable,
    "",
    "## Blockers",
    "",
    listOrNone(missingExternalEvidence),
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    result === "PASSED"
      ? "- Keep this artifact updated if roulette query shapes, indexes or gate commands change."
      : "- Provide missing external evidence, rerun `pnpm phase:6:gate`, and treat skipped DB/browser checks as blockers until they execute.",
    ""
  ].join("\n");

  writeArtifact(performanceReviewPath, markdown);
}

function writeSecurityReview({ commandResults, result }) {
  const generated = new Date().toISOString();
  const failedSecurityCommands = commandResults.filter((entry) =>
    entry.name.toLowerCase().includes("security") && entry.status !== 0
  );
  const highCriticalFindings =
    failedSecurityCommands.length > 0 ? "pending command failure review" : "none recorded";
  const markdown = [
    "---",
    "phase: 06",
    "plan: 10",
    "artifact: security-review",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 6 Security Review",
    "",
    "## Scope",
    "",
    "- Roulette result selection, boost balance, pity, cooldown, compact history, lock/discard and Play handoff.",
    "- Browser is untrusted: no client result, duo, pity, balance, boost, cooldown or history fact is authoritative.",
    "- Known critical findings: none recorded.",
    "- Known high findings: none recorded.",
    "",
    "## RLS And Roles",
    "",
    "- Runtime role must not have `BYPASSRLS`; roulette tables use forced RLS in migration tests.",
    "- Runtime identity is transaction-local through `current_user_id`/`queue2.user_id` patterns.",
    "- Policies rely on `has_duo_membership` for member-scoped roulette balances, rounds, entries, boost ledger, cooldowns and history.",
    "",
    "## Integrity Controls",
    "",
    "- The one active roulette invariant is enforced by `app_roulette_rounds_active_duo_uidx` for active/revealing/pending invitation states.",
    "- The boost ledger is append-only from application flows and uses unique duo-scoped keys/source tuples for exactly-once spend/refund effects.",
    "- Roulette history append-only facts are kept in `app.roulette_history_events` with unique event keys.",
    "- Idempotency keys converge replayed or concurrent round starts instead of duplicating costs, pity updates or history.",
    "",
    "## Server Action And Route Validation",
    "",
    "- `/app/roleta` actions submit only proposal fields such as round id or replacement id.",
    "- Application use cases re-read authoritative duo, result, boost, pity, cooldown and active Play state on the server.",
    "- Lock/discard paths call Play through public contracts and never deep-import Play internals from routes.",
    "",
    buildCoverageSection(),
    "",
    "## External Evidence Blockers",
    "",
    listOrNone(missingExternalEvidence),
    "",
    "## Findings",
    "",
    `- critical: ${highCriticalFindings === "none recorded" ? "none" : highCriticalFindings}`,
    `- high: ${highCriticalFindings === "none recorded" ? "none" : highCriticalFindings}`,
    "",
    `## Result: ${result}`,
    ""
  ].join("\n");

  writeArtifact(securityReviewPath, markdown);
}

function writeArtifact(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function buildCoverageSection() {
  return [
    "## Final Coverage Matrix",
    "",
    "### Requirements",
    "",
    "| ID | Coverage | Evidence |",
    "| --- | --- | --- |",
    ...requirementCoverage.map(
      ([id, coverage, evidence]) => `| ${id} | ${coverage} | ${evidence} |`
    ),
    "",
    "### Decisions",
    "",
    "| ID | Coverage | Evidence |",
    "| --- | --- | --- |",
    ...decisionCoverage.map(
      ([id, coverage, evidence]) => `| ${id} | ${coverage} | ${evidence} |`
    )
  ].join("\n");
}

function missingVars(names) {
  return names.filter((name) => !process.env[name]);
}

function listOrNone(items) {
  return items.length > 0 ? items.map((name) => `- ${name}`).join("\n") : "None.";
}

function readResultLine(path) {
  if (!existsSync(path)) {
    return null;
  }

  const match = readFileSync(path, "utf8").match(/^## Result:\s*(.+)$/m);

  return match?.[1]?.trim() ?? null;
}

function fixturePurpose(name) {
  switch (name) {
    case "E2E_BASE_URL":
      return "Local or deployed app URL for browser checks.";
    case "E2E_READY_USER_EMAIL":
    case "E2E_READY_USER_PASSWORD":
      return "Ready duo member 1 credentials.";
    case "E2E_READY_PARTNER_EMAIL":
    case "E2E_READY_PARTNER_PASSWORD":
      return "Ready duo member 2 credentials.";
    case "E2E_OTHER_DUO_USER_EMAIL":
    case "E2E_OTHER_DUO_USER_PASSWORD":
      return "Different-duo actor for isolation checks.";
    case "E2E_PHASE6_ELIGIBLE_SLUGS":
      return "Comma-separated Wishlist/Pausado slugs eligible for the ready duo roulette.";
    default:
      return "Phase 6 browser fixture.";
  }
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
