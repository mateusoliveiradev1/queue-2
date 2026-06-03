import type { Metadata } from "next";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

import {
  getAuthStatusMessage,
  queuePasswordRules,
  signupAction
} from "../../../platform/auth/actions";

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
          <QueueWordmark />
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
        </div>

        <form action={signupAction} className="auth-panel">
          <QueueMark size={52} />
          {statusMessage ? (
            <p className="neutral-state" role="status">
              {statusMessage}
            </p>
          ) : null}
          <div className="form-stack">
            <div className="field">
              <label htmlFor="signup-display-name">Nome de exibicao</label>
              <input
                autoComplete="name"
                className="queue2-input"
                id="signup-display-name"
                maxLength={40}
                name="displayName"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                autoComplete="email"
                className="queue2-input"
                id="signup-email"
                name="email"
                required
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password">Senha</label>
              <input
                aria-describedby="password-rules"
                autoComplete="new-password"
                className="queue2-input"
                id="signup-password"
                name="password"
                required
                type="password"
              />
            </div>
          </div>
          <ul className="password-checklist" id="password-rules" aria-label="Checklist da senha">
            {queuePasswordRules.map((rule) => (
              <li data-rule-state="pending" key={rule.id}>
                <RoulettePointer aria-hidden="true" label="" />
                <span>{rule.label}</span>
              </li>
            ))}
          </ul>
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
