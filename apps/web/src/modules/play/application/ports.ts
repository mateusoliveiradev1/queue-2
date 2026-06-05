import type {
  PlayGameRole,
  PlayNotificationType,
  PlaySessionKind,
  PlaySessionStatus,
  TerminalTargetStatus
} from "../domain/play-policy";

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
  sourceType:
    | "chapter"
    | "live-session"
    | "offline-session"
    | "scheduled-session"
    | "terminal-status";
  sourceId: string;
  amount: number;
  awardedByUserId?: PlayUserId | null;
  metadata?: Record<string, unknown>;
};

export type PlayXpAwardRecord = PlayXpAwardInput & {
  id: string;
  awardedAt: Date;
};

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
  }): Promise<PlayConfirmationRecord>;
  insertNotificationItem(input: PlayNotificationInput): Promise<PlayNotificationRecord>;
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
  claimDueReminderJobs(input: {
    now: Date;
    limit: number;
    workerId: string;
  }): Promise<PlayReminderJobRecord[]>;
}
