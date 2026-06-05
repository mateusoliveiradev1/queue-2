"use client";

import { useState, type FormEvent } from "react";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";
import type { Phase2LibraryStatus } from "../domain/library-policy";

type StatusAction = {
  label: string;
  status: Phase2LibraryStatus;
};

const phase2Statuses: Phase2LibraryStatus[] = ["wishlist", "jogando", "pausado"];

export function LibraryStatusControls({
  action,
  catalogGameId,
  currentStatus,
  enhancedAction,
  returnTo
}: {
  action: (formData: FormData) => Promise<void>;
  catalogGameId: string;
  currentStatus: string;
  enhancedAction?: (formData: FormData) => Promise<{ ok: boolean; redirectTo?: string }>;
  returnTo?: string;
}) {
  const normalizedStatus = normalizeCurrentStatus(currentStatus);
  const primaryAction = getPrimaryAction(normalizedStatus);
  const secondaryActions = getSecondaryActions(normalizedStatus, primaryAction);

  return (
    <div className="status-controls" aria-label="Mudar status na biblioteca">
      {primaryAction ? (
        <StatusActionForm
          action={action}
          catalogGameId={catalogGameId}
          enhancedAction={enhancedAction}
          item={primaryAction}
          returnTo={returnTo}
          tone="primary"
        />
      ) : null}
      {secondaryActions.length > 0 ? (
        <details className="library-action-sheet">
          <summary className="queue2-button" data-tone="quiet">
            Mais acoes
          </summary>
          <div className="library-action-sheet-panel" role="group" aria-label="Acoes secundarias">
            {secondaryActions.map((item) => (
              <StatusActionForm
                action={action}
                catalogGameId={catalogGameId}
                enhancedAction={enhancedAction}
                item={item}
                key={item.status}
                returnTo={returnTo}
                tone="quiet"
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function StatusActionForm({
  action,
  catalogGameId,
  enhancedAction,
  item,
  returnTo,
  tone
}: {
  action: (formData: FormData) => Promise<void>;
  catalogGameId: string;
  enhancedAction?: (formData: FormData) => Promise<{ ok: boolean; redirectTo?: string }>;
  item: StatusAction;
  returnTo?: string;
  tone: "primary" | "quiet";
}) {
  const [state, setState] = useState<ActionFeedbackState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhancedAction) {
      return;
    }

    event.preventDefault();
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
    }
  }

  return (
    <form action={action} className="action-feedback-form" onSubmit={handleSubmit}>
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="status" type="hidden" value={item.status} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <ActionFeedbackButton
        labels={{
          idle: item.label,
          syncing: "Movendo na fila",
          confirmed: "Confirmado",
          failed: "Tentar de novo",
          retrying: "Tentando de novo"
        }}
        state={state}
        tone={tone}
      />
      <ActionFeedback
        copy={{
          syncing: "Movimento salvo aqui, sincronizando...",
          confirmed: "Status confirmado pelo servidor.",
          failed: "Nao deu para mover. Tente de novo.",
          retrying: "Tentando mover de novo..."
        }}
        state={state}
      />
    </form>
  );
}

function normalizeCurrentStatus(status: string): Phase2LibraryStatus | null {
  switch (status.trim().toLowerCase()) {
    case "wishlist":
      return "wishlist";
    case "jogando":
      return "jogando";
    case "pausado":
      return "pausado";
    default:
      return null;
  }
}

function getPrimaryAction(currentStatus: Phase2LibraryStatus | null): StatusAction | null {
  switch (currentStatus) {
    case "wishlist":
      return { status: "jogando", label: "Comecar em Jogando" };
    case "jogando":
      return { status: "pausado", label: "Pausar" };
    case "pausado":
      return { status: "jogando", label: "Retomar em Jogando" };
    default:
      return { status: "wishlist", label: "Adicionar a Wishlist" };
  }
}

function getSecondaryActions(
  currentStatus: Phase2LibraryStatus | null,
  primaryAction: StatusAction | null
): StatusAction[] {
  return phase2Statuses
    .filter((status) => status !== currentStatus && status !== primaryAction?.status)
    .map((status) => ({
      status,
      label: getSecondaryLabel(status, currentStatus)
    }));
}

function getSecondaryLabel(
  status: Phase2LibraryStatus,
  currentStatus: Phase2LibraryStatus | null
): string {
  if (status === "wishlist") {
    return currentStatus ? "Voltar para Wishlist" : "Adicionar a Wishlist";
  }

  if (status === "jogando") {
    return currentStatus === "pausado" ? "Retomar em Jogando" : "Comecar em Jogando";
  }

  return currentStatus === "jogando" ? "Pausar" : "Mover para Pausado";
}
