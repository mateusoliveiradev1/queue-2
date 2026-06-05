"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
          key={`${catalogGameId}:${normalizedStatus ?? "unknown"}:${primaryAction.status}`}
          returnTo={returnTo}
          tone="primary"
        />
      ) : null}
      {secondaryActions.length > 0 ? (
        <LibraryActionSheet
          action={action}
          catalogGameId={catalogGameId}
          enhancedAction={enhancedAction}
          items={secondaryActions}
          returnTo={returnTo}
        />
      ) : null}
    </div>
  );
}

function LibraryActionSheet({
  action,
  catalogGameId,
  enhancedAction,
  items,
  returnTo
}: {
  action: (formData: FormData) => Promise<void>;
  catalogGameId: string;
  enhancedAction?: (formData: FormData) => Promise<{ ok: boolean; redirectTo?: string }>;
  items: StatusAction[];
  returnTo?: string;
}) {
  const panelId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && !sheetRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className="library-action-sheet"
      data-open={isOpen ? "true" : "false"}
      ref={sheetRef}
    >
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        className="queue2-button library-action-sheet__trigger"
        data-tone="quiet"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        Mais acoes
      </button>
      {isOpen ? (
        <div
          className="library-action-sheet-panel"
          id={panelId}
          role="group"
          aria-label="Acoes secundarias"
        >
          {items.map((item) => (
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
          <button
            className="queue2-button library-action-sheet-close"
            data-tone="quiet"
            onClick={() => {
              setIsOpen(false);
            }}
            type="button"
          >
            Fechar
          </button>
        </div>
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
  const router = useRouter();
  const [state, setState] = useState<ActionFeedbackState>("idle");

  useEffect(() => {
    setState("idle");
  }, [catalogGameId, item.status]);

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

      if (result.ok) {
        setState("confirmed");
        router.refresh();
        return;
      }

      setState("failed");
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
