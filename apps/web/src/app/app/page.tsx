import type { Metadata } from "next";
import { RoulettePointer } from "@queue/ui";

import { AppShell } from "../../components/app-shell";

export const metadata: Metadata = {
  title: "Dashboard - QUEUE/2"
};

const ritual = [
  {
    word: "descobrir",
    text: "Encontrar coops que fazem sentido para os dois."
  },
  {
    word: "sortear",
    text: "Deixar a roleta escolher quando a fila existir."
  },
  {
    word: "zerar",
    text: "Registrar a jornada e celebrar a conclusao juntos."
  }
] as const;

const lockedSteps = [
  {
    title: "Descoberta",
    text: "Entra depois que auth e catalogo estiverem ligados."
  },
  {
    title: "Roleta",
    text: "Aparece quando houver jogos reais na fila."
  },
  {
    title: "Hall da Moral",
    text: "Fica para a historia da dupla no acabamento de lancamento."
  }
] as const;

export default function DashboardPage() {
  return (
    <AppShell currentPage="dashboard">
      <header className="app-header">
        <div>
          <p className="eyebrow">Primeiro momento autenticado</p>
          <h1 className="page-title">Fila ainda vazia</h1>
          <p className="lede">
            A dupla ja tem um lugar para comecar. O proximo passo real e
            descobrir jogos para formar a fila.
          </p>
        </div>
      </header>

      <section className="surface-band app-section" aria-labelledby="duo-context">
        <h2 className="eyebrow" id="duo-context">
          Contexto da dupla
        </h2>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">Dupla</span>
            <strong>Fila sem nome</strong>
            <span className="muted">Nomear vem depois do pareamento real.</span>
          </div>
          <div className="metric">
            <span className="muted">Membros</span>
            <strong>2 vagas</strong>
            <span className="muted">Nenhum progresso solo sera criado.</span>
          </div>
          <div className="metric">
            <span className="muted">Fila</span>
            <strong>0 jogos</strong>
            <span className="muted">Sem catalogo falso nesta fase.</span>
          </div>
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="ritual-title">
        <h2 className="eyebrow" id="ritual-title">
          Ritual da dupla
        </h2>
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
        <h2 className="eyebrow" id="locked-title">
          Proximos passos bloqueados
        </h2>
        <ul className="locked-list">
          {lockedSteps.map((step) => (
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
