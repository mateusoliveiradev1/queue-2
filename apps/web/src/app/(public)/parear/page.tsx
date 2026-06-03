"use client";

import { useState } from "react";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

const previewCode = "Q2K7M9";

const errorStates = [
  {
    label: "Codigo invalido",
    text: "Confira os seis caracteres e tente de novo."
  },
  {
    label: "Codigo nao ativo",
    text: "O convite expirou ou nao esta mais disponivel."
  },
  {
    label: "Muitas tentativas",
    text: "Espere um pouco antes de testar outro codigo."
  }
] as const;

export default function PairingPage() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard?.writeText(previewCode);
    setCopied(true);
  }

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="pair-title">
        <div className="public-intro queue2-grain">
          <QueueWordmark variant="stacked" />
          <div>
            <p className="eyebrow">/2 e regra de produto</p>
            <h1 className="page-title" id="pair-title">
              Parear a dupla
            </h1>
            <p className="lede">
              Crie um convite ou entre com codigo. Quando os dois chegam, a fila
              deixa de ser minha e vira nossa.
            </p>
          </div>
          <div className="neutral-state">
            <RoulettePointer aria-hidden="true" label="" tone="accent" />
            <span>A dupla fica fixa nesta fase: exatamente dois jogadores.</span>
          </div>
        </div>

        <section className="auth-panel" aria-label="Pareamento por codigo">
          <QueueMark size={52} />
          <div className="pairing-tabs" role="group" aria-label="Modo de pareamento">
            <button
              aria-pressed={mode === "create"}
              className="queue2-button"
              data-tone={mode === "create" ? "primary" : "quiet"}
              onClick={() => setMode("create")}
              type="button"
            >
              Criar dupla
            </button>
            <button
              aria-pressed={mode === "join"}
              className="queue2-button"
              data-tone={mode === "join" ? "primary" : "quiet"}
              onClick={() => setMode("join")}
              type="button"
            >
              Entrar com codigo
            </button>
          </div>

          {mode === "create" ? (
            <div className="form-stack">
              <p className="support-copy">
                Compartilhe este codigo com a outra pessoa. O convite vale por
                24 horas e pode ser revogado antes do uso.
              </p>
              <output className="pairing-code" aria-label={`Codigo de pareamento ${previewCode}`}>
                {previewCode}
              </output>
              <div className="form-actions">
                <button
                  className="queue2-button"
                  data-tone="primary"
                  onClick={copyCode}
                  type="button"
                >
                  Copiar codigo
                </button>
                <button className="queue2-button" data-tone="quiet" disabled type="button">
                  Revogar convite
                </button>
              </div>
              <p className="support-copy" aria-live="polite">
                {copied ? "Codigo copiado." : "Validade: ate amanha as 20:00."}
              </p>
              <div className="neutral-state">
                <RoulettePointer aria-hidden="true" label="" />
                <span>A fila virou nossa quando o segundo jogador entrar.</span>
              </div>
            </div>
          ) : (
            <form className="form-stack" onSubmit={(event) => event.preventDefault()}>
              <div className="field">
                <label htmlFor="pairing-code">Codigo da dupla</label>
                <input
                  autoComplete="one-time-code"
                  className="queue2-input"
                  id="pairing-code"
                  inputMode="text"
                  maxLength={6}
                  name="pairingCode"
                  pattern="[A-Za-z0-9]{6}"
                  required
                  type="text"
                />
              </div>
              <button className="queue2-button" data-tone="primary" disabled type="submit">
                Entrar com codigo
              </button>
              <p className="support-copy">
                Inserir um codigo ativo forma a dupla imediatamente.
              </p>
            </form>
          )}

          <ul className="state-list" aria-label="Estados neutros de erro">
            {errorStates.map((state) => (
              <li className="neutral-state" key={state.label}>
                <RoulettePointer aria-hidden="true" label="" tone="accent" />
                <span>
                  <strong>{state.label}:</strong> {state.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
