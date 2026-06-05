import {
  normalizeLibraryLimit,
  normalizeLibraryPage,
  normalizeLibrarySort,
  normalizeLibraryView,
  normalizePlatformKey,
  type LibraryPageSize,
  type LibraryQueueSort,
  type LibraryQueueView,
  type PlatformKey
} from "../../../modules/library";

export type LibraryRouteParams = {
  view: LibraryQueueView;
  query: string;
  commonPlatformOnly: boolean;
  platform: PlatformKey | null;
  sort: LibraryQueueSort;
  page: number;
  limit: LibraryPageSize;
  offset: number;
};

type SearchParams = Record<string, string | string[] | undefined> | undefined;

type LibraryPathOverrides = Partial<{
  view: LibraryQueueView | string | null;
  query: string | null;
  commonPlatformOnly: boolean;
  platform: PlatformKey | string | null;
  sort: LibraryQueueSort | string | null;
  page: number | string | null;
  limit: LibraryPageSize | number | string | null;
}>;

export function parseLibraryRouteParams(params: SearchParams): LibraryRouteParams {
  const view = normalizeLibraryView(getSearchParam(params?.visao));
  const query = normalizeQuery(getSearchParam(params?.q));
  const platformParam = getSearchParam(params?.plataforma);
  const platform = normalizeRoutePlatform(platformParam);
  const commonPlatformOnly = platformParam === "comum";
  const sort = normalizeLibrarySort(getSearchParam(params?.ordenar));
  const page = normalizeLibraryPage(getSearchParam(params?.pagina));
  const limit = normalizeLibraryLimit(getSearchParam(params?.tamanho));

  return {
    view,
    query,
    commonPlatformOnly,
    platform,
    sort,
    page,
    limit,
    offset: (page - 1) * limit
  };
}

export function buildLibraryPath(
  params: LibraryRouteParams,
  overrides: LibraryPathOverrides = {}
): string {
  const next = normalizeOverrides(params, overrides);
  const urlParams = new URLSearchParams();

  if (next.view !== "todas") {
    urlParams.set("visao", next.view);
  }

  if (next.query) {
    urlParams.set("q", next.query);
  }

  if (next.platform) {
    urlParams.set("plataforma", next.platform);
  } else if (next.commonPlatformOnly) {
    urlParams.set("plataforma", "comum");
  }

  if (next.sort !== "recentes") {
    urlParams.set("ordenar", next.sort);
  }

  if (next.limit !== 12) {
    urlParams.set("tamanho", String(next.limit));
  }

  if (next.page > 1) {
    urlParams.set("pagina", String(next.page));
  }

  const query = urlParams.toString();
  return query ? `/app/biblioteca?${query}` : "/app/biblioteca";
}

export function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeOverrides(
  params: LibraryRouteParams,
  overrides: LibraryPathOverrides
): LibraryRouteParams {
  const filterChanged =
    hasOwn(overrides, "view") ||
    hasOwn(overrides, "query") ||
    hasOwn(overrides, "commonPlatformOnly") ||
    hasOwn(overrides, "platform") ||
    hasOwn(overrides, "sort") ||
    hasOwn(overrides, "limit");
  const view = hasOwn(overrides, "view")
    ? normalizeLibraryView(overrides.view)
    : params.view;
  const query = hasOwn(overrides, "query")
    ? normalizeQuery(overrides.query)
    : params.query;
  const platform = hasOwn(overrides, "platform")
    ? normalizeRoutePlatform(overrides.platform)
    : params.platform;
  const commonPlatformOnly = hasOwn(overrides, "commonPlatformOnly")
    ? overrides.commonPlatformOnly === true
    : platform
      ? false
      : params.commonPlatformOnly;
  const sort = hasOwn(overrides, "sort")
    ? normalizeLibrarySort(overrides.sort)
    : params.sort;
  const limit = hasOwn(overrides, "limit")
    ? normalizeLibraryLimit(overrides.limit)
    : params.limit;
  const page =
    filterChanged && !hasOwn(overrides, "page")
      ? 1
      : hasOwn(overrides, "page")
        ? normalizeLibraryPage(overrides.page)
        : params.page;

  return {
    view,
    query,
    platform,
    commonPlatformOnly,
    sort,
    limit,
    page,
    offset: (page - 1) * limit
  };
}

function normalizeRoutePlatform(value: string | null | undefined): PlatformKey | null {
  if (!value || value === "comum" || value === "livre") {
    return null;
  }

  return normalizePlatformKey(value);
}

function normalizeQuery(value: string | null | undefined): string {
  return value?.trim().slice(0, 80) ?? "";
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}
