import type { Metadata } from "next";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

export const metadata: Metadata = {
  title: "Cadastro - QUEUE/2"
};

async function requestSignup(_formData: FormData) {
  "use server";
}

const passwordRules = [
  "Pelo menos 8 caracteres",
  "Uma letra e um numero",
  "Um simbolo ou caractere especial",
  "Nada de senha reutilizada"
] as const;

export default function SignupPage() {
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

        <form action={requestSignup} className="auth-panel">
          <QueueMark size={52} />
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
            {passwordRules.map((rule) => (
              <li data-rule-state="pending" key={rule}>
                <RoulettePointer aria-hidden="true" label="" />
                <span>{rule}</span>
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
