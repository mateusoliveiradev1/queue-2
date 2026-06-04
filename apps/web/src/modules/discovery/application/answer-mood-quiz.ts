import { getDiscoveryDeckUseCase } from "./get-discovery-deck";
import type {
  AnswerMoodQuizInput,
  AnswerMoodQuizResult,
  DiscoveryCatalogSearch,
  DiscoveryRepository
} from "./ports";

export async function answerMoodQuizUseCase(
  input: AnswerMoodQuizInput,
  repository: Pick<DiscoveryRepository, "answerMoodQuiz" | "getReadState">,
  catalogSearch: DiscoveryCatalogSearch
): Promise<AnswerMoodQuizResult> {
  const state = await repository.answerMoodQuiz(input);

  if (state.mood.kind === "empty") {
    return {
      mood: state.mood,
      recommendations: [],
      cards: []
    };
  }

  const deck = await getDiscoveryDeckUseCase(
    {
      userId: input.userId,
      limit: 5,
      filters: {
        sourceMode: "quiz",
        recommendation: {
          mood: state.mood.mood
        }
      }
    },
    repository,
    catalogSearch
  );

  return {
    mood: state.mood,
    recommendations: deck.recommendations,
    cards: deck.cards
  };
}

export async function answerMoodQuiz(
  input: AnswerMoodQuizInput
): Promise<AnswerMoodQuizResult> {
  const [{ discoveryRepository }, { searchCatalogGames }] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../../catalog")
  ]);

  return answerMoodQuizUseCase(input, discoveryRepository, searchCatalogGames);
}
