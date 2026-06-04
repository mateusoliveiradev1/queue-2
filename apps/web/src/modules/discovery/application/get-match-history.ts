import type {
  DiscoveryMatchHistoryItem,
  DiscoveryRepository,
  GetMatchHistoryInput
} from "./ports";

export async function getMatchHistoryUseCase(
  input: GetMatchHistoryInput,
  repository: Pick<DiscoveryRepository, "getMatchHistory">
): Promise<DiscoveryMatchHistoryItem[]> {
  return repository.getMatchHistory({
    userId: input.userId,
    limit: clampLimit(input.limit)
  });
}

export async function getMatchHistory(
  input: GetMatchHistoryInput
): Promise<DiscoveryMatchHistoryItem[]> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");
  return getMatchHistoryUseCase(input, discoveryRepository);
}

function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) {
    return 12;
  }

  return Math.min(24, Math.max(1, Math.floor(limit)));
}
