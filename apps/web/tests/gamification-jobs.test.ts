import { readFileSync } from "node:fs";

import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import {
  runQuestRotationJobsUseCase
} from "../src/modules/gamification/application/run-quest-rotation-jobs";
import {
  runStreakJobsUseCase
} from "../src/modules/gamification/application/run-streak-jobs";
import {
  isGamificationMaintenanceRequestAuthorized
} from "../src/modules/gamification/jobs";
import { createGamificationRepository } from "../src/modules/gamification/infrastructure/gamification-repository";
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
import { getLevelForXp } from "../src/modules/gamification/domain/level-curve";

const now = new Date("2026-06-06T15:00:00.000Z");
const jobsSource = readFileSync("src/modules/gamification/jobs.ts", "utf8");
const routeSource = readFileSync(
  "src/app/api/jobs/gamification/maintenance/route.ts",
  "utf8"
);
const scriptSource = readFileSync("../../scripts/gamification-maintenance.ts", "utf8");
const repositorySource = readFileSync(
  "src/modules/gamification/infrastructure/gamification-repository.ts",
  "utf8"
);
const vercelSource = readFileSync("../../vercel.json", "utf8");

describe("Phase 05.5 gamification maintenance jobs", () => {
  it("rotates weekly, monthly and seasonal cycles idempotently per duo window", async () => {
    const upserted = new Map<string, GamificationQuestCycleRecord>();
    const upsertQuestCycle = vi.fn<GamificationRepositoryTransaction["upsertQuestCycle"]>(
      async (input) => {
        const key = `${input.duoId}:${input.questSlug}:${input.cycleKey}`;
        const existing = upserted.get(key);

        if (existing) {
          return existing;
        }

        const record = questCycleRecord({
          cycleKey: input.cycleKey,
          duoId: input.duoId,
          id: `cycle-${upserted.size + 1}`,
          questSlug: input.questSlug,
          questType: input.questType,
          timezone: input.timezone,
          windowEndAt: input.windowEndAt,
          windowStartAt: input.windowStartAt
        });
        upserted.set(key, record);

        return record;
      }
    );
    const repository = fakeGamificationRepository({
      jobs: [
        jobRecord({
          id: "job-1",
          payload: { createdByUserId: "member-1", now: now.toISOString() }
        }),
        jobRecord({
          id: "job-2",
          jobKey: "gamification-quest-rotation:duo-1:duplicate",
          payload: { createdByUserId: "member-1", now: now.toISOString() }
        })
      ],
      upsertQuestCycle
    });

    const result = await runQuestRotationJobsUseCase(
      {
        limit: 10,
        now,
        workerId: "test-rotation"
      },
      repository
    );

    expect(result).toEqual({
      ok: true,
      claimed: 2,
      completed: 2,
      failed: 0,
      cyclesUpserted: 14,
      skipped: 0
    });
    expect(repository.claimDueGamificationJobs).toHaveBeenCalledWith({
      jobTypes: ["gamification-quest-rotation"],
      limit: 10,
      now,
      workerId: "test-rotation"
    });
    expect(upserted.size).toBe(7);
    expect([...upserted.values()].map((cycle) => cycle.questType).sort()).toEqual([
      "monthly",
      "seasonal",
      "seasonal",
      "seasonal",
      "weekly",
      "weekly",
      "weekly"
    ]);
    expect([...upserted.keys()]).toEqual(
      expect.arrayContaining([
        "duo-1:sessao-confirmada:weekly:2026-06-01",
        "duo-1:mes-da-fila:monthly:2026-06",
        "duo-1:spooky-coop:seasonal:spooky:2026"
      ])
    );
    expect(repository.completeGamificationJob).toHaveBeenCalledTimes(2);
    expect(repository.failGamificationJob).not.toHaveBeenCalled();
  });

  it("consumes at most one Freeze per missed duo day and updates projection server-side", async () => {
    let streakState = streakStateRecord({
      availableFreezes: 1,
      currentStreak: 8,
      lastActivityDuoDay: "2026-06-06",
      longestStreak: 10
    });
    const insertStreakEvent = vi.fn<GamificationRepositoryTransaction["insertStreakEvent"]>(
      async (input) => input.eventKey === "streak-freeze:2026-06-07"
    );
    const upsertStreakState = vi.fn<GamificationRepositoryTransaction["upsertStreakState"]>(
      async (input) => {
        streakState = input;

        return input;
      }
    );
    const updateProjection = vi.fn<GamificationRepositoryTransaction["updateProjection"]>(
      async (input) =>
        projectionRecord({
          availableFreezes: input.availableFreezes ?? 0,
          streak: input.streak ?? 0
        })
    );
    const repository = fakeGamificationRepository({
      jobs: [
        jobRecord({
          id: "job-1",
          jobType: "gamification-streak-check",
          payload: {
            checkAt: "2026-06-08T15:00:00.000Z",
            createdByUserId: "member-1"
          }
        }),
        jobRecord({
          id: "job-2",
          jobKey: "gamification-streak-check:duo-1:duplicate",
          jobType: "gamification-streak-check",
          payload: {
            checkAt: "2026-06-08T15:00:00.000Z",
            createdByUserId: "member-1"
          }
        })
      ],
      insertStreakEvent,
      readStreakState: vi.fn(async () => streakState),
      updateProjection,
      upsertStreakState
    });

    const result = await runStreakJobsUseCase(
      {
        limit: 10,
        now,
        workerId: "test-streak"
      },
      repository
    );

    expect(result).toEqual({
      ok: true,
      claimed: 2,
      completed: 2,
      failed: 0,
      freezesConsumed: 1,
      streaksReset: 0,
      skipped: 1
    });
    expect(insertStreakEvent).toHaveBeenCalledTimes(1);
    expect(upsertStreakState).toHaveBeenCalledWith(
      expect.objectContaining({
        availableFreezes: 0,
        currentStreak: 8,
        lastActivityDuoDay: "2026-06-07"
      })
    );
    expect(updateProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        availableFreezes: 0,
        duoId: "duo-1",
        streak: 8,
        xpDelta: 0
      })
    );
  });

  it("guards the maintenance route and script with CRON_SECRET", () => {
    expect(isGamificationMaintenanceRequestAuthorized(
      new Request("https://queue.test/api/jobs/gamification/maintenance", {
        headers: { Authorization: "Bearer test-secret" }
      }),
      "test-secret"
    )).toBe(true);
    expect(isGamificationMaintenanceRequestAuthorized(
      new Request("https://queue.test/api/jobs/gamification/maintenance"),
      "test-secret"
    )).toBe(false);
    expect(isGamificationMaintenanceRequestAuthorized(
      new Request("https://queue.test/api/jobs/gamification/maintenance", {
        headers: { Authorization: "Bearer test-secret" }
      }),
      ""
    )).toBe(false);
    expect(jobsSource).toContain("import \"server-only\"");
    expect(jobsSource).toContain("process.env.CRON_SECRET");
    expect(routeSource).toContain("runtime = \"nodejs\"");
    expect(routeSource).toContain("maxDuration = 300");
    expect(routeSource).toContain("status: 401");
    expect(scriptSource).toContain("CRON_SECRET is required");
    expect(scriptSource).toContain("GAMIFICATION_MAINTENANCE_URL");
    expect(vercelSource).toContain("/api/jobs/gamification/maintenance");
  });

  it("keeps duplicate and overlapping runs bounded in the repository claim path", () => {
    expect(repositorySource).toContain("job_type = ANY($2::text[])");
    expect(repositorySource).toContain("gamification-quest-rotation");
    expect(repositorySource).toContain("gamification-streak-check");
    expect(repositorySource).toContain("FOR UPDATE SKIP LOCKED");
    expect(repositorySource).toContain("Math.min(Math.max(input.limit, 1), 100)");
  });

  it("bootstraps four idempotent job species only for ready duos", async () => {
    const { runtimePool, workerPool, insertedSpecies } = fakeGamificationJobPools();
    const repository = createGamificationRepository({ runtimePool, workerPool });

    await expect(repository.ensureGamificationJobs(now)).resolves.toEqual({
      producedJobs: 4,
      readyDuos: 1
    });
    await expect(repository.ensureGamificationJobs(now)).resolves.toEqual({
      producedJobs: 0,
      readyDuos: 1
    });
    expect([...insertedSpecies].sort()).toEqual([
      "monthly",
      "seasonal",
      "streak",
      "weekly"
    ]);
  });

  it("keeps the worker pool lazy for normal user transactions", async () => {
    const { runtimePool, workerPool } = fakeGamificationJobPools();
    const repository = createGamificationRepository({ runtimePool, workerPool });

    await expect(
      repository.withUserTransaction("member-1", async () => "runtime-ok")
    ).resolves.toBe("runtime-ok");
    expect(runtimePool.connect).toHaveBeenCalledTimes(1);
    expect(workerPool.connect).not.toHaveBeenCalled();
  });
});

function fakeGamificationJobPools(): {
  runtimePool: QueueDbPool;
  workerPool: QueueDbPool;
  insertedSpecies: string[];
} {
  const insertedSpecies: string[] = [];
  const insertedKeys = new Set<string>();
  const runtimeClient = {
    query: vi.fn(async () => ({ rows: [] })),
    release: vi.fn()
  } as unknown as QueueDbClient;
  const workerClient = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (sql.includes("FROM app.duos AS duo")) {
        return {
          rows: [
            {
              duo_id: "duo-1",
              timezone: "America/Sao_Paulo",
              created_by_user_id: "member-1"
            }
          ]
        };
      }

      if (sql.includes("INSERT INTO ops.scheduled_jobs")) {
        const jobKey = String(values[1]);
        const payload = JSON.parse(String(values[4])) as {
          questType?: string;
        };
        const species = payload.questType ?? "streak";

        if (insertedKeys.has(jobKey) || insertedSpecies.includes(species)) {
          return { rows: [] };
        }

        insertedKeys.add(jobKey);
        insertedSpecies.push(species);
        return { rows: [{ id: `job-${insertedSpecies.length}` }] };
      }

      throw new Error(`Unexpected worker SQL: ${sql}`);
    }),
    release: vi.fn()
  } as unknown as QueueDbClient;
  const runtimePool = {
    connect: vi.fn(async () => runtimeClient)
  } as unknown as QueueDbPool;
  const workerPool = {
    connect: vi.fn(async () => workerClient)
  } as unknown as QueueDbPool;

  return {
    runtimePool,
    workerPool,
    insertedSpecies
  };
}

function fakeGamificationRepository(input: {
  jobs?: GamificationDueJobRecord[];
  membership?: GamificationMembershipContext | null;
  projection?: GamificationProjectionRecord | null;
  readStreakState?: GamificationRepositoryTransaction["readStreakState"];
  insertStreakEvent?: GamificationRepositoryTransaction["insertStreakEvent"];
  upsertQuestCycle?: GamificationRepositoryTransaction["upsertQuestCycle"];
  upsertStreakState?: GamificationRepositoryTransaction["upsertStreakState"];
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
    readProjection: vi.fn(async () =>
      input.projection === undefined ? projectionRecord() : input.projection
    ),
    countXpAwardsForDuoDay: vi.fn(async () => 0),
    insertXpLedgerAward: vi.fn(async () => xpAwardRecord()),
    updateProjection: input.updateProjection ?? vi.fn(async () => projectionRecord()),
    readAchievementUnlocks: vi.fn(async () => []),
    readRecentXpLedgerAwards: vi.fn(async () => []),
    insertAchievementUnlock: vi.fn(async () => achievementUnlockRecord()),
    readActiveQuestCycles: vi.fn(async () => []),
    readQuestProgressForCycles: vi.fn(async () => []),
    upsertQuestCycle: input.upsertQuestCycle ?? vi.fn(async () => questCycleRecord()),
    upsertQuestProgress: vi.fn(async () => questProgressRecord()),
    readStreakState: input.readStreakState ?? vi.fn(async () => null),
    insertStreakEvent: input.insertStreakEvent ?? vi.fn(async () => true),
    upsertStreakState: input.upsertStreakState ?? vi.fn(async (state) => state),
    insertRewardNotification: vi.fn(),
    insertAdjustment: vi.fn(),
    sumXpLedgerAwards: vi.fn(async () => 0)
  };

  return {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
    ensureGamificationJobs: vi.fn(async () => ({
      producedJobs: 0,
      readyDuos: 0
    })),
    enqueueGamificationJob: vi.fn(async () => true),
    claimDueGamificationJobs: vi.fn(async () => input.jobs ?? []),
    completeGamificationJob: vi.fn(),
    failGamificationJob: vi.fn(),
    recordProjectionRebuild: vi.fn()
  };
}

function jobRecord(overrides: Partial<GamificationDueJobRecord> = {}): GamificationDueJobRecord {
  return {
    id: "job-1",
    duoId: "duo-1",
    jobKey: "gamification-quest-rotation:duo-1:weekly:2026-06-01",
    jobType: "gamification-quest-rotation",
    runAt: now,
    attempts: 0,
    payload: { createdByUserId: "member-1" },
    ...overrides
  };
}

function projectionRecord(
  overrides: Partial<GamificationProjectionRecord> = {}
): GamificationProjectionRecord {
  return {
    duoId: "duo-1",
    xp: 120,
    level: getLevelForXp(120),
    streak: 2,
    availableFreezes: 1,
    updatedAt: now,
    ...overrides
  };
}

function questCycleRecord(
  overrides: Partial<GamificationQuestCycleRecord> = {}
): GamificationQuestCycleRecord {
  return {
    id: "cycle-1",
    duoId: "duo-1",
    questSlug: "sessao-confirmada",
    questType: "weekly",
    cycleKey: "weekly:2026-06-01",
    windowStartAt: new Date("2026-06-01T00:00:00.000Z"),
    windowEndAt: new Date("2026-06-08T00:00:00.000Z"),
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
    currentValue: 0,
    completedAt: null,
    rewardAwardId: null,
    metadata: {},
    updatedAt: now,
    ...overrides
  };
}

function streakStateRecord(
  overrides: Partial<GamificationStreakStateRecord> = {}
): GamificationStreakStateRecord {
  return {
    duoId: "duo-1",
    currentStreak: 0,
    longestStreak: 0,
    availableFreezes: 0,
    lastActivityDuoDay: null,
    updatedAt: now,
    ...overrides
  };
}

function achievementUnlockRecord(
  overrides: Partial<GamificationAchievementUnlockRecord> = {}
): GamificationAchievementUnlockRecord {
  return {
    id: "unlock-1",
    duoId: "duo-1",
    achievementSlug: "primeiro-save",
    sourceType: "live-session",
    sourceId: "00000000-0000-4000-8000-000000000101",
    unlockedByUserId: "member-1",
    metadata: {},
    unlockedAt: now,
    ...overrides
  };
}

function xpAwardRecord(
  overrides: Partial<GamificationXpLedgerRecord> = {}
): GamificationXpLedgerRecord {
  return {
    id: "award-1",
    duoId: "duo-1",
    awardKey: "live-session:00000000-0000-4000-8000-000000000101",
    sourceType: "live-session",
    sourceId: "00000000-0000-4000-8000-000000000101",
    amount: 30,
    reasonCode: "live-session-confirmed",
    awardedByUserId: "member-1",
    metadata: {},
    awardedAt: now,
    ...overrides
  };
}
