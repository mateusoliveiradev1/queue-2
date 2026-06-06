export {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_CATALOG_VERSION,
  ACHIEVEMENT_GROUP_LABELS,
  ACHIEVEMENT_GROUPS,
  getAchievementBySlug,
  getVisibleAchievementSeeds,
  type AchievementGroup,
  type AchievementSeed,
  type AchievementVisibility
} from "./domain/achievement-catalog";
export {
  GAMIFICATION_FACT_SOURCE_TYPES,
  GAMIFICATION_RARITIES,
  MIN_XP_SESSION_SECONDS,
  RARITY_STYLE_TOKENS,
  REWARD_NOTIFICATION_INTENSITIES,
  XP_MODEL_SCOPE,
  XP_SOURCE_RULES,
  evaluateXpSourceEligibility,
  getRewardIntensityForRarity,
  type GamificationFactSourceType,
  type GamificationRarity,
  type RewardNotificationIntensity,
  type XpEligibilityInput,
  type XpEligibilityResult,
  type XpSourceRule
} from "./domain/gamification-policy";
export {
  LEVEL_COUNT,
  LEVEL_CURVE,
  LEVEL_CURVE_MULTIPLIER,
  LEVEL_CURVE_VERSION,
  LEVEL_NAMES,
  getLevelForXp,
  getLevelThreshold,
  getNextLevelProgress,
  type LevelDefinition
} from "./domain/level-curve";
export {
  ACTIVE_MONTHLY_QUEST_SLOT,
  ACTIVE_WEEKLY_QUEST_SLOTS,
  QUEST_CATALOG_VERSION,
  QUEST_TEMPLATES,
  QUEST_TYPES,
  SEASONAL_QUEST_SEEDS,
  getActiveQuestTemplateSlugs,
  getQuestTemplate,
  getQuestWindow,
  type QuestTemplate,
  type QuestType,
  type QuestWindow
} from "./domain/quest-catalog";
export {
  DUO_DAY_CUTOFF_HOUR,
  FREEZE_LEVEL_INTERVAL,
  evaluateStreakTransition,
  getDuoDayKey,
  getFreezeCountForLevel,
  getFreezeEarnedForLevelChange,
  isStreakEligibleFact,
  type StreakFactType,
  type StreakTransition,
  type StreakTransitionInput
} from "./domain/streak-policy";

export type {
  GamificationAdjustmentInput,
  GamificationAchievementUnlockRecord,
  GamificationDueJobRecord,
  GamificationDuoId,
  GamificationFactInput,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationRewardNotificationInput,
  GamificationStreakStateRecord,
  GamificationUserId,
  GamificationUuid,
  GamificationXpLedgerRecord
} from "./application/ports";
