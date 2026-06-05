import "server-only";

import {
  activatePlayingGameUseCase,
  deactivatePlayingGameUseCase
} from "./application/activate-playing-game";
import { getCurrentPlayUseCase } from "./application/get-current-play";
import { promotePlayingGameUseCase } from "./application/promote-playing-game";
import { reorderPlayingGamesUseCase } from "./application/reorder-playing-games";
import { playRepository } from "./infrastructure/play-repository";

export {
  CHAPTER_COMPLETION_XP,
  DISALLOWED_NOTIFICATION_SCOPES,
  JOGANDO_PLAY_LIMIT,
  LIVE_SESSION_CONFIRMATION_XP,
  PLAY_GAME_ROLES,
  PLAY_NOTIFICATION_TYPES,
  PLAY_SESSION_KINDS,
  PLAY_SESSION_STATUSES,
  PLAY_TIMELINE_MARKERS,
  REMINDER_LEAD_MINUTES,
  SCHEDULED_SESSION_ATTENDANCE_XP,
  SECONDARY_PLAY_LIMIT,
  TERMINAL_TARGET_STATUSES,
  assignRoleForActivation,
  canRequestPushPermission,
  canSchedulePlayingGame,
  classifyTimelineMarkers,
  confirmDuoEffect,
  confirmTerminalRequest,
  createPendingConfirmationState,
  createTerminalRequest,
  evaluateLiveSessionStart,
  evaluateReminderPrecision,
  evaluateXpAwardEligibility,
  getChapterCompletionAward,
  getFourthGameDecision,
  getLiveSessionAward,
  getNotificationRealtimePolicy,
  getPushDisableEffect,
  getReminderDueAt,
  getReminderPreparedState,
  getScheduledSessionAward,
  getScheduledSessionMutationEffect,
  getServerElapsedSeconds,
  getSpoilerVisibility,
  isNotificationScopeAllowed,
  isPlayNotificationType,
  isTerminalTargetStatus,
  promoteSecondaryToPrincipal,
  validateActivePlayLayout,
  type ActivePlayGame,
  type ActivationRoleAssignment,
  type ConfirmationState,
  type DisallowedNotificationScope,
  type DoubleConfirmationResult,
  type FourthGameDecision,
  type NotificationRealtimePolicy,
  type PlayGameRole,
  type PlayNotificationType,
  type PlayPolicyFailureReason,
  type PlaySessionKind,
  type PlaySessionStatus,
  type PlayTimelineMarker,
  type PolicyResult,
  type PushDisableEffect,
  type PushPermissionTrigger,
  type ReminderPrecisionState,
  type ReminderRunnerCapability,
  type TimelineMarkerInput,
  type TerminalTargetStatus,
  type XpAwardEligibility
} from "./domain/play-policy";

export type {
  ActivePlayGameRecord,
  ActivatePlayingGameResult,
  CurrentPlayCatalogFacts,
  CurrentPlayGameRecord,
  CurrentPlayProgressRecord,
  CurrentPlayRecord,
  DeactivatePlayingGameResult,
  PlayCatalogGameId,
  PlayConfirmationRecord,
  PlayDuoId,
  PlayLibraryGameId,
  PlayMembershipContext,
  PlayNotificationInput,
  PlayNotificationRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PromotePlayingGameResult,
  ReorderPlayingGamesResult,
  PlaySessionRecord,
  PlayTerminalRequestRecord,
  PlayUserId,
  PlayXpAwardInput,
  PlayXpAwardRecord
} from "./application/ports";

export {
  activatePlayingGameUseCase,
  deactivatePlayingGameUseCase
} from "./application/activate-playing-game";
export {
  getCurrentPlayUseCase,
  type GetCurrentPlayResult
} from "./application/get-current-play";
export {
  promotePlayingGameUseCase
} from "./application/promote-playing-game";
export {
  reorderPlayingGamesUseCase
} from "./application/reorder-playing-games";

export function getCurrentPlay(userId: string) {
  return getCurrentPlayUseCase(userId, playRepository);
}

export function activatePlayingGame(input: {
  userId: string;
  catalogGameId: string;
}) {
  return activatePlayingGameUseCase(input, playRepository);
}

export function deactivatePlayingGame(input: {
  userId: string;
  catalogGameId: string;
  nextStatus: "wishlist" | "pausado";
}) {
  return deactivatePlayingGameUseCase(input, playRepository);
}

export function reorderPlayingGames(input: {
  userId: string;
  orderedLibraryGameIds: string[];
}) {
  return reorderPlayingGamesUseCase(input, playRepository);
}

export function promotePlayingGame(input: {
  userId: string;
  libraryGameId: string;
}) {
  return promotePlayingGameUseCase(input, playRepository);
}

export { PlayingNowDashboard } from "./presentation/playing-now-dashboard";
export { PlayingOrderControls } from "./presentation/playing-order-controls";
export {
  toPlayingNowView,
  type PlayingNowGameView,
  type PlayingNowViewModel
} from "./presentation/view-models";
