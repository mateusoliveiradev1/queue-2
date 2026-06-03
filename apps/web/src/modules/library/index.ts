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
  getLibraryMovePolicy,
  getLockedStatusLabel,
  isLibraryStatus,
  isPhase2LibraryStatus,
  JOGANDO_LIMIT,
  LIBRARY_STATUSES,
  PHASE_2_ACTIVE_STATUSES,
  PHASE_4_CONFIRMATION_STATUSES,
  type FutureConfirmationStatus,
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
  LibraryRepository,
  MoveLibraryGameResult,
  UpdateMemberPlatformsResult
} from "./application/ports";
