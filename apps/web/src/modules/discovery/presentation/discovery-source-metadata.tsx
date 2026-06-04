import type { DiscoveryDeckCard } from "../application/ports";

export function DiscoverySourceMetadata({
  source
}: {
  source: DiscoveryDeckCard["sourceMeta"];
}) {
  return (
    <p
      className="source-meta discovery-source-meta"
      data-freshness={source.freshnessTone}
      aria-label="Fonte e frescor da carta"
    >
      <a className="queue2-focusable" href={source.attributionHref} rel="noreferrer" target="_blank">
        {source.attributionLabel}
      </a>
      <span>{source.freshnessLabel}</span>
    </p>
  );
}
