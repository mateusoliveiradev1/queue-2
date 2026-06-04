import Image from "next/image";

import { LibraryStatusControls } from "../../library";
import type { DiscoveryMatchHistoryItem } from "../application/ports";

type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;

export function MatchHistory({
  action,
  items,
  returnTo
}: {
  action: DiscoveryHandoffAction;
  items: DiscoveryMatchHistoryItem[];
  returnTo: string;
}) {
  return (
    <section className="match-history discovery-orbit-tray" aria-labelledby="match-history-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="match-history-title">
          Matches recentes
        </h2>
        <p className="support-copy">
          Historico curto para retomar jogos aprovados pelos dois, focado
          somente em status atual e proximo passo.
        </p>
      </div>
      {items.length > 0 ? (
        <div className="match-history-grid">
          {items.map((item) => (
            <article className="match-history-card" key={item.match.id}>
              <a className="match-history-cover queue2-focusable" href={`/app/jogo/${item.slug}`}>
                {item.coverUrl ? (
                  <Image
                    alt={`Capa de ${item.title}`}
                    height={360}
                    sizes="(max-width: 820px) 34vw, 160px"
                    src={item.coverUrl}
                    width={270}
                  />
                ) : (
                  <span aria-hidden="true">/2</span>
                )}
              </a>
              <div className="match-history-body">
                <div>
                  <p className="eyebrow">Match em {formatMatchDate(item.match.matchedAt)}</p>
                  <h3>{item.title}</h3>
                </div>
                {item.reasons.length > 0 ? (
                  <div className="tag-row" aria-label={`Motivos de ${item.title}`}>
                    {item.reasons.slice(0, 4).map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                ) : (
                  <p className="support-copy">Motivos do match foram salvos sem detalhes extras.</p>
                )}
                <p className="match-history-status" role="status">
                  {item.libraryStatus
                    ? `Status atual: ${formatLibraryStatus(item.libraryStatus)}`
                    : "Ainda fora da biblioteca"}
                </p>
                <LibraryStatusControls
                  action={action}
                  catalogGameId={item.match.catalogGameId}
                  currentStatus={item.libraryStatus ?? ""}
                  returnTo={returnTo}
                />
                <div className="match-history-links">
                  <a className="text-link" href={`/app/jogo/${item.slug}`}>
                    Abrir detalhe
                  </a>
                  <a className="text-link" href="/app/biblioteca">
                    Ver biblioteca
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Nenhum match registrado ainda</strong>
          <span>
            Quando ambos escolherem Quero jogar, o match aparece aqui antes de
            qualquer envio para a biblioteca.
          </span>
        </div>
      )}
    </section>
  );
}

function formatMatchDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  }).format(date);
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
