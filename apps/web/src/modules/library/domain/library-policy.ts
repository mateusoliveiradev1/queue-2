export const LIBRARY_STATUSES = [
  "wishlist",
  "jogando",
  "pausado",
  "zerado",
  "dropado"
] as const;

export const PHASE_2_ACTIVE_STATUSES = ["wishlist", "jogando", "pausado"] as const;
export const PHASE_4_CONFIRMATION_STATUSES = ["zerado", "dropado"] as const;
export const LIBRARY_QUEUE_VIEWS = [
  "todas",
  ...PHASE_2_ACTIVE_STATUSES,
  "arquivo"
] as const;
export const LIBRARY_QUEUE_SORTS = ["recentes", "match", "nome"] as const;
export const LIBRARY_PAGE_SIZES = [12, 24] as const;
export const JOGANDO_LIMIT = 3;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];
export type Phase2LibraryStatus = (typeof PHASE_2_ACTIVE_STATUSES)[number];
export type FutureConfirmationStatus =
  (typeof PHASE_4_CONFIRMATION_STATUSES)[number];
export type LibraryQueueView = (typeof LIBRARY_QUEUE_VIEWS)[number];
export type LibraryQueueSort = (typeof LIBRARY_QUEUE_SORTS)[number];
export type LibraryPageSize = (typeof LIBRARY_PAGE_SIZES)[number];

export type LibraryMovePolicyResult =
  | { ok: true; status: Phase2LibraryStatus }
  | { ok: false; reason: "future-confirmation-required"; status: FutureConfirmationStatus }
  | { ok: false; reason: "invalid-status" }
  | { ok: false; reason: "jogando-limit-reached" };

const statusSet = new Set<string>(LIBRARY_STATUSES);
const activeStatusSet = new Set<string>(PHASE_2_ACTIVE_STATUSES);
const futureStatusSet = new Set<string>(PHASE_4_CONFIRMATION_STATUSES);
const queueViewSet = new Set<string>(LIBRARY_QUEUE_VIEWS);
const queueSortSet = new Set<string>(LIBRARY_QUEUE_SORTS);

export function isLibraryStatus(value: string): value is LibraryStatus {
  return statusSet.has(value);
}

export function isPhase2LibraryStatus(value: string): value is Phase2LibraryStatus {
  return activeStatusSet.has(value);
}

export function isActiveQueueStatus(value: string): value is Phase2LibraryStatus {
  return activeStatusSet.has(value);
}

export function isArchiveStatus(value: string): value is FutureConfirmationStatus {
  return futureStatusSet.has(value);
}

export function normalizeLibraryView(value: unknown): LibraryQueueView {
  if (typeof value !== "string") {
    return "todas";
  }

  const normalized = value.trim().toLowerCase();
  return queueViewSet.has(normalized) ? (normalized as LibraryQueueView) : "todas";
}

export function normalizeLibrarySort(value: unknown): LibraryQueueSort {
  if (typeof value !== "string") {
    return "recentes";
  }

  const normalized = value.trim().toLowerCase();
  return queueSortSet.has(normalized) ? (normalized as LibraryQueueSort) : "recentes";
}

export function normalizeLibraryPage(value: unknown): number {
  const parsed = parsePositiveInteger(value);
  return parsed ?? 1;
}

export function normalizeLibraryLimit(value: unknown): LibraryPageSize {
  const parsed = parsePositiveInteger(value);

  if (!parsed) {
    return 12;
  }

  return parsed >= 24 ? 24 : 12;
}

export function normalizeLibraryOffset(value: unknown): number {
  const parsed = parseNonNegativeInteger(value);
  return parsed ?? 0;
}

export function getLibraryViewStatuses(view: LibraryQueueView): LibraryStatus[] {
  if (view === "arquivo") {
    return [...PHASE_4_CONFIRMATION_STATUSES];
  }

  if (view === "todas") {
    return [...PHASE_2_ACTIVE_STATUSES];
  }

  return [view];
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
    ? "Zerado exige confirmacao dos dois"
    : "Dropado exige confirmacao dos dois";
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const integer = Math.floor(parsed);
  return integer > 0 ? integer : null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const integer = Math.floor(parsed);
  return integer >= 0 ? integer : null;
}
