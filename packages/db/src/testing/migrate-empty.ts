import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Pool } = pg;

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(currentDir, "../migrations/0001_foundation.sql");

export const missingTestDatabaseMessage =
  "TEST_DATABASE_URL is not configured; skipping database integration tests. Use an isolated Neon test branch or local Postgres database.";

export function getTestDatabaseUrl(): string | undefined {
  return process.env.TEST_DATABASE_URL;
}

export function createIntegrationPool(connectionString: string): pg.Pool {
  return new Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000
  });
}

export async function applyFoundationMigration(pool: pg.Pool): Promise<void> {
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
}

export async function createMigratedIntegrationPool(): Promise<pg.Pool | undefined> {
  const connectionString = getTestDatabaseUrl();

  if (!connectionString) {
    console.warn(missingTestDatabaseMessage);
    return undefined;
  }

  const pool = createIntegrationPool(connectionString);
  await applyFoundationMigration(pool);
  return pool;
}
