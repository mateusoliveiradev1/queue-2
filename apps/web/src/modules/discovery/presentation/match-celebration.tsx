"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";
import type {
  DiscoveryMatchHistoryItem
} from "../application/ports";
import type { DiscoveryLibraryHandoffStatus } from "../domain/discovery-policy";

type DiscoveryHandoffAction = (formData: FormData) => Promise<void>;
type EnhancedDiscoveryAction = (
  formData: FormData
) => Promise<{ ok: boolean; state?: string; redirectTo?: string }>;

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
  enhancedHandoffAction,
  handoffAction,
  match,
  returnTo
}: {
  enhancedHandoffAction?: EnhancedDiscoveryAction;
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
            <MatchHandoffForm
              action={handoffAction}
              catalogGameId={match.match.catalogGameId}
              enhancedAction={enhancedHandoffAction}
              key={status}
              label={handoffLabels[status]}
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

function MatchHandoffForm({
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
  const pendingRef = useRef(false);
  const [state, setState] = useState<ActionFeedbackState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhancedAction) {
      return;
    }

    event.preventDefault();

    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setState((current) => (current === "failed" ? "retrying" : "syncing"));

    try {
      const result = await enhancedAction(new FormData(event.currentTarget));

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setState(result.ok ? "confirmed" : "failed");
    } catch {
      setState("failed");
    } finally {
      pendingRef.current = false;
    }
  }

  return (
    <form action={action} className="action-feedback-form" onSubmit={handleSubmit}>
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
      />
      <ActionFeedback
        copy={{
          syncing: "Match salvo aqui, sincronizando...",
          confirmed: "Biblioteca confirmada pelo servidor.",
          failed: "Nao deu para enviar o match. Tente de novo.",
          retrying: "Tentando enviar o match de novo..."
        }}
        state={state}
      />
    </form>
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
