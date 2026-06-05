import type { CatalogDetailFactView } from "../../catalog";
import type { GamePlayDetailRecord } from "../application/ports";

type PlayJourneyAction = (formData: FormData) => void | Promise<void>;

export function ProgressPanel({
  action,
  catalogGameId,
  gameSlug,
  playDetail,
  timeEstimate
}: {
  action: PlayJourneyAction;
  catalogGameId: string;
  gameSlug: string;
  playDetail: GamePlayDetailRecord | null;
  timeEstimate: CatalogDetailFactView;
}) {
  const progress = playDetail?.progress;

  return (
    <section className="surface-band app-section play-panel" aria-labelledby="progress-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="progress-title">
          Tempo coop
        </h2>
        <p className="support-copy">
          Tempo confirmado, capitulos manuais e percentual subjetivo sao camadas independentes.
        </p>
      </div>
      <div className="progress-layer-grid">
        <div className="progress-layer">
          <span>Tempo confirmado</span>
          <strong>{formatDuration(progress?.confirmedCoopSeconds ?? 0)}</strong>
        </div>
        <div className="progress-layer">
          <span>Tempo estimado</span>
          <strong>{timeEstimate.label}</strong>
          <small>
            {timeEstimate.kind === "available"
              ? `${timeEstimate.sourceLabel} / ${timeEstimate.freshnessLabel}`
              : "Sem estimativa confiavel para comparar."}
          </small>
        </div>
        <form action={action} className="progress-layer progress-percent-form">
          <input name="catalogGameId" type="hidden" value={catalogGameId} />
          <input name="gameSlug" type="hidden" value={gameSlug} />
          <label>
            <span>Percentual combinado</span>
            <input
              defaultValue={progress?.subjectivePercent ?? ""}
              inputMode="numeric"
              max={100}
              min={0}
              name="subjectivePercent"
              placeholder="0-100"
              type="number"
            />
          </label>
          <button className="queue2-button" data-tone="quiet" type="submit">
            Atualizar
          </button>
        </form>
      </div>
    </section>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}min confirmados` : `${hours}h confirmadas`;
  }

  return `${minutes}min confirmados`;
}
