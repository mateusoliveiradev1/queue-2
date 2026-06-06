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
  MAX_CHAPTER_XP_AWARDS_PER_DUO_DAY,
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
export {
  applyGamificationFact,
  applyGamificationFactToTransaction
} from "./application/apply-gamification-fact";
export {
  getGamificationDashboard,
  getGamificationDashboardFromTransaction
} from "./application/get-gamification-dashboard";
export {
  getAchievements,
  getAchievementsFromTransaction
} from "./application/get-achievements";
export {
  getChallenges,
  getChallengesFromTransaction
} from "./application/get-challenges";
export {
  rebuildGamificationProjections,
  rebuildGamificationProjectionsInTransaction
} from "./application/rebuild-gamification-projections";
export {
  toChallengeRouteView,
  toAchievementRouteView,
  toGamificationDashboardView,
  toRewardToastView,
  type AchievementCardView,
  type AchievementGroupView,
  type AchievementRarityFilterOptionView,
  type AchievementRouteViewModel,
  type ChallengePeriodFilterOptionView,
  type ChallengeQuestCardViewModel,
  type ChallengeRouteViewModel,
  type ChallengeSectionViewModel,
  type ChallengeStreakPanelViewModel,
  type GamificationAchievementView,
  type GamificationDashboardViewModel,
  type GamificationLedgerEntryView,
  type GamificationQuestView,
  type GamificationStreakView,
  type RewardToastViewModel
} from "./presentation/view-models";
export { GamificationDashboardBand } from "./presentation/gamification-dashboard-band";
export { AchievementBadgeIcon } from "./presentation/achievement-badge-icon";
export { ChallengeBoard } from "./presentation/challenge-board";
export { AchievementGrid } from "./presentation/achievement-grid";
export { AchievementRarityFilter } from "./presentation/achievement-rarity-filter";
export { RewardToast } from "./presentation/reward-toast";
export { StreakPanel } from "./presentation/streak-panel";
export { XpLedgerPanel } from "./presentation/xp-ledger-panel";

export type {
  GamificationAdjustmentInput,
  GamificationAchievementGroupReadModel,
  GamificationAchievementReadModel,
  GamificationAchievementUnlockRecord,
  GamificationAchievementsRecord,
  GamificationAchievementSummary,
  GamificationApplyFactResult,
  GamificationChallengeQuestRecord,
  GamificationChallengeSectionRecord,
  GamificationChallengesRecord,
  GamificationDashboardRecord,
  GamificationDueJobRecord,
  GamificationDuoId,
  GamificationFactInput,
  GamificationLevelUpSummary,
  GamificationMembershipContext,
  GamificationProjectionRecord,
  GamificationProjectionRebuildResult,
  GamificationQuestCycleRecord,
  GamificationQuestProgressRecord,
  GamificationQuestProgressSummary,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationRewardNotificationInput,
  GamificationRewardSummary,
  GamificationStreakStateRecord,
  GamificationStreakSummary,
  GamificationUserId,
  GamificationUuid,
  GamificationXpLedgerRecord
} from "./application/ports";
