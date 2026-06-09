export const ROULETTE_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary"
] as const;

export const ROULETTE_ELIGIBLE_STATUSES = ["wishlist", "pausado"] as const;
export const ROULETTE_MINIMUM_ELIGIBLE_GAMES = 3;
export const ROULETTE_REEL_SLOT_COUNT = 60;
export const ROULETTE_BASE_WEIGHTS = {
  common: 70,
  rare: 22,
  epic: 7,
  legendary: 1
} as const satisfies RouletteRarityWeights;
export const ROULETTE_BOOSTED_WEIGHTS = {
  common: 55,
  rare: 28,
  epic: 14,
  legendary: 3
} as const satisfies RouletteRarityWeights;
export const ROULETTE_PITY_THRESHOLD = 10;
export const ROULETTE_BOOST_COST = 100;
export const ROULETTE_BOOST_BALANCE_CAP = 600;
export const ROULETTE_COOLDOWN_ROUNDS = 3;
export const ROULETTE_COOLDOWN_MULTIPLIER = 0.5;
export const ROULETTE_WEEKEND_BOOST_EARN_MULTIPLIER = 1.2;
export const ROULETTE_BOOST_EARN_RATE = 0.2;

export type RouletteRarity = (typeof ROULETTE_RARITIES)[number];
export type RouletteEligibleStatus = (typeof ROULETTE_ELIGIBLE_STATUSES)[number];
export type RouletteLibraryStatus =
  | RouletteEligibleStatus
  | "jogando"
  | "zerado"
  | "dropado";
export type RouletteRarityWeights = Record<RouletteRarity, number>;
export type RouletteRoundStatus =
  | "active"
  | "revealing"
  | "pending_invitation"
  | "locked"
  | "discarded"
  | "failed";

export type RouletteGame = {
  id: string;
  status: string;
  rarity: RouletteRarity;
  title: string;
  catalogGameId?: string;
  coverUrl?: string | null;
};

export type RouletteEligiblePoolResult =
  | {
      ok: true;
      count: number;
      eligibleGames: RouletteGame[];
    }
  | {
      ok: false;
      reason: "minimum-eligible-pool";
      count: number;
      required: typeof ROULETTE_MINIMUM_ELIGIBLE_GAMES;
      ctas: ["biblioteca", "descobrir", "catalogo"];
    };

export type RouletteSelectionResult =
  | {
      ok: true;
      pityApplied: boolean;
      result: RouletteGame;
      totalWeight: number;
    }
  | {
      ok: false;
      reason: "empty-eligible-pool";
    };

export type RouletteVisualReelSlot = {
  slotIndex: number;
  gameId: string;
  catalogGameId?: string;
  title: string;
  rarity: RouletteRarity;
  coverUrl?: string | null;
  authoritativeResult: boolean;
};

export type RouletteCooldownWeight = {
  libraryGameId: string;
  weight: number;
};

export type RouletteCooldown = {
  libraryGameId: string;
  remainingRounds: number;
  multiplier?: number;
};

const eligibleStatusSet = new Set<string>(ROULETTE_ELIGIBLE_STATUSES);
const qualifiedRarities = new Set<RouletteRarity>(["epic", "legendary"]);
const blockingRoundStatuses = new Set<RouletteRoundStatus>([
  "active",
  "revealing",
  "pending_invitation"
]);

export function getEligiblePoolPolicy(input: {
  games: RouletteGame[];
}): RouletteEligiblePoolResult {
  const eligibleGames = input.games.filter((game) => eligibleStatusSet.has(game.status));

  if (eligibleGames.length < ROULETTE_MINIMUM_ELIGIBLE_GAMES) {
    return {
      count: eligibleGames.length,
      ctas: ["biblioteca", "descobrir", "catalogo"],
      ok: false,
      reason: "minimum-eligible-pool",
      required: ROULETTE_MINIMUM_ELIGIBLE_GAMES
    };
  }

  return {
    count: eligibleGames.length,
    eligibleGames,
    ok: true
  };
}

export function selectRouletteResult(input: {
  eligibleGames: RouletteGame[];
  boostRequested?: boolean;
  pityCount?: number;
  roll?: number;
  seed?: string;
  weights?: RouletteRarityWeights;
}): RouletteSelectionResult {
  const pityActive = (input.pityCount ?? 0) >= ROULETTE_PITY_THRESHOLD;
  const qualifiedGames = input.eligibleGames.filter((game) =>
    qualifiedRarities.has(game.rarity)
  );
  const candidateGames =
    pityActive && qualifiedGames.length > 0 ? qualifiedGames : input.eligibleGames;

  if (candidateGames.length === 0) {
    return { ok: false, reason: "empty-eligible-pool" };
  }

  const weights = input.weights
    ?? (input.boostRequested ? ROULETTE_BOOSTED_WEIGHTS : ROULETTE_BASE_WEIGHTS);
  const weightedGames = candidateGames.map((game) => ({
    game,
    weight: Math.max(0, weights[game.rarity])
  }));
  const totalWeight = weightedGames.reduce((total, entry) => total + entry.weight, 0);
  const normalizedRoll = normalizeRoll(input.roll, input.seed);
  let target = normalizedRoll * totalWeight;

  for (const entry of weightedGames) {
    target -= entry.weight;

    if (target < 0) {
      return {
        ok: true,
        pityApplied: pityActive && qualifiedGames.length > 0,
        result: entry.game,
        totalWeight
      };
    }
  }

  const fallback = weightedGames[weightedGames.length - 1]!;
  return {
    ok: true,
    pityApplied: pityActive && qualifiedGames.length > 0,
    result: fallback.game,
    totalWeight
  };
}

export function buildVisualReel(input: {
  eligibleGames: RouletteGame[];
  selectedResultId: string;
  seed?: string;
  slotCount?: number;
  selectedSlotIndex?: number;
}): RouletteVisualReelSlot[] {
  const slotCount = clampPositiveInteger(input.slotCount, ROULETTE_REEL_SLOT_COUNT);

  if (input.eligibleGames.length === 0) {
    return [];
  }

  const selectedGame =
    input.eligibleGames.find((game) => game.id === input.selectedResultId)
    ?? input.eligibleGames[0]!;
  const seedOffset = Math.floor(seedToUnitInterval(input.seed ?? input.selectedResultId) * 997);
  const selectedSlotIndex = clampSlotIndex(
    input.selectedSlotIndex ?? Math.round(slotCount * 0.82),
    slotCount
  );

  return Array.from({ length: slotCount }, (_, index) => {
    const slotIndex = index + 1;
    const game =
      slotIndex === selectedSlotIndex
        ? selectedGame
        : input.eligibleGames[(index + seedOffset) % input.eligibleGames.length]!;

    return {
      authoritativeResult: slotIndex === selectedSlotIndex,
      catalogGameId: game.catalogGameId,
      coverUrl: game.coverUrl,
      gameId: game.id,
      rarity: game.rarity,
      slotIndex,
      title: game.title
    };
  });
}

export function applyPityTransition(input: {
  drawsSinceEpicOrHigher: number;
  resultRarity: RouletteRarity;
}): {
  drawsSinceEpicOrHigher: number;
  qualifiedResult: boolean;
} {
  const qualifiedResult = qualifiedRarities.has(input.resultRarity);

  return {
    drawsSinceEpicOrHigher: qualifiedResult
      ? 0
      : clampNonNegativeInteger(input.drawsSinceEpicOrHigher) + 1,
    qualifiedResult
  };
}

export function calculateBoostEarnAmount(input: {
  currentBalance: number;
  eligibleXpAwardAmount: number;
  isWeekend?: boolean;
  lifetimeDuoXp: number;
}): {
  balance: number;
  capped: boolean;
  earnedAmount: number;
  lifetimeDuoXp: number;
  multiplier: number;
} {
  const multiplier = input.isWeekend
    ? ROULETTE_WEEKEND_BOOST_EARN_MULTIPLIER
    : 1;
  const earnedAmount = Math.floor(
    clampNonNegativeInteger(input.eligibleXpAwardAmount)
      * ROULETTE_BOOST_EARN_RATE
      * multiplier
  );
  const currentBalance = clampNonNegativeInteger(input.currentBalance);
  const balance = Math.min(
    ROULETTE_BOOST_BALANCE_CAP,
    currentBalance + earnedAmount
  );

  return {
    balance,
    capped: currentBalance + earnedAmount > ROULETTE_BOOST_BALANCE_CAP,
    earnedAmount,
    lifetimeDuoXp: input.lifetimeDuoXp,
    multiplier
  };
}

export function applyBoostCostPolicy(input: {
  boostRequested: boolean;
  currentBalance: number;
  lifetimeDuoXp: number;
}):
  | {
      ok: true;
      spent: boolean;
      cost: number;
      balance: number;
      lifetimeDuoXp: number;
    }
  | {
      ok: false;
      reason: "insufficient-boost-balance";
      spent: false;
      cost: typeof ROULETTE_BOOST_COST;
      balance: number;
      lifetimeDuoXp: number;
    } {
  const currentBalance = clampNonNegativeInteger(input.currentBalance);

  if (!input.boostRequested) {
    return {
      balance: currentBalance,
      cost: 0,
      lifetimeDuoXp: input.lifetimeDuoXp,
      ok: true,
      spent: false
    };
  }

  if (currentBalance < ROULETTE_BOOST_COST) {
    return {
      balance: currentBalance,
      cost: ROULETTE_BOOST_COST,
      lifetimeDuoXp: input.lifetimeDuoXp,
      ok: false,
      reason: "insufficient-boost-balance",
      spent: false
    };
  }

  return {
    balance: currentBalance - ROULETTE_BOOST_COST,
    cost: ROULETTE_BOOST_COST,
    lifetimeDuoXp: input.lifetimeDuoXp,
    ok: true,
    spent: true
  };
}

export function applyCooldownWeights<TWeight extends RouletteCooldownWeight>(input: {
  weights: TWeight[];
  cooldowns: RouletteCooldown[];
}): TWeight[] {
  const cooldownByGame = new Map(
    input.cooldowns
      .filter((cooldown) => cooldown.remainingRounds > 0)
      .map((cooldown) => [
        cooldown.libraryGameId,
        cooldown.multiplier ?? ROULETTE_COOLDOWN_MULTIPLIER
      ])
  );

  return input.weights.map((entry) => {
    const multiplier = cooldownByGame.get(entry.libraryGameId);

    if (!multiplier) {
      return { ...entry };
    }

    return {
      ...entry,
      weight: Math.max(1, entry.weight * multiplier)
    };
  });
}

export function getRoundResumePolicy(input: {
  activeRoundStatus?: RouletteRoundStatus | null;
  boostSpent?: boolean;
  persistedRoundId?: string | null;
}):
  | {
      ok: false;
      reason: "active-round-exists";
    }
  | {
      nextStatus: "failed" | "resumable";
      refundBoost: boolean;
      updateHistory: false;
      updatePity: false;
    } {
  if (
    input.activeRoundStatus
    && blockingRoundStatuses.has(input.activeRoundStatus)
  ) {
    return {
      ok: false,
      reason: "active-round-exists"
    };
  }

  if (input.persistedRoundId) {
    return {
      nextStatus: "resumable",
      refundBoost: false,
      updateHistory: false,
      updatePity: false
    };
  }

  return {
    nextStatus: "failed",
    refundBoost: Boolean(input.boostSpent),
    updateHistory: false,
    updatePity: false
  };
}

function normalizeRoll(roll: number | undefined, seed: string | undefined): number {
  if (Number.isFinite(roll)) {
    return Math.min(0.999999999, Math.max(0, roll as number));
  }

  return seedToUnitInterval(seed ?? "queue2-roulette");
}

function seedToUnitInterval(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967296;
}

function clampNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function clampPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(value as number));
}

function clampSlotIndex(value: number, slotCount: number): number {
  if (!Number.isFinite(value)) {
    return slotCount;
  }

  return Math.min(slotCount, Math.max(1, Math.trunc(value)));
}
