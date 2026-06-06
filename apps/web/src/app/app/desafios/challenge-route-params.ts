import type { QuestType } from "../../../modules/gamification";

export type ChallengePeriodParam = "semana" | "mes" | "sazonal";

export type ChallengeRouteParams = {
  period: QuestType | null;
  invalidPeriod: boolean;
};

const periodToQuestType: Record<ChallengePeriodParam, QuestType> = {
  semana: "weekly",
  mes: "monthly",
  sazonal: "seasonal"
};

const questTypeToPeriod: Record<QuestType, ChallengePeriodParam> = {
  weekly: "semana",
  monthly: "mes",
  seasonal: "sazonal"
};

export function parseChallengeRouteParams(
  params: Record<string, string | string[] | undefined> | undefined
): ChallengeRouteParams {
  const rawPeriod = value(params?.periodo);

  if (!rawPeriod) {
    return {
      period: null,
      invalidPeriod: false
    };
  }

  if (rawPeriod in periodToQuestType) {
    return {
      period: periodToQuestType[rawPeriod as ChallengePeriodParam],
      invalidPeriod: false
    };
  }

  return {
    period: null,
    invalidPeriod: true
  };
}

export function buildChallengePath(
  _current: ChallengeRouteParams,
  next: { period?: QuestType | null } = {}
): string {
  if (!next.period) {
    return "/app/desafios";
  }

  return `/app/desafios?periodo=${questTypeToPeriod[next.period]}`;
}

function value(input: string | string[] | undefined): string | null {
  if (Array.isArray(input)) {
    return input[0] ?? null;
  }

  return input ?? null;
}
