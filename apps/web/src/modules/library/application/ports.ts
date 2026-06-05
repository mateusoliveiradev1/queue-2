import type {
  LibraryQueueSort,
  LibraryQueueView,
  LibraryStatus,
  Phase2LibraryStatus
} from "../domain/library-policy";
import type { MatchScore } from "../domain/match-score";
import type { PlatformKey } from "../domain/platforms";

export type LibraryMemberPlatformRecord = {
  userId: string;
  platforms: PlatformKey[];
};

export type LibraryGameRecord = {
  id: string;
  duoId: string;
  catalogGameId: string;
  status: LibraryStatus;
  addedByUserId: string;
  statusUpdatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LibraryCatalogGameFacts = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  platforms: PlatformKey[];
  mainFlowEligible: boolean;
  coopCampaignConfirmed: boolean;
  hasReliableTimeEstimate: boolean;
  hasVerifiedAvailability: boolean;
};

export type LibraryGameDetailRecord = {
  libraryGame: LibraryGameRecord;
  catalogGame: LibraryCatalogGameFacts;
  memberPlatforms: [LibraryMemberPlatformRecord, LibraryMemberPlatformRecord] | [];
  matchScore: MatchScore;
};

export type LibraryOverviewRecord = {
  memberPlatforms: LibraryMemberPlatformRecord[];
  commonPlatforms: PlatformKey[];
  groups: Record<Phase2LibraryStatus, LibraryGameDetailRecord[]>;
  lockedStatuses: Array<"zerado" | "dropado">;
};

export type LibraryStatusCounts = Record<Phase2LibraryStatus, number>;

export type LibraryQueueInput = {
  userId: string;
  view: string | null | undefined;
  query: string | null | undefined;
  commonPlatformOnly: boolean | string | null | undefined;
  platform: string | null | undefined;
  sort: string | null | undefined;
  page?: number | string | null | undefined;
  limit: number | string | null | undefined;
  offset: number | string | null | undefined;
};

export type LibraryQueueRepositoryInput = {
  userId: string;
  view: LibraryQueueView;
  statuses: LibraryStatus[];
  query: string | null;
  commonPlatformOnly: boolean;
  platform: PlatformKey | null;
  sort: LibraryQueueSort;
  limit: 12 | 24;
  offset: number;
};

export type LibraryQueuePageRecord = {
  items: LibraryGameDetailRecord[];
  total: number;
  limit: 12 | 24;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type LibraryQueueRecord = {
  memberPlatforms: LibraryMemberPlatformRecord[];
  commonPlatforms: PlatformKey[];
  statusCounts: LibraryStatusCounts;
  archiveCount: number;
  nextQueue: LibraryGameDetailRecord[];
  playing: LibraryGameDetailRecord[];
  page: LibraryQueuePageRecord;
};

export type UpdateMemberPlatformsResult =
  | { ok: true; platforms: PlatformKey[] }
  | { ok: false; reason: "invalid-platform" | "membership-required" };

export type AddGameToWishlistResult =
  | { ok: true; game: LibraryGameRecord }
  | { ok: false; reason: "catalog-game-not-found" | "membership-required" };

export type LibraryGameStatusesResult =
  | { ok: true; statuses: Record<string, LibraryStatus> }
  | { ok: false; reason: "membership-required" };

export type MoveLibraryGameResult =
  | {
      ok: true;
      game: LibraryGameRecord;
      playOutcome?:
        | "principal-assigned"
        | "secondary-assigned"
        | "already-playing"
        | "active-removed";
    }
  | {
      ok: false;
      reason:
        | "future-confirmation-required"
        | "invalid-status"
        | "invalid-active-layout"
        | "jogando-limit-reached"
        | "library-game-not-found"
        | "membership-required"
        | "replacement-required";
      status?: LibraryStatus;
      replacement?: {
        availableActions: ["pause", "replace", "cancel"];
        autoPause: false;
        currentGames: Array<{
          libraryGameId: string;
          name: string;
          role: string;
          position: number;
        }>;
      };
    };

export interface LibraryPlayCoordinator {
  activatePlayingGame(input: {
    userId: string;
    catalogGameId: string;
  }): Promise<
    | {
        ok: true;
        outcome: "principal-assigned" | "secondary-assigned" | "already-playing";
      }
    | {
        ok: false;
        reason:
          | "invalid-active-layout"
          | "library-game-not-found"
          | "membership-required"
          | "replacement-required";
        replacement?: {
          availableActions: ["pause", "replace", "cancel"];
          autoPause: false;
          currentGames: Array<{
            libraryGameId: string;
            catalogGame: {
              name: string;
            };
            role: string;
            position: number;
          }>;
        };
      }
  >;
  deactivatePlayingGame(input: {
    userId: string;
    catalogGameId: string;
    nextStatus: "wishlist" | "pausado";
  }): Promise<
    | {
        ok: true;
      }
    | {
        ok: false;
        reason:
          | "invalid-active-layout"
          | "library-game-not-found"
          | "membership-required";
      }
  >;
}

export interface LibraryRepository {
  getOverview(userId: string): Promise<LibraryOverviewRecord | null>;
  getQueue(input: LibraryQueueRepositoryInput): Promise<LibraryQueueRecord | null>;
  updateMemberPlatforms(input: {
    userId: string;
    platforms: PlatformKey[];
  }): Promise<UpdateMemberPlatformsResult>;
  addGameToWishlist(input: {
    userId: string;
    catalogGameId: string;
  }): Promise<AddGameToWishlistResult>;
  getJogandoCount(userId: string): Promise<number>;
  getLibraryGame(input: {
    userId: string;
    catalogGameId: string;
  }): Promise<LibraryGameRecord | null>;
  getLibraryGameStatuses(input: {
    userId: string;
    catalogGameIds: string[];
  }): Promise<Record<string, LibraryStatus> | null>;
  moveLibraryGame(input: {
    userId: string;
    catalogGameId: string;
    status: Phase2LibraryStatus;
  }): Promise<MoveLibraryGameResult>;
  getGameDetail(input: {
    userId: string;
    catalogGameId: string;
  }): Promise<LibraryGameDetailRecord | null>;
}
