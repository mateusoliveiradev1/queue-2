#!/usr/bin/env node

const SAMPLE_SIZE = 100000;
const ROULETTE_ECONOMY_CONSTANTS = {
  baseWeights: {
    common: 70,
    rare: 22,
    epic: 7,
    legendary: 1
  },
  boostedWeights: {
    common: 55,
    rare: 28,
    epic: 14,
    legendary: 3
  },
  boostBalanceCap: 600,
  boostCost: 100,
  cooldownRounds: 3,
  cooldownWeightMultiplier: 0.5,
  minimumEligiblePool: 3,
  pityThreshold: 10,
  reelSlots: 60,
  weekendBoostGenerationMultiplier: 1.2
};
const SCENARIOS = [
  {
    name: "base distribution",
    weights: ROULETTE_ECONOMY_CONSTANTS.baseWeights
  },
  {
    name: "boosted distribution",
    weights: ROULETTE_ECONOMY_CONSTANTS.boostedWeights
  },
  {
    name: "pity-at-10 guarantee",
    pityCounterBefore: ROULETTE_ECONOMY_CONSTANTS.pityThreshold
  },
  {
    name: "cooldown 3 rounds at 50 percent",
    cooldownRounds: ROULETTE_ECONOMY_CONSTANTS.cooldownRounds,
    cooldownWeightMultiplier: ROULETTE_ECONOMY_CONSTANTS.cooldownWeightMultiplier
  },
  {
    name: "weekend boost generation",
    weekendMultiplier: ROULETTE_ECONOMY_CONSTANTS.weekendBoostGenerationMultiplier
  }
];

console.log("[roulette:economy] Phase 6 deterministic simulation scaffold");
console.log(`[roulette:economy] sample target: ${SAMPLE_SIZE}`);
console.log(
  `[roulette:economy] constants: ${JSON.stringify(ROULETTE_ECONOMY_CONSTANTS)}`
);

for (const scenario of SCENARIOS) {
  console.log(
    `[roulette:economy] BLOCKED scenario '${scenario.name}' requires the Phase 6 roulette selection/economy implementation before distribution evidence can be trusted.`
  );
}

console.error(
  "BLOCKED - missing roulette economy distribution evidence for base, boosted, pity, cooldown and weekend scenarios."
);
process.exitCode = 1;
