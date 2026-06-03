import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoulettePointer } from "@queue/ui";

import { AppShell } from "../../components/app-shell";
import { formatPairingDate, getDuoDashboard } from "../../modules/duo";
import { getLibraryOverview, toLibraryOverviewView } from "../../modules/library";
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

const nextActions = [
  {
    title: "Catalogo",
    text: "Comece por jogos com fonte visivel e coop campanha confirmado.",
    href: "/app/catalogo"
  },
  {
    title: "Biblioteca",
    text: "Organize Wishlist, Jogando e Pausado sem fingir sessoes futuras.",
    href: "/app/biblioteca"
  },
  {
    title: "Roleta depois",
    text: "O sorteio so entra quando a fila ja tiver jogos reais."
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

  const libraryResult = await getLibraryOverview(session.user.id);
  const library = libraryResult.ok ? toLibraryOverviewView(libraryResult.overview) : null;
  const totalGames = library
    ? library.counts.wishlist + library.counts.jogando + library.counts.pausado
    : 0;

  return (
    <AppShell currentPage="dashboard">
      <header className="app-header">
        <div>
          <p className="eyebrow">Dupla formada</p>
          <h1 className="page-title">A fila ja pode crescer</h1>
          <p className="lede">
            O catalogo e a biblioteca estao prontos para transformar vontade em
            fila compartilhada. Match, roleta e sessoes continuam reservados para
            fases futuras.
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
            <strong>{totalGames} jogos</strong>
            <span className="muted">
              {totalGames === 0
                ? "Nada inventado. Busquem o primeiro coop no catalogo."
                : `${library?.counts.wishlist ?? 0} na Wishlist, ${library?.counts.jogando ?? 0} em Jogando.`}
            </span>
          </div>
          <div className="metric">
            <span className="muted">Plataformas comuns</span>
            <strong>{library?.commonPlatformLabels.length ? library.commonPlatformLabels.join(", ") : "A definir"}</strong>
            <span className="muted">Cada membro registra as suas na Biblioteca.</span>
          </div>
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="actions-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="actions-title">
            Proximas acoes
          </h2>
          <p className="support-copy">Phase 2 libera organizacao real, sem antecipar match ou sessao.</p>
        </div>
        <div className="ritual-grid">
          {nextActions.map((step) => (
            <article className="ritual-step" key={step.title}>
              <RoulettePointer aria-hidden="true" label="" />
              <strong>{step.title}</strong>
              <span className="muted">{step.text}</span>
              {"href" in step ? (
                <a className="text-link" href={step.href}>
                  Abrir {step.title.toLowerCase()}
                </a>
              ) : null}
            </article>
          ))}
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
    </AppShell>
  );
}
