import type {
  PlayPushSubscriptionRecord,
  PlayReminderJobRecord,
  PlayRepository
} from "./ports";

export type ProductPushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

export type ProductPushSender = (input: {
  payload: ProductPushPayload;
  subscription: PlayPushSubscriptionRecord;
}) => Promise<"sent" | "push-not-configured" | "failed">;

export type RunReminderJobsResult = {
  ok: true;
  claimed: number;
  completed: number;
  failed: number;
};

export async function runReminderJobsUseCase(
  input: {
    now?: Date;
    limit?: number;
    workerId?: string;
  },
  repository: PlayRepository,
  dependencies: {
    sendProductPushNotification: ProductPushSender;
  } = {
    sendProductPushNotification: async () => "push-not-configured"
  }
): Promise<RunReminderJobsResult> {
  const now = input.now ?? new Date();
  const jobs = await repository.claimDueReminderJobs({
    limit: input.limit ?? 25,
    now,
    workerId: input.workerId ?? "play-reminders"
  });
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const result = await processReminderJob(job, repository, dependencies);

      if (result === "retry") {
        await repository.failReminderJob({
          error: "push_delivery_failed",
          jobId: job.id
        });
        failed += 1;
      } else {
        await repository.completeReminderJob({
          jobId: job.id,
          processedAt: now
        });
        completed += 1;
      }
    } catch (error) {
      failed += 1;
      await repository.failReminderJob({
        error: error instanceof Error ? error.message : "unknown",
        jobId: job.id
      });
    }
  }

  return {
    ok: true,
    claimed: jobs.length,
    completed,
    failed
  };
}

async function processReminderJob(
  job: PlayReminderJobRecord,
  repository: PlayRepository,
  dependencies: {
    sendProductPushNotification: ProductPushSender;
  }
): Promise<"completed" | "retry"> {
  if (job.jobType !== "play-session-reminder") {
    return "completed";
  }

  const payload = parseReminderPayload(job.payload);

  if (!payload) {
    throw new Error("invalid_reminder_payload");
  }

  let shouldRetry = false;
  const shouldInsertVisibleEffect = job.attempts <= 1;

  await repository.runAsUser(payload.createdByUserId, async (transaction) => {
    const membership = await transaction.resolveMembership(payload.createdByUserId);

    if (!membership) {
      return;
    }

    const scheduledSession = await transaction.readScheduledSessionDetail({
      duoId: membership.duoId,
      memberUserIds: membership.memberUserIds,
      scheduledSessionId: payload.scheduledSessionId
    });

    if (
      !scheduledSession ||
      scheduledSession.status !== "scheduled" ||
      scheduledSession.reminderDueAt.getTime() !== job.runAt.getTime() ||
      scheduledSession.scheduledStartAt.toISOString() !== payload.scheduledStartAt
    ) {
      return;
    }

    if (shouldInsertVisibleEffect) {
      await transaction.insertNotificationItem({
        actionRefId: scheduledSession.id,
        actionRefType: "scheduled_session",
        body: "A sessao combinada esta chegando. A entrega push depende das permissoes deste navegador.",
        duoId: membership.duoId,
        notificationType: "reminder-sent",
        title: "Lembrete da sessao"
      });
    }

    for (const userId of membership.memberUserIds) {
      const subscriptions = await repository.readEnabledPushSubscriptions({ userId });
      let failedPushCount = 0;

      for (const subscription of subscriptions) {
        const result = await dependencies.sendProductPushNotification({
          payload: {
            body: "Faltam cerca de 30 minutos para a sessao combinada da dupla.",
            tag: `play-session-${scheduledSession.id}`,
            title: "Sessao da dupla em breve",
            url: "/app"
          },
          subscription
        });

        if (result !== "sent") {
          failedPushCount += 1;
        }
      }

      if (failedPushCount > 0) {
        shouldRetry = true;

        if (shouldInsertVisibleEffect) {
          await transaction.insertNotificationItem({
            actionRefId: scheduledSession.id,
            actionRefType: "scheduled_session",
            body: "Um alerta push nao foi entregue neste navegador. A Central da Dupla continua funcionando.",
            duoId: membership.duoId,
            notificationType: "push-failure",
            recipientUserId: userId,
            title: "Push nao entregue"
          });
        }
      }
    }
  });

  return shouldRetry ? "retry" : "completed";
}

function parseReminderPayload(payload: Record<string, unknown>):
  | {
      createdByUserId: string;
      scheduledSessionId: string;
      scheduledStartAt: string;
    }
  | null {
  const createdByUserId = payload.createdByUserId;
  const scheduledSessionId = payload.scheduledSessionId;
  const scheduledStartAt = payload.scheduledStartAt;

  if (
    typeof createdByUserId !== "string" ||
    typeof scheduledSessionId !== "string" ||
    typeof scheduledStartAt !== "string"
  ) {
    return null;
  }

  return {
    createdByUserId,
    scheduledSessionId,
    scheduledStartAt
  };
}
