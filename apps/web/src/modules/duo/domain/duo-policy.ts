export const DISPLAY_NAME_MAX_LENGTH = 40;
export const DUO_NAME_MAX_LENGTH = 48;
export const DEFAULT_DUO_TIMEZONE = "America/Sao_Paulo";

export type DuoMembershipState = "none" | "awaiting-partner" | "paired";
export type DuoRouteState = "pairing" | "naming" | "ready";
export type PlainTextField = "display-name" | "duo-name";

export type PlainTextValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "too-long" | "formatted" };

const FORMATTING_MARKER_PATTERN = /[<>`*_~]|(?:^|\s)#{1,6}\s/;

export function classifyMembershipState(input: {
  memberCount: number;
  pairedAt: Date | null;
}): DuoMembershipState {
  if (input.memberCount === 0) {
    return "none";
  }

  if (input.memberCount < 2 || !input.pairedAt) {
    return "awaiting-partner";
  }

  return "paired";
}

export function classifyDuoRouteState(input: {
  membershipState: DuoMembershipState;
  duoName: string | null;
}): DuoRouteState {
  if (input.membershipState !== "paired") {
    return "pairing";
  }

  if (!input.duoName?.trim()) {
    return "naming";
  }

  return "ready";
}

export function canCreatePairingCode(
  membershipState: DuoMembershipState
): boolean {
  return membershipState !== "paired";
}

export function canJoinPairingCode(
  membershipState: DuoMembershipState
): boolean {
  return membershipState === "none";
}

export function validatePlainText(
  value: string,
  field: PlainTextField
): PlainTextValidation {
  const normalized = value.trim().replace(/\s+/g, " ");
  const maxLength =
    field === "display-name" ? DISPLAY_NAME_MAX_LENGTH : DUO_NAME_MAX_LENGTH;

  if (!normalized) {
    return { ok: false, reason: "empty" };
  }

  if (normalized.length > maxLength) {
    return { ok: false, reason: "too-long" };
  }

  if (FORMATTING_MARKER_PATTERN.test(normalized)) {
    return { ok: false, reason: "formatted" };
  }

  return { ok: true, value: normalized };
}

export function isValidTimezone(value: string): boolean {
  const timezone = value.trim();

  if (!timezone || timezone.length > 80) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
