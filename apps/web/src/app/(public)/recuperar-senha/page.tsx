import type { Metadata } from "next";
import { QueueMark, QueueWordmark } from "@queue/ui";

export const metadata: Metadata = {
  title: "Recuperar senha - QUEUE/2"
};

async function requestPasswordReset(_formData: FormData) {
  "use server";
}

export default function RecoverPasswordPage() {
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

        <form action={requestPasswordReset} className="auth-panel">
          <QueueMark size={52} />
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
          <div className="form-actions">
            <button className="queue2-button" data-tone="primary" type="submit">
              Enviar link seguro
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
