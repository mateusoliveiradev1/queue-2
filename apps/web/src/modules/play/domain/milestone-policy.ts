export const TIMELINE_MILESTONE_KINDS = [
  "first-session",
  "night-session",
  "marathon",
  "estimated-time-50",
  "estimated-time-100",
  "contextual-viciado",
  "contextual-pausar"
] as const;

export type TimelineMilestoneKind = (typeof TIMELINE_MILESTONE_KINDS)[number];

export type TimelineMilestoneInput = {
  confirmedSessionCountBefore: number;
  sessionStartedAt: Date;
  durationSeconds: number;
  accumulatedConfirmedSecondsBefore: number;
  accumulatedConfirmedSecondsAfter: number;
  estimatedMinutes: number | null;
  timezone?: string | null;
};

export type TimelineMilestoneCopy = {
  label: string;
  description: string;
};

export function classifyTimelineMilestones(
  input: TimelineMilestoneInput
): TimelineMilestoneKind[] {
  const milestones: TimelineMilestoneKind[] = [];

  if (input.confirmedSessionCountBefore === 0) {
    milestones.push("first-session");
  }

  const localHour = getHourInTimezone(input.sessionStartedAt, input.timezone ?? "UTC");

  if (localHour >= 22 || localHour < 5) {
    milestones.push("night-session");
  }

  if (input.durationSeconds >= 4 * 60 * 60) {
    milestones.push("marathon");
  }

  if (input.estimatedMinutes && input.estimatedMinutes > 0) {
    const estimatedSeconds = input.estimatedMinutes * 60;

    if (crossedThreshold(input, estimatedSeconds * 0.5)) {
      milestones.push("estimated-time-50");
    }

    if (crossedThreshold(input, estimatedSeconds)) {
      milestones.push("estimated-time-100");
    }

    if (crossedThreshold(input, estimatedSeconds * 1.5)) {
      milestones.push("contextual-viciado");
    }
  }

  if (input.confirmedSessionCountBefore === 6) {
    milestones.push("contextual-pausar");
  }

  return [...new Set(milestones)];
}

export function getTimelineMilestoneCopy(kind: TimelineMilestoneKind): TimelineMilestoneCopy {
  switch (kind) {
    case "first-session":
      return {
        label: "Primeira sessao",
        description: "A jornada da dupla comecou neste jogo."
      };
    case "night-session":
      return {
        label: "Sessao da madrugada",
        description: "A fila tambem teve turno noturno."
      };
    case "marathon":
      return {
        label: "Maratona coop",
        description: "Uma sessao longa o bastante para virar marco."
      };
    case "estimated-time-50":
      return {
        label: "Meio caminho estimado",
        description: "O tempo confirmado cruzou metade da estimativa disponivel."
      };
    case "estimated-time-100":
      return {
        label: "Tempo estimado alcancado",
        description: "A dupla chegou ao tempo estimado pela fonte cadastrada."
      };
    case "contextual-viciado":
      return {
        label: "Voces tao viciados",
        description: "O tempo confirmado passou bem da estimativa, sem pressa para acabar."
      };
    case "contextual-pausar":
      return {
        label: "Pausar tambem conta",
        description: "Depois de varias sessoes, vale revisar se esse ainda e o Principal."
      };
  }
}

function crossedThreshold(
  input: Pick<
    TimelineMilestoneInput,
    "accumulatedConfirmedSecondsAfter" | "accumulatedConfirmedSecondsBefore"
  >,
  thresholdSeconds: number
): boolean {
  return (
    input.accumulatedConfirmedSecondsBefore < thresholdSeconds
    && input.accumulatedConfirmedSecondsAfter >= thresholdSeconds
  );
}

function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const hourPart = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone
    })
      .formatToParts(date)
      .find((part) => part.type === "hour");
    const parsed = Number(hourPart?.value);

    return Number.isInteger(parsed) ? parsed : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}
