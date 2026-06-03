import type { Metadata } from "next";

import { AppShell } from "../../../components/app-shell";

export const metadata: Metadata = {
  title: "Dupla - QUEUE/2"
};

export default function DuoPage() {
  return (
    <AppShell currentPage="dupla">
      <header className="app-header">
        <div>
          <p className="eyebrow">Identidade compartilhada</p>
          <h1 className="page-title">A fila e nossa</h1>
          <p className="lede">
            Esta pagina reserva a identidade da dupla, os dois membros e as
            preferencias compartilhadas sem criar reviews ou gameplay cedo demais.
          </p>
        </div>
      </header>

      <section className="surface-band app-section" aria-labelledby="duo-name-section">
        <h2 className="eyebrow" id="duo-name-section">
          Nome da dupla
        </h2>
        <div className="field">
          <label htmlFor="duo-name">Nome da dupla</label>
          <input
            className="queue2-input"
            disabled
            id="duo-name"
            maxLength={48}
            name="duoName"
            readOnly
            type="text"
            value="Fila sem nome"
          />
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="members-section">
        <h2 className="eyebrow" id="members-section">
          Membros
        </h2>
        <div className="settings-grid">
          <div className="metric">
            <span className="muted">Jogador 1</span>
            <strong>Voce</strong>
            <span className="muted">Perfil confirmado depois do login real.</span>
          </div>
          <div className="metric">
            <span className="muted">Jogador 2</span>
            <strong>Parceiro</strong>
            <span className="muted">Entra pelo codigo de pareamento.</span>
          </div>
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="pairing-date-section">
        <h2 className="eyebrow" id="pairing-date-section">
          Data de pareamento
        </h2>
        <p className="lede">A data real sera gravada quando o codigo formar a dupla.</p>
      </section>

      <section className="surface-band app-section" aria-labelledby="timezone-section">
        <h2 className="eyebrow" id="timezone-section">
          Timezone
        </h2>
        <div className="field">
          <label htmlFor="duo-timezone">Timezone da dupla</label>
          <input
            className="queue2-input"
            disabled
            id="duo-timezone"
            name="timezone"
            readOnly
            type="text"
            value="America/Sao_Paulo"
          />
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="preferences-section">
        <h2 className="eyebrow" id="preferences-section">
          Preferencias compartilhadas
        </h2>
        <div className="settings-grid">
          <label className="neutral-state" htmlFor="pref-notifications">
            <input disabled id="pref-notifications" name="notifications" type="checkbox" />
            Notificacoes calmas
          </label>
          <label className="neutral-state" htmlFor="pref-audio">
            <input disabled id="pref-audio" name="audio" type="checkbox" />
            Audio de celebracao
          </label>
        </div>
        <p className="support-copy">
          Push so sera pedido depois de uma acao que explique valor concreto.
        </p>
      </section>
    </AppShell>
  );
}
