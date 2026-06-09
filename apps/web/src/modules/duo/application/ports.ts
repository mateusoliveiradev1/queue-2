export type DuoMemberRecord = {
  userId: string;
  displayName: string;
  memberSlot: 1 | 2;
  joinedAt: Date;
};

export type PairingCodeRecord = {
  id: string;
  duoId: string;
  code: string;
  expiresAt: Date;
  revokedAt: Date | null;
  claimedAt: Date | null;
};

export type DuoMembershipRecord = {
  duoId: string;
  memberSlot: 1 | 2;
  name: string | null;
  pairedAt: Date | null;
  timezone: string;
  createdAt: Date;
  notificationsEnabled: boolean;
  audioEnabled: boolean;
  members: DuoMemberRecord[];
};

export type DuoUserContextRecord = {
  profileDisplayName: string;
  membership: DuoMembershipRecord | null;
};

export type PairingClaimOutcome =
  | { state: "claimed"; duoId: string }
  | { state: "inactive" | "race-lost" | "already-paired" };

export type PairingRateLimitResult = {
  blocked: boolean;
  attemptsRemaining: number;
  retryAfterSeconds: number;
};

export interface PairingAttemptLimiter {
  consume(userId: string): Promise<PairingRateLimitResult>;
}

export interface DuoRepository {
  ensureProfile(userId: string, displayName: string): Promise<void>;
  getUserContext(userId: string): Promise<DuoUserContextRecord>;
  getActivePairingCode(userId: string): Promise<PairingCodeRecord | null>;
  createDuoWithPairingCode(input: {
    userId: string;
    code: string;
    expiresAt: Date;
    timezone: string;
  }): Promise<PairingCodeRecord>;
  createPairingCodeForExistingDuo(input: {
    userId: string;
    duoId: string;
    code: string;
    expiresAt: Date;
  }): Promise<PairingCodeRecord>;
  revokePairingCode(input: {
    userId: string;
    pairingCodeId: string;
  }): Promise<boolean>;
  claimPairingCode(input: {
    userId: string;
    code: string;
  }): Promise<PairingClaimOutcome>;
  updateProfileDisplayName(input: {
    userId: string;
    displayName: string;
  }): Promise<void>;
  updateDuoSettings(input: {
    userId: string;
    duoId: string;
    name: string;
    timezone: string;
    notificationsEnabled: boolean;
    audioEnabled: boolean;
  }): Promise<boolean>;
  updateDuoAudioPreference(input: {
    userId: string;
    duoId: string;
    audioEnabled: boolean;
  }): Promise<boolean>;
}
