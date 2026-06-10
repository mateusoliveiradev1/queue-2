"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { flushSync } from "react-dom";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";
import type { DiscoveryDeckCard } from "../application/ports";
import type {
  DiscoveryDecision,
  DiscoveryLibraryHandoffStatus,
  DiscoverySourceMode
} from "../domain/discovery-policy";
import { DiscoverySourceMetadata } from "./discovery-source-metadata";

type DiscoveryDecisionAction = (formData: FormData) => Promise<void>;
type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;
type EnhancedDiscoveryAction = (
  formData: FormData
) => Promise<{ ok: boolean; state?: string; redirectTo?: string }>;

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

const decisionFeedbackCopy = {
  syncing: "Decisao salva aqui, sincronizando...",
  failed: "Nao deu para decidir. Tente de novo.",
  retrying: "Tentando decidir de novo..."
} as const;

const handoffFeedbackCopy = {
  syncing: "Envio salvo aqui, sincronizando...",
  failed: "Nao deu para enviar. Tente de novo.",
  retrying: "Tentando enviar de novo..."
} as const;

export function DiscoveryCard({
  card,
  decisionAction,
  enhancedDecisionAction,
  enhancedHandoffAction,
  formRefs,
  handoffAction,
  onLocalReaction,
  priority = false,
  reaction,
  returnTo,
  sourceMode = "deck"
}: {
  card: DiscoveryDeckCard;
  decisionAction: DiscoveryDecisionAction;
  enhancedDecisionAction?: EnhancedDiscoveryAction;
  enhancedHandoffAction?: EnhancedDiscoveryAction;
  formRefs?: Partial<Record<"want" | "not_now" | "skip", RefObject<HTMLFormElement | null>>>;
  handoffAction: DiscoveryHandoffAction;
  onLocalReaction?: (reaction: "want" | "not_now" | "skip") => void;
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
                <HandoffForm
                  action={handoffAction}
                  catalogGameId={card.catalogGameId}
                  enhancedAction={enhancedHandoffAction}
                  key={status}
                  label={card.libraryStatus ? handoffMoveLabels[status] : handoffLabels[status]}
                  returnTo={returnTo}
                  status={status}
                />
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

        <div className="discovery-decision-actions" aria-label="Decisoes da carta">
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="skip"
            enhancedAction={enhancedDecisionAction}
            formRef={formRefs?.skip}
            label="Pular"
            onLocalReaction={onLocalReaction}
            returnTo={returnTo}
            sourceMode={sourceMode}
          />
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="not_now"
            enhancedAction={enhancedDecisionAction}
            formRef={formRefs?.not_now}
            label="Agora nao"
            onLocalReaction={onLocalReaction}
            returnTo={returnTo}
            sourceMode={sourceMode}
          />
          <DecisionForm
            action={decisionAction}
            catalogGameId={card.catalogGameId}
            decision="want"
            enhancedAction={enhancedDecisionAction}
            formRef={formRefs?.want}
            label="Quero jogar"
            onLocalReaction={onLocalReaction}
            returnTo={returnTo}
            sourceMode={sourceMode}
          />
        </div>
        <p className="discovery-card-failure-copy">
          Se uma tentativa falhar: Nao deu para mover a carta. Use o mesmo
          botao para tentar de novo antes de seguir.
        </p>
      </div>
    </article>
  );
}

function DecisionForm({
  action,
  catalogGameId,
  decision,
  enhancedAction,
  formRef,
  label,
  onLocalReaction,
  returnTo,
  sourceMode
}: {
  action: DiscoveryDecisionAction;
  catalogGameId: string;
  decision: DiscoveryDecision;
  enhancedAction?: EnhancedDiscoveryAction;
  formRef?: RefObject<HTMLFormElement | null>;
  label: string;
  onLocalReaction?: (reaction: DiscoveryDecision) => void;
  returnTo: string;
  sourceMode: DiscoverySourceMode;
}) {
  const tone = decision === "want" ? "primary" : "quiet";
  const ownFormRef = useRef<HTMLFormElement | null>(null);
  const pendingRef = useRef(false);
  const [state, setState] = useState<ActionFeedbackState>("idle");
  const [serverState, setServerState] = useState<string | null>(null);

  function setFormNode(node: HTMLFormElement | null) {
    ownFormRef.current = node;

    if (formRef) {
      formRef.current = node;
    }
  }

  useEffect(() => {
    if (state === "failed" || state === "retrying") {
      ownFormRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhancedAction) {
      onLocalReaction?.(decision);
      return;
    }

    event.preventDefault();

    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setServerState(null);
    flushSync(() => {
      setState((current) => (current === "failed" ? "retrying" : "syncing"));
    });
    onLocalReaction?.(decision);

    try {
      const result = await enhancedAction(new FormData(event.currentTarget));

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setServerState(result.state ?? null);
      setState(result.ok ? "confirmed" : "failed");
    } catch {
      setState("failed");
    } finally {
      pendingRef.current = false;
    }
  }

  return (
    <form
      action={action}
      className="action-feedback-form"
      data-feedback-state={state}
      onSubmit={handleSubmit}
      ref={setFormNode}
    >
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="decision" type="hidden" value={decision} />
      <input name="sourceMode" type="hidden" value={sourceMode} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <ActionFeedbackButton
        className="discovery-decision-button"
        data-decision={decision}
        labels={{
          idle: label,
          syncing: decisionPendingLabels[decision],
          confirmed: "Confirmado",
          failed: "Tentar de novo",
          retrying: "Tentando de novo"
        }}
        state={state}
        tone={tone}
      />
      <ActionFeedback
        copy={{
          ...decisionFeedbackCopy,
          confirmed: getDecisionConfirmedCopy(decision, serverState)
        }}
        state={state}
      />
    </form>
  );
}

function HandoffForm({
  action,
  catalogGameId,
  enhancedAction,
  label,
  returnTo,
  status
}: {
  action: DiscoveryHandoffAction;
  catalogGameId: string;
  enhancedAction?: EnhancedDiscoveryAction;
  label: string;
  returnTo: string;
  status: DiscoveryLibraryHandoffStatus;
}) {
  const ownFormRef = useRef<HTMLFormElement | null>(null);
  const pendingRef = useRef(false);
  const [state, setState] = useState<ActionFeedbackState>("idle");
  const [serverState, setServerState] = useState<string | null>(null);

  useEffect(() => {
    if (state === "failed" || state === "retrying") {
      ownFormRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhancedAction) {
      return;
    }

    event.preventDefault();

    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setServerState(null);
    flushSync(() => {
      setState((current) => (current === "failed" ? "retrying" : "syncing"));
    });

    try {
      const result = await enhancedAction(new FormData(event.currentTarget));

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setServerState(result.state ?? null);
      setState(result.ok ? "confirmed" : "failed");
    } catch {
      setState("failed");
    } finally {
      pendingRef.current = false;
    }
  }

  return (
    <form
      action={action}
      className="action-feedback-form"
      data-feedback-state={state}
      onSubmit={handleSubmit}
      ref={ownFormRef}
    >
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="status" type="hidden" value={status} />
      <ActionFeedbackButton
        labels={{
          idle: label,
          syncing: "Enviando para a fila",
          confirmed: "Confirmado",
          failed: "Tentar de novo",
          retrying: "Tentando de novo"
        }}
        state={state}
        tone="quiet"
      />
      <ActionFeedback
        copy={{
          ...handoffFeedbackCopy,
          confirmed: getHandoffConfirmedCopy(serverState)
        }}
        state={state}
      />
    </form>
  );
}

function getDecisionConfirmedCopy(
  decision: DiscoveryDecision,
  serverState: string | null
): string {
  if (serverState === "match-criado") {
    return "Match confirmado pelo servidor.";
  }

  if (serverState === "match-ja-existe") {
    return "Match ja confirmado pelo servidor.";
  }

  if (decision === "want") {
    return "Quero jogar confirmado pelo servidor.";
  }

  if (decision === "not_now") {
    return "Agora nao confirmado pelo servidor.";
  }

  return "Pulo confirmado pelo servidor.";
}

function getHandoffConfirmedCopy(serverState: string | null): string {
  if (serverState === "biblioteca-atualizada") {
    return "Biblioteca confirmada pelo servidor.";
  }

  return "Envio confirmado pelo servidor.";
}

function formatLibraryStatus(status: string): string {
  return libraryStatusLabels[status] ?? status;
}
