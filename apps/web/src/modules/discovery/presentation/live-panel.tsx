"use client";

import { useRef, useState, type FormEvent } from "react";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";
import type { DiscoveryLiveSessionPayload } from "../application/ports";
import { LiveSessionRefresh } from "./live-session-refresh";
import { PushOptInButton } from "./push-opt-in-button";

type LiveAction = (formData: FormData) => Promise<void>;
type EnhancedLiveAction = (
  formData: FormData
) => Promise<{ ok: boolean; state?: string; liveId?: string; redirectTo?: string }>;

export function LivePanel({
  action,
  enhancedAction,
  liveSession,
  returnTo
}: {
  action: LiveAction;
  enhancedAction?: EnhancedLiveAction;
  liveSession: DiscoveryLiveSessionPayload | null;
  returnTo: string;
}) {
  const isActive = liveSession?.ok === true;
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
    <section className="live-panel discovery-orbit-tray" aria-labelledby="live-summary-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="live-summary-title">
          Live
        </h2>
        <p className="support-copy">{formatLiveSummary(liveSession)}</p>
      </div>
      {isActive ? (
        <p className="live-panel-active" role="status">
          Live ativa. Decidam cartas ao mesmo tempo; quando os dois marcam
          Quero jogar no mesmo jogo, o match aparece aqui.
        </p>
      ) : (
        <form action={action} className="live-panel-action action-feedback-form" onSubmit={handleSubmit}>
          <input name="returnTo" type="hidden" value={returnTo} />
          <ActionFeedbackButton
            labels={{
              idle: "Comecar live de 10 min",
              syncing: "Iniciando live",
              confirmed: "Live confirmada",
              failed: "Tentar de novo",
              retrying: "Tentando de novo"
            }}
            state={state}
          />
          <ActionFeedback
            copy={{
              syncing: "Live salva aqui, sincronizando...",
              confirmed: "Live confirmada pelo servidor.",
              failed: "Nao deu para iniciar a live. Tente de novo.",
              retrying: "Tentando iniciar a live de novo..."
            }}
            state={state}
          />
        </form>
      )}
      <LiveSessionRefresh initialLiveSession={isActive ? liveSession : null} />
      {isActive ? <PushOptInButton /> : null}
    </section>
  );
}

function formatLiveSummary(liveSession: DiscoveryLiveSessionPayload | null): string {
  if (!liveSession) {
    return "Sessao curta para os dois descobrirem ao mesmo tempo, sem chat ou pressao.";
  }

  if (!liveSession.ok) {
    return "Nenhuma sessao live ativa foi encontrada para esta dupla.";
  }

  const minutes = Math.max(1, Math.ceil(liveSession.expiresInSeconds / 60));
  return `${liveSession.matches.length} match(es) nesta live. Expira em cerca de ${minutes} min.`;
}
