import type {
  AnswerMoodQuizInput,
  DiscoveryRepository
} from "./application/ports";
import { answerMoodQuiz } from "./application/answer-mood-quiz";
import { getDiscoveryDeck } from "./application/get-discovery-deck";
import { getLiveSession } from "./application/get-live-session";
import { searchDiscoveryGames } from "./application/search-discovery-games";
import { getMatchHistory } from "./application/get-match-history";
import { getSurpriseRecommendation } from "./application/get-surprise-recommendation";
import {
  handoffDiscoveryMatchToLibrary,
  recordDiscoveryDecision
} from "./application/record-discovery-decision";
import { startLiveSession } from "./application/start-live-session";

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
  DiscoveryCatalogRecommendationFact,
  DiscoveryCatalogSearch,
  DiscoveryDeckBuildResult,
  DiscoveryDecisionActionState,
  DiscoveryDecisionRecord,
  DiscoveryDeckCard,
  DiscoveryDeckFilters,
  DiscoveryDeckRepository,
  DiscoveryDuoId,
  DiscoveryGameReadState,
  DiscoveryLiveSessionPayload,
  DiscoveryLiveSessionRecord,
  DiscoveryLibraryHandoffInput,
  DiscoveryLibraryHandoffResult,
  DiscoveryMatchHistoryItem,
  DiscoveryMatchRecord,
  DiscoveryMemberContext,
  DiscoveryMoodQuizState,
  DiscoveryPushSubscription,
  DiscoveryPushSubscriptionInput,
  DiscoveryPushSubscriptionResult,
  DiscoveryReadState,
  DiscoveryRepository,
  DiscoverySearchResult,
  DiscoverySearchValidationResult,
  DiscoveryUserId,
  GetLiveSessionInput,
  GetDiscoveryDeckInput,
  GetDiscoveryRecommendationsInput,
  GetMatchHistoryInput,
  GetSurpriseRecommendationInput,
  GetSurpriseRecommendationResult,
  RecordDiscoveryDecisionInput,
  RecordDiscoveryDecisionResult,
  SearchDiscoveryGamesInput,
  StartLiveSessionInput,
  StartLiveSessionResult
} from "./application/ports";
export {
  DISCOVERY_PUSH_AUTH_MAX_LENGTH,
  DISCOVERY_PUSH_ENDPOINT_MAX_LENGTH,
  DISCOVERY_PUSH_KEY_MAX_LENGTH,
  disableDiscoveryPushSubscription,
  getDiscoveryPushPublicConfig,
  registerDiscoveryPushSubscription,
  type BrowserPushSubscriptionPayload,
  type RegisterDiscoveryPushSubscriptionInput,
  disableDiscoveryPushSubscriptionUseCase,
  registerDiscoveryPushSubscriptionUseCase
} from "./application/register-push-subscription";
export {
  DISCOVERY_SEARCH_MAX_LIMIT,
  DISCOVERY_SEARCH_MAX_QUERY_LENGTH,
  DISCOVERY_SEARCH_MIN_QUERY_LENGTH,
  normalizeDiscoverySearchInput
} from "./application/search-discovery-games";
export {
  answerMoodQuiz,
  getDiscoveryDeck,
  getLiveSession,
  getMatchHistory,
  getSurpriseRecommendation,
  handoffDiscoveryMatchToLibrary,
  recordDiscoveryDecision,
  searchDiscoveryGames,
  startLiveSession
};

export { DiscoveryDeck } from "./presentation/discovery-deck";
export { DiscoveryFilters } from "./presentation/discovery-filters";
export { DiscoverySearch } from "./presentation/discovery-search";
export { LivePanel } from "./presentation/live-panel";
export { MatchCelebration } from "./presentation/match-celebration";
export { MatchHistory } from "./presentation/match-history";
export { MoodQuiz } from "./presentation/mood-quiz";

export function answerDiscoveryMoodQuiz(
  input: AnswerMoodQuizInput,
  repository: Pick<DiscoveryRepository, "answerMoodQuiz" | "getReadState">,
  catalogSearch: import("./application/ports").DiscoveryCatalogSearch
) {
  return import("./application/answer-mood-quiz").then((module) =>
    module.answerMoodQuizUseCase(input, repository, catalogSearch)
  );
}
