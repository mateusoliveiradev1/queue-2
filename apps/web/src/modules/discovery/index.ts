import type {
  DiscoveryRepository,
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

export type {
  DiscoveryCatalogGameId,
  DiscoveryDecisionRecord,
  DiscoveryDeckCard,
  DiscoveryDeckFilters,
  DiscoveryDuoId,
  DiscoveryMatchRecord,
  DiscoveryRepository,
  DiscoveryUserId,
  GetDiscoveryDeckInput,
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
