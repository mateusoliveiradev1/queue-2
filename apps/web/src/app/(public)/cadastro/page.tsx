import type { Metadata } from "next";

import { PublicBrandLink } from "../../../components/public-brand-link";
import { PublicRitualStrip } from "../../../components/public-ritual-strip";
import { SignupFields } from "../../../components/signup-fields";
import { StatusToast } from "../../../components/status-toast";
import { getAuthStatusMessage } from "../../../platform/auth/actions";
import { signupAction } from "../../../platform/auth/server-actions";

export const metadata: Metadata = {
  title: "Cadastro - QUEUE/2"
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
            <p className="eyebrow">Cadastro da dupla fixa</p>
            <h1 className="page-title" id="signup-title">
              Criar conta para jogar junto
            </h1>
            <p className="lede">
              A conta e individual, mas o produto inteiro pertence a uma dupla.
              Depois da verificacao, o proximo passo e parear.
            </p>
          </div>
          <PublicRitualStrip steps={["conta", "email", "dupla"]} />
        </div>

        <form action={signupAction} className="auth-panel">
          <PublicBrandLink display="mark" />
          <StatusToast message={statusMessage} state={state} />
          {statusMessage ? (
            <p className="neutral-state" role="status">
              {statusMessage}
            </p>
          ) : null}
          <SignupFields />
          <div className="form-actions">
            <button className="queue2-button" data-tone="primary" type="submit">
              Criar conta
            </button>
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
