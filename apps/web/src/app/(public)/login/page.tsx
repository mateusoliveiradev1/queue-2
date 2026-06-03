import type { Metadata } from "next";
import { QueueMark, QueueWordmark, RouletteDivider } from "@queue/ui";

import { StatusToast } from "../../../components/status-toast";
import { getAuthStatusMessage, loginAction } from "../../../platform/auth/actions";

export const metadata: Metadata = {
  title: "Entrar - QUEUE/2"
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  const params = (await searchParams) ?? {};
  const state = getSearchParam(params.estado);
  const statusMessage = getAuthStatusMessage("login", state);

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="login-title">
        <div className="public-intro queue2-grain">
          <QueueWordmark variant="stacked" />
          <div>
            <p className="eyebrow">A fila e nossa.</p>
            <h1 className="page-title" id="login-title">
              Entrar na fila da dupla
            </h1>
            <p className="lede">
              Use o email verificado para voltar ao ritual da dupla. Sem ranking
              individual, sem modo solo.
            </p>
          </div>
          <RouletteDivider />
        </div>

        <form action={loginAction} className="auth-panel" aria-describedby="login-copy">
          <QueueMark size={52} />
          <StatusToast message={statusMessage} state={state} />
          <p className="support-copy" id="login-copy">
            Entre com email verificado e senha para voltar ao ritual da dupla.
          </p>
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
            <button className="queue2-button" data-tone="primary" type="submit">
              Entrar
            </button>
            <a className="text-link queue2-focusable" href="/recuperar-senha">
              Esqueci minha senha
            </a>
          </div>
          <p className="support-copy">
            Ainda nao tem conta?{" "}
            <a className="text-link queue2-focusable" href="/cadastro">
              Criar conta
            </a>
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
