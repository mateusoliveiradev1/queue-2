import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoulettePointer } from "@queue/ui";

import { AppShell } from "../../components/app-shell";
import { formatPairingDate, getDuoDashboard } from "../../modules/duo";
import { requireVerifiedSession } from "../../platform/auth/session";

export const metadata: Metadata = {
  title: "Fila - QUEUE/2"
};

const ritual = [
  {
    word: "descobrir",
    text: "Trazer jogos que os dois realmente topariam jogar."
  },
  {
    word: "decidir",
    text: "Comparar vontade, tempo e plataforma antes de comecar."
  },
  {
    word: "zerar",
    text: "Registrar a jornada da dupla ate a conclusao."
  }
] as const;

const upcomingStates = [
  {
    title: "Biblioteca",
    text: "A lista vai separar vontade, jogando, pausado, dropado e zerado."
  },
  {
    title: "Roleta",
    text: "O sorteio so faz sentido quando houver jogos reais na fila."
  },
  {
    title: "Hall da Moral",
    text: "As zeradas viram memoria da dupla, nao placar individual."
  }
] as const;

export default async function DashboardPage() {
  const session = await requireVerifiedSession();
  const dashboard = await getDuoDashboard(session.user.id);

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const duo = dashboard.duo;

  if (!duo?.name || !duo.pairedAt) {
    redirect("/parear");
  }

  return (
    <AppShell currentPage="dashboard">
      <header className="app-header">
        <div>
          <p className="eyebrow">Dupla formada</p>
          <h1 className="page-title">A fila comeca vazia</h1>
          <p className="lede">
            Agora existe um lugar para decidir o proximo coop sem improviso. O
            primeiro jogo ainda nao entrou, e isso e honesto.
          </p>
        </div>
      </header>

      <section className="surface-band app-section" aria-labelledby="duo-context">
        <div className="section-heading">
          <h2 className="eyebrow" id="duo-context">
            Estado da fila
          </h2>
          <p className="support-copy">O que ja existe depois do pareamento.</p>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">Dupla</span>
            <strong>{duo.name}</strong>
            <span className="muted">
              Pareados em {formatPairingDate(duo.pairedAt, duo.timezone)}.
            </span>
          </div>
          <div className="metric">
            <span className="muted">Membros</span>
            <strong>{duo.members.length}/2</strong>
            <span className="muted">
              {duo.members.map((member) => member.displayName).join(" + ")}
            </span>
          </div>
          <div className="metric">
            <span className="muted">Jogos</span>
            <strong>0 jogos</strong>
            <span className="muted">Nada inventado. A lista nasce de jogos reais.</span>
          </div>
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="ritual-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="ritual-title">
            Ritual da dupla
          </h2>
          <p className="support-copy">A promessa que a fila vai carregar.</p>
        </div>
        <div className="ritual-grid">
          {ritual.map((step) => (
            <article className="ritual-step" key={step.word}>
              <RoulettePointer aria-hidden="true" label="" />
              <strong>{step.word}</strong>
              <span className="muted">{step.text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="locked-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="locked-title">
            Depois dos primeiros jogos
          </h2>
          <p className="support-copy">O produto nao precisa fingir conteudo antes da fila existir.</p>
        </div>
        <ul className="locked-list">
          {upcomingStates.map((step) => (
            <li aria-disabled="true" className="locked-step" key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
