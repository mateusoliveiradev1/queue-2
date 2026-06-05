import "server-only";

import { playRepository } from "./infrastructure/play-repository";
import { runReminderJobsUseCase } from "./application/run-reminder-jobs";
import { sendProductPushNotification } from "./infrastructure/push-service";

export {
  runReminderJobsUseCase,
  type RunReminderJobsResult
} from "./application/run-reminder-jobs";

export function runReminderJobs(input: {
  now?: Date;
  limit?: number;
  workerId?: string;
} = {}) {
  return runReminderJobsUseCase(input, playRepository, {
    sendProductPushNotification
  });
}

export function isPlayReminderRequestAuthorized(
  request: Request,
  secret = process.env.CRON_SECRET
): boolean {
  if (!secret?.trim()) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
