import {
  DISCOVERY_PLATFORM_KEYS,
  type DiscoveryPlatformKey,
  type DiscoveryRecommendationFilterInput
} from "../domain/recommendation-policy";
import type { DiscoveryDeckFilters } from "./ports";

type DiscoveryMemberPlatforms = {
  first: DiscoveryPlatformKey[];
  second: DiscoveryPlatformKey[];
};

export function normalizeMemberPlatforms(input: {
  first: string[];
  second: string[];
}): DiscoveryMemberPlatforms {
  return {
    first: input.first.filter(isDiscoveryPlatformKey),
    second: input.second.filter(isDiscoveryPlatformKey)
  };
}

export function toRecommendationFilters(
  filters: DiscoveryDeckFilters | undefined,
  memberPlatforms: DiscoveryMemberPlatforms,
  options: { defaultCommonPlatformOnly?: boolean } = {}
): DiscoveryRecommendationFilterInput {
  const requestedCommonPlatformOnly =
    filters?.commonPlatformOnly ??
    filters?.recommendation?.commonPlatformOnly ??
    options.defaultCommonPlatformOnly ??
    true;

  return {
    ...(filters?.recommendation ?? {}),
    commonPlatformOnly:
      hasCompletePlatformPreferences(memberPlatforms) && requestedCommonPlatformOnly,
    availability:
      filters?.availability ??
      filters?.recommendation?.availability ??
      null,
    maxEstimatedMinutes:
      filters?.maxEstimatedMinutes ??
      filters?.recommendation?.maxEstimatedMinutes ??
      null
  };
}

function hasCompletePlatformPreferences(input: DiscoveryMemberPlatforms): boolean {
  return input.first.length > 0 && input.second.length > 0;
}

function isDiscoveryPlatformKey(value: string): value is DiscoveryPlatformKey {
  return DISCOVERY_PLATFORM_KEYS.includes(value as DiscoveryPlatformKey);
}
