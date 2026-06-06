import {
  GAMIFICATION_RARITIES,
  type GamificationRarity
} from "../../../modules/gamification";

export type AchievementRouteParams = {
  rarity: GamificationRarity | null;
  invalidRarity: boolean;
};

export function parseAchievementRouteParams(
  params: Record<string, string | string[] | undefined> | undefined
): AchievementRouteParams {
  const rawRarity = getSearchParam(params?.raridade);

  if (!rawRarity) {
    return {
      rarity: null,
      invalidRarity: false
    };
  }

  if (isGamificationRarity(rawRarity)) {
    return {
      rarity: rawRarity,
      invalidRarity: false
    };
  }

  return {
    rarity: null,
    invalidRarity: true
  };
}

export function buildAchievementPath(
  params: Pick<AchievementRouteParams, "rarity">,
  override?: {
    rarity?: GamificationRarity | null;
  }
): string {
  const rarity = override?.rarity === undefined ? params.rarity : override.rarity;
  const searchParams = new URLSearchParams();

  if (rarity) {
    searchParams.set("raridade", rarity);
  }

  const query = searchParams.toString();

  return query ? `/app/conquistas?${query}` : "/app/conquistas";
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isGamificationRarity(value: string): value is GamificationRarity {
  return GAMIFICATION_RARITIES.includes(value as GamificationRarity);
}
