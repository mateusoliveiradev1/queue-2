export const SUPPORTED_PLATFORMS = [
  "pc",
  "playstation",
  "xbox",
  "switch",
  "steam-deck"
] as const;

export type PlatformKey = (typeof SUPPORTED_PLATFORMS)[number];

export type PlatformOption = {
  key: PlatformKey;
  label: string;
};

export const PLATFORM_OPTIONS: PlatformOption[] = [
  { key: "pc", label: "PC" },
  { key: "playstation", label: "PlayStation" },
  { key: "xbox", label: "Xbox" },
  { key: "switch", label: "Switch" },
  { key: "steam-deck", label: "Steam Deck" }
];

const platformSet = new Set<string>(SUPPORTED_PLATFORMS);

export function isPlatformKey(value: string): value is PlatformKey {
  return platformSet.has(value);
}

export function normalizePlatformKey(value: string): PlatformKey | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");

  if (normalized === "ps" || normalized === "ps5" || normalized === "ps4") {
    return "playstation";
  }

  if (normalized === "nintendo-switch") {
    return "switch";
  }

  return isPlatformKey(normalized) ? normalized : null;
}

export function normalizePlatformSet(values: string[]): PlatformKey[] {
  const normalized = values
    .map(normalizePlatformKey)
    .filter((value): value is PlatformKey => value !== null);

  return [...new Set(normalized)].sort(comparePlatformOrder);
}

export function getCommonPlatforms(
  first: PlatformKey[],
  second: PlatformKey[]
): PlatformKey[] {
  const secondSet = new Set(second);
  return first.filter((platform) => secondSet.has(platform)).sort(comparePlatformOrder);
}

export function formatPlatformLabel(platform: PlatformKey): string {
  return PLATFORM_OPTIONS.find((option) => option.key === platform)?.label ?? platform;
}

function comparePlatformOrder(left: PlatformKey, right: PlatformKey): number {
  return SUPPORTED_PLATFORMS.indexOf(left) - SUPPORTED_PLATFORMS.indexOf(right);
}
