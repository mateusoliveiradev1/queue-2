import { readFileSync } from "node:fs";

import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import { getLevelForXp } from "../src/modules/gamification";
import type {
  GamificationAchievementUnlockRecord,
  GamificationDueJobRecord,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationStreakStateRecord,
  GamificationXpLedgerRecord
} from "../src/modules/gamification/application/ports";
import { createGamificationRepository } from "../src/modules/gamification/infrastructure/gamification-repository";

const gamificationRepositorySource = readFileSync(
  "src/modules/gamification/infrastructure/gamification-repository.ts",
  "utf8"
);
const gamificationPublicIndexSource = readFileSync("src/modules/gamification/index.ts", "utf8");

describe("gamification application contract", () => {
  it("applies a replayed XP fact once when the ledger reports a duplicate", async () => {
    const insertXpLedgerAward = vi
      .fn<GamificationRepositoryTransaction["insertXpLedgerAward"]>()
      .mockResolvedValueOnce(xpAwardRecord())
      .mockResolvedValueOnce(null);
    const updateProjection = vi.fn<GamificationRepositoryTransaction["updateProjection"]>(
      async (input) =>
        projectionRecord({
          duoId: input.duoId,
          xp: 80,
          level: getLevelForXp(80)
        })
    );
    const repository = fakeGamificationRepository({
      insertXpLedgerAward,
      updateProjection
    });

    await expect(applyFakeXpFact(repository)).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        duplicate: false,
        projection: expect.objectContaining({ xp: 80 })
      })
    );
    await expect(applyFakeXpFact(repository)).resolves.toEqual({
      ok: true,
      duplicate: true
    });
    expect(insertXpLedgerAward).toHaveBeenCalledTimes(2);
    expect(updateProjection).toHaveBeenCalledTimes(1);
  });

  it("reads projections inside the app user transaction context", async () => {
    const { pool, calls } = fakeGamificationReadPool();
    const repository = createGamificationRepository(pool);

    await expect(
      repository.withUserTransaction("member-1", (transaction) =>
        transaction.readProjection("duo-1")
      )
    ).resolves.toEqual(
      expect.objectContaining({
        duoId: "duo-1",
        xp: 180,
        streak: 2,
        availableFreezes: 1
      })
    );
    expect(calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        "BEGIN",
        expect.stringContaining("set_config('queue2.user_id'"),
        expect.stringContaining("FROM app.duos AS duo"),
        "COMMIT"
      ])
    );
  });

  it("keeps persistence patterns server-only, RLS-scoped and idempotent", () => {
    expect(gamificationRepositorySource).toContain("import \"server-only\"");
    expect(gamificationRepositorySource).toContain("withAppUserTransaction");
    expect(gamificationRepositorySource).toContain("ON CONFLICT DO NOTHING");
    expect(gamificationRepositorySource).toContain(
      "ON CONFLICT (duo_id, achievement_slug) DO NOTHING"
    );
    expect(gamificationRepositorySource).toContain(
      "ON CONFLICT (duo_id, quest_slug, cycle_key) DO UPDATE"
    );
    expect(gamificationRepositorySource).toContain("job_type = ANY($2::text[])");
    expect(gamificationRepositorySource).toContain("FOR UPDATE SKIP LOCKED");
    expect(gamificationRepositorySource).toContain(
      "Math.min(Math.max(input.limit, 1), 100)"
    );
  });

  it("does not expose infrastructure internals through the gamification public entrypoint", () => {
    expect(gamificationPublicIndexSource).not.toContain("createGamificationRepository");
    expect(gamificationPublicIndexSource).not.toMatch(/export\s+\{\s*gamificationRepository/);
  });
});

async function applyFakeXpFact(repository: GamificationRepository) {
  return repository.withUserTransaction("member-1", async (transaction) => {
    const membership = await transaction.resolveMembership("member-1");

    if (!membership) {
      return { ok: false as const, reason: "membership-required" as const };
    }

    const award = await transaction.insertXpLedgerAward({
      duoId: membership.duoId,
      awardKey: "quest:week-1:sessao-confirmada",
      sourceType: "quest",
      sourceId: "00000000-0000-4000-8000-000000000001",
      amount: 80,
      reasonCode: "quest-complete",
      awardedByUserId: membership.userId,
      metadata: { cycleKey: "week-1" }
    });

    if (!award) {
      return { ok: true as const, duplicate: true as const };
    }

    const projection = await transaction.updateProjection({
      duoId: membership.duoId,
      xpDelta: award.amount,
      nextLevel: getLevelForXp(award.amount)
    });

    return {
      ok: true as const,
      duplicate: false as const,
      projection
    };
  });
}

function fakeGamificationRepository(input: {
  membership?: GamificationMembershipContext | null;
  insertXpLedgerAward?: GamificationRepositoryTransaction["insertXpLedgerAward"];
  updateProjection?: GamificationRepositoryTransaction["updateProjection"];
} = {}): GamificationRepository {
  const membership =
    input.membership === undefined
      ? {
          duoId: "duo-1",
          userId: "member-1",
          partnerUserId: "member-2",
          memberUserIds: ["member-1", "member-2"]
        }
      : input.membership;
  const transaction: GamificationRepositoryTransaction = {
    resolveMembership: vi.fn(async () => membership),
    readDuoTimezone: vi.fn(async () => "America/Sao_Paulo"),
    readProjection: vi.fn(async () => projectionRecord()),
    countXpAwardsForDuoDay: vi.fn(async () => 0),
    insertXpLedgerAward: input.insertXpLedgerAward ?? vi.fn(async () => xpAwardRecord()),
    updateProjection: input.updateProjection ?? vi.fn(async () => projectionRecord()),
    readAchievementUnlocks: vi.fn(async () => [achievementUnlockRecord()]),
    readRecentXpLedgerAwards: vi.fn(async () => []),
    insertAchievementUnlock: vi.fn(async () => achievementUnlockRecord()),
    readActiveQuestCycles: vi.fn(async () => [questCycleRecord()]),
    readQuestProgressForCycles: vi.fn(async () => [questProgressRecord()]),
    upsertQuestCycle: vi.fn(async () => questCycleRecord()),
    upsertQuestProgress: vi.fn(async () => questProgressRecord()),
    readStreakState: vi.fn(async () => streakStateRecord()),
    insertStreakEvent: vi.fn(async () => true),
    upsertStreakState: vi.fn(async (state) => state),
    insertRewardNotification: vi.fn(),
    insertAdjustment: vi.fn(),
    sumXpLedgerAwards: vi.fn(async () => 0)
  };

  return {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
    claimDueGamificationJobs: vi.fn(async () => [jobRecord()]),
    completeGamificationJob: vi.fn(),
    failGamificationJob: vi.fn(),
    recordProjectionRebuild: vi.fn()
  };
}

function fakeGamificationReadPool(): {
  pool: QueueDbPool;
  calls: Array<{ sql: string; values: unknown[] }>;
} {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (sql.includes("set_config('queue2.user_id'")) {
        return { rows: [] };
      }

      if (sql.includes("FROM app.duos AS duo")) {
        return {
          rows: [
            {
              duo_id: "duo-1",
              xp: 180,
              level: 3,
              streak: 2,
              available_freezes: 1,
              updated_at: new Date("2026-06-06T12:00:00.000Z")
            }
          ]
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }),
    release: vi.fn()
  } as unknown as QueueDbClient;
  const pool = {
    connect: vi.fn(async () => client)
  } as unknown as QueueDbPool;

  return { pool, calls };
}

function projectionRecord(
  overrides: Partial<GamificationProjectionRecord> = {}
): GamificationProjectionRecord {
  return {
    duoId: "duo-1",
    xp: 0,
    level: getLevelForXp(0),
    streak: 0,
    availableFreezes: 0,
    updatedAt: new Date("2026-06-06T12:00:00.000Z"),
    ...overrides
  };
}

function xpAwardRecord(overrides: Partial<GamificationXpLedgerRecord> = {}): GamificationXpLedgerRecord {
  return {
    id: "award-1",
    duoId: "duo-1",
    awardKey: "quest:week-1:sessao-confirmada",
    sourceType: "quest",
    sourceId: "00000000-0000-4000-8000-000000000001",
    amount: 80,
    reasonCode: "quest-complete",
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: new Date("2026-06-06T12:00:00.000Z"),
    ...overrides
  };
}

function achievementUnlockRecord(
  overrides: Partial<GamificationAchievementUnlockRecord> = {}
): GamificationAchievementUnlockRecord {
  return {
    id: "unlock-1",
    duoId: "duo-1",
    achievementSlug: "primeira-sessao",
    sourceType: "live-session",
    sourceId: "00000000-0000-4000-8000-000000000002",
    unlockedByUserId: "member-1",
    metadata: {},
    unlockedAt: new Date("2026-06-06T12:00:00.000Z"),
    ...overrides
  };
}

function questCycleRecord(overrides: Partial<GamificationQuestCycleRecord> = {}): GamificationQuestCycleRecord {
  return {
    id: "cycle-1",
    duoId: "duo-1",
    questSlug: "sessao-confirmada",
    questType: "weekly",
    cycleKey: "week:2026-06-01",
    windowStartAt: new Date("2026-06-01T04:00:00.000Z"),
    windowEndAt: new Date("2026-06-08T04:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    status: "active",
    ...overrides
  };
}

function questProgressRecord(
  overrides: Partial<GamificationQuestProgressRecord> = {}
): GamificationQuestProgressRecord {
  return {
    id: "progress-1",
    duoId: "duo-1",
    questCycleId: "cycle-1",
    currentValue: 1,
    completedAt: null,
    rewardAwardId: null,
    metadata: {},
    updatedAt: new Date("2026-06-06T12:00:00.000Z"),
    ...overrides
  };
}

function streakStateRecord(
  overrides: Partial<GamificationStreakStateRecord> = {}
): GamificationStreakStateRecord {
  return {
    duoId: "duo-1",
    currentStreak: 2,
    longestStreak: 4,
    availableFreezes: 1,
    lastActivityDuoDay: "2026-06-06",
    updatedAt: new Date("2026-06-06T12:00:00.000Z"),
    ...overrides
  };
}

function jobRecord(overrides: Partial<GamificationDueJobRecord> = {}): GamificationDueJobRecord {
  return {
    id: "job-1",
    duoId: "duo-1",
    jobKey: "gamification-quest-rotation:duo-1:week:2026-06-01",
    jobType: "gamification-quest-rotation",
    runAt: new Date("2026-06-06T12:00:00.000Z"),
    attempts: 0,
    payload: {},
    ...overrides
  };
}
