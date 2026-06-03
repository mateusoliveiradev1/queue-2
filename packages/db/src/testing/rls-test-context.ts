import { randomUUID } from "node:crypto";

import type pg from "pg";

export type TestDuo = {
  ownerUserId: string;
  duoId: string;
  pairingCode: string;
};

export type RuntimeClient = pg.PoolClient;

export function makeTestUserId(label: string): string {
  return `${label}-${randomUUID()}`;
}

export function makePairingCode(): string {
  return randomUUID().replace(/[^A-HJ-NP-Z2-9]/gi, "").toUpperCase().padEnd(6, "Q").slice(0, 6);
}

export async function withRuntimeUser<T>(
  pool: pg.Pool,
  userId: string,
  callback: (client: RuntimeClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE queue2_app_runtime");
    await client.query("select set_config('queue2.user_id', $1, true)", [userId]);
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

export async function insertAuthUser(pool: pg.Pool, userId: string): Promise<void> {
  await pool.query(
    `
      INSERT INTO auth."user" (id, name, email, email_verified)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (id) DO NOTHING
    `,
    [userId, userId, `${userId}@queue2.test`]
  );
}

export async function createDuoWithPairingCode(pool: pg.Pool, ownerUserId: string, pairingCode = makePairingCode()): Promise<TestDuo> {
  await insertAuthUser(pool, ownerUserId);

  const rows = await withRuntimeUser(pool, ownerUserId, async (client) => {
    const result = await client.query<{ duo_id: string }>(
      `
        SELECT duo_id
        FROM app.create_duo_with_pairing_code($1, $2, $3, now() + interval '24 hours', $4)
      `,
      [ownerUserId, "Dupla Teste", pairingCode, "America/Sao_Paulo"]
    );

    return result.rows;
  });

  const created = rows[0];

  if (!created) {
    throw new Error("create_duo_with_pairing_code returned no duo.");
  }

  return {
    ownerUserId,
    duoId: created.duo_id,
    pairingCode
  };
}

export async function claimPairingCode(pool: pg.Pool, claimantUserId: string, pairingCode: string): Promise<string> {
  await insertAuthUser(pool, claimantUserId);

  return withRuntimeUser(pool, claimantUserId, async (client) => {
    const result = await client.query<{ duo_id: string }>("SELECT app.claim_pairing_code($1, $2) AS duo_id", [
      pairingCode,
      claimantUserId
    ]);
    const claimed = result.rows[0];

    if (!claimed) {
      throw new Error("claim_pairing_code returned no duo.");
    }

    return claimed.duo_id;
  });
}

export async function visibleDuoIds(pool: pg.Pool, userId: string): Promise<string[]> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ id: string }>("SELECT id FROM app.duos ORDER BY created_at, id");
    return result.rows.map((row) => row.id);
  });
}

export async function duoMemberCount(pool: pg.Pool, userId: string, duoId: string): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>("SELECT count(*) AS count FROM app.duo_members WHERE duo_id = $1", [duoId]);
    return Number(result.rows[0]?.count ?? 0);
  });
}
