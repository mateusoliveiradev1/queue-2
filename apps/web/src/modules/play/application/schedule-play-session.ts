import {
  canSchedulePlayingGame,
  getReminderDueAt
} from "../domain/play-policy";
import type {
  PlayReminderJobRecord,
  PlayRepository,
  PlayScheduledSessionRecord
} from "./ports";

export type SchedulePlaySessionResult =
  | {
      ok: true;
      job: PlayReminderJobRecord;
      scheduledSession: PlayScheduledSessionRecord;
      state: "scheduled" | "rescheduled";
    }
  | {
      ok: false;
      reason:
        | "invalid-scheduled-time"
        | "library-game-not-found"
        | "membership-required"
        | "not-playing"
        | "scheduled-session-not-found";
    };

export type CancelScheduledSessionResult =
  | {
      ok: true;
      scheduledSession: PlayScheduledSessionRecord;
    }
  | {
      ok: false;
      reason: "membership-required" | "scheduled-session-not-found";
    };

export async function schedulePlaySessionUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    scheduledLocalDateTime: string;
    scheduledSessionId?: string | null;
    now?: Date;
  },
  repository: PlayRepository
): Promise<SchedulePlaySessionResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const detail = await transaction.readGamePlayDetail({
      duoId: membership.duoId,
      catalogGameId: input.catalogGameId
    });

    if (!detail) {
      return { ok: false, reason: "library-game-not-found" };
    }

    if (!canSchedulePlayingGame({ libraryStatus: detail.libraryStatus }).ok || !detail.activeGame) {
      return { ok: false, reason: "not-playing" };
    }

    const timezone = await transaction.readDuoTimezone({ duoId: membership.duoId });
    const scheduledStartAt = parseLocalDateTimeInZone(
      input.scheduledLocalDateTime,
      timezone
    );
    const now = input.now ?? new Date();

    if (!scheduledStartAt || scheduledStartAt.getTime() <= now.getTime() - 60_000) {
      return { ok: false, reason: "invalid-scheduled-time" };
    }

    const reminderDueAt = getReminderDueAt(scheduledStartAt);
    const scheduledSessionId = input.scheduledSessionId?.trim() || null;
    const scheduledSession = scheduledSessionId
      ? await transaction.updateScheduledSession({
          actorUserId: input.userId,
          duoId: membership.duoId,
          libraryGameId: detail.libraryGameId,
          memberUserIds: membership.memberUserIds,
          reminderDueAt,
          scheduledSessionId,
          scheduledStartAt,
          timezone
        })
      : await transaction.createScheduledSession({
          actorUserId: input.userId,
          duoId: membership.duoId,
          libraryGameId: detail.libraryGameId,
          memberUserIds: membership.memberUserIds,
          reminderDueAt,
          scheduledStartAt,
          timezone
        });

    if (!scheduledSession) {
      return { ok: false, reason: "scheduled-session-not-found" };
    }

    const job = await transaction.insertReminderJob({
      createdByUserId: input.userId,
      duoId: membership.duoId,
      runAt: reminderDueAt,
      scheduledSessionId: scheduledSession.id,
      scheduledStartAt
    });

    await transaction.insertNotificationItem({
      actionRefId: scheduledSession.id,
      actionRefType: "scheduled_session",
      actorUserId: input.userId,
      body: "A dupla tem uma sessao futura combinada. O lembrete fica preparado, mas a precisao depende do runner configurado.",
      duoId: membership.duoId,
      notificationType: "scheduled-session",
      title: scheduledSessionId ? "Sessao reagendada" : "Sessao agendada"
    });

    return {
      ok: true,
      job,
      scheduledSession,
      state: scheduledSessionId ? "rescheduled" : "scheduled"
    };
  });
}

export async function cancelScheduledSessionUseCase(
  input: {
    userId: string;
    scheduledSessionId: string;
  },
  repository: PlayRepository
): Promise<CancelScheduledSessionResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const scheduledSession = await transaction.cancelScheduledSession({
      actorUserId: input.userId,
      duoId: membership.duoId,
      memberUserIds: membership.memberUserIds,
      scheduledSessionId: input.scheduledSessionId
    });

    if (!scheduledSession) {
      return { ok: false, reason: "scheduled-session-not-found" };
    }

    await transaction.insertNotificationItem({
      actionRefId: scheduledSession.id,
      actionRefType: "scheduled_session",
      actorUserId: input.userId,
      body: "A sessao agendada foi cancelada sem alterar o progresso da dupla.",
      duoId: membership.duoId,
      notificationType: "scheduled-session",
      title: "Sessao cancelada"
    });

    return {
      ok: true,
      scheduledSession
    };
  });
}

export function parseLocalDateTimeInZone(
  value: string,
  timezone: string
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);

  if (
    !year ||
    !month ||
    !day ||
    hour === undefined ||
    minute === undefined ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const first = localAsUtc - getTimezoneOffsetMs(new Date(localAsUtc), timezone);
  const second = localAsUtc - getTimezoneOffsetMs(new Date(first), timezone);

  return new Date(second);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      second: "2-digit",
      timeZone: timezone,
      year: "numeric"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const zonedAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );

    return zonedAsUtc - date.getTime();
  } catch {
    return 0;
  }
}
