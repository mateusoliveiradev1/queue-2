import { describe, expect, it, vi } from "vitest";

import { runReminderJobsUseCase } from "../src/modules/play/application/run-reminder-jobs";
import type {
  PlayMembershipContext,
  PlayNotificationRecord,
  PlayPushSubscriptionRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlayScheduledSessionRecord
} from "../src/modules/play/application/ports";

describe("Phase 04.5 reminder jobs", () => {
  it("claims due reminders, creates Central notice and sends push without duplicate job effects", async () => {
    const job = reminderJobRecord();
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord(input)
    );
    const sendProductPushNotification = vi.fn(async () => "sent" as const);
    const repository = makeReminderRepository({
      jobs: [job],
      transaction: {
        insertNotificationItem
      }
    });

    await expect(
      runReminderJobsUseCase(
        {
          now: job.runAt,
          workerId: "test-worker"
        },
        repository,
        { sendProductPushNotification }
      )
    ).resolves.toEqual({
      ok: true,
      claimed: 1,
      completed: 1,
      failed: 0
    });
    expect(insertNotificationItem).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "reminder-sent",
        actionRefId: "scheduled-1"
      })
    );
    expect(sendProductPushNotification).toHaveBeenCalled();
    expect(repository.completeReminderJob).toHaveBeenCalledWith({
      jobId: "job-1",
      processedAt: job.runAt
    });
  });

  it("completes stale reminder jobs without sending visible reminders", async () => {
    const job = reminderJobRecord({
      runAt: new Date("2026-06-06T21:30:00.000Z")
    });
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord(input)
    );
    const repository = makeReminderRepository({
      jobs: [job],
      transaction: {
        insertNotificationItem,
        readScheduledSessionDetail: vi.fn(async () => scheduledSessionRecord())
      }
    });

    await runReminderJobsUseCase(
      {
        now: job.runAt,
        workerId: "test-worker"
      },
      repository,
      { sendProductPushNotification: vi.fn(async () => "sent" as const) }
    );

    expect(insertNotificationItem).not.toHaveBeenCalled();
    expect(repository.completeReminderJob).toHaveBeenCalledWith({
      jobId: "job-1",
      processedAt: job.runAt
    });
  });

  it("keeps push delivery failures retryable while recording Central failure notices", async () => {
    const job = reminderJobRecord({ attempts: 1 });
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord(input)
    );
    const repository = makeReminderRepository({
      jobs: [job],
      transaction: {
        insertNotificationItem
      }
    });

    await expect(
      runReminderJobsUseCase(
        {
          now: job.runAt,
          workerId: "test-worker"
        },
        repository,
        { sendProductPushNotification: vi.fn(async () => "failed" as const) }
      )
    ).resolves.toEqual({
      ok: true,
      claimed: 1,
      completed: 0,
      failed: 1
    });
    expect(insertNotificationItem).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "reminder-sent"
      })
    );
    expect(insertNotificationItem).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "push-failure",
        recipientUserId: "member-1"
      })
    );
    expect(repository.failReminderJob).toHaveBeenCalledWith({
      error: "push_delivery_failed",
      jobId: "job-1"
    });
    expect(repository.completeReminderJob).not.toHaveBeenCalled();
  });

  it("retries push without duplicating visible Central notices on later attempts", async () => {
    const job = reminderJobRecord({ attempts: 2 });
    const insertNotificationItem = vi.fn<PlayRepositoryTransaction["insertNotificationItem"]>(
      async (input) => notificationRecord(input)
    );
    const sendProductPushNotification = vi.fn(async () => "sent" as const);
    const repository = makeReminderRepository({
      jobs: [job],
      transaction: {
        insertNotificationItem
      }
    });

    await runReminderJobsUseCase(
      {
        now: job.runAt,
        workerId: "test-worker"
      },
      repository,
      { sendProductPushNotification }
    );

    expect(sendProductPushNotification).toHaveBeenCalled();
    expect(insertNotificationItem).not.toHaveBeenCalled();
    expect(repository.completeReminderJob).toHaveBeenCalledWith({
      jobId: "job-1",
      processedAt: job.runAt
    });
  });
});

function makeReminderRepository(input: {
  jobs: PlayReminderJobRecord[];
  transaction?: Partial<PlayRepositoryTransaction>;
}): PlayRepository {
  const membership: PlayMembershipContext = {
    duoId: "duo-1",
    userId: "member-1",
    partnerUserId: "member-2",
    memberUserIds: ["member-1", "member-2"]
  };
  const transaction = {
    resolveMembership: vi.fn(async () => membership),
    readScheduledSessionDetail: vi.fn(async () => scheduledSessionRecord()),
    insertNotificationItem: vi.fn(async (notificationInput) => notificationRecord(notificationInput)),
    ...input.transaction
  } as unknown as PlayRepositoryTransaction;

  return {
    withUserTransaction: vi.fn(async (_userId, callback) => callback(transaction)),
    resolveMembership: vi.fn(async () => membership),
    readCurrentPlay: vi.fn(),
    readGamePlayDetail: vi.fn(),
    readGameTimeline: vi.fn(),
    readActivePlayGames: vi.fn(),
    upsertActiveRoleRows: vi.fn(),
    createSessionConfirmation: vi.fn(),
    cancelConfirmation: vi.fn(),
    insertNotificationItem: vi.fn(),
    insertXpAward: vi.fn(),
    readNotificationCenter: vi.fn(),
    registerPushSubscription: vi.fn(),
    disablePushSubscriptions: vi.fn(),
    claimDueReminderJobs: vi.fn(async () => input.jobs),
    completeReminderJob: vi.fn(),
    failReminderJob: vi.fn(),
    runAsUser: vi.fn(async (_userId, callback) => callback(transaction)),
    readEnabledPushSubscriptions: vi.fn(async () => [pushSubscriptionRecord()])
  };
}

function reminderJobRecord(overrides: Partial<PlayReminderJobRecord> = {}): PlayReminderJobRecord {
  return {
    id: "job-1",
    duoId: "duo-1",
    jobKey: "play-session-reminder:scheduled-1",
    jobType: "play-session-reminder",
    runAt: new Date("2026-06-06T22:30:00.000Z"),
    status: "pending",
    attempts: 0,
    payload: {
      createdByUserId: "member-1",
      scheduledSessionId: "scheduled-1",
      scheduledStartAt: "2026-06-06T23:00:00.000Z"
    },
    ...overrides
  };
}

function scheduledSessionRecord(
  overrides: Partial<PlayScheduledSessionRecord> = {}
): PlayScheduledSessionRecord {
  return {
    id: "scheduled-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    scheduledStartAt: new Date("2026-06-06T23:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    status: "scheduled",
    reminderDueAt: new Date("2026-06-06T22:30:00.000Z"),
    createdByUserId: "member-1",
    updatedByUserId: "member-1",
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    confirmedByUserIds: [],
    pendingUserIds: ["member-1", "member-2"],
    confirmationCount: 0,
    requiredConfirmationCount: 2,
    doubleConfirmed: false,
    ...overrides
  };
}

function notificationRecord(
  overrides: Partial<PlayNotificationRecord> = {}
): PlayNotificationRecord {
  return {
    id: "notification-1",
    duoId: "duo-1",
    recipientUserId: null,
    notificationType: "reminder-sent",
    state: "unread",
    actionRefType: "scheduled_session",
    actionRefId: "scheduled-1",
    title: "Lembrete da sessao",
    body: null,
    createdAt: new Date("2026-06-06T22:30:00.000Z"),
    ...overrides
  };
}

function pushSubscriptionRecord(
  overrides: Partial<PlayPushSubscriptionRecord> = {}
): PlayPushSubscriptionRecord {
  return {
    id: "push-1",
    duoId: "duo-1",
    userId: "member-1",
    endpoint: "https://push.example.test/sub",
    p256dh: "p256dh_key",
    authSecret: "auth_secret",
    enabled: true,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}
