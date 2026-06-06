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
});

type ReadyDuo = Awaited<ReturnType<typeof createReadyDuo>>;

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
        ON CONFLICT (duo_id, award_key) DO NOTHING
      `,
      [duoId, awardKey, sourceId, userId]
    );
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
        ON CONFLICT (duo_id, achievement_slug) DO NOTHING
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
