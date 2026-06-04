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
  allowlistEntry("lovers-in-a-dangerous-spacetime", "lovers-in-a-dangerous-spacetime", "Lovers in a Dangerous Spacetime", 4),
  allowlistEntry("we-were-here-together", "we-were-here-together", "We Were Here Together"),
  allowlistEntry("children-of-morta", "children-of-morta", "Children of Morta"),
  allowlistEntry("nobody-saves-the-world", "nobody-saves-the-world", "Nobody Saves the World"),
  allowlistEntry("trine-4-the-nightmare-prince", "trine-4-the-nightmare-prince", "Trine 4: The Nightmare Prince", 4),
  allowlistEntry("sackboy-a-big-adventure", "sackboy-a-big-adventure", "Sackboy: A Big Adventure"),
  allowlistEntry("castle-crashers", "castle-crashers", "Castle Crashers", 4),
  allowlistEntry("overcooked", "overcooked", "Overcooked", 4),
  allowlistEntry("overcooked-2", "overcooked-2", "Overcooked! 2", 4),
  allowlistEntry("overcooked-all-you-can-eat", "overcooked-all-you-can-eat", "Overcooked! All You Can Eat", 4),
  allowlistEntry("moving-out-2", "moving-out-2", "Moving Out", 4),
  allowlistEntry("keywe", "keywe", "KeyWe"),
  allowlistEntry("operation-tango", "operation-tango", "Operation: Tango"),
  allowlistEntry("we-were-here", "we-were-here", "We Were Here"),
  allowlistEntry("we-were-here-too", "we-were-here-too", "We Were Here Too"),
  allowlistEntry("we-were-here-forever", "we-were-here-forever", "We Were Here Forever"),
  allowlistEntry("biped", "biped", "Biped"),
  allowlistEntry("phogs", "phogs", "PHOGS!"),
  allowlistEntry("degrees-of-separation", "degrees-of-separation", "Degrees of Separation"),
  allowlistEntry("keep-talking-and-nobody-explodes", "keep-talking-and-nobody-explodes", "Keep Talking and Nobody Explodes"),
  allowlistEntry("human-fall-flat", "human-fall-flat", "Human: Fall Flat", 8),
  allowlistEntry("stardew-valley", "stardew-valley", "Stardew Valley", 8),
  allowlistEntry("dont-starve-together", "dont-starve-together", "Don't Starve Together", 6),
  allowlistEntry("terraria", "terraria", "Terraria", 8),
  allowlistEntry("valheim", "valheim", "Valheim", 10),
  allowlistEntry("raft", "raft", "Raft", 8),
  allowlistEntry("deep-rock-galactic", "deep-rock-galactic", "Deep Rock Galactic", 4),
  allowlistEntry("left-4-dead-2", "left-4-dead-2", "Left 4 Dead 2", 4),
  allowlistEntry("back-4-blood", "back-4-blood", "Back 4 Blood", 4),
  allowlistEntry("risk-of-rain-2", "risk-of-rain-2", "Risk of Rain 2", 4),
  allowlistEntry("remnant-from-the-ashes", "remnant-from-the-ashes", "Remnant: From the Ashes", 3),
  allowlistEntry("remnant-ii", "remnant-ii", "Remnant II", 3),
  allowlistEntry("borderlands-2", "borderlands-2", "Borderlands 2", 4),
  allowlistEntry("borderlands-3", "borderlands-3", "Borderlands 3", 4),
  allowlistEntry("tiny-tinas-wonderlands", "tiny-tinas-wonderlands", "Tiny Tina's Wonderlands", 4),
  allowlistEntry("monster-hunter-rise", "monster-hunter-rise", "Monster Hunter Rise", 4),
  allowlistEntry("rayman-legends", "rayman-legends", "Rayman Legends", 4),
  allowlistEntry("guacamelee-2", "guacamelee-2", "Guacamelee! 2", 4),
  allowlistEntry("broforce", "broforce", "Broforce", 4),
  allowlistEntry("spelunky-2", "spelunky-2", "Spelunky 2", 4),
  allowlistEntry("enter-the-gungeon", "enter-the-gungeon", "Enter the Gungeon"),
  allowlistEntry("wizard-of-legend", "wizard-of-legend", "Wizard of Legend"),
  allowlistEntry("plateup", "plateup", "PlateUp!", 4),
  allowlistEntry(
    "teenage-mutant-ninja-turtles-shredders-revenge",
    "teenage-mutant-ninja-turtles-shredders-revenge",
    "Teenage Mutant Ninja Turtles: Shredder's Revenge",
    6
  ),
  allowlistEntry("streets-of-rage-4", "streets-of-rage-4", "Streets of Rage 4", 4),
  allowlistEntry("helldivers-2", "helldivers-2", "HELLDIVERS 2", 4),
  allowlistEntry("sea-of-thieves", "sea-of-thieves", "Sea of Thieves", 4),
  allowlistEntry("no-mans-sky", "no-mans-sky", "No Man's Sky", 4),
  allowlistEntry("core-keeper", "core-keeper", "Core Keeper", 8)
];

function allowlistEntry(
  rawgRef: number | string,
  slug: string,
  expectedName: string,
  coopPlayerCountMax = 2
): CatalogSyncAllowlistEntry {
  return {
    rawgRef,
    slug,
    expectedName,
    curation: {
      coopCampaignConfirmed: true,
      coopPlayerCountMin: 2,
      coopPlayerCountMax,
      coopConfirmationSource: "Curadoria QUEUE/2 allowlist",
      coopConfirmationCheckedAt: checkedAt,
      mainFlowEligible: true
    }
  };
}
