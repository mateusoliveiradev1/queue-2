import "server-only";

import { gamificationRepository } from "./infrastructure/gamification-repository";
import {
  runQuestRotationJobsUseCase,
  type RunQuestRotationJobsResult
} from "./application/run-quest-rotation-jobs";
import {
  runStreakJobsUseCase,
  type RunStreakJobsResult
} from "./application/run-streak-jobs";

export {
  runQuestRotationJobsUseCase,
  type RunQuestRotationJobsResult
} from "./application/run-quest-rotation-jobs";
export {
  runStreakJobsUseCase,
  type RunStreakJobsResult
} from "./application/run-streak-jobs";

export type RunGamificationMaintenanceResult = {
  ok: true;
  questRotation: RunQuestRotationJobsResult;
  streakCheck: RunStreakJobsResult;
};

export async function runGamificationMaintenanceJobs(input: {
  now?: Date;
  questLimit?: number;
  streakLimit?: number;
  workerId?: string;
} = {}): Promise<RunGamificationMaintenanceResult> {
  const now = input.now ?? new Date();
  const workerId = input.workerId ?? "gamification-maintenance";
  const questRotation = await runQuestRotationJobsUseCase(
    {
      limit: input.questLimit,
      now,
      workerId: `${workerId}:quest-rotation`
    },
    gamificationRepository
  );
  const streakCheck = await runStreakJobsUseCase(
    {
      limit: input.streakLimit,
      now,
      workerId: `${workerId}:streak-check`
    },
    gamificationRepository
  );

  return {
    ok: true,
    questRotation,
    streakCheck
  };
}

export function isGamificationMaintenanceRequestAuthorized(
  request: Request,
  secret = process.env.CRON_SECRET
): boolean {
  if (!secret?.trim()) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
