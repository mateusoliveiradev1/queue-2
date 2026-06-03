import type { Metadata } from "next";

import { AppShell } from "../../../components/app-shell";

export const metadata: Metadata = {
  title: "Perfil - QUEUE/2"
};

export default function ProfilePage() {
  return (
    <AppShell currentPage="perfil">
      <header className="app-header">
        <div>
          <p className="eyebrow">Perfil individual</p>
          <h1 className="page-title">Seu lugar na dupla</h1>
          <p className="lede">
            O perfil guarda a identidade de exibicao e os acessos ativos. O
            progresso continua sendo da dupla.
          </p>
        </div>
      </header>

      <section className="surface-band app-section" aria-labelledby="display-name-section">
        <h2 className="eyebrow" id="display-name-section">
          Nome de exibicao
        </h2>
        <div className="field">
          <label htmlFor="profile-display-name">Nome de exibicao</label>
          <input
            className="queue2-input"
            disabled
            id="profile-display-name"
            maxLength={40}
            name="displayName"
            readOnly
            type="text"
            value="Jogador da fila"
          />
        </div>
        <p className="support-copy">
          Nomes ficam curtos, em texto simples e sem formatacao.
        </p>
      </section>

      <section className="surface-band app-section" aria-labelledby="sessions-section">
        <h2 className="eyebrow" id="sessions-section">
          Sessoes ativas
        </h2>
        <ul className="session-list">
          <li>
            <span>Navegador atual</span>
            <span className="muted">Ativo agora</span>
          </li>
          <li>
            <span>Outros acessos</span>
            <span className="muted">Revogacao entra com auth</span>
          </li>
        </ul>
      </section>

      <section className="surface-band app-section" aria-labelledby="logout-section">
        <h2 className="eyebrow" id="logout-section">
          Sair
        </h2>
        <p className="support-copy">
          O botao fica reservado para a revogacao segura de sessao.
        </p>
        <button className="queue2-button" data-tone="quiet" disabled type="button">
          Sair da conta
        </button>
      </section>
    </AppShell>
  );
}
