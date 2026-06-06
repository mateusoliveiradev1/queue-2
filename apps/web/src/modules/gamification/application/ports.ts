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
  readProjection(duoId: GamificationDuoId): Promise<GamificationProjectionRecord | null>;
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
  insertAchievementUnlock(input: {
    duoId: GamificationDuoId;
    achievementSlug: string;
    sourceType: GamificationFactSourceType;
    sourceId: GamificationUuid;
    unlockedByUserId: GamificationUserId | null;
    metadata?: Record<string, unknown>;
  }): Promise<GamificationAchievementUnlockRecord | null>;
  readActiveQuestCycles(duoId: GamificationDuoId): Promise<GamificationQuestCycleRecord[]>;
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
  }): Promise<void>;
  upsertStreakState(input: GamificationStreakStateRecord): Promise<GamificationStreakStateRecord>;
  insertRewardNotification(input: GamificationRewardNotificationInput): Promise<void>;
  insertAdjustment(input: GamificationAdjustmentInput): Promise<void>;
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
