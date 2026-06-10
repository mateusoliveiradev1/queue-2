import type { Metadata } from "next";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PendingSubmitButton } from "../../../components/pending-submit-button";
import { StatusToast } from "../../../components/status-toast";
import { getAuthStatusMessage } from "../../../platform/auth/actions";
import {
  completePasswordResetAction,
  requestPasswordResetAction
} from "../../../platform/auth/server-actions";

export const metadata: Metadata = {
  description:
    "Recupere a senha do QUEUE/2 sem expor quais contas existem.",
  title: "Recuperar senha"
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
    <main className="public-shell public-shell--compact">
      <form
        action={token ? completePasswordResetAction : requestPasswordResetAction}
        className="auth-panel public-auth-card"
      >
        <PublicBrandLink display="mark" />
        <StatusToast message={statusMessage} state={state} />
        <div className="auth-panel-header">
          <p className="eyebrow">Voltar para a dupla</p>
          <h1 className="page-title" id="recover-title">
            {token ? "Nova senha" : "Recuperar senha"}
          </h1>
          <p>
            {token
              ? "Escolha uma senha forte para retomar a fila."
              : "Informe o email da conta. A resposta fica neutra e a conta nao fica exposta."}
          </p>
        </div>
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
          <PendingSubmitButton
            label={token ? "Alterar senha" : "Enviar link seguro"}
            pendingLabel={token ? "Alterando..." : "Enviando..."}
          />
          <a className="text-link queue2-focusable" href="/login">
            Voltar ao login
          </a>
        </div>
        <p className="support-copy">
          O link expira. Se nao chegar, solicite outro depois de alguns minutos.
        </p>
      </form>
    </main>
  );
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
