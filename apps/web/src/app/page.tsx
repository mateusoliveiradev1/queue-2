import { queue2Brand, RoulettePointer } from "@queue/ui";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero queue2-grain" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="eyebrow">Dois jogadores. Uma fila.</p>
          <h1 className="home-title" id="home-title">
            <span>QUEUE</span>
            <span>/2</span>
          </h1>
          <p className="lede">
            Cadastre, confirme o email e pareie com quem vai dividir o backlog.
            A partir daqui, nenhum jogo entra sozinho.
          </p>
          <p className="home-proofline">
            Sem modo solo. Sem ranking individual. Sem terceiro lugar.
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
            <span>Ritual inicial</span>
            <strong>2/2</strong>
          </div>
          <ol className="home-queue-preview">
            <li>
              <span>01</span>
              <div>
                <strong>Acesso confirmado</strong>
                <p>Cada pessoa entra com email verificado e senha.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Convite fechado</strong>
                <p>O codigo chama uma pessoa, expira e pode ser revogado.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Dupla formada</strong>
                <p>Quando os dois entram, a fila passa a ter dono: voces.</p>
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
