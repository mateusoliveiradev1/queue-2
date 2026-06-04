import type {
  DiscoveryRepository,
  StartLiveSessionInput,
  StartLiveSessionResult
} from "./ports";

export async function startLiveSessionUseCase(
  input: StartLiveSessionInput,
  repository: Pick<DiscoveryRepository, "startLiveSession">
): Promise<StartLiveSessionResult> {
  return repository.startLiveSession(input);
}

export async function startLiveSession(
  input: StartLiveSessionInput
): Promise<StartLiveSessionResult> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");
  return startLiveSessionUseCase(input, discoveryRepository);
}
