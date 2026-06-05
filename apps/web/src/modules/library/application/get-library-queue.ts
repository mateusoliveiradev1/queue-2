import {
  getLibraryViewStatuses,
  normalizeLibraryLimit,
  normalizeLibraryOffset,
  normalizeLibraryPage,
  normalizeLibrarySort,
  normalizeLibraryView
} from "../domain/library-policy";
import { normalizePlatformKey } from "../domain/platforms";
import type {
  LibraryQueueInput,
  LibraryQueueRecord,
  LibraryRepository
} from "./ports";

export type GetLibraryQueueResult =
  | { ok: true; queue: LibraryQueueRecord }
  | { ok: false; reason: "membership-required" };

export async function getLibraryQueueUseCase(
  input: LibraryQueueInput,
  repository: LibraryRepository
): Promise<GetLibraryQueueResult> {
  const view = normalizeLibraryView(input.view);
  const sort = normalizeLibrarySort(input.sort);
  const limit = normalizeLibraryLimit(input.limit);
  const offset =
    input.page !== undefined && input.page !== null
      ? (normalizeLibraryPage(input.page) - 1) * limit
      : normalizeLibraryOffset(input.offset);
  const queue = await repository.getQueue({
    userId: input.userId,
    view,
    statuses: getLibraryViewStatuses(view),
    query: normalizeQuery(input.query),
    commonPlatformOnly: normalizeBoolean(input.commonPlatformOnly),
    platform: normalizePlatformKey(input.platform ?? ""),
    sort,
    limit,
    offset
  });

  if (!queue) {
    return { ok: false, reason: "membership-required" };
  }

  return { ok: true, queue };
}

function normalizeQuery(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 80) : null;
}

function normalizeBoolean(value: boolean | string | null | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value === "true" || value === "1";
}
