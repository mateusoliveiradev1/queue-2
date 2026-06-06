import {
  getDuoDayKey
} from "../domain/streak-policy";
import { getNextStreakCheckAt } from "../domain/gamification-schedule";
import type {
  GamificationDueJobRecord,
  GamificationRepository,
  GamificationStreakStateRecord,
  GamificationUserId
} from "./ports";

const STREAK_CHECK_JOB_TYPE = "gamification-streak-check" as const;
const DEFAULT_LIMIT = 25;
const RETRY_DELAY_MS = 15 * 60 * 1000;

export type RunStreakJobsResult = {
  ok: true;
  claimed: number;
  completed: number;
  failed: number;
  freezesConsumed: number;
  streaksReset: number;
  skipped: number;
};

type StreakCheckPayload = {
  createdByUserId: GamificationUserId;
  checkAt: Date;
};

export async function runStreakJobsUseCase(
  input: {
    now?: Date;
    limit?: number;
    workerId?: string;
  },
  repository: GamificationRepository
): Promise<RunStreakJobsResult> {
  const now = input.now ?? new Date();
  const jobs = await repository.claimDueGamificationJobs({
    jobTypes: [STREAK_CHECK_JOB_TYPE],
    limit: input.limit ?? DEFAULT_LIMIT,
    now,
    workerId: input.workerId ?? "gamification-streak-check"
  });
  let completed = 0;
  let failed = 0;
  let freezesConsumed = 0;
  let streaksReset = 0;
  let skipped = 0;

  for (const job of jobs) {
    try {
      const payload = parseStreakCheckPayload(job.payload);

      if (!payload) {
        throw new Error("invalid_streak_check_payload");
      }

      const result = await processStreakCheckJob({
        checkAt: payload.checkAt,
        job,
        payload,
        repository
      });

      if (result.outcome === "freeze-consumed") {
        freezesConsumed += 1;
      } else if (result.outcome === "reset") {
        streaksReset += 1;
      } else {
        skipped += 1;
      }

      const nextRunAt = getNextStreakCheckAt({
        after: payload.checkAt,
        timezone: result.timezone
      });
      await repository.enqueueGamificationJob({
        createdByUserId: payload.createdByUserId,
        duoId: job.duoId,
        jobKey: buildSuccessorJobKey(job.duoId, nextRunAt),
        payload: {
          checkAt: nextRunAt.toISOString()
        },
        runAt: nextRunAt,
        scheduleKind: "streak"
      });
      await repository.completeGamificationJob(job.id);
      completed += 1;
    } catch (error) {
      failed += 1;
      await repository.failGamificationJob({
        errorMessage: error instanceof Error ? error.message : "unknown_streak_check_error",
        jobId: job.id,
        retryAt: retryAt(now, job.attempts)
      });
    }
  }

  return {
    ok: true,
    claimed: jobs.length,
    completed,
    failed,
    freezesConsumed,
    streaksReset,
    skipped
  };
}

async function processStreakCheckJob(input: {
  checkAt: Date;
  job: GamificationDueJobRecord;
  payload: StreakCheckPayload;
  repository: GamificationRepository;
}): Promise<{
  outcome: "freeze-consumed" | "reset" | "skipped";
  timezone: string;
}> {
  let outcome: "freeze-consumed" | "reset" | "skipped" = "skipped";
  let timezone: string | null = null;

  await input.repository.withUserTransaction(input.payload.createdByUserId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.payload.createdByUserId);

    if (!membership) {
      throw new Error("gamification_job_membership_required");
    }

    if (membership.duoId !== input.job.duoId) {
      throw new Error("gamification_job_duo_mismatch");
    }

    const projection = await transaction.lockProjection(membership.duoId);

    if (!projection) {
      throw new Error("projection_not_found");
    }

    const [resolvedTimezone, state] = await Promise.all([
      transaction.readDuoTimezone(membership.duoId),
      transaction.readStreakState(membership.duoId)
    ]);
    timezone = resolvedTimezone;

    if (!state?.lastActivityDuoDay || state.currentStreak <= 0) {
      return;
    }

    const currentDuoDay = getDuoDayKey({
      occurredAt: input.checkAt,
      timezone: resolvedTimezone
    });
    const gap = daysBetween(state.lastActivityDuoDay, currentDuoDay);

    if (gap <= 1) {
      return;
    }

    if (state.availableFreezes > 0) {
      const protectedDuoDay = addDuoDays(state.lastActivityDuoDay, 1);
      const inserted = await transaction.insertStreakEvent({
        duoDay: protectedDuoDay,
        duoId: membership.duoId,
        eventKey: `streak-freeze:${protectedDuoDay}`,
        eventType: "freeze-consumed",
        freezeDelta: -1,
        metadata: {
          jobId: input.job.id,
          reason: "maintenance-gap-buffer"
        },
        sourceType: "streak"
      });

      if (!inserted) {
        return;
      }

      const nextState = nextStreakState(state, {
        availableFreezes: state.availableFreezes - 1,
        lastActivityDuoDay: protectedDuoDay
      });
      await transaction.upsertStreakState(nextState);
      await transaction.updateProjection({
        availableFreezes: nextState.availableFreezes,
        duoId: membership.duoId,
        streak: nextState.currentStreak,
        xpDelta: 0
      });
      outcome = "freeze-consumed";
      return;
    }

    const inserted = await transaction.insertStreakEvent({
      deltaDays: -state.currentStreak,
      duoDay: currentDuoDay,
      duoId: membership.duoId,
      eventKey: `streak-reset:${currentDuoDay}`,
      eventType: "streak-reset",
      freezeDelta: 0,
      metadata: {
        jobId: input.job.id,
        reason: "maintenance-gap-reset"
      },
      sourceType: "streak"
    });

    if (!inserted) {
      return;
    }

    const nextState = nextStreakState(state, {
      availableFreezes: 0,
      currentStreak: 0,
      lastActivityDuoDay: null
    });
    await transaction.upsertStreakState(nextState);
    await transaction.updateProjection({
      availableFreezes: nextState.availableFreezes,
      duoId: membership.duoId,
      streak: nextState.currentStreak,
      xpDelta: 0
    });
    outcome = "reset";
  });

  if (!timezone) {
    throw new Error("gamification_job_timezone_required");
  }

  return {
    outcome,
    timezone
  };
}

function parseStreakCheckPayload(payload: Record<string, unknown>): StreakCheckPayload | null {
  const createdByUserId = payload.createdByUserId;
  const checkAt = parseOptionalDate(payload.checkAt);

  if (
    typeof createdByUserId !== "string"
    || !createdByUserId.trim()
    || !checkAt
  ) {
    return null;
  }

  return {
    createdByUserId,
    checkAt
  };
}

function parseOptionalDate(input: unknown): Date | null {
  if (input === undefined) {
    return null;
  }

  if (typeof input !== "string") {
    return null;
  }

  const date = new Date(input);

  return Number.isFinite(date.getTime()) ? date : null;
}

function nextStreakState(
  state: GamificationStreakStateRecord,
  overrides: Partial<GamificationStreakStateRecord>
): GamificationStreakStateRecord {
  return {
    ...state,
    ...overrides
  };
}

function daysBetween(startDay: string, endDay: string): number {
  const start = Date.parse(`${startDay}T00:00:00.000Z`);
  const end = Date.parse(`${endDay}T00:00:00.000Z`);

  return Math.round((end - start) / 86_400_000);
}

function addDuoDays(duoDay: string, days: number): string {
  const date = new Date(`${duoDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildSuccessorJobKey(duoId: string, nextRunAt: Date): string {
  return `gamification:${duoId}:streak:${nextRunAt.toISOString()}`;
}

function retryAt(now: Date, attempts: number): Date {
  const multiplier = Math.min(Math.max(attempts, 1), 4);

  return new Date(now.getTime() + RETRY_DELAY_MS * multiplier);
}
