export const PAIRING_CODE_LENGTH = 6;
export const PAIRING_CODE_EXPIRY_HOURS = 24;
export const PAIRING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type PairingCodeState = "active" | "inactive";
export type PairingJoinFailureState =
  | "invalid"
  | "inactive"
  | "attempt-limited"
  | "race-lost"
  | "already-paired";

export type PairingCodeSnapshot = {
  code: string;
  expiresAt: Date;
  revokedAt: Date | null;
  claimedAt: Date | null;
};

export function normalizePairingCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, "");
}

export function isPairingCodeFormat(value: string): boolean {
  return new RegExp(`^[${PAIRING_CODE_ALPHABET}]{${PAIRING_CODE_LENGTH}}$`).test(
    normalizePairingCode(value)
  );
}

export function createPairingCodeFromRandomIndex(
  randomIndex: (upperBound: number) => number
): string {
  let code = "";

  for (let index = 0; index < PAIRING_CODE_LENGTH; index += 1) {
    const candidate = randomIndex(PAIRING_CODE_ALPHABET.length);
    const safeIndex =
      ((Math.trunc(candidate) % PAIRING_CODE_ALPHABET.length) +
        PAIRING_CODE_ALPHABET.length) %
      PAIRING_CODE_ALPHABET.length;
    code += PAIRING_CODE_ALPHABET[safeIndex];
  }

  return code;
}

export function getPairingCodeExpiry(now: Date): Date {
  return new Date(now.getTime() + PAIRING_CODE_EXPIRY_HOURS * 60 * 60 * 1000);
}

export function getPairingCodeState(
  snapshot: PairingCodeSnapshot,
  now: Date
): PairingCodeState {
  if (
    snapshot.revokedAt ||
    snapshot.claimedAt ||
    snapshot.expiresAt.getTime() <= now.getTime()
  ) {
    return "inactive";
  }

  return "active";
}

export function isUsablePairingCode(
  snapshot: PairingCodeSnapshot,
  now: Date
): boolean {
  return (
    isPairingCodeFormat(snapshot.code) &&
    getPairingCodeState(snapshot, now) === "active"
  );
}
