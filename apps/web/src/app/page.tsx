import type { Metadata } from "next";
import { queue2Brand, RoulettePointer } from "@queue/ui";

export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  },
  openGraph: {
    url: "/"
  }
};

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero queue2-grain" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="eyebrow">Dois jogadores. Um backlog real.</p>
          <h1 className="home-title" id="home-title">
            <span>QUEUE</span>
            <span>/2</span>
          </h1>
          <p className="lede">
            Montem uma fila coop que pertence a exatamente duas pessoas. Buscar,
            marcar vontade e escolher o proximo jogo deixam de ser conversa solta.
          </p>
          <p className="home-proofline">
            Uma dupla fixa. Um backlog compartilhado. O proximo coop decidido junto.
          </p>
          <nav aria-label="Entrar no QUEUE dois" className="home-actions">
            <a className="queue2-button" data-tone="primary" href="/login">
              Entrar
            </a>
            <a className="queue2-button" data-tone="quiet" href="/cadastro">
              Criar conta
            </a>
            <a className="queue2-button" data-tone="quiet" href="/parear">
              Parear agora
            </a>
          </nav>
        </div>

        <div className="home-ritual-board" aria-label="Estado publico do QUEUE dois">
          <div className="home-board-header">
            <span>Ritual publico</span>
            <strong>2/2</strong>
          </div>
          <ol className="home-queue-preview">
            <li>
              <span>01</span>
              <div>
                <strong>Conta protegida</strong>
                <p>O acesso guarda convites, sessoes e a fila que os dois vao mexer.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Convite 2/2</strong>
                <p>Um codigo chama a outra pessoa, expira e fecha a porta.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Fila com dono</strong>
                <p>Quando a dupla entra, cada jogo passa por voces dois.</p>
              </div>
            </li>
          </ol>
          <div className="home-board-footer">
            <RoulettePointer aria-hidden="true" label="" />
            <span>{queue2Brand.tagline}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
