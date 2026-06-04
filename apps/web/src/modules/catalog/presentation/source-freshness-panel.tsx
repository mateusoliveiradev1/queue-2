import type { CatalogSourceFreshnessRowView } from "./view-models";

export function SourceFreshnessPanel({
  rows
}: {
  rows: CatalogSourceFreshnessRowView[];
}) {
  return (
    <section className="source-freshness-panel" aria-labelledby="source-freshness-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="source-freshness-title">
          Fontes e frescor
        </h2>
        <p className="support-copy">
          Origem dos dados exibidos neste detalhe, com estados textuais para cada fonte.
        </p>
      </div>
      <dl className="source-freshness-grid">
        {rows.map((row) => (
          <div className="source-freshness-row" data-freshness={row.freshnessTone} key={row.id}>
            <dt>{row.category}</dt>
            <dd>
              {row.sourceHref ? (
                <a className="queue2-focusable" href={row.sourceHref} rel="noreferrer" target="_blank">
                  {row.sourceLabel}
                </a>
              ) : (
                <span>{row.sourceLabel}</span>
              )}
              <small>
                {row.dateTime && row.absoluteDateLabel ? (
                  <time dateTime={row.dateTime} title={row.absoluteDateLabel}>
                    {row.statusLabel}
                  </time>
                ) : (
                  row.statusLabel
                )}
              </small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
