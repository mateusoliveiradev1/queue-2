import type {
  AnswerMoodQuizInput,
  DiscoveryRepository,
  GetDiscoveryRecommendationsInput,
  GetDiscoveryDeckInput,
  RecordDiscoveryDecisionInput
} from "./application/ports";

export {
  canCreateDiscoveryMatch,
  DISCOVERY_DECISIONS,
  DISCOVERY_LIBRARY_HANDOFF_STATUSES,
  DISCOVERY_SOURCE_MODES,
  evaluateDiscoveryDecision,
  getDiscoveryLibraryHandoffPolicy,
  isDiscoveryDecision,
  isDiscoveryLibraryHandoffStatus,
  isDiscoverySourceMode,
  NOT_NOW_COOLDOWN_DAYS,
  shouldExcludeFromCurrentDeck,
  type DiscoveryDecision,
  type DiscoveryDecisionEffect,
  type DiscoveryLibraryHandoffPolicyResult,
  type DiscoveryLibraryHandoffStatus,
  type DiscoveryMatchPolicyResult,
  type DiscoverySourceMode
} from "./domain/discovery-policy";

export {
  mergeDuoMoodAnswers,
  moodToTags,
  MOOD_COMMITMENT_ANSWERS,
  MOOD_ENERGY_ANSWERS,
  MOOD_QUIZ_QUESTIONS,
  MOOD_VIBE_ANSWERS,
  type DuoMoodMergeResult,
  type MergedDuoMood,
  type MoodCommitmentAnswer,
  type MoodEnergyAnswer,
  type MoodQuestionKey,
  type MoodQuizAnswers,
  type MoodVibeAnswer
} from "./domain/mood-quiz";

export {
  COLLABORATIVE_MIN_CROSS_DUO_POSITIVES,
  COLLABORATIVE_MIN_CURRENT_DUO_DECISIONS,
  CONTROLLED_VARIETY_RATIO,
  DISCOVERY_COOP_TYPES,
  DISCOVERY_EDITORIAL_RARITIES,
  DISCOVERY_PLATFORM_KEYS,
  evaluateCollaborativeInfluence,
  normalizeRecommendationFilters,
  rankDiscoveryRecommendations,
  type CollaborativeInfluenceInput,
  type CollaborativeInfluenceResult,
  type DiscoveryAvailabilityFact,
  type DiscoveryAvailabilityType,
  type DiscoveryCoopType,
  type DiscoveryEditorialRarity,
  type DiscoveryPlatformKey,
  type DiscoveryRecommendation,
  type DiscoveryRecommendationFilterInput,
  type DiscoveryRecommendationFilterResult,
  type DiscoveryRecommendationFilters,
  type DiscoveryRecommendationGameFacts,
  type DiscoveryRecommendationResult
} from "./domain/recommendation-policy";

export type {
  AnswerMoodQuizInput,
  AnswerMoodQuizResult,
  DiscoveryCatalogGameId,
  DiscoveryDecisionRecord,
  DiscoveryDeckCard,
  DiscoveryDeckFilters,
  DiscoveryDuoId,
  DiscoveryMatchRecord,
  DiscoveryRepository,
  DiscoveryUserId,
  GetDiscoveryDeckInput,
  GetDiscoveryRecommendationsInput,
  RecordDiscoveryDecisionInput,
  RecordDiscoveryDecisionResult
} from "./application/ports";

export function getDiscoveryDeck(
  input: GetDiscoveryDeckInput,
  repository: DiscoveryRepository
) {
  return repository.getDeck(input);
}

export function recordDiscoveryDecision(
  input: RecordDiscoveryDecisionInput,
  repository: DiscoveryRepository
) {
  return repository.recordDecision(input);
}

export function answerDiscoveryMoodQuiz(
  input: AnswerMoodQuizInput,
  repository: DiscoveryRepository
) {
  return repository.answerMoodQuiz(input);
}

export function getDiscoveryRecommendations(
  input: GetDiscoveryRecommendationsInput,
  repository: DiscoveryRepository
) {
  return repository.getRecommendations(input);
}
