"use client";

import { useState, type FormEvent } from "react";

import {
  ActionFeedback,
  ActionFeedbackButton,
  type ActionFeedbackState
} from "../../../components/action-feedback";

type CatalogWishlistActionResult = {
  ok: boolean;
  redirectTo?: string;
};

export function CatalogWishlistSubmitButton({
  action,
  catalogGameId,
  enhancedAction,
  returnTo
}: {
  action: (formData: FormData) => Promise<void>;
  catalogGameId: string;
  enhancedAction?: (formData: FormData) => Promise<CatalogWishlistActionResult>;
  returnTo?: string;
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
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <ActionFeedbackButton
        labels={{
          idle: "Adicionar a Wishlist",
          syncing: "Salvo aqui, sincronizando",
          confirmed: "Confirmado",
          failed: "Tentar de novo",
          retrying: "Tentando de novo"
        }}
        state={state}
      />
      <ActionFeedback
        copy={{
          syncing: "Salvo aqui, sincronizando...",
          confirmed: "Wishlist confirmada pelo servidor.",
          failed: "Nao deu para salvar. Tente de novo.",
          retrying: "Tentando salvar de novo..."
        }}
        state={state}
      />
    </form>
  );
}
