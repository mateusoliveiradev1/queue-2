export const DUO_DAY_CUTOFF_HOUR = 4;
export const FREEZE_LEVEL_INTERVAL = 10;

export type StreakFactType =
  | "confirmed-session"
  | "completed-chapter"
  | "completed-quest"
  | "confirmed-scheduled-attendance"
  | "confirmed-terminal-status";

export type StreakTransitionInput = {
  currentDuoDay: string;
  lastActivityDuoDay: string | null;
  currentStreak: number;
  availableFreezes: number;
};

export type StreakTransition = {
  nextStreak: number;
  availableFreezes: number;
  consumedFreeze: boolean;
  consumedFreezes: number;
  reset: boolean;
};

export function getDuoDayKey(input: {
  occurredAt: Date;
  timezone: string;
}): string {
  const local = getLocalDateTimeParts(input.occurredAt, input.timezone);
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const duoDay = local.hour < DUO_DAY_CUTOFF_HOUR
    ? addDays(localDate, -1)
    : localDate;

  return formatDate(duoDay);
}

export function isStreakEligibleFact(factType: string): factType is StreakFactType {
  return [
    "confirmed-session",
    "completed-chapter",
    "completed-quest",
    "confirmed-scheduled-attendance",
    "confirmed-terminal-status"
  ].includes(factType);
}

export function evaluateStreakTransition(
  input: StreakTransitionInput
): StreakTransition {
  const currentStreak = Math.max(0, input.currentStreak);
  const availableFreezes = Math.max(0, input.availableFreezes);

  if (!input.lastActivityDuoDay) {
    return {
      nextStreak: 1,
      availableFreezes,
      consumedFreeze: false,
      consumedFreezes: 0,
      reset: false
    };
  }

  const gap = daysBetween(input.lastActivityDuoDay, input.currentDuoDay);

  if (gap <= 0) {
    return {
      nextStreak: currentStreak,
      availableFreezes,
      consumedFreeze: false,
      consumedFreezes: 0,
      reset: false
    };
  }

  if (gap === 1) {
    return {
      nextStreak: currentStreak + 1,
      availableFreezes,
      consumedFreeze: false,
      consumedFreezes: 0,
      reset: false
    };
  }

  const missedDuoDays = gap - 1;
  const consumedFreezes = Math.min(availableFreezes, missedDuoDays);

  if (consumedFreezes === missedDuoDays) {
    return {
      nextStreak: currentStreak + 1,
      availableFreezes: availableFreezes - consumedFreezes,
      consumedFreeze: consumedFreezes > 0,
      consumedFreezes,
      reset: false
    };
  }

  return {
    nextStreak: 1,
    availableFreezes: availableFreezes - consumedFreezes,
    consumedFreeze: consumedFreezes > 0,
    consumedFreezes,
    reset: true
  };
}

export function getFreezeCountForLevel(level: number): number {
  return Math.floor(Math.max(0, level) / FREEZE_LEVEL_INTERVAL);
}

export function getFreezeEarnedForLevelChange(input: {
  previousLevel: number;
  nextLevel: number;
}): number {
  return Math.max(
    0,
    getFreezeCountForLevel(input.nextLevel)
      - getFreezeCountForLevel(input.previousLevel)
  );
}

function getLocalDateTimeParts(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: normalizeHour(value("hour"))
  };
}

function normalizeHour(hour: number): number {
  return hour === 24 ? 0 : hour;
}

function daysBetween(startDay: string, endDay: string): number {
  const start = Date.parse(`${startDay}T00:00:00.000Z`);
  const end = Date.parse(`${endDay}T00:00:00.000Z`);

  return Math.round((end - start) / 86_400_000);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${date.getUTCFullYear()}-${month}-${day}`;
}
