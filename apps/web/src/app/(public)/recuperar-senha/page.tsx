import type { Metadata } from "next";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PublicRitualStrip } from "../../../components/public-ritual-strip";
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
          <PublicBrandLink />
          <div>
            <p className="eyebrow">Voltar para a dupla</p>
            <h1 className="page-title" id="recover-title">
              Recuperar senha
            </h1>
            <p className="lede">
              Peca um link para voltar. Se o email existir, a gente envia sem
              expor quais contas estao cadastradas.
            </p>
          </div>
          <PublicRitualStrip steps={["senha", "entrar", "dupla"]} />
        </div>

        <form action={token ? completePasswordResetAction : requestPasswordResetAction} className="auth-panel">
          <PublicBrandLink display="mark" />
          <StatusToast message={statusMessage} state={state} />
          <div className="auth-panel-header">
            <h2>{token ? "Nova senha" : "Enviar link"}</h2>
            <p>
              {token
                ? "Escolha uma senha forte para retomar a fila."
                : "Informe o email da conta. O retorno fica neutro por seguranca."}
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
            <button className="queue2-button" data-tone="primary" type="submit">
              {token ? "Alterar senha" : "Enviar link seguro"}
            </button>
            <a className="text-link queue2-focusable" href="/login">
              Voltar ao login
            </a>
          </div>
          <p className="support-copy">
            O link expira. Se nao chegar, solicite outro depois de alguns minutos.
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
