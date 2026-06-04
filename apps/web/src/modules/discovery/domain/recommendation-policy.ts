import type { MergedDuoMood } from "./mood-quiz";
import { moodToTags } from "./mood-quiz";

export const DISCOVERY_PLATFORM_KEYS = [
  "pc",
  "playstation",
  "xbox",
  "switch",
  "steam-deck"
] as const;
export const DISCOVERY_COOP_TYPES = ["campaign", "online", "local", "shared-screen"] as const;
export const DISCOVERY_EDITORIAL_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary"
] as const;

export const COLLABORATIVE_MIN_CURRENT_DUO_DECISIONS = 20;
export const COLLABORATIVE_MIN_CROSS_DUO_POSITIVES = 100;
export const CONTROLLED_VARIETY_RATIO = 0.2;

export type DiscoveryPlatformKey = (typeof DISCOVERY_PLATFORM_KEYS)[number];
export type DiscoveryCoopType = (typeof DISCOVERY_COOP_TYPES)[number];
export type DiscoveryEditorialRarity = (typeof DISCOVERY_EDITORIAL_RARITIES)[number];
export type DiscoveryAvailabilityType = "free" | "game-pass";

export type DiscoveryAvailabilityFact = {
  type: DiscoveryAvailabilityType;
  platformKey: DiscoveryPlatformKey | null;
  status: "available" | "unavailable" | "unverified";
};

export type DiscoveryRecommendationGameFacts = {
  catalogGameId: string;
  title: string;
  mainFlowEligible: boolean;
  coopCampaignConfirmed: boolean;
  platforms: DiscoveryPlatformKey[];
  estimatedMinutes: number | null;
  availability: DiscoveryAvailabilityFact[];
  coopTypes: DiscoveryCoopType[];
  moodTags: string[];
  releaseYear: number | null;
  genres: string[];
  tags: string[];
  rarity: DiscoveryEditorialRarity;
};

export type DiscoveryRecommendationFilters = {
  commonPlatformOnly: boolean;
  maxEstimatedMinutes: number | null;
  availability: DiscoveryAvailabilityType | null;
  coopTypes: DiscoveryCoopType[];
  mood: MergedDuoMood | null;
  yearFrom: number | null;
  yearTo: number | null;
  genres: string[];
  rarity: DiscoveryEditorialRarity[];
};

export type DiscoveryRecommendationFilterInput = Partial<
  Omit<DiscoveryRecommendationFilters, "commonPlatformOnly">
> & {
  commonPlatformOnly?: boolean;
};

export type DiscoveryRecommendationFilterResult =
  | { ok: true; filters: DiscoveryRecommendationFilters }
  | {
      ok: false;
      errors: Array<
        | "invalid-max-estimated-minutes"
        | "invalid-year-range"
        | "invalid-year"
      >;
    };

export type CollaborativeInfluenceInput = {
  currentDuoDecisionCount: number;
  crossDuoPositiveDecisionCount: number;
};

export type CollaborativeInfluenceResult =
  | {
      enabled: false;
      weight: 0;
      reason: "threshold-not-met";
      minimums: {
        currentDuoDecisionCount: number;
        crossDuoPositiveDecisionCount: number;
      };
    }
  | {
      enabled: true;
      weight: 0.1;
      reason: "threshold-met";
      minimums: {
        currentDuoDecisionCount: number;
        crossDuoPositiveDecisionCount: number;
      };
    };

export type DiscoveryRecommendation = {
  catalogGameId: string;
  title: string;
  score: number;
  reasons: string[];
  commonPlatforms: DiscoveryPlatformKey[];
  varietyBand: "precision" | "variety";
};

export type DiscoveryRecommendationResult = {
  recommendations: DiscoveryRecommendation[];
  collaborativeInfluence: CollaborativeInfluenceResult;
  varietyBandSize: number;
};

const platformLabels: Record<DiscoveryPlatformKey, string> = {
  pc: "PC",
  playstation: "PlayStation",
  xbox: "Xbox",
  switch: "Switch",
  "steam-deck": "Steam Deck"
};

export function normalizeRecommendationFilters(
  input: DiscoveryRecommendationFilterInput = {}
): DiscoveryRecommendationFilterResult {
  const errors: Array<
    "invalid-max-estimated-minutes" | "invalid-year-range" | "invalid-year"
  > = [];

  if (
    input.maxEstimatedMinutes !== undefined &&
    input.maxEstimatedMinutes !== null &&
    (!Number.isInteger(input.maxEstimatedMinutes) || input.maxEstimatedMinutes <= 0)
  ) {
    errors.push("invalid-max-estimated-minutes");
  }

  for (const year of [input.yearFrom, input.yearTo]) {
    if (
      year !== undefined &&
      year !== null &&
      (!Number.isInteger(year) || year < 1970 || year > 2100)
    ) {
      errors.push("invalid-year");
    }
  }

  if (
    input.yearFrom !== undefined &&
    input.yearFrom !== null &&
    input.yearTo !== undefined &&
    input.yearTo !== null &&
    input.yearFrom > input.yearTo
  ) {
    errors.push("invalid-year-range");
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  return {
    ok: true,
    filters: {
      commonPlatformOnly: input.commonPlatformOnly ?? true,
      maxEstimatedMinutes: input.maxEstimatedMinutes ?? null,
      availability: input.availability ?? null,
      coopTypes: input.coopTypes ?? [],
      mood: input.mood ?? null,
      yearFrom: input.yearFrom ?? null,
      yearTo: input.yearTo ?? null,
      genres: normalizeTextList(input.genres ?? []),
      rarity: input.rarity ?? []
    }
  };
}

export function evaluateCollaborativeInfluence(
  input: CollaborativeInfluenceInput
): CollaborativeInfluenceResult {
  const minimums = {
    currentDuoDecisionCount: COLLABORATIVE_MIN_CURRENT_DUO_DECISIONS,
    crossDuoPositiveDecisionCount: COLLABORATIVE_MIN_CROSS_DUO_POSITIVES
  };

  if (
    input.currentDuoDecisionCount < COLLABORATIVE_MIN_CURRENT_DUO_DECISIONS ||
    input.crossDuoPositiveDecisionCount < COLLABORATIVE_MIN_CROSS_DUO_POSITIVES
  ) {
    return {
      enabled: false,
      weight: 0,
      reason: "threshold-not-met",
      minimums
    };
  }

  return {
    enabled: true,
    weight: 0.1,
    reason: "threshold-met",
    minimums
  };
}

export function rankDiscoveryRecommendations(input: {
  games: DiscoveryRecommendationGameFacts[];
  memberPlatforms: {
    first: DiscoveryPlatformKey[];
    second: DiscoveryPlatformKey[];
  };
  filters?: DiscoveryRecommendationFilterInput;
  positiveTags?: string[];
  positiveGenres?: string[];
  collaborative?: CollaborativeInfluenceInput;
}): DiscoveryRecommendationResult {
  const filterResult = normalizeRecommendationFilters(input.filters);

  if (!filterResult.ok) {
    return {
      recommendations: [],
      collaborativeInfluence: evaluateCollaborativeInfluence(
        input.collaborative ?? {
          currentDuoDecisionCount: 0,
          crossDuoPositiveDecisionCount: 0
        }
      ),
      varietyBandSize: 0
    };
  }

  const positiveTags = new Set(normalizeTextList(input.positiveTags ?? []));
  const positiveGenres = new Set(normalizeTextList(input.positiveGenres ?? []));
  const collaborativeInfluence = evaluateCollaborativeInfluence(
    input.collaborative ?? {
      currentDuoDecisionCount: 0,
      crossDuoPositiveDecisionCount: 0
    }
  );
  const scored = input.games
    .map((game) =>
      scoreGame({
        game,
        memberPlatforms: input.memberPlatforms,
        filters: filterResult.filters,
        positiveTags,
        positiveGenres,
        collaborativeInfluence
      })
    )
    .filter((game): game is Omit<DiscoveryRecommendation, "varietyBand"> => game !== null)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const varietyBandSize =
    scored.length === 0
      ? 0
      : Math.max(1, Math.floor(scored.length * CONTROLLED_VARIETY_RATIO));
  const precisionCount = Math.max(0, scored.length - varietyBandSize);

  return {
    recommendations: scored.map((game, index) => ({
      ...game,
      varietyBand: index >= precisionCount ? "variety" : "precision"
    })),
    collaborativeInfluence,
    varietyBandSize
  };
}

function scoreGame(input: {
  game: DiscoveryRecommendationGameFacts;
  memberPlatforms: {
    first: DiscoveryPlatformKey[];
    second: DiscoveryPlatformKey[];
  };
  filters: DiscoveryRecommendationFilters;
  positiveTags: Set<string>;
  positiveGenres: Set<string>;
  collaborativeInfluence: CollaborativeInfluenceResult;
}): Omit<DiscoveryRecommendation, "varietyBand"> | null {
  const { game, filters } = input;
  const reasons: string[] = [];

  if (!game.mainFlowEligible || !game.coopCampaignConfirmed) {
    return null;
  }

  let score = 30;
  reasons.push("campanha 2p");

  const commonPlatforms = getCommonGamePlatforms(game.platforms, input.memberPlatforms);

  if (commonPlatforms.length === 0 && filters.commonPlatformOnly) {
    return null;
  }

  if (commonPlatforms.length > 0) {
    score += 25;
    reasons.push(`${formatPlatformList(commonPlatforms)} em comum`);
  } else {
    score -= 20;
    reasons.push("sem plataforma em comum");
  }

  if (
    filters.maxEstimatedMinutes !== null &&
    (game.estimatedMinutes === null || game.estimatedMinutes > filters.maxEstimatedMinutes)
  ) {
    return null;
  }

  if (game.estimatedMinutes !== null) {
    score += game.estimatedMinutes <= 480 ? 10 : 4;
    reasons.push(game.estimatedMinutes <= 480 ? "curto para hoje" : "tempo com fonte");
  }

  if (filters.availability !== null && !hasAvailability(game, filters.availability)) {
    return null;
  }

  const availabilityReason = getAvailabilityReason(game, filters.availability);
  if (availabilityReason) {
    score += 10;
    reasons.push(availabilityReason);
  }

  if (
    filters.coopTypes.length > 0 &&
    !filters.coopTypes.some((coopType) => game.coopTypes.includes(coopType))
  ) {
    return null;
  }

  if (!matchesMoodFilter(game, filters.mood)) {
    return null;
  }

  if (filters.mood) {
    score += 6;
    reasons.push(getMoodReason(filters.mood));
  }

  if (filters.yearFrom !== null && (game.releaseYear === null || game.releaseYear < filters.yearFrom)) {
    return null;
  }

  if (filters.yearTo !== null && (game.releaseYear === null || game.releaseYear > filters.yearTo)) {
    return null;
  }

  if (
    filters.genres.length > 0 &&
    !filters.genres.some((genre) => normalizeTextList(game.genres).includes(genre))
  ) {
    return null;
  }

  if (filters.rarity.length > 0 && !filters.rarity.includes(game.rarity)) {
    return null;
  }

  const genreOverlap = normalizeTextList(game.genres).filter((genre) =>
    input.positiveGenres.has(genre)
  );
  if (genreOverlap.length > 0) {
    score += 8;
    reasons.push(`${genreOverlap[0]} que voces costumam curtir`);
  }

  const tagOverlap = normalizeTextList(game.tags).filter((tag) => input.positiveTags.has(tag));
  if (tagOverlap.length > 0) {
    score += 6;
  }

  if (game.rarity !== "common") {
    score += rarityWeight(game.rarity);
    reasons.push(getRarityReason(game.rarity));
  }

  if (input.collaborativeInfluence.enabled) {
    score += 3;
    reasons.push("sinal colaborativo leve");
  }

  return {
    catalogGameId: game.catalogGameId,
    title: game.title,
    score,
    reasons: uniqueReasons(reasons),
    commonPlatforms
  };
}

function getCommonGamePlatforms(
  gamePlatforms: DiscoveryPlatformKey[],
  memberPlatforms: {
    first: DiscoveryPlatformKey[];
    second: DiscoveryPlatformKey[];
  }
): DiscoveryPlatformKey[] {
  const second = new Set(memberPlatforms.second);
  return memberPlatforms.first
    .filter((platform) => second.has(platform) && gamePlatforms.includes(platform))
    .sort(comparePlatformOrder);
}

function hasAvailability(
  game: DiscoveryRecommendationGameFacts,
  availability: DiscoveryAvailabilityType
): boolean {
  return game.availability.some(
    (item) => item.type === availability && item.status === "available"
  );
}

function getAvailabilityReason(
  game: DiscoveryRecommendationGameFacts,
  requestedAvailability: DiscoveryAvailabilityType | null
): string | null {
  const target = requestedAvailability
    ? game.availability.find(
        (item) => item.type === requestedAvailability && item.status === "available"
      )
    : game.availability.find((item) => item.status === "available");

  if (!target) {
    return null;
  }

  return target.type === "game-pass" ? "Game Pass verificado" : "gratis verificado";
}

function matchesMoodFilter(
  game: DiscoveryRecommendationGameFacts,
  mood: MergedDuoMood | null
): boolean {
  if (!mood) {
    return true;
  }

  const gameTags = new Set(game.moodTags);
  return moodToTags(mood).every((tag) => gameTags.has(tag) || gameTags.has("vibe-flexible"));
}

function getMoodReason(mood: MergedDuoMood): string {
  if (mood.vibe === "flexible" || mood.conflictResolution === "flexible") {
    return "vibe flexivel";
  }

  if (mood.energy === "medium" || mood.commitment === "steady") {
    return "meio-termo da dupla";
  }

  return "mood da dupla";
}

function getRarityReason(rarity: DiscoveryEditorialRarity): string {
  if (rarity === "legendary") {
    return "lenda QUEUE/2";
  }

  if (rarity === "epic") {
    return "epico QUEUE/2";
  }

  return "achado QUEUE/2";
}

function rarityWeight(rarity: DiscoveryEditorialRarity): number {
  if (rarity === "legendary") {
    return 6;
  }

  if (rarity === "epic") {
    return 4;
  }

  if (rarity === "rare") {
    return 2;
  }

  return 0;
}

function normalizeTextList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons)].slice(0, 5);
}

function formatPlatformList(platforms: DiscoveryPlatformKey[]): string {
  return platforms.map((platform) => platformLabels[platform]).join(", ");
}

function comparePlatformOrder(
  left: DiscoveryPlatformKey,
  right: DiscoveryPlatformKey
): number {
  return DISCOVERY_PLATFORM_KEYS.indexOf(left) - DISCOVERY_PLATFORM_KEYS.indexOf(right);
}
