import {
  ACTIVE_MONTHLY_QUEST_SLOT,
  ACTIVE_WEEKLY_QUEST_SLOTS,
  SEASONAL_QUEST_SEEDS,
  getQuestTemplate,
  getQuestWindow,
  type QuestType
} from "../domain/quest-catalog";
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
  questTypes: QuestType[];
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
}> {
  let cyclesUpserted = 0;
  let skipped = 0;

  await input.repository.withUserTransaction(input.payload.createdByUserId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.payload.createdByUserId);

    if (!membership) {
      skipped += 1;
      return;
    }

    if (membership.duoId !== input.job.duoId) {
      throw new Error("gamification_job_duo_mismatch");
    }

    const timezone = await transaction.readDuoTimezone(membership.duoId);

    for (const questType of input.payload.questTypes) {
      cyclesUpserted += await rotateQuestType({
        duoId: membership.duoId,
        now: input.referenceDate,
        questType,
        timezone,
        transaction
      });
    }
  });

  return {
    cyclesUpserted,
    skipped
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

    const window = getQuestWindow({
      now: input.now,
      seasonalKey: template.seasonalKey,
      timezone: input.timezone,
      type: template.type
    });

    await input.transaction.upsertQuestCycle({
      cycleKey: window.cycleKey,
      duoId: input.duoId,
      questSlug: template.slug,
      questType: template.type,
      timezone: input.timezone,
      windowEndAt: duoWindowDate(window.endsOn),
      windowStartAt: duoWindowDate(window.startsOn)
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
  const questTypes = parseQuestTypes(payload.questTypes);

  if (typeof createdByUserId !== "string" || !createdByUserId.trim() || !questTypes) {
    return null;
  }

  if (payload.now !== undefined && !now) {
    return null;
  }

  return {
    createdByUserId,
    now,
    questTypes
  };
}

function parseQuestTypes(input: unknown): QuestType[] | null {
  if (input === undefined) {
    return ["weekly", "monthly", "seasonal"];
  }

  const values = Array.isArray(input) ? input : [input];

  if (values.every(isQuestType)) {
    return values;
  }

  return null;
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

function duoWindowDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function retryAt(now: Date, attempts: number): Date {
  const multiplier = Math.min(Math.max(attempts, 1), 4);

  return new Date(now.getTime() + RETRY_DELAY_MS * multiplier);
}
