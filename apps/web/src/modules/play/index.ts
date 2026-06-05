import "server-only";

import {
  activatePlayingGameUseCase,
  deactivatePlayingGameUseCase
} from "./application/activate-playing-game";
import { confirmPlaySessionUseCase } from "./application/confirm-play-session";
import { endLiveSessionUseCase } from "./application/end-live-session";
import { getCurrentPlayUseCase } from "./application/get-current-play";
import { getGamePlayDetailUseCase } from "./application/get-game-play-detail";
import { getGameTimelineUseCase } from "./application/get-game-timeline";
import { logOfflineSessionUseCase } from "./application/log-offline-session";
import {
  createMomentoUseCase,
  revealMomentoSpoilerUseCase
} from "./application/manage-momentos";
import {
  createPlayChapterUseCase,
  setPlayChapterCompletionUseCase
} from "./application/manage-play-chapters";
import { promotePlayingGameUseCase } from "./application/promote-playing-game";
import {
  cancelTerminalStatusUseCase,
  confirmTerminalStatusUseCase,
  requestTerminalStatusUseCase
} from "./application/request-terminal-status";
import { reorderPlayingGamesUseCase } from "./application/reorder-playing-games";
import { startLiveSessionUseCase } from "./application/start-live-session";
import { updatePlayProgressUseCase } from "./application/update-play-progress";
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
export {
  TIMELINE_MILESTONE_KINDS,
  classifyTimelineMilestones,
  getTimelineMilestoneCopy,
  type TimelineMilestoneInput,
  type TimelineMilestoneKind,
  type TimelineMilestoneCopy
} from "./domain/milestone-policy";

export type {
  ActivePlayGameRecord,
  ActivatePlayingGameResult,
  CurrentPlayCatalogFacts,
  CurrentPlayGameRecord,
  CurrentPlayProgressRecord,
  CurrentPlayRecord,
  DeactivatePlayingGameResult,
  GameTimelineRecord,
  GamePlayDetailRecord,
  PlayCatalogGameId,
  PlayChapterRecord,
  PlayConfirmationRecord,
  PlayDuoId,
  PlayLibraryGameId,
  PlayMembershipContext,
  PlayMomentoRecord,
  PlayNotificationInput,
  PlayNotificationRecord,
  PlayProgressRecord,
  PlayReminderJobRecord,
  PlayRepository,
  PlayRepositoryTransaction,
  PlaySessionDetailRecord,
  PlayTimelineEvent,
  PlayTimelineMilestoneRecord,
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
  getGamePlayDetailUseCase,
  type GetGamePlayDetailResult
} from "./application/get-game-play-detail";
export {
  getGameTimelineUseCase,
  type GetGameTimelineResult
} from "./application/get-game-timeline";
export {
  startLiveSessionUseCase,
  type StartLiveSessionResult
} from "./application/start-live-session";
export {
  endLiveSessionUseCase,
  type EndLiveSessionResult
} from "./application/end-live-session";
export {
  confirmPlaySessionUseCase,
  type ConfirmPlaySessionResult
} from "./application/confirm-play-session";
export {
  logOfflineSessionUseCase,
  type LogOfflineSessionResult
} from "./application/log-offline-session";
export {
  updatePlayProgressUseCase,
  type UpdatePlayProgressResult
} from "./application/update-play-progress";
export {
  createPlayChapterUseCase,
  setPlayChapterCompletionUseCase,
  type CreatePlayChapterResult,
  type SetPlayChapterCompletionResult
} from "./application/manage-play-chapters";
export {
  createMomentoUseCase,
  revealMomentoSpoilerUseCase,
  type CreateMomentoResult,
  type RevealMomentoSpoilerResult
} from "./application/manage-momentos";
export {
  cancelTerminalStatusUseCase,
  confirmTerminalStatusUseCase,
  requestTerminalStatusUseCase,
  type CancelTerminalStatusResult,
  type ConfirmTerminalStatusResult,
  type RequestTerminalStatusResult
} from "./application/request-terminal-status";
export {
  promotePlayingGameUseCase
} from "./application/promote-playing-game";
export {
  reorderPlayingGamesUseCase
} from "./application/reorder-playing-games";

export function getCurrentPlay(userId: string) {
  return getCurrentPlayUseCase(userId, playRepository);
}

export function getGamePlayDetail(input: {
  userId: string;
  catalogGameId: string;
}) {
  return getGamePlayDetailUseCase(input, playRepository);
}

export function getGameTimeline(input: {
  userId: string;
  catalogGameId: string;
  estimatedMinutes: number | null;
}) {
  return getGameTimelineUseCase(input, playRepository);
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

export function startLiveSession(input: {
  userId: string;
  catalogGameId: string;
}) {
  return startLiveSessionUseCase(input, playRepository);
}

export function endLiveSession(input: {
  userId: string;
  sessionId: string;
}) {
  return endLiveSessionUseCase(input, playRepository);
}

export function confirmPlaySession(input: {
  userId: string;
  sessionId: string;
}) {
  return confirmPlaySessionUseCase(input, playRepository);
}

export function logOfflineSession(input: {
  userId: string;
  catalogGameId: string;
  durationMinutes: number;
}) {
  return logOfflineSessionUseCase(input, playRepository);
}

export function updatePlayProgress(input: {
  userId: string;
  catalogGameId: string;
  subjectivePercent: number | null;
}) {
  return updatePlayProgressUseCase(input, playRepository);
}

export function createPlayChapter(input: {
  userId: string;
  catalogGameId: string;
  title: string;
}) {
  return createPlayChapterUseCase(input, playRepository);
}

export function setPlayChapterCompletion(input: {
  userId: string;
  chapterId: string;
  completed: boolean;
}) {
  return setPlayChapterCompletionUseCase(input, playRepository);
}

export function requestTerminalStatus(input: {
  userId: string;
  catalogGameId: string;
  targetStatus: string;
}) {
  return requestTerminalStatusUseCase(input, playRepository);
}

export function cancelTerminalStatus(input: {
  userId: string;
  requestId: string;
}) {
  return cancelTerminalStatusUseCase(input, playRepository);
}

export function confirmTerminalStatus(input: {
  userId: string;
  requestId: string;
}) {
  return confirmTerminalStatusUseCase(input, playRepository);
}

export function createMomento(input: {
  userId: string;
  catalogGameId: string;
  body: string;
  isSpoiler: boolean;
  sessionId?: string | null;
}) {
  return createMomentoUseCase(input, playRepository);
}

export function revealMomentoSpoiler(input: {
  userId: string;
  momentoId: string;
}) {
  return revealMomentoSpoilerUseCase(input, playRepository);
}

export { PlayingNowDashboard } from "./presentation/playing-now-dashboard";
export { PlayingOrderControls } from "./presentation/playing-order-controls";
export { ChapterList } from "./presentation/chapter-list";
export { JogamosHojeForm } from "./presentation/jogamos-hoje-form";
export { LiveSessionPanel } from "./presentation/live-session-panel";
export { ProgressPanel } from "./presentation/progress-panel";
export { TerminalStatusPanel } from "./presentation/terminal-status-panel";
export { MilestoneBadge } from "./presentation/milestone-badge";
export { MomentoForm } from "./presentation/momento-form";
export { SpoilerReveal } from "./presentation/spoiler-reveal";
export { Timeline } from "./presentation/timeline";
export {
  toPlayingNowView,
  type PlayingNowGameView,
  type PlayingNowViewModel
} from "./presentation/view-models";
