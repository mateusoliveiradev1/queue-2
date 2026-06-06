import {
  ACHIEVEMENT_CATALOG,
  type AchievementSeed
} from "./achievement-catalog";

export type AchievementMetricSnapshot = {
  achievementCount: number;
  alignedPlayDayCount: number;
  attendanceConfirmationCount: number;
  bossMarkerCount: number;
  calmStreakCount: number;
  comebackSessionCount: number;
  completedChapterCount: number;
  confirmedSessionCount: number;
  couchBossCount: number;
  currentStreak: number;
  discoveryMatchCount: number;
  doubleConfirmationCount: number;
  duoDecisionCount: number;
  freezeConsumedCount: number;
  freezeEarnedCount: number;
  lateNightActivityCount: number;
  lateSessionChainCount: number;
  level: number;
  libraryGrowthCount: number;
  libraryMaintenanceCount: number;
  longSessionCount: number;
  longestStreak: number;
  longestStreakWithoutReset: number;
  marathonSessionCount: number;
  maxConfirmedActionsPerLocalDay: number;
  maxConfirmedFactsPerLocalWeek: number;
  maxEstimatedTimeRatio: number;
  maxProgressLayersPerGame: number;
  maxSessionsPerGame: number;
  maxWeeklyQuestCompletions: number;
  monthlyQuestCompleteCount: number;
  mutualWantCount: number;
  questCompleteCount: number;
  quizMatchCount: number;
  sameHourSessionCount: number;
  scheduledSessionCount: number;
  seasonalAnniversaryCompleteCount: number;
  seasonalAwardsCompleteCount: number;
  seasonalQuestCompleteCount: number;
  seasonalSpookyCompleteCount: number;
  surpriseMatchCount: number;
  terminalDropadoCount: number;
  terminalZeradoCount: number;
  unexpectedMatchCount: number;
  unlockedAchievementSlugs: readonly string[];
  weekendSessionCount: number;
};

export type AchievementMetric = Exclude<
  keyof AchievementMetricSnapshot,
  "unlockedAchievementSlugs"
>;
export type AchievementMetricSource =
  | "achievement-unlocks"
  | "catalog-time-estimates"
  | "discovery-decisions"
  | "discovery-matches"
  | "domain-events"
  | "duo-projection"
  | "library-games"
  | "play-chapters"
  | "play-progress"
  | "play-scheduled-sessions"
  | "play-sessions"
  | "play-terminal-requests"
  | "quest-progress"
  | "streak-events"
  | "streak-state";

type AchievementMetricCondition = {
  metric: AchievementMetric;
  atLeast: number;
};

type AchievementMetricPredicate = {
  kind: "metric";
  conditions: readonly [AchievementMetricCondition];
  sources: readonly AchievementMetricSource[];
};

type AchievementAllPredicate = {
  kind: "all";
  conditions: readonly AchievementMetricCondition[];
  sources: readonly AchievementMetricSource[];
};

export type AchievementPredicateDefinition =
  | AchievementMetricPredicate
  | AchievementAllPredicate;

const playSessionSource = ["play-sessions"] as const;
const streakSources = ["streak-events", "streak-state"] as const;
const questSources = ["quest-progress"] as const;

export const ACHIEVEMENT_PREDICATES = {
  "confirmed-session-count:1": metric("confirmedSessionCount", 1, playSessionSource),
  "completed-chapter-count:1": metric("completedChapterCount", 1, ["play-chapters"]),
  "game-session-count:3": metric("maxSessionsPerGame", 3, playSessionSource),
  "estimated-time-ratio:0.5": metric("maxEstimatedTimeRatio", 0.5, [
    "play-progress",
    "catalog-time-estimates"
  ]),
  "terminal-zerado-count:1": metric("terminalZeradoCount", 1, [
    "play-terminal-requests"
  ]),
  "terminal-zerado-count:3": metric("terminalZeradoCount", 3, [
    "play-terminal-requests"
  ]),
  "long-session-count:1": metric("longSessionCount", 1, playSessionSource),
  "progress-layer-count:3": metric("maxProgressLayersPerGame", 3, [
    "play-chapters",
    "play-progress"
  ]),
  "double-confirmation-count:1": metric("doubleConfirmationCount", 1, [
    "play-sessions",
    "play-scheduled-sessions",
    "play-terminal-requests"
  ]),
  "comeback-session-count:1": metric("comebackSessionCount", 1, playSessionSource),
  "same-day-actions:4": metric("maxConfirmedActionsPerLocalDay", 4, [
    "play-sessions",
    "play-chapters",
    "play-scheduled-sessions",
    "play-terminal-requests"
  ]),
  "aligned-play-day:1": all(
    [
      condition("alignedPlayDayCount", 1),
      condition("doubleConfirmationCount", 1)
    ],
    ["play-sessions", "play-chapters", "play-terminal-requests"]
  ),
  "boss-marker-count:1": metric("bossMarkerCount", 1, ["play-chapters"]),
  "clean-streak:3": metric("longestStreakWithoutReset", 3, streakSources),
  "streak-days:7": metric("longestStreak", 7, streakSources),
  "scheduled-session-count:1": metric("scheduledSessionCount", 1, [
    "play-scheduled-sessions"
  ]),
  "attendance-confirmation-count:1": metric("attendanceConfirmationCount", 1, [
    "play-scheduled-sessions"
  ]),
  "weekend-session-count:1": metric("weekendSessionCount", 1, playSessionSource),
  "weekly-confirmed-facts:3": metric("maxConfirmedFactsPerLocalWeek", 3, [
    "play-sessions",
    "play-chapters",
    "play-scheduled-sessions",
    "play-terminal-requests"
  ]),
  "same-hour-sessions:3": metric("sameHourSessionCount", 3, playSessionSource),
  "library-maintenance-count:1": metric("libraryMaintenanceCount", 1, [
    "domain-events"
  ]),
  "marathon-session-count:1": metric("marathonSessionCount", 1, playSessionSource),
  "discovery-match-count:1": metric("discoveryMatchCount", 1, [
    "discovery-matches"
  ]),
  "mutual-want-count:1": metric("mutualWantCount", 1, [
    "discovery-decisions",
    "discovery-matches"
  ]),
  "quiz-match-count:1": metric("quizMatchCount", 1, ["discovery-matches"]),
  "surprise-match-count:1": metric("surpriseMatchCount", 1, [
    "discovery-matches"
  ]),
  "unexpected-match-count:1": metric("unexpectedMatchCount", 1, [
    "discovery-matches"
  ]),
  "library-growth-count:5": metric("libraryGrowthCount", 5, ["library-games"]),
  "duo-decision-count:20": metric("duoDecisionCount", 20, [
    "domain-events"
  ]),
  "streak-days:2": metric("currentStreak", 2, streakSources),
  "duo-day-backup-count:1": metric("lateNightActivityCount", 1, [
    "play-sessions",
    "play-chapters",
    "play-scheduled-sessions",
    "play-terminal-requests"
  ]),
  "freeze-earned-count:1": metric("freezeEarnedCount", 1, ["duo-projection"]),
  "freeze-consumed-count:1": metric("freezeConsumedCount", 1, ["streak-events"]),
  "streak-without-pressure:1": all(
    [
      condition("calmStreakCount", 1),
      condition("longestStreakWithoutReset", 7)
    ],
    streakSources
  ),
  "streak-days:30": metric("longestStreak", 30, streakSources),
  "quest-complete-count:1": metric("questCompleteCount", 1, questSources),
  "weekly-quest-complete-count:3": metric(
    "maxWeeklyQuestCompletions",
    3,
    questSources
  ),
  "monthly-quest-complete-count:1": metric(
    "monthlyQuestCompleteCount",
    1,
    questSources
  ),
  "seasonal-quest-complete-count:1": metric(
    "seasonalQuestCompleteCount",
    1,
    questSources
  ),
  "seasonal-spooky-complete:1": metric(
    "seasonalSpookyCompleteCount",
    1,
    questSources
  ),
  "seasonal-awards-complete:1": metric(
    "seasonalAwardsCompleteCount",
    1,
    questSources
  ),
  "seasonal-anniversary-complete:1": metric(
    "seasonalAnniversaryCompleteCount",
    1,
    questSources
  ),
  "library-growth-count:10": metric("libraryGrowthCount", 10, ["library-games"]),
  "achievement-count:25": metric("achievementCount", 25, [
    "achievement-unlocks"
  ]),
  "level:25": metric("level", 25, ["duo-projection"]),
  "terminal-dropado-count:1": metric("terminalDropadoCount", 1, [
    "play-terminal-requests"
  ]),
  "late-session-chain:1": metric("lateSessionChainCount", 1, playSessionSource),
  "couch-boss-count:1": metric("couchBossCount", 1, [
    "play-sessions",
    "play-chapters"
  ]),
  "level:50": metric("level", 50, ["duo-projection"])
} as const;

export type AchievementPredicateKey = keyof typeof ACHIEVEMENT_PREDICATES;
export type AchievementPredicateRegistry = Record<
  AchievementPredicateKey,
  AchievementPredicateDefinition
>;

export const EMPTY_ACHIEVEMENT_METRICS: AchievementMetricSnapshot = {
  achievementCount: 0,
  alignedPlayDayCount: 0,
  attendanceConfirmationCount: 0,
  bossMarkerCount: 0,
  calmStreakCount: 0,
  comebackSessionCount: 0,
  completedChapterCount: 0,
  confirmedSessionCount: 0,
  couchBossCount: 0,
  currentStreak: 0,
  discoveryMatchCount: 0,
  doubleConfirmationCount: 0,
  duoDecisionCount: 0,
  freezeConsumedCount: 0,
  freezeEarnedCount: 0,
  lateNightActivityCount: 0,
  lateSessionChainCount: 0,
  level: 0,
  libraryGrowthCount: 0,
  libraryMaintenanceCount: 0,
  longSessionCount: 0,
  longestStreak: 0,
  longestStreakWithoutReset: 0,
  marathonSessionCount: 0,
  maxConfirmedActionsPerLocalDay: 0,
  maxConfirmedFactsPerLocalWeek: 0,
  maxEstimatedTimeRatio: 0,
  maxProgressLayersPerGame: 0,
  maxSessionsPerGame: 0,
  maxWeeklyQuestCompletions: 0,
  monthlyQuestCompleteCount: 0,
  mutualWantCount: 0,
  questCompleteCount: 0,
  quizMatchCount: 0,
  sameHourSessionCount: 0,
  scheduledSessionCount: 0,
  seasonalAnniversaryCompleteCount: 0,
  seasonalAwardsCompleteCount: 0,
  seasonalQuestCompleteCount: 0,
  seasonalSpookyCompleteCount: 0,
  surpriseMatchCount: 0,
  terminalDropadoCount: 0,
  terminalZeradoCount: 0,
  unexpectedMatchCount: 0,
  unlockedAchievementSlugs: [],
  weekendSessionCount: 0
};

export function evaluateAchievements(
  snapshot: AchievementMetricSnapshot,
  registry: Partial<AchievementPredicateRegistry> = ACHIEVEMENT_PREDICATES
): AchievementSeed[] {
  return ACHIEVEMENT_CATALOG.filter((seed) => {
    const definition = registry[seed.predicateKey as AchievementPredicateKey];
    return definition ? evaluateDefinition(snapshot, definition) : false;
  });
}

export function createAchievementPredicateFixture(
  predicateKey: AchievementPredicateKey
): AchievementMetricSnapshot {
  const definition = ACHIEVEMENT_PREDICATES[predicateKey];
  const snapshot = { ...EMPTY_ACHIEVEMENT_METRICS };

  for (const requirement of definition.conditions) {
    snapshot[requirement.metric] = Math.max(
      snapshot[requirement.metric],
      requirement.atLeast
    );
  }

  return snapshot;
}

export function auditAchievementReachability(
  registry: Partial<AchievementPredicateRegistry> = ACHIEVEMENT_PREDICATES
): {
  active: number;
  reachable: number;
  orphanPredicateKeys: string[];
} {
  const catalogKeys = new Set(
    ACHIEVEMENT_CATALOG.map((achievement) => achievement.predicateKey)
  );
  const missingSlugs = ACHIEVEMENT_CATALOG.filter(
    (achievement) =>
      !registry[achievement.predicateKey as AchievementPredicateKey]
  ).map((achievement) => achievement.slug);
  const orphanPredicateKeys = Object.keys(registry).filter(
    (predicateKey) => !catalogKeys.has(predicateKey as AchievementPredicateKey)
  );

  if (missingSlugs.length > 0) {
    throw new Error(
      `achievement predicates missing for slugs: ${missingSlugs.join(", ")}`
    );
  }

  if (orphanPredicateKeys.length > 0) {
    throw new Error(
      `achievement predicate registry has orphan keys: ${orphanPredicateKeys.join(", ")}`
    );
  }

  const reachable = ACHIEVEMENT_CATALOG.filter((achievement) => {
    const predicateKey = achievement.predicateKey as AchievementPredicateKey;
    const definition = registry[predicateKey];
    return Boolean(
      definition &&
        evaluateDefinition(
          createAchievementPredicateFixture(predicateKey),
          definition
        )
    );
  }).length;

  if (reachable !== ACHIEVEMENT_CATALOG.length) {
    throw new Error(
      `achievement reachability incomplete: ${reachable}/${ACHIEVEMENT_CATALOG.length}`
    );
  }

  return {
    active: ACHIEVEMENT_CATALOG.length,
    reachable,
    orphanPredicateKeys
  };
}

function metric(
  metricKey: AchievementMetric,
  atLeast: number,
  sources: readonly AchievementMetricSource[]
): AchievementMetricPredicate {
  return {
    kind: "metric",
    conditions: [condition(metricKey, atLeast)],
    sources
  };
}

function all(
  conditions: readonly AchievementMetricCondition[],
  sources: readonly AchievementMetricSource[]
): AchievementAllPredicate {
  return {
    kind: "all",
    conditions,
    sources
  };
}

function condition(
  metricKey: AchievementMetric,
  atLeast: number
): AchievementMetricCondition {
  return {
    metric: metricKey,
    atLeast
  };
}

function evaluateDefinition(
  snapshot: AchievementMetricSnapshot,
  definition: AchievementPredicateDefinition
): boolean {
  return definition.conditions.every(
    (requirement) => snapshot[requirement.metric] >= requirement.atLeast
  );
}
