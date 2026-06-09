import type {
  PlayGameRole,
  PlayNotificationType,
  PlaySessionKind,
  PlaySessionStatus,
  PlayTimelineMarker,
  TerminalTargetStatus
} from "../domain/play-policy";
import type { TimelineMilestoneKind } from "../domain/milestone-policy";
import type {
  GamificationApplyFactResult,
  GamificationFactInput,
  GamificationFactSourceType,
  GamificationRewardSummary,
  GamificationXpLedgerRecord
} from "../../gamification";

export type PlayUserId = string;
export type PlayDuoId = string;
export type PlayLibraryGameId = string;
export type PlayCatalogGameId = string;

export type PlayMembershipContext = {
  duoId: PlayDuoId;
  userId: PlayUserId;
  partnerUserId: PlayUserId | null;
  memberUserIds: PlayUserId[];
};

export type ActivePlayGameRecord = {
  id: string;
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  catalogGameId: PlayCatalogGameId;
  role: PlayGameRole;
  position: number;
  updatedAt: Date;
};

export type CurrentPlayCatalogFacts = {
  id: PlayCatalogGameId;
  slug: string;
  name: string;
  coverUrl: string | null;
  source: string;
  sourceUrl: string;
  sourceUpdatedAt: Date | null;
  syncedAt: Date;
  hasReliableTimeEstimate: boolean;
  hasVerifiedAvailability: boolean;
};

export type CurrentPlayProgressRecord = {
  confirmedCoopSeconds: number;
  subjectivePercent: number | null;
};

export type CurrentPlayGameRecord = ActivePlayGameRecord & {
  libraryStatus: string;
  catalogGame: CurrentPlayCatalogFacts;
  progress: CurrentPlayProgressRecord;
};

export type CurrentPlayRecord = {
  games: CurrentPlayGameRecord[];
  principal: CurrentPlayGameRecord | null;
  secondaries: CurrentPlayGameRecord[];
  limit: 3;
};

export type PlayActivationLibraryGameRecord = {
  id: PlayLibraryGameId;
  duoId: PlayDuoId;
  catalogGameId: PlayCatalogGameId;
  status: string;
  updatedAt: Date;
};

export type PlayActivationOutcome =
  | "principal-assigned"
  | "secondary-assigned"
  | "already-playing";

export type PlayReplacementDecision = {
  availableActions: ["pause", "replace", "cancel"];
  autoPause: false;
  currentGames: CurrentPlayGameRecord[];
};

export type ActivatePlayingGameResult =
  | {
      ok: true;
      outcome: PlayActivationOutcome;
      activeGame: ActivePlayGameRecord;
      activeGames: ActivePlayGameRecord[];
      currentPlay: CurrentPlayRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid-active-layout"
        | "library-game-not-found"
        | "membership-required"
        | "replacement-required";
      replacement?: PlayReplacementDecision;
    };

export type DeactivatePlayingGameResult =
  | {
      ok: true;
      activeGames: ActivePlayGameRecord[];
      currentPlay: CurrentPlayRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid-active-layout"
        | "library-game-not-found"
        | "membership-required";
    };

export type ReorderPlayingGamesResult =
  | {
      ok: true;
      currentPlay: CurrentPlayRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid-active-layout"
        | "invalid-order"
        | "membership-required";
    };

export type PromotePlayingGameResult =
  | {
      ok: true;
      currentPlay: CurrentPlayRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid-active-layout"
        | "membership-required"
        | "not-secondary-game";
    };

export type ReplacePlayingGameResult =
  | {
      ok: true;
      activeGames: ActivePlayGameRecord[];
      currentPlay: CurrentPlayRecord;
    }
  | {
      ok: false;
      reason:
        | "active-game-not-found"
        | "invalid-active-layout"
        | "library-game-not-found"
        | "membership-required";
    };

export type PlaySessionRecord = {
  id: string;
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  kind: PlaySessionKind;
  status: PlaySessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  createdByUserId: PlayUserId;
};

export type PlaySessionDetailRecord = PlaySessionRecord & {
  confirmedByUserIds: PlayUserId[];
  pendingUserIds: PlayUserId[];
  confirmationCount: number;
  requiredConfirmationCount: number;
  doubleConfirmed: boolean;
};

export type PlayProgressRecord = {
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  confirmedCoopSeconds: number;
  subjectivePercent: number | null;
  updatedAt: Date;
};

export type PlayChapterRecord = {
  id: string;
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  title: string;
  position: number;
  completedAt: Date | null;
  completedByUserId: PlayUserId | null;
  createdByUserId: PlayUserId;
  updatedByUserId: PlayUserId;
  createdAt: Date;
  updatedAt: Date;
};

export type PlayConfirmationRecord = {
  id: string;
  duoId: PlayDuoId;
  effectId: string;
  userId: PlayUserId;
  confirmedAt: Date;
};

export type PlayNotificationRecord = {
  id: string;
  duoId: PlayDuoId;
  recipientUserId: PlayUserId | null;
  notificationType: PlayNotificationType;
  state: "unread" | "read" | "actioned" | "archived";
  actionRefType: string | null;
  actionRefId: string | null;
  title: string;
  body: string | null;
  createdAt: Date;
};

export type PlayNotificationInput = {
  duoId: PlayDuoId;
  actorUserId?: PlayUserId | null;
  recipientUserId?: PlayUserId | null;
  notificationType: PlayNotificationType;
  actionRefType?: string | null;
  actionRefId?: string | null;
  title: string;
  body?: string | null;
};

export type PlayXpAwardInput = {
  duoId: PlayDuoId;
  awardKey: string;
  sourceType: GamificationFactSourceType | "terminal-status";
  sourceId: string;
  amount: number;
  awardedByUserId?: PlayUserId | null;
  metadata?: Record<string, unknown>;
};

export type PlayXpAwardRecord = PlayXpAwardInput & {
  id: string;
  awardedAt: Date;
};

export type PlayRewardSummary = GamificationRewardSummary;

export type PlayGamificationFactResult = GamificationApplyFactResult;

export type PlayGamificationFactInput = GamificationFactInput;

export type PlayGamificationXpAwardRecord = GamificationXpLedgerRecord;

export type PlayTerminalRequestRecord = {
  id: string;
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  targetStatus: TerminalTargetStatus;
  status: "pending" | "confirmed" | "cancelled";
  requestedByUserId: PlayUserId;
  confirmedByUserId: PlayUserId | null;
  cancelledByUserId: PlayUserId | null;
  updatedAt: Date;
};

export type PlayScheduledSessionStatus = "scheduled" | "completed" | "cancelled";

export type PlayScheduledSessionRecord = {
  id: string;
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  scheduledStartAt: Date;
  timezone: string;
  status: PlayScheduledSessionStatus;
  reminderDueAt: Date;
  createdByUserId: PlayUserId;
  updatedByUserId: PlayUserId;
  createdAt: Date;
  updatedAt: Date;
  confirmedByUserIds: PlayUserId[];
  pendingUserIds: PlayUserId[];
  confirmationCount: number;
  requiredConfirmationCount: number;
  doubleConfirmed: boolean;
};

export type PlayMomentoRecord = {
  id: string;
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  sessionId: string | null;
  authorUserId: PlayUserId;
  body: string;
  isSpoiler: boolean;
  revealedForViewer: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PlayTimelineMilestoneRecord = {
  id: string;
  kind: TimelineMilestoneKind | PlayTimelineMarker;
  label: string;
  description: string;
  occurredAt: Date;
};

export type PlayTimelineEvent =
  | {
      id: string;
      type: "session";
      occurredAt: Date;
      session: PlaySessionDetailRecord;
    }
  | {
      id: string;
      type: "chapter";
      occurredAt: Date;
      chapter: PlayChapterRecord;
    }
  | {
      id: string;
      type: "milestone";
      occurredAt: Date;
      milestone: PlayTimelineMilestoneRecord;
    }
  | {
      id: string;
      type: "momento";
      occurredAt: Date;
      momento: PlayMomentoRecord;
    };

export type GameTimelineRecord = {
  duoId: PlayDuoId;
  libraryGameId: PlayLibraryGameId;
  catalogGameId: PlayCatalogGameId;
  events: PlayTimelineEvent[];
};

export type GamePlayDetailRecord = {
  duoId: PlayDuoId;
  duoTimezone: string;
  libraryGameId: PlayLibraryGameId;
  catalogGameId: PlayCatalogGameId;
  libraryStatus: string;
  activeGame: ActivePlayGameRecord | null;
  activeLiveSession: PlaySessionRecord | null;
  pendingSessions: PlaySessionDetailRecord[];
  progress: PlayProgressRecord;
  chapters: PlayChapterRecord[];
  terminalRequest: PlayTerminalRequestRecord | null;
  scheduledSessions: PlayScheduledSessionRecord[];
};

export type PlayReminderJobRecord = {
  id: string;
  duoId: PlayDuoId;
  jobKey: string;
  jobType: "play-session-reminder" | string;
  runAt: Date;
  status: "pending" | "claimed" | "completed" | "failed" | "cancelled";
  attempts: number;
  payload: Record<string, unknown>;
};

export type PlayPushSubscriptionInput = {
  userId: PlayUserId;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  userAgent?: string | null;
};

export type PlayPushSubscriptionRecord = {
  id: string;
  duoId: PlayDuoId;
  userId: PlayUserId;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  enabled: boolean;
  updatedAt: Date;
};

export type PlayNotificationCenterRecord = {
  unreadCount: number;
  items: PlayNotificationRecord[];
};

export type PlayRepositoryTransaction = {
  resolveMembership(userId: PlayUserId): Promise<PlayMembershipContext | null>;
  lockActivePlaySet(input: {
    duoId: PlayDuoId;
  }): Promise<void>;
  readActivePlayGames(input: {
    duoId: PlayDuoId;
  }): Promise<ActivePlayGameRecord[]>;
  readCurrentPlayGames(input: {
    duoId: PlayDuoId;
  }): Promise<CurrentPlayGameRecord[]>;
  readLibraryGameForActivation(input: {
    duoId: PlayDuoId;
    catalogGameId: PlayCatalogGameId;
  }): Promise<PlayActivationLibraryGameRecord | null>;
  readLibraryGameForReplacement(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
  }): Promise<PlayActivationLibraryGameRecord | null>;
  activatePlayingLibraryGame(input: {
    duoId: PlayDuoId;
    actorUserId: PlayUserId;
    libraryGameId: PlayLibraryGameId;
    role: PlayGameRole;
    position: number;
  }): Promise<ActivePlayGameRecord[]>;
  deactivatePlayingLibraryGame(input: {
    duoId: PlayDuoId;
    actorUserId: PlayUserId;
    libraryGameId: PlayLibraryGameId;
    nextStatus: "wishlist" | "pausado";
  }): Promise<ActivePlayGameRecord[]>;
  upsertActiveRoleRows(input: {
    duoId: PlayDuoId;
    actorUserId: PlayUserId;
    games: Array<{
      libraryGameId: PlayLibraryGameId;
      role: PlayGameRole;
      position: number;
    }>;
  }): Promise<ActivePlayGameRecord[]>;
  replaceActiveRoleRows(input: {
    duoId: PlayDuoId;
    actorUserId: PlayUserId;
    games: Array<{
      libraryGameId: PlayLibraryGameId;
      role: PlayGameRole;
      position: number;
    }>;
  }): Promise<ActivePlayGameRecord[]>;
  replacePlayingGameActiveSet(input: {
    duoId: PlayDuoId;
    actorUserId: PlayUserId;
    incomingLibraryGameId: PlayLibraryGameId;
    pausedLibraryGameId: PlayLibraryGameId;
    games: Array<{
      libraryGameId: PlayLibraryGameId;
      role: PlayGameRole;
      position: number;
    }>;
  }): Promise<ActivePlayGameRecord[]>;
  createSession(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
    kind: PlaySessionKind;
    status: PlaySessionStatus;
    startedAt?: Date;
    endedAt?: Date | null;
    durationSeconds?: number | null;
    actorUserId: PlayUserId;
  }): Promise<PlaySessionRecord>;
  confirmSession(input: {
    duoId: PlayDuoId;
    sessionId: string;
    userId: PlayUserId;
  }): Promise<PlayConfirmationRecord | null>;
  readGamePlayDetail(input: {
    duoId: PlayDuoId;
    catalogGameId: PlayCatalogGameId;
  }): Promise<GamePlayDetailRecord | null>;
  readGameTimeline(input: {
    duoId: PlayDuoId;
    catalogGameId: PlayCatalogGameId;
    viewerUserId: PlayUserId;
    estimatedMinutes: number | null;
  }): Promise<GameTimelineRecord | null>;
  readActiveLiveSession(input: {
    duoId: PlayDuoId;
  }): Promise<PlaySessionRecord | null>;
  endLiveSession(input: {
    duoId: PlayDuoId;
    sessionId: string;
    actorUserId: PlayUserId;
    endedAt: Date;
  }): Promise<PlaySessionRecord | null>;
  readSessionDetail(input: {
    duoId: PlayDuoId;
    sessionId: string;
  }): Promise<PlaySessionDetailRecord | null>;
  applyConfirmedSessionEffects(input: {
    duoId: PlayDuoId;
    sessionId: string;
    actorUserId: PlayUserId;
  }): Promise<{
    progress: PlayProgressRecord;
    xpAward: PlayXpAwardRecord | null;
    reward?: PlayRewardSummary | null;
    session: PlaySessionRecord;
  } | null>;
  updateProgressPercent(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
    actorUserId: PlayUserId;
    subjectivePercent: number | null;
  }): Promise<PlayProgressRecord>;
  createChapter(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
    title: string;
    actorUserId: PlayUserId;
  }): Promise<PlayChapterRecord>;
  setChapterCompletion(input: {
    duoId: PlayDuoId;
    chapterId: string;
    actorUserId: PlayUserId;
    completed: boolean;
  }): Promise<{
    chapter: PlayChapterRecord;
    xpAward: PlayXpAwardRecord | null;
    reward?: PlayRewardSummary | null;
  } | null>;
  createTerminalRequest(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
    targetStatus: TerminalTargetStatus;
    actorUserId: PlayUserId;
  }): Promise<PlayTerminalRequestRecord>;
  cancelTerminalRequest(input: {
    duoId: PlayDuoId;
    requestId: string;
    actorUserId: PlayUserId;
  }): Promise<PlayTerminalRequestRecord | null>;
  confirmTerminalRequest(input: {
    duoId: PlayDuoId;
    requestId: string;
    actorUserId: PlayUserId;
  }): Promise<PlayTerminalRequestRecord | null>;
  applyGamificationFact(input: PlayGamificationFactInput): Promise<PlayGamificationFactResult>;
  readDuoTimezone(input: {
    duoId: PlayDuoId;
  }): Promise<string>;
  createScheduledSession(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
    scheduledStartAt: Date;
    timezone: string;
    reminderDueAt: Date;
    actorUserId: PlayUserId;
    memberUserIds: PlayUserId[];
  }): Promise<PlayScheduledSessionRecord>;
  updateScheduledSession(input: {
    duoId: PlayDuoId;
    scheduledSessionId: string;
    libraryGameId: PlayLibraryGameId;
    scheduledStartAt: Date;
    timezone: string;
    reminderDueAt: Date;
    actorUserId: PlayUserId;
    memberUserIds: PlayUserId[];
  }): Promise<PlayScheduledSessionRecord | null>;
  cancelScheduledSession(input: {
    duoId: PlayDuoId;
    scheduledSessionId: string;
    actorUserId: PlayUserId;
    memberUserIds: PlayUserId[];
  }): Promise<PlayScheduledSessionRecord | null>;
  readScheduledSessionDetail(input: {
    duoId: PlayDuoId;
    scheduledSessionId: string;
    memberUserIds: PlayUserId[];
  }): Promise<PlayScheduledSessionRecord | null>;
  confirmScheduledAttendance(input: {
    duoId: PlayDuoId;
    scheduledSessionId: string;
    actorUserId: PlayUserId;
    memberUserIds: PlayUserId[];
  }): Promise<PlayScheduledSessionRecord | null>;
  insertReminderJob(input: {
    duoId: PlayDuoId;
    scheduledSessionId: string;
    runAt: Date;
    scheduledStartAt: Date;
    createdByUserId: PlayUserId;
  }): Promise<PlayReminderJobRecord>;
  registerPushSubscription(input: PlayPushSubscriptionInput): Promise<PlayPushSubscriptionRecord>;
  disablePushSubscriptions(input: {
    userId: PlayUserId;
    endpoint?: string | null;
  }): Promise<number>;
  createMomento(input: {
    duoId: PlayDuoId;
    libraryGameId: PlayLibraryGameId;
    sessionId: string | null;
    body: string;
    isSpoiler: boolean;
    actorUserId: PlayUserId;
  }): Promise<PlayMomentoRecord | null>;
  revealMomento(input: {
    duoId: PlayDuoId;
    momentoId: string;
    viewerUserId: PlayUserId;
  }): Promise<PlayMomentoRecord | null>;
  insertNotificationItem(input: PlayNotificationInput): Promise<PlayNotificationRecord>;
  markNotificationsActioned(input: {
    duoId: PlayDuoId;
    notificationType?: PlayNotificationType;
    actionRefType: string;
    actionRefId: string;
    recipientUserId?: PlayUserId | null;
  }): Promise<number>;
  insertXpAward(input: PlayXpAwardInput): Promise<PlayXpAwardRecord | null>;
};

export interface PlayRepository {
  withUserTransaction<T>(
    userId: PlayUserId,
    callback: (transaction: PlayRepositoryTransaction) => Promise<T>
  ): Promise<T>;
  resolveMembership(userId: PlayUserId): Promise<PlayMembershipContext | null>;
  readCurrentPlay(input: {
    userId: PlayUserId;
  }): Promise<CurrentPlayRecord | null>;
  readGamePlayDetail(input: {
    userId: PlayUserId;
    catalogGameId: PlayCatalogGameId;
  }): Promise<GamePlayDetailRecord | null>;
  readGameTimeline(input: {
    userId: PlayUserId;
    catalogGameId: PlayCatalogGameId;
    estimatedMinutes: number | null;
  }): Promise<GameTimelineRecord | null>;
  readActivePlayGames(input: {
    userId: PlayUserId;
  }): Promise<ActivePlayGameRecord[]>;
  upsertActiveRoleRows(input: {
    userId: PlayUserId;
    games: Array<{
      libraryGameId: PlayLibraryGameId;
      role: PlayGameRole;
      position: number;
    }>;
  }): Promise<ActivePlayGameRecord[]>;
  createSessionConfirmation(input: {
    userId: PlayUserId;
    sessionId: string;
  }): Promise<PlayConfirmationRecord | null>;
  cancelConfirmation(input: {
    userId: PlayUserId;
    sessionId: string;
  }): Promise<void>;
  insertNotificationItem(input: PlayNotificationInput): Promise<PlayNotificationRecord>;
  insertXpAward(input: PlayXpAwardInput): Promise<PlayXpAwardRecord | null>;
  readNotificationCenter(input: {
    userId: PlayUserId;
    limit: number;
  }): Promise<PlayNotificationCenterRecord | null>;
  registerPushSubscription(input: PlayPushSubscriptionInput): Promise<PlayPushSubscriptionRecord | null>;
  disablePushSubscriptions(input: {
    userId: PlayUserId;
    endpoint?: string | null;
  }): Promise<number>;
  claimDueReminderJobs(input: {
    now: Date;
    limit: number;
    workerId: string;
  }): Promise<PlayReminderJobRecord[]>;
  completeReminderJob(input: {
    jobId: string;
    processedAt: Date;
  }): Promise<void>;
  failReminderJob(input: {
    jobId: string;
    error: string;
  }): Promise<void>;
  runAsUser<T>(
    userId: PlayUserId,
    callback: (transaction: PlayRepositoryTransaction) => Promise<T>
  ): Promise<T>;
  readEnabledPushSubscriptions(input: {
    userId: PlayUserId;
  }): Promise<PlayPushSubscriptionRecord[]>;
}
