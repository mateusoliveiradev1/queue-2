import type {
  DiscoveryDecision,
  DiscoveryDecisionEffect,
  DiscoveryLibraryHandoffStatus,
  DiscoveryMatchPolicyResult,
  DiscoverySourceMode
} from "../domain/discovery-policy";

export type DiscoveryCatalogGameId = string;
export type DiscoveryDuoId = string;
export type DiscoveryUserId = string;

export type DiscoveryDecisionRecord = {
  duoId: DiscoveryDuoId;
  userId: DiscoveryUserId;
  catalogGameId: DiscoveryCatalogGameId;
  decision: DiscoveryDecision;
  sourceMode: DiscoverySourceMode;
  decidedAt: Date;
  cooldownUntil: Date | null;
  preferenceWeight: number;
};

export type DiscoveryMatchRecord = {
  id: string;
  duoId: DiscoveryDuoId;
  catalogGameId: DiscoveryCatalogGameId;
  matchedAt: Date;
  createdFrom: DiscoverySourceMode;
  firstUserId: DiscoveryUserId;
  secondUserId: DiscoveryUserId;
  reasonSnapshot: string[];
  libraryHandoffStatus: DiscoveryLibraryHandoffStatus | null;
};

export type DiscoveryDeckFilters = {
  sourceMode?: DiscoverySourceMode;
  includeAlreadySeen?: boolean;
  commonPlatformOnly?: boolean;
  availability?: "free" | "game-pass";
  maxEstimatedMinutes?: number;
};

export type DiscoveryDeckCard = {
  catalogGameId: DiscoveryCatalogGameId;
  title: string;
  reasons: string[];
  alreadyInLibraryStatus: string | null;
};

export type GetDiscoveryDeckInput = {
  userId: DiscoveryUserId;
  filters?: DiscoveryDeckFilters;
  limit?: number;
};

export type RecordDiscoveryDecisionInput = {
  userId: DiscoveryUserId;
  catalogGameId: DiscoveryCatalogGameId;
  decision: DiscoveryDecision;
  sourceMode: DiscoverySourceMode;
};

export type RecordDiscoveryDecisionResult = {
  decision: DiscoveryDecisionRecord;
  effect: DiscoveryDecisionEffect;
  matchPolicy: DiscoveryMatchPolicyResult;
  match: DiscoveryMatchRecord | null;
};

export type DiscoveryRepository = {
  getDeck(input: GetDiscoveryDeckInput): Promise<DiscoveryDeckCard[]>;
  recordDecision(input: RecordDiscoveryDecisionInput): Promise<RecordDiscoveryDecisionResult>;
};
