export const JOGANDO_PLAY_LIMIT = 3;
export const SECONDARY_PLAY_LIMIT = 2;
export const CHAPTER_COMPLETION_XP = 25;
export const LIVE_SESSION_CONFIRMATION_XP = 30;
export const SCHEDULED_SESSION_ATTENDANCE_XP = 100;
export const REMINDER_LEAD_MINUTES = 30;

export const PLAY_GAME_ROLES = ["principal", "secondary"] as const;
export const PLAY_SESSION_KINDS = ["live", "offline"] as const;
export const PLAY_SESSION_STATUSES = [
  "active",
  "pending_confirmation",
  "confirmed",
  "cancelled"
] as const;
export const TERMINAL_TARGET_STATUSES = ["zerado", "dropado"] as const;
export const PLAY_NOTIFICATION_TYPES = [
  "session-confirmation",
  "scheduled-session",
  "reminder-sent",
  "live-session",
  "terminal-request",
  "push-failure",
  "push-disabled"
] as const;
export const PLAY_TIMELINE_MARKERS = [
  "first-session",
  "night-session",
  "marathon",
  "estimated-time-50",
  "estimated-time-100",
  "contextual-viciado",
  "contextual-pausar"
] as const;
export const DISALLOWED_NOTIFICATION_SCOPES = [
  "chat",
  "comment",
  "mention",
  "social-feed",
  "competitive-ranking"
] as const;

export type PlayGameRole = (typeof PLAY_GAME_ROLES)[number];
export type PlaySessionKind = (typeof PLAY_SESSION_KINDS)[number];
export type PlaySessionStatus = (typeof PLAY_SESSION_STATUSES)[number];
export type TerminalTargetStatus = (typeof TERMINAL_TARGET_STATUSES)[number];
export type PlayNotificationType = (typeof PLAY_NOTIFICATION_TYPES)[number];
export type PlayTimelineMarker = (typeof PLAY_TIMELINE_MARKERS)[number];
export type DisallowedNotificationScope =
  (typeof DISALLOWED_NOTIFICATION_SCOPES)[number];

export type ActivePlayGame = {
  id: string;
  role: PlayGameRole;
  position: number;
};

export type PlayPolicyFailureReason =
  | "fourth-playing-game"
  | "invalid-active-layout"
  | "principal-required"
  | "multiple-principal-games"
  | "duplicate-active-position"
  | "not-secondary-game"
  | "active-live-session-exists"
  | "partner-confirmation-required"
  | "already-confirmed"
  | "award-already-applied"
  | "effect-not-confirmed"
  | "invalid-terminal-status"
  | "terminal-request-not-pending"
  | "scheduled-game-not-playing"
  | "reminder-precision-unavailable"
  | "push-permission-not-action-triggered"
  | "notification-out-of-scope";

export type PolicyResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      reason: PlayPolicyFailureReason;
    };

export type ActivationRoleAssignment = {
  role: PlayGameRole;
  position: number;
};

export type FourthGameDecision = {
  allowed: false;
  availableActions: ["pause", "replace", "cancel"];
  autoPause: false;
};

export type ConfirmationState = {
  requiredUserIds: string[];
  confirmedUserIds: string[];
};

export type DoubleConfirmationResult = {
  confirmedUserIds: string[];
  pendingUserIds: string[];
  doubleConfirmed: boolean;
};

export type XpAwardEligibility = {
  amount: number;
  awardKey: string;
};

export type ReminderRunnerCapability =
  | "precise-minute"
  | "imprecise-hour"
  | "daily-only"
  | "unconfigured";

export type ReminderPrecisionState = {
  dueAt: Date;
  canPromiseExactReminder: boolean;
  copyState: "exact-reminder" | "prepared-not-guaranteed";
};

export type PushPermissionTrigger =
  | "app-load"
  | "schedule-created"
  | "attendance-confirmed"
  | "manual-settings";

export type PushDisableEffect = {
  pushEnabled: false;
  schedulesRemainActive: true;
  inAppNotificationsRemainActive: true;
};

export type NotificationRealtimePolicy = {
  usesPolling: true;
  refreshOnFocus: true;
  usesWebPushWhenAllowed: true;
  requiresWebSocket: false;
};

export type TimelineMarkerInput = {
  confirmedSessionCountBefore: number;
  sessionStartedAt: Date;
  durationSeconds: number;
  accumulatedConfirmedSecondsAfter: number;
  estimatedMinutes: number | null;
};

export function assignRoleForActivation(
  activeGames: ActivePlayGame[]
): PolicyResult<ActivationRoleAssignment> {
  if (activeGames.length >= JOGANDO_PLAY_LIMIT) {
    return { ok: false, reason: "fourth-playing-game" };
  }

  if (!activeGames.some((game) => game.role === "principal")) {
    return {
      ok: true,
      value: {
        role: "principal",
        position: 1
      }
    };
  }

  const usedPositions = new Set(activeGames.map((game) => game.position));
  const position = [2, 3].find((candidate) => !usedPositions.has(candidate));

  if (!position) {
    return { ok: false, reason: "invalid-active-layout" };
  }

  return {
    ok: true,
    value: {
      role: "secondary",
      position
    }
  };
}

export function validateActivePlayLayout(
  activeGames: ActivePlayGame[]
): PolicyResult<ActivePlayGame[]> {
  if (activeGames.length > JOGANDO_PLAY_LIMIT) {
    return { ok: false, reason: "fourth-playing-game" };
  }

  if (activeGames.length === 0) {
    return { ok: true, value: [] };
  }

  const principalCount = activeGames.filter((game) => game.role === "principal").length;

  if (principalCount === 0) {
    return { ok: false, reason: "principal-required" };
  }

  if (principalCount > 1) {
    return { ok: false, reason: "multiple-principal-games" };
  }

  const positions = new Set<number>();

  for (const game of activeGames) {
    if (positions.has(game.position)) {
      return { ok: false, reason: "duplicate-active-position" };
    }
    positions.add(game.position);

    if (
      (game.role === "principal" && game.position !== 1)
      || (game.role === "secondary" && ![2, 3].includes(game.position))
    ) {
      return { ok: false, reason: "invalid-active-layout" };
    }
  }

  return {
    ok: true,
    value: sortActivePlayGames(activeGames)
  };
}

export function promoteSecondaryToPrincipal(
  activeGames: ActivePlayGame[],
  targetGameId: string
): PolicyResult<ActivePlayGame[]> {
  const layout = validateActivePlayLayout(activeGames);

  if (!layout.ok) {
    return layout;
  }

  const target = layout.value.find((game) => game.id === targetGameId);

  if (!target || target.role !== "secondary") {
    return { ok: false, reason: "not-secondary-game" };
  }

  return {
    ok: true,
    value: sortActivePlayGames(
      layout.value.map((game) => {
        if (game.id === target.id) {
          return {
            ...game,
            role: "principal",
            position: 1
          };
        }

        if (game.role === "principal") {
          return {
            ...game,
            role: "secondary",
            position: target.position
          };
        }

        return game;
      })
    )
  };
}

export function getFourthGameDecision(
  activeGames: ActivePlayGame[]
): PolicyResult<FourthGameDecision | { allowed: true }> {
  if (activeGames.length >= JOGANDO_PLAY_LIMIT) {
    return {
      ok: true,
      value: {
        allowed: false,
        availableActions: ["pause", "replace", "cancel"],
        autoPause: false
      }
    };
  }

  return {
    ok: true,
    value: {
      allowed: true
    }
  };
}

export function evaluateLiveSessionStart(input: {
  activeLiveSessionId: string | null;
}): PolicyResult<{ action: "start" } | { action: "resume-or-end"; sessionId: string }> {
  if (input.activeLiveSessionId) {
    return {
      ok: false,
      reason: "active-live-session-exists"
    };
  }

  return {
    ok: true,
    value: {
      action: "start"
    }
  };
}

export function getServerElapsedSeconds(input: {
  serverStartedAt: Date;
  serverNow: Date;
}): number {
  return Math.max(
    0,
    Math.floor((input.serverNow.getTime() - input.serverStartedAt.getTime()) / 1000)
  );
}

export function createPendingConfirmationState(
  memberUserIds: string[]
): ConfirmationState {
  return {
    requiredUserIds: [...new Set(memberUserIds)].slice(0, 2),
    confirmedUserIds: []
  };
}

export function confirmDuoEffect(input: {
  actorUserId: string;
  state: ConfirmationState;
}): PolicyResult<DoubleConfirmationResult> {
  if (!input.state.requiredUserIds.includes(input.actorUserId)) {
    return { ok: false, reason: "partner-confirmation-required" };
  }

  if (input.state.confirmedUserIds.includes(input.actorUserId)) {
    return { ok: false, reason: "already-confirmed" };
  }

  const confirmedUserIds = [...input.state.confirmedUserIds, input.actorUserId];
  const pendingUserIds = input.state.requiredUserIds.filter(
    (userId) => !confirmedUserIds.includes(userId)
  );

  return {
    ok: true,
    value: {
      confirmedUserIds,
      pendingUserIds,
      doubleConfirmed: pendingUserIds.length === 0
    }
  };
}

export function evaluateXpAwardEligibility(input: {
  doubleConfirmed: boolean;
  awardAlreadyApplied: boolean;
  amount: number;
  awardKey: string;
}): PolicyResult<XpAwardEligibility> {
  if (!input.doubleConfirmed) {
    return { ok: false, reason: "partner-confirmation-required" };
  }

  if (input.awardAlreadyApplied) {
    return { ok: false, reason: "award-already-applied" };
  }

  return {
    ok: true,
    value: {
      amount: input.amount,
      awardKey: input.awardKey
    }
  };
}

export function getChapterCompletionAward(input: {
  chapterId: string;
  doubleConfirmed: boolean;
  awardAlreadyApplied: boolean;
}): PolicyResult<XpAwardEligibility> {
  return evaluateXpAwardEligibility({
    doubleConfirmed: input.doubleConfirmed,
    awardAlreadyApplied: input.awardAlreadyApplied,
    amount: CHAPTER_COMPLETION_XP,
    awardKey: `chapter:${input.chapterId}`
  });
}

export function getLiveSessionAward(input: {
  sessionId: string;
  doubleConfirmed: boolean;
  awardAlreadyApplied: boolean;
}): PolicyResult<XpAwardEligibility> {
  return evaluateXpAwardEligibility({
    doubleConfirmed: input.doubleConfirmed,
    awardAlreadyApplied: input.awardAlreadyApplied,
    amount: LIVE_SESSION_CONFIRMATION_XP,
    awardKey: `live-session:${input.sessionId}`
  });
}

export function getScheduledSessionAward(input: {
  scheduledSessionId: string;
  doubleConfirmed: boolean;
  awardAlreadyApplied: boolean;
}): PolicyResult<XpAwardEligibility> {
  return evaluateXpAwardEligibility({
    doubleConfirmed: input.doubleConfirmed,
    awardAlreadyApplied: input.awardAlreadyApplied,
    amount: SCHEDULED_SESSION_ATTENDANCE_XP,
    awardKey: `scheduled-session:${input.scheduledSessionId}`
  });
}

export function getSpoilerVisibility(input: {
  isSpoiler: boolean;
  viewerHasRevealed: boolean;
}): { visible: boolean; requiresReveal: boolean } {
  if (!input.isSpoiler) {
    return {
      visible: true,
      requiresReveal: false
    };
  }

  return {
    visible: input.viewerHasRevealed,
    requiresReveal: !input.viewerHasRevealed
  };
}

export function classifyTimelineMarkers(
  input: TimelineMarkerInput
): PlayTimelineMarker[] {
  const markers: PlayTimelineMarker[] = [];

  if (input.confirmedSessionCountBefore === 0) {
    markers.push("first-session");
  }

  if (input.sessionStartedAt.getUTCHours() >= 22 || input.sessionStartedAt.getUTCHours() < 5) {
    markers.push("night-session");
  }

  if (input.durationSeconds >= 4 * 60 * 60) {
    markers.push("marathon");
  }

  if (input.estimatedMinutes && input.estimatedMinutes > 0) {
    const estimatedSeconds = input.estimatedMinutes * 60;

    if (input.accumulatedConfirmedSecondsAfter >= estimatedSeconds * 0.5) {
      markers.push("estimated-time-50");
    }

    if (input.accumulatedConfirmedSecondsAfter >= estimatedSeconds) {
      markers.push("estimated-time-100");
    }

    if (input.accumulatedConfirmedSecondsAfter >= estimatedSeconds * 1.5) {
      markers.push("contextual-viciado");
    }
  }

  if (input.confirmedSessionCountBefore >= 6 && input.accumulatedConfirmedSecondsAfter > 0) {
    markers.push("contextual-pausar");
  }

  return [...new Set(markers)];
}

export function createTerminalRequest(input: {
  targetStatus: string;
  requestedByUserId: string;
}): PolicyResult<{
  targetStatus: TerminalTargetStatus;
  requestedByUserId: string;
  status: "pending";
}> {
  if (!isTerminalTargetStatus(input.targetStatus)) {
    return { ok: false, reason: "invalid-terminal-status" };
  }

  return {
    ok: true,
    value: {
      targetStatus: input.targetStatus,
      requestedByUserId: input.requestedByUserId,
      status: "pending"
    }
  };
}

export function confirmTerminalRequest(input: {
  requestStatus: "pending" | "confirmed" | "cancelled";
  requestedByUserId: string;
  actorUserId: string;
}): PolicyResult<{ status: "confirmed"; confirmedByUserId: string }> {
  if (input.requestStatus !== "pending") {
    return { ok: false, reason: "terminal-request-not-pending" };
  }

  if (input.actorUserId === input.requestedByUserId) {
    return { ok: false, reason: "partner-confirmation-required" };
  }

  return {
    ok: true,
    value: {
      status: "confirmed",
      confirmedByUserId: input.actorUserId
    }
  };
}

export function canSchedulePlayingGame(input: {
  libraryStatus: string;
}): PolicyResult<{ ok: true }> {
  if (input.libraryStatus !== "jogando") {
    return { ok: false, reason: "scheduled-game-not-playing" };
  }

  return {
    ok: true,
    value: {
      ok: true
    }
  };
}

export function getScheduledSessionMutationEffect(input: {
  changedGame: boolean;
  changedStartTime: boolean;
}): { resetAttendanceConfirmations: boolean } {
  return {
    resetAttendanceConfirmations: input.changedGame || input.changedStartTime
  };
}

export function getReminderDueAt(scheduledStartAt: Date): Date {
  return new Date(scheduledStartAt.getTime() - REMINDER_LEAD_MINUTES * 60_000);
}

export function evaluateReminderPrecision(input: {
  scheduledStartAt: Date;
  runnerCapability: ReminderRunnerCapability;
}): PolicyResult<ReminderPrecisionState> {
  const dueAt = getReminderDueAt(input.scheduledStartAt);

  if (input.runnerCapability !== "precise-minute") {
    return {
      ok: false,
      reason: "reminder-precision-unavailable"
    };
  }

  return {
    ok: true,
    value: {
      dueAt,
      canPromiseExactReminder: true,
      copyState: "exact-reminder"
    }
  };
}

export function getReminderPreparedState(input: {
  scheduledStartAt: Date;
}): ReminderPrecisionState {
  return {
    dueAt: getReminderDueAt(input.scheduledStartAt),
    canPromiseExactReminder: false,
    copyState: "prepared-not-guaranteed"
  };
}

export function canRequestPushPermission(input: {
  trigger: PushPermissionTrigger;
}): PolicyResult<{ requestPermission: true }> {
  if (input.trigger === "app-load") {
    return { ok: false, reason: "push-permission-not-action-triggered" };
  }

  return {
    ok: true,
    value: {
      requestPermission: true
    }
  };
}

export function getPushDisableEffect(): PushDisableEffect {
  return {
    pushEnabled: false,
    schedulesRemainActive: true,
    inAppNotificationsRemainActive: true
  };
}

export function isPlayNotificationType(value: string): value is PlayNotificationType {
  return (PLAY_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function isNotificationScopeAllowed(input: {
  notificationType: string;
}): PolicyResult<{ notificationType: PlayNotificationType }> {
  if (!isPlayNotificationType(input.notificationType)) {
    return { ok: false, reason: "notification-out-of-scope" };
  }

  return {
    ok: true,
    value: {
      notificationType: input.notificationType
    }
  };
}

export function getNotificationRealtimePolicy(): NotificationRealtimePolicy {
  return {
    usesPolling: true,
    refreshOnFocus: true,
    usesWebPushWhenAllowed: true,
    requiresWebSocket: false
  };
}

export function isTerminalTargetStatus(value: string): value is TerminalTargetStatus {
  return (TERMINAL_TARGET_STATUSES as readonly string[]).includes(value);
}

function sortActivePlayGames(games: ActivePlayGame[]): ActivePlayGame[] {
  return [...games].sort((first, second) => first.position - second.position);
}
