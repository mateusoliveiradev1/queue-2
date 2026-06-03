import type { Metadata } from "next";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

export const metadata: Metadata = {
  title: "Verificar email - QUEUE/2"
};

async function resendVerification(_formData: FormData) {
  "use server";
}

async function correctEmail(_formData: FormData) {
  "use server";
}

async function logoutUnverified(_formData: FormData) {
  "use server";
}

export default function VerifyEmailPage() {
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
            Enviamos a verificacao para o email cadastrado. O reenvio usa uma
            espera curta para proteger a fila.
          </p>
          <form action={resendVerification} className="form-stack">
            <input name="intent" type="hidden" value="resend-verification" />
            <button className="queue2-button" data-tone="primary" type="submit">
              Reenviar email
            </button>
            <p className="support-copy" aria-live="polite">
              Novo reenvio disponivel em 60 segundos.
            </p>
          </form>
          <form action={correctEmail} className="form-stack">
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
            <button className="queue2-button" data-tone="quiet" type="submit">
              Corrigir e enviar de novo
            </button>
          </form>
          <form action={logoutUnverified}>
            <button className="queue2-button" data-tone="quiet" type="submit">
              Sair desta conta
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
