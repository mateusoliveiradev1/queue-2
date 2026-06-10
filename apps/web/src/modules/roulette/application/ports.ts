import type {
  RouletteGame,
  RouletteLibraryStatus,
  RouletteRarity,
  RouletteRoundStatus,
  RouletteVisualReelSlot
} from "../domain/roulette-policy";

export type RouletteUserId = string;
export type RouletteDuoId = string;
export type RouletteUuid = string;
export type RouletteLibraryGameId = RouletteUuid;
export type RouletteCatalogGameId = RouletteUuid;
export type RouletteRoundId = RouletteUuid;

export type RoulettePersistedRoundStatus =
  | Exclude<RouletteRoundStatus, "failed">
  | "cancelled";

export type RouletteMembershipContext = {
  duoId: RouletteDuoId;
  userId: RouletteUserId;
  partnerUserId: RouletteUserId | null;
  memberUserIds: RouletteUserId[];
};

export type RouletteEligibleGameRecord = RouletteGame & {
  id: RouletteLibraryGameId;
  catalogGameId: RouletteCatalogGameId;
  status: RouletteLibraryStatus | string;
  updatedAt: Date;
};

export type RouletteBoostBalanceRecord = {
  duoId: RouletteDuoId;
  balance: number;
  cap: number;
  updatedAt: Date;
};

export type RoulettePityStateRecord = {
  duoId: RouletteDuoId;
  drawsSinceEpicOrHigher: number;
  lastEpicOrHigherAt: Date | null;
  updatedAt: Date;
};

export type RouletteCooldownRecord = {
  duoId: RouletteDuoId;
  libraryGameId: RouletteLibraryGameId;
  roundId: RouletteRoundId | null;
  remainingRounds: number;
  weightMultiplier: number;
  updatedAt: Date;
};

export type RouletteRoundRecord = {
  id: RouletteRoundId;
  duoId: RouletteDuoId;
  idempotencyKey: string;
  status: RoulettePersistedRoundStatus;
  resultLibraryGameId: RouletteLibraryGameId;
  resultCatalogGameId: RouletteCatalogGameId | null;
  resultRarity: RouletteRarity;
  boostSpent: boolean;
  boostLedgerId: RouletteUuid | null;
  pityBefore: number;
  pityAfter: number;
  weekendMultiplierApplied: boolean;
  selectedByUserId: RouletteUserId;
  resolvedByUserId: RouletteUserId | null;
  metadata: Record<string, unknown>;
  selectedAt: Date;
  revealedAt: Date | null;
  resolvedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

export type RouletteRoundEntryRecord = {
  id: RouletteUuid;
  duoId: RouletteDuoId;
  roundId: RouletteRoundId;
  slotIndex: number;
  libraryGameId: RouletteLibraryGameId;
  catalogGameId: RouletteCatalogGameId | null;
  rarity: RouletteRarity;
  titleSnapshot: string;
  coverUrlSnapshot: string | null;
  selectedSlot: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type RouletteBoostLedgerRecord = {
  id: RouletteUuid;
  duoId: RouletteDuoId;
  ledgerKey: string;
  sourceType:
    | "xp-award"
    | "roulette-round"
    | "roulette-refund"
    | "adjustment"
    | "rebuild";
  sourceId: RouletteUuid;
  roundId: RouletteRoundId | null;
  amountDelta: number;
  reasonCode: string;
  actorUserId: RouletteUserId | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type RouletteHistoryEventRecord = {
  id: RouletteUuid;
  duoId: RouletteDuoId;
  roundId: RouletteRoundId | null;
  eventKey: string;
  eventType:
    | "started"
    | "revealed"
    | "replayed"
    | "locked"
    | "discarded"
    | "boost-spent"
    | "boost-refunded"
    | "refunded";
  actorUserId: RouletteUserId | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type RouletteStateRecord = {
  duoId: RouletteDuoId;
  eligibleGames: RouletteEligibleGameRecord[];
  activeRound: RouletteRoundRecord | null;
  activeRoundEntries: RouletteRoundEntryRecord[];
  boostBalance: RouletteBoostBalanceRecord;
  pityState: RoulettePityStateRecord;
  cooldowns: RouletteCooldownRecord[];
  history: RouletteHistoryEventRecord[];
};

export type RouletteStateKind =
  | "blocked-pool"
  | "ready"
  | Extract<RouletteRoundStatus, "active" | "revealing" | "pending_invitation">;

export type RouletteBoostStateView = {
  balance: number;
  canUseBoost: boolean;
  cap: number;
};

export type RoulettePityStateView = {
  drawsSinceEpicOrHigher: number;
  progressText: string;
  threshold: number;
};

export type RouletteBlockedPoolView = {
  ctas: ["biblioteca", "descobrir", "catalogo"];
  eligibleCount: number;
  reason: "minimum-eligible-pool";
  requiredEligibleCount: number;
};

export type RouletteStateView = {
  audioEnabled: boolean;
  boost: RouletteBoostStateView;
  cooldowns: RouletteCooldownRecord[];
  duoId: RouletteDuoId;
  eligibleGames: RouletteEligibleGameRecord[];
  pity: RoulettePityStateView;
  state: RouletteStateKind;
  blockedPool?: RouletteBlockedPoolView;
  entries?: RouletteRoundEntryRecord[];
  round?: RouletteRoundRecord;
};

export type GetRouletteStateResult =
  | {
      ok: true;
      state: RouletteStateView;
    }
  | {
      ok: false;
      reason: "membership-required";
    };

export type GetRouletteHistoryResult =
  | {
      ok: true;
      history: RouletteHistoryEventRecord[];
    }
  | {
      ok: false;
      reason: "membership-required";
    };

export type StartRouletteRoundInput = {
  userId: RouletteUserId;
  idempotencyKey: string;
  useBoost?: boolean;
  boostRequested?: boolean;
  roll?: number;
  seed?: string;
  now?: Date;
};

export type StartRouletteRoundResult =
  | {
      ok: true;
      round: RouletteRoundRecord;
      entries: RouletteRoundEntryRecord[];
      resumedExistingRound: boolean;
      boostLedger: RouletteBoostLedgerRecord | null;
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "minimum-eligible-pool"
        | "insufficient-boost-balance";
      eligibleCount?: number;
      requiredEligibleCount?: number;
    }
  | {
      ok: false;
      reason: "round-persist-failed";
      refundedBoost: boolean;
    };

export type ReplayRouletteRoundResult =
  | {
      ok: true;
      isReplay: true;
      round: RouletteRoundRecord;
      entries: RouletteRoundEntryRecord[];
    }
  | {
      ok: false;
      reason: "membership-required" | "round-not-found" | "round-not-replayable";
    };

export type LockRouletteResultAsPrincipalInput = {
  userId: RouletteUserId;
  roundId: RouletteRoundId;
  replacement?: {
    action: "pause" | "replace" | "cancel";
    libraryGameId?: RouletteLibraryGameId;
    nextStatus?: "wishlist" | "pausado";
  };
};

export type LockRouletteResultAsPrincipalResult =
  | {
      ok: true;
      round: RouletteRoundRecord;
      redirectTo: "/app" | "/app?estado=roleta-principal";
    }
  | {
      ok: false;
      reason:
        | "membership-required"
        | "round-not-found"
        | "round-not-pending"
        | "replacement-required"
        | "play-handoff-failed";
      autoPause?: false;
      currentGames?: unknown[];
    };

export type DiscardRouletteResult =
  | {
      ok: true;
      round: RouletteRoundRecord;
      cooldown: RouletteCooldownRecord;
    }
  | {
      ok: false;
      reason: "membership-required" | "round-not-found" | "round-not-pending";
    };

export type RouletteRepositoryTransaction = {
  resolveMembership(
    userId: RouletteUserId
  ): Promise<RouletteMembershipContext | null>;
  readEligiblePool(input: {
    duoId: RouletteDuoId;
  }): Promise<RouletteEligibleGameRecord[]>;
  readAudioPreference(input: {
    duoId: RouletteDuoId;
  }): Promise<boolean>;
  readActiveRound(input: {
    duoId: RouletteDuoId;
  }): Promise<RouletteRoundRecord | null>;
  readRoundById(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
  }): Promise<RouletteRoundRecord | null>;
  readRoundByIdempotencyKey(input: {
    duoId: RouletteDuoId;
    idempotencyKey: string;
  }): Promise<RouletteRoundRecord | null>;
  readRoundEntries(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
  }): Promise<RouletteRoundEntryRecord[]>;
  lockBoostBalance(input: {
    duoId: RouletteDuoId;
  }): Promise<RouletteBoostBalanceRecord>;
  materializeBoostFromXp(input: {
    duoId: RouletteDuoId;
    actorUserId: RouletteUserId;
    now: Date;
  }): Promise<RouletteBoostBalanceRecord>;
  insertBoostLedgerEntry(input: Omit<RouletteBoostLedgerRecord, "id" | "createdAt">): Promise<RouletteBoostLedgerRecord | null>;
  updateBoostBalance(input: {
    duoId: RouletteDuoId;
    balance: number;
  }): Promise<RouletteBoostBalanceRecord>;
  lockPityState(input: {
    duoId: RouletteDuoId;
  }): Promise<RoulettePityStateRecord>;
  updatePityState(input: {
    duoId: RouletteDuoId;
    drawsSinceEpicOrHigher: number;
    lastEpicOrHigherAt: Date | null;
  }): Promise<RoulettePityStateRecord>;
  readCooldowns(input: {
    duoId: RouletteDuoId;
  }): Promise<RouletteCooldownRecord[]>;
  upsertCooldown(input: {
    duoId: RouletteDuoId;
    libraryGameId: RouletteLibraryGameId;
    roundId: RouletteRoundId;
    remainingRounds: number;
    weightMultiplier: number;
  }): Promise<RouletteCooldownRecord>;
  decrementCooldowns(input: {
    duoId: RouletteDuoId;
  }): Promise<RouletteCooldownRecord[]>;
  persistRound(input: {
    duoId: RouletteDuoId;
    idempotencyKey: string;
    resultLibraryGameId: RouletteLibraryGameId;
    resultCatalogGameId: RouletteCatalogGameId | null | undefined;
    resultRarity: RouletteRarity;
    boostSpent: boolean;
    boostLedgerId: RouletteUuid | null;
    pityBefore: number;
    pityAfter: number;
    weekendMultiplierApplied: boolean;
    selectedByUserId: RouletteUserId;
    metadata?: Record<string, unknown>;
  }): Promise<RouletteRoundRecord>;
  persistRoundEntries(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
    entries: RouletteVisualReelSlot[];
  }): Promise<RouletteRoundEntryRecord[]>;
  markRoundRevealed(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
    actorUserId: RouletteUserId;
    revealedAt: Date;
  }): Promise<RouletteRoundRecord | null>;
  recordReplay(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
    actorUserId: RouletteUserId;
    replayedAt: Date;
  }): Promise<RouletteHistoryEventRecord>;
  lockRoundResult(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
    actorUserId: RouletteUserId;
    resolvedAt: Date;
  }): Promise<RouletteRoundRecord | null>;
  discardRoundResult(input: {
    duoId: RouletteDuoId;
    roundId: RouletteRoundId;
    actorUserId: RouletteUserId;
    resolvedAt: Date;
  }): Promise<RouletteRoundRecord | null>;
  insertHistoryEvent(input: Omit<RouletteHistoryEventRecord, "id" | "createdAt">): Promise<RouletteHistoryEventRecord | null>;
  readHistory(input: {
    duoId: RouletteDuoId;
    limit: number;
  }): Promise<RouletteHistoryEventRecord[]>;
};

export type RouletteRepository = {
  withUserTransaction<T>(
    userId: RouletteUserId,
    callback: (transaction: RouletteRepositoryTransaction) => Promise<T>
  ): Promise<T>;
  getRouletteState(input: {
    userId: RouletteUserId;
  }): Promise<GetRouletteStateResult>;
  startRouletteRound(input: StartRouletteRoundInput): Promise<StartRouletteRoundResult>;
  replayRouletteRound(input: {
    userId: RouletteUserId;
    roundId: RouletteRoundId;
  }): Promise<ReplayRouletteRoundResult>;
  lockRouletteResultAsPrincipal(
    input: LockRouletteResultAsPrincipalInput
  ): Promise<LockRouletteResultAsPrincipalResult>;
  discardRouletteResult(input: {
    userId: RouletteUserId;
    roundId: RouletteRoundId;
  }): Promise<DiscardRouletteResult>;
  readRouletteHistory(input: {
    userId: RouletteUserId;
    limit: number;
  }): Promise<RouletteHistoryEventRecord[]>;
};
