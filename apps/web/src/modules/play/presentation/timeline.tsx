import type {
  GameTimelineRecord,
  PlayTimelineEvent
} from "../application/ports";
import { MilestoneBadge } from "./milestone-badge";
import {
  MomentoForm,
  type MomentoSessionOption
} from "./momento-form";
import { SpoilerReveal } from "./spoiler-reveal";

type PlayTimelineAction = (formData: FormData) => void | Promise<void>;

export function Timeline({
  catalogGameId,
  createMomentoAction,
  gameSlug,
  revealSpoilerAction,
  timeline
}: {
  catalogGameId: string;
  createMomentoAction: PlayTimelineAction;
  gameSlug: string;
  revealSpoilerAction: PlayTimelineAction;
  timeline: GameTimelineRecord | null;
}) {
  const events = timeline?.events ?? [];
  const sessionOptions = getMomentoSessionOptions(events);

  return (
    <section className="surface-band app-section play-panel" aria-labelledby="timeline-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="timeline-title">
          Linha do tempo
        </h2>
        <p className="support-copy">
          Sessoes confirmadas, capitulos, marcos e Momentos do jogo atual.
        </p>
      </div>
      <MomentoForm
        action={createMomentoAction}
        catalogGameId={catalogGameId}
        gameSlug={gameSlug}
        sessionOptions={sessionOptions}
      />
      {events.length ? (
        <ol className="timeline-list">
          {events.map((event) => (
            <li className="timeline-entry" data-type={event.type} key={event.id}>
              <span className="timeline-date">{formatDate(event.occurredAt)}</span>
              <TimelineEventBody
                event={event}
                gameSlug={gameSlug}
                revealSpoilerAction={revealSpoilerAction}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">
          Nenhum evento confirmado ainda. Iniciem uma sessao ou registrem o primeiro Momento.
        </p>
      )}
    </section>
  );
}

function getMomentoSessionOptions(events: PlayTimelineEvent[]): MomentoSessionOption[] {
  return events.flatMap((event) => {
    if (event.type !== "session") {
      return [];
    }

    const kind =
      event.session.kind === "live"
        ? "Sessao ao vivo"
        : "Jogamos Hoje";

    return [
      {
        id: event.session.id,
        label: `${formatDate(event.occurredAt)} - ${kind} (${formatDuration(
          event.session.durationSeconds ?? 0
        )})`
      }
    ];
  });
}

function TimelineEventBody({
  event,
  gameSlug,
  revealSpoilerAction
}: {
  event: PlayTimelineEvent;
  gameSlug: string;
  revealSpoilerAction: PlayTimelineAction;
}) {
  switch (event.type) {
    case "session":
      return (
        <article>
          <strong>{event.session.kind === "live" ? "Sessao ao vivo confirmada" : "Jogamos Hoje confirmado"}</strong>
          <span className="muted">{formatDuration(event.session.durationSeconds ?? 0)}</span>
        </article>
      );
    case "chapter":
      return (
        <article>
          <strong>Capitulo concluido</strong>
          <span className="muted">{event.chapter.title}</span>
        </article>
      );
    case "milestone":
      return (
        <article>
          <MilestoneBadge milestone={event.milestone} />
          <span className="muted">{event.milestone.description}</span>
        </article>
      );
    case "momento":
      return (
        <article>
          <strong>Momento da dupla</strong>
          <SpoilerReveal
            action={revealSpoilerAction}
            gameSlug={gameSlug}
            momento={event.momento}
          />
        </article>
      );
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
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
