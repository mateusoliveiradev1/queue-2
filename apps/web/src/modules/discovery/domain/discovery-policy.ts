export const DISCOVERY_DECISIONS = ["want", "not_now", "skip"] as const;
export const DISCOVERY_SOURCE_MODES = ["deck", "live", "surprise", "quiz", "search"] as const;
export const DISCOVERY_LIBRARY_HANDOFF_STATUSES = ["wishlist", "jogando", "pausado"] as const;

export const NOT_NOW_COOLDOWN_DAYS = 14;

export type DiscoveryDecision = (typeof DISCOVERY_DECISIONS)[number];
export type DiscoverySourceMode = (typeof DISCOVERY_SOURCE_MODES)[number];
export type DiscoveryLibraryHandoffStatus =
  (typeof DISCOVERY_LIBRARY_HANDOFF_STATUSES)[number];

export type DiscoveryDecisionEffect = {
  decision: DiscoveryDecision;
  cooldownUntil: Date | null;
  preferenceWeight: number;
  countsAsApproval: boolean;
  countsAsNegativeSignal: boolean;
  removesCurrentCard: boolean;
};

export type DiscoveryMatchPolicyResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "actor-did-not-want"
        | "partner-has-not-wanted"
        | "already-matched"
        | "same-member";
    };

export type DiscoveryLibraryHandoffPolicyResult =
  | { ok: true; status: DiscoveryLibraryHandoffStatus }
  | {
      ok: false;
      reason:
        | "invalid-status"
        | "future-confirmation-required";
    };

const decisionSet = new Set<string>(DISCOVERY_DECISIONS);
const sourceModeSet = new Set<string>(DISCOVERY_SOURCE_MODES);
const libraryHandoffStatusSet = new Set<string>(DISCOVERY_LIBRARY_HANDOFF_STATUSES);
const futureConfirmationStatusSet = new Set<string>(["zerado", "dropado"]);

export function isDiscoveryDecision(value: string): value is DiscoveryDecision {
  return decisionSet.has(value);
}

export function isDiscoverySourceMode(value: string): value is DiscoverySourceMode {
  return sourceModeSet.has(value);
}

export function isDiscoveryLibraryHandoffStatus(
  value: string
): value is DiscoveryLibraryHandoffStatus {
  return libraryHandoffStatusSet.has(value);
}

export function evaluateDiscoveryDecision(input: {
  decision: DiscoveryDecision;
  decidedAt?: Date;
}): DiscoveryDecisionEffect {
  const decidedAt = input.decidedAt ?? new Date();

  if (input.decision === "want") {
    return {
      decision: "want",
      cooldownUntil: null,
      preferenceWeight: 3,
      countsAsApproval: true,
      countsAsNegativeSignal: false,
      removesCurrentCard: true
    };
  }

  if (input.decision === "not_now") {
    return {
      decision: "not_now",
      cooldownUntil: addDays(decidedAt, NOT_NOW_COOLDOWN_DAYS),
      preferenceWeight: -2,
      countsAsApproval: false,
      countsAsNegativeSignal: true,
      removesCurrentCard: true
    };
  }

  return {
    decision: "skip",
    cooldownUntil: null,
    preferenceWeight: 0,
    countsAsApproval: false,
    countsAsNegativeSignal: false,
    removesCurrentCard: true
  };
}

export function canCreateDiscoveryMatch(input: {
  actorUserId: string;
  partnerUserId: string;
  actorDecision: DiscoveryDecision;
  partnerDecision: DiscoveryDecision | null;
  existingMatch?: boolean;
}): DiscoveryMatchPolicyResult {
  if (input.actorUserId === input.partnerUserId) {
    return { ok: false, reason: "same-member" };
  }

  if (input.existingMatch) {
    return { ok: false, reason: "already-matched" };
  }

  if (input.actorDecision !== "want") {
    return { ok: false, reason: "actor-did-not-want" };
  }

  if (input.partnerDecision !== "want") {
    return { ok: false, reason: "partner-has-not-wanted" };
  }

  return { ok: true };
}

export function shouldExcludeFromCurrentDeck(input: {
  decision: DiscoveryDecision | null;
  cooldownUntil?: Date | null;
  now?: Date;
}): boolean {
  if (input.decision === null) {
    return false;
  }

  if (input.decision === "not_now") {
    if (!input.cooldownUntil) {
      return false;
    }

    return input.cooldownUntil.getTime() > (input.now ?? new Date()).getTime();
  }

  return true;
}

export function getDiscoveryLibraryHandoffPolicy(
  status: string
): DiscoveryLibraryHandoffPolicyResult {
  if (isDiscoveryLibraryHandoffStatus(status)) {
    return { ok: true, status };
  }

  if (futureConfirmationStatusSet.has(status)) {
    return { ok: false, reason: "future-confirmation-required" };
  }

  return { ok: false, reason: "invalid-status" };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
