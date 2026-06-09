import "server-only";

import { getRouletteHistoryUseCase } from "./application/get-roulette-history";
import { getRouletteStateUseCase } from "./application/get-roulette-state";
import { replayRouletteRoundUseCase } from "./application/replay-roulette-round";
import { startRouletteRoundUseCase } from "./application/start-roulette-round";
import { rouletteRepository } from "./infrastructure/roulette-repository";

export {
  ROULETTE_BASE_WEIGHTS,
  ROULETTE_BOOSTED_WEIGHTS,
  ROULETTE_BOOST_BALANCE_CAP,
  ROULETTE_BOOST_COST,
  ROULETTE_COOLDOWN_MULTIPLIER,
  ROULETTE_COOLDOWN_ROUNDS,
  ROULETTE_ELIGIBLE_STATUSES,
  ROULETTE_MINIMUM_ELIGIBLE_GAMES,
  ROULETTE_PITY_THRESHOLD,
  ROULETTE_REEL_SLOT_COUNT,
  ROULETTE_RARITIES,
  ROULETTE_WEEKEND_BOOST_EARN_MULTIPLIER,
  applyBoostCostPolicy,
  applyCooldownWeights,
  applyPityTransition,
  buildVisualReel,
  calculateBoostEarnAmount,
  getEligiblePoolPolicy,
  getRoundResumePolicy,
  selectRouletteResult,
  type RouletteCooldown,
  type RouletteCooldownWeight,
  type RouletteEligiblePoolResult,
  type RouletteEligibleStatus,
  type RouletteGame,
  type RouletteLibraryStatus,
  type RouletteRarity,
  type RouletteRarityWeights,
  type RouletteRoundStatus,
  type RouletteSelectionResult,
  type RouletteVisualReelSlot
} from "./domain/roulette-policy";

export type {
  DiscardRouletteResult,
  GetRouletteStateResult,
  LockRouletteResultAsPrincipalInput,
  LockRouletteResultAsPrincipalResult,
  ReplayRouletteRoundResult,
  RouletteBoostBalanceRecord,
  RouletteBoostLedgerRecord,
  RouletteCatalogGameId,
  RouletteCooldownRecord,
  RouletteDuoId,
  RouletteEligibleGameRecord,
  RouletteHistoryEventRecord,
  RouletteLibraryGameId,
  RouletteMembershipContext,
  RoulettePersistedRoundStatus,
  RoulettePityStateRecord,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundEntryRecord,
  RouletteRoundId,
  RouletteRoundRecord,
  RouletteStateRecord,
  RouletteUserId,
  RouletteUuid,
  StartRouletteRoundInput,
  StartRouletteRoundResult
} from "./application/ports";

export {
  getRouletteHistoryUseCase,
  getRouletteStateUseCase,
  replayRouletteRoundUseCase,
  startRouletteRoundUseCase
};
export {
  ROULETTE_ROUTE_COPY,
  toRouletteRouteViewModel,
  type RouletteFirstViewportState,
  type RouletteHistoryItemViewModel,
  type RouletteReelSlotViewModel,
  type RouletteResultViewModel,
  type RouletteRouteViewModel
} from "./presentation/view-models";
export { RouletteAudioControl } from "./presentation/roulette-audio-control";
export { RouletteReel } from "./presentation/roulette-reel";
export { ResultPanel } from "./presentation/result-panel";
export { CompactHistory } from "./presentation/compact-history";

export function getRouletteState(input: {
  userId: string;
}) {
  return getRouletteStateUseCase(input, rouletteRepository);
}

export function startRouletteRound(input: {
  userId: string;
  idempotencyKey: string;
  useBoost: boolean;
  roll?: number;
  seed?: string;
  now?: Date;
}) {
  return startRouletteRoundUseCase(input, rouletteRepository);
}

export function replayRouletteRound(input: {
  userId: string;
  roundId: string;
}) {
  return replayRouletteRoundUseCase(input, rouletteRepository);
}

export function lockRouletteResultAsPrincipal(input: {
  userId: string;
  roundId: string;
  replacement?: {
    action: "pause" | "replace" | "cancel";
    libraryGameId?: string;
    nextStatus?: "wishlist" | "pausado";
  };
}) {
  return rouletteRepository.lockRouletteResultAsPrincipal(input);
}

export function discardRouletteResult(input: {
  userId: string;
  roundId: string;
}) {
  return rouletteRepository.discardRouletteResult(input);
}

export function getRouletteHistory(input: {
  userId: string;
  limit?: number;
}) {
  return getRouletteHistoryUseCase(input, rouletteRepository);
}
