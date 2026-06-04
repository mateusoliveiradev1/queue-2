import "server-only";

import {
  createRuntimePool,
  type QueueDbPool
} from "@queue/db";

import { applyCatalogCurationSeeds, type CatalogCurationSeedResult } from "./catalog-curation-seeds.ts";
import { checkCatalogCurationHealth, type CatalogCurationHealth } from "./catalog-health.ts";
import { createCatalogRepository } from "./catalog-repository.ts";
import {
  createCatalogSyncAudit,
  runCatalogSync,
  type CatalogSyncResult
} from "./catalog-sync.ts";

export type CatalogRefreshSkippedSync = {
  source: "RAWG";
  status: "skipped";
  reason: "missing-rawg-api-key";
};

export type CatalogRefreshResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  sync: CatalogSyncResult | CatalogRefreshSkippedSync;
  seeds: CatalogCurationSeedResult;
  health: CatalogCurationHealth;
  warnings: string[];
};

export async function runCatalogRefresh({
  pool,
  requireRawgSync = true,
  rawgApiKey = process.env.RAWG_API_KEY,
  syncCatalog,
  applySeeds,
  checkHealth
}: {
  pool?: QueueDbPool;
  requireRawgSync?: boolean;
  rawgApiKey?: string;
  syncCatalog?: () => Promise<CatalogSyncResult>;
  applySeeds?: () => Promise<CatalogCurationSeedResult>;
  checkHealth?: () => Promise<CatalogCurationHealth>;
} = {}): Promise<CatalogRefreshResult> {
  const startedAt = new Date();
  const needsPool = !syncCatalog || !applySeeds || !checkHealth;
  const runtimePool = pool ?? (needsPool ? createRuntimePool() : undefined);
  const ownsPool = !pool && runtimePool !== undefined;

  try {
    const warnings: string[] = [];
    const hasRawgKey = Boolean(rawgApiKey?.trim());
    const sync =
      hasRawgKey
        ? await (syncCatalog ?? defaultSyncCatalog(runtimePool!))()
        : skippedRawgSync(warnings);
    const seeds = await (applySeeds ?? defaultApplySeeds(runtimePool!))();
    const health = await (checkHealth ?? defaultCheckHealth(runtimePool!))();
    const rawgOk = hasRawgKey || !requireRawgSync;
    const syncOk = "status" in sync ? rawgOk : sync.failedCount === 0;
    const seedsOk =
      seeds.localizations.missingSlugs.length === 0 &&
      seeds.availability.missingSlugs.length === 0;

    return {
      ok: rawgOk && syncOk && seedsOk && health.ok,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      sync,
      seeds,
      health,
      warnings
    };
  } finally {
    if (ownsPool) {
      await runtimePool.end();
    }
  }
}

function defaultSyncCatalog(pool: QueueDbPool): () => Promise<CatalogSyncResult> {
  return () =>
    runCatalogSync({
      mode: "apply",
      repository: createCatalogRepository(pool),
      audit: createCatalogSyncAudit(pool)
    });
}

function defaultApplySeeds(pool: QueueDbPool): () => Promise<CatalogCurationSeedResult> {
  return () => applyCatalogCurationSeeds({ pool });
}

function defaultCheckHealth(pool: QueueDbPool): () => Promise<CatalogCurationHealth> {
  return () => checkCatalogCurationHealth({ pool });
}

function skippedRawgSync(warnings: string[]): CatalogRefreshSkippedSync {
  warnings.push("RAWG_API_KEY is not configured; RAWG synchronization was skipped.");

  return {
    source: "RAWG",
    status: "skipped",
    reason: "missing-rawg-api-key"
  };
}
