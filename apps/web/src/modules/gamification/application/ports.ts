import type {
  GamificationFactSourceType,
  RewardNotificationIntensity
} from "../domain/gamification-policy";
import type { LevelDefinition } from "../domain/level-curve";
import type { QuestType } from "../domain/quest-catalog";

export type GamificationDuoId = string;
export type GamificationUserId = string;
export type GamificationUuid = string;

export type GamificationMembershipContext = {
  duoId: GamificationDuoId;
  userId: GamificationUserId;
  partnerUserId: GamificationUserId;
  memberUserIds: [GamificationUserId, GamificationUserId] | GamificationUserId[];
};

export type GamificationFactInput = {
  duoId: GamificationDuoId;
  actorUserId: GamificationUserId | null;
  sourceType: GamificationFactSourceType;
  sourceId: GamificationUuid;
  occurredAt: Date;
  confirmedDuoFact: boolean;
  amountOverride?: number;
  metadata?: Record<string, unknown>;
};

export type GamificationXpLedgerRecord = {
  id: GamificationUuid;
  duoId: GamificationDuoId;
  awardKey: string;
  sourceType: GamificationFactSourceType;
  sourceId: GamificationUuid;
  amount: number;
  reasonCode: string;
  awardedByUserId: GamificationUserId | null;
  metadata: Record<string, unknown>;
  awardedAt: Date;
};

export type GamificationProjectionRecord = {
  duoId: GamificationDuoId;
  xp: number;
  level: LevelDefinition;
  streak: number;
  availableFreezes: number;
  updatedAt: Date;
};

export type GamificationLevelUpSummary = {
  previousLevel: LevelDefinition;
  currentLevel: LevelDefinition;
};

export type GamificationAchievementSummary = {
  slug: string;
  title: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt: Date;
};

export type GamificationQuestProgressSummary = {
  questSlug: string;
  questType: QuestType;
  cycleKey: string;
  currentValue: number;
  goalValue: number;
  completed: boolean;
  xpAwarded: number;
};

export type GamificationStreakSummary = {
  previousStreak: number;
  currentStreak: number;
  availableFreezes: number;
  earnedFreezes: number;
  consumedFreeze: boolean;
  reset: boolean;
  duoDay: string;
};

export type GamificationRewardSummary = {
  totalXpAwarded: number;
  xpAwards: GamificationXpLedgerRecord[];
  levelUp: GamificationLevelUpSummary | null;
  achievements: GamificationAchievementSummary[];
  questProgress: GamificationQuestProgressSummary[];
  streak: GamificationStreakSummary | null;
  projection: GamificationProjectionRecord;
  skippedXpReason?:
    | "source-does-not-award-xp"
    | "session-too-short"
    | "chapter-daily-cap-reached"
    | "invalid-adjustment";
};

export type GamificationApplyFactResult =
  | {
      ok: true;
      duplicate: boolean;
      summary: GamificationRewardSummary;
    }
  | {
      ok: false;
      reason:
        | "actor-required"
        | "membership-required"
        | "duo-mismatch"
        | "projection-not-found"
        | "unconfirmed-fact"
        | "invalid-adjustment";
    };

export type GamificationDashboardRecord = {
  duoId: GamificationDuoId;
  xp: number;
  level: LevelDefinition;
  nextLevel: LevelDefinition | null;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressRatio: number;
  streak: {
    current: number;
    availableFreezes: number;
  };
  activeQuests: Array<{
    questSlug: string;
    questType: QuestType;
    cycleKey: string;
    title: string;
    description: string;
    currentValue: number;
    goalValue: number;
    completed: boolean;
    windowEndAt: Date;
  }>;
  recentAchievements: GamificationAchievementSummary[];
  recentLedger: Array<{
    id: GamificationUuid;
    amount: number;
    reasonCode: string;
    sourceType: GamificationFactSourceType;
    awardedAt: Date;
  }>;
  updatedAt: Date;
};

export type GamificationChallengeQuestRecord = {
  questSlug: string;
  questType: QuestType;
  cycleKey: string;
  title: string;
  description: string;
  currentValue: number;
  goalValue: number;
  completed: boolean;
  completedAt: Date | null;
  xpReward: number;
  windowStartAt: Date;
  windowEndAt: Date;
  timezone: string;
  seasonalKey?: "spooky" | "awards" | "anniversary";
};

export type GamificationChallengeSectionRecord = {
  questType: QuestType;
  quests: GamificationChallengeQuestRecord[];
  expectedSlots: number;
};

export type GamificationChallengesRecord = {
  duoId: GamificationDuoId;
  timezone: string;
  generatedAt: Date;
  streak: {
    current: number;
    longest: number;
    availableFreezes: number;
    lastActivityDuoDay: string | null;
    cutoffHour: number;
  };
  sections: GamificationChallengeSectionRecord[];
};

export type GamificationProjectionRebuildResult =
  | {
      ok: true;
      dryRun: boolean;
      rebuildKey: string;
      duoId: GamificationDuoId;
      before: {
        xp: number;
        level: LevelDefinition;
        streak: number;
      };
      after: {
        xp: number;
        level: LevelDefinition;
        streak: number;
      };
      adjustmentDelta: number;
      projection: GamificationProjectionRecord;
    }
  | {
      ok: false;
      reason: "membership-required" | "duo-mismatch" | "projection-not-found";
    };

export type GamificationAchievementReadModel = {
  viewKey: string;
  slug: string | null;
  group: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  visibility: "visible" | "hidden";
  state: "locked-visible" | "locked-hidden" | "unlocked";
  title: string;
  description: string;
  iconKey: string;
  progressHint: string;
  unlockedAt: Date | null;
};

export type GamificationAchievementGroupReadModel = {
  group: string;
  label: string;
  achievements: GamificationAchievementReadModel[];
};

export type GamificationAchievementsRecord = {
  duoId: GamificationDuoId;
  selectedRarity: "common" | "rare" | "epic" | "legendary" | null;
  rarityOptions: Array<"common" | "rare" | "epic" | "legendary">;
  totalCount: number;
  visibleCount: number;
  unlockedCount: number;
  hiddenLockedCount: number;
  groups: GamificationAchievementGroupReadModel[];
  updatedAt: Date;
};

export type GamificationAchievementUnlockRecord = {
  id: GamificationUuid;
  duoId: GamificationDuoId;
  achievementSlug: string;
  sourceType: GamificationFactSourceType;
  sourceId: GamificationUuid;
  unlockedByUserId: GamificationUserId | null;
  metadata: Record<string, unknown>;
  unlockedAt: Date;
};

export type GamificationQuestCycleRecord = {
  id: GamificationUuid;
  duoId: GamificationDuoId;
  questSlug: string;
  questType: QuestType;
  cycleKey: string;
  windowStartAt: Date;
  windowEndAt: Date;
  timezone: string;
  status: "active" | "completed" | "expired" | "cancelled";
};

export type GamificationQuestProgressRecord = {
  id: GamificationUuid;
  duoId: GamificationDuoId;
  questCycleId: GamificationUuid;
  currentValue: number;
  completedAt: Date | null;
  rewardAwardId: GamificationUuid | null;
  metadata: Record<string, unknown>;
  updatedAt: Date;
};

export type GamificationStreakStateRecord = {
  duoId: GamificationDuoId;
  currentStreak: number;
  longestStreak: number;
  availableFreezes: number;
  lastActivityDuoDay: string | null;
  updatedAt: Date;
};

export type GamificationRewardNotificationInput = {
  duoId: GamificationDuoId;
  recipientUserId?: GamificationUserId | null;
  actorUserId?: GamificationUserId | null;
  notificationType:
    | "xp-award"
    | "level-up"
    | "achievement"
    | "quest-complete"
    | "streak-freeze"
    | "adjustment";
  intensity: RewardNotificationIntensity;
  title: string;
  body?: string | null;
  actionRefType?: string | null;
  actionRefId?: GamificationUuid | null;
  metadata?: Record<string, unknown>;
};

export type GamificationAdjustmentInput = {
  duoId: GamificationDuoId;
  adjustmentKey: string;
  amountDelta: number;
  reasonCode: string;
  actorUserId: GamificationUserId | null;
  metadata?: Record<string, unknown>;
};

export type GamificationDueJobRecord = {
  id: GamificationUuid;
  duoId: GamificationDuoId;
  jobKey: string;
  jobType: "gamification-quest-rotation" | "gamification-streak-check";
  runAt: Date;
  attempts: number;
  payload: Record<string, unknown>;
};

export type GamificationRepositoryTransaction = {
  resolveMembership(userId: GamificationUserId): Promise<GamificationMembershipContext | null>;
  readDuoTimezone(duoId: GamificationDuoId): Promise<string>;
  readProjection(duoId: GamificationDuoId): Promise<GamificationProjectionRecord | null>;
  countXpAwardsForDuoDay(input: {
    duoId: GamificationDuoId;
    sourceType: GamificationFactSourceType;
    duoDay: string;
    timezone: string;
  }): Promise<number>;
  insertXpLedgerAward(input: {
    duoId: GamificationDuoId;
    awardKey: string;
    sourceType: GamificationFactSourceType;
    sourceId: GamificationUuid;
    amount: number;
    reasonCode: string;
    awardedByUserId: GamificationUserId | null;
    metadata?: Record<string, unknown>;
  }): Promise<GamificationXpLedgerRecord | null>;
  updateProjection(input: {
    duoId: GamificationDuoId;
    xpDelta: number;
    nextLevel: LevelDefinition;
    streak?: number;
    availableFreezes?: number;
  }): Promise<GamificationProjectionRecord>;
  readAchievementUnlocks(duoId: GamificationDuoId): Promise<GamificationAchievementUnlockRecord[]>;
  readRecentXpLedgerAwards(input: {
    duoId: GamificationDuoId;
    limit: number;
  }): Promise<GamificationXpLedgerRecord[]>;
  insertAchievementUnlock(input: {
    duoId: GamificationDuoId;
    achievementSlug: string;
    sourceType: GamificationFactSourceType;
    sourceId: GamificationUuid;
    unlockedByUserId: GamificationUserId | null;
    metadata?: Record<string, unknown>;
  }): Promise<GamificationAchievementUnlockRecord | null>;
  readActiveQuestCycles(duoId: GamificationDuoId): Promise<GamificationQuestCycleRecord[]>;
  readQuestProgressForCycles(input: {
    duoId: GamificationDuoId;
    questCycleIds: GamificationUuid[];
  }): Promise<GamificationQuestProgressRecord[]>;
  upsertQuestCycle(input: {
    duoId: GamificationDuoId;
    questSlug: string;
    questType: QuestType;
    cycleKey: string;
    windowStartAt: Date;
    windowEndAt: Date;
    timezone: string;
  }): Promise<GamificationQuestCycleRecord>;
  upsertQuestProgress(input: {
    duoId: GamificationDuoId;
    questCycleId: GamificationUuid;
    currentValue: number;
    completedAt?: Date | null;
    rewardAwardId?: GamificationUuid | null;
    lastSourceType?: GamificationFactSourceType | null;
    lastSourceId?: GamificationUuid | null;
    metadata?: Record<string, unknown>;
  }): Promise<GamificationQuestProgressRecord>;
  readStreakState(duoId: GamificationDuoId): Promise<GamificationStreakStateRecord | null>;
  insertStreakEvent(input: {
    duoId: GamificationDuoId;
    eventKey: string;
    eventType: "activity" | "freeze-earned" | "freeze-consumed" | "streak-reset" | "rebuild";
    duoDay: string;
    sourceType?: GamificationFactSourceType | null;
    sourceId?: GamificationUuid | null;
    actorUserId?: GamificationUserId | null;
    deltaDays?: number;
    freezeDelta?: number;
    metadata?: Record<string, unknown>;
  }): Promise<boolean>;
  upsertStreakState(input: GamificationStreakStateRecord): Promise<GamificationStreakStateRecord>;
  insertRewardNotification(input: GamificationRewardNotificationInput): Promise<void>;
  insertAdjustment(input: GamificationAdjustmentInput): Promise<void>;
  sumXpLedgerAwards(duoId: GamificationDuoId): Promise<number>;
};

export type GamificationRepository = {
  withUserTransaction<T>(
    userId: GamificationUserId,
    callback: (transaction: GamificationRepositoryTransaction) => Promise<T>
  ): Promise<T>;
  claimDueGamificationJobs(input: {
    jobTypes: GamificationDueJobRecord["jobType"][];
    now: Date;
    limit: number;
    workerId: string;
  }): Promise<GamificationDueJobRecord[]>;
  completeGamificationJob(jobId: GamificationUuid): Promise<void>;
  failGamificationJob(input: {
    jobId: GamificationUuid;
    errorMessage: string;
    retryAt: Date;
  }): Promise<void>;
  recordProjectionRebuild(input: {
    duoId: GamificationDuoId;
    rebuildKey: string;
    status: "running" | "completed" | "failed";
    reasonCode: string;
    xpBefore?: number | null;
    xpAfter?: number | null;
    levelBefore?: number | null;
    levelAfter?: number | null;
    streakBefore?: number | null;
    streakAfter?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
};
