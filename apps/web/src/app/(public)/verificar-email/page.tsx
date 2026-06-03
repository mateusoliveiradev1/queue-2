import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

import {
  AUTH_PAIRING_CALLBACK_URL,
  AUTH_RESEND_COOLDOWN_SECONDS,
  correctEmailAction,
  getAuthStatusMessage,
  logoutAction,
  resendVerificationAction
} from "../../../platform/auth/actions";

export const metadata: Metadata = {
  title: "Verificar email - QUEUE/2"
};

type VerifyEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps = {}) {
  const params = (await searchParams) ?? {};
  const token = getSearchParam(params.token);
  const email = getSearchParam(params.email);
  const state = getSearchParam(params.estado) ?? (getSearchParam(params.error) ? "link-invalido" : null);
  const statusMessage = getAuthStatusMessage("verify", state);

  if (token) {
    const verifySearchParams = new URLSearchParams({
      token,
      callbackURL: AUTH_PAIRING_CALLBACK_URL
    });

    redirect(`/api/auth/verify-email?${verifySearchParams.toString()}`);
  }

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="verify-title">
        <div className="public-intro queue2-grain">
          <QueueWordmark variant="stacked" compact />
          <div>
            <p className="eyebrow">Email antes da fila</p>
            <h1 className="page-title" id="verify-title">
              Verifique seu email
            </h1>
            <p className="lede">
              Enquanto o email nao for confirmado, a conta fica nesta tela.
              Depois disso, o caminho segue para parear a dupla.
            </p>
          </div>
          <div className="neutral-state">
            <RoulettePointer aria-hidden="true" label="" tone="accent" />
            <span>Link expirado ou usado? Peca um novo envio sem detalhes tecnicos.</span>
          </div>
        </div>

        <div className="auth-panel">
          <QueueMark size={52} />
          <p className="support-copy">
            Enviamos a verificacao para o email cadastrado. O reenvio usa uma espera
            curta para proteger a fila.
          </p>
          {email ? (
            <p className="support-copy">
              Email pendente: <strong>{email}</strong>
            </p>
          ) : null}
          {statusMessage ? (
            <p className="neutral-state" role="status">
              {statusMessage}
            </p>
          ) : null}
          <form action={resendVerificationAction} className="form-stack">
            <input name="intent" type="hidden" value="resend-verification" />
            <input name="email" type="hidden" value={email ?? ""} />
            <button className="queue2-button" data-tone="primary" type="submit">
              Reenviar email
            </button>
            <p className="support-copy" aria-live="polite">
              Novo reenvio disponivel em {AUTH_RESEND_COOLDOWN_SECONDS} segundos.
            </p>
          </form>
          <form action={correctEmailAction} className="form-stack">
            <input name="currentEmail" type="hidden" value={email ?? ""} />
            <div className="field">
              <label htmlFor="correct-email">Corrigir email</label>
              <input
                autoComplete="email"
                className="queue2-input"
                id="correct-email"
                name="email"
                required
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="correct-password">Senha escolhida</label>
              <input
                autoComplete="current-password"
                className="queue2-input"
                id="correct-password"
                name="password"
                required
                type="password"
              />
            </div>
            <button className="queue2-button" data-tone="quiet" type="submit">
              Corrigir e enviar de novo
            </button>
            <p className="support-copy">
              Confirme a senha para preservar o cadastro e invalidar o link anterior.
            </p>
          </form>
          <form action={logoutAction}>
            <button className="queue2-button" data-tone="quiet" type="submit">
              Sair desta conta
            </button>
          </form>
        </div>
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
