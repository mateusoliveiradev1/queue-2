import type { CatalogCurationPatch } from "../application/ports.ts";

export type CatalogSyncAllowlistEntry = {
  rawgRef: number | string;
  slug: string;
  expectedName: string;
  curation: Required<CatalogCurationPatch>;
};

const checkedAt = new Date("2026-06-03T12:00:00.000Z");

export const catalogSyncAllowlist: CatalogSyncAllowlistEntry[] = [
  allowlistEntry("it-takes-two-2", "it-takes-two", "It Takes Two"),
  allowlistEntry("a-way-out-2018", "a-way-out-2018", "A Way Out"),
  allowlistEntry("portal-2", "portal-2", "Portal 2"),
  allowlistEntry("unravel-two", "unravel-two", "Unravel Two"),
  allowlistEntry("cuphead", "cuphead", "Cuphead"),
  allowlistEntry("lovers-in-a-dangerous-spacetime", "lovers-in-a-dangerous-spacetime", "Lovers in a Dangerous Spacetime"),
  allowlistEntry("we-were-here-together", "we-were-here-together", "We Were Here Together"),
  allowlistEntry("children-of-morta", "children-of-morta", "Children of Morta"),
  allowlistEntry("nobody-saves-the-world", "nobody-saves-the-world", "Nobody Saves the World"),
  allowlistEntry("trine-4-the-nightmare-prince", "trine-4-the-nightmare-prince", "Trine 4: The Nightmare Prince"),
  allowlistEntry("sackboy-a-big-adventure", "sackboy-a-big-adventure", "Sackboy: A Big Adventure"),
  allowlistEntry("castle-crashers", "castle-crashers", "Castle Crashers")
];

function allowlistEntry(
  rawgRef: number | string,
  slug: string,
  expectedName: string
): CatalogSyncAllowlistEntry {
  return {
    rawgRef,
    slug,
    expectedName,
    curation: {
      coopCampaignConfirmed: true,
      coopPlayerCountMin: 2,
      coopPlayerCountMax: 2,
      coopConfirmationSource: "Curadoria QUEUE/2 allowlist",
      coopConfirmationCheckedAt: checkedAt,
      mainFlowEligible: true
    }
  };
}
