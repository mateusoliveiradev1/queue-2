"use client";

import { useFormStatus } from "react-dom";

export function CatalogWishlistSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="queue2-button pending-submit-button"
      data-pending={pending ? "true" : "false"}
      data-tone="primary"
      disabled={pending}
      type="submit"
    >
      <span aria-hidden="true" className="pending-submit-button__spinner" />
      <span>{pending ? "Adicionando..." : "Adicionar a Wishlist"}</span>
    </button>
  );
}
