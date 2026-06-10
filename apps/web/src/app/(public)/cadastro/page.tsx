import type { Metadata } from "next";

import { PublicBrandLink } from "../../../components/public-brand-link";
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
    <main className="public-shell public-shell--compact">
      <form
        action={signupAction}
        aria-labelledby="signup-title"
        className="auth-panel public-auth-card"
      >
        <PublicBrandLink display="mark" />
        <nav className="auth-tabs" aria-label="Acesso publico">
          <a className="queue2-focusable" href="/login">
            Entrar
          </a>
          <a aria-current="page" className="queue2-focusable" href="/cadastro">
            Criar conta
          </a>
        </nav>
        <StatusToast message={statusMessage} state={state} />
        <div className="auth-panel-header">
          <p className="eyebrow">Comece pelo seu lado</p>
          <h1 className="page-title" id="signup-title">
            Abrir seu lado da fila
          </h1>
          <p>
            Crie sua conta, confirme o email e chame a segunda pessoa para fechar a fila.
          </p>
        </div>
        <ul className="signup-assurance-strip" aria-label="Garantias do cadastro">
          <li>
            <strong>Email</strong>
            <span>Verificacao antes da dupla.</span>
          </li>
          <li>
            <strong>2/2</strong>
            <span>Convite fecha com duas pessoas.</span>
          </li>
          <li>
            <strong>Senha</strong>
            <span>Validacao final no servidor.</span>
          </li>
        </ul>
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
        <p className="support-copy">
          A fila so nasce quando a outra pessoa entra pelo codigo e fecha o 2/2.
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
