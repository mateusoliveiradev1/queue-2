import type {
  GamePlayDetailRecord,
  PlayScheduledSessionRecord
} from "../application/ports";

type PlayJourneyAction = (formData: FormData) => void | Promise<void>;

export function ScheduleSessionForm({
  cancelAction,
  catalogGameId,
  confirmAction,
  gameSlug,
  playDetail,
  scheduleAction
}: {
  cancelAction: PlayJourneyAction;
  catalogGameId: string;
  confirmAction: PlayJourneyAction;
  gameSlug: string;
  playDetail: GamePlayDetailRecord | null;
  scheduleAction: PlayJourneyAction;
}) {
  const scheduledSessions = playDetail?.scheduledSessions ?? [];
  const timezone = playDetail?.duoTimezone ?? scheduledSessions[0]?.timezone ?? "UTC";

  return (
    <section className="surface-band app-section play-panel" aria-labelledby="schedule-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="schedule-title">
          Proxima sessao
        </h2>
        <p className="support-copy">
          Horarios seguem o fuso da dupla. O lembrete fica preparado para 30 minutos antes.
        </p>
      </div>
      <form action={scheduleAction} className="schedule-session-form">
        <input name="catalogGameId" type="hidden" value={catalogGameId} />
        <input name="gameSlug" type="hidden" value={gameSlug} />
        <label>
          <span>Data e horario da dupla</span>
          <input name="scheduledLocalDateTime" required type="datetime-local" />
        </label>
        <span className="muted">Fuso atual: {timezone}</span>
        <button className="queue2-button" data-tone="primary" type="submit">
          Agendar sessao
        </button>
      </form>
      {scheduledSessions.length ? (
        <div className="play-pending-list">
          <h3>Sessoes combinadas</h3>
          {scheduledSessions.map((session) => (
            <ScheduledSessionCard
              cancelAction={cancelAction}
              confirmAction={confirmAction}
              gameSlug={gameSlug}
              key={session.id}
              session={session}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">
          Nenhuma sessao futura. Combinem um horario quando o Principal estiver decidido.
        </p>
      )}
    </section>
  );
}

function ScheduledSessionCard({
  cancelAction,
  confirmAction,
  gameSlug,
  session
}: {
  cancelAction: PlayJourneyAction;
  confirmAction: PlayJourneyAction;
  gameSlug: string;
  session: PlayScheduledSessionRecord;
}) {
  return (
    <article className="play-pending-card schedule-session-card">
      <div>
        <strong>{formatDateTime(session.scheduledStartAt, session.timezone)}</strong>
        <span className="muted">
          {session.confirmationCount}/{session.requiredConfirmationCount} presencas confirmadas.
        </span>
        <span className="muted">
          Lembrete preparado para {formatDateTime(session.reminderDueAt, session.timezone)}.
        </span>
      </div>
      <div className="form-actions">
        <form action={confirmAction}>
          <input name="scheduledSessionId" type="hidden" value={session.id} />
          <input name="gameSlug" type="hidden" value={gameSlug} />
          <button className="queue2-button" data-tone="quiet" type="submit">
            Confirmar presenca
          </button>
        </form>
        <form action={cancelAction}>
          <input name="scheduledSessionId" type="hidden" value={session.id} />
          <input name="gameSlug" type="hidden" value={gameSlug} />
          <button className="text-button" type="submit">
            Cancelar
          </button>
        </form>
      </div>
    </article>
  );
}

function formatDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone
  }).format(date);
}
