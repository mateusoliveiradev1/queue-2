"use client";

import { useState } from "react";

export function CopyPairingCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
  }

  return (
    <div className="copy-code-action">
      <button
        className="queue2-button"
        data-tone="primary"
        onClick={copyCode}
        type="button"
      >
        Copiar codigo
      </button>
      <span aria-live="polite" className="support-copy">
        {copied ? "Codigo copiado." : "Pronto para compartilhar."}
      </span>
    </div>
  );
}
