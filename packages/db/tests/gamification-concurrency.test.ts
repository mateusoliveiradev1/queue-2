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

  test("concurrent distinct XP facts preserve the final level and emit one level-up", async () => {
    const duo = await createReadyDuo(pool, "game-projection-serialization");
    const sourceA = randomUUID();
    const sourceB = randomUUID();

    try {
      await seedDuoProjection(pool, duo.duoId, 110);

      await withTimeout(
        Promise.all([
          applySerializedXpFact(
            pool,
            duo.ownerUserId,
            duo.duoId,
            sourceA,
            20
          ),
          applySerializedXpFact(
            pool,
            duo.partnerUserId,
            duo.duoId,
            sourceB,
            30
          )
        ]),
        10_000
      );
      await withTimeout(
        applySerializedXpFact(
          pool,
          duo.ownerUserId,
          duo.duoId,
          sourceA,
          20
        ),
        10_000
      );

      const state = await readProjectionConcurrencyState(
        pool,
        duo.ownerUserId,
        duo.duoId
      );

      expect(state.awardCount).toBe(2);
      expect(state.awardTotal).toBe(50);
      expect(state.xp).toBe(160);
      expect(state.level).toBe(getLevelForXpForTest(state.xp));
      expect(state.levelUpCount).toBe(1);
    } finally {
      await cleanupDuoFixture(pool, duo);
    }
  });

  test("concurrent quest sources add, cap and reward exactly once across replay", async () => {
    const duo = await createReadyDuo(pool, "game-quest-atomic-progress");
    const questSlug = await insertQuestSeed(pool, "game-quest-atomic-progress");
    await configureQuestTemplate(pool, questSlug, 4, 240);
    const questCycleId = await insertQuestCycleReturningId(
      pool,
      duo.ownerUserId,
      duo.duoId,
      questSlug,
      "week:2026-06-15"
    );
    const sourceA = randomUUID();
    const sourceB = randomUUID();

    try {
      await seedQuestProgress(pool, duo.ownerUserId, duo.duoId, questCycleId, 2);

      await withTimeout(
        Promise.all([
          applyAtomicQuestFact(
            pool,
            duo.ownerUserId,
            duo.duoId,
            questCycleId,
            sourceA
          ),
          applyAtomicQuestFact(
            pool,
            duo.partnerUserId,
            duo.duoId,
            questCycleId,
            sourceB
          )
        ]),
        10_000
      );
      await withTimeout(
        applyAtomicQuestFact(
          pool,
          duo.ownerUserId,
          duo.duoId,
          questCycleId,
          sourceA
        ),
        10_000
      );

      const state = await readQuestConcurrencyState(
        pool,
        duo.ownerUserId,
        duo.duoId,
        questCycleId
      );

      expect(state.currentValue).toBe(4);
      expect(state.completedAt).not.toBeNull();
      expect(state.sourceKeys.sort()).toEqual(
        [`scheduled-session:${sourceA}`, `scheduled-session:${sourceB}`].sort()
      );
      expect(state.rewardAwardId).not.toBeNull();
      expect(state.rewardAwardCount).toBe(1);
      expect(state.questNotificationCount).toBe(1);
    } finally {
      await cleanupDuoFixture(pool, duo);
    }
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

  test("ready duo jobs flow through worker claim, completion and one local-time successor", async () => {
    const saoPaulo = await createReadyDuo(pool, "game-job-chain-sao-paulo");
    const newYork = await createReadyDuo(pool, "game-job-chain-new-york");
    await configureReadyDuo(
      pool,
      saoPaulo.duoId,
      "Dupla Sao Paulo",
      "America/Sao_Paulo"
    );
    await configureReadyDuo(
      pool,
      newYork.duoId,
      "Dupla New York",
      "America/New_York"
    );
    const prefix = `gamification-chain:${randomUUID()}`;
    const referenceAt = new Date("2026-06-06T15:00:00.000Z");
    const produced = await produceInitialGamificationJobsAsWorker(pool, {
      duoIds: [saoPaulo.duoId, newYork.duoId],
      prefix,
      referenceAt
    });

    expect(produced).toBe(8);

    const claimed = await claimChainJobsAsWorker(pool, {
      prefix,
      referenceAt
    });

    expect(claimed).toHaveLength(4);
    expect(
      claimed.map((job) => `${job.duo_id}:${job.schedule_kind}`).sort()
    ).toEqual([
      `${newYork.duoId}:streak`,
      `${newYork.duoId}:weekly`,
      `${saoPaulo.duoId}:streak`,
      `${saoPaulo.duoId}:weekly`
    ].sort());

    const weeklyQuestSlug = await insertQuestSeed(pool, "game-job-chain");
    const expectedSuccessors = new Map<string, Date>([
      [`${saoPaulo.duoId}:weekly`, new Date("2026-06-08T03:00:00.000Z")],
      [`${saoPaulo.duoId}:streak`, new Date("2026-06-07T07:00:00.000Z")],
      [`${newYork.duoId}:weekly`, new Date("2026-06-08T04:00:00.000Z")],
      [`${newYork.duoId}:streak`, new Date("2026-06-07T08:00:00.000Z")]
    ]);

    for (const job of claimed) {
      const nextRunAt = expectedSuccessors.get(
        `${job.duo_id}:${job.schedule_kind}`
      );

      expect(nextRunAt).toBeDefined();

      if (job.schedule_kind === "weekly") {
        const actorUserId =
          job.duo_id === saoPaulo.duoId
            ? saoPaulo.ownerUserId
            : newYork.ownerUserId;
        const windowStartAt =
          job.duo_id === saoPaulo.duoId
            ? new Date("2026-06-01T03:00:00.000Z")
            : new Date("2026-06-01T04:00:00.000Z");

        await insertQuestCycleAt(
          pool,
          actorUserId,
          job.duo_id,
          weeklyQuestSlug,
          `chain:${prefix.slice(-12)}:${job.duo_id === saoPaulo.duoId ? "sp" : "ny"}`,
          windowStartAt,
          nextRunAt!
        );
      }

      await enqueueChainSuccessorAsWorker(pool, {
        createdByUserId: job.created_by_user_id,
        duoId: job.duo_id,
        nextRunAt: nextRunAt!,
        prefix,
        scheduleKind: job.schedule_kind
      });
      await completeChainJobAsWorker(pool, job.id);
      await enqueueChainSuccessorAsWorker(pool, {
        createdByUserId: job.created_by_user_id,
        duoId: job.duo_id,
        nextRunAt: nextRunAt!,
        prefix,
        scheduleKind: job.schedule_kind
      });
    }

    const rows = await readChainJobs(pool, prefix);

    for (const duo of [saoPaulo, newYork]) {
      const duoRows = rows.filter((row) => row.duo_id === duo.duoId);

      expect(duoRows).toHaveLength(6);
      expect(
        duoRows.filter((row) => row.status === "completed")
      ).toHaveLength(2);

      for (const scheduleKind of ["weekly", "streak"] as const) {
        const successorRows = duoRows.filter(
          (row) =>
            row.schedule_kind === scheduleKind
            && row.job_key.includes(":successor:")
        );
        const expectedRunAt = expectedSuccessors.get(
          `${duo.duoId}:${scheduleKind}`
        );

        expect(successorRows).toHaveLength(1);
        expect(successorRows[0]?.status).toBe("pending");
        expect(successorRows[0]?.run_at.toISOString()).toBe(
          expectedRunAt?.toISOString()
        );
        expect(formatCivilHour(successorRows[0]!.run_at, duo.duoId === saoPaulo.duoId
          ? "America/Sao_Paulo"
          : "America/New_York")).toBe(scheduleKind === "weekly" ? "00:00" : "04:00");
      }
    }
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`concurrency_test_timeout_${timeoutMs}ms`)),
          timeoutMs
        );
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function getLevelForXpForTest(totalXp: number): number {
  const normalizedXp = Math.max(0, Math.floor(totalXp));
  let threshold = 0;
  let level = 1;

  for (let candidate = 2; candidate <= 50; candidate += 1) {
    threshold += Math.round(120 * 1.18 ** (candidate - 2));

    if (normalizedXp < threshold) {
      break;
    }

    level = candidate;
  }

  return level;
}

async function seedDuoProjection(
  pool: pg.Pool,
  duoId: string,
  xp: number
): Promise<void> {
  await pool.query(
    `
      UPDATE app.duos
      SET xp = $2,
          level = $3,
          updated_at = now()
      WHERE id = $1
    `,
    [duoId, xp, getLevelForXpForTest(xp)]
  );
  await pool.query(
    `
      INSERT INTO app.gamification_streak_state (duo_id)
      VALUES ($1)
      ON CONFLICT (duo_id) DO NOTHING
    `,
    [duoId]
  );
}

async function applySerializedXpFact(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  sourceId: string,
  amount: number
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_streak_state (duo_id)
        SELECT id
        FROM app.duos
        WHERE id = $1
        ON CONFLICT (duo_id) DO NOTHING
      `,
      [duoId]
    );
    const locked = await client.query<{ level: number }>(
      `
        SELECT duo.level
        FROM app.duos AS duo
        INNER JOIN app.gamification_streak_state AS streak
          ON streak.duo_id = duo.id
        WHERE duo.id = $1
        FOR UPDATE OF duo, streak
      `,
      [duoId]
    );
    const award = await client.query<{ amount: number }>(
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
        VALUES ($1, $2, 'live-session', $3, $4, 'concurrency-level', $5)
        ON CONFLICT DO NOTHING
        RETURNING amount
      `,
      [duoId, `concurrency-level:${sourceId}`, sourceId, amount, userId]
    );
    const inserted = award.rows[0];

    if (!inserted) {
      return;
    }

    const projection = await client.query<{ xp: number }>(
      `
        UPDATE app.duos
        SET xp = xp + $2,
            updated_at = now()
        WHERE id = $1
        RETURNING xp
      `,
      [duoId, inserted.amount]
    );
    const nextXp = Number(projection.rows[0]!.xp);
    const nextLevel = getLevelForXpForTest(nextXp);

    await client.query(
      `
        UPDATE app.duos
        SET level = $2,
            updated_at = CASE
              WHEN level IS DISTINCT FROM $2 THEN now()
              ELSE updated_at
            END
        WHERE id = $1
          AND level IS DISTINCT FROM $2
      `,
      [duoId, nextLevel]
    );

    if (nextLevel > Number(locked.rows[0]!.level)) {
      await client.query(
        `
          INSERT INTO app.gamification_reward_notifications (
            duo_id,
            actor_user_id,
            notification_type,
            intensity,
            title,
            body,
            action_ref_type,
            action_ref_id,
            metadata
          )
          VALUES (
            $1,
            $2,
            'level-up',
            'special',
            'Nivel da dupla subiu',
            'Concorrencia serializada.',
            'live-session',
            $3,
            '{"test":"projection-concurrency"}'::jsonb
          )
        `,
        [duoId, userId, sourceId]
      );
    }
  });
}

async function readProjectionConcurrencyState(
  pool: pg.Pool,
  userId: string,
  duoId: string
): Promise<{
  awardCount: number;
  awardTotal: number;
  level: number;
  levelUpCount: number;
  xp: number;
}> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{
      award_count: string;
      award_total: string;
      level: number;
      level_up_count: string;
      xp: number;
    }>(
      `
        SELECT
          duo.xp,
          duo.level,
          (
            SELECT count(*)
            FROM app.duo_xp_awards AS award
            WHERE award.duo_id = duo.id
              AND award.reason_code = 'concurrency-level'
          ) AS award_count,
          (
            SELECT COALESCE(sum(award.amount), 0)
            FROM app.duo_xp_awards AS award
            WHERE award.duo_id = duo.id
              AND award.reason_code = 'concurrency-level'
          ) AS award_total,
          (
            SELECT count(*)
            FROM app.gamification_reward_notifications AS notification
            WHERE notification.duo_id = duo.id
              AND notification.notification_type = 'level-up'
              AND notification.metadata @> '{"test":"projection-concurrency"}'::jsonb
          ) AS level_up_count
        FROM app.duos AS duo
        WHERE duo.id = $1
      `,
      [duoId]
    );
    const row = result.rows[0]!;

    return {
      awardCount: Number(row.award_count),
      awardTotal: Number(row.award_total),
      level: Number(row.level),
      levelUpCount: Number(row.level_up_count),
      xp: Number(row.xp)
    };
  });
}

async function seedQuestProgress(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questCycleId: string,
  currentValue: number
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_quest_progress (
          duo_id,
          quest_cycle_id,
          current_value,
          metadata
        )
        VALUES ($1, $2, $3, '{"sourceKeys":[]}'::jsonb)
        ON CONFLICT (duo_id, quest_cycle_id) DO UPDATE
        SET current_value = EXCLUDED.current_value,
            completed_at = NULL,
            reward_award_id = NULL,
            last_source_type = NULL,
            last_source_id = NULL,
            metadata = EXCLUDED.metadata,
            updated_at = now()
      `,
      [duoId, questCycleId, currentValue]
    );
  });
}

async function configureQuestTemplate(
  pool: pg.Pool,
  questSlug: string,
  goalValue: number,
  xpReward: number
): Promise<void> {
  await pool.query(
    `
      UPDATE app.gamification_quest_templates
      SET goal_value = $2,
          xp_reward = $3
      WHERE slug = $1
    `,
    [questSlug, goalValue, xpReward]
  );
}

async function applyAtomicQuestFact(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questCycleId: string,
  sourceId: string
): Promise<void> {
  await withRuntimeUser(pool, userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.gamification_streak_state (duo_id)
        SELECT id
        FROM app.duos
        WHERE id = $1
        ON CONFLICT (duo_id) DO NOTHING
      `,
      [duoId]
    );
    await client.query(
      `
        SELECT duo.id
        FROM app.duos AS duo
        INNER JOIN app.gamification_streak_state AS streak
          ON streak.duo_id = duo.id
        WHERE duo.id = $1
        FOR UPDATE OF duo, streak
      `,
      [duoId]
    );
    await client.query(
      `
        INSERT INTO app.gamification_quest_progress (
          duo_id,
          quest_cycle_id,
          current_value,
          metadata
        )
        VALUES ($1, $2::uuid, 0, '{}'::jsonb)
        ON CONFLICT (duo_id, quest_cycle_id) DO NOTHING
      `,
      [duoId, questCycleId]
    );
    const sourceKey = `scheduled-session:${sourceId}`;
    const progress = await client.query<{
      completed_now: boolean;
    }>(
      `
        WITH previous AS MATERIALIZED (
          SELECT
            progress.*,
            progress.completed_at IS NULL
              AND NOT (
                COALESCE(progress.metadata -> 'sourceKeys', '[]'::jsonb) ? $3
              ) AS should_advance
          FROM app.gamification_quest_progress AS progress
          WHERE progress.duo_id = $1
            AND progress.quest_cycle_id = $2::uuid
          FOR UPDATE
        ),
        updated AS (
          UPDATE app.gamification_quest_progress AS progress
          SET current_value = LEAST(4, previous.current_value + 1),
              completed_at = CASE
                WHEN previous.current_value < 4
                  AND LEAST(4, previous.current_value + 1) >= 4
                  THEN now()
                ELSE previous.completed_at
              END,
              last_source_type = 'scheduled-session',
              last_source_id = $4::uuid,
              metadata = previous.metadata
                || '{"eligibilityKey":"monthly-confirmed-facts"}'::jsonb
                || jsonb_build_object(
                  'sourceKeys',
                  COALESCE(previous.metadata -> 'sourceKeys', '[]'::jsonb)
                    || jsonb_build_array($3),
                  'lastSourceKey',
                  $3
                ),
              updated_at = now()
          FROM previous
          WHERE progress.id = previous.id
            AND previous.should_advance
          RETURNING
            progress.id,
            progress.current_value,
            progress.completed_at,
            progress.reward_award_id,
            progress.metadata,
            progress.updated_at,
            true AS advanced,
            previous.current_value < 4
              AND progress.current_value >= 4 AS completed_now
        )
        SELECT completed_now
        FROM updated
        UNION ALL
        SELECT false AS completed_now
        FROM previous
        WHERE NOT EXISTS (SELECT 1 FROM updated)
        LIMIT 1
      `,
      [duoId, questCycleId, sourceKey, sourceId]
    );

    if (!progress.rows[0]?.completed_now) {
      return;
    }

    const award = await client.query<{ id: string; amount: number }>(
      `
        INSERT INTO app.duo_xp_awards (
          duo_id,
          award_key,
          source_type,
          source_id,
          amount,
          reason_code,
          awarded_by_user_id,
          metadata
        )
        VALUES (
          $1,
          $2,
          'quest',
          $3::uuid,
          240,
          'quest-complete',
          $4,
          '{"test":"quest-concurrency"}'::jsonb
        )
        ON CONFLICT DO NOTHING
        RETURNING id, amount
      `,
      [duoId, `quest:${questCycleId}`, questCycleId, userId]
    );
    const reward = award.rows[0];

    if (!reward) {
      return;
    }

    await client.query(
      `
        UPDATE app.gamification_quest_progress
        SET reward_award_id = COALESCE(reward_award_id, $3::uuid),
            updated_at = CASE
              WHEN reward_award_id IS NULL THEN now()
              ELSE updated_at
            END
        WHERE duo_id = $1
          AND quest_cycle_id = $2::uuid
      `,
      [duoId, questCycleId, reward.id]
    );
    const projection = await client.query<{ xp: number }>(
      `
        UPDATE app.duos
        SET xp = xp + $2,
            updated_at = now()
        WHERE id = $1
        RETURNING xp
      `,
      [duoId, reward.amount]
    );

    await client.query(
      `
        UPDATE app.duos
        SET level = $2
        WHERE id = $1
      `,
      [duoId, getLevelForXpForTest(Number(projection.rows[0]!.xp))]
    );
    await client.query(
      `
        INSERT INTO app.gamification_reward_notifications (
          duo_id,
          actor_user_id,
          notification_type,
          intensity,
          title,
          body,
          action_ref_type,
          action_ref_id,
          metadata
        )
        VALUES (
          $1,
          $2,
          'quest-complete',
          'special',
          'Desafio concluido',
          '+240 XP para a dupla.',
          'quest',
          $3::uuid,
          '{"test":"quest-concurrency"}'::jsonb
        )
      `,
      [duoId, userId, questCycleId]
    );
  });
}

async function readQuestConcurrencyState(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questCycleId: string
): Promise<{
  completedAt: Date | null;
  currentValue: number;
  questNotificationCount: number;
  rewardAwardCount: number;
  rewardAwardId: string | null;
  sourceKeys: string[];
}> {
  return withRuntimeUser(pool, userId, async (client) => {
    const result = await client.query<{
      completed_at: Date | null;
      current_value: number;
      quest_notification_count: string;
      reward_award_count: string;
      reward_award_id: string | null;
      source_keys: string[];
    }>(
      `
        SELECT
          progress.current_value,
          progress.completed_at,
          progress.reward_award_id,
          COALESCE(progress.metadata -> 'sourceKeys', '[]'::jsonb) AS source_keys,
          (
            SELECT count(*)
            FROM app.duo_xp_awards AS award
            WHERE award.duo_id = progress.duo_id
              AND award.source_type = 'quest'
              AND award.source_id = progress.quest_cycle_id
          ) AS reward_award_count,
          (
            SELECT count(*)
            FROM app.gamification_reward_notifications AS notification
            WHERE notification.duo_id = progress.duo_id
              AND notification.notification_type = 'quest-complete'
              AND notification.action_ref_id = progress.quest_cycle_id
          ) AS quest_notification_count
        FROM app.gamification_quest_progress AS progress
        WHERE progress.duo_id = $1
          AND progress.quest_cycle_id = $2::uuid
      `,
      [duoId, questCycleId]
    );
    const row = result.rows[0]!;

    return {
      completedAt: row.completed_at,
      currentValue: Number(row.current_value),
      questNotificationCount: Number(row.quest_notification_count),
      rewardAwardCount: Number(row.reward_award_count),
      rewardAwardId: row.reward_award_id,
      sourceKeys: row.source_keys
    };
  });
}

async function cleanupDuoFixture(
  pool: pg.Pool,
  duo: Awaited<ReturnType<typeof createReadyDuo>>
): Promise<void> {
  await pool.query("DELETE FROM app.duos WHERE id = $1", [duo.duoId]);
  await pool.query(
    `DELETE FROM auth."user" WHERE id = ANY($1::text[])`,
    [[duo.ownerUserId, duo.partnerUserId]]
  );
}

type ChainScheduleKind = "weekly" | "monthly" | "seasonal" | "streak";

type ChainJobRow = {
  id: string;
  duo_id: string;
  job_key: string;
  status: "pending" | "claimed" | "completed" | "failed";
  run_at: Date;
  schedule_kind: ChainScheduleKind;
  created_by_user_id: string;
};

type ClaimedChainJobRow = Omit<ChainJobRow, "schedule_kind"> & {
  schedule_kind: "weekly" | "streak";
};

async function configureReadyDuo(
  pool: pg.Pool,
  duoId: string,
  name: string,
  timezone: string
): Promise<void> {
  await pool.query(
    `
      UPDATE app.duos
      SET name = $2,
          timezone = $3,
          paired_at = COALESCE(paired_at, now())
      WHERE id = $1
    `,
    [duoId, name, timezone]
  );
}

async function produceInitialGamificationJobsAsWorker(
  pool: pg.Pool,
  input: {
    duoIds: string[];
    prefix: string;
    referenceAt: Date;
  }
): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE queue2_worker");
    const targets = await client.query<{
      duo_id: string;
      created_by_user_id: string;
    }>(
      `
        SELECT
          duo.id AS duo_id,
          (array_agg(member.user_id ORDER BY member.member_slot))[1] AS created_by_user_id
        FROM app.duos AS duo
        JOIN app.duo_members AS member ON member.duo_id = duo.id
        WHERE duo.id = ANY($1::uuid[])
          AND duo.paired_at IS NOT NULL
          AND btrim(COALESCE(duo.name, '')) <> ''
        GROUP BY duo.id
        HAVING count(*) = 2
          AND count(DISTINCT member.user_id) = 2
          AND count(DISTINCT member.member_slot) = 2
      `,
      [input.duoIds]
    );
    let produced = 0;

    for (const target of targets.rows) {
      for (const scheduleKind of [
        "weekly",
        "monthly",
        "seasonal",
        "streak"
      ] as const) {
        const result = await client.query(
          `
            INSERT INTO ops.scheduled_jobs (
              duo_id,
              job_key,
              job_type,
              run_at,
              payload
            )
            VALUES ($1, $2, $3, $4, $5::jsonb)
            ON CONFLICT (job_key) DO NOTHING
            RETURNING id
          `,
          [
            target.duo_id,
            `${input.prefix}:${target.duo_id}:initial:${scheduleKind}`,
            scheduleKind === "streak"
              ? "gamification-streak-check"
              : "gamification-quest-rotation",
            input.referenceAt,
            JSON.stringify({
              createdByUserId: target.created_by_user_id,
              ...(scheduleKind === "streak"
                ? { checkAt: input.referenceAt.toISOString() }
                : { questType: scheduleKind })
            })
          ]
        );

        produced += result.rows.length;
      }
    }

    await client.query("COMMIT");
    return produced;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function claimChainJobsAsWorker(
  pool: pg.Pool,
  input: {
    prefix: string;
    referenceAt: Date;
  }
): Promise<ClaimedChainJobRow[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE queue2_worker");
    const result = await client.query<ClaimedChainJobRow>(
      `
        WITH due_jobs AS (
          SELECT id
          FROM ops.scheduled_jobs
          WHERE status = 'pending'
            AND job_key LIKE $1
            AND (
              job_type = 'gamification-streak-check'
              OR payload ->> 'questType' = 'weekly'
            )
          ORDER BY duo_id, job_type
          FOR UPDATE SKIP LOCKED
        )
        UPDATE ops.scheduled_jobs AS job
        SET status = 'claimed',
            attempts = attempts + 1,
            locked_at = $2,
            locked_by = 'integration-chain',
            updated_at = now()
        FROM due_jobs
        WHERE job.id = due_jobs.id
        RETURNING
          job.id,
          job.duo_id,
          job.job_key,
          job.status,
          job.run_at,
          COALESCE(job.payload ->> 'questType', 'streak') AS schedule_kind,
          job.payload ->> 'createdByUserId' AS created_by_user_id
      `,
      [`${input.prefix}%`, input.referenceAt]
    );

    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function enqueueChainSuccessorAsWorker(
  pool: pg.Pool,
  input: {
    createdByUserId: string;
    duoId: string;
    nextRunAt: Date;
    prefix: string;
    scheduleKind: "weekly" | "streak";
  }
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE queue2_worker");
    await client.query(
      `
        INSERT INTO ops.scheduled_jobs (
          duo_id,
          job_key,
          job_type,
          run_at,
          payload
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (job_key) DO NOTHING
      `,
      [
        input.duoId,
        `${input.prefix}:${input.duoId}:successor:${input.scheduleKind}:${input.nextRunAt.toISOString()}`,
        input.scheduleKind === "streak"
          ? "gamification-streak-check"
          : "gamification-quest-rotation",
        input.nextRunAt,
        JSON.stringify({
          createdByUserId: input.createdByUserId,
          ...(input.scheduleKind === "streak"
            ? { checkAt: input.nextRunAt.toISOString() }
            : { questType: input.scheduleKind })
        })
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeChainJobAsWorker(
  pool: pg.Pool,
  jobId: string
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE queue2_worker");
    await client.query(
      `
        UPDATE ops.scheduled_jobs
        SET status = 'completed',
            processed_at = now(),
            locked_at = NULL,
            locked_by = NULL,
            updated_at = now()
        WHERE id = $1
      `,
      [jobId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readChainJobs(
  pool: pg.Pool,
  prefix: string
): Promise<ChainJobRow[]> {
  const result = await pool.query<ChainJobRow>(
    `
      SELECT
        id,
        duo_id,
        job_key,
        status,
        run_at,
        COALESCE(payload ->> 'questType', 'streak') AS schedule_kind,
        payload ->> 'createdByUserId' AS created_by_user_id
      FROM ops.scheduled_jobs
      WHERE job_key LIKE $1
      ORDER BY duo_id, run_at, job_key
    `,
    [`${prefix}%`]
  );

  return result.rows;
}

async function insertQuestCycleAt(
  pool: pg.Pool,
  userId: string,
  duoId: string,
  questSlug: string,
  cycleKey: string,
  windowStartAt: Date,
  windowEndAt: Date
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
        SELECT
          $1,
          $2,
          'weekly',
          $3,
          $4,
          $5,
          duo.timezone
        FROM app.duos AS duo
        WHERE duo.id = $1
        ON CONFLICT (duo_id, quest_slug, cycle_key) DO NOTHING
      `,
      [duoId, questSlug, cycleKey, windowStartAt, windowEndAt]
    );
  });
}

function formatCivilHour(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: timezone
  }).formatToParts(date);
  const value = (type: "hour" | "minute") =>
    parts.find((part) => part.type === type)?.value;

  return `${value("hour")}:${value("minute")}`;
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
