import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";
import {
  claimPairingCode,
  createDuoWithPairingCode,
  insertAuthUser,
  makeTestUserId,
  withRuntimeUser
} from "../src/testing/rls-test-context";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("gamification database-backed concurrency invariants", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const migratedPool = await createMigratedIntegrationPool();

    if (!migratedPool) {
      throw new Error(missingTestDatabaseMessage);
    }

    pool = migratedPool;
  });

  afterAll(async () => {
    await pool.end();
  });

  test("replayed XP awards converge to a single ledger row", async () => {
    const duo = await createReadyDuo(pool, "game-xp-idempotency");
    const sourceId = randomUUID();
    const awardKey = `quest:${sourceId}`;

    const results = await Promise.allSettled([
      insertQuestXpAward(pool, duo.ownerUserId, duo.duoId, sourceId, awardKey),
      insertQuestXpAward(pool, duo.partnerUserId, duo.duoId, sourceId, awardKey)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(readXpAwardCount(pool, duo.ownerUserId, duo.duoId, awardKey)).resolves.toBe(1);
  });

  test("duplicate XP source ids converge even when replay keys differ", async () => {
    const duo = await createReadyDuo(pool, "game-xp-source-idempotency");
    const sourceId = randomUUID();

    const results = await Promise.allSettled([
      insertQuestXpAward(pool, duo.ownerUserId, duo.duoId, sourceId, `quest:${sourceId}:a`),
      insertQuestXpAward(pool, duo.partnerUserId, duo.duoId, sourceId, `quest:${sourceId}:b`)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(
      readXpAwardSourceCount(pool, duo.ownerUserId, duo.duoId, sourceId)
    ).resolves.toBe(1);
  });

  test("duplicate achievement unlock attempts converge to one unlock", async () => {
    const duo = await createReadyDuo(pool, "game-achievement-idempotency");
    const achievementSlug = await insertAchievementSeed(pool, "game-achievement-idempotency");
    const sourceId = randomUUID();

    const results = await Promise.allSettled([
      insertAchievementUnlock(pool, duo.ownerUserId, duo.duoId, achievementSlug, sourceId),
      insertAchievementUnlock(pool, duo.partnerUserId, duo.duoId, achievementSlug, sourceId)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(
      readAchievementUnlockCount(pool, duo.ownerUserId, duo.duoId, achievementSlug)
    ).resolves.toBe(1);
  });

  test("duplicate quest rotations converge to one cycle window", async () => {
    const duo = await createReadyDuo(pool, "game-quest-idempotency");
    const questSlug = await insertQuestSeed(pool, "game-quest-idempotency");
    const cycleKey = "week:2026-06-01";

    const results = await Promise.allSettled([
      insertQuestCycle(pool, duo.ownerUserId, duo.duoId, questSlug, cycleKey),
      insertQuestCycle(pool, duo.partnerUserId, duo.duoId, questSlug, cycleKey)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(
      readQuestCycleCount(pool, duo.ownerUserId, duo.duoId, questSlug, cycleKey)
    ).resolves.toBe(1);
  });

  test("duplicate quest completion attempts converge to one progress row", async () => {
    const duo = await createReadyDuo(pool, "game-quest-progress-idempotency");
    const questSlug = await insertQuestSeed(pool, "game-quest-progress-idempotency");
    const questCycleId = await insertQuestCycleReturningId(
      pool,
      duo.ownerUserId,
      duo.duoId,
      questSlug,
      "week:2026-06-08"
    );
    const sourceId = randomUUID();

    const results = await Promise.allSettled([
      insertQuestProgress(pool, duo.ownerUserId, duo.duoId, questCycleId, sourceId),
      insertQuestProgress(pool, duo.partnerUserId, duo.duoId, questCycleId, sourceId)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(
      readQuestProgressCount(pool, duo.ownerUserId, duo.duoId, questCycleId)
    ).resolves.toBe(1);
  });

  test("concurrent Streak Freeze consumption spends at most one freeze", async () => {
    const duo = await createReadyDuo(pool, "game-freeze-idempotency");
    await insertStreakState(pool, duo.ownerUserId, duo.duoId, 1);
    const sourceId = randomUUID();

    const results = await Promise.allSettled([
      consumeFreeze(pool, duo.ownerUserId, duo.duoId, sourceId),
      consumeFreeze(pool, duo.partnerUserId, duo.duoId, sourceId)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    await expect(readAvailableFreezes(pool, duo.ownerUserId, duo.duoId)).resolves.toBe(0);
    await expect(readFreezeConsumptionCount(pool, duo.ownerUserId, duo.duoId, sourceId)).resolves.toBe(1);
  });
});

async function createReadyDuo(pool: pg.Pool, label: string) {
  const ownerUserId = makeTestUserId(`${label}-owner`);
  const partnerUserId = makeTestUserId(`${label}-partner`);
  const duo = await createDuoWithPairingCode(pool, ownerUserId);
  await insertAuthUser(pool, partnerUserId);
  await claimPairingCode(pool, partnerUserId, duo.pairingCode);

  return {
    ...duo,
    partnerUserId
  };
}

async function insertAchievementSeed(pool: pg.Pool, label: string): Promise<string> {
  const slug = `${label}-${randomUUID()}`;

  await pool.query(
    `
      INSERT INTO app.gamification_achievement_catalog (
        slug,
        group_key,
        rarity,
        visibility,
        title,
        description,
        icon_key,
        predicate
      )
      VALUES ($1, 'story', 'rare', 'visible', 'Primeira marca', 'A dupla registrou um marco real.', 'badge-story-first', '{}'::jsonb)
    `,
    [slug]
  );

  return slug;
}

async function insertQuestSeed(pool: pg.Pool, label: string): Promise<string> {
  const slug = `${label}-${randomUUID()}`;

  await pool.query(
    `
      INSERT INTO app.gamification_quest_templates (
        slug,
        quest_type,
        title,
        description,
        goal_value,
        xp_reward,
        eligibility,
        schedule_metadata
      )
      VALUES ($1, 'weekly', 'Sessao da semana', 'Confirmem uma sessao coop real.', 1, 80, '{}'::jsonb, '{}'::jsonb)
    `,
    [slug]
  );

  return slug;
}

async function insertQuestXpAward(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  sourceId: string,
  awardKey: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.duo_xp_awards (
          duo_id,
          award_key,
          source_type,
          source_id,
          amount,
          reason_code,
          awarded_by_user_id
        )
        VALUES ($1, $2, 'quest', $3, 80, 'quest-complete', $4)
        ON CONFLICT DO NOTHING
      `,
      [duoId, awardKey, sourceId, userId]
    );
  });
}

async function readXpAwardSourceCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  sourceId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.duo_xp_awards
        WHERE duo_id = $1
          AND source_type = 'quest'
          AND source_id = $2
      `,
      [duoId, sourceId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function insertAchievementUnlock(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  achievementSlug: string,
  sourceId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_achievement_unlocks (
          duo_id,
          achievement_slug,
          source_type,
          source_id,
          unlocked_by_user_id
        )
        VALUES ($1, $2, 'live-session', $3, $4)
        ON CONFLICT DO NOTHING
      `,
      [duoId, achievementSlug, sourceId, userId]
    );
  });
}

async function insertQuestCycle(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questSlug: string,
  cycleKey: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_quest_cycles (
          duo_id,
          quest_slug,
          quest_type,
          cycle_key,
          window_start_at,
          window_end_at,
          timezone
        )
        VALUES (
          $1,
          $2,
          'weekly',
          $3,
          '2026-06-01T04:00:00.000Z',
          '2026-06-08T04:00:00.000Z',
          'America/Sao_Paulo'
        )
        ON CONFLICT (duo_id, quest_slug, cycle_key) DO NOTHING
      `,
      [duoId, questSlug, cycleKey]
    );
  });
}

async function insertQuestCycleReturningId(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questSlug: string,
  cycleKey: string
): Promise<string> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO app.gamification_quest_cycles (
          duo_id,
          quest_slug,
          quest_type,
          cycle_key,
          window_start_at,
          window_end_at,
          timezone
        )
        VALUES (
          $1,
          $2,
          'weekly',
          $3,
          '2026-06-08T04:00:00.000Z',
          '2026-06-15T04:00:00.000Z',
          'America/Sao_Paulo'
        )
        ON CONFLICT (duo_id, quest_slug, cycle_key)
        DO UPDATE SET updated_at = now()
        RETURNING id
      `,
      [duoId, questSlug, cycleKey]
    );

    return result.rows[0]!.id;
  });
}

async function insertQuestProgress(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questCycleId: string,
  sourceId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_quest_progress (
          duo_id,
          quest_cycle_id,
          current_value,
          completed_at,
          last_source_type,
          last_source_id
        )
        VALUES ($1, $2, 1, now(), 'live-session', $3)
        ON CONFLICT (duo_id, quest_cycle_id)
        DO UPDATE SET
          current_value = GREATEST(app.gamification_quest_progress.current_value, EXCLUDED.current_value),
          completed_at = COALESCE(app.gamification_quest_progress.completed_at, EXCLUDED.completed_at),
          last_source_type = EXCLUDED.last_source_type,
          last_source_id = EXCLUDED.last_source_id,
          updated_at = now()
      `,
      [duoId, questCycleId, sourceId]
    );
  });
}

async function insertStreakState(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  availableFreezes: number
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_streak_state (
          duo_id,
          current_streak,
          longest_streak,
          available_freezes,
          last_activity_duo_day
        )
        VALUES ($1, 5, 5, $2, '2026-06-06')
      `,
      [duoId, availableFreezes]
    );
  });
}

async function consumeFreeze(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  sourceId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        WITH consumed AS (
          UPDATE app.gamification_streak_state
          SET available_freezes = available_freezes - 1,
              updated_at = now()
          WHERE duo_id = $1
            AND available_freezes > 0
          RETURNING duo_id
        )
        INSERT INTO app.gamification_streak_events (
          duo_id,
          event_key,
          event_type,
          duo_day,
          source_type,
          source_id,
          actor_user_id,
          delta_days,
          freeze_delta
        )
        SELECT duo_id, $2, 'freeze-consumed', '2026-06-07', 'streak', $3, $4, 0, -1
        FROM consumed
        ON CONFLICT DO NOTHING
      `,
      [duoId, `freeze-consumed:${sourceId}`, sourceId, userId]
    );
  });
}

async function readXpAwardCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  awardKey: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.duo_xp_awards
        WHERE duo_id = $1
          AND award_key = $2
      `,
      [duoId, awardKey]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readAchievementUnlockCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  achievementSlug: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.gamification_achievement_unlocks
        WHERE duo_id = $1
          AND achievement_slug = $2
      `,
      [duoId, achievementSlug]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readQuestCycleCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questSlug: string,
  cycleKey: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.gamification_quest_cycles
        WHERE duo_id = $1
          AND quest_slug = $2
          AND cycle_key = $3
      `,
      [duoId, questSlug, cycleKey]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readQuestProgressCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questCycleId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.gamification_quest_progress
        WHERE duo_id = $1
          AND quest_cycle_id = $2
      `,
      [duoId, questCycleId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function readAvailableFreezes(
  pool: pg.Pool,
  userId: string,
  duoId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ available_freezes: number }>(
      `
        SELECT available_freezes
        FROM app.gamification_streak_state
        WHERE duo_id = $1
      `,
      [duoId]
    );

    return Number(result.rows[0]?.available_freezes ?? 0);
  });
}

async function readFreezeConsumptionCount(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  sourceId: string
): Promise<number> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.gamification_streak_events
        WHERE duo_id = $1
          AND event_type = 'freeze-consumed'
          AND source_id = $2
      `,
      [duoId, sourceId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}
