import {
  SEASONAL_QUEST_WINDOWS,
  type QuestType
} from "./quest-catalog";

const STREAK_CHECK_HOUR = 4;

type CivilDate = {
  year: number;
  month: number;
  day: number;
};

type CivilDateTime = CivilDate & {
  hour: number;
  minute: number;
  second: number;
};

export function getNextQuestRotationAt(input: {
  after: Date;
  timezone: string;
  questType: QuestType;
}): Date {
  assertValidDate(input.after);
  assertValidTimezone(input.timezone);

  if (input.questType === "weekly") {
    return getNextWeeklyBoundary(input.after, input.timezone);
  }

  if (input.questType === "monthly") {
    return getNextMonthlyBoundary(input.after, input.timezone);
  }

  return getNextSeasonalBoundary(input.after, input.timezone);
}

export function getNextStreakCheckAt(input: {
  after: Date;
  timezone: string;
}): Date {
  assertValidDate(input.after);
  assertValidTimezone(input.timezone);
  const local = getLocalDateTimeParts(input.after, input.timezone);
  let candidate = civilDateTimeToUtc(
    {
      year: local.year,
      month: local.month,
      day: local.day,
      hour: STREAK_CHECK_HOUR,
      minute: 0,
      second: 0
    },
    input.timezone
  );

  if (candidate.getTime() <= input.after.getTime()) {
    const nextDay = addCivilDays(local, 1);
    candidate = civilDateTimeToUtc(
      {
        ...nextDay,
        hour: STREAK_CHECK_HOUR,
        minute: 0,
        second: 0
      },
      input.timezone
    );
  }

  return candidate;
}

export function getQuestWindowInstants(input: {
  startsOn: string;
  endsOn: string;
  timezone: string;
}): {
  startsAt: Date;
  endsAt: Date;
} {
  assertValidTimezone(input.timezone);
  const startsOn = parseCivilDate(input.startsOn);
  const endsOn = parseCivilDate(input.endsOn);

  return {
    startsAt: civilDateTimeToUtc(
      { ...startsOn, hour: 0, minute: 0, second: 0 },
      input.timezone
    ),
    endsAt: civilDateTimeToUtc(
      { ...endsOn, hour: 0, minute: 0, second: 0 },
      input.timezone
    )
  };
}

function getNextWeeklyBoundary(after: Date, timezone: string): Date {
  const local = getLocalDateTimeParts(after, timezone);
  const civilDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const daysSinceMonday = (civilDate.getUTCDay() + 6) % 7;
  civilDate.setUTCDate(civilDate.getUTCDate() - daysSinceMonday);
  let candidate = civilDateTimeToUtc(
    {
      year: civilDate.getUTCFullYear(),
      month: civilDate.getUTCMonth() + 1,
      day: civilDate.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  );

  if (candidate.getTime() <= after.getTime()) {
    civilDate.setUTCDate(civilDate.getUTCDate() + 7);
    candidate = civilDateTimeToUtc(
      {
        year: civilDate.getUTCFullYear(),
        month: civilDate.getUTCMonth() + 1,
        day: civilDate.getUTCDate(),
        hour: 0,
        minute: 0,
        second: 0
      },
      timezone
    );
  }

  return candidate;
}

function getNextMonthlyBoundary(after: Date, timezone: string): Date {
  const local = getLocalDateTimeParts(after, timezone);
  let year = local.year;
  let month = local.month;
  let candidate = civilDateTimeToUtc(
    { year, month, day: 1, hour: 0, minute: 0, second: 0 },
    timezone
  );

  if (candidate.getTime() <= after.getTime()) {
    month += 1;

    if (month > 12) {
      year += 1;
      month = 1;
    }

    candidate = civilDateTimeToUtc(
      { year, month, day: 1, hour: 0, minute: 0, second: 0 },
      timezone
    );
  }

  return candidate;
}

function getNextSeasonalBoundary(after: Date, timezone: string): Date {
  const local = getLocalDateTimeParts(after, timezone);
  const candidates: Date[] = [];

  for (let year = local.year - 1; year <= local.year + 2; year += 1) {
    for (const definition of Object.values(SEASONAL_QUEST_WINDOWS)) {
      const startMonth: number = definition.start.month;
      const startDay: number = definition.start.day;
      const endMonth: number = definition.end.month;
      const endDay: number = definition.end.day;
      const crossesYear =
        endMonth < startMonth
        || (
          endMonth === startMonth
          && endDay <= startDay
        );
      const boundaries: CivilDate[] = [
        {
          year,
          month: startMonth,
          day: startDay
        },
        {
          year: crossesYear ? year + 1 : year,
          month: endMonth,
          day: endDay
        }
      ];

      for (const boundary of boundaries) {
        const candidate = civilDateTimeToUtc(
          { ...boundary, hour: 0, minute: 0, second: 0 },
          timezone
        );

        if (candidate.getTime() > after.getTime()) {
          candidates.push(candidate);
        }
      }
    }
  }

  const next = candidates.sort((left, right) => left.getTime() - right.getTime())[0];

  if (!next) {
    throw new Error("gamification_seasonal_boundary_not_found");
  }

  return next;
}

function civilDateTimeToUtc(
  local: CivilDateTime,
  timezone: string
): Date {
  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second
  );
  const first = localAsUtc - getTimezoneOffsetMs(new Date(localAsUtc), timezone);
  const second = localAsUtc - getTimezoneOffsetMs(new Date(first), timezone);
  const result = new Date(second);
  const reconstructed = getLocalDateTimeParts(result, timezone);

  if (
    reconstructed.year !== local.year
    || reconstructed.month !== local.month
    || reconstructed.day !== local.day
    || reconstructed.hour !== local.hour
    || reconstructed.minute !== local.minute
  ) {
    throw new Error("invalid_gamification_civil_time");
  }

  return result;
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = getLocalDateTimeParts(date, timezone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return zonedAsUtc - date.getTime();
}

function getLocalDateTimeParts(date: Date, timezone: string): CivilDateTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day));
  result.setUTCDate(result.getUTCDate() + days);

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate()
  };
}

function parseCivilDate(value: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("invalid_gamification_civil_date");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const reconstructed = new Date(Date.UTC(year, month - 1, day));

  if (
    reconstructed.getUTCFullYear() !== year
    || reconstructed.getUTCMonth() + 1 !== month
    || reconstructed.getUTCDate() !== day
  ) {
    throw new Error("invalid_gamification_civil_date");
  }

  return { year, month, day };
}

function assertValidTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new Error("invalid_gamification_timezone");
  }
}

function assertValidDate(date: Date): void {
  if (!Number.isFinite(date.getTime())) {
    throw new Error("invalid_gamification_schedule_date");
  }
}
