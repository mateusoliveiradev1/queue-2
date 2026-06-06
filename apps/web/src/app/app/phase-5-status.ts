import "server-only";

import type { RewardToastViewModel } from "../../modules/gamification";
import {
  verifyRewardToken,
  type RewardTokenSubject
} from "./phase-5-reward-token";

export function getPhase5RewardStatus(
  value: string | null,
  subject: RewardTokenSubject
): RewardToastViewModel | null {
  return verifyRewardToken(value, subject);
}
