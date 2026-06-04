import { MOOD_QUIZ_QUESTIONS } from "../domain/mood-quiz";

type MoodQuizAction = (formData: FormData) => Promise<void>;

const answerOptions = {
  energy: [
    { label: "Baixa", value: "low" },
    { label: "Media", value: "medium" },
    { label: "Alta", value: "high" }
  ],
  commitment: [
    { label: "Curto", value: "short" },
    { label: "Constante", value: "steady" },
    { label: "Epico", value: "epic" }
  ],
  vibe: [
    { label: "Rir", value: "laugh" },
    { label: "Pensar", value: "think" },
    { label: "Focar", value: "focus" },
    { label: "Flexivel", value: "flexible" }
  ]
} as const;

export function MoodQuiz({
  action,
  resultState,
  returnTo
}: {
  action: MoodQuizAction;
  resultState: string | null;
  returnTo: string;
}) {
  return (
    <section className="mood-quiz" id="mood-quiz" aria-labelledby="mood-quiz-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="mood-quiz-title">
          Quiz
        </h2>
        <p className="support-copy">
          Tres respostas sobre energia, compromisso e vibe. Uma pessoa gera
          preview; as duas juntas liberam resultado da dupla.
        </p>
      </div>
      <form action={action} className="mood-quiz-form">
        {MOOD_QUIZ_QUESTIONS.map((question) => (
          <fieldset className="mood-question" key={question.key}>
            <legend>{question.prompt}</legend>
            <div className="segmented-control">
              {answerOptions[question.key].map((answer) => (
                <label key={answer.value}>
                  <input
                    defaultChecked={
                      question.key === "energy"
                        ? answer.value === "medium"
                        : question.key === "commitment"
                          ? answer.value === "steady"
                          : answer.value === "flexible"
                    }
                    name={question.key}
                    type="radio"
                    value={answer.value}
                  />
                  <span>{answer.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="queue2-button" data-tone="primary" type="submit">
          Salvar mood
        </button>
      </form>
      <p className="mood-quiz-state" role="status">
        {formatMoodState(resultState)}
      </p>
    </section>
  );
}

function formatMoodState(resultState: string | null): string {
  if (resultState === "quiz-completo") {
    return "Resultado completo da dupla aplicado ao deck.";
  }

  if (resultState === "quiz-preview") {
    return "Preview salvo. Falta a outra pessoa responder para virar resultado da dupla.";
  }

  return "Sem resposta nesta rodada. O primeiro envio gera apenas preview.";
}
