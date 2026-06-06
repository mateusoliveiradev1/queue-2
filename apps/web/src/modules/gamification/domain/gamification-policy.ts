export const XP_MODEL_SCOPE = "duo";
export const MIN_XP_SESSION_SECONDS = 15 * 60;
export const MAX_CHAPTER_XP_AWARDS_PER_DUO_DAY = 5;

export const GAMIFICATION_FACT_SOURCE_TYPES = [
  "chapter",
  "live-session",
  "offline-session",
  "scheduled-session",
  "terminal-zerado",
  "terminal-dropado",
  "discovery-match",
  "quest",
  "achievement",
  "streak",
  "adjustment"
] as const;

export const GAMIFICATION_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary"
] as const;

export const REWARD_NOTIFICATION_INTENSITIES = [
  "quiet",
  "standard",
  "special",
  "legendary"
] as const;

export type GamificationFactSourceType =
  (typeof GAMIFICATION_FACT_SOURCE_TYPES)[number];
export type GamificationRarity = (typeof GAMIFICATION_RARITIES)[number];
export type RewardNotificationIntensity =
  (typeof REWARD_NOTIFICATION_INTENSITIES)[number];

export type XpSourceRule = {
  sourceType: GamificationFactSourceType;
  baseXp: number;
  awardScope: typeof XP_MODEL_SCOPE;
  requiresConfirmedDuoFact: boolean;
  idempotencyScope: "source" | "fact" | "manual-adjustment";
  minimumDurationSeconds?: number;
  maxAwardsPerDuoDay?: number;
  canAwardXp: boolean;
};

export type XpEligibilityInput = {
  sourceType: GamificationFactSourceType;
  sourceId: string;
  confirmedDuoFact: boolean;
  alreadyAwarded: boolean;
  durationSeconds?: number | null;
  awardsForSourceToday?: number;
  overrideAmount?: number;
};

export type XpEligibilityResult =
  | {
      ok: true;
      awardKey: string;
      amount: number;
      reasonCode: string;
      scope: typeof XP_MODEL_SCOPE;
    }
  | {
      ok: false;
      reason:
        | "unconfirmed-fact"
        | "already-awarded"
        | "source-does-not-award-xp"
        | "session-too-short"
        | "chapter-daily-cap-reached"
        | "invalid-adjustment";
    };

export const XP_SOURCE_RULES = {
  chapter: {
    sourceType: "chapter",
    baseXp: 25,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    maxAwardsPerDuoDay: MAX_CHAPTER_XP_AWARDS_PER_DUO_DAY,
    canAwardXp: true
  },
  "live-session": {
    sourceType: "live-session",
    baseXp: 30,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    minimumDurationSeconds: MIN_XP_SESSION_SECONDS,
    canAwardXp: true
  },
  "offline-session": {
    sourceType: "offline-session",
    baseXp: 20,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    minimumDurationSeconds: MIN_XP_SESSION_SECONDS,
    canAwardXp: true
  },
  "scheduled-session": {
    sourceType: "scheduled-session",
    baseXp: 100,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    canAwardXp: true
  },
  "terminal-zerado": {
    sourceType: "terminal-zerado",
    baseXp: 250,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    canAwardXp: true
  },
  "terminal-dropado": {
    sourceType: "terminal-dropado",
    baseXp: 0,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    canAwardXp: false
  },
  "discovery-match": {
    sourceType: "discovery-match",
    baseXp: 0,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "fact",
    canAwardXp: false
  },
  quest: {
    sourceType: "quest",
    baseXp: 80,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    canAwardXp: true
  },
  achievement: {
    sourceType: "achievement",
    baseXp: 0,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "source",
    canAwardXp: false
  },
  streak: {
    sourceType: "streak",
    baseXp: 0,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: true,
    idempotencyScope: "fact",
    canAwardXp: false
  },
  adjustment: {
    sourceType: "adjustment",
    baseXp: 0,
    awardScope: XP_MODEL_SCOPE,
    requiresConfirmedDuoFact: false,
    idempotencyScope: "manual-adjustment",
    canAwardXp: true
  }
} as const satisfies Record<GamificationFactSourceType, XpSourceRule>;

export const RARITY_STYLE_TOKENS: Record<
  GamificationRarity,
  {
    borderToken: string;
    accentToken: string;
    celebrationIntensity: RewardNotificationIntensity;
  }
> = {
  common: {
    borderToken: "var(--rarity-common)",
    accentToken: "var(--ink-muted)",
    celebrationIntensity: "quiet"
  },
  rare: {
    borderToken: "var(--rarity-rare)",
    accentToken: "var(--rarity-rare)",
    celebrationIntensity: "standard"
  },
  epic: {
    borderToken: "var(--rarity-epic)",
    accentToken: "var(--rarity-epic)",
    celebrationIntensity: "special"
  },
  legendary: {
    borderToken: "var(--rarity-legendary)",
    accentToken: "var(--rarity-legendary)",
    celebrationIntensity: "legendary"
  }
};

export function evaluateXpSourceEligibility(
  input: XpEligibilityInput
): XpEligibilityResult {
  const rule: XpSourceRule = XP_SOURCE_RULES[input.sourceType];

  if (rule.requiresConfirmedDuoFact && !input.confirmedDuoFact) {
    return { ok: false, reason: "unconfirmed-fact" };
  }

  if (input.alreadyAwarded) {
    return { ok: false, reason: "already-awarded" };
  }

  if (!rule.canAwardXp) {
    return { ok: false, reason: "source-does-not-award-xp" };
  }

  if (
    rule.minimumDurationSeconds
    && (input.durationSeconds ?? 0) < rule.minimumDurationSeconds
  ) {
    return { ok: false, reason: "session-too-short" };
  }

  if (
    rule.maxAwardsPerDuoDay
    && (input.awardsForSourceToday ?? 0) >= rule.maxAwardsPerDuoDay
  ) {
    return { ok: false, reason: "chapter-daily-cap-reached" };
  }

  const amount = input.overrideAmount ?? rule.baseXp;

  if (input.sourceType === "adjustment" && amount === 0) {
    return { ok: false, reason: "invalid-adjustment" };
  }

  return {
    ok: true,
    awardKey: `${input.sourceType}:${input.sourceId}`,
    amount,
    reasonCode: `${input.sourceType}-confirmed`,
    scope: XP_MODEL_SCOPE
  };
}

export function getRewardIntensityForRarity(
  rarity: GamificationRarity
): RewardNotificationIntensity {
  return RARITY_STYLE_TOKENS[rarity].celebrationIntensity;
}
