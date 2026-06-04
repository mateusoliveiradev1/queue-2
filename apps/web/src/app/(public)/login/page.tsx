import type { Metadata } from "next";
import { RouletteDivider } from "@queue/ui";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PublicRitualStrip } from "../../../components/public-ritual-strip";
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
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="login-title">
        <div className="public-intro queue2-grain">
          <PublicBrandLink variant="stacked" />
          <div>
            <p className="eyebrow">Acesso da dupla</p>
            <h1 className="page-title" id="login-title">
              Voltar para a fila
            </h1>
            <p className="lede">
              Entre para continuar a dupla que voce ja formou. Wishlist, Jogando
              e Pausado ficam do lado dos dois, sem placar solo.
            </p>
          </div>
          <PublicRitualStrip steps={["entrar", "parear", "jogar"]} />
          <RouletteDivider />
        </div>

        <form action={loginAction} className="auth-panel" aria-describedby="login-copy">
          <PublicBrandLink display="mark" />
          <StatusToast message={statusMessage} state={state} />
          <div className="auth-panel-header" id="login-copy">
            <h2>Entrar</h2>
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
