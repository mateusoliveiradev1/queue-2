import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import pg, { type PoolClient, type QueryResultRow } from "pg";

import * as schema from "./schema";

const { Pool } = pg;

export type QueueDbClient = PoolClient;
export type QueueDbPool = pg.Pool;

export function getRuntimeDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return requireEnv(env, "DATABASE_URL");
}

export function getDirectDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return requireEnv(env, "DIRECT_DATABASE_URL");
}

export function getTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.TEST_DATABASE_URL;
}

export function createRuntimePool(connectionString = getRuntimeDatabaseUrl()): QueueDbPool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000
  });
}

export function createDrizzleClient(pool: QueueDbPool) {
  return drizzle(pool, { schema });
}

export async function withAppUserTransaction<T>(
  pool: QueueDbPool,
  userId: string,
  callback: (client: QueueDbClient) => Promise<T>
): Promise<T> {
  if (!userId.trim()) {
    throw new Error("A non-empty userId is required for database authorization context.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await setTransactionUserId(client, userId);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setTransactionUserId(client: QueueDbClient, userId: string): Promise<void> {
  await client.query("select set_config('queue2.user_id', $1, true)", [userId]);
}

export async function queryAsAppUser<T extends QueryResultRow>(
  pool: QueueDbPool,
  userId: string,
  sql: string,
  values: unknown[] = []
): Promise<T[]> {
  return withAppUserTransaction(pool, userId, async (client) => {
    const result = await client.query<T>(sql, values);
    return result.rows;
  });
}

function requireEnv(env: NodeJS.ProcessEnv, name: "DATABASE_URL" | "DIRECT_DATABASE_URL"): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
