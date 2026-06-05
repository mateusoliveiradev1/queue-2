import { QueueLoading } from "@queue/ui";

import { AppShell } from "../../../components/app-shell";

export default function CatalogLoading() {
  return (
    <AppShell currentPage="catalogo">
      <section className="catalog-loading-shell" aria-label="Catalogo carregando">
        <header className="app-header catalog-loading-header">
          <div>
            <p className="eyebrow">Catalogo coop</p>
            <h1 className="page-title">Garimpar coops com prova</h1>
            <p className="lede">Sincronizando o recorte atual sem sair da fila.</p>
          </div>
          <div className="catalog-loading-search" aria-hidden="true" />
        </header>

        <section className="surface-band app-section catalog-loading-panel">
          <QueueLoading label="Carregando catalogo..." />
        </section>

        <section className="app-section">
          <div className="catalog-loading-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="catalog-loading-card" key={index}>
                <div className="catalog-loading-cover" />
                <div className="catalog-loading-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
