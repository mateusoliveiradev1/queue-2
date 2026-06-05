"use client";

import { useRef, useState, type FormEvent } from "react";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";
import { MOOD_QUIZ_QUESTIONS } from "../domain/mood-quiz";

type MoodQuizAction = (formData: FormData) => Promise<void>;
type EnhancedMoodQuizAction = (
  formData: FormData
) => Promise<{ ok: boolean; state?: string; redirectTo?: string }>;

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
  enhancedAction,
  resultState,
  returnTo
}: {
  action: MoodQuizAction;
  enhancedAction?: EnhancedMoodQuizAction;
  resultState: string | null;
  returnTo: string;
}) {
  const pendingRef = useRef(false);
  const [feedbackState, setFeedbackState] = useState<ActionFeedbackState>("idle");
  const [serverState, setServerState] = useState<string | null>(resultState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhancedAction) {
      return;
    }

    event.preventDefault();

    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setFeedbackState((current) => (current === "failed" ? "retrying" : "syncing"));

    try {
      const result = await enhancedAction(new FormData(event.currentTarget));

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setServerState(result.state ?? null);
      setFeedbackState(result.ok ? "confirmed" : "failed");
    } catch {
      setFeedbackState("failed");
    } finally {
      pendingRef.current = false;
    }
  }

  return (
    <section
      className="mood-quiz discovery-orbit-tray"
      id="mood-quiz"
      aria-labelledby="mood-quiz-title"
    >
      <div className="section-heading">
        <h2 className="eyebrow" id="mood-quiz-title">
          Quiz
        </h2>
        <p className="support-copy">
          Tres respostas sobre energia, compromisso e vibe. Uma pessoa gera
          preview; as duas juntas liberam resultado da dupla.
        </p>
      </div>
      <form action={action} className="mood-quiz-form" onSubmit={handleSubmit}>
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
        <div className="mood-quiz-submit action-feedback-form">
          <ActionFeedbackButton
            labels={{
              idle: "Salvar mood",
              syncing: "Salvando mood",
              confirmed: "Mood confirmado",
              failed: "Tentar de novo",
              retrying: "Tentando de novo"
            }}
            state={feedbackState}
          />
          <ActionFeedback
            copy={{
              syncing: "Mood salvo aqui, sincronizando...",
              confirmed: formatMoodState(serverState),
              failed: "Nao deu para salvar o mood. Tente de novo.",
              retrying: "Tentando salvar o mood de novo..."
            }}
            state={feedbackState}
          />
        </div>
      </form>
      <p className="mood-quiz-state" role="status">
        {formatMoodState(serverState)}
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
