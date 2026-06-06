import "server-only";

export {
  applyGamificationFactToTransaction
} from "./application/apply-gamification-fact";
export {
  createGamificationTransaction
} from "./infrastructure/gamification-repository";

export type {
  GamificationApplyFactResult,
  GamificationFactInput,
  GamificationRewardSummary,
  GamificationXpLedgerRecord
} from "./application/ports";
