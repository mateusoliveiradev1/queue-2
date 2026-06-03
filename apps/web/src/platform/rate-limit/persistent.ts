import "server-only";

import { randomUUID } from "node:crypto";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbPool
} from "@queue/db";

export const PAIRING_RATE_LIMIT_POLICY = {
  limit: 5,
  windowSeconds: 5 * 60,
  warningAt: 3,
  storage: "database"
} as const;

let runtimePool: QueueDbPool | undefined;

export type PersistentRateLimitResult = {
  blocked: boolean;
  attemptsRemaining: number;
  retryAfterSeconds: number;
};

export const persistentPairingAttemptLimiter = {
  consume: consumePairingAttempt
};

export async function consumePairingAttempt(
  userId: string,
  pool: QueueDbPool = getRuntimePool()
): Promise<PersistentRateLimitResult> {
  const key = `duo:pairing-attempt:${userId}`;

  return withAppUserTransaction(pool, userId, async (client) => {
    const result = await client.query<{ count: number; last_request: string }>(
      `
        WITH request_clock AS (
          SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS requested_at_ms
        )
        INSERT INTO auth.rate_limit (id, key, count, last_request)
        SELECT $1, $2, 1, request_clock.requested_at_ms
        FROM request_clock
        ON CONFLICT (key) DO UPDATE
        SET count = CASE
              WHEN auth.rate_limit.last_request < excluded.last_request - ($3::bigint * 1000)
                THEN 1
              ELSE auth.rate_limit.count + 1
            END,
            last_request = excluded.last_request
        RETURNING count, last_request::text
      `,
      [randomUUID(), key, PAIRING_RATE_LIMIT_POLICY.windowSeconds]
    );
    const row = result.rows[0];
    const count = row?.count ?? 1;
    const lastRequestMs = row
      ? Number.parseInt(row.last_request, 10)
      : Date.now();
    const elapsedSeconds = row
      ? Math.max(0, Math.floor((Date.now() - lastRequestMs) / 1000))
      : 0;

    return {
      blocked: count > PAIRING_RATE_LIMIT_POLICY.limit,
      attemptsRemaining: Math.max(0, PAIRING_RATE_LIMIT_POLICY.limit - count),
      retryAfterSeconds: Math.max(
        0,
        PAIRING_RATE_LIMIT_POLICY.windowSeconds - elapsedSeconds
      )
    };
  });
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}
