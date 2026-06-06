export const QUEST_CATALOG_VERSION = "queue2-quests-v1";

export const QUEST_TYPES = ["weekly", "monthly", "seasonal"] as const;
export type QuestType = (typeof QUEST_TYPES)[number];
export type SeasonalQuestKey = "spooky" | "awards" | "anniversary";

export type QuestTemplate = {
  slug: string;
  type: QuestType;
  title: string;
  description: string;
  goalValue: number;
  xpReward: number;
  eligibilityKey: string;
  seasonalKey?: SeasonalQuestKey;
  completionAchievementSlugs: readonly string[];
};

export type QuestWindow = {
  type: QuestType;
  cycleKey: string;
  startsOn: string;
  endsOn: string;
  timezone: string;
};

export const ACTIVE_WEEKLY_QUEST_SLOTS = [
  "sessao-confirmada",
  "capitulo-da-semana",
  "descoberta-em-dupla"
] as const;

export const ACTIVE_MONTHLY_QUEST_SLOT = "mes-da-fila";

export const SEASONAL_QUEST_SEEDS = [
  "spooky-coop",
  "awards-em-casa",
  "aniversario-da-fila"
] as const;

export const SEASONAL_QUEST_WINDOWS = {
  anniversary: {
    start: { month: 6, day: 1 },
    end: { month: 7, day: 1 }
  },
  spooky: {
    start: { month: 10, day: 1 },
    end: { month: 11, day: 1 }
  },
  awards: {
    start: { month: 12, day: 1 },
    end: { month: 1, day: 1 }
  }
} as const satisfies Record<
  SeasonalQuestKey,
  {
    start: { month: number; day: number };
    end: { month: number; day: number };
  }
>;

export const QUEST_TEMPLATES = [
  quest("sessao-confirmada", "weekly", "Sessao confirmada", "Confirmem uma sessao coop real nesta semana.", 1, 80, "confirmed-session"),
  quest("capitulo-da-semana", "weekly", "Capitulo da semana", "Concluam um capitulo manual sem transformar progresso em tarefa.", 1, 70, "completed-chapter"),
  quest("descoberta-em-dupla", "weekly", "Descoberta em dupla", "Criem um match real ou levem um jogo novo para a fila.", 1, 60, "discovery-match"),
  quest("jogando-sem-pressa", "weekly", "Jogando sem pressa", "Registrem duas acoes confirmadas em dias diferentes.", 2, 90, "two-duo-days"),
  quest("mes-da-fila", "monthly", "Mes da fila", "Fechem quatro fatos reais da dupla durante o mes.", 4, 240, "monthly-confirmed-facts", undefined, ["mes-da-dupla"]),
  quest("spooky-coop", "seasonal", "Spooky coop", "No ciclo Spooky, joguem algo tenso ou avancem um jogo noturno.", 1, 180, "seasonal-spooky", "spooky", ["selo-sazonal", "spooky-coop"]),
  quest("awards-em-casa", "seasonal", "Awards em casa", "No ciclo Awards, avancem um destaque do backlog.", 1, 180, "seasonal-awards", "awards", ["selo-sazonal", "awards-em-casa"]),
  quest("aniversario-da-fila", "seasonal", "Aniversario da fila", "No aniversario, celebrem a parceria com um marco confirmado.", 1, 220, "seasonal-anniversary", "anniversary", ["selo-sazonal", "aniversario-da-fila"])
] as const satisfies readonly QuestTemplate[];

export function getActiveQuestTemplateSlugs(): {
  weekly: readonly string[];
  monthly: string;
  seasonal: readonly string[];
} {
  return {
    weekly: ACTIVE_WEEKLY_QUEST_SLOTS,
    monthly: ACTIVE_MONTHLY_QUEST_SLOT,
    seasonal: SEASONAL_QUEST_SEEDS
  };
}

export function getQuestTemplate(slug: string): QuestTemplate | null {
  return QUEST_TEMPLATES.find((questTemplate) => questTemplate.slug === slug) ?? null;
}

export function getQuestWindow(input: {
  type: QuestType;
  now: Date;
  timezone: string;
  seasonalKey?: QuestTemplate["seasonalKey"];
}): QuestWindow {
  const local = getLocalDateParts(input.now, input.timezone);

  if (input.type === "weekly") {
    const start = addLocalDays(localToDate(local), -daysSinceMonday(input.now, input.timezone));
    const end = addLocalDays(start, 7);
    const startsOn = formatDate(start);

    return {
      type: "weekly",
      cycleKey: `weekly:${startsOn}`,
      startsOn,
      endsOn: formatDate(end),
      timezone: input.timezone
    };
  }

  if (input.type === "monthly") {
    const start = new Date(Date.UTC(local.year, local.month - 1, 1));
    const end = new Date(Date.UTC(local.year, local.month, 1));
    const startsOn = formatDate(start);

    return {
      type: "monthly",
      cycleKey: `monthly:${local.year}-${pad(local.month)}`,
      startsOn,
      endsOn: formatDate(end),
      timezone: input.timezone
    };
  }

  const seasonalKey = input.seasonalKey ?? "spooky";
  const seasonalWindow = getSeasonalWindowForDate(local, seasonalKey)
    ?? getSeasonalWindowDates(local.year, seasonalKey);

  return {
    type: "seasonal",
    cycleKey: `seasonal:${seasonalKey}:${seasonalWindow.startYear}`,
    startsOn: seasonalWindow.startsOn,
    endsOn: seasonalWindow.endsOn,
    timezone: input.timezone
  };
}

export function isSeasonalQuestActive(input: {
  now: Date;
  seasonalKey: SeasonalQuestKey;
  timezone: string;
}): boolean {
  const local = getLocalDateParts(input.now, input.timezone);

  return getSeasonalWindowForDate(local, input.seasonalKey) !== null;
}

function quest(
  slug: string,
  type: QuestType,
  title: string,
  description: string,
  goalValue: number,
  xpReward: number,
  eligibilityKey: string,
  seasonalKey?: QuestTemplate["seasonalKey"],
  completionAchievementSlugs: readonly string[] = []
): QuestTemplate {
  return {
    slug,
    type,
    title,
    description,
    goalValue,
    xpReward,
    eligibilityKey,
    seasonalKey,
    completionAchievementSlugs
  };
}

function getLocalDateParts(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day")
  };
}

function daysSinceMonday(date: Date, timezone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  }).format(date);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const index = weekdays.indexOf(weekday);

  return index >= 0 ? index : 0;
}

function localToDate(local: { year: number; month: number; day: number }): Date {
  return new Date(Date.UTC(local.year, local.month - 1, local.day));
}

function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getSeasonalWindowForDate(
  local: { year: number; month: number; day: number },
  seasonalKey: SeasonalQuestKey
): ReturnType<typeof getSeasonalWindowDates> | null {
  const localDate = formatCivilDate(local.year, local.month, local.day);

  for (const startYear of [local.year - 1, local.year]) {
    const seasonalWindow = getSeasonalWindowDates(startYear, seasonalKey);

    if (
      localDate >= seasonalWindow.startsOn
      && localDate < seasonalWindow.endsOn
    ) {
      return seasonalWindow;
    }
  }

  return null;
}

function getSeasonalWindowDates(
  startYear: number,
  seasonalKey: SeasonalQuestKey
): {
  startYear: number;
  startsOn: string;
  endsOn: string;
} {
  const definition = SEASONAL_QUEST_WINDOWS[seasonalKey];
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

  return {
    startYear,
    startsOn: formatCivilDate(
      startYear,
      startMonth,
      startDay
    ),
    endsOn: formatCivilDate(
      crossesYear ? startYear + 1 : startYear,
      endMonth,
      endDay
    )
  };
}

function formatCivilDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
