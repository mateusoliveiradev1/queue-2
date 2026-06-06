import {
  ACTIVE_MONTHLY_QUEST_SLOT,
  ACTIVE_WEEKLY_QUEST_SLOTS,
  SEASONAL_QUEST_SEEDS,
  getQuestTemplate,
  getQuestWindow,
  isSeasonalQuestActive,
  type QuestType
} from "../domain/quest-catalog";
import {
  getNextQuestRotationAt,
  getQuestWindowInstants
} from "../domain/gamification-schedule";
import type {
  GamificationDueJobRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationUserId
} from "./ports";

const QUEST_ROTATION_JOB_TYPE = "gamification-quest-rotation" as const;
const DEFAULT_LIMIT = 25;
const RETRY_DELAY_MS = 15 * 60 * 1000;

export type RunQuestRotationJobsResult = {
  ok: true;
  claimed: number;
  completed: number;
  failed: number;
  cyclesUpserted: number;
  skipped: number;
};

type QuestRotationPayload = {
  createdByUserId: GamificationUserId;
  now: Date | null;
  questType: QuestType;
};

export async function runQuestRotationJobsUseCase(
  input: {
    now?: Date;
    limit?: number;
    workerId?: string;
  },
  repository: GamificationRepository
): Promise<RunQuestRotationJobsResult> {
  const now = input.now ?? new Date();
  const jobs = await repository.claimDueGamificationJobs({
    jobTypes: [QUEST_ROTATION_JOB_TYPE],
    limit: input.limit ?? DEFAULT_LIMIT,
    now,
    workerId: input.workerId ?? "gamification-quest-rotation"
  });
  let completed = 0;
  let failed = 0;
  let cyclesUpserted = 0;
  let skipped = 0;

  for (const job of jobs) {
    try {
      const payload = parseQuestRotationPayload(job.payload);

      if (!payload) {
        throw new Error("invalid_quest_rotation_payload");
      }

      const result = await processQuestRotationJob({
        job,
        payload,
        repository,
        referenceDate: payload.now ?? job.runAt
      });

      cyclesUpserted += result.cyclesUpserted;
      skipped += result.skipped;
      const nextRunAt = getNextQuestRotationAt({
        after: payload.now ?? job.runAt,
        questType: payload.questType,
        timezone: result.timezone
      });
      await repository.enqueueGamificationJob({
        createdByUserId: payload.createdByUserId,
        duoId: job.duoId,
        jobKey: buildSuccessorJobKey(job.duoId, payload.questType, nextRunAt),
        payload: {
          questType: payload.questType
        },
        runAt: nextRunAt,
        scheduleKind: payload.questType
      });
      await repository.completeGamificationJob(job.id);
      completed += 1;
    } catch (error) {
      failed += 1;
      await repository.failGamificationJob({
        errorMessage: error instanceof Error ? error.message : "unknown_quest_rotation_error",
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
    cyclesUpserted,
    skipped
  };
}

async function processQuestRotationJob(input: {
  job: GamificationDueJobRecord;
  payload: QuestRotationPayload;
  referenceDate: Date;
  repository: GamificationRepository;
}): Promise<{
  cyclesUpserted: number;
  skipped: number;
  timezone: string;
}> {
  let cyclesUpserted = 0;
  const skipped = 0;
  let timezone: string | null = null;

  await input.repository.withUserTransaction(input.payload.createdByUserId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.payload.createdByUserId);

    if (!membership) {
      throw new Error("gamification_job_membership_required");
    }

    if (membership.duoId !== input.job.duoId) {
      throw new Error("gamification_job_duo_mismatch");
    }

    timezone = await transaction.readDuoTimezone(membership.duoId);
    cyclesUpserted += await rotateQuestType({
      duoId: membership.duoId,
      now: input.referenceDate,
      questType: input.payload.questType,
      timezone,
      transaction
    });
  });

  if (!timezone) {
    throw new Error("gamification_job_timezone_required");
  }

  return {
    cyclesUpserted,
    skipped,
    timezone
  };
}

async function rotateQuestType(input: {
  duoId: string;
  now: Date;
  questType: QuestType;
  timezone: string;
  transaction: GamificationRepositoryTransaction;
}): Promise<number> {
  const questSlugs = getQuestSlugsForType(input.questType);
  let count = 0;

  for (const questSlug of questSlugs) {
    const template = getQuestTemplate(questSlug);

    if (!template) {
      continue;
    }

    if (
      template.type === "seasonal"
      && template.seasonalKey
      && !isSeasonalQuestActive({
        now: input.now,
        seasonalKey: template.seasonalKey,
        timezone: input.timezone
      })
    ) {
      continue;
    }

    const window = getQuestWindow({
      now: input.now,
      seasonalKey: template.seasonalKey,
      timezone: input.timezone,
      type: template.type
    });
    const instants = getQuestWindowInstants(window);

    await input.transaction.upsertQuestCycle({
      cycleKey: window.cycleKey,
      duoId: input.duoId,
      questSlug: template.slug,
      questType: template.type,
      timezone: input.timezone,
      windowEndAt: instants.endsAt,
      windowStartAt: instants.startsAt
    });
    count += 1;
  }

  return count;
}

function getQuestSlugsForType(questType: QuestType): readonly string[] {
  if (questType === "weekly") {
    return ACTIVE_WEEKLY_QUEST_SLOTS;
  }

  if (questType === "monthly") {
    return [ACTIVE_MONTHLY_QUEST_SLOT];
  }

  return SEASONAL_QUEST_SEEDS;
}

function parseQuestRotationPayload(payload: Record<string, unknown>): QuestRotationPayload | null {
  const createdByUserId = payload.createdByUserId;
  const now = parseOptionalDate(payload.now);
  const questType = payload.questType;

  if (
    typeof createdByUserId !== "string"
    || !createdByUserId.trim()
    || !isQuestType(questType)
  ) {
    return null;
  }

  if (payload.now !== undefined && !now) {
    return null;
  }

  return {
    createdByUserId,
    now,
    questType
  };
}

function isQuestType(input: unknown): input is QuestType {
  return input === "weekly" || input === "monthly" || input === "seasonal";
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

function buildSuccessorJobKey(
  duoId: string,
  questType: QuestType,
  nextRunAt: Date
): string {
  return `gamification:${duoId}:${questType}:${nextRunAt.toISOString()}`;
}

function retryAt(now: Date, attempts: number): Date {
  const multiplier = Math.min(Math.max(attempts, 1), 4);

  return new Date(now.getTime() + RETRY_DELAY_MS * multiplier);
}
