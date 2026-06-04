import type {
  DiscoveryLiveSessionPayload,
  DiscoveryRepository,
  GetLiveSessionInput
} from "./ports";

export async function getLiveSessionUseCase(
  input: GetLiveSessionInput,
  repository: Pick<DiscoveryRepository, "getLiveSession">
): Promise<DiscoveryLiveSessionPayload> {
  return repository.getLiveSession(input);
}

export async function getLiveSession(
  input: GetLiveSessionInput
): Promise<DiscoveryLiveSessionPayload> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");
  return getLiveSessionUseCase(input, discoveryRepository);
}
