import "server-only";

import type {
  CatalogAvailabilityRecord,
  CatalogGameUpsertInput,
  CatalogGenreRecord,
  CatalogPlatformKey,
  CatalogPlatformRecord
} from "../application/ports";

const RAWG_BASE_URL = "https://api.rawg.io/api";
const RAWG_SITE_URL = "https://rawg.io";
const MAX_PAGE_SIZE = 40;

type RawgPlatform = {
  platform?: {
    id?: unknown;
    name?: unknown;
    slug?: unknown;
  };
};

type RawgGenre = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
};

type RawgGamePayload = {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  description_raw?: unknown;
  description?: unknown;
  released?: unknown;
  background_image?: unknown;
  updated?: unknown;
  platforms?: unknown;
  genres?: unknown;
  playtime?: unknown;
};

type RawgSearchPayload = {
  results?: unknown;
};

export type RawgSearchInput = {
  query: string;
  page?: number;
  pageSize?: number;
};

export type RawgClient = {
  searchGames(input: RawgSearchInput): Promise<CatalogGameUpsertInput[]>;
  getGame(rawgIdOrSlug: number | string): Promise<CatalogGameUpsertInput>;
};

export class RawgConfigurationError extends Error {
  constructor() {
    super("RAWG_API_KEY is required for server-side catalog synchronization.");
    this.name = "RawgConfigurationError";
  }
}

export class RawgResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RawgResponseError";
  }
}

export function createRawgClient(options: {
  apiKey?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
} = {}): RawgClient {
  const apiKey = options.apiKey ?? process.env.RAWG_API_KEY;
  const baseUrl = options.baseUrl ?? RAWG_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());

  if (!apiKey) {
    throw new RawgConfigurationError();
  }

  return {
    async searchGames(input) {
      const query = input.query.trim();
      const pageSize = clampPageSize(input.pageSize);
      const url = new URL(`${baseUrl}/games`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("search", query);
      url.searchParams.set("page", String(Math.max(1, input.page ?? 1)));
      url.searchParams.set("page_size", String(pageSize));

      const payload = await fetchJson<RawgSearchPayload>(fetcher, url);
      const results = Array.isArray(payload.results) ? payload.results : [];

      return results.map((game) => normalizeRawgGame(game, now()));
    },

    async getGame(rawgIdOrSlug) {
      const url = new URL(`${baseUrl}/games/${encodeURIComponent(String(rawgIdOrSlug))}`);
      url.searchParams.set("key", apiKey);

      const payload = await fetchJson<RawgGamePayload>(fetcher, url);
      return normalizeRawgGame(payload, now());
    }
  };
}

export function normalizeRawgGame(payload: unknown, syncedAt: Date): CatalogGameUpsertInput {
  const game = asRawgGame(payload);
  const slug = requiredString(game.slug, "RAWG game slug");
  const rawgId = requiredNumber(game.id, "RAWG game id");
  const rawgUrl = `${RAWG_SITE_URL}/games/${slug}`;
  const rawgUpdatedAt = parseOptionalDate(game.updated);

  return {
    rawgId,
    slug,
    name: requiredString(game.name, "RAWG game name"),
    description: optionalText(game.description_raw) ?? optionalText(game.description),
    releasedAt: parseOptionalDate(game.released),
    backgroundImageUrl: optionalUrl(game.background_image),
    rawgUrl,
    rawgUpdatedAt,
    source: "RAWG",
    sourceUrl: rawgUrl,
    sourceUpdatedAt: rawgUpdatedAt,
    syncedAt,
    coopCampaignConfirmed: false,
    coopPlayerCountMin: null,
    coopPlayerCountMax: null,
    coopConfirmationSource: null,
    coopConfirmationCheckedAt: null,
    mainFlowEligible: false,
    platforms: normalizePlatforms(game.platforms),
    genres: normalizeGenres(game.genres),
    timeEstimate: normalizeRawgPlaytime(game.playtime, rawgUrl, syncedAt),
    availability: [] satisfies CatalogAvailabilityRecord[]
  };
}

async function fetchJson<T>(fetcher: typeof fetch, url: URL): Promise<T> {
  const response = await fetcher(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new RawgResponseError(`RAWG request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function clampPageSize(value: number | undefined): number {
  if (!value || Number.isNaN(value)) {
    return 12;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

function normalizePlatforms(value: unknown): CatalogPlatformRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const platform = (entry as RawgPlatform).platform;
    const slug = optionalText(platform?.slug);
    const mapped = slug ? mapRawgPlatform(slug) : null;

    if (!platform || !mapped) {
      return [];
    }

    return {
      key: mapped,
      name: requiredString(platform.name, "RAWG platform name"),
      rawgPlatformId: optionalNumber(platform.id)
    };
  });
}

function normalizeGenres(value: unknown): CatalogGenreRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const genre = entry as RawgGenre;
    const slug = optionalText(genre.slug);
    const name = optionalText(genre.name);

    if (!slug || !name) {
      return [];
    }

    return {
      slug,
      name,
      rawgGenreId: optionalNumber(genre.id)
    };
  });
}

function normalizeRawgPlaytime(
  playtime: unknown,
  sourceUrl: string,
  checkedAt: Date
): CatalogGameUpsertInput["timeEstimate"] {
  const hours = optionalNumber(playtime);

  if (!hours || hours <= 0) {
    return null;
  }

  return {
    minutes: Math.round(hours * 60),
    source: "RAWG playtime",
    sourceUrl,
    checkedAt,
    confidence: "unverified"
  };
}

function mapRawgPlatform(slug: string): CatalogPlatformKey | null {
  if (["pc", "macos", "linux"].includes(slug)) {
    return "pc";
  }

  if (slug.includes("playstation")) {
    return "playstation";
  }

  if (slug.includes("xbox")) {
    return "xbox";
  }

  if (slug.includes("nintendo")) {
    return "switch";
  }

  return null;
}

function asRawgGame(value: unknown): RawgGamePayload {
  if (!value || typeof value !== "object") {
    throw new RawgResponseError("RAWG returned an invalid game payload.");
  }

  return value as RawgGamePayload;
}

function requiredString(value: unknown, label: string): string {
  const text = optionalText(value);

  if (!text) {
    throw new RawgResponseError(`${label} is missing.`);
  }

  return text;
}

function requiredNumber(value: unknown, label: string): number {
  const number = optionalNumber(value);

  if (number === null) {
    throw new RawgResponseError(`${label} is missing.`);
  }

  return number;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function optionalUrl(value: unknown): string | null {
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  try {
    return new URL(text).toString();
  } catch {
    return null;
  }
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseOptionalDate(value: unknown): Date | null {
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}
