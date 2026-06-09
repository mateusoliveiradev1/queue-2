import { ActionFeedbackButton } from "../../../components/action-feedback";
import type { RouletteResultViewModel } from "./view-models";

type ResultPanelAction = (formData: FormData) => Promise<void>;

export function ResultPanel({
  discardAction,
  lockAction,
  replayAction,
  result,
  roundId
}: {
  discardAction?: ResultPanelAction;
  lockAction?: ResultPanelAction;
  replayAction?: ResultPanelAction;
  result: RouletteResultViewModel | null;
  roundId: string | null;
}) {
  if (!result || !roundId) {
    return null;
  }

  const isLegendary = result.rarity === "legendary";

  return (
    <section
      aria-labelledby="roulette-result-title"
      className="roulette-result-panel"
      data-rarity={result.rarity}
      tabIndex={-1}
    >
      <div className="roulette-result-cover" data-rarity={result.rarity}>
        {result.coverUrl ? (
          <img alt={`Capa de ${result.title}`} src={result.coverUrl} />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
        {isLegendary ? (
          <>
            <span className="roulette-legendary-particles" aria-hidden="true" />
            <span className="roulette-static-legendary-seal" aria-label="static seal fallback">
              Legendary
            </span>
          </>
        ) : null}
      </div>
      <div className="roulette-result-copy">
        <p className="roulette-result-status">{result.persistedStatusLabel}</p>
        <span
          aria-label={`${rarityLabels[result.rarity]} rarity seal`}
          className="roulette-rarity-seal"
          data-rarity={result.rarity}
        >
          {rarityLabels[result.rarity]}
        </span>
        <h2 id="roulette-result-title">{result.title}</h2>
        <p>A fila apontou para este. Voces travam como Principal?</p>
        <small>Replay nao e novo sorteio.</small>
        <div className="roulette-result-actions">
          <ActionSlot action={lockAction} label="Travar como Principal" roundId={roundId} tone="primary" />
          <ActionSlot
            action={discardAction}
            describedBy="roulette-discard-confirmation"
            label="Descartar este resultado"
            roundId={roundId}
            tone="quiet"
          />
          <ActionSlot action={replayAction} label="Rever giro salvo" roundId={roundId} tone="quiet" />
        </div>
        <small id="roulette-discard-confirmation">
          Descartar este resultado? O jogo continua na fila e o boost de uma rodada ja revelada nao volta.
        </small>
      </div>
    </section>
  );
}

function ActionSlot({
  action,
  describedBy,
  label,
  roundId,
  tone
}: {
  action?: ResultPanelAction;
  describedBy?: string;
  label: string;
  roundId: string;
  tone: "primary" | "quiet";
}) {
  if (action) {
    return (
      <form action={action} className="action-feedback-form">
        <input name="roundId" type="hidden" value={roundId} />
        <ActionFeedbackButton
          aria-describedby={describedBy}
          labels={{
            confirmed: "Confirmado",
            failed: "Tentar de novo",
            idle: label,
            retrying: "Tentando de novo",
            syncing: "Sincronizando"
          }}
          state="idle"
          tone={tone}
        />
      </form>
    );
  }

  return (
    <button className="queue2-button" data-tone={tone} type="button">
      {label}
    </button>
  );
}

const rarityLabels = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary"
} as const;
