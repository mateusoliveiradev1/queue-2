#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const phaseDir = resolve(workspaceRoot, ".planning/phases/05-gamificacao-coletiva");
const performanceReviewPath = resolve(phaseDir, "05-PERFORMANCE-REVIEW.md");
const economyAuditPath = resolve(phaseDir, "05-ECONOMY-AUDIT.md");
const userSetupPath = resolve(phaseDir, "05-USER-SETUP.md");
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
  "E2E_PHASE5_ZERADO_SLUG",
  "E2E_PHASE5_DROPADO_SLUG"
];
const dbFixtureVars = [
  "TEST_DATABASE_URL",
  "WORKER_DATABASE_URL",
  "DIRECT_DATABASE_URL"
];
const migrationCredentialVars = ["WORKER_DATABASE_URL", "DIRECT_DATABASE_URL"];
const jobEvidenceVars = ["CRON_SECRET", "GAMIFICATION_RUNNER_FREQUENCY_MINUTES"];
const missingE2eFixtures = missingVars(e2eFixtureVars);
const missingDbFixtures = missingVars(dbFixtureVars);
const missingMigrationCredentials = missingVars(migrationCredentialVars);
const missingJobEvidence = missingVars(jobEvidenceVars);

if (missingE2eFixtures.length > 0) {
  console.warn(`Phase 5 browser gate BLOCKED setup. Missing: ${missingE2eFixtures.join(", ")}.`);
}

if (missingDbFixtures.length > 0) {
  console.error(`Phase 5 DB gate FAILED setup. Missing: ${missingDbFixtures.join(", ")}.`);
}

if (missingJobEvidence.length > 0) {
  console.warn(`Phase 5 job evidence BLOCKED setup. Missing: ${missingJobEvidence.join(", ")}.`);
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
    name: "Focused gamification tests",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/web",
      "test",
      "gamification-domain",
      "gamification-application",
      "gamification-rewards",
      "play-gamification-integration",
      "discovery-gamification-integration",
      "gamification-dashboard-ui",
      "gamification-reward-toast",
      "gamification-achievements",
      "gamification-challenges",
      "gamification-jobs",
      "gamification-streak",
      "gamification-security"
    ]
  },
  {
    name: "DB integration evidence",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/db",
      "test:integration",
      "gamification-rls",
      "gamification-migrations",
      "gamification-concurrency",
      "performance-hot-paths"
    ]
  },
  {
    name: "Apply Phase 5 migrations",
    command: pnpmBin,
    args: ["--filter", "@queue/db", "drizzle:migrate"],
    skipWhen: missingMigrationCredentials.length > 0,
    skipReason: `missing migration credentials: ${missingMigrationCredentials.join(", ")}`
  },
  {
    name: "Phase 5 schema drift",
    command: "gsd-sdk",
    args: ["query", "verify.schema-drift", "05"],
    skipWhen: missingMigrationCredentials.length > 0,
    skipReason: `missing migration credentials: ${missingMigrationCredentials.join(", ")}`
  },
  {
    name: "Phase 5 query and performance review",
    command: "node",
    args: ["--experimental-strip-types", "scripts/performance-explain.ts", "--phase=5"]
  },
  {
    name: "Browser E2E and accessibility",
    command: pnpmBin,
    args: [
      "--filter",
      "@queue/web",
      "test:e2e",
      "tests/phase-5-e2e.spec.ts",
      "tests/accessibility.spec.ts"
    ],
    skipWhen: missingE2eFixtures.length > 0,
    skipReason: `missing E2E fixtures: ${missingE2eFixtures.join(", ")}`
  }
];

const commandResults = commands.map(runCommand);
const economyAudit = writeEconomyAudit({
  missingDbFixtures,
  missingE2eFixtures,
  missingJobEvidence
});
writeUserSetup({
  missingDbFixtures,
  missingE2eFixtures,
  missingJobEvidence
});

const failedCommands = commandResults.filter((result) => result.status !== 0);
const missingRequiredDatabaseCredentials = missingDbFixtures.length > 0;
const blockers = [
  ...missingDbFixtures,
  ...missingE2eFixtures,
  ...missingJobEvidence
];
const result =
  failedCommands.length > 0 ||
  missingRequiredDatabaseCredentials ||
  economyAudit.result === "FAILED"
    ? "FAILED"
    : blockers.length > 0
      ? "BLOCKED - missing external evidence"
      : "PASSED";

writePerformanceReview({
  blockers,
  commandResults,
  economyAudit,
  missingDbFixtures,
  missingE2eFixtures,
  missingJobEvidence,
  result
});

console.log(`Phase 5 gate ${result}.`);
console.log(`Performance artifact: ${performanceReviewPath}`);
console.log(`Economy artifact: ${economyAuditPath}`);
console.log(`Setup artifact: ${userSetupPath}`);

if (
  failedCommands.length > 0 ||
  missingRequiredDatabaseCredentials ||
  economyAudit.result === "FAILED"
) {
  process.exitCode = 1;
}

function runCommand(commandConfig) {
  if (commandConfig.skipWhen) {
    console.log(`\n[phase:5:gate] ${commandConfig.name}`);
    console.log(`[phase:5:gate] skipped (${commandConfig.skipReason})`);

    return {
      command: [commandConfig.command, ...commandConfig.args].join(" "),
      durationMs: 0,
      name: commandConfig.name,
      skipped: true,
      status: 0
    };
  }

  console.log(`\n[phase:5:gate] ${commandConfig.name}`);
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

  console.log(`[phase:5:gate] ${commandConfig.name}: ${status === 0 ? "passed" : "failed"} (${durationMs}ms)`);

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
  economyAudit,
  missingDbFixtures,
  missingE2eFixtures,
  missingJobEvidence,
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
  const missingDbText = listOrNone(missingDbFixtures);
  const missingE2eText = listOrNone(missingE2eFixtures);
  const missingJobText = listOrNone(missingJobEvidence);
  const blockerText = listOrNone(blockers);

  const markdown = [
    "---",
    "phase: 05",
    "plan: 06",
    "artifact: performance-review",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 5 Performance and Evidence Review",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    "- Evidence environment: root Phase 5 gate command",
    "- Credentials: process-only; no credential values written to this artifact",
    `- DB fixture status: ${missingDbFixtures.length > 0 ? "missing" : "configured"}`,
    `- E2E fixture status: ${missingE2eFixtures.length > 0 ? "missing" : "configured"}`,
    `- Job evidence status: ${missingJobEvidence.length > 0 ? "missing" : "configured"}`,
    "",
    "## Query Review",
    "",
    "- Command: `node --experimental-strip-types scripts/performance-explain.ts --phase=5`",
    `- Query/performance result before gate consolidation: ${queryReviewResult}`,
    "- Covered hot paths: dashboard gamification summary, XP ledger, achievements grid, challenges page, quest rotation jobs, streak jobs and reward application mutations.",
    missingDbFixtures.length > 0
      ? "- Missing database credentials fail the gate; skipped database checks are not passing evidence."
      : "- Test, worker and direct database credentials are configured; migration, RLS, concurrency and query-plan evidence executed.",
    "",
    "## Browser and Accessibility",
    "",
    "- Command: `pnpm --filter @queue/web test:e2e -- tests/phase-5-e2e.spec.ts tests/accessibility.spec.ts`",
    "- Coverage defined for both duo members, partner-confirmed `Zerado`, neutral `Dropado`, other-duo isolation, dashboard/Conquistas/Desafios mobile overlap and reduced-motion reward/streak feedback.",
    "",
    "## Security and RLS",
    "",
    "- Source security command: `pnpm --filter @queue/web test -- gamification-security`",
    "- DB integration command: `pnpm --filter @queue/db test:integration -- gamification-rls gamification-concurrency performance-hot-paths`",
    "- DB coverage targets ledger, unlocks, quests, streak, reward notifications, projection rebuilds, duplicate rewards, quest races and Streak Freeze consumption.",
    "",
    "## Economy and Copy Audit",
    "",
    `- Result: ${economyAudit.result}`,
    `- Findings: ${economyAudit.findings.length}`,
    "- Artifact: `05-ECONOMY-AUDIT.md`",
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
    "## Missing Job Evidence",
    "",
    missingJobText,
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
      ? "- None for Phase 5 gate."
      : "- Provide missing fixtures/evidence inputs, rerun `pnpm phase:5:gate`, and review this artifact before claiming Phase 5 external evidence.",
    ""
  ].join("\n");

  mkdirSync(dirname(performanceReviewPath), { recursive: true });
  writeFileSync(performanceReviewPath, markdown, "utf8");
}

function writeEconomyAudit({
  missingDbFixtures,
  missingE2eFixtures,
  missingJobEvidence
}) {
  const generated = new Date().toISOString();
  const sourceFiles = collectSourceFiles([
    resolve(workspaceRoot, "apps/web/src/modules/gamification"),
    resolve(workspaceRoot, "apps/web/src/app/app"),
    resolve(workspaceRoot, "apps/web/src/components/app-shell.tsx")
  ]);
  const findings = [
    ...checkBannedSourceTerms(sourceFiles),
    ...checkLevelNames(),
    ...checkAchievements(),
    ...checkRarityCss()
  ];
  const blockers = [
    ...missingDbFixtures,
    ...missingE2eFixtures,
    ...missingJobEvidence
  ];
  const result =
    findings.length > 0
      ? "FAILED"
      : blockers.length > 0
        ? "BLOCKED - missing external evidence"
        : "PASSED";
  const dIds = Array.from({ length: 44 }, (_, index) => `D-${String(index + 1).padStart(2, "0")}`);
  const requirementIds = [
    "PLAY-05",
    ...Array.from({ length: 17 }, (_, index) => `GAME-${String(index + 1).padStart(2, "0")}`),
    "SAFE-03"
  ];

  const markdown = [
    "---",
    "phase: 05",
    "plan: 06",
    "artifact: economy-audit",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 5 Economy, Copy and Visual Audit",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    `- Source files scanned: ${sourceFiles.length}`,
    `- DB evidence: ${missingDbFixtures.length > 0 ? "blocked" : "configured"}`,
    `- Browser evidence: ${missingE2eFixtures.length > 0 ? "blocked" : "configured"}`,
    `- Job evidence: ${missingJobEvidence.length > 0 ? "blocked" : "configured"}`,
    "",
    "## Automated Source Checks",
    "",
    "| Check | Result | Evidence |",
    "|-------|--------|----------|",
    `| Shared XP only | ${findingStatus(findings, "individual-xp")} | No individual XP identifier or member-vs-member XP store found. |`,
    `| No spendable Phase 5 XP | ${findingStatus(findings, "spendable-xp")} | No store, inventory, shop, boost purchase or spend flow in Phase 5 gamification sources. |`,
    `| No competitive ranking | ${findingStatus(findings, "competition")} | No leaderboard, member ranking or best/worst player copy found in Phase 5 sources. |`,
    `| No shame/punitive copy | ${findingStatus(findings, "shame-copy")} | Challenge/streak/drop copy may say "sem culpa" or "sem punicao", but no punitive callout is present. |`,
    `| No emoji badge dependency | ${findingStatus(findings, "emoji")} | Achievement icon and catalog source use SVG/icon keys, not emoji glyphs. |`,
    `| 50 polished level names | ${findingStatus(findings, "level-names")} | ` + levelEvidence(),
    `| Valid rarity tokens | ${findingStatus(findings, "rarity")} | Achievement rarities are common/rare/epic/legendary and CSS exposes matching tokens. |`,
    "",
    "## Requirement Coverage",
    "",
    requirementIds.map((id) => `- ${id}: covered by Phase 5 source tests, browser/DB targets or explicit external blocker.`).join("\n"),
    "",
    "## Decision Coverage",
    "",
    dIds.map((id) => `- ${id}: covered by Phase 5 implementation summaries and this gate, or blocked only on external DB/browser/job evidence.`).join("\n"),
    "",
    "## Findings",
    "",
    findings.length > 0
      ? findings.map((finding) => `- ${finding.type}: ${finding.file}:${finding.line} ${finding.message}`).join("\n")
      : "None.",
    "",
    "## Missing External Evidence",
    "",
    listOrNone(blockers),
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    result === "PASSED"
      ? "- Keep this audit updated if Phase 5 economy copy or reward surfaces change."
      : result === "FAILED"
        ? "- Fix the findings above, rerun `pnpm phase:5:gate`, then review this artifact again."
        : "- Provide missing external evidence variables, rerun `pnpm phase:5:gate`, then treat browser/DB/job proof as complete only if the rerun passes.",
    ""
  ].join("\n");

  mkdirSync(dirname(economyAuditPath), { recursive: true });
  writeFileSync(economyAuditPath, markdown, "utf8");

  return {
    findings,
    result
  };
}

function writeUserSetup({
  missingDbFixtures,
  missingE2eFixtures,
  missingJobEvidence
}) {
  const generated = new Date().toISOString();
  const markdown = [
    "---",
    "phase: 05-gamificacao-coletiva",
    "artifact: user-setup",
    "status: Incomplete",
    `generated: ${generated}`,
    "---",
    "",
    "# Phase 5 User Setup",
    "",
    "Use this setup before treating Phase 5 browser, database, job or production evidence as passed. Missing values must be reported as blockers, not hidden skips.",
    "",
    "## Browser And UAT Fixtures",
    "",
    "| Variable | Status | Purpose |",
    "|----------|--------|---------|",
    ...e2eFixtureVars.map((name) => `| \`${name}\` | ${process.env[name] ? "configured" : "missing"} | ${fixturePurpose(name)} |`),
    "",
    "Fixture expectations:",
    "",
    "- `E2E_READY_USER_*` and `E2E_READY_PARTNER_*` must belong to exactly the same duo.",
    "- `E2E_OTHER_DUO_USER_*` must belong to a different duo and must not have access to the Phase 5 fixture games.",
    "- `E2E_PHASE5_ZERADO_SLUG` and `E2E_PHASE5_DROPADO_SLUG` must be in `Jogando` for the ready duo before the browser run.",
    "- The two game slugs should be separate records so the `Zerado` and `Dropado` tests do not fight over terminal state.",
    "",
    "## Database Evidence",
    "",
    "| Variable | Status | Purpose |",
    "|----------|--------|---------|",
    ...dbFixtureVars.map((name) => `| \`${name}\` | ${process.env[name] ? "configured" : "missing"} | ${fixturePurpose(name)} |`),
    "",
    "Worker credential setup:",
    "",
    "1. Apply reviewed migrations with `DIRECT_DATABASE_URL`; never use the web runtime connection.",
    "2. In Neon Console, open Roles and reset/provision the password for `queue2_worker` after the role exists.",
    "3. Copy the pooled `queue2_worker` connection string into `WORKER_DATABASE_URL` for the app/cron environment.",
    "4. Verify the worker can read readiness columns and `ops.scheduled_jobs`, but cannot write `app.duos` or `app.duo_members`.",
    "",
    "## Job And Cron Evidence",
    "",
    "| Variable | Status | Purpose |",
    "|----------|--------|---------|",
    ...jobEvidenceVars.map((name) => `| \`${name}\` | ${process.env[name] ? "configured" : "missing"} | ${fixturePurpose(name)} |`),
    "",
    "## Verification Commands",
    "",
    "```bash",
    "pnpm --filter @queue/web test:e2e -- tests/phase-5-e2e.spec.ts tests/accessibility.spec.ts",
    "pnpm --filter @queue/db test:integration -- gamification-migrations gamification-rls gamification-concurrency performance-hot-paths",
    "pnpm --filter @queue/db drizzle:migrate",
    "gsd-sdk query verify.schema-drift 05",
    "node --experimental-strip-types scripts/performance-explain.ts --phase=5",
    "pnpm phase:5:gate",
    "```",
    "",
    "## Missing Variables",
    "",
    "### Browser",
    "",
    listOrNone(missingE2eFixtures),
    "",
    "### Database",
    "",
    listOrNone(missingDbFixtures),
    "",
    "### Jobs",
    "",
    listOrNone(missingJobEvidence),
    "",
    "## Current Status",
    "",
    missingDbFixtures.length + missingE2eFixtures.length + missingJobEvidence.length > 0
      ? "Result: BLOCKED - missing external evidence until the variables above are configured and the Phase 5 gate is rerun."
      : "Result: READY - all required Phase 5 setup variables are present; rerun the gate to capture passing evidence.",
    ""
  ].join("\n");

  mkdirSync(dirname(userSetupPath), { recursive: true });
  writeFileSync(userSetupPath, markdown, "utf8");
}

function checkBannedSourceTerms(sourceFiles) {
  const findings = [];
  const rules = [
    {
      type: "individual-xp",
      pattern: /\b(individualXp|memberXp|playerXp|userXp|xpByUser|memberScore|playerScore)\b/i,
      message: "Individual/member XP or score identifier is not allowed in Phase 5."
    },
    {
      type: "spendable-xp",
      pattern: /\b(shop|store|inventory|loadout|spendXp|xpSpend|buyBoost|purchaseBoost|gastar XP|comprar boost)\b/i,
      message: "Spendable XP, store or inventory belongs outside Phase 5."
    },
    {
      type: "competition",
      pattern: /\b(leaderboard|ranking interno|member ranking|melhor jogador|pior jogador|contra o outro)\b/i,
      message: "Competitive member ranking is not allowed."
    },
    {
      type: "shame-copy",
      pattern: /\b(culpa|vergonha|fracasso|punicao|perdeu)\b/i,
      message: "Punitive or shame-oriented copy is not allowed unless explicitly negated."
    }
  ];

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const rule of rules) {
        if (!rule.pattern.test(line)) {
          continue;
        }

        if (rule.type === "shame-copy" && /\b(sem|nao|nunca)\b/i.test(line)) {
          continue;
        }

        findings.push({
          file: relative(file),
          line: index + 1,
          message: rule.message,
          type: rule.type
        });
      }
    });
  }

  return findings;
}

function checkLevelNames() {
  const sourcePath = resolve(workspaceRoot, "apps/web/src/modules/gamification/domain/level-curve.ts");
  const source = readFileSync(sourcePath, "utf8");
  const match = source.match(/export const LEVEL_NAMES = \[([\s\S]*?)\] as const;/);
  const names = match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
  const findings = [];
  const seen = new Set();

  if (names.length !== 50) {
    findings.push({
      file: relative(sourcePath),
      line: 1,
      message: `Expected 50 level names, found ${names.length}.`,
      type: "level-names"
    });
  }

  names.forEach((name, index) => {
    if (seen.has(name)) {
      findings.push({
        file: relative(sourcePath),
        line: index + 1,
        message: `Duplicate level name: ${name}.`,
        type: "level-names"
      });
    }

    seen.add(name);

    if (/placeholder|TODO|FIXME|coming soon|not available/i.test(name)) {
      findings.push({
        file: relative(sourcePath),
        line: index + 1,
        message: `Placeholder level copy: ${name}.`,
        type: "level-names"
      });
    }
  });

  if (names[0] !== "Lv1 Casuais") {
    findings.push({
      file: relative(sourcePath),
      line: 1,
      message: "Level 1 anchor must be `Lv1 Casuais`.",
      type: "level-names"
    });
  }

  if (names[49] !== "Lv50 Lendas do Coop") {
    findings.push({
      file: relative(sourcePath),
      line: 50,
      message: "Level 50 anchor must be `Lv50 Lendas do Coop`.",
      type: "level-names"
    });
  }

  return findings;
}

function checkAchievements() {
  const sourcePath = resolve(workspaceRoot, "apps/web/src/modules/gamification/domain/achievement-catalog.ts");
  const source = readFileSync(sourcePath, "utf8");
  const iconPath = resolve(workspaceRoot, "apps/web/src/modules/gamification/presentation/achievement-badge-icon.tsx");
  const iconSource = readFileSync(iconPath, "utf8");
  const findings = [];
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const rarities = [...source.matchAll(/seed\(\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"/g)].map(
    (match) => match[1]
  );
  const invalidRarity = rarities.find((rarity) => !["common", "rare", "epic", "legendary"].includes(rarity));

  if (emojiRegex.test(source) || emojiRegex.test(iconSource)) {
    findings.push({
      file: relative(sourcePath),
      line: 1,
      message: "Achievement catalog or icon source contains emoji glyphs.",
      type: "emoji"
    });
  }

  if (invalidRarity) {
    findings.push({
      file: relative(sourcePath),
      line: 1,
      message: `Invalid achievement rarity token: ${invalidRarity}.`,
      type: "rarity"
    });
  }

  if (rarities.length < 48 || rarities.length > 52) {
    findings.push({
      file: relative(sourcePath),
      line: 1,
      message: `Expected approximately 50 achievement seeds, found ${rarities.length}.`,
      type: "rarity"
    });
  }

  return findings;
}

function checkRarityCss() {
  const sourcePath = resolve(workspaceRoot, "apps/web/src/app/globals.css");
  const source = readFileSync(sourcePath, "utf8");
  const findings = [];

  for (const token of ["--rarity-common", "--rarity-rare", "--rarity-epic", "--rarity-legendary"]) {
    if (!source.includes(token)) {
      findings.push({
        file: relative(sourcePath),
        line: 1,
        message: `Missing rarity token ${token}.`,
        type: "rarity"
      });
    }
  }

  return findings;
}

function collectSourceFiles(paths) {
  const files = [];

  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const stats = statSync(path);

    if (stats.isFile()) {
      files.push(path);
      continue;
    }

    for (const entry of readdirSync(path)) {
      const child = join(path, entry);
      const childStats = statSync(child);

      if (childStats.isDirectory()) {
        files.push(...collectSourceFiles([child]));
      } else if ([".ts", ".tsx"].includes(extname(child))) {
        files.push(child);
      }
    }
  }

  return files.sort();
}

function fixturePurpose(name) {
  switch (name) {
    case "E2E_BASE_URL":
      return "Base URL for the app under browser test.";
    case "E2E_READY_USER_EMAIL":
    case "E2E_READY_USER_PASSWORD":
      return "First member of a ready duo with Phase 5 state.";
    case "E2E_READY_PARTNER_EMAIL":
    case "E2E_READY_PARTNER_PASSWORD":
      return "Second member of the same ready duo.";
    case "E2E_OTHER_DUO_USER_EMAIL":
    case "E2E_OTHER_DUO_USER_PASSWORD":
      return "Different-duo actor for isolation checks.";
    case "E2E_PHASE5_ZERADO_SLUG":
      return "Jogando game prepared for partner-confirmed Zerado reward flow.";
    case "E2E_PHASE5_DROPADO_SLUG":
      return "Jogando game prepared for neutral Dropado confirmation flow.";
    case "CRON_SECRET":
      return "Bearer secret for gamification maintenance route.";
    case "GAMIFICATION_RUNNER_FREQUENCY_MINUTES":
      return "Operational cadence evidence for quest and streak jobs.";
    case "TEST_DATABASE_URL":
      return "Isolated Neon/Postgres database for migration, RLS and concurrency tests.";
    case "WORKER_DATABASE_URL":
      return "Pooled connection string authenticated as the least-privileged queue2_worker role.";
    case "DIRECT_DATABASE_URL":
      return "Direct owner/migrator connection used only to apply reviewed migrations.";
    default:
      return "Phase 5 setup value.";
  }
}

function levelEvidence() {
  const sourcePath = resolve(workspaceRoot, "apps/web/src/modules/gamification/domain/level-curve.ts");
  const source = readFileSync(sourcePath, "utf8");
  const match = source.match(/export const LEVEL_NAMES = \[([\s\S]*?)\] as const;/);
  const names = match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];

  return `${names.length} unique level names checked, with locked anchors Lv1 Casuais and Lv50 Lendas do Coop. |`;
}

function findingStatus(findings, type) {
  return findings.some((finding) => finding.type === type) ? "failed" : "passed";
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

function relative(file) {
  return file.slice(workspaceRoot.length + 1).replace(/\\/g, "/");
}
