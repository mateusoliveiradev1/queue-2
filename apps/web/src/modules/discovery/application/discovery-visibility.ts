import { shouldExcludeFromCurrentDeck } from "../domain/discovery-policy";
import type { DiscoveryGameReadState } from "./ports";

export function shouldShowInDiscoveryCycle(
  state: DiscoveryGameReadState | null,
  options: { includeAlreadySeen?: boolean } = {}
): boolean {
  if (options.includeAlreadySeen) {
    return true;
  }

  if (state?.libraryStatus === "zerado" || state?.libraryStatus === "dropado") {
    return false;
  }

  if (!state?.currentMemberDecision) {
    return true;
  }

  return !shouldExcludeFromCurrentDeck({
    decision: state.currentMemberDecision.decision,
    cooldownUntil: state.currentMemberDecision.cooldownUntil
  });
}
