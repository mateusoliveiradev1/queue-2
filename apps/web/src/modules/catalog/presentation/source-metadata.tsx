import type { CatalogSourceMetaView } from "./view-models";

export function SourceMetadata({
  source
}: {
  source: CatalogSourceMetaView;
}) {
  return (
    <p className="source-meta" data-freshness={source.freshnessTone}>
      <a className="queue2-focusable" href={source.attributionHref} rel="noreferrer" target="_blank">
        {source.attributionLabel}
      </a>
      <span>{source.freshnessLabel}</span>
    </p>
  );
}
