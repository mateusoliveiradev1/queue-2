export type CatalogPlatformKey =
  | "pc"
  | "playstation"
  | "xbox"
  | "switch"
  | "steam-deck";

export type CatalogPlatformRecord = {
  key: CatalogPlatformKey;
  name: string;
  rawgPlatformId: number | null;
};

export type CatalogGenreRecord = {
  slug: string;
  name: string;
  rawgGenreId: number | null;
};

export type CatalogTimeEstimateRecord = {
  minutes: number | null;
  source: string;
  sourceUrl: string | null;
  checkedAt: Date;
  confidence: "verified" | "estimated" | "unverified";
};

export type CatalogAvailabilityRecord = {
  type: "free" | "game-pass";
  platformKey: CatalogPlatformKey | null;
  source: string;
  sourceUrl: string | null;
  checkedAt: Date;
  status: "available" | "unavailable" | "unverified";
};

export type CatalogLocalizationRecord = {
  locale: "pt-BR";
  version: number;
  description: string;
  source: string;
  sourceUrl: string | null;
  publishedAt: Date;
  reviewedAt: Date;
};

export type CatalogGameRecord = {
  id: string;
  rawgId: number;
  slug: string;
  name: string;
  description: string | null;
  releasedAt: Date | null;
  backgroundImageUrl: string | null;
  rawgUrl: string;
  rawgUpdatedAt: Date | null;
  source: "RAWG";
  sourceUrl: string;
  sourceUpdatedAt: Date | null;
  syncedAt: Date;
  coopCampaignConfirmed: boolean;
  coopPlayerCountMin: number | null;
  coopPlayerCountMax: number | null;
  coopConfirmationSource: string | null;
  coopConfirmationCheckedAt: Date | null;
  mainFlowEligible: boolean;
};

export type CatalogGameDetailRecord = CatalogGameRecord & {
  platforms: CatalogPlatformRecord[];
  genres: CatalogGenreRecord[];
  localization: CatalogLocalizationRecord | null;
  timeEstimate: CatalogTimeEstimateRecord | null;
  availability: CatalogAvailabilityRecord[];
};

export type CatalogSearchInput = {
  ids?: string[];
  query?: string;
  limit?: number;
  onlyMainFlow?: boolean;
  platformKeys?: CatalogPlatformKey[];
};

export type CatalogGameUpsertInput = Omit<CatalogGameRecord, "id"> & {
  platforms: CatalogPlatformRecord[];
  genres: CatalogGenreRecord[];
  timeEstimate?: CatalogTimeEstimateRecord | null;
  availability?: CatalogAvailabilityRecord[];
};

export type CatalogCurationPatch = Partial<
  Pick<
    CatalogGameRecord,
    | "coopCampaignConfirmed"
    | "coopPlayerCountMin"
    | "coopPlayerCountMax"
    | "coopConfirmationSource"
    | "coopConfirmationCheckedAt"
    | "mainFlowEligible"
  >
>;

export interface CatalogRepository {
  searchGames(input?: CatalogSearchInput): Promise<CatalogGameDetailRecord[]>;
  getGameBySlug(slug: string): Promise<CatalogGameDetailRecord | null>;
  upsertGame(input: CatalogGameUpsertInput): Promise<string>;
  upsertGames(inputs: CatalogGameUpsertInput[]): Promise<string[]>;
  syncRawgGame(input: CatalogGameUpsertInput, curation?: CatalogCurationPatch): Promise<string>;
}
