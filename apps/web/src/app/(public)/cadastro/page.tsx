import type { Metadata } from "next";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PublicRitualStrip } from "../../../components/public-ritual-strip";
import { PendingSubmitButton } from "../../../components/pending-submit-button";
import { SignupFields } from "../../../components/signup-fields";
import { StatusToast } from "../../../components/status-toast";
import { getAuthStatusMessage } from "../../../platform/auth/actions";
import { signupAction } from "../../../platform/auth/server-actions";

export const metadata: Metadata = {
  description:
    "Crie uma conta no QUEUE/2 e prepare o convite para montar uma fila coop em dupla.",
  title: "Criar conta"
};

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps = {}) {
  const params = (await searchParams) ?? {};
  const state = getSearchParam(params.estado);
  const statusMessage = getAuthStatusMessage("signup", state);

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="signup-title">
        <div className="public-intro queue2-grain">
          <PublicBrandLink />
          <div>
            <p className="eyebrow">Comece pelo seu lado</p>
            <h1 className="page-title" id="signup-title">
              Abrir seu lado da fila
            </h1>
            <p className="lede">
              A conta identifica voce. A fila so nasce quando a outra pessoa
              entra pelo convite e fecha o 2/2.
            </p>
          </div>
          <PublicRitualStrip steps={["conta", "email", "dupla"]} />
        </div>

        <form action={signupAction} className="auth-panel">
          <PublicBrandLink display="mark" />
          <StatusToast message={statusMessage} state={state} />
          <div className="auth-panel-header">
            <h2>Cadastro</h2>
            <p>Use um email real. A verificacao protege o convite da dupla.</p>
          </div>
          {statusMessage ? (
            <p className="neutral-state" role="status">
              {statusMessage}
            </p>
          ) : null}
          <SignupFields />
          <div className="form-actions">
            <PendingSubmitButton label="Criar conta" pendingLabel="Criando..." />
            <a className="text-link queue2-focusable" href="/login">
              Ja tenho conta
            </a>
          </div>
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
