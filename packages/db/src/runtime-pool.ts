import "server-only";

import pg from "pg";

const { Pool } = pg;

export type QueueRuntimePool = pg.Pool;

export function getRuntimeDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }

  return value;
}

export function createRuntimePool(
  connectionString = getRuntimeDatabaseUrl()
): QueueRuntimePool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000
  });
}
