import "server-only";

import {
  createRuntimePool,
  type QueueDbPool
} from "@queue/db";

import type {
  CatalogCurationPatch,
  CatalogGameUpsertInput,
  CatalogRepository
} from "../application/ports.ts";
import { catalogRepository } from "./catalog-repository.ts";
import {
  catalogSyncAllowlist,
  type CatalogSyncAllowlistEntry
} from "./catalog-sync-allowlist.ts";
import {
  createRawgClient,
  type RawgClient
} from "./rawg-client.ts";

export type CatalogSyncMode = "dry-run" | "apply";

export type CatalogSyncItemOutcome = {
  slug: string;
  rawgRef: number | string;
  status: "planned" | "updated" | "failed";
  gameId: string | null;
  changes: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
};

export type CatalogSyncResult = {
  mode: CatalogSyncMode;
  dryRun: boolean;
  source: "RAWG";
  inputCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  items: CatalogSyncItemOutcome[];
};

export type CatalogSyncAudit = {
  startRun(input: {
    mode: CatalogSyncMode;
    inputCount: number;
    metadata: Record<string, unknown>;
  }): Promise<string>;
  recordItem(runId: string, item: CatalogSyncItemOutcome): Promise<void>;
  finishRun(runId: string, result: CatalogSyncResult): Promise<void>;
};

export async function runCatalogSync({
  mode,
  allowlist = catalogSyncAllowlist,
  rawgClient = createRawgClient(),
  repository = catalogRepository,
  audit,
  syncConcurrency = 4
}: {
  mode: CatalogSyncMode;
  allowlist?: CatalogSyncAllowlistEntry[];
  rawgClient?: RawgClient;
  repository?: CatalogRepository;
  audit?: CatalogSyncAudit;
  syncConcurrency?: number;
}): Promise<CatalogSyncResult> {
  const items: CatalogSyncItemOutcome[] = [];
  const concurrency = clampSyncConcurrency(syncConcurrency);
  const auditWriter = mode === "apply" ? (audit ?? createCatalogSyncAudit()) : null;
  const runId =
    auditWriter
      ? await auditWriter.startRun({
          mode,
          inputCount: allowlist.length,
          metadata: {
            allowlist: "catalogSyncAllowlist",
            version: 1
          }
        })
      : null;

  for (let index = 0; index < allowlist.length; index += concurrency) {
    const chunk = allowlist.slice(index, index + concurrency);
    const chunkItems = await Promise.all(
      chunk.map((entry) => syncAllowlistEntry({ entry, mode, rawgClient, repository }))
    );

    for (const item of chunkItems) {
      items.push(item);

      if (runId) {
        await auditWriter!.recordItem(runId, item);
      }
    }
  }

  const result = summarizeSync(mode, items);

  if (runId) {
    await auditWriter!.finishRun(runId, result);
  }

  return result;
}

export function createCatalogSyncAudit(pool: QueueDbPool = createRuntimePool()): CatalogSyncAudit {
  return {
    async startRun(input) {
      const result = await pool.query<{ id: string }>(
        `
          INSERT INTO ops.catalog_sync_runs (
            source,
            mode,
            dry_run,
            status,
            input_count,
            metadata
          )
          VALUES ('RAWG', $1, $2, 'running', $3, $4::jsonb)
          RETURNING id
        `,
        [
          input.mode,
          input.mode === "dry-run",
          input.inputCount,
          JSON.stringify(input.metadata)
        ]
      );

      return result.rows[0]!.id;
    },
    async recordItem(runId, item) {
      await pool.query(
        `
          INSERT INTO ops.catalog_sync_run_items (
            run_id,
            rawg_id,
            slug,
            status,
            game_id,
            changes,
            error_code,
            error_message,
            finished_at
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, now())
        `,
        [
          runId,
          typeof item.rawgRef === "number" ? item.rawgRef : null,
          item.slug,
          item.status,
          item.gameId,
          JSON.stringify(item.changes),
          item.errorCode,
          item.errorMessage
        ]
      );
    },
    async finishRun(runId, result) {
      await pool.query(
        `
          UPDATE ops.catalog_sync_runs
          SET status = $2,
              created_count = $3,
              updated_count = $4,
              skipped_count = $5,
              failed_count = $6,
              finished_at = now()
          WHERE id = $1
        `,
        [
          runId,
          result.failedCount > 0 ? "failed" : "completed",
          result.createdCount,
          result.updatedCount,
          result.skippedCount,
          result.failedCount
        ]
      );
    }
  };
}

async function syncAllowlistEntry({
  entry,
  mode,
  rawgClient,
  repository
}: {
  entry: CatalogSyncAllowlistEntry;
  mode: CatalogSyncMode;
  rawgClient: RawgClient;
  repository: CatalogRepository;
}): Promise<CatalogSyncItemOutcome> {
  try {
    const rawgGame = await rawgClient.getGame(entry.rawgRef);
    validateExpectedName(entry, rawgGame);
    const catalogGame = {
      ...rawgGame,
      slug: entry.slug
    };
    const changes = plannedChanges(catalogGame, entry.curation);

    if (mode === "dry-run") {
      return {
        slug: entry.slug,
        rawgRef: entry.rawgRef,
        status: "planned",
        gameId: null,
        changes,
        errorCode: null,
        errorMessage: null
      };
    }

    const gameId = await repository.syncRawgGame(catalogGame, entry.curation);

    return {
      slug: entry.slug,
      rawgRef: entry.rawgRef,
      status: "updated",
      gameId,
      changes,
      errorCode: null,
      errorMessage: null
    };
  } catch (error) {
    return {
      slug: entry.slug,
      rawgRef: entry.rawgRef,
      status: "failed",
      gameId: null,
      changes: {},
      errorCode: error instanceof Error ? error.name : "CatalogSyncError",
      errorMessage: redactErrorMessage(error)
    };
  }
}

function validateExpectedName(
  entry: CatalogSyncAllowlistEntry,
  input: CatalogGameUpsertInput
): void {
  if (normalizeComparableName(input.name) !== normalizeComparableName(entry.expectedName)) {
    throw new Error(
      `RAWG returned "${input.name}" for "${entry.rawgRef}", expected "${entry.expectedName}".`
    );
  }
}

function normalizeComparableName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function plannedChanges(
  input: CatalogGameUpsertInput,
  curation: CatalogCurationPatch
): Record<string, unknown> {
  return {
    rawgFacts: [
      "name",
      "slug",
      "description",
      "releasedAt",
      "backgroundImageUrl",
      "rawgUrl",
      "sourceUpdatedAt",
      "platforms",
      "genres"
    ],
    rawgId: input.rawgId,
    slug: input.slug,
    curation,
    preserves: ["publishedLocalizations", "timeEstimate", "availability"]
  };
}

function summarizeSync(mode: CatalogSyncMode, items: CatalogSyncItemOutcome[]): CatalogSyncResult {
  return {
    mode,
    dryRun: mode === "dry-run",
    source: "RAWG",
    inputCount: items.length,
    createdCount: 0,
    updatedCount: items.filter((item) => item.status === "updated").length,
    skippedCount: items.filter((item) => item.status === "planned").length,
    failedCount: items.filter((item) => item.status === "failed").length,
    items
  };
}

function clampSyncConcurrency(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    return 1;
  }

  return Math.min(6, value);
}

function redactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  return message
    .replace(/key=[^&\s]+/gi, "key=[redacted]")
    .replace(/RAWG_API_KEY=[^&\s]+/gi, "RAWG_API_KEY=[redacted]")
    .slice(0, 500);
}
