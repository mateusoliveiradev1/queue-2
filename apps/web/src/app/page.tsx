import type { Metadata } from "next";
import { QueueWordmark, RoulettePointer } from "@queue/ui";

import { redirectAuthenticatedUserToApp } from "../platform/auth/session";

export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  },
  openGraph: {
    url: "/"
  }
};

export default async function Home() {
  await redirectAuthenticatedUserToApp();

  return (
    <main className="home-shell">
      <nav className="home-topbar" aria-label="Entrada publica QUEUE dois">
        <a className="public-brand-link queue2-focusable" href="/" aria-label="QUEUE dois">
          <QueueWordmark compact />
        </a>
        <div className="home-topbar-links">
          <a className="queue2-focusable" href="/login">
            Entrar
          </a>
          <a className="queue2-focusable" href="/cadastro">
            Criar conta
          </a>
          <a className="queue2-focusable" href="/parear">
            Parear
          </a>
        </div>
      </nav>

      <section className="home-hero queue2-grain" aria-labelledby="home-title">
        <p className="eyebrow">Dois jogadores. Uma fila real.</p>
        <h1 aria-label="QUEUE/2" className="home-title" id="home-title">
          <span aria-hidden="true">QUEUE</span>
          <span aria-hidden="true">/2</span>
        </h1>
        <p className="home-tagline">A fila e nossa.</p>
        <p className="lede">Descubram, sorteiem e zerem coops juntos.</p>
        <nav aria-label="Entrar no QUEUE dois" className="home-actions">
          <a className="queue2-button" data-tone="primary" href="/login">
            Entrar
          </a>
          <a className="queue2-button" data-tone="quiet" href="/cadastro">
            Criar conta
          </a>
        </nav>
      </section>

      <section className="home-ritual-section" aria-labelledby="home-ritual-title">
        <div className="home-ritual-heading">
          <p className="eyebrow">Ritual da dupla</p>
          <h2 id="home-ritual-title">Descobrir. Sortear. Zerar.</h2>
        </div>
        <ol className="home-queue-preview">
          <li>
            <span>01</span>
            <div>
              <strong>Descobrir</strong>
              <p>Os dois marcam vontade sem transformar escolha em debate infinito.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Sortear</strong>
              <p>A fila decide o proximo coop quando a dupla quer sair do empate.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Zerar</strong>
              <p>Progresso, desafios e conquistas contam como memoria dos dois.</p>
            </div>
          </li>
        </ol>
        <p className="home-proofline">
          <RoulettePointer aria-hidden="true" label="" />
          <span>Exatamente 2/2. Sem placar solo.</span>
        </p>
      </section>
    </main>
  );
}
