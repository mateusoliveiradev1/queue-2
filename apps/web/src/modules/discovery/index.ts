import type {
  AnswerMoodQuizInput,
  DiscoveryRepository,
  GetDiscoveryRecommendationsInput
} from "./application/ports";
import { getDiscoveryDeck } from "./application/get-discovery-deck";
import { searchDiscoveryGames } from "./application/search-discovery-games";
import { getMatchHistory } from "./application/get-match-history";
import {
  handoffDiscoveryMatchToLibrary,
  recordDiscoveryDecision
} from "./application/record-discovery-decision";

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
  DiscoveryLibraryHandoffInput,
  DiscoveryLibraryHandoffResult,
  DiscoveryMatchHistoryItem,
  DiscoveryMatchRecord,
  DiscoveryMemberContext,
  DiscoveryReadState,
  DiscoveryRepository,
  DiscoverySearchResult,
  DiscoverySearchValidationResult,
  DiscoveryUserId,
  GetDiscoveryDeckInput,
  GetDiscoveryRecommendationsInput,
  GetMatchHistoryInput,
  RecordDiscoveryDecisionInput,
  RecordDiscoveryDecisionResult,
  SearchDiscoveryGamesInput
} from "./application/ports";
export {
  DISCOVERY_SEARCH_MAX_LIMIT,
  DISCOVERY_SEARCH_MAX_QUERY_LENGTH,
  DISCOVERY_SEARCH_MIN_QUERY_LENGTH,
  normalizeDiscoverySearchInput
} from "./application/search-discovery-games";
export {
  getDiscoveryDeck,
  getMatchHistory,
  handoffDiscoveryMatchToLibrary,
  recordDiscoveryDecision,
  searchDiscoveryGames
};

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
