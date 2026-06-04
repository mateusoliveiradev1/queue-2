import Image from "next/image";

import type {
  DiscoveryMatchHistoryItem
} from "../application/ports";
import type { DiscoveryLibraryHandoffStatus } from "../domain/discovery-policy";

type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;

const handoffLabels: Record<DiscoveryLibraryHandoffStatus, string> = {
  wishlist: "Wishlist",
  jogando: "Jogando",
  pausado: "Pausado"
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
      role="status"
      aria-live="polite"
      aria-labelledby="match-celebration-title"
    >
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
        <p className="eyebrow">Match da dupla</p>
        <h2 id="match-celebration-title">{match.title}</h2>
        <p className="support-copy">
          Os dois escolheram Quero jogar. Primeiro o match; depois voces decidem
          se ele entra na Wishlist, em Jogando ou fica Pausado.
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
        <div className="form-actions">
          {handoffStatuses.map((status) => (
            <form action={handoffAction} key={status}>
              <input name="catalogGameId" type="hidden" value={match.match.catalogGameId} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="status" type="hidden" value={status} />
              <button className="queue2-button" data-tone="primary" type="submit">
                {match.libraryStatus ? `Mover para ${handoffLabels[status]}` : `Enviar para ${handoffLabels[status]}`}
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
