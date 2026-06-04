import type {
  DiscoveryMoodQuizStatus,
  DiscoveryRepository,
  DiscoveryUserId
} from "./ports";

export async function getMoodQuizStatusUseCase(
  input: {
    userId: DiscoveryUserId;
  },
  repository: Pick<DiscoveryRepository, "getMoodQuizStatus">
): Promise<DiscoveryMoodQuizStatus> {
  return repository.getMoodQuizStatus(input);
}

export async function getMoodQuizStatus(input: {
  userId: DiscoveryUserId;
}): Promise<DiscoveryMoodQuizStatus> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");

  return getMoodQuizStatusUseCase(input, discoveryRepository);
}
