import type {
  CatalogAvailabilityRecord,
  CatalogGameDetailRecord,
  CatalogGameRecord,
  CatalogGenreRecord,
  CatalogPlatformKey,
  CatalogPlatformRecord,
  CatalogTimeEstimateRecord
} from "../domain/records";

export type {
  CatalogAvailabilityRecord,
  CatalogGameDetailRecord,
  CatalogGameRecord,
  CatalogGenreRecord,
  CatalogLocalizationRecord,
  CatalogPlatformKey,
  CatalogPlatformRecord,
  CatalogTimeEstimateRecord
} from "../domain/records";

export type CatalogSearchInput = {
  ids?: string[];
  query?: string;
  limit?: number;
  offset?: number;
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
