import Image from "next/image";

import type {
  DiscoveryMatchHistoryItem
} from "../application/ports";
import type { DiscoveryLibraryHandoffStatus } from "../domain/discovery-policy";

type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;

const handoffLabels: Record<DiscoveryLibraryHandoffStatus, string> = {
  wishlist: "Mandar para Wishlist",
  jogando: "Comecar em Jogando",
  pausado: "Guardar em Pausado"
};

const handoffStatuses: DiscoveryLibraryHandoffStatus[] = [
  "wishlist",
  "jogando",
  "pausado"
];

export function MatchCelebration({
  handoffAction,
  match,
  returnTo
}: {
  handoffAction: DiscoveryHandoffAction;
  match: DiscoveryMatchHistoryItem | null;
  returnTo: string;
}) {
  if (!match) {
    return null;
  }

  return (
    <section
      className="match-celebration"
      data-match-animation="entry"
      role="status"
      aria-live="polite"
      aria-labelledby="match-celebration-title"
    >
      <div className="match-celebration-burst" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="match-celebration-cover">
        {match.coverUrl ? (
          <Image
            alt={`Capa de ${match.title}`}
            height={360}
            sizes="(max-width: 820px) 88vw, 220px"
            src={match.coverUrl}
            width={270}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </div>
      <div className="match-celebration-copy">
        <div className="match-celebration-mark">
          <span aria-hidden="true">/2</span>
          <span className="match-pointer-mark" aria-hidden="true">
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <path d="M4 5l11 7L4 19V5Z" fill="currentColor" />
              <path d="M15 8l4 4-4 4-4-4 4-4Z" fill="currentColor" opacity="0.72" />
            </svg>
          </span>
        </div>
        <p className="eyebrow">Match da dupla</p>
        <h2 id="match-celebration-title">Os dois quiseram</h2>
        <h3>{match.title}</h3>
        <p className="support-copy">
          Entrou no radar da dupla. Escolham para onde esse jogo vai agora.
        </p>
        {match.reasons.length > 0 ? (
          <div className="tag-row" aria-label="Motivos do match">
            {match.reasons.slice(0, 4).map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        ) : null}
        {match.libraryStatus ? (
          <p className="discovery-library-state" role="status">
            Ja na biblioteca: {formatLibraryStatus(match.libraryStatus)}
          </p>
        ) : null}
        <div className="form-actions match-celebration-actions">
          {handoffStatuses.map((status) => (
            <form action={handoffAction} key={status}>
              <input name="catalogGameId" type="hidden" value={match.match.catalogGameId} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="status" type="hidden" value={status} />
              <button className="queue2-button" data-tone="primary" type="submit">
                {handoffLabels[status]}
              </button>
            </form>
          ))}
          <button aria-disabled="true" className="queue2-button" data-tone="quiet" disabled type="button">
            Zerado bloqueado
          </button>
          <button aria-disabled="true" className="queue2-button" data-tone="quiet" disabled type="button">
            Dropado bloqueado
          </button>
          <a className="queue2-button" data-tone="quiet" href={`/app/jogo/${match.slug}`}>
            Abrir detalhe
          </a>
          <a className="text-link" href="/app/biblioteca">
            Ver biblioteca
          </a>
        </div>
      </div>
    </section>
  );
}

function formatLibraryStatus(status: string): string {
  switch (status) {
    case "wishlist":
      return "Wishlist";
    case "jogando":
      return "Jogando";
    case "pausado":
      return "Pausado";
    case "zerado":
      return "Zerado";
    case "dropado":
      return "Dropado";
    default:
      return status;
  }
}
