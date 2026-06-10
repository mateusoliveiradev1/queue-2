import type { Metadata } from "next";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PendingSubmitButton } from "../../../components/pending-submit-button";
import { StatusToast } from "../../../components/status-toast";
import { getAuthStatusMessage } from "../../../platform/auth/actions";
import { loginAction } from "../../../platform/auth/server-actions";

export const metadata: Metadata = {
  description:
    "Entre no QUEUE/2 para voltar ao backlog coop da sua dupla fixa.",
  title: "Entrar na fila"
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  const params = (await searchParams) ?? {};
  const state = getSearchParam(params.estado);
  const statusMessage = getAuthStatusMessage("login", state);

  return (
    <main className="public-shell public-shell--compact">
      <form
        action={loginAction}
        aria-describedby="login-copy"
        aria-labelledby="login-title"
        className="auth-panel public-auth-card"
      >
        <PublicBrandLink display="mark" />
        <nav className="auth-tabs" aria-label="Acesso publico">
          <a aria-current="page" className="queue2-focusable" href="/login">
            Entrar
          </a>
          <a className="queue2-focusable" href="/cadastro">
            Criar conta
          </a>
        </nav>
        <StatusToast message={statusMessage} state={state} />
        <div className="auth-panel-header" id="login-copy">
          <p className="eyebrow">Acesso da dupla</p>
          <h1 className="page-title" id="login-title">
            Voltar para a fila
          </h1>
          <p>Use o email verificado que abriu seu lado da fila.</p>
        </div>
        {statusMessage ? (
          <p className="neutral-state" role="status">
            {statusMessage}
          </p>
        ) : null}
        <div className="form-stack">
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              autoComplete="email"
              className="queue2-input"
              id="login-email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Senha</label>
            <input
              autoComplete="current-password"
              className="queue2-input"
              id="login-password"
              name="password"
              required
              type="password"
            />
          </div>
        </div>
        <div className="form-actions">
          <PendingSubmitButton label="Entrar" pendingLabel="Entrando..." />
          <a className="text-link queue2-focusable" href="/recuperar-senha">
            Esqueci minha senha
          </a>
          <a className="text-link queue2-focusable" href="/verificar-email">
            Reenviar verificacao
          </a>
        </div>
        <p className="support-copy">
          Depois de entrar, pareie a dupla por codigo para fechar o 2/2.
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
