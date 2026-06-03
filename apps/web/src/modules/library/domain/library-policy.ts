export const LIBRARY_STATUSES = [
  "wishlist",
  "jogando",
  "pausado",
  "zerado",
  "dropado"
] as const;

export const PHASE_2_ACTIVE_STATUSES = ["wishlist", "jogando", "pausado"] as const;
export const PHASE_4_CONFIRMATION_STATUSES = ["zerado", "dropado"] as const;
export const JOGANDO_LIMIT = 3;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];
export type Phase2LibraryStatus = (typeof PHASE_2_ACTIVE_STATUSES)[number];
export type FutureConfirmationStatus =
  (typeof PHASE_4_CONFIRMATION_STATUSES)[number];

export type LibraryMovePolicyResult =
  | { ok: true; status: Phase2LibraryStatus }
  | { ok: false; reason: "future-confirmation-required"; status: FutureConfirmationStatus }
  | { ok: false; reason: "invalid-status" }
  | { ok: false; reason: "jogando-limit-reached" };

const statusSet = new Set<string>(LIBRARY_STATUSES);
const activeStatusSet = new Set<string>(PHASE_2_ACTIVE_STATUSES);
const futureStatusSet = new Set<string>(PHASE_4_CONFIRMATION_STATUSES);

export function isLibraryStatus(value: string): value is LibraryStatus {
  return statusSet.has(value);
}

export function isPhase2LibraryStatus(value: string): value is Phase2LibraryStatus {
  return activeStatusSet.has(value);
}

export function getLibraryMovePolicy(input: {
  status: string;
  currentJogandoCount: number;
  alreadyJogando?: boolean;
}): LibraryMovePolicyResult {
  if (!isLibraryStatus(input.status)) {
    return { ok: false, reason: "invalid-status" };
  }

  if (futureStatusSet.has(input.status)) {
    return {
      ok: false,
      reason: "future-confirmation-required",
      status: input.status as FutureConfirmationStatus
    };
  }

  if (
    input.status === "jogando" &&
    !input.alreadyJogando &&
    input.currentJogandoCount >= JOGANDO_LIMIT
  ) {
    return { ok: false, reason: "jogando-limit-reached" };
  }

  return { ok: true, status: input.status as Phase2LibraryStatus };
}

export function getLockedStatusLabel(status: FutureConfirmationStatus): string {
  return status === "zerado"
    ? "Zerado exige confirmacao dupla na Fase 4"
    : "Dropado exige confirmacao dupla na Fase 4";
}
