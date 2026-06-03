import type { Metadata } from "next";
import { QueueMark, QueueWordmark } from "@queue/ui";

import { StatusToast } from "../../../components/status-toast";
import { getAuthStatusMessage } from "../../../platform/auth/actions";
import {
  completePasswordResetAction,
  requestPasswordResetAction
} from "../../../platform/auth/server-actions";

export const metadata: Metadata = {
  title: "Recuperar senha - QUEUE/2"
};

type RecoverPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecoverPasswordPage({ searchParams }: RecoverPasswordPageProps = {}) {
  const params = (await searchParams) ?? {};
  const token = getSearchParam(params.token);
  const state = getSearchParam(params.estado) ?? (getSearchParam(params.error) ? "link-invalido" : null);
  const statusMessage = getAuthStatusMessage("recover", state);

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="recover-title">
        <div className="public-intro queue2-grain">
          <QueueWordmark />
          <div>
            <p className="eyebrow">Voltar para a dupla</p>
            <h1 className="page-title" id="recover-title">
              Recuperar senha
            </h1>
            <p className="lede">
              Se o email existir, o link chega por la. A mensagem e neutra para
              proteger contas e evitar enumeracao.
            </p>
          </div>
        </div>

        <form action={token ? completePasswordResetAction : requestPasswordResetAction} className="auth-panel">
          <QueueMark size={52} />
          <StatusToast message={statusMessage} state={state} />
          {statusMessage ? (
            <p className="neutral-state" role="status">
              {statusMessage}
            </p>
          ) : null}
          {token ? (
            <div className="form-stack">
              <input name="token" type="hidden" value={token} />
              <div className="field">
                <label htmlFor="reset-password">Nova senha</label>
                <input
                  autoComplete="new-password"
                  className="queue2-input"
                  id="reset-password"
                  name="password"
                  required
                  type="password"
                />
              </div>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="reset-email">Email da conta</label>
              <input
                autoComplete="email"
                className="queue2-input"
                id="reset-email"
                name="email"
                required
                type="email"
              />
            </div>
          )}
          <div className="form-actions">
            <button className="queue2-button" data-tone="primary" type="submit">
              {token ? "Alterar senha" : "Enviar link seguro"}
            </button>
            <a className="text-link queue2-focusable" href="/login">
              Voltar ao login
            </a>
          </div>
          <p className="support-copy">
            O link expira e pode ser solicitado de novo se nao chegar.
          </p>
        </form>
      </section>
    </main>
  );
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
