"use client";

import { useFormStatus } from "react-dom";

type TerminalTargetStatus = "zerado" | "dropado";

export function TerminalRequestSubmit({
  label,
  targetStatus
}: {
  label: string;
  targetStatus: TerminalTargetStatus;
}) {
  const { pending } = useFormStatus();
  const formattedStatus = targetStatus === "zerado" ? "Zerado" : "Dropado";

  return (
    <>
      {pending ? (
        <div className="terminal-request-card terminal-request-card--pending" role="status">
          <div>
            <strong>Pedido pendente: {formattedStatus}</strong>
            <span className="muted">O solicitante nao pode confirmar sozinho.</span>
          </div>
        </div>
      ) : null}
      <button
        aria-busy={pending}
        className="queue2-button"
        data-tone="quiet"
        disabled={pending}
        type="submit"
      >
        {pending ? `Enviando ${formattedStatus}` : label}
      </button>
    </>
  );
}
