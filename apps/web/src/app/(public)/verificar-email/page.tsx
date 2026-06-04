import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoulettePointer } from "@queue/ui";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PendingSubmitButton } from "../../../components/pending-submit-button";
import { PublicRitualStrip } from "../../../components/public-ritual-strip";
import { StatusToast } from "../../../components/status-toast";
import { VerificationResendForm } from "../../../components/verification-resend-form";
import {
  AUTH_RESEND_COOLDOWN_SECONDS,
  buildVerificationCallbackPath,
  getAuthStatusMessage
} from "../../../platform/auth/actions";
import {
  correctEmailAction,
  logoutAction,
  resendVerificationAction
} from "../../../platform/auth/server-actions";

export const metadata: Metadata = {
  description:
    "Confirme seu email no QUEUE/2 para liberar o convite da dupla.",
  title: "Verificar email"
};

type VerifyEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps = {}) {
  const params = (await searchParams) ?? {};
  const token = getSearchParam(params.token);
  const email = getSearchParam(params.email);
  const error = getSearchParam(params.error);
  const state = error ? "link-invalido" : getSearchParam(params.estado);
  const statusMessage = getAuthStatusMessage("verify", state);

  if (token) {
    const verifySearchParams = new URLSearchParams({
      token,
      callbackURL: email ? buildVerificationCallbackPath(email) : "/verificar-email?estado=verificado"
    });

    redirect(`/api/auth/verify-email?${verifySearchParams.toString()}`);
  }

  if (state === "verificado") {
    redirect("/parear");
  }

  const startsCooldown = ["cadastro", "verifique-email", "reenviado", "email-corrigido"].includes(
    state ?? ""
  );

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="verify-title">
        <div className="public-intro queue2-grain">
          <PublicBrandLink compact variant="stacked" />
          <div>
            <p className="eyebrow">Email antes da fila</p>
            <h1 className="page-title" id="verify-title">
              Verifique seu email
            </h1>
            <p className="lede">
              Abra o link antes de parear. Se digitou errado ou o link expirou,
              corrija aqui sem recomecar a conta.
            </p>
          </div>
          <PublicRitualStrip steps={["email", "parear", "fila"]} />
          <div className="neutral-state">
            <RoulettePointer aria-hidden="true" label="" tone="accent" />
            <span>Link expirado ou usado? Peca outro envio.</span>
          </div>
        </div>

        <div className="auth-panel">
          <PublicBrandLink display="mark" />
          <StatusToast message={statusMessage} state={state} />
          <div className="auth-panel-header">
            <h2>Confirmar email</h2>
            <p>Use o link de verificacao ou envie outro para o email pendente.</p>
          </div>
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
          <VerificationResendForm
            action={resendVerificationAction}
            email={email}
            initialSeconds={startsCooldown ? AUTH_RESEND_COOLDOWN_SECONDS : 0}
          />
          <form action={correctEmailAction} className="form-stack">
            {email ? (
              <input name="currentEmail" type="hidden" value={email} />
            ) : (
              <div className="field">
                <label htmlFor="current-email">Email cadastrado</label>
                <input
                  autoComplete="email"
                  className="queue2-input"
                  id="current-email"
                  name="currentEmail"
                  required
                  type="email"
                />
              </div>
            )}
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
            <PendingSubmitButton
              label="Corrigir e enviar de novo"
              pendingLabel="Enviando..."
              tone="quiet"
            />
            <p className="support-copy">
              Confirme a senha para trocar o email e invalidar o link anterior.
            </p>
          </form>
          <form action={logoutAction}>
            <PendingSubmitButton label="Sair desta conta" pendingLabel="Saindo..." tone="quiet" />
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
