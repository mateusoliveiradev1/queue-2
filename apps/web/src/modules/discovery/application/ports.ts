import type {
  DiscoveryDecision,
  DiscoveryDecisionEffect,
  DiscoveryLibraryHandoffStatus,
  DiscoveryMatchPolicyResult,
  DiscoverySourceMode
} from "../domain/discovery-policy";
import type {
  CollaborativeInfluenceInput,
  DiscoveryRecommendation,
  DiscoveryRecommendationFilterInput,
  DiscoveryRecommendationGameFacts,
  DiscoveryRecommendationResult
} from "../domain/recommendation-policy";
import type {
  DuoMoodMergeResult,
  MoodQuizAnswers
} from "../domain/mood-quiz";
import type {
  CatalogGameCardView,
  SearchCatalogGamesInput
} from "../../catalog";
import type { LibraryStatus } from "../../library";

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

export type DiscoveryMatchHistoryItem = {
  match: DiscoveryMatchRecord;
  slug: string;
  title: string;
  coverUrl: string | null;
  libraryStatus: LibraryStatus | null;
  reasons: string[];
};

export type DiscoveryDeckFilters = {
  sourceMode?: DiscoverySourceMode;
  includeAlreadySeen?: boolean;
  commonPlatformOnly?: boolean;
  availability?: "free" | "game-pass";
  maxEstimatedMinutes?: number;
  recommendation?: DiscoveryRecommendationFilterInput;
};

export type DiscoveryMemberContext = {
  duoId: DiscoveryDuoId;
  userId: DiscoveryUserId;
  partnerUserId: DiscoveryUserId | null;
  memberUserIds: DiscoveryUserId[];
  memberPlatforms: {
    first: string[];
    second: string[];
  };
};

export type DiscoveryGameReadState = {
  catalogGameId: DiscoveryCatalogGameId;
  currentMemberDecision: DiscoveryDecisionRecord | null;
  seenByCurrentMember: boolean;
  seenByAnyMember: boolean;
  libraryStatus: LibraryStatus | null;
  match: DiscoveryMatchRecord | null;
};

export type DiscoveryReadState = {
  context: DiscoveryMemberContext | null;
  games: DiscoveryGameReadState[];
  positiveProfile: {
    genres: string[];
    tags: string[];
  };
  collaborative: CollaborativeInfluenceInput;
};

export type DiscoveryDeckCard = {
  catalogGameId: DiscoveryCatalogGameId;
  slug: string;
  title: string;
  coverUrl: string | null;
  releaseLabel: string;
  platformLabels: string[];
  genreLabels: string[];
  sourceMeta: CatalogGameCardView["sourceMeta"];
  timeEstimateLabel: string;
  availabilityLabel: string;
  reasons: string[];
  libraryStatus: LibraryStatus | null;
  libraryActionState:
    | "can-add"
    | "can-move"
    | "blocked-by-future-confirmation";
  allowedLibraryActions: DiscoveryLibraryHandoffStatus[];
};

export type GetDiscoveryDeckInput = {
  userId: DiscoveryUserId;
  filters?: DiscoveryDeckFilters;
  limit?: number;
};

export type SearchDiscoveryGamesInput = {
  userId: DiscoveryUserId;
  query: string;
  limit?: number;
  includeAlreadySeen?: boolean;
  filters?: DiscoveryDeckFilters;
};

export type DiscoverySearchValidationResult =
  | {
      ok: true;
      input: {
        query: string;
        limit: number;
        includeAlreadySeen: boolean;
      };
    }
  | {
      ok: false;
      reason: "query-too-short" | "query-too-long" | "invalid-limit";
    };

export type DiscoverySearchResult =
  | {
      ok: true;
      cards: DiscoveryDeckCard[];
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "query-too-short"
        | "query-too-long"
        | "invalid-limit";
    };

export type RecordDiscoveryDecisionInput = {
  userId: DiscoveryUserId;
  catalogGameId: DiscoveryCatalogGameId;
  decision: DiscoveryDecision;
  sourceMode: DiscoverySourceMode;
};

export type DiscoveryDecisionActionState =
  | {
      kind: "card-advanced";
      catalogGameId: DiscoveryCatalogGameId;
    }
  | {
      kind: "cooldown-set";
      catalogGameId: DiscoveryCatalogGameId;
      cooldownUntil: Date;
    }
  | {
      kind: "match-created";
      catalogGameId: DiscoveryCatalogGameId;
      match: DiscoveryMatchRecord;
    }
  | {
      kind: "already-matched";
      catalogGameId: DiscoveryCatalogGameId;
      match: DiscoveryMatchRecord;
    };

export type RecordDiscoveryDecisionResult =
  | {
      ok: true;
      state: DiscoveryDecisionActionState;
      decision: DiscoveryDecisionRecord;
      effect: DiscoveryDecisionEffect;
      matchPolicy: DiscoveryMatchPolicyResult;
      match: DiscoveryMatchRecord | null;
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "catalog-game-not-found"
        | "invalid-decision"
        | "invalid-source-mode";
    };

export type DiscoveryLibraryHandoffInput = {
  userId: DiscoveryUserId;
  catalogGameId: DiscoveryCatalogGameId;
  status: string;
};

export type DiscoveryLibraryHandoffResult =
  | {
      ok: true;
      state: {
        kind: "library-updated";
        catalogGameId: DiscoveryCatalogGameId;
        status: DiscoveryLibraryHandoffStatus;
      };
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "catalog-game-not-found"
        | "library-game-not-found"
        | "invalid-status"
        | "future-confirmation-required"
        | "jogando-limit-reached";
      status?: string;
    };

export type GetMatchHistoryInput = {
  userId: DiscoveryUserId;
  limit?: number;
};

export type AnswerMoodQuizInput = {
  userId: DiscoveryUserId;
  answers: MoodQuizAnswers;
};

export type AnswerMoodQuizResult = {
  mood: DuoMoodMergeResult;
  recommendations: DiscoveryRecommendation[];
};

export type GetDiscoveryRecommendationsInput = {
  userId: DiscoveryUserId;
  filters?: DiscoveryRecommendationFilterInput;
};

export type DiscoveryCatalogSearch = (
  input?: SearchCatalogGamesInput
) => Promise<CatalogGameCardView[]>;

export type DiscoveryDeckRepository = {
  getReadState(input: {
    userId: DiscoveryUserId;
    catalogGameIds: DiscoveryCatalogGameId[];
  }): Promise<DiscoveryReadState>;
};

export type DiscoveryRepository = DiscoveryDeckRepository & {
  recordDecision(input: RecordDiscoveryDecisionInput): Promise<RecordDiscoveryDecisionResult>;
  markMatchLibraryHandoff(input: {
    userId: DiscoveryUserId;
    catalogGameId: DiscoveryCatalogGameId;
    status: DiscoveryLibraryHandoffStatus;
  }): Promise<void>;
  getMatchHistory(input: GetMatchHistoryInput): Promise<DiscoveryMatchHistoryItem[]>;
  answerMoodQuiz(input: AnswerMoodQuizInput): Promise<AnswerMoodQuizResult>;
  getRecommendations(input: GetDiscoveryRecommendationsInput): Promise<DiscoveryRecommendationResult>;
};

export type DiscoveryRecommendationFactSource = {
  cards: CatalogGameCardView[];
  readState: DiscoveryReadState;
  filters?: DiscoveryDeckFilters;
};

export type DiscoveryCardBuildInput = {
  card: CatalogGameCardView;
  readState: DiscoveryReadState;
  recommendation?: DiscoveryRecommendation;
};

export type DiscoveryDeckBuildResult = {
  cards: DiscoveryDeckCard[];
  recommendations: DiscoveryRecommendation[];
};

export type DiscoveryCatalogRecommendationFact = DiscoveryRecommendationGameFacts;
