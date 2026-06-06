export const QUEST_CATALOG_VERSION = "queue2-quests-v1";

export const QUEST_TYPES = ["weekly", "monthly", "seasonal"] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export type QuestTemplate = {
  slug: string;
  type: QuestType;
  title: string;
  description: string;
  goalValue: number;
  xpReward: number;
  eligibilityKey: string;
  seasonalKey?: "spooky" | "awards" | "anniversary";
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

  return {
    type: "seasonal",
    cycleKey: `seasonal:${seasonalKey}:${local.year}`,
    startsOn: `${local.year}-01-01`,
    endsOn: `${local.year + 1}-01-01`,
    timezone: input.timezone
  };
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

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
