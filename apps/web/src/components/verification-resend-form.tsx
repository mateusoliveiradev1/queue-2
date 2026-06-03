"use client";

import { useEffect, useState } from "react";

type VerificationResendFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  email: string | null;
  initialSeconds?: number;
};

export function VerificationResendForm({
  action,
  email,
  initialSeconds = 0
}: VerificationResendFormProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsRemaining]);

  const isCoolingDown = secondsRemaining > 0;

  return (
    <form action={action} className="form-stack">
      <input name="intent" type="hidden" value="resend-verification" />
      {email ? (
        <input name="email" type="hidden" value={email} />
      ) : (
        <div className="field">
          <label htmlFor="verification-email">Email pendente</label>
          <input
            autoComplete="email"
            className="queue2-input"
            id="verification-email"
            name="email"
            required
            type="email"
          />
        </div>
      )}
      <button
        className="queue2-button"
        data-tone="primary"
        disabled={isCoolingDown}
        type="submit"
      >
        Reenviar email
      </button>
      <p className="support-copy" aria-live="polite">
        {isCoolingDown
          ? `Novo reenvio disponivel em ${secondsRemaining} segundos.`
          : "Voce pode solicitar um novo envio agora."}
      </p>
    </form>
  );
}
