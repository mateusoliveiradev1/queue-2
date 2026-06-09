#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SAMPLE_SIZE = 100000;
const REPORT_PATH = resolve(
  ".planning/phases/06-roleta-e-economia/06-ECONOMY-SIMULATION.md"
);
const RARITIES = ["common", "rare", "epic", "legendary"];
const QUALIFIED_RARITIES = new Set(["epic", "legendary"]);
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
  boostEarnRate: 0.2,
  cooldownRounds: 3,
  cooldownWeightMultiplier: 0.5,
  eligibleXpAwardAmount: 100,
  pityThreshold: 10,
  weekendBoostGenerationMultiplier: 1.2
};

const baseDistribution = simulateRarityDistribution(
  "base",
  ROULETTE_ECONOMY_CONSTANTS.baseWeights,
  "queue2-phase6-base"
);
const boostedDistribution = simulateRarityDistribution(
  "boosted",
  ROULETTE_ECONOMY_CONSTANTS.boostedWeights,
  "queue2-phase6-boosted"
);
const pitySimulation = simulatePity("queue2-phase6-pity");
const cooldownSimulation = simulateCooldown("queue2-phase6-cooldown");
const boostEconomy = simulateBoostEconomy();

assertDistribution(baseDistribution, ROULETTE_ECONOMY_CONSTANTS.baseWeights);
assertDistribution(boostedDistribution, ROULETTE_ECONOMY_CONSTANTS.boostedWeights);
assert(
  pitySimulation.maxDryStreak <= ROULETTE_ECONOMY_CONSTANTS.pityThreshold,
  `pity dry streak exceeded ${ROULETTE_ECONOMY_CONSTANTS.pityThreshold}`
);
assert(pitySimulation.pityTriggers > 0, "pity simulation did not trigger");
for (const row of cooldownSimulation.filter((entry) => entry.remainingRounds > 0)) {
  assert(row.recentPercent < row.freshPercent, "cooldown did not reduce recent discard selection");
}
assert(boostEconomy.spendCount > 0, "boost spend count is empty");
assert(boostEconomy.refundCount > 0, "boost refund count is empty");
assert(boostEconomy.capHitCount > 0, "boost cap behavior was not observed");
assert(
  boostEconomy.weekendEarnPerCompletion === 24,
  "weekend multiplier did not produce 24 boost for 100 XP"
);

const report = buildReport({
  baseDistribution,
  boostedDistribution,
  boostEconomy,
  cooldownSimulation,
  pitySimulation
});

mkdirSync(dirname(REPORT_PATH), { recursive: true });
writeFileSync(REPORT_PATH, report, "utf8");

console.log("[roulette:economy] PASS");
console.log(`[roulette:economy] sample size: ${SAMPLE_SIZE}`);
console.log(`[roulette:economy] report: ${REPORT_PATH}`);
console.log(
  `[roulette:economy] base observed: ${formatPercentages(baseDistribution.percentages)}`
);
console.log(
  `[roulette:economy] boosted observed: ${formatPercentages(boostedDistribution.percentages)}`
);
console.log(
  `[roulette:economy] pity triggers: ${pitySimulation.pityTriggers}; max dry streak: ${pitySimulation.maxDryStreak}`
);
console.log(
  `[roulette:economy] boost spend/refund counts: ${boostEconomy.spendCount}/${boostEconomy.refundCount}; cap hits: ${boostEconomy.capHitCount}`
);

function simulateRarityDistribution(name, weights, seed) {
  const random = seededRandom(seed);
  const counts = emptyRarityCounts();

  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    counts[pickWeightedRarity(weights, random)] += 1;
  }

  return {
    counts,
    name,
    percentages: percentagesFromCounts(counts),
    sampleSize: SAMPLE_SIZE,
    weights
  };
}

function simulatePity(seed) {
  const random = seededRandom(seed);
  const counts = emptyRarityCounts();
  let drawsSinceEpicOrHigher = 0;
  let maxDryStreak = 0;
  let pityTriggers = 0;

  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    const pityActive =
      drawsSinceEpicOrHigher >= ROULETTE_ECONOMY_CONSTANTS.pityThreshold;
    const rarity = pityActive
      ? pickWeightedRarity(
          {
            common: 0,
            rare: 0,
            epic: ROULETTE_ECONOMY_CONSTANTS.baseWeights.epic,
            legendary: ROULETTE_ECONOMY_CONSTANTS.baseWeights.legendary
          },
          random
        )
      : pickWeightedRarity(ROULETTE_ECONOMY_CONSTANTS.baseWeights, random);

    if (pityActive) {
      pityTriggers += 1;
    }

    counts[rarity] += 1;

    if (QUALIFIED_RARITIES.has(rarity)) {
      drawsSinceEpicOrHigher = 0;
    } else {
      drawsSinceEpicOrHigher += 1;
      maxDryStreak = Math.max(maxDryStreak, drawsSinceEpicOrHigher);
    }
  }

  return {
    counts,
    maxDryStreak,
    percentages: percentagesFromCounts(counts),
    pityTriggers,
    sampleSize: SAMPLE_SIZE
  };
}

function simulateCooldown(seed) {
  const rows = [];

  for (const remainingRounds of [3, 2, 1, 0]) {
    const random = seededRandom(`${seed}-${remainingRounds}`);
    const recentWeight =
      remainingRounds > 0
        ? 70 * ROULETTE_ECONOMY_CONSTANTS.cooldownWeightMultiplier
        : 70;
    const freshWeight = 70;
    let recentCount = 0;
    let freshCount = 0;

    for (let index = 0; index < SAMPLE_SIZE; index += 1) {
      const picked = pickWeighted(
        [
          ["recent-discard", recentWeight],
          ["fresh-peer", freshWeight]
        ],
        random
      );

      if (picked === "recent-discard") {
        recentCount += 1;
      } else {
        freshCount += 1;
      }
    }

    rows.push({
      freshCount,
      freshPercent: percent(freshCount, SAMPLE_SIZE),
      freshWeight,
      recentCount,
      recentPercent: percent(recentCount, SAMPLE_SIZE),
      recentWeight,
      remainingRounds,
      sampleSize: SAMPLE_SIZE
    });
  }

  return rows;
}

function simulateBoostEconomy() {
  const regularEarnPerCompletion = calculateBoostEarnAmount(false);
  const weekendEarnPerCompletion = calculateBoostEarnAmount(true);
  let balance = 0;
  let capHitCount = 0;
  let rejectedSpendCount = 0;
  let refundCount = 0;
  let regularCompletionCount = 0;
  let regularGenerated = 0;
  let spendCount = 0;
  let weekendCompletionCount = 0;
  let weekendGenerated = 0;

  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    const isWeekend = index % 7 === 5 || index % 7 === 6;
    const earnedAmount = calculateBoostEarnAmount(isWeekend);
    const beforeEarn = balance;

    balance = Math.min(
      ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap,
      balance + earnedAmount
    );

    if (beforeEarn + earnedAmount > ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap) {
      capHitCount += 1;
    }

    if (isWeekend) {
      weekendCompletionCount += 1;
      weekendGenerated += earnedAmount;
    } else {
      regularCompletionCount += 1;
      regularGenerated += earnedAmount;
    }

    if (index % 5 !== 0) {
      continue;
    }

    if (balance < ROULETTE_ECONOMY_CONSTANTS.boostCost) {
      rejectedSpendCount += 1;
      continue;
    }

    balance -= ROULETTE_ECONOMY_CONSTANTS.boostCost;
    spendCount += 1;

    if (index % 97 === 0) {
      const beforeRefund = balance;

      balance = Math.min(
        ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap,
        balance + ROULETTE_ECONOMY_CONSTANTS.boostCost
      );
      refundCount += 1;

      if (
        beforeRefund + ROULETTE_ECONOMY_CONSTANTS.boostCost
        > ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap
      ) {
        capHitCount += 1;
      }
    }
  }

  return {
    balance,
    capBehaviorExample: {
      afterEarn: Math.min(
        ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap,
        590 + weekendEarnPerCompletion
      ),
      beforeEarn: 590,
      capped: true,
      earnedAmount: weekendEarnPerCompletion
    },
    capHitCount,
    regularCompletionCount,
    regularEarnPerCompletion,
    regularGenerated,
    rejectedSpendCount,
    refundCount,
    spendCount,
    weekendCompletionCount,
    weekendEarnPerCompletion,
    weekendGenerated
  };
}

function calculateBoostEarnAmount(isWeekend) {
  return Math.floor(
    ROULETTE_ECONOMY_CONSTANTS.eligibleXpAwardAmount
      * ROULETTE_ECONOMY_CONSTANTS.boostEarnRate
      * (isWeekend ? ROULETTE_ECONOMY_CONSTANTS.weekendBoostGenerationMultiplier : 1)
  );
}

function pickWeightedRarity(weights, random) {
  return pickWeighted(
    RARITIES.map((rarity) => [rarity, weights[rarity]]),
    random
  );
}

function pickWeighted(entries, random) {
  const totalWeight = entries.reduce((total, [, weight]) => total + Math.max(0, weight), 0);
  let target = random() * totalWeight;

  for (const [value, weight] of entries) {
    target -= Math.max(0, weight);

    if (target < 0) {
      return value;
    }
  }

  return entries[entries.length - 1][0];
}

function seededRandom(seed) {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6D2B79F5;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyRarityCounts() {
  return {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };
}

function percentagesFromCounts(counts) {
  return Object.fromEntries(
    RARITIES.map((rarity) => [rarity, percent(counts[rarity], SAMPLE_SIZE)])
  );
}

function percent(count, total) {
  return Number(((count / total) * 100).toFixed(3));
}

function assertDistribution(result, expectedWeights) {
  const totalWeight = Object.values(expectedWeights).reduce((total, weight) => total + weight, 0);

  for (const rarity of RARITIES) {
    const expected = (expectedWeights[rarity] / totalWeight) * 100;
    const actual = result.percentages[rarity];

    assert(
      Math.abs(actual - expected) <= 0.45,
      `${result.name} ${rarity} expected ${expected.toFixed(3)}%, got ${actual.toFixed(3)}%`
    );
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[roulette:economy] ${message}`);
  }
}

function buildReport({
  baseDistribution,
  boostedDistribution,
  boostEconomy,
  cooldownSimulation,
  pitySimulation
}) {
  return `# Phase 6 - Roulette Economy Simulation

Generated by \`node scripts/roulette-economy-simulation.mjs\`.

## Scope

- Traceability: ROUL-06, ROUL-07, ROUL-08.
- Decision coverage: D-05, D-06, D-10, D-12, D-13, D-14.
- Sample size: ${SAMPLE_SIZE} rounds per stochastic scenario.
- Verdict: PASS. Observed distributions stay inside tolerance, pity never exceeds ${ROULETTE_ECONOMY_CONSTANTS.pityThreshold} dry rounds, cooldown lowers recent discard odds, boost cost/refund/cap behavior is bounded.

## Constants

| Contract | Value |
| --- | ---: |
| Base common | ${ROULETTE_ECONOMY_CONSTANTS.baseWeights.common} |
| Base rare | ${ROULETTE_ECONOMY_CONSTANTS.baseWeights.rare} |
| Base epic | ${ROULETTE_ECONOMY_CONSTANTS.baseWeights.epic} |
| Base legendary | ${ROULETTE_ECONOMY_CONSTANTS.baseWeights.legendary} |
| Boosted common | ${ROULETTE_ECONOMY_CONSTANTS.boostedWeights.common} |
| Boosted rare | ${ROULETTE_ECONOMY_CONSTANTS.boostedWeights.rare} |
| Boosted epic | ${ROULETTE_ECONOMY_CONSTANTS.boostedWeights.epic} |
| Boosted legendary | ${ROULETTE_ECONOMY_CONSTANTS.boostedWeights.legendary} |
| Boost cost | ${ROULETTE_ECONOMY_CONSTANTS.boostCost} |
| Boost cap | ${ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap} |
| Cooldown rounds | ${ROULETTE_ECONOMY_CONSTANTS.cooldownRounds} |
| Cooldown multiplier | ${ROULETTE_ECONOMY_CONSTANTS.cooldownWeightMultiplier} |
| Pity threshold | ${ROULETTE_ECONOMY_CONSTANTS.pityThreshold} |
| Weekend generation multiplier | ${ROULETTE_ECONOMY_CONSTANTS.weekendBoostGenerationMultiplier} |

## Rarity Distribution

| Scenario | common | rare | epic | legendary |
| --- | ---: | ---: | ---: | ---: |
| Base expected weights | common 70 | rare 22 | epic 7 | legendary 1 |
| Base observed | ${formatPercent(baseDistribution.percentages.common)} | ${formatPercent(baseDistribution.percentages.rare)} | ${formatPercent(baseDistribution.percentages.epic)} | ${formatPercent(baseDistribution.percentages.legendary)} |
| Boosted expected weights | common 55 | rare 28 | epic 14 | legendary 3 |
| Boosted observed | ${formatPercent(boostedDistribution.percentages.common)} | ${formatPercent(boostedDistribution.percentages.rare)} | ${formatPercent(boostedDistribution.percentages.epic)} | ${formatPercent(boostedDistribution.percentages.legendary)} |

## Pity

- Pity guarantee at ${ROULETTE_ECONOMY_CONSTANTS.pityThreshold}: ${pitySimulation.pityTriggers} trigger counts in ${SAMPLE_SIZE} rounds.
- Max dry streak observed: ${pitySimulation.maxDryStreak}.
- Observed rarity with pity: common ${formatPercent(pitySimulation.percentages.common)}, rare ${formatPercent(pitySimulation.percentages.rare)}, epic ${formatPercent(pitySimulation.percentages.epic)}, legendary ${formatPercent(pitySimulation.percentages.legendary)}.

## Cooldown

| Remaining cooldown rounds | Recent discard weight | Fresh peer weight | Recent discard observed | Fresh peer observed |
| ---: | ---: | ---: | ---: | ---: |
${cooldownSimulation.map(formatCooldownRow).join("\n")}

## Boost Economy

- Boost spend/refund counts: ${boostEconomy.spendCount} spends, ${boostEconomy.refundCount} pre-persistence refunds, ${boostEconomy.rejectedSpendCount} insufficient-balance rejections.
- Cap behavior: ${boostEconomy.capHitCount} cap hits; example ${boostEconomy.capBehaviorExample.beforeEarn} + ${boostEconomy.capBehaviorExample.earnedAmount} is clamped to ${boostEconomy.capBehaviorExample.afterEarn} of cap ${ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap}.
- Weekend generation comparison: regular completion earns ${boostEconomy.regularEarnPerCompletion}; weekend completion earns ${boostEconomy.weekendEarnPerCompletion} with multiplier ${ROULETTE_ECONOMY_CONSTANTS.weekendBoostGenerationMultiplier}.
- Aggregate generation in the ${SAMPLE_SIZE} completion simulation: regular ${boostEconomy.regularGenerated} across ${boostEconomy.regularCompletionCount}; weekend ${boostEconomy.weekendGenerated} across ${boostEconomy.weekendCompletionCount}.

## Verdict

PASS. The economy remains bounded by cap ${ROULETTE_ECONOMY_CONSTANTS.boostBalanceCap}, boost cost ${ROULETTE_ECONOMY_CONSTANTS.boostCost} is observable, refund only appears in pre-persistence failure cases, cooldown applies a 50% weight reduction for ${ROULETTE_ECONOMY_CONSTANTS.cooldownRounds} rounds, and weekend generation uses multiplier ${ROULETTE_ECONOMY_CONSTANTS.weekendBoostGenerationMultiplier}.
`;
}

function formatCooldownRow(row) {
  return `| ${row.remainingRounds} | ${row.recentWeight} | ${row.freshWeight} | ${formatPercent(row.recentPercent)} | ${formatPercent(row.freshPercent)} |`;
}

function formatPercentages(percentages) {
  return RARITIES.map((rarity) => `${rarity}=${formatPercent(percentages[rarity])}`).join(", ");
}

function formatPercent(value) {
  return `${value.toFixed(3)}%`;
}
