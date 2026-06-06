import type {
  GamePlayDetailRecord,
  PlaySessionDetailRecord,
  PlaySessionRecord
} from "../application/ports";

type PlayJourneyAction = (formData: FormData) => void | Promise<void>;

export function LiveSessionPanel({
  catalogGameId,
  confirmAction,
  detail,
  endAction,
  gameSlug,
  startAction,
  viewerUserId
}: {
  catalogGameId: string;
  confirmAction: PlayJourneyAction;
  detail: GamePlayDetailRecord | null;
  endAction: PlayJourneyAction;
  gameSlug: string;
  startAction: PlayJourneyAction;
  viewerUserId: string;
}) {
  const active = detail?.activeLiveSession ?? null;
  const pending = detail?.pendingSessions ?? [];
  const hasPending = pending.length > 0;

  return (
    <section className="surface-band app-section play-panel" aria-labelledby="live-session-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="live-session-title">
          Sessao ao vivo
        </h2>
        <p className="support-copy">
          O relogio usa o horario salvo no servidor. Progresso final so entra depois da dupla confirmar.
        </p>
      </div>
      {active ? (
        <ActiveLiveSession
          endAction={endAction}
          gameSlug={gameSlug}
          session={active}
        />
      ) : hasPending ? (
        <div className="play-session-blocked">
          <strong>Confirmacao pendente</strong>
          <span className="muted">
            A proxima sessao fica bloqueada ate a dupla resolver o registro aberto.
          </span>
        </div>
      ) : (
        <form action={startAction} className="play-inline-form">
          <input name="catalogGameId" type="hidden" value={catalogGameId} />
          <input name="gameSlug" type="hidden" value={gameSlug} />
          <button className="queue2-button" data-tone="primary" type="submit">
            Iniciar sessao
          </button>
        </form>
      )}
      {pending.length ? (
        <div className="play-pending-list">
          <h3>Confirmacoes pendentes</h3>
          {pending.map((session) => (
            <PendingSession
              confirmAction={confirmAction}
              gameSlug={gameSlug}
              key={session.id}
              session={session}
              viewerUserId={viewerUserId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ActiveLiveSession({
  endAction,
  gameSlug,
  session
}: {
  endAction: PlayJourneyAction;
  gameSlug: string;
  session: PlaySessionRecord;
}) {
  return (
    <div className="live-session-card">
      <div>
        <strong>Ao vivo desde {formatDateTime(session.startedAt)}</strong>
        <span className="muted">
          {formatElapsed(session.startedAt, new Date())} acumulados nesta visualizacao.
        </span>
      </div>
      <form action={endAction}>
        <input name="sessionId" type="hidden" value={session.id} />
        <input name="gameSlug" type="hidden" value={gameSlug} />
        <button className="queue2-button" data-tone="primary" type="submit">
          Encerrar e pedir confirmacao
        </button>
      </form>
    </div>
  );
}

function PendingSession({
  confirmAction,
  gameSlug,
  session,
  viewerUserId
}: {
  confirmAction: PlayJourneyAction;
  gameSlug: string;
  session: PlaySessionDetailRecord;
  viewerUserId: string;
}) {
  const alreadyConfirmed = session.confirmedByUserIds.includes(viewerUserId);

  return (
    <article className="play-pending-card">
      <div>
        <strong>{session.kind === "live" ? "Sessao ao vivo" : "Jogamos Hoje"}</strong>
        <span className="muted">
          {formatDuration(session.durationSeconds ?? 0)} aguardando {session.pendingUserIds.length} confirmacao.
        </span>
      </div>
      {alreadyConfirmed ? (
        <span className="session-confirmed-pill">Sua confirmacao entrou</span>
      ) : (
        <form action={confirmAction}>
          <input name="sessionId" type="hidden" value={session.id} />
          <input name="gameSlug" type="hidden" value={gameSlug} />
          <button className="queue2-button" data-tone="quiet" type="submit">
            Confirmar sessao
          </button>
        </form>
      )}
    </article>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatElapsed(startedAt: Date, now: Date): string {
  return formatDuration(Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000)));
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
  }

  return `${minutes}min`;
}
