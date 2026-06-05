import type {
  LibraryPageSize,
  LibraryQueueSort,
  LibraryQueueView,
  Phase2LibraryStatus
} from "../domain/library-policy";
import type { PlatformKey } from "../domain/platforms";

type LibraryFilterParams = {
  commonPlatformOnly: boolean;
  limit: LibraryPageSize;
  platform: PlatformKey | null;
  query: string;
  sort: LibraryQueueSort;
  view: LibraryQueueView;
};

type LibraryFilterPathOverrides = Partial<{
  commonPlatformOnly: boolean;
  limit: LibraryPageSize;
  page: number;
  platform: PlatformKey | null;
  query: string;
  sort: LibraryQueueSort;
  view: LibraryQueueView;
}>;

type ViewTab = {
  countKey?: Phase2LibraryStatus;
  label: string;
  view: LibraryQueueView;
};

const viewTabs: ViewTab[] = [
  { view: "todas", label: "Todas" },
  { view: "wishlist", label: "Wishlist", countKey: "wishlist" },
  { view: "jogando", label: "Jogando", countKey: "jogando" },
  { view: "pausado", label: "Pausado", countKey: "pausado" }
];

export function LibraryFilterBar({
  buildHref,
  commonPlatformLabels,
  counts,
  params
}: {
  buildHref: (overrides?: LibraryFilterPathOverrides) => string;
  commonPlatformLabels: string[];
  counts: Record<Phase2LibraryStatus, number>;
  params: LibraryFilterParams;
}) {
  const commonPlatformLabel = commonPlatformLabels.length
    ? `Plataformas em comum: ${commonPlatformLabels.join(", ")}`
    : "Plataformas em comum";

  return (
    <section className="surface-band app-section library-filter-bar" aria-labelledby="library-filter-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="library-filter-title">
          Filtrar fila ativa
        </h2>
        <p className="support-copy">
          A URL guarda visao, busca, plataforma, ordem e pagina para a dupla voltar ao mesmo recorte.
        </p>
      </div>
      <nav className="library-tabs" aria-label="Filtrar biblioteca por status">
        {viewTabs.map((tab) => (
          <a
            aria-current={params.view === tab.view ? "page" : undefined}
            href={buildHref({ view: tab.view })}
            key={tab.view}
          >
            {tab.label}
            {tab.countKey ? <span>{counts[tab.countKey]}</span> : null}
          </a>
        ))}
      </nav>
      <form action="/app/biblioteca" className="library-filter-form">
        {params.view !== "todas" ? (
          <input name="visao" type="hidden" value={params.view} />
        ) : null}
        {params.limit !== 12 ? (
          <input name="tamanho" type="hidden" value={params.limit} />
        ) : null}
        <label className="field library-filter-search">
          <span>Buscar jogo na fila</span>
          <input
            className="queue2-input"
            defaultValue={params.query}
            name="q"
            placeholder="It Takes Two, Overcooked..."
            type="search"
          />
        </label>
        <details className="library-filter-sheet">
          <summary className="queue2-button" data-tone="quiet">
            Filtros
          </summary>
          <div className="library-filter-sheet-panel">
            <fieldset className="library-filter-fieldset">
              <legend>Plataforma da fila</legend>
              <div className="segmented-control" aria-label="Plataforma da fila">
                <label>
                  <input
                    defaultChecked={!params.commonPlatformOnly}
                    name="plataforma"
                    type="radio"
                    value="livre"
                  />
                  <span>Todas plataformas</span>
                </label>
                <label>
                  <input
                    defaultChecked={params.commonPlatformOnly}
                    name="plataforma"
                    type="radio"
                    value="comum"
                  />
                  <span>{commonPlatformLabel}</span>
                </label>
              </div>
            </fieldset>
            <label className="field">
              <span>Ordenar fila</span>
              <select className="queue2-input" defaultValue={params.sort} name="ordenar">
                <option value="recentes">Mais recentes</option>
                <option value="match">Melhor match</option>
                <option value="nome">Nome</option>
              </select>
            </label>
          </div>
        </details>
        <button className="queue2-button" data-tone="primary" type="submit">
          Aplicar
        </button>
      </form>
    </section>
  );
}
