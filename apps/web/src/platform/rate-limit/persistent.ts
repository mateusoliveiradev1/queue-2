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
    const result = await client.query<{ count: number; last_request: Date }>(
      `
        INSERT INTO auth.rate_limit (id, key, count, last_request)
        VALUES ($1, $2, 1, now())
        ON CONFLICT (key) DO UPDATE
        SET count = CASE
              WHEN auth.rate_limit.last_request < now() - make_interval(secs => $3::integer)
                THEN 1
              ELSE auth.rate_limit.count + 1
            END,
            last_request = now()
        RETURNING count, last_request
      `,
      [randomUUID(), key, PAIRING_RATE_LIMIT_POLICY.windowSeconds]
    );
    const row = result.rows[0];
    const count = row?.count ?? 1;
    const elapsedSeconds = row
      ? Math.floor((Date.now() - row.last_request.getTime()) / 1000)
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
