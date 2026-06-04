"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { useFormStatus } from "react-dom";

import type { DiscoveryDeckCard } from "../application/ports";
import type {
  DiscoveryLibraryHandoffStatus,
  DiscoverySourceMode
} from "../domain/discovery-policy";
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
  wishlist: "Mandar para Wishlist",
  jogando: "Comecar em Jogando",
  pausado: "Guardar em Pausado"
};

const handoffMoveLabels: Record<DiscoveryLibraryHandoffStatus, string> = {
  wishlist: "Mover para Wishlist",
  jogando: "Mover para Jogando",
  pausado: "Mover para Pausado"
};

const decisionPendingLabels = {
  want: "Guardando quero jogar",
  not_now: "Guardando agora nao",
  skip: "Pulando carta"
} as const;

export function DiscoveryCard({
  card,
  decisionAction,
  formRefs,
  handoffAction,
  priority = false,
  reaction,
  returnTo,
  sourceMode = "deck"
}: {
  card: DiscoveryDeckCard;
  decisionAction: DiscoveryDecisionAction;
  formRefs?: Partial<Record<"want" | "not_now" | "skip", RefObject<HTMLFormElement | null>>>;
  handoffAction: DiscoveryHandoffAction;
  priority?: boolean;
  reaction: "want" | "not_now" | "skip" | null;
  returnTo: string;
  sourceMode?: DiscoverySourceMode;
}) {
  return (
    <article className="discovery-card" data-reaction={reaction ?? "idle"}>
      <div className="discovery-card-primary">
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
        <div className="discovery-compatibility-signal" aria-label="Sinal de compatibilidade">
          <span aria-hidden="true">/2</span>
          <strong>{card.reasons[0] ?? "Coop para avaliar juntos"}</strong>
        </div>
      </div>

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

        <div className="discovery-decision-actions" aria-label="Decisoes da carta">
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="want"
            formRef={formRefs?.want}
            label="Quero jogar"
            returnTo={returnTo}
            sourceMode={sourceMode}
          />
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="not_now"
            formRef={formRefs?.not_now}
            label="Agora nao"
            returnTo={returnTo}
            sourceMode={sourceMode}
          />
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="skip"
            formRef={formRefs?.skip}
            label="Pular"
            returnTo={returnTo}
            sourceMode={sourceMode}
          />
        </div>
        <p className="discovery-card-failure-copy">
          Se uma tentativa falhar: Nao deu para mover a carta. Use o mesmo
          botao para tentar de novo antes de seguir.
        </p>

        <div className="discovery-card-tray" aria-label="Detalhes da carta">
          <div className="tag-row" aria-label="Plataformas compativeis">
            {card.platformLabels.slice(0, 4).map((platform) => (
              <span key={platform}>{platform}</span>
            ))}
          </div>

          <div className="discovery-facts" aria-label="Tempo e disponibilidade">
            <span>{card.timeEstimateLabel}</span>
            <span>{card.availabilityLabel}</span>
          </div>

          <DiscoverySourceMetadata source={card.sourceMeta} />

          <ul className="discovery-reasons" aria-label="Motivos da recomendacao">
            {card.reasons.slice(0, 5).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>

          {card.libraryStatus ? (
            <p className="discovery-library-state" role="status">
              Ja na biblioteca: {formatLibraryStatus(card.libraryStatus)}
            </p>
          ) : null}

          {card.allowedLibraryActions.length > 0 ? (
            <div className="discovery-handoff-actions" aria-label="Enviar para a biblioteca">
              {card.allowedLibraryActions.map((status) => (
                <form action={handoffAction} key={status}>
                  <input name="catalogGameId" type="hidden" value={card.catalogGameId} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <input name="status" type="hidden" value={status} />
                  <button className="queue2-button" data-tone="quiet" type="submit">
                    {card.libraryStatus ? handoffMoveLabels[status] : handoffLabels[status]}
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
  returnTo,
  sourceMode
}: {
  action: DiscoveryDecisionAction;
  catalogGameId: string;
  decision: "want" | "not_now" | "skip";
  formRef?: RefObject<HTMLFormElement | null>;
  label: string;
  returnTo: string;
  sourceMode: DiscoverySourceMode;
}) {
  const tone = decision === "want" ? "primary" : "quiet";

  return (
    <form action={action} ref={formRef}>
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="decision" type="hidden" value={decision} />
      <input name="sourceMode" type="hidden" value={sourceMode} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <DecisionSubmitButton
        decision={decision}
        label={label}
        pendingLabel={decisionPendingLabels[decision]}
        tone={tone}
      />
    </form>
  );
}

function DecisionSubmitButton({
  decision,
  label,
  pendingLabel,
  tone
}: {
  decision: "want" | "not_now" | "skip";
  label: string;
  pendingLabel: string;
  tone: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="queue2-button pending-submit-button"
      data-decision={decision}
      data-pending={pending ? "true" : "false"}
      data-tone={tone}
      disabled={pending}
      type="submit"
    >
      <span aria-hidden="true" className="pending-submit-button__spinner" />
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}

function formatLibraryStatus(status: string): string {
  return libraryStatusLabels[status] ?? status;
}
