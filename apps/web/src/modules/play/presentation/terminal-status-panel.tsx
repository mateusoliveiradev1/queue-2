import type { GamePlayDetailRecord } from "../application/ports";

type PlayJourneyAction = (formData: FormData) => void | Promise<void>;

export function TerminalStatusPanel({
  cancelAction,
  catalogGameId,
  confirmAction,
  gameSlug,
  playDetail,
  requestAction
}: {
  cancelAction: PlayJourneyAction;
  catalogGameId: string;
  confirmAction: PlayJourneyAction;
  gameSlug: string;
  playDetail: GamePlayDetailRecord | null;
  requestAction: PlayJourneyAction;
}) {
  const request = playDetail?.terminalRequest ?? null;

  return (
    <section className="surface-band app-section play-panel" aria-labelledby="terminal-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="terminal-title">
          Zerado ou Dropado
        </h2>
        <p className="support-copy">
          Confirmar com a dupla antes de tirar o jogo da fila operacional.
        </p>
      </div>
      {request ? (
        <div className="terminal-request-card">
          <div>
            <strong>Pedido pendente: {request.targetStatus === "zerado" ? "Zerado" : "Dropado"}</strong>
            <span className="muted">O solicitante nao pode confirmar sozinho.</span>
          </div>
          <div className="form-actions">
            <form action={confirmAction}>
              <input name="requestId" type="hidden" value={request.id} />
              <input name="gameSlug" type="hidden" value={gameSlug} />
              <button className="queue2-button" data-tone="primary" type="submit">
                Confirmar com a dupla
              </button>
            </form>
            <form action={cancelAction}>
              <input name="requestId" type="hidden" value={request.id} />
              <input name="gameSlug" type="hidden" value={gameSlug} />
              <button className="queue2-button" data-tone="quiet" type="submit">
                Cancelar pedido
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="terminal-actions">
          <TerminalRequestButton
            action={requestAction}
            catalogGameId={catalogGameId}
            gameSlug={gameSlug}
            label="Pedir Zerado"
            targetStatus="zerado"
          />
          <TerminalRequestButton
            action={requestAction}
            catalogGameId={catalogGameId}
            gameSlug={gameSlug}
            label="Pedir Dropado"
            targetStatus="dropado"
          />
        </div>
      )}
    </section>
  );
}

function TerminalRequestButton({
  action,
  catalogGameId,
  gameSlug,
  label,
  targetStatus
}: {
  action: PlayJourneyAction;
  catalogGameId: string;
  gameSlug: string;
  label: string;
  targetStatus: "zerado" | "dropado";
}) {
  return (
    <form action={action}>
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="targetStatus" type="hidden" value={targetStatus} />
      <input name="gameSlug" type="hidden" value={gameSlug} />
      <button className="queue2-button" data-tone="quiet" type="submit">
        {label}
      </button>
    </form>
  );
}
