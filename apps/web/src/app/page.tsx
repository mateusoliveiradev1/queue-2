import { queue2Brand, RoulettePointer } from "@queue/ui";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero queue2-grain" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="eyebrow">A fila e nossa.</p>
          <h1 className="home-title" id="home-title">
            <span>QUEUE</span>
            <span>/2</span>
          </h1>
          <p className="lede">
            Um produto para duas pessoas manterem a fila real de jogos coop que
            querem zerar juntas.
          </p>
          <nav aria-label="Entrar no QUEUE dois" className="home-actions">
            <a className="queue2-button" data-tone="primary" href="/login">
              Entrar
            </a>
            <a className="queue2-button" data-tone="quiet" href="/cadastro">
              Criar conta
            </a>
            <a className="queue2-button" data-tone="quiet" href="/parear">
              Parear dupla
            </a>
          </nav>
        </div>

        <div className="home-ritual-board" aria-label="Estado publico do QUEUE dois">
          <div className="home-board-header">
            <span>{queue2Brand.tagline}</span>
            <strong>2/2</strong>
          </div>
          <ol className="home-queue-preview">
            <li>
              <span>01</span>
              <div>
                <strong>Conta verificada</strong>
                <p>Entrada segura para cada membro.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Dupla fixa</strong>
                <p>A fila pertence exatamente aos dois.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Catalogo preparado</strong>
                <p>A biblioteca real entra no proximo ciclo.</p>
              </div>
            </li>
          </ol>
          <div className="home-board-footer">
            <RoulettePointer aria-hidden="true" label="" />
            <span>Base publica pronta para a dupla.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
