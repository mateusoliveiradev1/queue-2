"use client";

import Image from "next/image";
import type { RefObject } from "react";

import type { DiscoveryDeckCard } from "../application/ports";
import type { DiscoveryLibraryHandoffStatus } from "../domain/discovery-policy";
import { DiscoverySourceMetadata } from "./discovery-source-metadata";

type DiscoveryDecisionAction = (formData: FormData) => Promise<void>;
type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;

const libraryStatusLabels: Record<string, string> = {
  wishlist: "Wishlist",
  jogando: "Jogando",
  pausado: "Pausado",
  zerado: "Zerado",
  dropado: "Dropado"
};

const handoffLabels: Record<DiscoveryLibraryHandoffStatus, string> = {
  wishlist: "Wishlist",
  jogando: "Jogando",
  pausado: "Pausado"
};

export function DiscoveryCard({
  card,
  decisionAction,
  formRefs,
  handoffAction,
  priority = false,
  reaction,
  returnTo
}: {
  card: DiscoveryDeckCard;
  decisionAction: DiscoveryDecisionAction;
  formRefs?: Partial<Record<"want" | "not_now" | "skip", RefObject<HTMLFormElement | null>>>;
  handoffAction: DiscoveryHandoffAction;
  priority?: boolean;
  reaction: "want" | "not_now" | "skip" | null;
  returnTo: string;
}) {
  return (
    <article className="discovery-card" data-reaction={reaction ?? "idle"}>
      <a className="discovery-card-cover queue2-focusable" href={`/app/jogo/${card.slug}`}>
        {card.coverUrl ? (
          <Image
            alt={`Capa de ${card.title}`}
            height={760}
            priority={priority}
            sizes="(max-width: 820px) 92vw, 36vw"
            src={card.coverUrl}
            width={570}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </a>

      <div className="discovery-card-body">
        <div className="discovery-card-heading">
          <p className="eyebrow">Carta do deck</p>
          <h2>{card.title}</h2>
          <p className="support-copy">
            {[card.releaseLabel, ...card.genreLabels.slice(0, 2)]
              .filter(Boolean)
              .join(" / ") || "Dados de genero em sincronizacao"}
          </p>
        </div>

        <div className="tag-row" aria-label="Plataformas compativeis">
          {card.platformLabels.slice(0, 4).map((platform) => (
            <span key={platform}>{platform}</span>
          ))}
        </div>

        <ul className="discovery-reasons" aria-label="Motivos da recomendacao">
          {card.reasons.slice(0, 5).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>

        <div className="discovery-facts" aria-label="Fonte, tempo e disponibilidade">
          <span>{card.timeEstimateLabel}</span>
          <span>{card.availabilityLabel}</span>
        </div>

        <DiscoverySourceMetadata source={card.sourceMeta} />

        {card.libraryStatus ? (
          <p className="discovery-library-state" role="status">
            Ja na biblioteca: {formatLibraryStatus(card.libraryStatus)}
          </p>
        ) : null}

        <div className="discovery-decision-actions" aria-label="Decisoes da carta">
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="want"
            formRef={formRefs?.want}
            label="Quero jogar"
            returnTo={returnTo}
          />
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="not_now"
            formRef={formRefs?.not_now}
            label="Agora nao"
            returnTo={returnTo}
          />
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="skip"
            formRef={formRefs?.skip}
            label="Pular"
            returnTo={returnTo}
          />
        </div>

        {card.allowedLibraryActions.length > 0 ? (
          <div className="discovery-handoff-actions" aria-label="Enviar para a biblioteca">
            {card.allowedLibraryActions.map((status) => (
              <form action={handoffAction} key={status}>
                <input name="catalogGameId" type="hidden" value={card.catalogGameId} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <input name="status" type="hidden" value={status} />
                <button className="queue2-button" data-tone="quiet" type="submit">
                  {card.libraryStatus ? `Mover para ${handoffLabels[status]}` : `Adicionar a ${handoffLabels[status]}`}
                </button>
              </form>
            ))}
            <button aria-disabled="true" className="queue2-button" data-tone="quiet" disabled type="button">
              Zerado bloqueado
            </button>
            <button aria-disabled="true" className="queue2-button" data-tone="quiet" disabled type="button">
              Dropado bloqueado
            </button>
          </div>
        ) : (
          <p className="muted">
            Zerado e Dropado ficam bloqueados ate a confirmacao dupla da Fase 4.
          </p>
        )}
      </div>
    </article>
  );
}

function DecisionForm({
  action,
  catalogGameId,
  decision,
  formRef,
  label,
  returnTo
}: {
  action: DiscoveryDecisionAction;
  catalogGameId: string;
  decision: "want" | "not_now" | "skip";
  formRef?: RefObject<HTMLFormElement | null>;
  label: string;
  returnTo: string;
}) {
  const tone = decision === "want" ? "primary" : "quiet";

  return (
    <form action={action} ref={formRef}>
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="decision" type="hidden" value={decision} />
      <input name="sourceMode" type="hidden" value="deck" />
      <input name="returnTo" type="hidden" value={returnTo} />
      <button className="queue2-button" data-decision={decision} data-tone={tone} type="submit">
        {label}
      </button>
    </form>
  );
}

function formatLibraryStatus(status: string): string {
  return libraryStatusLabels[status] ?? status;
}
