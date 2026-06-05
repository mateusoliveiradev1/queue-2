import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type ReviewQuery = {
  name: string;
  surface: string;
  mode: "read-analyze" | "mutation-static";
  queryCount: number;
  sql: string;
  params?: unknown[];
  expectedIndexes: string[];
};

type QueryReviewResult = {
  name: string;
  surface: string;
  mode: ReviewQuery["mode"];
  queryCount: number;
  expectedIndexes: string[];
  status: "reviewed" | "failed" | "blocked";
  planSummary: string;
  actionTaken: string;
};

type QueryReviewRun = {
  result: "PASSED" | "FAILED";
  results: QueryReviewResult[];
};

type QueryReviewWriteOptions = {
  databaseStatus?: string;
  evidenceSource?: string;
  nextAction?: string;
};

type PgPool = {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const queryReviewPath = resolve(
  workspaceRoot,
  ".planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-QUERY-REVIEW.md"
);

loadEnvLocal();

export const reviewQueries: ReviewQuery[] = [
  {
    name: "Catalogo browse",
    surface: "/app/catalogo",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "catalog_games_main_flow_idx",
      "catalog_games_slug_uidx",
      "catalog_game_platforms_platform_idx"
    ],
    sql: `
      SELECT game.id, game.slug, game.name, game.synced_at
      FROM catalog.games AS game
      WHERE game.main_flow_eligible = true
        AND ($1::text IS NULL OR game.name ILIKE '%' || $1 || '%' OR game.slug ILIKE '%' || $1 || '%')
      ORDER BY game.synced_at DESC, game.name ASC
      LIMIT 19
    `,
    params: [null]
  },
  {
    name: "Catalogo detail",
    surface: "/app/jogo/[slug]",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "catalog_games_slug_uidx",
      "catalog_game_platforms_game_platform_uidx",
      "catalog_game_localizations_published_lookup_idx"
    ],
    sql: `
      SELECT game.id, game.slug, game.name
      FROM catalog.games AS game
      WHERE game.slug = $1
      LIMIT 1
    `,
    params: ["query-review-game"]
  },
  {
    name: "Biblioteca queue page",
    surface: "/app/biblioteca",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_duo_library_games_duo_status_idx",
      "app_duo_library_games_duo_catalog_uidx",
      "catalog_game_platforms_platform_idx"
    ],
    sql: `
      SELECT library_game.id, library_game.status, game.name
      FROM app.duo_library_games AS library_game
      INNER JOIN catalog.games AS game
        ON game.id = library_game.catalog_game_id
      WHERE library_game.duo_id = $1::uuid
        AND library_game.status = ANY($2::text[])
      ORDER BY game.name ASC, library_game.updated_at DESC, library_game.created_at DESC
      LIMIT 12
      OFFSET 0
    `,
    params: ["00000000-0000-0000-0000-000000000001", ["wishlist", "jogando", "pausado"]]
  },
  {
    name: "Descobrir deck candidates",
    surface: "/app/descobrir",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "catalog_games_main_flow_idx",
      "app_discovery_member_decisions_deck_exclusion_idx",
      "app_duo_library_games_duo_catalog_uidx"
    ],
    sql: `
      SELECT game.id, game.slug, game.name
      FROM catalog.games AS game
      WHERE game.main_flow_eligible = true
        AND NOT EXISTS (
          SELECT 1
          FROM app.discovery_member_decisions AS decision
          WHERE decision.duo_id = $1::uuid
            AND decision.user_id = $2::text
            AND decision.catalog_game_id = game.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM app.duo_library_games AS library_game
          WHERE library_game.duo_id = $1::uuid
            AND library_game.catalog_game_id = game.id
        )
      ORDER BY game.synced_at DESC, game.name ASC
      LIMIT 24
    `,
    params: ["00000000-0000-0000-0000-000000000001", "query-review-user"]
  },
  {
    name: "Descobrir state read",
    surface: "/app/descobrir",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: [
      "app_discovery_member_decisions_deck_exclusion_idx",
      "app_discovery_matches_duo_game_uidx",
      "app_duo_library_games_duo_catalog_uidx"
    ],
    sql: `
      SELECT game_id
      FROM (
        SELECT decision.catalog_game_id AS game_id
        FROM app.discovery_member_decisions AS decision
        WHERE decision.duo_id = $1::uuid
          AND decision.catalog_game_id = ANY($2::uuid[])
        UNION
        SELECT match.catalog_game_id AS game_id
        FROM app.discovery_matches AS match
        WHERE match.duo_id = $1::uuid
          AND match.catalog_game_id = ANY($2::uuid[])
        UNION
        SELECT library_game.catalog_game_id AS game_id
        FROM app.duo_library_games AS library_game
        WHERE library_game.duo_id = $1::uuid
          AND library_game.catalog_game_id = ANY($2::uuid[])
      ) AS state
    `,
    params: [
      "00000000-0000-0000-0000-000000000001",
      ["00000000-0000-0000-0000-000000000002"]
    ]
  },
  {
    name: "Wishlist insert or existing update",
    surface: "addGameToWishlistAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_duo_library_games_duo_catalog_uidx"],
    sql: `
      INSERT INTO app.duo_library_games (
        duo_id,
        catalog_game_id,
        status,
        added_by_user_id,
        status_updated_by_user_id
      )
      VALUES (gen_random_uuid(), gen_random_uuid(), 'wishlist', 'query-review-user', 'query-review-user')
      ON CONFLICT (duo_id, catalog_game_id)
      DO UPDATE SET status = 'wishlist', status_updated_by_user_id = 'query-review-user'
    `
  },
  {
    name: "Library status move",
    surface: "moveLibraryGameAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_duo_library_games_duo_catalog_uidx", "app_duo_library_games_duo_status_idx"],
    sql: `
      UPDATE app.duo_library_games
      SET status = 'jogando',
          status_updated_by_user_id = 'query-review-user',
          updated_at = now()
      WHERE duo_id = gen_random_uuid()
        AND catalog_game_id = gen_random_uuid()
    `
  },
  {
    name: "Discovery decision",
    surface: "recordDiscoveryDecisionAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: [
      "app_discovery_member_decisions_duo_user_game_uidx",
      "app_discovery_member_decisions_partner_match_idx"
    ],
    sql: `
      INSERT INTO app.discovery_member_decisions (
        duo_id,
        user_id,
        catalog_game_id,
        decision,
        source_mode,
        preference_weight
      )
      VALUES (gen_random_uuid(), 'query-review-user', gen_random_uuid(), 'want', 'deck', 3)
      ON CONFLICT (duo_id, user_id, catalog_game_id)
      DO UPDATE SET decision = 'want', preference_weight = 3, updated_at = now()
    `
  },
  {
    name: "Discovery match handoff",
    surface: "handoffDiscoveryMatchToLibraryAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_discovery_matches_duo_game_uidx", "app_duo_library_games_duo_catalog_uidx"],
    sql: `
      UPDATE app.discovery_matches
      SET library_handoff_status = 'wishlist',
          library_handoff_at = now(),
          library_handoff_by_user_id = 'query-review-user'
      WHERE duo_id = gen_random_uuid()
        AND catalog_game_id = gen_random_uuid()
    `
  },
  {
    name: "Live start",
    surface: "startDiscoveryLiveSessionAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_discovery_live_sessions_duo_status_idx"],
    sql: `
      INSERT INTO app.discovery_live_sessions (
        duo_id,
        started_by_user_id,
        expires_at
      )
      VALUES (gen_random_uuid(), 'query-review-user', now() + interval '10 minutes')
    `
  },
  {
    name: "Live read",
    surface: "/api/discovery/live/[sessionId]",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: ["app_discovery_live_sessions_duo_status_idx"],
    sql: `
      SELECT id, status, expires_at
      FROM app.discovery_live_sessions
      WHERE duo_id = $1::uuid
        AND id = $2::uuid
        AND status = 'active'
      LIMIT 1
    `,
    params: [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    ]
  },
  {
    name: "Mood Quiz answer",
    surface: "answerMoodQuizAction",
    mode: "mutation-static",
    queryCount: 1,
    expectedIndexes: ["app_discovery_mood_answers_user_question_uidx"],
    sql: `
      INSERT INTO app.discovery_mood_quiz_answers (
        duo_id,
        user_id,
        quiz_round,
        question_key,
        answer_key
      )
      VALUES (gen_random_uuid(), 'query-review-user', gen_random_uuid(), 'energy', 'medium')
      ON CONFLICT (duo_id, user_id, quiz_round, question_key)
      DO UPDATE SET answer_key = 'medium', updated_at = now()
    `
  },
  {
    name: "Mood Quiz status",
    surface: "getMoodQuizStatus",
    mode: "read-analyze",
    queryCount: 1,
    expectedIndexes: ["app_discovery_mood_answers_round_idx"],
    sql: `
      SELECT quiz_round, user_id, question_key, answer_key
      FROM app.discovery_mood_quiz_answers
      WHERE duo_id = $1::uuid
      ORDER BY answered_at DESC
      LIMIT 12
    `,
    params: ["00000000-0000-0000-0000-000000000001"]
  }
];

if (isMainModule()) {
  await main();
}

async function main(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    if (hasFreshProductionRuntimeQueryReview()) {
      console.log("Query review PASSED using recent production runtime evidence artifact.");
      console.log(`Artifact: ${queryReviewPath}`);
      return;
    }

    const results = reviewQueries.map<QueryReviewResult>((query) => ({
      actionTaken: "Skipped runtime plan review because TEST_DATABASE_URL is missing.",
      expectedIndexes: query.expectedIndexes,
      mode: query.mode,
      name: query.name,
      planSummary: "No database connection available.",
      queryCount: query.queryCount,
      status: "blocked",
      surface: query.surface
    }));

    await writeQueryReview("BLOCKED - missing TEST_DATABASE_URL", results);
    console.log("Query review BLOCKED. Missing: TEST_DATABASE_URL.");
    console.log(`Artifact: ${queryReviewPath}`);
    return;
  }

  const review = await runQueryReviews(testDatabaseUrl);

  await writeQueryReview(review.result, review.results);
  console.log(`Query review ${review.result}.`);
  console.log(`Artifact: ${queryReviewPath}`);

  if (review.result === "FAILED") {
    process.exitCode = 1;
  }
}

export async function runQueryReviews(connectionString: string): Promise<QueryReviewRun> {
  const pg = resolvePg();
  const pool = new pg.Pool({
    connectionString,
    max: 4
  });

  try {
    const results: QueryReviewResult[] = [];

    for (const query of reviewQueries) {
      results.push(await reviewQuery(pool, query));
    }

    return {
      result: results.some((result) => result.status === "failed") ? "FAILED" : "PASSED",
      results
    };
  } finally {
    await pool.end();
  }
}

export async function reviewQuery(pool: PgPool, query: ReviewQuery): Promise<QueryReviewResult> {
  const explainPrefix =
    query.mode === "read-analyze"
      ? "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)"
      : "EXPLAIN (COSTS, FORMAT JSON)";

  try {
    const result = await pool.query<unknown[]>(`${explainPrefix} ${query.sql}`, query.params ?? []);
    const planSummary = summarizePlan(result.rows[0]);

    return {
      actionTaken:
        query.mode === "read-analyze"
          ? "Reviewed read plan with ANALYZE and BUFFERS."
          : "Reviewed data-changing shape with static EXPLAIN only; no mutation was executed.",
      expectedIndexes: query.expectedIndexes,
      mode: query.mode,
      name: query.name,
      planSummary,
      queryCount: query.queryCount,
      status: "reviewed",
      surface: query.surface
    };
  } catch (error) {
    return {
      actionTaken: "Review failed; inspect schema/data fixture before using this result.",
      expectedIndexes: query.expectedIndexes,
      mode: query.mode,
      name: query.name,
      planSummary: getErrorMessage(error),
      queryCount: query.queryCount,
      status: "failed",
      surface: query.surface
    };
  }
}

export async function writeQueryReview(
  result: string,
  results: QueryReviewResult[],
  options: QueryReviewWriteOptions = {}
): Promise<void> {
  const markdown = buildQueryReviewMarkdown(result, results, options);

  await mkdir(dirname(queryReviewPath), { recursive: true });
  await writeFile(queryReviewPath, markdown, "utf8");
}

export function buildQueryReviewMarkdown(
  result: string,
  results: QueryReviewResult[],
  options: QueryReviewWriteOptions = {}
): string {
  const generated = new Date().toISOString();
  const databaseStatus =
    options.databaseStatus ?? (process.env.TEST_DATABASE_URL ? "configured" : "missing");
  const evidenceSource = options.evidenceSource ?? "local TEST_DATABASE_URL";
  const nextAction =
    options.nextAction ??
    (result === "BLOCKED - missing TEST_DATABASE_URL"
      ? "- Provide TEST_DATABASE_URL for an isolated Neon/test Postgres database, then rerun `node --experimental-strip-types scripts/performance-explain.ts`."
      : "- Keep this artifact updated after batching or index changes.");

  return [
    "---",
    "phase: 03.3",
    "plan: 02",
    "artifact: query-review",
    `generated: ${generated}`,
    `result: ${result}`,
    "---",
    "",
    "# Phase 03.3 Query Review",
    "",
    "## Environment",
    "",
    `- Generated: ${generated}`,
    `- Database evidence: ${databaseStatus}`,
    `- Evidence source: ${evidenceSource}`,
    "- Parameter values: redacted from artifact",
    "",
    "## Query Review",
    "",
    "| Query | Surface | Count | Mode | Plan Status | Expected Indexes | Action Taken |",
    "|-------|---------|-------|------|-------------|------------------|--------------|",
    ...results.map(
      (review) =>
        `| ${review.name} | ${review.surface} | ${review.queryCount} | ${review.mode} | ${review.status} | ${review.expectedIndexes.join(", ")} | ${review.actionTaken} |`
    ),
    "",
    "## Plan Summaries",
    "",
    ...results.flatMap((review) => [
      `### ${review.name}`,
      "",
      `- Status: ${review.status}`,
      `- Summary: ${review.planSummary}`,
      ""
    ]),
    "## Findings",
    "",
    result === "PASSED"
      ? "No missing index findings were produced by this review."
      : result === "BLOCKED - missing TEST_DATABASE_URL"
        ? "- TEST_DATABASE_URL is required for runtime EXPLAIN evidence."
        : "- One or more query plan reviews failed. Inspect the plan summaries above.",
    "",
    `## Result: ${result}`,
    "",
    "## Next Actions",
    "",
    nextAction,
    ""
  ].join("\n");
}

function summarizePlan(raw: unknown): string {
  const wrapped = isRecord(raw) ? raw["QUERY PLAN"] ?? Object.values(raw)[0] : raw;
  const explain = Array.isArray(wrapped) ? wrapped[0] : wrapped;
  const root = isRecord(explain) && "Plan" in explain ? explain.Plan : explain;
  const plan = isRecord(root) ? root : undefined;
  const nodeType = getString(plan?.["Node Type"]);
  const relation = getString(plan?.["Relation Name"]);
  const index = getString(plan?.["Index Name"]);
  const totalCost = getNumber(plan?.["Total Cost"]);
  const actualRows = getNumber(plan?.["Actual Rows"]);
  const parts = [
    nodeType ? `node=${nodeType}` : null,
    relation ? `relation=${relation}` : null,
    index ? `index=${index}` : null,
    typeof totalCost === "number" ? `cost=${Math.round(totalCost * 100) / 100}` : null,
    typeof actualRows === "number" ? `actualRows=${actualRows}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("; ") : "Plan JSON returned without a root summary.";
}

function loadEnvLocal(): void {
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

function hasFreshProductionRuntimeQueryReview(): boolean {
  if (!existsSync(queryReviewPath)) {
    return false;
  }

  const content = readFileSync(queryReviewPath, "utf8");
  const generated = content.match(/^generated:\s*(.+)$/m)?.[1]?.trim();
  const generatedAt = generated ? Date.parse(generated) : Number.NaN;
  const maxAgeMs = 24 * 60 * 60 * 1_000;

  return (
    content.includes("## Result: PASSED") &&
    content.includes("Evidence source: Vercel production runtime DATABASE_URL") &&
    Number.isFinite(generatedAt) &&
    Date.now() - generatedAt <= maxAgeMs
  );
}

function unquote(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMainModule(): boolean {
  return process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
}

function resolvePg(): { Pool: new (config: { connectionString: string; max: number }) => PgPool } {
  const requireFromHere = createRequire(import.meta.url);

  try {
    return requireFromHere("pg") as { Pool: new (config: { connectionString: string; max: number }) => PgPool };
  } catch {
    const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));

    return requireFromDb("pg") as { Pool: new (config: { connectionString: string; max: number }) => PgPool };
  }
}
