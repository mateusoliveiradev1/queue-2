import "server-only";

import { addGameToWishlistUseCase } from "./application/add-game-to-wishlist";
import { getLibraryGameDetailUseCase } from "./application/get-library-game-detail";
import { getLibraryOverviewUseCase } from "./application/get-library-overview";
import { getLibraryQueueUseCase } from "./application/get-library-queue";
import { moveLibraryGameUseCase } from "./application/move-library-game";
import { updateMemberPlatformsUseCase } from "./application/update-member-platforms";
import { libraryRepository } from "./infrastructure/library-repository";

export {
  getCommonPlatforms,
  isPlatformKey,
  normalizePlatformKey,
  normalizePlatformSet,
  formatPlatformLabel,
  PLATFORM_OPTIONS,
  SUPPORTED_PLATFORMS,
  type PlatformKey,
  type PlatformOption
} from "./domain/platforms";

export {
  getLibraryViewStatuses,
  getLibraryMovePolicy,
  getLockedStatusLabel,
  isActiveQueueStatus,
  isArchiveStatus,
  isLibraryStatus,
  isPhase2LibraryStatus,
  JOGANDO_LIMIT,
  LIBRARY_PAGE_SIZES,
  LIBRARY_QUEUE_SORTS,
  LIBRARY_QUEUE_VIEWS,
  LIBRARY_STATUSES,
  normalizeLibraryLimit,
  normalizeLibraryOffset,
  normalizeLibraryPage,
  normalizeLibrarySort,
  normalizeLibraryView,
  PHASE_2_ACTIVE_STATUSES,
  PHASE_4_CONFIRMATION_STATUSES,
  type FutureConfirmationStatus,
  type LibraryPageSize,
  type LibraryQueueSort,
  type LibraryQueueView,
  type LibraryMovePolicyResult,
  type LibraryStatus,
  type Phase2LibraryStatus
} from "./domain/library-policy";

export {
  calculateMatchScore,
  type MatchScore,
  type MatchScoreInput,
  type MatchScoreLabel
} from "./domain/match-score";

export {
  getLibraryOverviewUseCase,
  type GetLibraryOverviewResult
} from "./application/get-library-overview";
export {
  getLibraryQueueUseCase,
  type GetLibraryQueueResult
} from "./application/get-library-queue";
export { updateMemberPlatformsUseCase } from "./application/update-member-platforms";
export { addGameToWishlistUseCase } from "./application/add-game-to-wishlist";
export { moveLibraryGameUseCase } from "./application/move-library-game";
export {
  getLibraryGameDetailUseCase,
  type GetLibraryGameDetailResult
} from "./application/get-library-game-detail";

export type {
  AddGameToWishlistResult,
  LibraryCatalogGameFacts,
  LibraryGameDetailRecord,
  LibraryGameRecord,
  LibraryMemberPlatformRecord,
  LibraryOverviewRecord,
  LibraryQueueInput,
  LibraryQueuePageRecord,
  LibraryQueueRecord,
  LibraryQueueRepositoryInput,
  LibraryRepository,
  LibraryStatusCounts,
  MoveLibraryGameResult,
  UpdateMemberPlatformsResult
} from "./application/ports";

export {
  toLibraryGameDetailView,
  toLibraryOverviewView,
  type LibraryGameDetailView,
  type LibraryOverviewView
} from "./presentation/view-models";
export { LibraryStatusControls } from "./presentation/library-status-controls";
export { PlatformPicker } from "./presentation/platform-picker";

export function getLibraryOverview(userId: string) {
  return getLibraryOverviewUseCase(userId, libraryRepository);
}

export function getLibraryQueue(input: {
  userId: string;
  view: string | null | undefined;
  query: string | null | undefined;
  commonPlatformOnly: boolean | string | null | undefined;
  platform: string | null | undefined;
  sort: string | null | undefined;
  page?: number | string | null | undefined;
  limit: number | string | null | undefined;
  offset: number | string | null | undefined;
}) {
  return getLibraryQueueUseCase(input, libraryRepository);
}

export function updateMemberPlatforms(input: {
  userId: string;
  platforms: string[];
}) {
  return updateMemberPlatformsUseCase(input, libraryRepository);
}

export function addGameToWishlist(input: {
  userId: string;
  catalogGameId: string;
}) {
  return addGameToWishlistUseCase(input, libraryRepository);
}

export function moveLibraryGame(input: {
  userId: string;
  catalogGameId: string;
  status: string;
}) {
  return moveLibraryGameUseCase(input, libraryRepository);
}

export function getLibraryGameDetail(input: {
  userId: string;
  catalogGameId: string;
}) {
  return getLibraryGameDetailUseCase(input, libraryRepository);
}
