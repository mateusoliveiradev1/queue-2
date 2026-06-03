#!/usr/bin/env node
import { createRuntimePool } from "../packages/db/src/client.ts";
import { createCatalogRepository } from "../apps/web/src/modules/catalog/infrastructure/catalog-repository.ts";
import {
  createCatalogSyncAudit,
  runCatalogSync,
  type CatalogSyncMode
} from "../apps/web/src/modules/catalog/infrastructure/catalog-sync.ts";
import { createRawgClient } from "../apps/web/src/modules/catalog/infrastructure/rawg-client.ts";

const mode = parseMode(process.argv.slice(2));
const pool = mode === "apply" ? createRuntimePool() : null;

try {
  const result = await runCatalogSync({
    mode,
    rawgClient: createRawgClient(),
    ...(pool
      ? {
          repository: createCatalogRepository(pool),
          audit: createCatalogSyncAudit(pool)
        }
      : {})
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool?.end();
}

function parseMode(args: string[]): CatalogSyncMode {
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;

  if (apply && args.includes("--dry-run")) {
    throw new Error("Use either --apply or --dry-run, not both.");
  }

  return dryRun ? "dry-run" : "apply";
}
