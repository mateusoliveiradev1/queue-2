import "server-only";

import type {
  CatalogAvailabilityRecord,
  CatalogPlatformKey
} from "../application/ports";

export type CuratedCatalogAvailabilitySeed = CatalogAvailabilityRecord & {
  slug: string;
  source: "Xbox Store" | "Xbox Store / EA Play";
  status: "available";
  platformKey: CatalogPlatformKey;
};

const checkedAt = new Date("2026-06-03T21:25:00.000-03:00");

export const curatedCatalogAvailabilitySeeds: CuratedCatalogAvailabilitySeed[] = [
  gamePassSeed({
    slug: "a-way-out-2018",
    source: "Xbox Store / EA Play",
    sourceUrl: "https://www.xbox.com/en-us/games/store/a-way-out/bwvbncmf22zk"
  }),
  gamePassSeed({
    slug: "it-takes-two-2",
    source: "Xbox Store",
    sourceUrl: "https://www.xbox.com/en-us/games/store/It-Takes-Two/9NKJ0VZQ4N0L"
  }),
  gamePassSeed({
    slug: "unravel-two",
    source: "Xbox Store / EA Play",
    sourceUrl: "https://www.xbox.com/en-us/games/store/Unravel-Two/C4VKLMG1HLZW"
  })
];

function gamePassSeed({
  slug,
  source,
  sourceUrl
}: {
  slug: string;
  source: CuratedCatalogAvailabilitySeed["source"];
  sourceUrl: string;
}): CuratedCatalogAvailabilitySeed {
  return {
    slug,
    type: "game-pass",
    platformKey: "xbox",
    source,
    sourceUrl,
    checkedAt,
    status: "available"
  };
}
