import type {
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

export type UpdateMemberPlatformsResult =
  | { ok: true; platforms: PlatformKey[] }
  | { ok: false; reason: "invalid-platform" | "membership-required" };

export type AddGameToWishlistResult =
  | { ok: true; game: LibraryGameRecord }
  | { ok: false; reason: "catalog-game-not-found" | "membership-required" };

export type MoveLibraryGameResult =
  | { ok: true; game: LibraryGameRecord }
  | {
      ok: false;
      reason:
        | "future-confirmation-required"
        | "invalid-status"
        | "jogando-limit-reached"
        | "library-game-not-found"
        | "membership-required";
      status?: LibraryStatus;
    };

export interface LibraryRepository {
  getOverview(userId: string): Promise<LibraryOverviewRecord | null>;
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
